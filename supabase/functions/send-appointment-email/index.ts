import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AppointmentEmailRequest {
  clientEmail: string;
  clientName?: string;
  lawyerName: string;
  lawyerEmail?: string;
  appointmentDate: string;
  appointmentTime: string;
  serviceType: string;
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'rescheduled';
  meetingDetails?: string;
  notes?: string;
  sendToLawyer?: boolean;
}

const getAppointmentEmailTemplate = (data: AppointmentEmailRequest, isForLawyer = false) => {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-CL', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const statusMessages = {
    scheduled: {
      title: "Cita Agendada",
      message: "Tu cita ha sido agendada exitosamente.",
      color: "#3b82f6",
      icon: "📅"
    },
    confirmed: {
      title: "Cita Confirmada",
      message: "Tu cita ha sido confirmada por el abogado.",
      color: "#10b981",
      icon: "✅"
    },
    cancelled: {
      title: "Cita Cancelada",
      message: "Lamentamos informarte que tu cita ha sido cancelada.",
      color: "#ef4444",
      icon: "❌"
    },
    rescheduled: {
      title: "Cita Reprogramada",
      message: "Tu cita ha sido reprogramada para una nueva fecha.",
      color: "#f59e0b",
      icon: "🔄"
    }
  };

  const statusInfo = statusMessages[data.status];
  const recipient = isForLawyer ? "Dr./Dra." : (data.clientName || "");

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${statusInfo.title}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1e40af 0%, #3730a3 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <div style="font-size: 48px; margin-bottom: 15px;">${statusInfo.icon}</div>
          <h1 style="color: white; margin: 0; font-size: 28px;">${statusInfo.title}</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
          <div style="background: white; padding: 25px; border-radius: 8px; border-left: 4px solid ${statusInfo.color}; margin-bottom: 25px;">
            <h2 style="color: #495057; margin: 0 0 10px 0; font-size: 20px;">
              Hola ${isForLawyer ? data.lawyerName : recipient}👋
            </h2>
            <p style="color: #6c757d; margin: 0; font-size: 16px;">${statusInfo.message}</p>
          </div>
          
          <div style="background: white; padding: 25px; border-radius: 8px; border: 1px solid #e9ecef;">
            <h3 style="color: #495057; margin-top: 0; font-size: 18px; border-bottom: 2px solid #e9ecef; padding-bottom: 10px;">
              📋 Detalles de la Cita
            </h3>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #f1f3f4;">
                <td style="padding: 12px 0; font-weight: bold; color: #6c757d; width: 35%;">
                  ${isForLawyer ? "Cliente:" : "Abogado:"}
                </td>
                <td style="padding: 12px 0; color: #495057;">
                  ${isForLawyer ? data.clientName || 'No especificado' : data.lawyerName}
                </td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f3f4;">
                <td style="padding: 12px 0; font-weight: bold; color: #6c757d;">📅 Fecha:</td>
                <td style="padding: 12px 0; color: #495057; font-weight: 500;">${formatDate(data.appointmentDate)}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f3f4;">
                <td style="padding: 12px 0; font-weight: bold; color: #6c757d;">🕐 Hora:</td>
                <td style="padding: 12px 0; color: #495057; font-weight: 500;">${data.appointmentTime}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f3f4;">
                <td style="padding: 12px 0; font-weight: bold; color: #6c757d;">⚖️ Servicio:</td>
                <td style="padding: 12px 0; color: #495057;">${data.serviceType}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f3f4;">
                <td style="padding: 12px 0; font-weight: bold; color: #6c757d;">📊 Estado:</td>
                <td style="padding: 12px 0;">
                  <span style="background: ${statusInfo.color}; color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; text-transform: uppercase; font-weight: bold;">
                    ${data.status === 'scheduled' ? 'Agendada' : 
                      data.status === 'confirmed' ? 'Confirmada' : 
                      data.status === 'cancelled' ? 'Cancelada' : 'Reprogramada'}
                  </span>
                </td>
              </tr>
              ${data.meetingDetails ? `
              <tr style="border-bottom: 1px solid #f1f3f4;">
                <td style="padding: 12px 0; font-weight: bold; color: #6c757d;">🔗 Detalles:</td>
                <td style="padding: 12px 0; color: #495057; font-size: 14px;">${data.meetingDetails}</td>
              </tr>
              ` : ''}
            </table>
            
            ${data.notes ? `
            <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin-top: 20px; border-left: 3px solid ${statusInfo.color};">
              <h4 style="margin: 0 0 8px 0; color: #495057; font-size: 14px;">📝 Notas adicionales:</h4>
              <p style="margin: 0; color: #6c757d; font-size: 14px; font-style: italic;">${data.notes}</p>
            </div>
            ` : ''}
          </div>
          
          ${data.status === 'scheduled' || data.status === 'confirmed' ? `
          <div style="background: #e6f3ff; border: 1px solid #3b82f6; padding: 20px; border-radius: 8px; margin-top: 25px;">
            <h4 style="color: #1e40af; margin: 0 0 10px 0; display: flex; align-items: center;">
              ⏰ Recordatorio Importante
            </h4>
            <ul style="color: #1e40af; margin: 0; padding-left: 20px;">
              <li>Por favor llega 5 minutos antes de tu cita</li>
              <li>Ten a la mano todos los documentos relevantes</li>
              <li>Si necesitas cancelar o reprogramar, contacta con anticipación</li>
            </ul>
          </div>
          ` : ''}
          
          ${data.status === 'cancelled' ? `
          <div style="background: #fef2f2; border: 1px solid #ef4444; padding: 20px; border-radius: 8px; margin-top: 25px;">
            <h4 style="color: #dc2626; margin: 0 0 10px 0;">¿Necesitas reagendar?</h4>
            <p style="color: #dc2626; margin: 0;">Puedes contactarnos para agendar una nueva cita en el horario que mejor te convenga.</p>
          </div>
          ` : ''}
          
          <div style="text-align: center; margin-top: 30px; padding-top: 25px; border-top: 1px solid #e9ecef;">
            <p style="color: #6c757d; margin: 0; font-size: 14px;">
              Este es un email automático. Si tienes alguna consulta, puedes responder a este correo.
            </p>
            <p style="color: #6c757d; margin: 10px 0 0 0; font-size: 12px;">
              📧 LegalConnect • Fecha: ${new Date().toLocaleString('es-CL')}
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Processing appointment email request...");

    const emailData: AppointmentEmailRequest = await req.json();
    console.log("Email data received:", { 
      clientEmail: emailData.clientEmail, 
      lawyerName: emailData.lawyerName,
      status: emailData.status,
      date: emailData.appointmentDate,
      sendToLawyer: emailData.sendToLawyer
    });

    const subjectMap = {
      scheduled: "✅ Cita Agendada - Confirmación",
      confirmed: "🎉 Cita Confirmada - Todo Listo",
      cancelled: "❌ Cita Cancelada - Información Importante", 
      rescheduled: "🔄 Cita Reprogramada - Nueva Fecha"
    };

    const emailPromises = [];

    // Send email to client
    const clientHtml = getAppointmentEmailTemplate(emailData, false);
    emailPromises.push(
      resend.emails.send({
        from: "LegalConnect <noreply@resend.dev>",
        to: [emailData.clientEmail],
        subject: subjectMap[emailData.status],
        html: clientHtml,
      })
    );

    // Send email to lawyer if requested and email provided
    if (emailData.sendToLawyer && emailData.lawyerEmail) {
      const lawyerHtml = getAppointmentEmailTemplate(emailData, true);
      emailPromises.push(
        resend.emails.send({
          from: "LegalConnect <noreply@resend.dev>",
          to: [emailData.lawyerEmail],
          subject: `Nueva Cita: ${subjectMap[emailData.status]}`,
          html: lawyerHtml,
        })
      );
    }

    const emailResults = await Promise.all(emailPromises);
    console.log("Appointment emails sent successfully:", emailResults);

    return new Response(JSON.stringify({ 
      success: true,
      emailsSent: emailResults.length,
      clientEmailId: emailResults[0]?.data?.id,
      lawyerEmailId: emailResults[1]?.data?.id,
      recipients: {
        client: emailData.clientEmail,
        lawyer: emailData.sendToLawyer ? emailData.lawyerEmail : null
      }
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error sending appointment email:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: "Failed to send appointment notification email"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);