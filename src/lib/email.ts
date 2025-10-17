import { Resend } from 'resend';

// Initialize Resend with your API key
const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailProps {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail({ to, subject, html, from = 'UpLegal <hola@up-legal.cl>' }: SendEmailProps) {
  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
    });

    if (error) {
      console.error('Error sending email:', error);
      throw error;
    }

    return { data };
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
}

// Email templates
export const emailTemplates = {
  welcome: (name: string) => ({
    subject: '¡Bienvenido a UpLegal!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>¡Bienvenido a UpLegal, ${name}!</h1>
        <p>Gracias por registrarte en nuestra plataforma. Estamos emocionados de tenerte con nosotros.</p>
        <p>Ahora puedes comenzar a explorar abogados y servicios legales.</p>
        <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
        <p>¡Gracias!</p>
        <p>El equipo de UpLegal</p>
      </div>
    `
  }),
  // Add more templates as needed
};
