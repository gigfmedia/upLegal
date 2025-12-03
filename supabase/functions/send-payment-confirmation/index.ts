import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
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
      amount,
      paymentId,
      lawyerName,
      appointmentDate,
      appointmentTime
    } = await req.json();

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const resend = new Resend(resendApiKey);

    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount);
    };

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Pago Confirmado</title>
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
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="display: inline-block; background-color: #10b981; border-radius: 50%; padding: 20px; margin-bottom: 20px;">
                <img src="https://legalup.cl/assets/check-w.png" />
              </div>
              <h1 style="color: #101820; margin: 0 0 10px 0; font-size: 24px;">¡Pago Confirmado!</h1>
              <p style="color: #10b981; font-size: 18px; font-weight: 600; margin: 0;">Tu pago ha sido procesado exitosamente</p>
            </div>
            
            <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 25px 0; border: 1px solid #e2e8f0;">
              <p style="margin: 10px 0; color: #101820;"><strong>Monto pagado:</strong> <span style="color: #10b981; font-size: 20px; font-weight: 700;">${formatCurrency(amount)}</span></p>
              <p style="margin: 10px 0; color: #101820;"><strong>ID de transacción:</strong> ${paymentId}</p>
              <p style="margin: 10px 0; color: #101820;"><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            
            <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 25px 0; border: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #101820; font-weight: 600;">Detalles de tu cita:</p>
              <p style="margin: 10px 0; color: #101820;"><strong>Abogado:</strong> ${lawyerName}</p>
              <p style="margin: 10px 0; color: #101820;"><strong>Fecha:</strong> ${appointmentDate}</p>
              <p style="margin: 10px 0; color: #101820;"><strong>Hora:</strong> ${appointmentTime}</p>
            </div>
            
            <p style="color: #475569; line-height: 1.6; margin-bottom: 20px;">
              Hemos procesado tu pago correctamente. En breve recibirás un correo adicional con todos los detalles de tu cita y las instrucciones para conectarte.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://legalup.cl/dashboard/appointments" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 10px 0;">
                Ver mis citas
              </a>
            </div>
            
            <p style="color: #475569; line-height: 1.6; margin: 0;">¡Gracias por confiar en LegalUp!</p>
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

    console.log('Enviando correo de confirmación de pago a:', clientEmail);
    
    const response = await resend.emails.send({
      from: 'noreply@mg.legalup.cl',
      to: clientEmail,
      subject: `Pago confirmado - ${formatCurrency(amount)}`,
      html: emailHtml,
    });

    console.log('Correo de pago enviado exitosamente:', response);

    return new Response(
      JSON.stringify({
        success: true,
        clientEmail,
        timestamp: new Date().toISOString(),
        resendResponse: response
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error sending payment confirmation email:', error);
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
