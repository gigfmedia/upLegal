// @deno-types="https://deno.land/x/types/deno/deno.d.ts"
/// <reference types="https://deno.land/x/types/deno/deno.d.ts" />

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET'
};

// Helper function to get environment variables
function getEnv(key: string): string {
  const value = Deno.env.get(key);
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

interface SendQuoteRequest {
  quote_request_id: string;
  quoted_price: number;
  quote_notes?: string | null;
}

interface QuoteRequestData {
  id: string;
  lawyer_id: string;
  service_id: string;
  service_title: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_phone: string | null;
  description: string;
  status: string;
}

interface LawyerProfile {
  email: string;
  first_name: string | null;
  last_name: string | null;
  slug: string | null;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    // Get user from auth header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Se requiere autenticación' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: SendQuoteRequest = await req.json();

    // Validate required fields
    if (!body.quote_request_id || !body.quoted_price) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with user auth context
    const supabaseUrl = getEnv('SUPABASE_URL');
    const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY');
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader
        }
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });

    // Build admin client for DB operations (bypass RLS)
    const supabaseAdmin = createClient(supabaseUrl, getEnv('SUPABASE_SERVICE_ROLE_KEY'));

    // Extract JWT from auth header and verify user
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
    if (userError || !user) {
      console.error('[send-service-quote] Auth error:', userError?.message);
      return new Response(
        JSON.stringify({ error: 'Token inválido o expirado. Inicia sesión nuevamente.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch quote request (using admin client for DB operations)
    const { data: quoteRequest, error: quoteError } = await supabaseAdmin
      .from('service_quote_requests')
      .select('*')
      .eq('id', body.quote_request_id)
      .single();

    if (quoteError || !quoteRequest) {
      return new Response(
        JSON.stringify({ error: 'Quote request not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify that the user is the lawyer who owns this request
    if (quoteRequest.lawyer_id !== user.id) {
      return new Response('Forbidden', { status: 403, headers: corsHeaders });
    }

    // Verify the request is still pending
    if (quoteRequest.status !== 'pending') {
      return new Response(
        JSON.stringify({ error: 'Quote request is not pending' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch lawyer profile for MercadoPago metadata
    const { data: lawyer } = await supabaseAdmin
      .from('profiles')
      .select('email, first_name, last_name, slug')
      .eq('user_id', user.id)
      .single();

    // Create MercadoPago preference
    const mpAccessToken = getEnv('MERCADOPAGO_ACCESS_TOKEN');
    const appUrl = getEnv('APP_URL');

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items: [{
          id: quoteRequest.service_id,
          title: quoteRequest.service_title,
          quantity: 1,
          currency_id: 'CLP',
          unit_price: body.quoted_price
        }],
        back_urls: {
          success: lawyer?.slug
            ? `${appUrl}/payment/success?lawyer=${lawyer.slug}&type=quote&id=${quoteRequest.id}`
            : `${appUrl}/payment/success?type=quote&id=${quoteRequest.id}`,
          failure: lawyer?.slug
            ? `${appUrl}/payment/failure?lawyer=${lawyer.slug}&type=quote&id=${quoteRequest.id}`
            : `${appUrl}/payment/failure?type=quote&id=${quoteRequest.id}`,
          pending: lawyer?.slug
            ? `${appUrl}/payment/pending?lawyer=${lawyer.slug}&type=quote&id=${quoteRequest.id}`
            : `${appUrl}/payment/pending?type=quote&id=${quoteRequest.id}`
        },
        auto_return: 'approved',
        metadata: {
          quote_request_id: quoteRequest.id,
          lawyer_id: quoteRequest.lawyer_id,
          user_id: quoteRequest.user_id,
          service_id: quoteRequest.service_id,
          lawyer_slug: lawyer?.slug
        },
        external_reference: quoteRequest.id
      })
    });

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text();
      console.error('MercadoPago error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to create MercadoPago preference' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const mpData = await mpResponse.json();

    // Update quote request with quote details and MercadoPago data
    const { error: updateError } = await supabaseAdmin
      .from('service_quote_requests')
      .update({
        status: 'quoted',
        quoted_price: body.quoted_price,
        quote_notes: body.quote_notes || null,
        quoted_at: new Date().toISOString(),
        mercadopago_preference_id: mpData.id,
        payment_link: mpData.init_point
      })
      .eq('id', body.quote_request_id);

    if (updateError) {
      console.error('Error updating quote request:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update quote request' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send email notification to client
    await sendClientNotification(quoteRequest as QuoteRequestData, body, mpData.init_point);

    return new Response(
      JSON.stringify({ 
        success: true, 
        payment_link: mpData.init_point,
        preference_id: mpData.id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-service-quote:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function sendClientNotification(
  quoteRequest: QuoteRequestData,
  quoteData: SendQuoteRequest,
  paymentLink: string
) {
  const resendApiKey = getEnv('RESEND_API_KEY');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Tu presupuesto está listo</title>
      </head>
      <body style="margin:0;padding:16px;background:#f9fafb;">
        <div style="max-width:580px;margin:0 auto;font-family:Inter,Arial,sans-serif;color:#111827;padding:28px;border:1px solid #e5e7eb;border-radius:12px;background:#ffffff;line-height:1.6;">
          <div style="text-align:center;margin-bottom:28px;">
            <img src="https://legalup.cl/apple-touch-icon.png" alt="LegalUp" style="height:40px;width:40px;vertical-align:middle;margin-right:10px;border:0;" />
            <span style="color:#1a202c;font-size:22px;font-weight:800;vertical-align:middle;">LegalUp</span>
          </div>
          
          <h1 style="color:#101820;margin:0 0 20px 0;font-size:22px;">¡Tu presupuesto está listo!</h1>
          
          <p style="color:#475569;line-height:1.6;font-size:16px;">Hola ${quoteRequest.user_name},</p>
          <p style="color:#475569;line-height:1.6;">El abogado ha revisado tu caso para el servicio <strong>${quoteRequest.service_title}</strong> y te ha enviado un presupuesto personalizado.</p>
          
          <div style="background:#f9fafb;padding:20px;border-radius:8px;margin:24px 0;border:1px solid #e5e7eb;">
            <p style="margin:0 0 12px 0;color:#111827;font-weight:600;">Servicio</p>
            <p style="margin:0 0 20px 0;color:#475569;">${quoteRequest.service_title}</p>
            
            <p style="margin:0 0 8px 0;color:#111827;font-weight:600;">Precio final</p>
            <p style="margin:0 0 20px 0;color:#475569;font-size:24px;font-weight:bold;">$${quoteData.quoted_price.toLocaleString('es-CL')}</p>
            
            ${quoteData.quote_notes ? `
              <p style="margin:12px 0 8px 0;color:#111827;font-weight:600;">Comentarios del abogado</p>
              <p style="margin:0;color:#475569;">${quoteData.quote_notes}</p>
            ` : ''}
          </div>
          
          <div style="text-align:center;margin:32px 0;">
            <a href="${paymentLink}" style="background-color:#101820;color:white;padding:12px 25px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">
              Pagar ahora
            </a>
          </div>
          
          <p style="font-size:11px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:16px;margin-top:32px;text-align:center;">
            © 2026 LegalUp — Asesoría legal online en Chile.<br />
            Todos los derechos reservados.<br />
            Este es un correo automático, por favor no respondas a este mensaje.
          </p>
        </div>
      </body>
    </html>
  `;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'LegalUp <noreply@legalup.cl>',
      to: quoteRequest.user_email,
      subject: 'Tu presupuesto está listo',
      html
    })
  });
}
