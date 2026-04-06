import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProfileReminderData {
  lawyerEmail: string;
  lawyerName: string;
  completionPercentage: number;
  testMode?: boolean;
  isMissingPriceOnly?: boolean;
}

function buildEmailHtml(lawyerName: string, completionPercentage: number, isMissingPriceOnly: boolean = false): string {
  const isIncomplete = completionPercentage < 60;
  const progressColor = isIncomplete ? '#ef4444' : (isMissingPriceOnly ? '#f59e0b' : '#10b981');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recordatorio de Perfil - LegalUp</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f7; font-family: 'Inter', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <div style="width: 100%; background-color: #f4f4f7; padding: 40px 0;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
      
      <!-- Logo Header -->
      <div style="text-align: center; margin-bottom: 40px;">
        <div style="display: inline-block;">
          <img src="https://legalup.cl/apple-touch-icon.png" alt="LegalUp" style="height: 48px; width: 48px; vertical-align: middle; margin-right: 12px; border: 0;" />
          <span style="color: #1a202c; font-size: 32px; font-weight: 800; vertical-align: middle; line-height: 48px;">LegalUp</span>
        </div>
      </div>

      <p style="font-size: 16px; line-height: 1.6; color: #4a5568; margin-bottom: 20px;">Estimado/a <strong>${lawyerName}</strong>,</p>
      <p style="font-size: 16px; line-height: 1.6; color: #4a5568; margin-bottom: 25px;">
        Te escribo porque notamos que tu perfil en LegalUp está al <strong>${completionPercentage}%</strong>. Un perfil completo es clave para que los clientes confíen y agenden contigo.
      </p>

      ${isIncomplete ? `
      <div style="background-color: #fff5f5; border: 1px solid #feb2b2; border-radius: 8px; padding: 18px; margin: 25px 0; color: #c53030; font-size: 15px; line-height: 1.5;">
        <strong style="display: block; margin-bottom: 6px;">Importante:</strong> Tu perfil está menos del 60% completado. Esto puede afectar tu visibilidad y la confianza de los clientes potenciales en la plataforma.
      </div>` : ''}

      ${isMissingPriceOnly ? `
      <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 18px; margin: 25px 0; color: #92400e; font-size: 15px; line-height: 1.5;">
        <strong style="display: block; margin-bottom: 6px;">¡Tu perfil está casi listo! </strong> Solo te falta configurar tu <strong>precio por hora</strong>. Este es el único paso que falta para que tu perfil sea visible y los clientes puedan empezar a agendar asesorías contigo.
      </div>` : ''}

      <h3 style="font-size: 19px; font-weight: 700; color: #2d3748; margin-top: 35px; margin-bottom: 20px;">¿Por qué completar tu perfil?</h3>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 30px;">
        <tr><td style="padding: 8px 0; color: #4a5568; font-size: 15px; border-bottom: 1px solid #f7fafc;"><strong>Visibilidad:</strong> Aparece más arriba en los resultados de búsqueda.</td></tr>
        <tr><td style="padding: 8px 0; color: #4a5568; font-size: 15px; border-bottom: 1px solid #f7fafc;"><strong>Confianza:</strong> Perfiles detallados generan mayor seguridad en los clientes.</td></tr>
        <tr><td style="padding: 8px 0; color: #4a5568; font-size: 15px; border-bottom: 1px solid #f7fafc;"><strong>Conversión:</strong> Mejora tus probabilidades de concretar asesorías.</td></tr>
        <tr><td style="padding: 8px 0; color: #4a5568; font-size: 15px;"><strong>Diferenciación:</strong> Destaca tu experiencia y especialidades ante la competencia.</td></tr>
      </table>

      <!-- CTA Button (Bulletproof Table Button) -->
      <div style="text-align: left; padding: 20px 0;">
        <a href="https://legalup.cl/lawyer/profile" target="_blank" style="font-size: 16px; font-family: 'Inter', Arial, sans-serif; color: #2563eb; text-decoration: underline; font-weight: 700;">Haz clic aquí para completar los detalles de tu perfil</a>
      </div>

      <div style="margin-top: 30px; padding-top: 30px; border-top: 1px solid #edf2f7; text-align: center;">
        <p style="font-size: 13px; color: #718096; margin-bottom: 8px;">Si tienes alguna pregunta, contáctanos en <a href="mailto:soporte@legalup.cl" style="color: #2563eb; text-decoration: none; font-weight: 600;">soporte@legalup.cl</a></p>
        <p style="font-size: 13px; color: #a0aec0; margin-bottom: 8px;">© ${new Date().getFullYear()} LegalUp — Asesoría legal online en Chile.</p>
        <p style="font-size: 13px; color: #a0aec0; margin-bottom: 8px;">Todos los derechos reservados.</p>
        <p style="font-size: 11px; color: #cbd5e0; line-height: 1.4;">Este es un mensaje automático para optimizar tu presencia en LegalUp. Si ya completaste tu perfil, puedes ignorar este aviso.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body: ProfileReminderData = await req.json()
    const { lawyerName, completionPercentage, testMode, isMissingPriceOnly } = body

    // In test mode always send to test email; otherwise use real lawyerEmail
    const TEST_EMAIL = 'juan.fercommerce@gmail.com'
    const toEmail = testMode ? TEST_EMAIL : body.lawyerEmail
    const resolvedName = lawyerName || 'Abogado/a'
    const resolvedPercentage = completionPercentage ?? 45
    const resolvedMissingPrice = isMissingPriceOnly ?? false

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    let emailSent = false
    let emailMessage = 'Email logged (no RESEND_API_KEY configured)'

    if (resendApiKey) {
      try {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Juan de LegalUp <hola@mg.legalup.cl>',
            reply_to: 'hola@legalup.cl',
            to: [toEmail],
            subject: isMissingPriceOnly 
               ? `Consulta sobre tu precio por hora en LegalUp`
               : `Duda sobre tu perfil de abogado en LegalUp`,
            html: buildEmailHtml(resolvedName, resolvedPercentage, resolvedMissingPrice),
          }),
        })

        const resendResult = await emailResponse.json()

        if (emailResponse.ok) {
          emailSent = true
          emailMessage = `Email sent via Resend (ID: ${resendResult.id})`
        } else {
          emailMessage = `Resend error: ${resendResult?.message || emailResponse.status}`
          console.error('❌ Resend API error:', resendResult)
        }
      } catch (resendError) {
        console.error('Error sending via Resend:', resendError)
        emailMessage = `Resend fetch error: ${resendError}`
      }
    }

    // Log to DB
    const { error: logError } = await supabase
      .from('profile_reminders')
      .insert({
        lawyer_email: toEmail,
        lawyer_name: resolvedName,
        completion_percentage: resolvedPercentage,
        sent_at: new Date().toISOString(),
        email_type: resolvedPercentage < 60 ? 'incomplete' : 'reminder',
        email_sent: emailSent,
      })

    if (logError) {
      console.warn('Could not log reminder to DB (table may not exist):', logError.message)
    }

    return new Response(
      JSON.stringify({
        success: emailSent,
        message: emailMessage,
        lawyerEmail: toEmail,
        completionPercentage: resolvedPercentage,
        emailSent,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Error in send-profile-reminder:', message)
    return new Response(
      JSON.stringify({ error: message, success: false }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
