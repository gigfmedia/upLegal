import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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
      .single();

    if (appError || !appointment) {
      console.error('❌ Appointment error:', appError);
      throw new Error('Appointment not found');
    }

    console.log('🔥 APPOINTMENT FETCHED:', appointment);

    // 2. Lawyer profile
    const { data: lawyerProfile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('user_id')
      .eq('user_id', appointment.lawyer_id)
      .single();

    if (profileError || !lawyerProfile) {
      console.error('❌ Lawyer profile error:', profileError);
      throw new Error('Lawyer profile not found');
    }

    console.log('🔥 LAWYER PROFILE FOUND:', lawyerProfile);

    const lawyerUserId = lawyerProfile.user_id;

    // 3. Google integration
    const { data: integration, error: intError } = await supabaseClient
      .from('google_integrations')
      .select('*')
      .eq('user_id', lawyerUserId)
      .single();

    if (intError || !integration) {
      console.log('❌ No Google integration found');
      return new Response(JSON.stringify({ message: 'No Google integration found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('🔥 GOOGLE INTEGRATION FOUND');

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
      throw new Error('Invalid appointment date/time');
    }

    const timeStr = String(appointment.appointment_time).slice(0, 5);
    const dateTimeStr = `${appointment.appointment_date}T${timeStr}:00`;

    const startDate = new Date(dateTimeStr);

    if (isNaN(startDate.getTime())) {
      throw new Error(`Invalid date generated: ${dateTimeStr}`);
    }

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

    if (!calendarResponse.ok) {
      throw new Error(`Google error: ${rawText}`);
    }

    const calendarData = JSON.parse(rawText);

    console.log('🔥 CALENDAR PARSED:', calendarData);

    const meetLink =
      calendarData.hangoutLink ||
      calendarData.conferenceData?.entryPoints?.[0]?.uri;

    return new Response(
      JSON.stringify({ success: true, meetLink }),
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