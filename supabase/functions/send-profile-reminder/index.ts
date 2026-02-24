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
}

function buildEmailHtml(lawyerName: string, completionPercentage: number): string {
  const isIncomplete = completionPercentage < 60;
  const progressColor = isIncomplete ? '#ef4444' : '#10b981';

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
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="display: inline-block;">
          <img src="https://legalup.cl/apple-touch-icon.png" alt="LegalUp" style="height: 48px; width: 48px; vertical-align: middle; margin-right: 12px; border: 0;" />
          <span style="color: #1a202c; font-size: 32px; font-weight: 800; vertical-align: middle; line-height: 48px;">LegalUp</span>
        </div>
      </div>

      <p style="font-size: 16px; line-height: 1.6; color: #4a5568; margin-bottom: 20px;">Estimado/a <strong>${lawyerName}</strong>,</p>
      <p style="font-size: 16px; line-height: 1.6; color: #4a5568; margin-bottom: 25px;">Hemos notado que tu perfil de abogado en LegalUp está <strong>${completionPercentage}% completado</strong>. Un perfil completo es fundamental para atraer más clientes y destacar en nuestra plataforma.</p>

      <!-- Progress Bar (Table-based for maximum compatibility) -->
      <div style="margin: 30px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #edf2f7; border-radius: 20px; overflow: hidden; height: 24px; border-collapse: separate !important;">
          <tr>
            <td style="width: ${completionPercentage}%; background-color: ${progressColor}; height: 24px; border-radius: 20px;">
              <div style="height: 24px; width: 100%;"></div>
            </td>
            <td style="width: ${100 - completionPercentage}%; height: 24px;"></td>
          </tr>
        </table>
      </div>

      <!-- Stats Summary -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 25px 0; background-color: #f7fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
        <tr>
          <td width="50%" style="padding: 20px; text-align: center;">
            <div style="font-size: 28px; font-weight: 800; color: #2563eb; margin-bottom: 4px;">${completionPercentage}%</div>
            <div style="font-size: 13px; color: #718096; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Completado</div>
          </td>
          <td width="50%" style="padding: 20px; text-align: center; border-left: 1px solid #e2e8f0;">
            <div style="font-size: 28px; font-weight: 800; color: #2563eb; margin-bottom: 4px;">${100 - completionPercentage}%</div>
            <div style="font-size: 13px; color: #718096; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Pendiente</div>
          </td>
        </tr>
      </table>

      ${isIncomplete ? `
      <div style="background-color: #fff5f5; border: 1px solid #feb2b2; border-radius: 8px; padding: 18px; margin: 25px 0; color: #c53030; font-size: 15px; line-height: 1.5;">
        <strong style="display: block; margin-bottom: 6px;">⚠️ Importante:</strong> Tu perfil está menos del 60% completado. Esto puede afectar tu visibilidad y la confianza de los clientes potenciales en la plataforma.
      </div>` : ''}

      <h3 style="font-size: 19px; font-weight: 700; color: #2d3748; margin-top: 35px; margin-bottom: 20px;">¿Por qué completar tu perfil?</h3>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 30px;">
        <tr><td style="padding: 8px 0; color: #4a5568; font-size: 15px; border-bottom: 1px solid #f7fafc;">✅ <strong>Visibilidad:</strong> Aparece más arriba en los resultados de búsqueda.</td></tr>
        <tr><td style="padding: 8px 0; color: #4a5568; font-size: 15px; border-bottom: 1px solid #f7fafc;">🤝 <strong>Confianza:</strong> Perfiles detallados generan mayor seguridad en los clientes.</td></tr>
        <tr><td style="padding: 8px 0; color: #4a5568; font-size: 15px; border-bottom: 1px solid #f7fafc;">📈 <strong>Conversión:</strong> Mejora tus probabilidades de concretar asesorías.</td></tr>
        <tr><td style="padding: 8px 0; color: #4a5568; font-size: 15px;">🌟 <strong>Diferenciación:</strong> Destaca tu experiencia y especialidades ante la competencia.</td></tr>
      </table>

      <!-- CTA Button (Bulletproof Table Button) -->
      <div style="text-align: center; padding: 25px 0;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
          <tr>
            <td align="center" style="border-radius: 8px; background-color: #2563eb;">
              <a href="https://legalup.cl/lawyer/profile" target="_blank" style="font-size: 18px; font-family: 'Inter', Arial, sans-serif; color: #ffffff; text-decoration: none; padding: 18px 36px; border-radius: 8px; display: inline-block; font-weight: 700;">Completar mi perfil</a>
            </td>
          </tr>
        </table>
      </div>

      <div style="background-color: #f8fafc; border-radius: 12px; padding: 25px; margin-top: 35px;">
        <p style="font-size: 16px; font-weight: 700; color: #2d3748; margin-bottom: 15px;">Secciones recomendadas:</p>
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="color: #4a5568; font-size: 15px;">
          <tr>
             <td style="padding: 4px 0; width: 50%;">• Biografía profesional</td>
             <td style="padding: 4px 0; width: 50%;">• Experiencia laboral</td>
          </tr>
          <tr>
             <td style="padding: 4px 0;">• Educación</td>
             <td style="padding: 4px 0;">• Especialidades</td>
          </tr>
          <tr>
             <td style="padding: 4px 0;">• Disponibilidad</td>
             <td style="padding: 4px 0;">• Tarifas</td>
          </tr>
        </table>
      </div>

      <div style="margin-top: 50px; padding-top: 30px; border-top: 1px solid #edf2f7; text-align: center;">
        <p style="font-size: 13px; color: #718096; margin-bottom: 8px;">Si tienes alguna pregunta, contáctanos en <a href="mailto:soporte@legalup.cl" style="color: #2563eb; text-decoration: none; font-weight: 600;">soporte@legalup.cl</a></p>
        <p style="font-size: 13px; color: #a0aec0; margin-bottom: 8px;">© ${new Date().getFullYear()} LegalUp. Todos los derechos reservados.</p>
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
    const { lawyerName, completionPercentage, testMode } = body

    // In test mode always send to test email; otherwise use real lawyerEmail
    const TEST_EMAIL = 'juan.fercommerce@gmail.com'
    const toEmail = testMode ? TEST_EMAIL : body.lawyerEmail
    const resolvedName = lawyerName || 'Abogado/a'
    const resolvedPercentage = completionPercentage ?? 45

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    let emailSent = false
    let emailMessage = 'Email logged (no RESEND_API_KEY configured)'

    console.log('=== send-profile-reminder ===')
    console.log('To:', toEmail, '| testMode:', testMode, '| completion:', resolvedPercentage)
    console.log('RESEND_API_KEY available:', !!resendApiKey)

    if (resendApiKey) {
      try {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'LegalUp <servicios@mg.legalup.cl>',
            to: [toEmail],
            subject: `Importante: Completa tu perfil de abogado en LegalUp`,
            html: buildEmailHtml(resolvedName, resolvedPercentage),
          }),
        })

        const resendResult = await emailResponse.json()

        if (emailResponse.ok) {
          emailSent = true
          emailMessage = `Email sent via Resend (ID: ${resendResult.id})`
          console.log('✅ Email sent:', resendResult)
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
