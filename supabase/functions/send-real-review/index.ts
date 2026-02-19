import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { Resend } from 'https://esm.sh/resend@2.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, lawyerId } = await req.json()

    if (!email || !lawyerId) {
      throw new Error('Email y lawyerId son requeridos')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

    // Buscar la última cita del cliente
    const { data: appointments, error: appointmentError } = await supabaseClient
      .from('appointments')
      .select('*')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1)

    if (appointmentError) throw appointmentError

    if (!appointments || appointments.length === 0) {
      throw new Error('No se encontraron citas para este cliente')
    }

    const appointment = appointments[0]

    // Obtener información del abogado
    const { data: lawyerData } = await supabaseClient
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', lawyerId)
      .single()

    if (!lawyerData) {
      throw new Error('No se encontró información del abogado')
    }

    // Crear un token de reseña
    const reviewToken = crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // Guardar el token en la base de datos con el appointment_id real
    const { error: tokenError } = await supabaseClient
      .from('review_tokens')
      .insert({
        appointment_id: appointment.id,
        token: reviewToken,
        expires_at: expiresAt.toISOString(),
        used: false
      })

    if (tokenError) throw tokenError

    const reviewUrl = `https://legalup.cl/review?token=${reviewToken}`
    
    // Prioridad para el nombre: 1. Tabla appointments, 2. Email, 3. "Cliente"
    const clientFirstName = appointment.name?.split(' ')[0] || 
                            email.split('@')[0].split('.')[0] || 
                            'Cliente'

    await resend.emails.send({
      from: 'LegalUp <noreply@mg.legalup.cl>',
      to: email,
      subject: '¿Cómo fue tu experiencia con el abogado?',
      html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Califica al Abogado</title>
      </head>
      <body>
        <div style="max-width: 600px; margin: 0 auto; font-family: 'Inter', Arial, sans-serif; color: #101820;">
          <div style="text-align: center; padding: 30px 20px;">
            <div style="color: #1e40af; font-size: 32px; font-weight: 700; margin-bottom: 15px;">
              <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMyNTYzZWEiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBjbGFzcz0ibHVjaWRlIGx1Y2lkZS1zY2FsZS1pY29uIGx1Y2lkZS1zY2FsZSI+PHBhdGggZD0ibTE2IDE2IDMtOCAzIDhjLS44Ny42NS0xLjkyIDEtMyAxcy0yLjEzLS4zNS0zLTFaIi8+PHBhdGggZD0ibTIgMTYgMy04IDMgOGMtLjg3LjY1LTEuOTIgMS0zIDFzLTIuMTMtLjM1LTMtMVoiLz48cGF0aCBkPSJNNyAyMWgxMCIvPjxwYXRoIGQ9Ik0xMiAzdjE4Ii8+PHBhdGggZD0iTTMgN2gyYzIgMCA1LTEgNy0yIDIgMSAxIDUgMiA3IDJoMiIvPjwvc3ZnPg==" alt="LegalUp" style="height: 40px; vertical-align: middle; margin-right: 8px;" />
              <span style="color: #101820; font-size: 28px; position: relative; top: -2px;">LegalUp</span>
            </div>
          </div>
          
          <div style="background-color: #ffffff; padding: 30px; border-radius: 4px; border: 1px solid #e2e8f0;">
            <h1 style="color: #101820; margin: 0 0 20px 0; font-size: 22px;">¡Escribe una reseña!</h1>
            <p style="color: #475569; line-height: 1.6; font-size: 16px;">Hola ${clientFirstName},</p>
            <p style="color: #475569; line-height: 1.6;">Esperamos que tu cita con el abogado <strong>${lawyerData.first_name} ${lawyerData.last_name}</strong> haya sido de gran ayuda.</p>
            <p style="color: #475569; line-height: 1.6;">Tu opinión es fundamental para nosotros y para otros usuarios que buscan asesoría legal de calidad.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${reviewUrl}" style="background-color: #2563eb; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Dejar mi reseña ahora
              </a>
            </div>
            <p style="color: #666; font-size: 14px; text-align: center;">Este enlace será válido por 7 días.</p>
            <p style="color: #475569; line-height: 1.6; margin: 0; margin-top: 20px;">¡Saludos! 👋</p>
            <p style="color: #475569; line-height: 1.6; margin: 0; font-weight: 500;">Equipo de LegalUp</p>
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
    })

    return new Response(
      JSON.stringify({ 
        success: true,
        email,
        lawyerId,
        appointmentId: appointment.id,
        lawyerName: `${lawyerData.first_name} ${lawyerData.last_name}`,
        reviewUrl,
        message: 'Email de reseña real enviado correctamente'
      }),
      { headers: { ...corsHeaders } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders } }
    )
  }
})
