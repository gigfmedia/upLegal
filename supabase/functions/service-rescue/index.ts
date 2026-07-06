import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { Resend } from 'https://esm.sh/resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type ServiceRescueStep = 'early_intent' | 'final_followup';

type BookingRow = {
  id: string;
  lawyer_id: string;
  user_email: string;
  user_name: string;
  service_id: string | null;
  booking_type: string;
  status: string;
  payment_status: string | null;
  created_at: string | null;
  service_title: string | null;
  service_delivery_time: string | null;
  price: number;
};

type LawyerProfile = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  slug: string | null;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    validateSecret(req);
  } catch (error) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const resend = new Resend(Deno.env.get('RESEND_API_KEY')!);
    const appUrl = Deno.env.get('APP_URL') || 'https://legalup.cl';

    const now = new Date();

    // Solo bookings de servicios pendientes sin pago o con pago pendiente
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('status', 'pending')
      .eq('booking_type', 'service')
      .or('payment_status.is.null,payment_status.eq.pending')
      .range(0, 499);

    if (error) {
      return jsonResponse({ error: error.message }, 500);
    }

    console.log(`[service-rescue] ${bookings?.length ?? 0} pending services found`);

    const results: any[] = [];

    for (const booking of (bookings ?? []) as BookingRow[]) {
      if (!booking.created_at) continue;

      const createdAt = new Date(booking.created_at);
      const minutesSinceCreated = (now.getTime() - createdAt.getTime()) / 60000;

      let step: ServiceRescueStep | null = null;

      // STEP 1: 30-60 minutos (alta intención)
      if (minutesSinceCreated >= 30 && minutesSinceCreated <= 60) {
        step = 'early_intent';
      }

      // STEP 2: 12-24 horas (último recordatorio)
      if (minutesSinceCreated >= 720 && minutesSinceCreated <= 1440) {
        step = 'final_followup';
      }

      if (!step) continue;

      console.log(`[service-rescue] booking=${booking.id} minutes=${minutesSinceCreated.toFixed(1)} step=${step}`);

      // Evitar duplicados
      const { data: existing } = await supabase
        .from('service_rescue_emails')
        .select('id')
        .eq('booking_id', booking.id)
        .eq('step', step)
        .maybeSingle();

      if (existing) continue;

      // Crear tracking
      const { data: tracking, error: trackingError } = await supabase
        .from('service_rescue_emails')
        .insert({
          booking_id: booking.id,
          step,
          status: 'pending',
          sent_to: booking.user_email,
        })
        .select('id')
        .single();

      if (trackingError) {
        console.error('[service-rescue] Error creating tracking for booking', booking.id, 'step', step, ':', trackingError);
        continue;
      }

      try {
        // Obtener datos del abogado
        const { data: lawyer, error: lawyerError } = await supabase
          .from('profiles')
          .select('first_name, last_name, slug')
          .eq('user_id', booking.lawyer_id)
          .single();

        if (lawyerError) {
          console.log(`[service-rescue] Error fetching lawyer profile for booking ${booking.id}:`, lawyerError);
        }

        const lawyerName =
          `${lawyer?.first_name ?? ''} ${lawyer?.last_name ?? ''}`.trim() || 'tu abogado';
        const lawyerSlug = lawyer?.slug;

        console.log(`[service-rescue] Lawyer data for booking ${booking.id}:`, {
          lawyerId: booking.lawyer_id,
          lawyerName,
          lawyerSlug,
          hasLawyerData: !!lawyer,
          firstName: lawyer?.first_name,
          lastName: lawyer?.last_name
        });

        // Usar datos congelados del booking (no consultar lawyer_services)
        const serviceTitle = booking.service_title || 'Servicio legal';
        const servicePrice = booking.price;
        const deliveryTime = booking.service_delivery_time || 'A convenir';

        // Deep link: ir al checkout pendiente
        const deepLink = `${appUrl}/checkout/${booking.id}`;

        const { subject, html } = buildEmail({
          step,
          clientName: booking.user_name,
          lawyerName,
          serviceTitle,
          servicePrice,
          deliveryTime,
          deepLink,
        });

        await resend.emails.send({
          from: 'LegalUp <hola@mg.legalup.cl>',
          to: booking.user_email,
          subject,
          html,
        });

        if (tracking?.id) {
          await supabase
            .from('service_rescue_emails')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('id', tracking.id);
        }

        console.log(`[service-rescue] sent booking=${booking.id} step=${step}`);

        results.push({ bookingId: booking.id, step, status: 'sent' });
      } catch (err) {
        if (tracking?.id) {
          await supabase
            .from('service_rescue_emails')
            .update({ status: 'failed', error: String(err) })
            .eq('id', tracking.id);
        }

        results.push({ bookingId: booking.id, step, status: 'error', error: String(err) });
      }
    }

    const sentCount = results.filter(r => r.status === 'sent').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    console.log(`[service-rescue] sent=${sentCount} errors=${errorCount}`);

    return jsonResponse({ ok: true, results });
  } catch (error) {
    return jsonResponse({ error: String(error) }, 500);
  }
});

function buildEmail(params: {
  step: ServiceRescueStep;
  clientName: string;
  lawyerName: string;
  serviceTitle: string;
  servicePrice: number;
  deliveryTime: string;
  deepLink: string;
}) {
  const { step, clientName, lawyerName, serviceTitle, servicePrice, deliveryTime, deepLink } = params;
  const firstName = clientName?.split(' ')[0] ?? '';

  const logo = `
    <div style="text-align:center;margin-bottom:28px;">
      <img src="https://legalup.cl/apple-touch-icon.png" alt="LegalUp" style="height:40px;width:40px;vertical-align:middle;margin-right:10px;border:0;" />
      <span style="color:#1a202c;font-size:22px;font-weight:800;vertical-align:middle;">LegalUp</span>
    </div>`;

  const footer = `
    <p style="font-size:11px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:16px;margin-top:32px;text-align:center;">
      © ${new Date().getFullYear()} LegalUp — Asesoría legal online en Chile.<br />
      Todos los derechos reservados.<br />
      Este es un correo automático, por favor no respondas a este mensaje.
    </p>`;

  const wrapper = (content: string) => `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:16px;background:#f9fafb;">
      <div style="max-width:580px;margin:0 auto;font-family:Inter,Arial,sans-serif;color:#111827;padding:28px;border:1px solid #e5e7eb;border-radius:12px;background:#ffffff;line-height:1.6;">
        ${content}
      </div>
    </body>
    </html>`;

  const cta = (text: string) => `
    <div style="text-align:center;margin:24px 0;">
      <a href="${deepLink}" style="background:#111;color:#fff;padding:14px 24px;border-radius:8px;text-decoration:none;">
        ${text}
      </a>
    </div>`;

  const serviceCard = `
    <div style="border:1px solid #eee;padding:16px;border-radius:8px;background:#fafafa;">
      <div style="font-size:18px;font-weight:700;color:#111;margin-bottom:12px;">${serviceTitle}</div>
      <div style="margin-bottom:8px;">
        <span style="color:#666;font-size:14px;">Abogado:</span><br/>
        <span style="font-weight:600;">${lawyerName}</span>
      </div>
      <div style="margin-bottom:8px;">
        <span style="color:#666;font-size:14px;">Entrega:</span><br/>
        <span style="font-weight:600;">${deliveryTime}</span>
      </div>
      <div>
        <span style="color:#666;font-size:14px;">Valor:</span><br/>
        <span style="font-weight:600;font-size:18px;">$${servicePrice.toLocaleString('es-CL')}</span>
      </div>
    </div>`;

  if (step === 'early_intent') {
    return {
      subject: 'Solo falta confirmar tu solicitud',
      html: wrapper(`
        ${logo}
        <p>Hola ${firstName},</p>
        <p>Tu solicitud sigue lista. Una vez confirmado el pago, el abogado comenzará a trabajar en tu solicitud y podrás seguir el estado desde LegalUp.</p>
        ${serviceCard}
        ${cta('Continuar solicitud')}
        ${footer}
      `),
    };
  }

  // final_followup
  return {
    subject: '¿Aún necesitas resolver este problema legal?',
    html: wrapper(`
      ${logo}
      <p>Hola ${firstName},</p>
      <p>Notamos que iniciaste una solicitud pero no la completaste. Si aún necesitas ayuda legal, puedes retomar el proceso en cualquier momento.</p>
      ${serviceCard}
      ${cta('Finalizar solicitud')}
      ${footer}
    `),
  };
}

function validateSecret(req: Request) {
  const secret = Deno.env.get('SERVICE_RESCUE_CRON_SECRET');
  if (!secret) return;
  if (req.headers.get('x-cron-secret') !== secret) {
    throw new Error('Unauthorized');
  }
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
