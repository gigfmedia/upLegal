import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { Resend } from 'https://esm.sh/resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type RescueStep = '30m_help' | '6h_soft' | '24h_urgent';

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
    return jsonResponse(
      {
        error: 'Unauthorized',
        message: error instanceof Error ? error.message : 'Invalid authentication',
      },
      401,
    );
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      return jsonResponse({ error: 'RESEND_API_KEY is not configured' }, 500);
    }
    const resend = new Resend(resendApiKey);

    const appUrl = Deno.env.get('APP_URL') || 'https://legalup.cl';

    const now = new Date();

    const windows: Array<{ step: RescueStep; minMinutes: number; maxMinutes: number }> = [
      { step: '30m_help', minMinutes: 30, maxMinutes: 90 },
      { step: '6h_soft', minMinutes: 6 * 60, maxMinutes: 8 * 60 },
      { step: '24h_urgent', minMinutes: 24 * 60, maxMinutes: 28 * 60 },
    ];

    const results: Array<{ bookingId: string; step: RescueStep; status: string; error?: string }> = [];

    for (const w of windows) {
      const minTs = new Date(now.getTime() - w.maxMinutes * 60 * 1000).toISOString();
      const maxTs = new Date(now.getTime() - w.minMinutes * 60 * 1000).toISOString();

      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, lawyer_id, user_email, user_name, scheduled_date, scheduled_time, duration, status, payment_status, created_at')
        .eq('status', 'pending')
        .gte('created_at', minTs)
        .lte('created_at', maxTs)
        .limit(200);

      if (bookingsError) {
        console.error(`[Rescue] Failed to fetch bookings for ${w.step}:`, bookingsError);
        return jsonResponse({ error: `Failed to fetch bookings: ${bookingsError.message}` }, 500);
      }

      console.log(`[Rescue] Found ${(bookings ?? []).length} bookings for step ${w.step}`);

      for (const booking of (bookings ?? []) as BookingRow[]) {
        const { data: tracking, error: trackingError } = await supabase
          .from('booking_rescue_emails')
          .insert({
            booking_id: booking.id,
            step: w.step,
            status: 'sending',
            sent_to: booking.user_email,
          })
          .select('id')
          .maybeSingle();

        if (trackingError) {
          results.push({ bookingId: booking.id, step: w.step, status: 'skipped' });
          continue;
        }

        try {
          const { data: lawyer, error: lawyerError } = await supabase
            .from('profiles')
            .select('user_id, first_name, last_name')
            .eq('user_id', booking.lawyer_id)
            .eq('role', 'lawyer')
            .single();

          if (lawyerError || !lawyer) {
            throw new Error(`Lawyer not found for booking ${booking.id}`);
          }

          const lawyerProfile = lawyer as LawyerProfile;
          const lawyerName = `${lawyerProfile.first_name ?? ''} ${lawyerProfile.last_name ?? ''}`.trim() || 'tu abogado';

          const deepLink = `${appUrl}/booking/${booking.lawyer_id}?date=${encodeURIComponent(booking.scheduled_date)}&time=${encodeURIComponent(booking.scheduled_time)}&duration=${encodeURIComponent(String(booking.duration))}`;

          const { subject, html } = buildEmail({
            step: w.step,
            clientName: booking.user_name,
            lawyerName,
            date: booking.scheduled_date,
            time: booking.scheduled_time,
            deepLink,
          });

          console.log(`[Rescue] Sending ${w.step} email to ${booking.user_email}`);

          await resend.emails.send({
            from: 'LegalUp <hola@mg.legalup.cl>',
            reply_to: 'hola@legalup.cl',
            to: booking.user_email,
            subject,
            html,
          });

          if (tracking?.id) {
            await supabase
              .from('booking_rescue_emails')
              .update({ status: 'sent', sent_at: new Date().toISOString(), error: null })
              .eq('id', tracking.id);
          }

          results.push({ bookingId: booking.id, step: w.step, status: 'sent' });
        } catch (err) {
          console.error(`[Rescue] Error sending email ${w.step} to ${booking.user_email}:`, err);
          const message = err instanceof Error ? err.message : String(err);

          if (tracking?.id) {
            await supabase
              .from('booking_rescue_emails')
              .update({ status: 'error', error: message })
              .eq('id', tracking.id);
          }

          results.push({ bookingId: booking.id, step: w.step, status: 'error', error: message });
        }
      }
    }

    return jsonResponse({ ok: true, processed: results });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return jsonResponse({ error: message }, 500);
  }
});

function validateSecret(req: Request) {
  const configuredSecret = Deno.env.get('BOOKING_RESCUE_CRON_SECRET');
  if (!configuredSecret) return;
  const headerSecret = req.headers.get('x-cron-secret');
  if (!headerSecret || headerSecret !== configuredSecret) {
    throw new Error('Unauthorized: missing or invalid cron secret');
  }
}

function buildEmail(params: {
  step: RescueStep;
  clientName: string;
  lawyerName: string;
  date: string;
  time: string;
  deepLink: string;
}) {
  const { step, clientName, lawyerName, date, time, deepLink } = params;

  const firstName = clientName ? clientName.split(' ')[0] : '';

  const logo = `
    <div style="text-align:center;margin-bottom:28px;">
      <img src="https://legalup.cl/apple-touch-icon.png" alt="LegalUp" style="height:40px;width:40px;vertical-align:middle;margin-right:10px;border:0;" />
      <span style="color:#1a202c;font-size:22px;font-weight:800;vertical-align:middle;">LegalUp</span>
    </div>`;

  const bookingCard = `
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0;">
      <div style="font-size:12px;color:#6b7280;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.05em;">Tu reserva</div>
      <div style="font-size:15px;font-weight:600;color:#111827;margin-bottom:4px;">${lawyerName}</div>
      <div style="font-size:14px;color:#374151;">${date} · ${time}</div>
    </div>`;

  const ctaButton = (text: string) => `
    <div style="text-align:center;margin:28px 0;">
      <a href="${deepLink}" style="display:inline-block;background:#111827;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">${text}</a>
    </div>`;

  const footer = `
    <p style="font-size:12px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:16px;margin-top:32px;text-align:center;">
      LegalUp · Abogados desde $30.000 · <a href="https://legalup.cl" style="color:#9ca3af;text-decoration:none;">legalup.cl</a>
    </p>`;

  const wrapper = (content: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:16px;background:#f9fafb;">
  <div style="max-width:580px;margin:0 auto;font-family:Inter,Arial,sans-serif;color:#111827;padding:28px;border:1px solid #e5e7eb;border-radius:12px;background:#ffffff;line-height:1.6;">
    ${logo}
    ${content}
    ${footer}
  </div>
</body>
</html>`;

  // ─── 30m: tono útil, puede haber sido un problema técnico ───
  if (step === '30m_help') {
    return {
      subject: '¿Tuviste un problema al agendar?',
      html: wrapper(`
        <p style="margin:0 0 12px;">Hola${firstName ? ` ${firstName}` : ''},</p>
        <p style="margin:0 0 12px;">Vimos que seleccionaste una hora con un abogado pero no completaste el pago. A veces pasan problemas técnicos — si fue eso, tu hora podría seguir disponible.</p>
        ${bookingCard}
        ${ctaButton('Retomar reserva')}
        <p style="margin:0;font-size:14px;color:#6b7280;">Si tuviste dudas antes de pagar, responde este correo y te ayudamos antes de que confirmes.</p>
        <p style="margin:20px 0 0;">— Equipo LegalUp</p>
      `),
    };
  }

  // ─── 6h: social proof, mostrar que otros resolvieron ───
  if (step === '6h_soft') {
    return {
      subject: `${firstName ? `${firstName}, t` : 'T'}u hora sigue disponible`,
      html: wrapper(`
        <p style="margin:0 0 12px;">Hola${firstName ? ` ${firstName}` : ''},</p>
        <p style="margin:0 0 12px;">Tu hora con <strong>${lawyerName}</strong> sigue reservada, pero no por mucho más tiempo.</p>
        ${bookingCard}
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px 16px;margin:16px 0;">
          <div style="font-size:13px;font-weight:600;color:#166534;margin-bottom:10px;">Lo que otros resolvieron esta semana con LegalUp</div>
          <div style="font-size:13px;color:#15803d;margin-bottom:6px;padding-left:8px;border-left:2px solid #86efac;">Arrendatario que no sabía si el desalojo era legal — caso resuelto en 1 consulta</div>
          <div style="font-size:13px;color:#15803d;margin-bottom:6px;padding-left:8px;border-left:2px solid #86efac;">Trabajador al que no le pagaron el finiquito correcto — recuperó la diferencia</div>
          <div style="font-size:13px;color:#15803d;padding-left:8px;border-left:2px solid #86efac;">Pareja que no sabía cómo iniciar el divorcio — proceso claro en 30 minutos</div>
        </div>
        ${ctaButton('Confirmar mi hora')}
        <p style="margin:0;font-size:14px;color:#6b7280;">¿Tienes dudas antes de pagar? Responde este correo y te ayudamos.</p>
        <p style="margin:20px 0 0;">— Equipo LegalUp</p>
      `),
    };
  }

  // ─── 24h: escasez real, último aviso ───
  return {
    subject: `Último aviso: la hora del ${date} a las ${time} se libera hoy`,
    html: wrapper(`
      <p style="margin:0 0 12px;">Hola${firstName ? ` ${firstName}` : ''},</p>
      <p style="margin:0 0 12px;">Hace 24 horas seleccionaste una hora con <strong>${lawyerName}</strong>. Si no confirmas hoy, la hora queda disponible para otros usuarios.</p>
      ${bookingCard}
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 16px;margin:16px 0;font-size:14px;color:#991b1b;">
        Esta es la última vez que te avisamos sobre esta reserva.
      </div>
      ${ctaButton('Confirmar antes de que se libere')}
      <p style="margin:0;font-size:14px;color:#6b7280;">Si ya no necesitas la consulta, no tienes que hacer nada.</p>
      <p style="margin:20px 0 0;">— Equipo LegalUp</p>
    `),
  };
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}