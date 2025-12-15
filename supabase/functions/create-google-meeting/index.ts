import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { appointmentId } = await req.json();

    if (!appointmentId) {
      throw new Error('Missing appointmentId');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Fetch appointment details
    const { data: appointment, error: appError } = await supabaseClient
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .single();

    if (appError || !appointment) {
      console.error('Error fetching appointment:', appError);
      throw new Error(`Appointment not found: ${appError ? JSON.stringify(appError) : 'No data returned'}`);
    }

    // 1.5 Fetch lawyer profile to get user_id
    const { data: lawyerProfile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('user_id')
      .eq('id', appointment.lawyer_id)
      .single();

    if (profileError || !lawyerProfile) {
      console.error('Error fetching lawyer profile:', profileError);
      throw new Error('Lawyer profile not found');
    }

    const lawyerUserId = lawyerProfile.user_id;

    // 2. Fetch lawyer's Google tokens
    const { data: integration, error: intError } = await supabaseClient
      .from('google_integrations')
      .select('*')
      .eq('user_id', lawyerUserId)
      .single();

    if (intError || !integration) {
      console.log('Lawyer has not connected Google Calendar');
      return new Response(JSON.stringify({ message: 'No Google integration found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let accessToken = integration.access_token;

    // 3. Check if token is expired and refresh if needed
    if (Date.now() >= integration.expires_at) {
      console.log('Refreshing token...');
      const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
      const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId!,
          client_secret: clientSecret!,
          refresh_token: integration.refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      const newTokens = await refreshResponse.json();

      if (newTokens.error) {
        throw new Error(`Error refreshing token: ${newTokens.error_description}`);
      }

      accessToken = newTokens.access_token;

      // Update tokens in DB
      await supabaseClient
        .from('google_integrations')
        .update({
          access_token: accessToken,
          expires_at: Date.now() + newTokens.expires_in * 1000,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', lawyerUserId);
    }

    // Ensure time is in HH:MM format
    const timeStr = appointment.appointment_time.substring(0, 5);
    const dateTimeStr = `${appointment.appointment_date}T${timeStr}:00`;

    // 4. Create Calendar Event
    const event = {
      summary: `Cita LegalUp: ${appointment.consultation_type}`,
      description: `Cita con ${appointment.name}.\nNotas: ${appointment.notes || 'Sin notas'}\n\nGenerado por LegalUp.`,
      start: {
        dateTime: dateTimeStr,
        timeZone: 'America/Santiago', // Assuming Chile based on context
      },
      end: {
        dateTime: dateTimeStr, // Will be updated below
        timeZone: 'America/Santiago',
      },
      conferenceData: {
        createRequest: {
          requestId: `meet-${appointmentId}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
      attendees: [
        { email: appointment.email }, // Client email
        // Lawyer email is the calendar owner, implicitly added
      ],
    };

    // Calculate end time based on duration
    const startDate = new Date(dateTimeStr);
    const endDate = new Date(startDate.getTime() + (appointment.duration || 60) * 60000);
    event.end.dateTime = endDate.toISOString().replace('Z', ''); // Simple ISO format, Google handles timezone

    const calendarResponse = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    const calendarData = await calendarResponse.json();

    if (calendarData.error) {
      throw new Error(`Google Calendar API Error: ${JSON.stringify(calendarData.error)}`);
    }

    const meetLink = calendarData.hangoutLink;

    // 5. Update appointment with meet link
    if (meetLink) {
      await supabaseClient
        .from('appointments')
        .update({ meet_link: meetLink })
        .eq('id', appointmentId);
    }

    return new Response(JSON.stringify({ success: true, meetLink }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    // Return 200 even on error to see the message in the client
    return new Response(JSON.stringify({ success: false, error: error.message, details: error.toString() }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
