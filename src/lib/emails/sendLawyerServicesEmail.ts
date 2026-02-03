import { Resend } from 'resend';
import { getLawyerServicesEmail } from './lawyerServicesEmail';

// Get the Resend API key from environment variables
const resendApiKey = import.meta.env.VITE_RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;

if (!resendApiKey) {
  console.error('❌ Error: VITE_RESEND_API_KEY is not set in environment variables');
  throw new Error('Email service is not properly configured');
}

const resend = new Resend(resendApiKey);

interface SendEmailResponse {
  success: boolean;
  data?: any;
  error?: any;
}

export async function sendLawyerServicesEmail(to: string, lawyerName: string): Promise<SendEmailResponse> {
  console.log(`Attempting to send email to: ${to}`);
  
  try {
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
        error: error instanceof Error ? error : new Error(JSON.stringify(error))
      };
    }

    console.log('✅ Email sent successfully to:', to);
    return { 
      success: true, 
      data,
      message: 'Email sent successfully'
    };
  } catch (error) {
    console.error('❌ Unexpected error sending lawyer services email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error('Unknown error'),
      message: 'Failed to send email due to an unexpected error'
    };
  }
}
