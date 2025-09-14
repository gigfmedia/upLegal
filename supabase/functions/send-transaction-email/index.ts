import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TransactionEmailRequest {
  paymentId: string;
  customerEmail: string;
  customerName?: string;
  amount: number;
  currency: string;
  serviceDescription: string;
  status: 'pending' | 'paid' | 'failed';
  transactionId?: string;
}

const getTransactionEmailTemplate = (data: TransactionEmailRequest) => {
  const formatAmount = (amount: number, currency: string) => {
    const formatted = (amount / 100).toLocaleString('es-CL');
    return currency.toUpperCase() === 'CLP' ? `$${formatted} CLP` : `$${formatted} ${currency.toUpperCase()}`;
  };

  const statusMessages = {
    pending: {
      title: "Pago Pendiente",
      message: "Hemos recibido tu solicitud de pago. Te notificaremos cuando se procese.",
      color: "#f59e0b"
    },
    paid: {
      title: "¡Pago Exitoso!",
      message: "Tu pago ha sido procesado exitosamente. Gracias por tu confianza.",
      color: "#10b981"
    },
    failed: {
      title: "Pago Fallido",
      message: "Hubo un problema con tu pago. Por favor, intenta nuevamente o contacta soporte.",
      color: "#ef4444"
    }
  };

  const statusInfo = statusMessages[data.status];

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Confirmación de Transacción - upLegal</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 10px;">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 8px;">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#2563eb"/>
              <path d="M2 17L12 22L22 17" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M12 12V22M12 8V12M12 2V4" stroke="#2563eb" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <h1 style="color: #2563eb; margin: 0; font-size: 28px; font-weight: 700; display: flex; align-items: center;">
              <span style="color: #2563eb;">up</span><span style="color: #10b981;">Legal</span>
            </h1>
          </div>
          <h2 style="color: #1e40af; margin: 0 0 20px 0; font-size: 22px;">Confirmación de Transacción</h2>
          <div style="height: 3px; background: linear-gradient(90deg, #2563eb, #10b981); margin: 0 auto 20px; max-width: 200px;"></div>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
          <div style="background: ${statusInfo.color}; color: white; padding: 15px; border-radius: 8px; margin-bottom: 25px; text-align: center;">
            <h2 style="margin: 0; font-size: 22px;">${statusInfo.title}</h2>
            <p style="margin: 10px 0 0 0; font-size: 16px;">${statusInfo.message}</p>
          </div>
          
          <div style="background: white; padding: 25px; border-radius: 8px; border: 1px solid #e9ecef;">
            <h3 style="color: #495057; margin-top: 0; font-size: 18px; border-bottom: 2px solid #e9ecef; padding-bottom: 10px;">Detalles de la Transacción</h3>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #e9ecef;">
                <td style="padding: 12px 0; font-weight: bold; color: #6c757d;">Monto:</td>
                <td style="padding: 12px 0; text-align: right; font-size: 18px; font-weight: bold; color: ${statusInfo.color};">${formatAmount(data.amount, data.currency)}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e9ecef;">
                <td style="padding: 12px 0; font-weight: bold; color: #6c757d;">Servicio:</td>
                <td style="padding: 12px 0; text-align: right;">${data.serviceDescription}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e9ecef;">
                <td style="padding: 12px 0; font-weight: bold; color: #6c757d;">Estado:</td>
                <td style="padding: 12px 0; text-align: right;">
                  <span style="background: ${statusInfo.color}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; text-transform: uppercase;">${data.status === 'paid' ? 'Pagado' : data.status === 'pending' ? 'Pendiente' : 'Fallido'}</span>
                </td>
              </tr>
              ${data.transactionId ? `
              <tr>
                <td style="padding: 12px 0; font-weight: bold; color: #6c757d;">ID Transacción:</td>
                <td style="padding: 12px 0; text-align: right; font-family: monospace; font-size: 12px;">${data.transactionId}</td>
              </tr>
              ` : ''}
            </table>
          </div>
          
          ${data.status === 'paid' ? `
          <div style="background: #d1f2eb; border: 1px solid #10b981; padding: 20px; border-radius: 8px; margin-top: 25px;">
            <h4 style="color: #0f5132; margin: 0 0 10px 0;">¿Qué sigue ahora?</h4>
            <p style="color: #0f5132; margin: 0;">Te contactaremos pronto para coordinar los siguientes pasos. Si tienes alguna pregunta, no dudes en contactarnos.</p>
          </div>
          ` : ''}
          
          <div style="text-align: center; margin-top: 30px; color: #6c757d; font-size: 14px;">
            <p>Si tienes alguna pregunta, por favor contacta a nuestro equipo de soporte.</p>
            <p>&copy; ${new Date().getFullYear()} upLegal. Todos los derechos reservados.</p>
          </div>
          <p style="color: #6c757d; margin: 10px 0 0 0; font-size: 12px;">
            Fecha: ${new Date().toLocaleString('es-CL')}
          </p>
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
    console.log("Procesando solicitud de email de transacción...");

    const emailData: TransactionEmailRequest = await req.json();
    console.log("Datos de email recibidos:", { 
      paymentId: emailData.paymentId, 
      email: emailData.customerEmail, 
      status: emailData.status,
      amount: emailData.amount 
    });

    // Generate email content
    const htmlContent = getTransactionEmailTemplate(emailData);

    const subjectMap = {
      pending: "Pago Pendiente - Confirmación Recibida",
      paid: "¡Pago Exitoso! - Confirmación de Transacción",
      failed: "Pago Fallido - Información Importante"
    };

    const emailResponse = await resend.emails.send({
      from: "LegalConnect <noreply@resend.dev>",
      to: [emailData.customerEmail],
      subject: subjectMap[emailData.status],
      html: htmlContent,
    });

    console.log("Email de transacción enviado exitosamente:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      messageId: emailResponse.data?.id,
      email: emailData.customerEmail,
      status: emailData.status 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error enviando email de transacción:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: "Error al enviar email de notificación de transacción"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);