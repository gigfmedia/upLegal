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
      { step: '30m_help', minMinutes: 30, maxMinutes: 90 }, // Ampliado para cubrir ejecuciones horarias o retrasos
      { step: '6h_soft', minMinutes: 6 * 60, maxMinutes: 8 * 60 }, // Ventana de 2 horas para mayor fiabilidad
      { step: '24h_urgent', minMinutes: 24 * 60, maxMinutes: 28 * 60 }, // Ventana de 4 horas para asegurar captura
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
        // 1) Dedupe: attempt to create tracking row (unique on booking_id + step)
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
          // Unique violation means already sent (or in progress)
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
          const lawyerName = `${lawyerProfile.first_name ?? ''} ${lawyerProfile.last_name ?? ''}`.trim() || 'abogado';

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

  if (!configuredSecret) {
    // Allow running without auth if not configured
    return;
  }

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

  if (step === '30m_help') {
    return {
      subject: '¿Tuviste un problema al agendar?',
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body>
  <div style="max-width:600px;margin:0 auto;font-family:Inter,Arial,sans-serif;color:#101820;">
    <p>Hola${clientName ? ` ${clientName}` : ''},</p>
    <p>Vimos que estuviste a punto de agendar con un abogado, pero no terminaste la reserva.</p>
    <p><strong>Tu hora aún podría estar disponible:</strong></p>
    <p style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;">
      <strong>Abogado:</strong> ${lawyerName}<br/>
      <strong>Día:</strong> ${date}<br/>
      <strong>Hora:</strong> ${time}
    </p>
    <p>Puedes retomarla en menos de 30 segundos aquí:</p>
    <p><a href="${deepLink}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 18px;border-radius:6px;text-decoration:none;font-weight:600;">Retomar reserva</a></p>
    <p style="margin-top:16px;">Si tuviste dudas antes de pagar, responde este correo y te ayudamos.</p>
    <p>— Equipo LegalUp</p>
    <p style="font-size:12px;color:#6b7280;">Abogados disponibles desde $30.000 · Respuesta rápida, sin compromiso inicial</p>
  </div>
</body>
</html>`,
    };
  }

  if (step === '24h_urgent') {
    return {
      subject: `Tu hora con ${lawyerName} está a punto de liberarse`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body>
  <div style="max-width:600px;margin:0 auto;font-family:Inter,Arial,sans-serif;color:#101820;">
    <p>Hola${clientName ? ` ${clientName}` : ''},</p>
    <p><strong>Tu hora con el abogado ${lawyerName} está a punto de liberarse.</strong></p>
    <p style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;">
      <strong>${date}</strong> a las <strong>${time}</strong>
    </p>
    <p>Si aún necesitas ayuda legal, este es el momento:</p>
    <p><a href="${deepLink}" style="display:inline-block;background:#111827;color:#fff;padding:12px 18px;border-radius:6px;text-decoration:none;font-weight:600;">Agendar ahora</a></p>
    <p>Las horas disponibles se llenan rápido.</p>
    <p>— LegalUp</p>
    <p style="font-size:12px;color:#6b7280;">Abogados disponibles desde $30.000 · Respuesta rápida, sin compromiso inicial</p>
  </div>
</body>
</html>`,
    };
  }

  // 6h_soft
  return {
    subject: 'Tu hora sigue reservada (por poco tiempo)',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body>
  <div style="max-width:600px;margin:0 auto;font-family:Inter,Arial,sans-serif;color:#101820;">
    <p>Hola${clientName ? ` ${clientName}` : ''},</p>
    <p>Vimos que estuviste a punto de agendar con un abogado, pero no terminaste la reserva.</p>
    <p><strong>La hora que seleccionaste aún podría estar disponible:</strong></p>
    <p style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;">
      <strong>Abogado:</strong> ${lawyerName}<br/>
      <strong>Día:</strong> ${date}<br/>
      <strong>Hora:</strong> ${time}
    </p>
    <p>Puedes retomarla en menos de 30 segundos aquí:</p>
    <p><a href="${deepLink}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 18px;border-radius:6px;text-decoration:none;font-weight:600;">Retomar reserva</a></p>
    <p><strong>¿Por qué agendar ahora?</strong></p>
    <div style="margin:8px 0 0 0;">
      <div>Evitas que otro tome tu horario</div>
      <div>Recibes respuesta clara y directa a tu caso</div>
      <div>Precios transparentes desde el inicio</div>
    </div>
    <p style="margin-top:16px;">Si tienes dudas antes de pagar, puedes responder este correo y te ayudamos.</p>
    <p>— Equipo LegalUp</p>
    <p style="font-size:12px;color:#6b7280;">Abogados disponibles desde $30.000 · Respuesta rápida, sin compromiso inicial</p>
  </div>
</body>
</html>`,
  };
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
