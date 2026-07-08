import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface WebhookData {
  type: string;
  data: {
    id: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const webhookData: WebhookData = await req.json();
    
    if (webhookData.type === 'payment') {
      const paymentId = webhookData.data.id;
      
      // Get the payment details from MercadoPago
      const mpAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
      if (!mpAccessToken) {
        throw new Error('MercadoPago access token not configured');
      }

      const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${mpAccessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch payment details from MercadoPago');
      }

      const payment = await response.json();
      
      // Check if this is a service quote request payment
      const { data: quoteRequest } = await supabaseAdmin
        .from('service_quote_requests')
        .select('id, status, quoted_price, service_title, lawyer_id, user_id, user_email, user_name')
        .eq('id', payment.external_reference)
        .maybeSingle();

      if (quoteRequest) {
        // Handle service quote request payment
        if (payment.status === 'approved' && quoteRequest.status !== 'paid') {
          const { error: updateError } = await supabaseAdmin
            .from('service_quote_requests')
            .update({
              status: 'paid',
              payment_status: payment.status,
              payment_id: paymentId,
              paid_at: new Date().toISOString(),
            })
            .eq('id', payment.external_reference);

          if (updateError) {
            console.error('Error updating quote request:', updateError);
            throw new Error('Failed to update quote request status');
          }

          console.log(`Quote request ${payment.external_reference} marked as paid`);

          // Send email notifications
          await sendPaymentNotifications(supabaseAdmin, quoteRequest, payment);
        }
      } else {
        // Handle regular payment (existing logic)
        const { error } = await supabaseAdmin
          .from('payments')
          .update({
            status: payment.status === 'approved' ? 'succeeded' : payment.status,
            payment_method: payment.payment_type_id,
            payment_status: payment.status,
            metadata: {
              ...payment,
              last_webhook: new Date().toISOString(),
            },
          })
          .eq('id', payment.external_reference);

        if (error) {
          console.error('Error updating payment:', error);
          throw new Error('Failed to update payment status');
        }
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        status: 200,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
      }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Error processing webhook'
      }),
      {
        status: 400,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
      }
    );
  }
});

async function sendPaymentNotifications(
  supabaseAdmin: any,
  quoteRequest: any,
  payment: any
) {
  // Fetch lawyer profile
  const { data: lawyerProfile } = await supabaseAdmin
    .from('profiles')
    .select('email, first_name, last_name')
    .eq('user_id', quoteRequest.lawyer_id)
    .single();

  // Fetch lawyer auth email if not in profile
  let lawyerEmail = lawyerProfile?.email;
  if (!lawyerEmail) {
    const { data: lawyerUser } = await supabaseAdmin.auth.admin.getUserById(quoteRequest.lawyer_id);
    lawyerEmail = lawyerUser?.user?.email;
  }

  const lawyerName = lawyerProfile
    ? `${lawyerProfile.first_name || ''} ${lawyerProfile.last_name || ''}`.trim() || 'Abogado'
    : 'Abogado';

  const clientName = quoteRequest.user_name || 'Cliente';
  const appUrl = Deno.env.get('APP_URL') || 'https://legalup.cl';

  // Send email to lawyer
  if (lawyerEmail) {
    const lawyerHtml = `
      <!DOCTYPE html>
      <html>
        <head><meta charset="UTF-8"><title>Pago recibido</title></head>
        <body style="margin:0;padding:16px;background:#f9fafb;">
          <div style="max-width:580px;margin:0 auto;font-family:Inter,Arial,sans-serif;color:#111827;padding:28px;border:1px solid #e5e7eb;border-radius:12px;background:#ffffff;line-height:1.6;">
            <div style="text-align:center;margin-bottom:28px;">
              <span style="color:#1a202c;font-size:22px;font-weight:800;">LegalUp</span>
            </div>
            <h1 style="color:#101820;margin:0 0 20px 0;font-size:22px;">¡Pago recibido!</h1>
            <p style="color:#475569;line-height:1.6;">Hola ${lawyerName},</p>
            <p style="color:#475569;line-height:1.6;">
              <strong>${clientName}</strong> ha pagado el presupuesto para el servicio <strong>${quoteRequest.service_title}</strong> por <strong>$${quoteRequest.quoted_price.toLocaleString('es-CL')}</strong>.
            </p>
            <p style="color:#475569;line-height:1.6;">Puedes ver los detalles en tu panel de trabajo.</p>
            <div style="text-align:center;margin:32px 0;">
              <a href="${appUrl}/lawyer/jobs" style="background-color:#101820;color:white;padding:12px 25px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">
                Ver mis trabajos
              </a>
            </div>
            <p style="font-size:11px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:16px;margin-top:32px;text-align:center;">
              © 2026 LegalUp — Asesoría legal online en Chile.
            </p>
          </div>
        </body>
      </html>
    `;

    try {
      const resendKey = Deno.env.get('RESEND_API_KEY');
      if (resendKey) {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'LegalUp <hola@mg.legalup.cl>',
            to: lawyerEmail,
            subject: `💰 ${clientName} pagó el presupuesto para ${quoteRequest.service_title}`,
            html: lawyerHtml
          })
        });
        if (!res.ok) {
          const errText = await res.text();
          console.error('[webhook] Resend error (lawyer):', res.status, errText);
        } else {
          console.log('[webhook] Payment notification sent to lawyer:', lawyerEmail);
        }
      }
    } catch (err) {
      console.error('[webhook] Failed to send lawyer notification:', err);
    }
  }

  // Send email to client
  const clientHtml = `
    <!DOCTYPE html>
    <html>
      <head><meta charset="UTF-8"><title>Pago confirmado</title></head>
      <body style="margin:0;padding:16px;background:#f9fafb;">
        <div style="max-width:580px;margin:0 auto;font-family:Inter,Arial,sans-serif;color:#111827;padding:28px;border:1px solid #e5e7eb;border-radius:12px;background:#ffffff;line-height:1.6;">
          <div style="text-align:center;margin-bottom:28px;">
            <span style="color:#1a202c;font-size:22px;font-weight:800;">LegalUp</span>
          </div>
          <h1 style="color:#101820;margin:0 0 20px 0;font-size:22px;">¡Pago confirmado!</h1>
          <p style="color:#475569;line-height:1.6;">Hola ${clientName},</p>
          <p style="color:#475569;line-height:1.6;">
            Hemos recibido tu pago de <strong>$${quoteRequest.quoted_price.toLocaleString('es-CL')}</strong> por el servicio <strong>${quoteRequest.service_title}</strong>.
          </p>
          <p style="color:#475569;line-height:1.6;">El abogado ya ha sido notificado y comenzará a trabajar en tu caso.</p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${appUrl}/dashboard/services" style="background-color:#101820;color:white;padding:12px 25px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">
              Ver mis servicios
            </a>
          </div>
          <p style="font-size:11px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:16px;margin-top:32px;text-align:center;">
            © 2026 LegalUp — Asesoría legal online en Chile.
          </p>
        </div>
      </body>
    </html>
  `;

  try {
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (resendKey) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'LegalUp <hola@mg.legalup.cl>',
          to: quoteRequest.user_email,
          subject: `✅ Pago confirmado para ${quoteRequest.service_title}`,
          html: clientHtml
        })
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error('[webhook] Resend error (client):', res.status, errText);
      } else {
        console.log('[webhook] Payment confirmation sent to client:', quoteRequest.user_email);
      }
    }
  } catch (err) {
    console.error('[webhook] Failed to send client notification:', err);
  }
}
