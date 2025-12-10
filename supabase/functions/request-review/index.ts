// supabase/functions/scheduled-request-reviews/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json'
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Obtener citas que terminaron hace 2 horas y no tienen solicitud de revisión
    const twoHoursAgo = new Date()
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2)

    const { data: appointments, error } = await supabaseClient
      .from('appointments')
      .select('id, end_time, client_id, lawyer_id, status')
      .eq('status', 'completed')
      .lt('end_time', new Date().toISOString())
      .gt('end_time', twoHoursAgo.toISOString())
      .not('id', 'in', 
        supabaseClient
          .from('review_tokens')
          .select('appointment_id')
      )

    if (error) throw error

    // Para cada cita, crear un token de revisión
    const results = await Promise.allSettled(
      appointments.map(async (appointment: any) => {
        const reviewToken = crypto.randomUUID()
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 7) // Válido por 7 días

        // Guardar el token
        const { error: tokenError } = await supabaseClient
          .from('review_tokens')
          .insert({
            appointment_id: appointment.id,
            token: reviewToken,
            expires_at: expiresAt.toISOString(),
            used: false
          })

        if (tokenError) throw tokenError

        // Obtener información del abogado y del cliente
        const { data: lawyerData } = await supabaseClient
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', appointment.lawyer_id)
          .single()

        const { data: clientData } = await supabaseClient
          .from('profiles')
          .select('email, first_name, last_name')
          .eq('id', appointment.client_id)
          .single()

        if (!lawyerData || !clientData) {
          throw new Error('No se pudo obtener la información del abogado o del cliente')
        }

        // Enviar correo
        const reviewUrl = `${Deno.env.get('SITE_URL')}/review?token=${reviewToken}`
        
        const emailResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
          },
          body: JSON.stringify({
            to: clientData.email,
            subject: '¿Cómo fue tu experiencia con el abogado?',
            template: 'review_request',
            data: {
              client_name: `${clientData.first_name} ${clientData.last_name}`,
              lawyer_name: `${lawyerData.first_name} ${lawyerData.last_name}`,
              review_url: reviewUrl,
              appointment_date: new Date(appointment.end_time).toLocaleDateString('es-CL', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })
            }
          })
        })

        if (!emailResponse.ok) {
          const error = await emailResponse.text()
          throw new Error(`Error al enviar el correo: ${error}`)
        }

        return { 
          appointment_id: appointment.id,
          success: true 
        }
      })
    )

    // Procesar resultados
    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Solicitudes de revisión procesadas: ${successful} exitosas, ${failed} fallidas` 
      }),
      { headers: { ...corsHeaders } }
    )

  } catch (error) {
    console.error('Error en scheduled-request-reviews:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Error al procesar las solicitudes de revisión',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders } }
    )
  }
})