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
        </div>
      </div>
      
      <!-- Contenido principal -->
      <div style="background: #ffffff; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
        <h2 style="color: #1e40af; font-size: 20px; margin: 0 0 20px 0; font-weight: 600;">¡Bienvenido/a a LegalUp, ${name}!</h2>
        
        <p style="margin: 0 0 20px 0; line-height: 1.6; color: #334155;">
          Tu cuenta ha sido creada exitosamente en nuestra plataforma.
        </p>
        
        ${isLawyer ? `
        <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
          <h3 style="color: #0369a1; font-size: 16px; margin: 0 0 12px 0; font-weight: 600;">Siguientes pasos como abogado:</h3>
          <ol style="margin: 0; padding-left: 20px; color: #334155; line-height: 1.8;">
            <li><strong>Completa tu perfil</strong> con tu información personal y profesional</li>
            <li><strong>Verifica tu identidad</strong> subiendo tus credenciales</li>
            <li><strong>Configura tu disponibilidad</strong> para recibir citas</li>
          </ol>
        </div>
        ` : `
        <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
          <p style="margin: 0; color: #166534; line-height: 1.6;">
            Ahora puedes buscar abogados especializados, programar consultas y recibir asesoramiento legal de forma segura y confiable.
          </p>
        </div>
        `}
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://LegalUp.app" style="display: inline-block; background-color: #2563eb; color: white; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: 500; font-size: 15px;">
            Comenzar en LegalUp
          </a>
        </div>
        
        <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 20px; text-align: center;">
          <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">
            Si tienes alguna pregunta, no dudes en contactarnos a <a href="mailto:soporte@LegalUp.app" style="color: #2563eb; text-decoration: none;">soporte@LegalUp.app</a>
          </p>
          <p style="margin: 0; color: #94a3b8; font-size: 12px;">
            © ${new Date().getFullYear()} LegalUp. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
      </div>
    `;

    const emailResponse = await resend.emails.send({
      from: "LegalUp <no-reply@LegalUp.app>",
      to: [email],
      subject: isLawyer ? "¡Bienvenido a LegalUp! - Completa tu perfil profesional" : "¡Bienvenido a LegalUp!",
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
