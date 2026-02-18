import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { Resend } from 'https://esm.sh/resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { 
      clientEmail, 
      clientName, 
      lawyerName, 
      lawyerId, // Added lawyerId
      lawyerEmail: passedLawyerEmail, // Added lawyerEmail from request
      appointmentDate, 
      appointmentTime, 
      serviceType, 
      status, 
      meetingDetails, 
      notes,
      sendToLawyer = false,
      isLawyerEmail = false,
      meetLink: providedMeetLink = null, // Nuevo parámetro para el enlace de Google Meet
      contactMethod: passedContactMethod // Extract contactMethod from request
    } = await req.json();

    // Initialize Resend with API key
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const resend = new Resend(resendApiKey);

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { 
        global: { headers: { Authorization: req.headers.get('Authorization')! } } 
      }
    );

    // Determine lawyer's email
    let lawyerEmail = passedLawyerEmail || null;
    
    if (sendToLawyer && !lawyerEmail) {
      // First fetch the user_id from profiles, since profiles doesn't have email
      let query = supabaseClient.from('profiles').select('user_id');
      
      if (lawyerId) {
        query = query.eq('id', lawyerId);
      } else {
        query = query.eq('first_name', lawyerName.split(' ')[0]).eq('role', 'lawyer');
      }
      
      const { data: profileData, error: profileError } = await query.single();
      
      if (profileError) {
        console.error('Error fetching lawyer profile:', profileError);
      } else if (profileData && profileData.user_id) {
        // Now fetch the email from auth.users using the service role key
        const { data: userData, error: userError } = await supabaseClient.auth.admin.getUserById(profileData.user_id);
        
        if (userError) {
          console.error('Error fetching user data from auth:', userError);
        } else if (userData && userData.user) {
          lawyerEmail = userData.user.email;
        }
      }
    }

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

    // Normalize contact method
    const contactMethod = passedContactMethod || (meetingDetails?.includes('Videollamada') ? 'videollamada' : 'llamada');
    const isVideoCall = contactMethod.toLowerCase().includes('video');
    const displayContactMethod = isVideoCall ? 'Videollamada' : 'Llamada telefónica';

    const duration = meetingDetails?.match(/Duración: (\d+) minutos/)?.[1] || '60';
    
    // Map service types to readable names
    const getServiceLabel = (type: string) => {
      const map: Record<string, string> = {
        'legal-advice': 'Asesoría Legal',
        'consultation': 'Consulta Inicial',
        'initial_consultation': 'Consulta Inicial',
        'document-review': 'Revisión de Documentos',
        'representation': 'Representación Legal'
      };
      return map[type] || type || 'Servicio Legal';
    };

    const displayServiceType = getServiceLabel(serviceType);
    
    // Obtener el meet_link del perfil del abogado si no se proporcionó
    let meetLink = providedMeetLink;
    if (!meetLink && lawyerId) {
      const { data: lawyerProfile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('meet_link')
        .eq('id', lawyerId)
        .single();
      
      if (!profileError && lawyerProfile?.meet_link) {
        meetLink = lawyerProfile.meet_link;
      }
    }
    
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
              <p style="margin: 10px 0; color: #101820;"><strong>Tipo de servicio:</strong> ${displayServiceType}</p>
              <p style="margin: 10px 0; color: #101820;"><strong>Fecha:</strong> ${formatDate(appointmentDate)}</p>
              <p style="margin: 10px 0; color: #101820;"><strong>Hora:</strong> ${appointmentTime}</p>
              <p style="margin: 10px 0; color: #101820;"><strong>Duración:</strong> ${duration} minutos</p>
              <p style="margin: 10px 0; color: #101820;"><strong>Modalidad:</strong> ${displayContactMethod}</p>
              ${notes ? `<p style="margin: 10px 0; color: #101820;"><strong>Detalles:</strong> ${notes}</p>` : ''}
            </div>
            
            <p style="color: #475569; line-height: 1.6; margin-bottom: 20px;">
              ${isVideoCall 
                ? meetLink 
                  ? `La reunión se realizará a través de Google Meet. Puedes unirte a la reunión haciendo clic en el siguiente enlace:<br><br>
                    <a href="${meetLink}" style="display: inline-block; background-color: #4285F4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: 500; margin: 10px 0;">
                      Unirse a la reunión
                    </a>
                    <br><br>O copia y pega este enlace en tu navegador:<br>
                    <span style="word-break: break-all; color: #2563eb;">${meetLink}</span>`
                  : 'Recibirás un correo con el enlace para unirte a la videollamada 15 minutos antes de la cita.'
                : 'El abogado te llamará al número proporcionado al momento de la cita.'
              }
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://legalup.cl/${isLawyerEmail ? 'lawyer/citas' : 'dashboard/appointments'}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 10px 0;">
                Ver detalles de mi cita
              </a>
            </div>
            
            <p style="color: #475569; line-height: 1.6; margin-bottom: 20px;">
              Si necesitas modificar o cancelar tu cita, por favor hazlo con al menos 24 horas de anticipación.
            </p>
            l 
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
    `;

    // Helper function to send email with retry logic
    const sendEmailWithRetry = async (emailData: any, maxRetries = 3) => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const response = await resend.emails.send(emailData);
          return response;
        } catch (error) {
          console.error(`Error en intento ${attempt} para ${emailData.to}:`, error);
          if (attempt === maxRetries) {
            throw error;
          }
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    };

    // Send email to client
    const emailResponse = await sendEmailWithRetry({
      from: 'LegalUp <noreply@mg.legalup.cl>',  // Usando dominio verificado personalizado
      to: clientEmail,  // Correo real del cliente
      subject: `Confirmación de cita con ${lawyerName}`,
      html: emailHtml,
    });

    // Si sendToLawyer es true y tenemos el email del abogado, también enviamos al abogado
    if (sendToLawyer && lawyerEmail) {
      // Crear una versión del correo para el abogado
      let lawyerEmailHtml = emailHtml
        .replace('¡Tu cita ha sido agendada con éxito!', 'Tienes una nueva cita')
        .replace(`Hola ${clientName}`, `Hola ${lawyerName}`);
      
      // Si es una videollamada y hay un meet_link, asegurarse de que el abogado lo vea
      if (contactMethod === 'Videollamada' && meetLink) {
        lawyerEmailHtml = lawyerEmailHtml.replace(
          'La reunión se realizará a través de Google Meet.',
          `La reunión se realizará a través de Google Meet usando tu enlace personalizado.`
        );
      }
      
      await sendEmailWithRetry({
        from: 'noreply@mg.legalup.cl',  // Usando dominio verificado personalizado
        to: lawyerEmail,  // Correo real del abogado
        subject: `Nueva cita con ${clientName}`,
        html: lawyerEmailHtml,
      });
    }

    const response = {
      success: true,
      clientEmail: clientEmail,
      timestamp: new Date().toISOString(),
      resendResponse: emailResponse
    };
    
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
