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

  const { url, method } = req;
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const requestUrl = new URL(url);
    const path = requestUrl.pathname.split('/').pop(); // 'init' or 'callback'

    if (path === 'init') {
      const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
      const redirectUri = Deno.env.get('GOOGLE_REDIRECT_URI');
      
      // Get the user ID from the authorization header to pass as state
      // This ensures we know which user to link the account to
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        throw new Error('No authorization header provided');
      }
      
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
      
      if (userError || !user) {
        throw new Error('Invalid user token');
      }

      // 4.60C: alcance mínimo — insert de eventos (+Meet) y free/busy.
      // NUNCA el scope full `calendar` (lectura/borrado total innecesario).
      const scope = [
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/calendar.freebusy'
      ].join(' ');

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&state=${user.id}`;

      return new Response(JSON.stringify({ url: authUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (path === 'status') {
      // 4.60C.1: estado seguro para el browser. NUNCA devuelve tokens.
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'No authorization header provided', code: 'UNAUTHORIZED' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
      if (userError || !user) {
        return new Response(JSON.stringify({ error: 'Invalid user token', code: 'UNAUTHORIZED' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { data: integration, error: integrationError } = await supabaseClient
        .from('google_integrations')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (integrationError) throw integrationError;
      return new Response(JSON.stringify({ connected: !!integration }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (path === 'disconnect') {
      // 4.60C: desconexión canónica server-side. El browser nunca ve tokens.
      if (method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'No authorization header provided', code: 'UNAUTHORIZED' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
      if (userError || !user) {
        return new Response(JSON.stringify({ error: 'Invalid user token', code: 'UNAUTHORIZED' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: integration } = await supabaseClient
        .from('google_integrations')
        .select('user_id, refresh_token, access_token')
        .eq('user_id', user.id)
        .maybeSingle();

      // Idempotente: sin integración local = ya desconectado.
      if (!integration) {
        return new Response(JSON.stringify({ success: true, already_disconnected: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Revocar en Google: refresh preferido, fallback access. Sin tokens en logs.
      const revokeToken = integration.refresh_token || integration.access_token;
      if (revokeToken) {
        try {
          const revokeResponse = await fetch('https://oauth2.googleapis.com/revoke', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ token: revokeToken }),
          });
          if (!revokeResponse.ok) {
            const bodyText = await revokeResponse.text().catch(() => '');
            const invalid = revokeResponse.status === 400 && /invalid/i.test(bodyText);
            if (!invalid) {
              // Falla transitoria: no afirmar revocación; conservar fila para reintentar.
              console.error('GOOGLE_REVOKE_FAILED', { status: revokeResponse.status });
              return new Response(
                JSON.stringify({ error: 'No se pudo revocar el acceso en Google. Intenta nuevamente.', code: 'REVOKE_FAILED' }),
                { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
            // Token ya inválido/revocado: continuar con desconexión local.
          }
        } catch (e) {
          console.error('GOOGLE_REVOKE_ERROR', { message: e instanceof Error ? e.message : 'unknown' });
          return new Response(
            JSON.stringify({ error: 'No se pudo contactar a Google. Intenta nuevamente.', code: 'REVOKE_UNREACHABLE' }),
            { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      const { error: deleteError } = await supabaseClient
        .from('google_integrations')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (path === 'callback') {
      // Google redirects with query params for the callback
      const url = new URL(req.url);
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');

      if (!code) {
        console.error('❌ Missing code from Google redirect');
        return new Response(JSON.stringify({
          error: 'Missing code',
          url: req.url
        }), { status: 200 });
      }

      if (!state) {
        console.error('❌ Missing state');
      }

      const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
      const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
      const redirectUri = Deno.env.get('GOOGLE_REDIRECT_URI');

      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId!,
          client_secret: clientSecret!,
          redirect_uri: redirectUri!,
          grant_type: 'authorization_code',
        }),
      });

      const tokens = await tokenResponse.json();

      // 4.60C: NUNCA loguear tokens (access/refresh) ni el code. Solo
      // diagnóstico no sensible para verificar el intercambio.
      console.log('GOOGLE_OAUTH_EXCHANGE_OK', {
        has_refresh_token: !!tokens.refresh_token,
        expires_in: tokens.expires_in ?? null,
      });

      // Save tokens to database
      const { error: upsertError } = await supabaseClient
        .from('google_integrations')
        .upsert({
          user_id: state,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token, // Only returned if access_type=offline and prompt=consent
          expires_at: Date.now() + tokens.expires_in * 1000,
          scope: tokens.scope,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (upsertError) {
        throw upsertError;
      }

      // Redirect back to frontend
      const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://legalup.cl';
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': `${frontendUrl}/lawyer/dashboard?google_auth=success`,
        },
      });
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
