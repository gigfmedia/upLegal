import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { Resend } from 'https://esm.sh/resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type RescueStep =
  | 'early_intent'
  | 'pre_event_urgency'
  | 'missed_booking_recovery'
  | 'post_missed_followup';

type BookingRow = {
  id: string;
  lawyer_id: string;
  user_email: string;
  user_name: string;
  scheduled_date: string;
  scheduled_time: string;
  duration: number;
  status: string;
  payment_status: string | null;
  created_at: string | null;
};

type LawyerProfile = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
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

    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('status', 'pending')
      .limit(200);

    if (error) {
      return jsonResponse({ error: error.message }, 500);
    }

    const results: any[] = [];

    for (const booking of (bookings ?? []) as BookingRow[]) {
      if (!booking.created_at) continue;

      const bookingDateTime = new Date(`${booking.scheduled_date}T${booking.scheduled_time}`);
      const createdAt = new Date(booking.created_at);

      const minutesSinceCreated = (now.getTime() - createdAt.getTime()) / 60000;
      const minutesToBooking = (bookingDateTime.getTime() - now.getTime()) / 60000;

      let step: RescueStep | null = null;

      // BEFORE BOOKING
      if (minutesToBooking > 0) {
        if (minutesSinceCreated >= 15 && minutesSinceCreated <= 45) {
          step = 'early_intent';
        } else if (minutesToBooking <= 120 && minutesToBooking >= 30) {
          step = 'pre_event_urgency';
        }
      }

      // JUST MISSED
      if (minutesToBooking <= 0 && minutesToBooking >= -60) {
        step = 'missed_booking_recovery';
      }

      // AFTER MISSED
      if (minutesToBooking < -60 && minutesToBooking >= -1440) {
        step = 'post_missed_followup';
      }

      if (!step) continue;

      // evitar duplicados
      const { data: existing } = await supabase
        .from('booking_rescue_emails')
        .select('id')
        .eq('booking_id', booking.id)
        .eq('step', step)
        .maybeSingle();

      if (existing) continue;

      const { data: tracking } = await supabase
        .from('booking_rescue_emails')
        .insert({
          booking_id: booking.id,
          step,
          status: 'sending',
          sent_to: booking.user_email,
        })
        .select('id')
        .maybeSingle();

      try {
        const { data: lawyer } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('user_id', booking.lawyer_id)
          .single();

        const lawyerName =
          `${lawyer?.first_name ?? ''} ${lawyer?.last_name ?? ''}`.trim() || 'tu abogado';

        const deepLink = `${appUrl}/booking/${booking.lawyer_id}?date=${booking.scheduled_date}&time=${booking.scheduled_time}`;

        const { subject, html } = buildEmail({
          step,
          clientName: booking.user_name,
          lawyerName,
          date: booking.scheduled_date,
          time: booking.scheduled_time,
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
            .from('booking_rescue_emails')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('id', tracking.id);
        }

        results.push({ bookingId: booking.id, step, status: 'sent' });
      } catch (err) {
        if (tracking?.id) {
          await supabase
            .from('booking_rescue_emails')
            .update({ status: 'error', error: String(err) })
            .eq('id', tracking.id);
        }

        results.push({ bookingId: booking.id, step, status: 'error' });
      }
    }

    return jsonResponse({ ok: true, results });
  } catch (error) {
    return jsonResponse({ error: String(error) }, 500);
  }
});

function buildEmail(params: {
  step: RescueStep;
  clientName: string;
  lawyerName: string;
  date: string;
  time: string;
  deepLink: string;
}) {
  const { step, clientName, lawyerName, date, time, deepLink } = params;
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

  const bookingCard = `
    <div style="border:1px solid #eee;padding:12px;border-radius:8px;">
      <b>${lawyerName}</b><br/>
      ${date} · ${time}
    </div>`;

  if (step === 'early_intent') {
    return {
      subject: 'Tu hora con el abogado sigue disponible',
      html: wrapper(`
        ${logo}
        <p>Hola ${firstName},</p>
        <p>Tu hora sigue disponible.</p>
        ${bookingCard}
        ${cta('Confirmar y pagar')}
        ${footer}
      `),
    };
  }

  if (step === 'pre_event_urgency') {
    return {
      subject: `Tu hora es a las ${time}`,
      html: wrapper(`
        ${logo}
        <p>Hola ${firstName},</p>
        <p><b>Tu abogado te estaba esperando.</b></p>
        ${bookingCard}
        ${cta('Confirmar ahora')}
        ${footer}
      `),
    };
  }

  if (step === 'missed_booking_recovery') {
    return {
      subject: 'Perdiste tu hora, reagenda aquí',
      html: wrapper(`
        ${logo}
        <p>Hola ${firstName},</p>
        <p>Tu hora ya pasó.</p>
        ${bookingCard}
        ${cta('Reagendar')}
        ${footer}
      `),
    };
  }

  return {
    subject: '¿Sigues necesitando ayuda legal?',
    html: wrapper(`
      ${logo}
      <p>Hola ${firstName},</p>
      <p>Puedes reagendar o hablar con otro abogado.</p>
      ${cta('Ver opciones')}
      ${footer}
    `),
  };
}

function validateSecret(req: Request) {
  const secret = Deno.env.get('BOOKING_RESCUE_CRON_SECRET');
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