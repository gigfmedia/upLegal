import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@2.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface EmailRequest {
  emails: string[]
  message: string
  lawyers: Array<{
    id: string
    email: string
    display_name?: string
    first_name?: string
    last_name?: string
  }>
  testMode?: boolean
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      status: 200,
      headers: corsHeaders,
    })
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405,
      headers: corsHeaders 
    })
  }

  try {
    const { emails, message, lawyers, testMode = false }: EmailRequest = await req.json()

    if (!emails || emails.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No emails provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: 'Missing RESEND_API_KEY' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Resend
    const resend = new Resend(resendApiKey)

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${testMode ? 'TEST - ' : ''}Completa tu perfil</title>
      </head>
      <body>
        <div style="max-width: 600px; margin: 0 auto; font-family: 'Inter', Arial, sans-serif; color: #101820;">
          <div style="text-align: center; padding: 30px 20px;">
            <div style="color: #1e40af; font-size: 32px; font-weight: 700; margin-bottom: 15px;">
              <img src="https://legalup.cl/apple-touch-icon.png" alt="LegalUp" style="height: 40px; vertical-align: middle; margin-right: 8px;" />
              <span style="color: #101820; font-size: 28px; position: relative; top: -2px;">LegalUp</span>
            </div>
          </div>

          <div style="background-color: #ffffff; padding: 30px; border-radius: 4px; border: 1px solid #e2e8f0;">
            <h1 style="color: #101820; margin: 0 0 20px 0; font-size: 22px;">${testMode ? 'T' : ''}Completa tu perfil para recibir más clientes</h1>
            <p style="color: #475569; line-height: 1.6; font-size: 16px;">
              ${testMode ? 'mailing.' : ''}
            </p>

            <div style="white-space: pre-wrap; font-family: 'Inter', Arial, sans-serif; color: #101820; margin: 20px 0; line-height: 1.6; font-size: 16px;">${message}</div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="https://legalup.cl/lawyer/profile" style="display: inline-block; background-color: #110d27; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 10px 0;">
                Ir a mi perfil
              </a>
            </div>
            <p style="color: #475569; line-height: 1.6; margin: 0; font-weight: 500;">Si tienes alguna duda, estamos para ayudarte.</p>
            <p style="color: #475569; line-height: 1.6; margin: 0; font-weight: 500;">Saludos,</p>
            <p style="color: #475569; line-height: 1.6; margin: 0; font-weight: 500;">El equipo de LegalUp</p>
          </div>

          <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #6b7280; line-height: 1.5;">
            <p style="margin: 5px 0;">Si tienes alguna pregunta, no dudes en contactarnos en <a href="mailto:soporte@legalup.cl" style="color: #2563eb; text-decoration: none;">soporte@legalup.cl</a></p>
            <p style="margin: 5px 0;">© ${new Date().getFullYear()} LegalUp. Todos los derechos reservados.</p>
            <p style="margin: 5px 0; font-size: 11px; color: #9ca3af;">Este es un correo automático, por favor no respondas a este mensaje.</p>
          </div>
        </div>
      </body>
      </html>
    `

    // Send emails using Resend
    const emailPromises = emails.map(async (email) => {
      try {
        console.log(`Sending incomplete profile email to ${email} (testMode=${testMode})`)

        const { data, error } = await resend.emails.send({
          from: 'LegalUp <noreply@mg.legalup.cl>',
          to: email,
          subject: testMode ? 'TEST - Completa tu perfil en LegalUp' : 'Completa tu perfil en LegalUp',
          html: emailHtml,
        })

        if (error) throw error

        console.log('Email sent successfully:', data)
        return { success: true, email, data }
      } catch (error) {
        console.error(`Failed to send email to ${email}:`, error)
        return { success: false, email, error: error.message }
      }
    })

    const results = await Promise.all(emailPromises)
    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success)

    // Log the action
    try {
      await supabase.from('admin_logs').insert({
        action: 'send_incomplete_profile_emails',
        details: {
          total_emails: emails.length,
          successful,
          failed: failed.length,
          test_mode: testMode,
          lawyers: lawyers.map(l => ({ id: l.id, email: l.email, name: l.display_name }))
        }
      })
    } catch (logError) {
      console.error('Failed to log action:', logError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: testMode 
          ? `Test email sent successfully to ${emails.length} recipient(s)`
          : `Sent ${successful} emails successfully`,
        failed: failed.length,
        results
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in send-incomplete-profile-emails function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Internal server error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
