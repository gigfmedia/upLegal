// @ts-check
import { Resend } from 'resend';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as fs from 'fs';

// Load environment variables from .env file in the project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.warn('.env file not found. Make sure to set the RESEND_API_KEY environment variable.');
}

// Initialize Resend with your API key
const resend = new Resend(process.env.RESEND_API_KEY);

// Test welcome email data
const testData = {
  name: 'Gigfmedia',
  email: 'gigfmedia@icloud.com',
  role: 'admin'
};

// HTML template for the welcome email
const html = `
<div style="font-family: 'Inter', Arial, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 40px 20px;">
  <!-- Header with logo -->
  <div style="text-align: center; margin-bottom: 30px;">
    <div style="background-color: #ffffff; padding: 20px; border-radius: 8px 8px 0 0; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
      <div style="margin-bottom: 15px; text-align: center;">
      <h1 style="color: #1e40af; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
        <span style="color: #1e40af;">up</span><span style="color: #10b981;">Legal</span>
      </h1>
    </div>
    </div>
  </div>
  
  <!-- Main content -->
  <div style="background: #ffffff; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
    <h2 style="color: #1e40af; font-size: 20px; margin: 0 0 20px 0; font-weight: 600;">¡Bienvenido a LegalUp, ${testData.name}!</h2>
    
    <p style="color: #475569; line-height: 1.6; margin: 0 0 20px 0;">
      Gracias por unirte a nuestra plataforma. Estamos encantados de tenerte con nosotros.
    </p>
    
    <p style="color: #475569; line-height: 1.6; margin: 0 0 25px 0;">
      Con LegalUp podrás gestionar tus servicios legales de manera sencilla y eficiente.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://LegalUp.app/dashboard" 
         style="display: inline-block; background-color: #2563eb; color: white; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: 500; font-size: 15px;">
        Buscar Abogados
      </a>
    </div>
    
    <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px;">
      <p style="color: #64748b; font-size: 13px; margin: 0 0 10px 0;">
        Si tienes alguna pregunta, no dudes en contactarnos en <a href="mailto:soporte@LegalUp.app" style="color: #2563eb; text-decoration: none;">soporte@LegalUp.app</a>
      </p>
    </div>
  </div>
  
  <!-- Footer -->
  <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
    <p style="color: #94a3b8; font-size: 12px; margin: 0 0 5px 0;">
      © ${new Date().getFullYear()} LegalUp. Todos los derechos reservados.
    </p>
    <p style="color: #cbd5e1; font-size: 11px; margin: 0;">
      Este es un correo automático, por favor no respondas a este mensaje.
    </p>
  </div>
</div>
`;

// Send the email
async function sendTestEmail() {
  try {
    const data = await resend.emails.send({
      from: 'LegalUp <onboarding@resend.dev>',
      to: testData.email,
      subject: '¡Bienvenido a LegalUp!',
      html: html
    });
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

// Run the function
sendTestEmail().catch(console.error);
