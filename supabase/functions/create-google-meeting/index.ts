import { serve } from "jsr:@std/http/server";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('🔥 FUNCTION ENTERED create-google-meeting');

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🔥 AFTER REQUEST ENTRY');

    const { appointmentId } = await req.json();
    console.log('🔥 APPOINTMENT ID:', appointmentId);

    if (!appointmentId) throw new Error('Missing appointmentId');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Appointment
    const { data: appointment, error: appError } = await supabaseClient
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .maybeSingle();

    if (appError || !appointment) {
      console.error('❌ Appointment error:', appError);
      throw new Error('Appointment not found');
    }

    console.log('🔥 APPOINTMENT FETCHED:', appointment);

    // Idempotency check: Return existing meet_link if already exists
    if (appointment.meet_link) {
      const originalProvider = appointment.meet_provider || 'jitsi';
      console.log('MEET_LINK_REUSE', {
        appointmentId,
        provider: originalProvider,
        meetLink: appointment.meet_link,
        action: 'returning_existing_link'
      });
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          meetLink: appointment.meet_link,
          source: originalProvider,
          existing: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Lawyer profile (including meet_link for fixed link support)
    const { data: lawyerProfile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('user_id, meet_link')
      .eq('user_id', appointment.lawyer_id)
      .single();

    if (profileError || !lawyerProfile) {
      console.error('❌ Lawyer profile error:', profileError);
      throw new Error('Lawyer profile not found');
    }

    console.log('🔥 LAWYER PROFILE FOUND:', lawyerProfile);

    const lawyerUserId = lawyerProfile.user_id;

    // PRIORITY 1: Use lawyer's fixed meet_link if configured
    if (lawyerProfile.meet_link) {
      const fixedMeetLink = lawyerProfile.meet_link;
      let fixedMeetProvider = 'custom';
      
      // Detect provider from URL pattern
      if (fixedMeetLink.includes('meet.google.com') || fixedMeetLink.includes('hangouts.google.com')) {
        fixedMeetProvider = 'google';
      } else if (fixedMeetLink.includes('jitsi')) {
        fixedMeetProvider = 'jitsi';
      }

      console.log('🔥 USING FIXED MEET_LINK:', {
        appointmentId,
        meetLink: fixedMeetLink,
        provider: fixedMeetProvider,
        source: 'lawyer_profile'
      });

      // Save fixed link to database
      const { error: updateError } = await supabaseClient
        .from('appointments')
        .update({
          meet_link: fixedMeetLink,
          meet_provider: fixedMeetProvider,
          meet_status: 'fixed',
          status: 'confirmed',
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId);

      if (updateError) {
        console.error('❌ Failed to update appointment with fixed meet_link:', updateError);
        throw new Error(`Failed to update appointment: ${updateError.message}`);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          meetLink: fixedMeetLink,
          source: fixedMeetProvider,
          existing: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Google integration (optional)
    const { data: integration, error: intError } = await supabaseClient
      .from('google_integrations')
      .select('*')
      .eq('user_id', lawyerUserId)
      .maybeSingle();

    const hasGoogleIntegration = !intError && integration;
    console.log('🚨 CHATGPT_TEST_999');
    console.log('🔥 GOOGLE INTEGRATION STATUS:', hasGoogleIntegration ? 'FOUND' : 'NOT FOUND');

    let meetLink = '';
    let meetSource = '';

    // Try Google Calendar only if integration exists
    if (hasGoogleIntegration) {
      console.log('🔥 ATTEMPTING GOOGLE CALENDAR');
      
      let accessToken = integration.access_token;

      if (Date.now() >= integration.expires_at) {
        console.log('🔥 REFRESHING TOKEN');

        const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
            client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
            refresh_token: integration.refresh_token,
            grant_type: 'refresh_token',
          }),
        });

        const newTokens = await refreshResponse.json();
        accessToken = newTokens.access_token;
      }

      // 🔥 VALIDACIÓN TOTAL DE FECHA
      console.log('🔥 RAW APPOINTMENT CHECK:', {
        date: appointment.appointment_date,
        time: appointment.appointment_time,
        duration: appointment.duration,
      });

      if (!appointment.appointment_time || !appointment.appointment_date) {
        console.warn('⚠️ Invalid appointment date/time, falling back to Jitsi');
      } else {
        const timeStr = String(appointment.appointment_time).slice(0, 5);
        const dateTimeStr = `${appointment.appointment_date}T${timeStr}:00`;

        const startDate = new Date(dateTimeStr);

        if (isNaN(startDate.getTime())) {
          console.warn('⚠️ Invalid date generated, falling back to Jitsi:', dateTimeStr);
        } else {
          const endDate = new Date(startDate.getTime() + (appointment.duration || 60) * 60000);

          console.log('🔥 BEFORE GOOGLE CALL');

          const event = {
            summary: `Cita LegalUp: ${appointment.consultation_type}`,
            description: `Cita con ${appointment.name}`,
            start: {
              dateTime: startDate.toISOString(),
              timeZone: 'America/Santiago',
            },
            end: {
              dateTime: endDate.toISOString(),
              timeZone: 'America/Santiago',
            },
            conferenceData: {
              createRequest: {
                requestId: `meet-${appointmentId}`,
                conferenceSolutionKey: { type: 'hangoutsMeet' },
              },
            },
            attendees: [{ email: appointment.email }],
          };

          try {
            const calendarResponse = await fetch(
              'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1',
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(event),
              }
            );

            const rawText = await calendarResponse.text();

            console.log('🔥 AFTER GOOGLE CALL');
            console.log('GOOGLE STATUS:', calendarResponse.status);
            console.log('GOOGLE RAW RESPONSE:', rawText);

            if (calendarResponse.ok) {
              const calendarData = JSON.parse(rawText);
              console.log('🔥 CALENDAR PARSED:', calendarData);

              meetLink =
                calendarData.hangoutLink ||
                calendarData.conferenceData?.entryPoints?.[0]?.uri;
              
              if (meetLink) {
                meetSource = 'google';
                console.log('GOOGLE_MEET_SUCCESS', {
                  appointmentId,
                  meetLink,
                  calendarEventId: calendarData.id
                });
              }
            } else {
              console.error('GOOGLE_MEET_ERROR', {
                appointmentId,
                status: calendarResponse.status,
                error: rawText
              });
              console.warn('⚠️ Google Calendar failed, falling back to Jitsi:', rawText);
            }
          } catch (googleError) {
            console.warn('⚠️ Google Calendar exception, falling back to Jitsi:', googleError);
          }
        }
      }
    } else {
      console.log('🔥 SKIPPING GOOGLE CALENDAR - NO INTEGRATION');
    }

    // Fallback to Jitsi Meet if Google failed or not available
    if (!meetLink) {
      meetLink = `https://meet.jit.si/legalup-${appointmentId}`;
      meetSource = 'jitsi';
      console.log('JITSI_LINK_GENERATED:', meetLink);
      console.log('JITSI_FALLBACK_USED', {
        appointmentId,
        meetLink,
        reason: hasGoogleIntegration ? 'google_failed' : 'no_google_integration'
      });
    }

    // Save meet_link to database
    console.log('JITSI_LINK_SAVING_TO_DB', { appointmentId, meetLink, meetSource });
    const { error: updateError } = await supabaseClient
      .from('appointments')
      .update({
        meet_link: meetLink,
        meet_provider: meetSource,
        meet_status: 'success',
        status: 'confirmed',
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId);

    if (updateError) {
      console.error('JITSI_LINK_DB_UPDATE_ERROR', updateError);
      throw new Error(`Failed to update appointment: ${updateError.message}`);
    }

    console.log('JITSI_LINK_SAVED_TO_DB');

    // Traceability logging
    console.log('MEETING_GENERATION', {
      appointmentId,
      provider: meetSource,
      hasGoogleIntegration,
      meetLink,
      action: 'generated_new'
    });

    console.log('RETURNING_JITSI_RESPONSE:', { meetLink, source: meetSource });

    return new Response(
      JSON.stringify({ 
        success: true, 
        meetLink,
        source: meetSource
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('🔥 GLOBAL ERROR:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: error.toString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});