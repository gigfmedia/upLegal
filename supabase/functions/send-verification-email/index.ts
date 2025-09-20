// @deno-types="./deno.d.ts"
// Import serve from Deno standard library
import { serve } from "https://deno.land/std@0.194.0/http/server.ts";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import type { EmailOtpType } from "@supabase/supabase-js";

// Set environment variables directly
const envVars = {
  RESEND_API_KEY: 're_ajDfj5k4_P3AJMKRJcKh3QoZ7qt4HByeZ',
  SUPABASE_URL: 'https://lgxsfmvyjctxehwslvyw.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxneHNmbXZ5amN0eGVod3Nsdnl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3OTkyMTAsImV4cCI6MjA2ODM3NTIxMH0.s2DoNuKigl_G3erwGeC4oLCC_3UiMQu5KJd0gnnYDeU',
  APP_URL: 'http://localhost:3000',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxneHNmbXZ5amN0eGVod3Nsdnl3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjc5OTIxMCwiZXhwIjoyMDY4Mzc1MjEwfQ.8Q9QJQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQ',
  SUPABASE_PROJECT_ID: 'lgxsfmvyjctxehwslvyw',
  PORT: '8000'
};

// Set environment variables
Object.entries(envVars).forEach(([key, value]) => {
  Deno.env.set(key, value);
  console.log(`Set ${key}=${key.includes('KEY') ? value.substring(0, 5) + '...' + value.substring(value.length - 3) : value}`);
});

// Get environment variables
const RESEND_API_KEY = envVars.RESEND_API_KEY;
const SUPABASE_URL = envVars.SUPABASE_URL;
const SUPABASE_ANON_KEY = envVars.SUPABASE_ANON_KEY;

const resend = new Resend(RESEND_API_KEY);
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Interfaz para los datos de la solicitud
interface VerificationRequest {
  email: string;
  token_hash: string;
  type?: string;
  redirect_to?: string;
}

// Manejador principal de la función
export const handler = async (req: Request): Promise<Response> => {
  // Manejar solicitud OPTIONS (CORS preflight)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verificar que el método sea POST
    if (req.method !== "POST") {
      throw new Error("Método no permitido. Se requiere POST.");
    }

    // Parsear el cuerpo de la solicitud
    const { email, token_hash, type, redirect_to } = await req.json() as VerificationRequest;
    
    if (!email || !token_hash) {
      throw new Error("Se requieren los campos 'email' y 'token_hash'.");
    }

    // Para pruebas, omitimos la verificación del token
    console.log("Modo desarrollo: omitiendo verificación de token");
    console.log("Email a verificar:", email);

    // Construir el enlace de verificación para pruebas locales
    const baseUrl = redirect_to || 'http://localhost:3000/verify-email';
    const verificationLink = `${baseUrl}?token=${encodeURIComponent(token_hash)}&type=${type || 'signup'}`;
    
    console.log("Enlace de verificación:", verificationLink);
    
    // Enviar el correo de verificación con un dominio verificado
    // En modo prueba, solo podemos enviar al correo verificado
    const recipientEmail = 'gigfmedia@icloud.com';
    console.log("Enviando correo de prueba a:", recipientEmail);
    
    const { data: emailResponse, error: emailError } = await resend.emails.send({
      from: "LegalUp <onboarding@resend.dev>",
      to: [recipientEmail],
      subject: "Verifica tu correo electrónico en LegalUp",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #2563eb;">¡Bienvenido a LegalUp!</h1>
          </div>
          
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <p>Hola,</p>
            <p>Gracias por registrarte en LegalUp. Para comenzar a usar tu cuenta, por favor verifica tu dirección de correo electrónico.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationLink}" 
                 style="display: inline-block; padding: 12px 30px; background-color: #2563eb; color: white; 
                        text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px;">
                Verificar mi correo
              </a>
            </div>
            
            <p>Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
            <p style="word-break: break-all; background-color: #f3f4f6; padding: 10px; border-radius: 4px;">
              ${verificationLink}
            </p>
            
            <p>Si no creaste una cuenta en LegalUp, puedes ignorar este correo de manera segura.</p>
          </div>
          
          <div style="text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px;">
            <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
            <p>© ${new Date().getFullYear()} LegalUp. Todos los derechos reservados.</p>
          </div>
        </div>
      `,
    });

    if (emailError) {
      console.error("Error al enviar el correo:", emailError);
      throw new Error("Error al enviar el correo de verificación. Por favor, inténtalo de nuevo más tarde.");
    }

    // Respuesta exitosa
    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Correo de verificación enviado con éxito",
        emailResponse 
      }),
      {
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error("Error en la función de verificación:", error);
    
    // Respuesta de error
    const errorMessage = error instanceof Error 
      ? error.message 
      : "Error desconocido al procesar la solicitud";
      
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage
      }),
      {
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        },
        status: 400,
      }
    );
  }
};

// Iniciar el servidor solo si se ejecuta directamente
if (import.meta.main) {
  serve(handler, { port: 8000 });
}
