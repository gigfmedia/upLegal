// @deno-types="https://deno.land/x/types/deno/deno.d.ts"
/// <reference types="https://deno.land/x/types/deno/deno.d.ts" />

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { Resend } from 'https://esm.sh/resend@2.0.0';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET'
};

// Helper function to get environment variables
function getEnv(key: string, defaultValue?: string): string {
  const value = Deno.env.get(key);
  if (!value && !defaultValue) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || defaultValue || '';
}

interface QuoteRequest {
  lawyer_id: string;
  service_id: string;
  service_title: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_phone?: string;
  description: string;
}

interface LawyerProfile {
  email: string;
  first_name: string | null;
  last_name: string | null;
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

    const body: QuoteRequest = await req.json();

    // Validate required fields
    if (!body.lawyer_id || !body.service_id || !body.service_title || 
        !body.user_id || !body.user_name || !body.user_email || !body.description) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role
    const supabaseUrl = getEnv('SUPABASE_URL');
    const supabaseKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Insert quote request
    const { data: quoteRequest, error: insertError } = await supabase
      .from('service_quote_requests')
      .insert({
        lawyer_id: body.lawyer_id,
        service_id: body.service_id,
        service_title: body.service_title,
        user_id: body.user_id,
        user_name: body.user_name,
        user_email: body.user_email,
        user_phone: body.user_phone || null,
        description: body.description,
        status: 'pending'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting quote request:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create quote request' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch lawyer profile for email notification
    console.log('[service-quote-request] Fetching lawyer profile for user_id:', body.lawyer_id);
    
    const { data: lawyer, error: lawyerError } = await supabase
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('user_id', body.lawyer_id)
      .single();

    console.log('[service-quote-request] Lawyer profile fetch result:', lawyer ? 'found' : 'not found');
    console.log('[service-quote-request] Lawyer profile fetch error:', lawyerError ? JSON.stringify(lawyerError) : 'none');
    
    if (lawyer) {
      console.log('[service-quote-request] Lawyer profile data:', JSON.stringify({ 
        email: lawyer.email, 
        first_name: lawyer.first_name, 
        last_name: lawyer.last_name 
      }));
    }

    if (!lawyer || !lawyer.email) {
      console.error('[service-quote-request] CRITICAL: Lawyer profile or email is missing for user_id:', body.lawyer_id);
      console.error('[service-quote-request] Lawyer exists:', !!lawyer);
      console.error('[service-quote-request] Lawyer email exists:', lawyer?.email);
      return new Response(
        JSON.stringify({ error: 'Lawyer profile or email not found' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[service-quote-request] Lawyer email:', lawyer.email);
    console.log('[service-quote-request] Client email:', body.user_email);

    // Initialize Resend
    const resendApiKey = getEnv('RESEND_API_KEY');
    const appUrl = getEnv('APP_URL', 'https://legalup.cl');
    console.log('[service-quote-request] RESEND_API_KEY exists:', !!resendApiKey);
    console.log('[service-quote-request] APP_URL:', appUrl);

    const resend = new Resend(resendApiKey);
    console.log('[service-quote-request] Resend client initialized');

    // Send email notifications - fail if either email fails
    try {
      console.log('[EMAIL] Starting email sending process...');
      
      // Send confirmation email to client
      console.log('[EMAIL] Sending client email to:', body.user_email);
      await sendClientConfirmation(resend, body, quoteRequest.id, appUrl);
      console.log('[EMAIL] Client email sent successfully to:', body.user_email);

      // Send notification email to lawyer
      console.log('[EMAIL] Sending lawyer email to:', lawyer.email);
      await sendLawyerNotification(resend, lawyer, body, quoteRequest.id, appUrl);
      console.log('[EMAIL] Lawyer email sent successfully to:', lawyer.email);

      console.log('[service-quote-request] Both emails sent successfully');
    } catch (error) {
      console.error('[EMAIL ERROR] Failed to send emails:', error);
      throw error; // Re-throw to ensure 500 response
    }

    return new Response(
      JSON.stringify({ success: true, data: quoteRequest }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in service-quote-request:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function sendLawyerNotification(
  resend: Resend,
  lawyer: LawyerProfile,
  request: QuoteRequest,
  quoteRequestId: string,
  appUrl: string
) {
  console.log('[EMAIL LAWYER] Function called with lawyer email:', lawyer.email);

  const lawyerName = `${lawyer.first_name || ''} ${lawyer.last_name || ''}`.trim() || 'Abogado';
  const dashboardUrl = `${appUrl}/lawyer/dashboard/quotes/${quoteRequestId}`;

  console.log('[EMAIL LAWYER] Building HTML email...');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Nueva solicitud de presupuesto</title>
      </head>
      <body style="margin:0;padding:16px;background:#f9fafb;">
        <div style="max-width:580px;margin:0 auto;font-family:Inter,Arial,sans-serif;color:#111827;padding:28px;border:1px solid #e5e7eb;border-radius:12px;background:#ffffff;line-height:1.6;">
          <div style="text-align:center;margin-bottom:28px;">
            <img src="https://legalup.cl/apple-touch-icon.png" alt="LegalUp" style="height:40px;width:40px;vertical-align:middle;margin-right:10px;border:0;" />
            <span style="color:#1a202c;font-size:22px;font-weight:800;vertical-align:middle;">LegalUp</span>
          </div>
          
          <h1 style="color:#101820;margin:0 0 20px 0;font-size:22px;">Nueva solicitud de presupuesto</h1>
          
          <p style="color:#475569;line-height:1.6;font-size:16px;">Hola ${lawyerName},</p>
          <p style="color:#475569;line-height:1.6;">Has recibido una nueva solicitud de presupuesto para tu servicio <strong>${request.service_title}</strong>.</p>
          
          <div style="background:#f9fafb;padding:20px;border-radius:8px;margin:24px 0;border:1px solid #e5e7eb;">
            <p style="margin:0 0 12px 0;color:#111827;font-weight:600;">Cliente</p>
            <p style="margin:0 0 8px 0;color:#475569;">${request.user_name}</p>
            <p style="margin:0 0 8px 0;color:#475569;">${request.user_email}</p>
            ${request.user_phone ? `<p style="margin:0 0 12px 0;color:#475569;">${request.user_phone}</p>` : ''}
            
            <p style="margin:12px 0 8px 0;color:#111827;font-weight:600;">Servicio</p>
            <p style="margin:0 0 12px 0;color:#475569;">${request.service_title}</p>
            
            <p style="margin:12px 0 8px 0;color:#111827;font-weight:600;">Descripción</p>
            <p style="margin:0;color:#475569;">${request.description}</p>
          </div>
          
          <div style="text-align:center;margin:32px 0;">
            <a href="${dashboardUrl}" style="background-color:#101820;color:white;padding:12px 25px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">
              Crear presupuesto
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

  console.log('[EMAIL LAWYER] HTML built successfully, preparing to send via Resend SDK...');

  const emailPayload = {
    from: 'LegalUp <noreply@legalup.cl>',
    to: lawyer.email,
    subject: 'Nueva solicitud de presupuesto',
    html
  };

  console.log('[EMAIL LAWYER] Email payload:', JSON.stringify({ to: emailPayload.to, subject: emailPayload.subject }));

  const { data, error } = await resend.emails.send(emailPayload);

  console.log('[EMAIL LAWYER] Resend SDK response received');

  if (error) {
    console.error('[EMAIL LAWYER ERROR] Resend SDK error:', error);
    throw new Error(`Resend SDK error: ${JSON.stringify(error)}`);
  }

  console.log('[EMAIL LAWYER SUCCESS] Lawyer email sent to:', lawyer.email, 'Response:', JSON.stringify(data));
}

async function sendClientConfirmation(
  resend: Resend,
  request: QuoteRequest,
  quoteRequestId: string,
  appUrl: string
) {
  console.log('[EMAIL CLIENT] Function called with client email:', request.user_email);

  console.log('[EMAIL CLIENT] Building HTML email...');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Solicitud de presupuesto recibida</title>
      </head>
      <body style="margin:0;padding:16px;background:#f9fafb;">
        <div style="max-width:580px;margin:0 auto;font-family:Inter,Arial,sans-serif;color:#111827;padding:28px;border:1px solid #e5e7eb;border-radius:12px;background:#ffffff;line-height:1.6;">
          <div style="text-align:center;margin-bottom:28px;">
            <img src="https://legalup.cl/apple-touch-icon.png" alt="LegalUp" style="height:40px;width:40px;vertical-align:middle;margin-right:10px;border:0;" />
            <span style="color:#1a202c;font-size:22px;font-weight:800;vertical-align:middle;">LegalUp</span>
          </div>
          
          <h1 style="color:#101820;margin:0 0 20px 0;font-size:22px;">Solicitud de presupuesto recibida</h1>
          
          <p style="color:#475569;line-height:1.6;font-size:16px;">Hola ${request.user_name},</p>
          <p style="color:#475569;line-height:1.6;">Hemos recibido tu solicitud de presupuesto para el servicio <strong>${request.service_title}</strong>.</p>
          
          <div style="background:#f9fafb;padding:20px;border-radius:8px;margin:24px 0;border:1px solid #e5e7eb;">
            <p style="margin:0 0 12px 0;color:#111827;font-weight:600;">Servicio solicitado</p>
            <p style="margin:0 0 12px 0;color:#475569;">${request.service_title}</p>
            
            <p style="margin:12px 0 8px 0;color:#111827;font-weight:600;">Tu descripción</p>
            <p style="margin:0;color:#475569;">${request.description}</p>
          </div>
          
          <p style="color:#475569;line-height:1.6;">El abogado revisará tu caso y te enviará un presupuesto personalizado a tu correo electrónico.</p>
          <p style="color:#475569;line-height:1.6;">Si tienes preguntas adicionales, puedes responder directamente a este correo.</p>
          
          <p style="font-size:11px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:16px;margin-top:32px;text-align:center;">
            © 2026 LegalUp — Asesoría legal online en Chile.<br />
            Todos los derechos reservados.<br />
            Este es un correo automático, por favor no respondas a este mensaje.
          </p>
        </div>
      </body>
    </html>
  `;

  console.log('[EMAIL CLIENT] HTML built successfully, preparing to send via Resend SDK...');

  const emailPayload = {
    from: 'LegalUp <noreply@legalup.cl>',
    to: request.user_email,
    subject: 'Solicitud de presupuesto recibida',
    html
  };

  console.log('[EMAIL CLIENT] Email payload:', JSON.stringify({ to: emailPayload.to, subject: emailPayload.subject }));

  const { data, error } = await resend.emails.send(emailPayload);

  console.log('[EMAIL CLIENT] Resend SDK response received');

  if (error) {
    console.error('[EMAIL CLIENT ERROR] Resend SDK error:', error);
    throw new Error(`Resend SDK error: ${JSON.stringify(error)}`);
  }

  console.log('[EMAIL CLIENT SUCCESS] Client email sent to:', request.user_email, 'Response:', JSON.stringify(data));
}
