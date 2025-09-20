import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper functions for calendar links
const formatDateForGoogleCalendar = (dateString: string, timeString: string): string => {
  const [day, month, year] = dateString.split('/').map(Number);
  const [hours, minutes] = timeString.split(':').map(Number);
  
  const date = new Date(year, month - 1, day, hours, minutes);
  const endDate = new Date(date.getTime() + 60 * 60 * 1000); // 1 hour duration
  
  const format = (d: Date): string => {
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };
  
  return `${format(date)}/${format(endDate)}`;
};

const formatDateForOutlook = (dateString: string, timeString: string): string => {
  const [day, month, year] = dateString.split('/').map(Number);
  const [hours, minutes] = timeString.split(':').map(Number);
  
  const date = new Date(year, month - 1, day, hours, minutes);
  const endDate = new Date(date.getTime() + 60 * 60 * 1000); // 1 hour duration
  
  return date.toISOString();
};

interface AppointmentEmailRequest {
  clientEmail: string;
  clientName?: string;
  lawyerName: string;
  lawyerEmail?: string;
  appointmentDate: string; // Format: DD/MM/YYYY
  appointmentTime: string; // Format: HH:MM
  serviceType: string;
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'rescheduled';
  meetingDetails?: string;
  notes?: string;
  sendToLawyer?: boolean;
  zoomLink?: string;
}

const getAppointmentEmailTemplate = (data: AppointmentEmailRequest, isForLawyer = false) => {
  // Helper function to format date for display
  const formatDisplayDate = (dateStr: string) => {
    const [day, month, year] = dateStr.split('/');
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return date.toLocaleDateString('es-CL', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long',
      year: 'numeric'
    });
  };
  
  // Helper function to format time for display
  const formatDisplayTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    return `${hours}:${minutes} hrs`;
  };
  
  // Generate calendar links
  const googleCalendarLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Cita+LegalUp&details=${encodeURIComponent(`Cita con ${isForLawyer ? data.clientName || 'cliente' : data.lawyerName} para ${data.serviceType}`)}&dates=${formatDateForGoogleCalendar(data.appointmentDate, data.appointmentTime)}`;
  
  const outlookCalendarLink = `https://outlook.office.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=Cita LegalUp&startdt=${formatDateForOutlook(data.appointmentDate, data.appointmentTime)}&body=Cita con ${encodeURIComponent(isForLawyer ? data.clientName || 'cliente' : data.lawyerName)} para ${encodeURIComponent(data.serviceType)}`;

  const statusMessages = {
    scheduled: {
      title: "Cita Agendada",
      message: "Tu cita ha sido agendada exitosamente.",
      color: "#3b82f6",
      icon: ""
    },
    confirmed: {
      title: "Cita Confirmada",
      message: "Tu cita ha sido confirmada por el abogado.",
      color: "#10b981",
      icon: ""
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
    <div style="font-family: 'Inter', Arial, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 40px 20px;">
      <!-- Header con logo -->
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="background-color: #ffffff; padding: 20px; border-radius: 8px 8px 0 0; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
          <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 15px;">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#2563eb"/>
              <path d="M2 17L12 22L22 17" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M12 12V22M12 8V12M12 2V4" stroke="#2563eb" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <h1 style="color: #1e40af; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
            <span style="color: #1e40af;">up</span><span style="color: #10b981;">Legal</span>
          </h1>
          <div style="height: 4px; background: linear-gradient(90deg, #2563eb, #10b981); margin: 15px auto; width: 100px;"></div>
          <h2 style="color: #1e40af; margin: 20px 0 10px 0; font-size: 20px; font-weight: 600;">${statusInfo.title}</h2>
          <p style="color: #64748b; margin: 0 0 20px 0; font-size: 15px;">
            ${statusInfo.message}
          </p>
        </div>
      </div>
      
      <!-- Contenido principal -->
      <div style="background: #ffffff; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
        <div style="margin-bottom: 25px;">
          <h3 style="color: #1e40af; font-size: 16px; margin: 0 0 15px 0; font-weight: 600; display: flex; align-items: center;">
            <span style="display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; background-color: #e0f2fe; color: #0369a1; border-radius: 50%; margin-right: 10px; font-size: 14px;">1</span>
            Detalles de la cita
          </h3>
          <div style="background-color: #f8fafc; border-radius: 6px; padding: 15px; margin-bottom: 15px;">
            <div style="display: flex; margin-bottom: 8px;">
              <span style="color: #64748b; min-width: 120px; font-size: 14px;">Abogado/a:</span>
              <span style="color: #1e293b; font-weight: 500;">${data.lawyerName}</span>
            </div>
            <div style="display: flex; margin-bottom: 8px;">
              <span style="color: #64748b; min-width: 120px; font-size: 14px;">Fecha:</span>
              <span style="color: #1e293b; font-weight: 500;">${formatDate(data.appointmentDate)}</span>
            </div>
            <div style="display: flex; margin-bottom: 8px;">
              <span style="color: #64748b; min-width: 120px; font-size: 14px;">Hora:</span>
              <span style="color: #1e293b; font-weight: 500;">${data.appointmentTime}</span>
            </div>
            <div style="display: flex; margin-bottom: 8px;">
              <span style="color: #64748b; min-width: 120px; font-size: 14px;">Servicio:</span>
              <span style="color: #1e293b; font-weight: 500;">${data.serviceType}</span>
            </div>
            ${data.notes ? `
            <div style="display: flex; margin-bottom: 8px;">
              <span style="color: #64748b; min-width: 120px; font-size: 14px;">Notas:</span>
              <span style="color: #1e293b;">${data.notes}</span>
            </div>
            ` : ''}
          </div>
        </div>
        
        <!-- Detalles de la reunión -->
        <div style="margin-bottom: 25px;">
          <h3 style="color: #1e40af; font-size: 16px; margin: 0 0 15px 0; font-weight: 600; display: flex; align-items: center;">
            <span style="display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; background-color: #e0f2fe; color: #0369a1; border-radius: 50%; margin-right: 10px; font-size: 14px;">2</span>
            Detalles de la reunión
          </h3>
          <div style="background-color: #f8fafc; border-radius: 6px; padding: 20px; margin-bottom: 15px;">
            ${data.zoomLink ? `
            <div style="margin-bottom: 15px;">
              <p style="color: #1e293b; font-weight: 500; margin: 0 0 10px 0;">🔗 Enlace de la videollamada:</p>
              <a href="${data.zoomLink}" style="display: inline-block; background-color: #e0f2fe; color: #0369a1; text-decoration: none; padding: 10px 15px; border-radius: 6px; font-size: 14px; word-break: break-all;">
                ${data.zoomLink}
              </a>
              <p style="color: #64748b; font-size: 13px; margin: 8px 0 0 0;">
                Haz clic en el enlace para unirte a la videollamada en la fecha y hora programadas.
              </p>
            </div>
            ` : ''}
            
            <div style="margin-top: 20px; padding-top: 15px; border-top: 1px dashed #e2e8f0;">
              <p style="color: #1e293b; font-weight: 500; margin: 0 0 10px 0;">📅 Fecha y hora:</p>
              <p style="color: #334155; margin: 0 0 5px 0;">${formatDisplayDate(data.appointmentDate)}</p>
              <p style="color: #334155; margin: 0 0 15px 0;">${data.appointmentTime}</p>
              
              <div style="display: flex; gap: 10px; margin-top: 15px;">
                <a href="${googleCalendarLink}"
                   target="_blank" 
                   style="display: inline-flex; align-items: center; background-color: #f3f4f6; color: #1e40af; text-decoration: none; padding: 8px 15px; border-radius: 6px; font-size: 13px; font-weight: 500;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 6px;">
                    <path d="M19 3H18V1H16V3H8V1H6V3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V9H19V19ZM5 7V5H19V7H5Z" fill="#1e40af"/>
                  </svg>
                  Agregar a Google Calendar
                </a>
                <a href="${outlookCalendarLink}"
                   target="_blank" 
                   style="display: inline-flex; align-items: center; background-color: #f3f4f6; color: #1e40af; text-decoration: none; padding: 8px 15px; border-radius: 6px; font-size: 13px; font-weight: 500;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 6px;">
                    <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V9H19V19ZM19 7H5V5H19V7Z" fill="#1e40af"/>
                  </svg>
                  Agregar a Outlook
                </a>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Acciones -->
        <div style="margin-top: 30px; text-align: center;">
          <a href="https://LegalUp.app/dashboard" style="display: inline-block; background-color: #2563eb; color: white; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: 500; font-size: 15px; margin-bottom: 20px;">
            Ver detalles en mi cuenta
          </a>
          
          <p style="color: #64748b; font-size: 13px; margin: 20px 0 0 0; line-height: 1.6;">
            ¿Neitas ayuda? Contáctanos en <a href="mailto:soporte@LegalUp.app" style="color: #2563eb; text-decoration: none;">soporte@LegalUp.app</a>
          </p>
        </div>
        
        <!-- Footer -->
        <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px; text-align: center;">
          <p style="margin: 0 0 10px 0; color: #94a3b8; font-size: 12px;">
            © ${new Date().getFullYear()} LegalUp. Todos los derechos reservados.
          </p>
          <p style="margin: 0; color: #cbd5e1; font-size: 11px;">
            Este es un correo automático, por favor no respondas a este mensaje.
          </p>
        </div>
          
          <div style="background: white; padding: 25px; border-radius: 8px; border: 1px solid #e9ecef;">
            <h3 style="color: #495057; margin-top: 0; font-size: 18px; border-bottom: 2px solid #e9ecef; padding-bottom: 10px;">
              Detalles de la Cita
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
                <td style="padding: 12px 0; font-weight: bold; color: #6c757d;">Fecha:</td>
                <td style="padding: 12px 0; color: #495057; font-weight: 500;">${formatDate(data.appointmentDate)}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f3f4;">
                <td style="padding: 12px 0; font-weight: bold; color: #6c757d;">Hora:</td>
                <td style="padding: 12px 0; color: #495057; font-weight: 500;">${data.appointmentTime}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f3f4;">
                <td style="padding: 12px 0; font-weight: bold; color: #6c757d;">Servicio:</td>
                <td style="padding: 12px 0; color: #495057;">${data.serviceType}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f3f4;">
                <td style="padding: 12px 0; font-weight: bold; color: #6c757d;">Estado:</td>
                <td style="padding: 12px 0;">
                  <span style="background: ${statusInfo.color}; color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; text-transform: uppercase; font-weight: bold;">
                    ${data.status === 'scheduled' ? 'Agendada' : 
                      data.status === 'confirmed' ? 'Confirmada' : 
                      data.status === 'cancelled' ? 'Cancelada' : 'Reprogramada'}
                  </span>
                </td>
              </tr>
              ${data.zoomLink ? `
              <tr style="border-bottom: 1px solid #f1f3f4;">
                <td style="padding: 12px 0; font-weight: bold; color: #6c757d;">Videollamada:</td>
                <td style="padding: 12px 0;">
                  <a href="${data.zoomLink}" style="color: #2563eb; text-decoration: none; font-weight: 500; background: #dbeafe; padding: 8px 12px; border-radius: 6px; display: inline-block;">
                    Unirse a la reunión
                  </a>
                </td>
              </tr>
              ` : ''}
              ${data.meetingDetails ? `
              <tr style="border-bottom: 1px solid #f1f3f4;">
                <td style="padding: 12px 0; font-weight: bold; color: #6c757d;">Detalles:</td>
                <td style="padding: 12px 0; color: #495057; font-size: 14px;">${data.meetingDetails}</td>
              </tr>
              ` : ''}
            </table>
            
            ${data.notes ? `
            <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin-top: 20px; border-left: 3px solid ${statusInfo.color};">
              <h4 style="margin: 0 0 8px 0; color: #495057; font-size: 14px;">Notas adicionales:</h4>
              <p style="margin: 0; color: #6c757d; font-size: 14px; font-style: italic;">${data.notes}</p>
            </div>
            ` : ''}
          </div>
          
          ${data.status === 'scheduled' || data.status === 'confirmed' ? `
          <div style="background: #e6f3ff; border: 1px solid #3b82f6; padding: 20px; border-radius: 8px; margin-top: 25px;">
            <h4 style="color: #1e40af; margin: 0 0 10px 0; display: flex; align-items: center;">
              Recordatorio Importante
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
          
          <div style="text-align: center; margin: 30px 0;">
            <p style="margin: 0; font-size: 14px; color: #6b7280;">
              &copy; ${new Date().getFullYear()} LegalUp. Todos los derechos reservados.
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
    console.log("Procesando solicitud de email de agendamiento...");

    const emailData: AppointmentEmailRequest = await req.json();
    console.log("Datos de email recibidos:", { 
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
    console.log("Emails de agendamiento enviados exitosamente:", emailResults);

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
    console.error("Error enviando email de agendamiento:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: "Error al enviar email de notificación de agendamiento"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);