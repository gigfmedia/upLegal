import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  name: string;
  email: string;
  role?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, role }: WelcomeEmailRequest = await req.json();

    const isLawyer = role === 'lawyer';
    
    const html = `
      <div style="font-family: Inter, Arial, sans-serif; color: #0f172a; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1e40af; font-size: 24px; margin: 0;">¡Bienvenido a upLegal!</h1>
        </div>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #1e40af; font-size: 18px; margin: 0 0 12px;">Hola ${name},</h2>
          <p style="margin: 0 0 12px; line-height: 1.6;">Tu cuenta ha sido creada exitosamente en upLegal.</p>
          ${isLawyer ? `
          <p style="margin: 0 0 12px; line-height: 1.6;">Como abogado registrado, ahora puedes comenzar a construir tu perfil profesional y conectar con clientes.</p>
          ` : `
          <p style="margin: 0 0 12px; line-height: 1.6;">Ya puedes iniciar sesión y comenzar a buscar abogados especializados para tus necesidades legales.</p>
          `}
        </div>

        ${isLawyer ? `
        <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 20px; margin-bottom: 20px;">
          <h3 style="color: #10b981; font-size: 16px; margin: 0 0 12px;">Próximos pasos para completar tu perfil:</h3>
          <ol style="margin: 0; padding-left: 20px; line-height: 1.8;">
            <li><strong>Completa tu información personal:</strong> Agrega tu foto de perfil, ubicación y biografía</li>
            <li><strong>Configura tu perfil profesional:</strong> Añade tus especialidades, tarifa por hora (CLP) y años de experiencia</li>
            <li><strong>Sube documentos de validación:</strong> Título universitario y certificado de colegiatura para verificar tu identidad profesional</li>
            <li><strong>Configura tu disponibilidad:</strong> Horarios de atención y enlace de Zoom para videollamadas</li>
            <li><strong>Define tus servicios:</strong> Crea paquetes de servicios con precios y tiempos de entrega</li>
          </ol>
        </div>

        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin-bottom: 20px;">
          <h3 style="color: #d97706; font-size: 16px; margin: 0 0 12px;">💡 Consejos para destacar:</h3>
          <ul style="margin: 0; padding-left: 20px; line-height: 1.8;">
            <li>Una foto profesional aumenta la confianza del cliente</li>
            <li>Completa toda tu información para aparecer en más búsquedas</li>
            <li>Los documentos verificados te dan credibilidad adicional</li>
            <li>Responde rápido a las consultas para mejorar tu rating</li>
          </ul>
        </div>
        ` : ''}

        <div style="text-align: center; padding: 20px; background: #1e40af; border-radius: 8px; color: white;">
          <p style="margin: 0 0 12px; font-size: 16px;"><strong>¿Tienes preguntas?</strong></p>
          <p style="margin: 0; font-size: 14px;">Nuestro equipo está aquí para ayudarte. Contáctanos en cualquier momento.</p>
        </div>

        <div style="text-align: center; margin-top: 30px;">
          <p style="font-size: 12px; color: #64748b; margin: 0;">
            Si no creaste esta cuenta, puedes ignorar este correo de forma segura.
          </p>
          <p style="font-size: 12px; color: #64748b; margin: 8px 0 0;">
            © 2024 upLegal. Todos los derechos reservados.
          </p>
        </div>
      </div>
    `;

    const emailResponse = await resend.emails.send({
      from: "upLegal <no-reply@uplegal.app>",
      to: [email],
      subject: isLawyer ? "¡Bienvenido a upLegal! - Completa tu perfil profesional" : "¡Bienvenido a upLegal!",
      html,
    });

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-welcome-email function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
