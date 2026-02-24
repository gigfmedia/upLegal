import { Resend } from 'resend';
import { getLawyerServicesEmail } from './lawyerServicesEmail';

// Get the Resend API key lazily (don't throw at module level — would crash the entire app)
const getResendApiKey = () => {
  const key =
    (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_RESEND_API_KEY : undefined) ||
    process.env?.VITE_RESEND_API_KEY ||
    process.env?.RESEND_API_KEY;
  if (!key) {
    throw new Error('Email service is not properly configured: VITE_RESEND_API_KEY is not set');
  }
  return key;
};

interface SendEmailResponse {
  success: boolean;
  data?: unknown;
  error?: unknown;
  message?: string;
}

export async function sendLawyerServicesEmail(to: string, lawyerName: string): Promise<SendEmailResponse> {
  console.log(`Attempting to send email to: ${to}`);

  try {
    const resend = new Resend(getResendApiKey());
    const { data, error } = await resend.emails.send({
      from: 'LegalUp <servicios@mg.legalup.cl>',
      to: [to],
      subject: '¡Completa tu perfil en LegalUp!',
      html: getLawyerServicesEmail(lawyerName),
    });

    if (error) {
      console.error('❌ Error sending lawyer services email:', error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error(JSON.stringify(error)),
      };
    }

    console.log('✅ Email sent successfully to:', to);
    return {
      success: true,
      data,
      message: 'Email sent successfully',
    };
  } catch (error) {
    console.error('❌ Unexpected error sending lawyer services email:', error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Unknown error'),
      message: 'Failed to send email due to an unexpected error',
    };
  }
}
