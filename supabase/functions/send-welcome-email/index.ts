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
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email }: WelcomeEmailRequest = await req.json();

    const html = `
      <div style="font-family: Inter, Arial, sans-serif; color: #0f172a;">
        <h1 style="margin: 0 0 16px;">Bienvenido a <strong>upLegal</strong>, ${name}!</h1>
        <p style="margin: 0 0 12px;">Tu cuenta ha sido creada exitosamente.</p>
        <p style="margin: 0 0 12px;">Ya puedes iniciar sesión y comenzar a usar la plataforma.</p>
        <p style="margin: 24px 0 8px; font-size: 12px; color: #64748b;">Si no creaste esta cuenta, ignora este correo.</p>
      </div>
    `;

    const emailResponse = await resend.emails.send({
      from: "upLegal <no-reply@uplegal.app>",
      to: [email],
      subject: "Bienvenido a upLegal",
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
