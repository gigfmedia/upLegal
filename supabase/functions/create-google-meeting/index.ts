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

    console.log('🔥 APPOINTMENT FETCHED');

    if (appError || !appointment) {
      console.error('Error fetching appointment:', appError);
      throw new Error('Appointment not found');
    }

    // 2. Lawyer profile
    const { data: lawyerProfile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('user_id')
      .eq('user_id', appointment.lawyer_id)
      .single();

    console.log('🔥 LAWYER PROFILE FOUND');

    if (profileError || !lawyerProfile) {
      console.error('Error fetching lawyer profile:', profileError);
      throw new Error('Lawyer profile not found');
    }

    const lawyerUserId = lawyerProfile.user_id;

    // 3. Google integration
    const { data: integration, error: intError } = await supabaseClient
      .from('google_integrations')
      .select('*')
      .eq('user_id', lawyerUserId)
      .single();

    console.log('🔥 GOOGLE INTEGRATION FOUND');

    if (intError || !integration) {
      return new Response(JSON.stringify({ message: 'No Google integration found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let accessToken = integration.access_token;

    // refresh logic omitted (igual que tu versión)
    if (Date.now() >= integration.expires_at) {
      console.log('🔥 REFRESHING TOKEN');
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
      accessToken = newTokens.access_token;
    }

    // event time
    if (!appointment.appointment_time || !appointment.appointment_date) {
      throw new Error('Invalid appointment date/time');
    }

    const timeStr = String(appointment.appointment_time).substring(0, 5);
    const dateTimeStr = `${appointment.appointment_date}T${timeStr}:00`;

    const startDate = new Date(dateTimeStr);
    const endDate = new Date(
      startDate.getTime() + (appointment.duration || 60) * 60000
    );

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

    console.log('🔥 BEFORE GOOGLE CALL');
    console.log('dateTimeStr:', dateTimeStr);
    console.log('startDate:', startDate);
    console.log('endDate:', endDate);

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
      console.error('Google Calendar HTTP ERROR:', rawText);
      throw new Error('Google Calendar request failed');
    }

    const calendarData = JSON.parse(rawText);

    console.log('🔥 CALENDAR PARSED');

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