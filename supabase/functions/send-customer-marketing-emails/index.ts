import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CustomerData {
  email: string
  name?: string
}

interface RequestBody {
  emails: string[]
  subject: string
  customers: CustomerData[]
  testMode: boolean
}

function generateEmailHtml(customerName?: string): string {
  const greeting = customerName 
    ? `Hola ${customerName},` 
    : 'Hola,'

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>LegalUp - Soluciones Legales</title>
</head>
<body>
  <div style="max-width: 600px; margin: 0 auto; font-family: 'Inter', Arial, sans-serif; color: #101820; padding-bottom: 40px;">
    <div style="text-align: center; padding: 40px 20px;">
      <div style="color: #1e40af; font-size: 32px; font-weight: 700; margin-bottom: 20px;">
        <img src="https://legalup.cl/apple-touch-icon.png" alt="LegalUp" style="height: 50px; vertical-align: middle;" />
        <span style="color: #101820; font-size: 28px; position: relative; top: 2px; font-family: 'Outfit', sans-serif;">LegalUp</span>
      </div>
    </div>

    <div style="background-color: #ffffff; padding: 40px; border-radius: 8px; border: 1px solid #f1f5f9; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
      <p style="font-size: 16px; color: #64748b; line-height: 1.5; margin: 0 0 24px 0;">${greeting}</p>

      <h1 style="color: #0f172a; margin: 0 0 20px 0; font-size: 24px; font-weight: 800; line-height: 1.3;">¿Tienes un problema legal y no sabes por dónde empezar?</h1>

      <p style="font-size: 17px; color: #334155; line-height: 1.6; margin: 0 0 16px 0;">
        La mayoría de las personas espera demasiado… y termina pagando más caro o perdiendo opciones.
      </p>

      <p style="font-size: 17px; color: #334155; line-height: 1.6; margin: 0 0 32px 0;">
        Hablar con un abogado no debería ser complicado ni incierto.<br>
        Con LegalUp puedes hacerlo <strong>rápido, claro y 100% online.</strong>
      </p>

      <div style="text-align: center; margin: 32px 0;">
        <a href="https://legalup.cl/consulta" style="display: inline-block; background-color: #110d27; color: white; padding: 18px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px; letter-spacing: -0.01em;">
          Hablar con un abogado ahora
        </a>
      </div>

      <div style="background-color: #f8fafc; padding: 24px; border-radius: 8px; margin: 40px 0;">
        <h2 style="font-size: 16px; font-weight: 800; color: #0f172a; margin: 0 0 16px 0;">¿Por qué usar LegalUp?</h2>
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; font-size: 16px; color: #475569;">• <strong>Respuesta rápida</strong> de abogados verificados</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 16px; color: #475569;">• <strong>Precios claros</strong> desde el inicio</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 16px; color: #475569;">• <strong>Especialistas</strong> en arriendos, despidos, deudas, familia y más</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 16px; color: #475569;">• <strong>Sin trámites</strong> ni vueltas</td>
          </tr>
        </table>
      </div>

      <p style="font-size: 18px; color: #0f172a; font-weight: 800; margin: 32px 0 12px 0;">
        Empieza antes de que el problema crezca
      </p>
      
      <p style="font-size: 16px; color: #64748b; line-height: 1.6; margin: 0 0 32px 0;">
        Mientras antes actúes, más opciones tienes y <strong>menos te cuesta resolverlo.</strong>
      </p>

      <div style="text-align: center; margin: 24px 0;">
        <a href="https://legalup.cl" style="color: #111827; text-decoration: underline; font-weight: 600; font-size: 15px;">
          Ver cómo funciona
        </a>
      </div>

      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 40px 0;">

      <p style="color: #94a3b8; line-height: 1.6; margin: 0; font-weight: 500; font-size: 14px">Si tienes alguna duda, estamos para ayudarte.</p>
      <p style="color: #94a3b8; line-height: 1.6; margin: 0; font-weight: 500; font-size: 14px">Equipo de LegalUp</p>
    </div>

    <div style="text-align: center; margin-top: 40px; font-size: 12px; color: #94a3b8; line-height: 1.6;">
      <p style="margin: 5px 0;">© ${new Date().getFullYear()} LegalUp — Asesoría legal online en Chile.</p>
      <p style="margin: 5px 0;">Todos los derechos reservados.</p>
      <p style="margin: 5px 0; font-size: 11px;">Este es un correo automático, por favor no respondas a este mensaje.</p>
    </div>
  </div>
</body>
</html>`
}


serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY no está configurado')
    }

    const { emails, subject, customers, testMode }: RequestBody = await req.json()

    if (!emails || emails.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No se proporcionaron emails' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const results = await Promise.all(
      emails.map(async (email) => {
        try {
          // Find customer name if available
          const customer = customers?.find(c => c.email === email)
          const html = generateEmailHtml(customer?.name)

          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Juan de LegalUp <hola@mg.legalup.cl>',
              reply_to: 'hola@mg.legalup.cl',
              to: email,
              subject: subject,
              html: html,
            }),
          })

          if (!res.ok) {
            const error = await res.text()
            throw new Error(`Error de Resend: ${error}`)
          }

          const data = await res.json()
          return { email, success: true, id: data.id }
        } catch (error) {
          console.error(`Error enviando a ${email}:`, error)
          return { email, success: false, error: error.message }
        }
      })
    )

    const successful = results.filter(r => r.success)
    const failed = results.filter(r => !r.success)

    return new Response(
      JSON.stringify({
        success: true,
        sent: successful.length,
        failed: failed.length,
        results: results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error en edge function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
