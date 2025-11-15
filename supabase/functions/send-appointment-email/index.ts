import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { Resend } from 'https://esm.sh/resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('Solicitud recibida:', req.method, req.url);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { 
      clientEmail, 
      clientName, 
      lawyerName, 
      appointmentDate, 
      appointmentTime, 
      serviceType, 
      status, 
      meetingDetails, 
      notes,
      sendToLawyer = false,
      isLawyerEmail = false  // Nuevo parámetro para identificar si es correo del abogado
    } = await req.json();

    // Initialize Resend with API key
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    console.log('Resend API Key:', resendApiKey ? '***' + resendApiKey.slice(-4) : 'No encontrada');
    const resend = new Resend(resendApiKey);

    // Get lawyer's email from the database
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { 
        global: { headers: { Authorization: req.headers.get('Authorization')! } } 
      }
    );

    // Para simplificar, usamos el correo del cliente como destinatario del abogado
    // En producción, deberías tener una forma de obtener el correo real del abogado
    const lawyerEmail = clientEmail; // Temporal: usar el mismo correo para pruebas

    // Format the email content directly in HTML
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    const contactMethod = meetingDetails?.includes('Videollamada') ? 'Videollamada' : 'Llamada telefónica';
    const duration = meetingDetails?.match(/Duración: (\d+) minutos/)?.[1] || '60';
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Confirmación de Cita</title>
      </head>
      <body>
        <div style="max-width: 600px; margin: 0 auto; font-family: 'Inter', Arial, sans-serif; color: #101820;">
          <div style="text-align: center; padding: 30px 20px;">
            <div style="color: #1e40af; font-size: 32px; font-weight: 700; margin-bottom: 15px;">
              <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMyNTYzZWEiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBjbGFzcz0ibHVjaWRlIGx1Y2lkZS1zY2FsZS1pY29uIGx1Y2lkZS1zY2FsZSI+PHBhdGggZD0ibTE2IDE2IDMtOCAzIDhjLS44Ny42NS0xLjkyIDEtMyAxcy0yLjEzLS4zNS0zLTFaIi8+PHBhdGggZD0ibTIgMTYgMy04IDMgOGMtLjg3LjY1LTEuOTIgMS0zIDFzLTIuMTMtLjM1LTMtMVoiLz48cGF0aCBkPSJNNyAyMWgxMCIvPjxwYXRoIGQ9Ik0xMiAzdjE4Ii8+PHBhdGggZD0iTTMgN2gyYzIgMCA1LTEgNy0yIDIgMSA1IDIgNyAyaDIiLz48L3N2Zz4=" alt="LegalUp" style="height: 40px; vertical-align: middle; margin-right: 8px;" />
              <span style="color: #101820; font-size: 28px; position: relative; top: -2px;">LegalUp</span>
            </div>
          </div>
          
          <div style="background-color: #ffffff; padding: 30px; border-radius: 4px; border: 1px solid #e2e8f0;">
            <h1 style="color: #101820; margin: 0 0 20px 0; font-size: 22px;">¡Tu cita ha sido agendada con éxito!</h1>
            <p style="color: #475569; line-height: 1.6; font-size: 16px;">Hola ${isLawyerEmail ? 'Abogado/a' : clientName},</p>
            <p style="color: #475569; line-height: 1.6; margin-bottom: 20px;">Gracias por confiar en LegalUp para tus asesorías legales. Tu cita ha sido confirmada con éxito.</p>
            
            <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 25px 0; border: 1px solid #e2e8f0;">
              <p style="margin: 10px 0; color: #101820;"><strong>Abogado:</strong> ${lawyerName}</p>
              <p style="margin: 10px 0; color: #101820;"><strong>Tipo de servicio:</strong> ${serviceType === 'legal-advice' ? 'Asesoría Legal' : 'Otro servicio'}</p>
              <p style="margin: 10px 0; color: #101820;"><strong>Fecha:</strong> ${formatDate(appointmentDate)}</p>
              <p style="margin: 10px 0; color: #101820;"><strong>Hora:</strong> ${appointmentTime}</p>
              <p style="margin: 10px 0; color: #101820;"><strong>Duración:</strong> ${duration} minutos</p>
              <p style="margin: 10px 0; color: #101820;"><strong>Modalidad:</strong> ${contactMethod}</p>
              ${notes ? `<p style="margin: 10px 0; color: #101820;"><strong>Detalles:</strong> ${notes}</p>` : ''}
            </div>
            
            <p style="color: #475569; line-height: 1.6; margin-bottom: 20px;">
              ${contactMethod === 'Videollamada' 
                ? 'Recibirás un correo con el enlace para unirte a la videollamada 15 minutos antes de la cita.'
                : 'El abogado te llamará al número proporcionado al momento de la cita.'
              }
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://uplegal.netlify.app/${isLawyerEmail ? 'lawyer/citas' : 'dashboard/appointments'}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 10px 0;">
                Ver detalles de mi cita
              </a>
            </div>
            
            <p style="color: #475569; line-height: 1.6; margin-bottom: 20px;">
              Si necesitas modificar o cancelar tu cita, por favor hazlo con al menos 24 horas de anticipación.
            </p>
            <p style="color: #475569; line-height: 1.6; margin: 0;">¡Te esperamos!</p>
            <p style="color: #475569; line-height: 1.6; margin: 0; font-weight: 500;">El equipo de LegalUp</p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #6b7280; line-height: 1.5;">
            <p style="margin: 5px 0;">Si tienes alguna pregunta, no dudes en contactarnos en <a href="mailto:soporte@legalup.app" style="color: #2563eb; text-decoration: none;">soporte@legalup.app</a></p>
            <p style="margin: 5px 0;">© ${new Date().getFullYear()} LegalUp. Todos los derechos reservados.</p>
            <p style="margin: 5px 0; font-size: 11px; color: #9ca3af;">Este es un correo automático, por favor no respondas a este mensaje.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email to client using Resend's test domain
    console.log('Enviando correo a:', clientEmail);
    const emailResponse = await resend.emails.send({
      from: 'onboarding@resend.dev',  // Usando dominio verificado de Resend
      to: 'gigfmedia@icloud.com',  // Solo para pruebas, reemplaza con clientEmail después
      subject: `[PRUEBA] Confirmación de cita con ${lawyerName}`,
      html: emailHtml,
    }).catch(error => {
      console.error('Error al enviar correo:', error);
      throw error;
    });
    
    console.log('Respuesta de Resend:', JSON.stringify(emailResponse, null, 2));

    // Si sendToLawyer es true, también enviamos al abogado
    if (sendToLawyer) {
      await resend.emails.send({
        from: 'onboarding@resend.dev',  // Usando dominio verificado de Resend
        to: 'gigfmedia@icloud.com',  // Solo para pruebas
        subject: `[PRUEBA - ABOGADO] Nueva cita con ${clientName}`,
        html: emailHtml.replace('¡Cita confirmada!', 'Tienes una nueva cita')
                     .replace('Como abogado,', 'Como cliente,')
                     .replace('el abogado te contactará', 'tú contactarás al cliente'),
      });
    }

    const response = {
      success: true,
      clientEmail: clientEmail,
      timestamp: new Date().toISOString(),
      resendResponse: emailResponse
    };
    
    console.log('Respuesta exitosa:', JSON.stringify(response, null, 2));
    
    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error sending email:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to send email', 
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
