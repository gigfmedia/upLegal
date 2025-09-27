import { Resend } from 'resend';

const resend = new Resend(import.meta.env.RESEND_API_KEY);

export async function sendWelcomeEmail(email: string, name: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Bienvenido a LegalUp <bienvenida@legalup.app>',
      to: email,
      subject: '¡Bienvenido a LegalUp! Confirma tu correo electrónico',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">¡Bienvenido a LegalUp, ${name}!</h1>
          <p>Gracias por registrarte en nuestra plataforma. Estamos encantados de tenerte con nosotros.</p>
          <p>Para comenzar a utilizar todos los beneficios de LegalUp, por favor confirma tu dirección de correo electrónico haciendo clic en el siguiente botón:</p>
          <a href="${window.location.origin}/auth/confirm-email" 
             style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0;">
            Confirmar correo electrónico
          </a>
          <p>Si no creaste esta cuenta, puedes ignorar este correo.</p>
          <p>¡Esperamos que disfrutes de nuestra plataforma!</p>
          <p>El equipo de LegalUp</p>
        </div>
      `,
    });

    if (error) {
      return { error };
    }

    return { data };
  } catch (error) {
    return { error };
  }
}
