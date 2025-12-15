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
    const { lawyerId, startDate, endDate } = await req.json();

    if (!lawyerId || !startDate || !endDate) {
      throw new Error('Missing required parameters');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Get the lawyer's user_id from their profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('user_id')
      .eq('id', lawyerId)
      .single();

    if (profileError || !profile) {
      throw new Error('Lawyer profile not found');
    }

    // 2. Fetch lawyer's Google tokens
    const { data: integration, error: intError } = await supabaseClient
      .from('google_integrations')
      .select('*')
      .eq('user_id', profile.user_id)
      .single();

    if (intError || !integration) {
      // Not an error, just means no calendar connected. Return empty busy slots.
      return new Response(JSON.stringify({ busySlots: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let accessToken = integration.access_token;

    // 3. Refresh token if needed
    if (Date.now() >= integration.expires_at) {
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
        console.error('Error refreshing token:', newTokens);
        // If refresh fails, we can't fetch calendar. Return empty to avoid blocking app.
        return new Response(JSON.stringify({ busySlots: [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
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
        .eq('user_id', profile.user_id);
    }

    // 4. Fetch Free/Busy from Google
    const response = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        timeMin: startDate,
        timeMax: endDate,
        items: [{ id: 'primary' }],
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(`Google API Error: ${JSON.stringify(data.error)}`);
    }

    const busySlots = data.calendars?.primary?.busy || [];

    return new Response(JSON.stringify({ busySlots }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
