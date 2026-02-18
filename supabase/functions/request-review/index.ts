// supabase/functions/request-review/index.ts
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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

    // 1. Obtener citas confirmadas que terminaron recientemente
    // Como no hay end_time, calculamos basado en appointment_date y appointment_time
    const now = new Date()
    const fiveHoursAgo = new Date(now.getTime() - (5 * 60 * 60 * 1000))
    
    console.log(`Buscando citas entre ${fiveHoursAgo.toISOString()} y ${now.toISOString()}`)

    // Traemos citas de hoy y ayer que estén 'confirmed'
    const today = now.toISOString().split('T')[0]
    const yesterday = new Date(now.getTime() - 86400000).toISOString().split('T')[0]

    const { data: appointments, error } = await supabaseClient
      .from('appointments')
      .select('id, appointment_date, appointment_time, duration, user_id, lawyer_id, status')
      .eq('status', 'confirmed')
      .in('appointment_date', [yesterday, today])

    if (error) throw error

    // 2. Filtrar las que ya terminaron (hace más de 1 hora) y no tienen token aún
    const appointmentsToRequest = []
    
    for (const appt of appointments) {
       // Construir timestamp de fin: date + time + duration
       const startStr = `${appt.appointment_date}T${appt.appointment_time}`
       const startTime = new Date(startStr)
       const endTime = new Date(startTime.getTime() + (appt.duration || 60) * 60 * 1000)
       
       // Si terminó hace más de 1 hora pero menos de 24 horas
       const oneHourAgo = new Date(now.getTime() - (60 * 60 * 1000))
       const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000))

       if (endTime < oneHourAgo && endTime > twentyFourHoursAgo) {
          // Verificar si ya tiene token
          const { data: existingToken } = await supabaseClient
            .from('review_tokens')
            .select('id')
            .eq('appointment_id', appt.id)
            .single()
          
          if (!existingToken) {
            appointmentsToRequest.push(appt)
          }
       }
    }

    console.log(`Citas candidatas para reseña: ${appointmentsToRequest.length}`)

    // 3. Procesar envíos
    const results = await Promise.allSettled(
      appointmentsToRequest.map(async (appointment) => {
        const reviewToken = crypto.randomUUID()
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 7)

        const { error: tokenError } = await supabaseClient
          .from('review_tokens')
          .insert({
            appointment_id: appointment.id,
            token: reviewToken,
            expires_at: expiresAt.toISOString(),
            used: false
          })

        if (tokenError) throw tokenError

        const { data: lawyerData } = await supabaseClient
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', appointment.lawyer_id)
          .single()

        const { data: clientData } = await supabaseClient
          .from('profiles')
          .select('email, first_name, last_name')
          .eq('user_id', appointment.user_id)
          .single()

        if (!lawyerData || !clientData || !clientData.email) {
          throw new Error(`Información incompleta para cita ${appointment.id}`)
        }

        const reviewUrl = `${Deno.env.get('SITE_URL') || 'https://uplegal.cl'}/review?token=${reviewToken}`
        
        await resend.emails.send({
          from: 'LegalUp <noreply@mg.legalup.cl>',
          to: clientData.email,
          subject: '¿Cómo fue tu experiencia con el abogado?',
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>¡Hola ${clientData.first_name}!</h2>
              <p>Esperamos que tu cita con el abogado <strong>${lawyerData.first_name} ${lawyerData.last_name}</strong> haya sido de gran ayuda.</p>
              <p>Tu opinión es fundamental para nosotros y para otros usuarios que buscan asesoría legal de calidad.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${reviewUrl}" style="background-color: #2563eb; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  Dejar mi reseña ahora
                </a>
              </div>
              <p style="color: #666; font-size: 14px;">Este enlace será válido por 7 días.</p>
              <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="color: #999; font-size: 12px;">Equipo LegalUp</p>
            </div>
          `
        })

        return { id: appointment.id }
      })
    )

    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: appointmentsToRequest.length,
        successful,
        failed
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