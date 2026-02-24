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
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; }
    .container { background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { text-align: center; }
    .logo { font-size: 28px; font-weight: bold; margin-bottom: 10px; }
    .progress-bar { background-color: #e9ecef; border-radius: 10px; height: 20px; overflow: hidden; margin: 20px 0; }
    .progress-fill { background-color: ${progressColor}; height: 100%; width: ${completionPercentage}%; }
    .stats { display: flex; justify-content: space-around; margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-radius: 8px; }
    .stat-item { text-align: center; }
    .stat-number { font-size: 24px; font-weight: bold; color: #2563eb; }
    .stat-label { font-size: 14px; color: #6c757d; }
    .cta-button { display: inline-block; background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
    .warning { background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 15px; margin: 20px 0; color: #991b1b; }
    .benefit-item { display: flex; align-items: center; margin: 10px 0; }
    .benefit-icon { color: #10b981; margin-right: 10px; font-size: 18px; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef; text-align: center; color: #6c757d; font-size: 14px; }
  </style>
</head>
<body>
  <div style="max-width: 600px; margin: 0 auto; font-family: 'Inter', Arial, sans-serif; color: #101820;">
    <div class="header">
      <div style="text-align: center; padding: 10px 20px;">
        <div style="color: #1e40af; font-size: 32px; font-weight: 700; margin-bottom: 15px;">
          <img src="https://legalup.cl/apple-touch-icon.png" alt="LegalUp" style="height: 40px; vertical-align: middle; margin-right: 8px;" />
          <span style="color: #101820; font-size: 28px; position: relative; top: -2px;">LegalUp</span>
        </div>
      </div>
    </div>

    <p>Estimado/a <strong>${lawyerName}</strong>,</p>
    <p>Hemos notado que tu perfil de abogado en LegalUp está <strong>${completionPercentage}% completado</strong>. Un perfil completo es fundamental para atraer más clientes y destacar en nuestra plataforma.</p>

    <div class="progress-bar">
      <div class="progress-fill"></div>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0; background-color: #f8f9fa; border-radius: 8px;">
      <tr>
        <td width="50%" style="padding: 15px; text-align: center;">
          <div style="font-size: 24px; font-weight: bold; color: #2563eb;">${completionPercentage}%</div>
          <div style="font-size: 14px; color: #6c757d;">Completado</div>
        </td>
        <td width="50%" style="padding: 15px; text-align: center; border-left: 1px solid #e9ecef;">
          <div style="font-size: 24px; font-weight: bold; color: #2563eb;">${100 - completionPercentage}%</div>
          <div style="font-size: 14px; color: #6c757d;">Pendiente</div>
        </td>
      </tr>
    </table>

    ${isIncomplete ? `
    <div class="warning">
      <strong>Importante:</strong> Tu perfil está menos del 60% completado. Esto puede afectar tu visibilidad y la confianza de los clientes potenciales.
    </div>` : ''}

    <h3>¿Por qué completar tu perfil?</h3>
    <div class="benefit-item">✔️ Aumenta tu visibilidad en búsquedas</span></div>
    <div class="benefit-item">✔️ Genera más confianza en los clientes</span></div>
    <div class="benefit-item">✔️ Mejora tus oportunidades de ser contactado</span></div>
    <div class="benefit-item">✔️ Destaca sobre otros abogados</span></div>

    <div style="text-align:center; margin: 30px 0;">
      <a href="https://legalup.cl/lawyer/profile" class="cta-button" style="color: #ffffff">Completar mi perfil</a>
    </div>

    <p><strong>Secciones recomendadas para completar:</strong></p>
    <ul>
      <li>Biografía profesional</li>
      <li>Experiencia laboral</li>
      <li>Educación y certificaciones</li>
      <li>Especialidades legales</li>
      <li>Idiomas que hablas</li>
      <li>Disponibilidad y horarios</li>
      <li>Tarifas y honorarios</li>
      <li>Ubicación</li>
    </ul>

    <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #6b7280; line-height: 1.5;">
      <p style="margin: 5px 0;">Si tienes alguna pregunta, no dudes en contactarnos en <a href="mailto:soporte@legalup.cl" style="color: #2563eb; text-decoration: none;">soporte@legalup.cl</a></p>
      <p style="margin: 5px 0;">© ${new Date().getFullYear()} LegalUp. Todos los derechos reservados.</p>
      <p style="margin: 5px 0; font-size: 11px; color: #9ca3af;">Este es un correo automático, por favor no respondas a este mensaje.</p>
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
