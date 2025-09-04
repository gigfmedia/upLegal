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
        <title>Confirmación de Transacción</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Confirmación de Transacción</h1>
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
          
          <div style="text-align: center; margin-top: 30px; padding-top: 25px; border-top: 1px solid #e9ecef;">
            <p style="color: #6c757d; margin: 0; font-size: 14px;">
              Este es un email automático. Si tienes alguna consulta, puedes responder a este correo.
            </p>
            <p style="color: #6c757d; margin: 10px 0 0 0; font-size: 12px;">
              Fecha: ${new Date().toLocaleString('es-CL')}
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
    console.log("Processing transaction email request...");

    const emailData: TransactionEmailRequest = await req.json();
    console.log("Email data received:", { 
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

    console.log("Transaction email sent successfully:", emailResponse);

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
    console.error("Error sending transaction email:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: "Failed to send transaction notification email"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);