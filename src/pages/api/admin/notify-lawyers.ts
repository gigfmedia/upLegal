import { createClient } from '@supabase/supabase-js';
import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { getLawyerServicesEmail } from '@/lib/emails/lawyerServicesEmail';

const importMetaEnv = typeof import.meta !== 'undefined' && import.meta?.env ? import.meta.env : {};
const processEnv = typeof process !== 'undefined' ? process.env : {};

const resendApiKey =
  importMetaEnv.VITE_RESEND_API_KEY ||
  processEnv.VITE_RESEND_API_KEY ||
  processEnv.RESEND_API_KEY;

if (!resendApiKey) {
  console.error('❌ Error: VITE_RESEND_API_KEY (or RESEND_API_KEY) is not set in environment variables');
  throw new Error('Email service is not properly configured');
}

const resend = new Resend(resendApiKey);

const supabaseUrl =
  importMetaEnv.VITE_SUPABASE_URL ||
  importMetaEnv.VITE_PUBLIC_SUPABASE_URL ||
  processEnv.VITE_SUPABASE_URL ||
  processEnv.VITE_PUBLIC_SUPABASE_URL ||
  processEnv.NEXT_PUBLIC_SUPABASE_URL ||
  processEnv.SUPABASE_URL;

const supabaseKey =
  importMetaEnv.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  processEnv.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  processEnv.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Supabase environment variables are missing');
  throw new Error('Missing Supabase environment variables');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

interface NotificationResult {
  email: string;
  success: boolean;
  error?: string;
  timestamp: string;
}

// Add this helper function at the top of the file, after imports
function createErrorResponse(message: string, status: number = 500, details?: any) {
  console.error(`[${status}] ${message}`, details || '');
  return new Response(
    JSON.stringify({
      success: false,
      message,
      error: details || message,
      timestamp: new Date().toISOString()
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

export const post: APIRoute = async ({ request }) => {
  
  // Check for test mode
  let testMode = false;
  try {
    const body = await request.json();
    testMode = body.testMode === true;
  } catch (e) {
    console.error('Error parsing request body:', e);
    return createErrorResponse('Invalid request body', 400, e);
  }
    
    let lawyers: { email: string; first_name: string | null; last_name: string | null }[] = [];
    
    if (testMode) {
      // In test mode, use only the test email
      lawyers = [{
        email: 'juan.fercocommerce@gmail.com',
        first_name: 'Juan',
        last_name: 'Test'
      }];
    } else {
      // In production, get all lawyers who haven't added services yet
      try {
        const { data, error } = await supabaseAdmin
          .from('profiles')
          .select('email, first_name, last_name, user_id')
          .eq('role', 'lawyer')
          .not('email', 'is', null);

        if (error) {
          console.error('Supabase query error:', error);
          return createErrorResponse('Error al obtener la lista de abogados', 500, error);
        }
        
        // Filter out lawyers who already have services
        const lawyersWithoutServices = [];
        
        for (const lawyer of data || []) {
          // Check services table
          const { data: servicesData, error: servicesError } = await supabaseAdmin
            .from('services')
            .select('id')
            .eq('lawyer_id', lawyer.user_id)
            .limit(1);
            
          // Check lawyer_services table  
          const { data: lawyerServicesData, error: lawyerServicesError } = await supabaseAdmin
            .from('lawyer_services')
            .select('id')
            .eq('lawyer_user_id', lawyer.user_id)
            .limit(1);
            
          // If no services found in either table, include this lawyer
          if ((!servicesData || servicesData.length === 0) && (!lawyerServicesData || lawyerServicesData.length === 0)) {
            lawyersWithoutServices.push({
              email: lawyer.email,
              first_name: lawyer.first_name,
              last_name: lawyer.last_name
            });
          }
        }
        
        lawyers = lawyersWithoutServices;
      } catch (error) {
        console.error('Unexpected error fetching lawyers:', error);
        return createErrorResponse('Error inesperado al obtener abogados', 500, error);
      }

    }

    try {
      // Process emails in batches
      const BATCH_SIZE = 5;
      const results: NotificationResult[] = [];
      
      for (let i = 0; i < lawyers.length; i += BATCH_SIZE) {
        const batch = lawyers.slice(i, i + BATCH_SIZE);
        
        const batchResults = await Promise.all(
          batch.map(async (lawyer) => {
            const result: NotificationResult = {
              email: lawyer.email || '',
              success: false,
              timestamp: new Date().toISOString()
            };

            try {
              if (!lawyer.email) {
                const errorMsg = 'El abogado no tiene correo electrónico';
                console.warn(errorMsg);
                result.error = errorMsg;
                return result;
              }

              const lawyerName = `${lawyer.first_name || ''} ${lawyer.last_name || ''}`.trim() || 'Abogado/a';
              
              const emailResponse = await resend.emails.send({
                from: 'Juan de LegalUp <hola@legalup.cl>',
                reply_to: 'hola@legalup.cl',
                to: [lawyer.email],
                subject: '¡Completa tu perfil en LegalUp!',
                html: getLawyerServicesEmail(lawyerName),
              });

              if (emailResponse.error) {
                console.error(`[${new Date().toISOString()}] Error from Resend for ${lawyer.email}:`, emailResponse.error);
                throw new Error(emailResponse.error.message || 'Error al enviar el correo');
              }

              result.success = true;
              
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : 'Error desconocido al enviar el correo';
              console.error(`[${new Date().toISOString()}] Error sending to ${lawyer.email}:`, errorMsg);
              result.error = errorMsg;
            }

            return result;
          })
        );
        
        results.push(...batchResults);
        
        // Add a small delay between batches if there are more to process
        if (i + BATCH_SIZE < lawyers.length) {
          const delay = 1000; // 1 second
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failedCount = results.length - successCount;
      
      const response = {
        success: successCount > 0,
        message: successCount > 0 
          ? `Se enviaron ${successCount} correo(s) exitosamente${failedCount > 0 ? `, fallaron ${failedCount}` : ''}.`
          : 'No se pudo enviar ningún correo. Verifica los errores.',
        results,
        summary: {
          total: results.length,
          success: successCount,
          failed: failedCount,
          successRate: results.length > 0 ? Math.round((successCount / results.length) * 100) : 0
        }
      };
      
      if (failedCount > 0) {
        console.warn('Failed emails:', results.filter(r => !r.success).map(r => ({
          email: r.email,
          error: r.error
        })));
      }
      
      return new Response(
        JSON.stringify(response),
        {
          status: successCount > 0 ? 200 : 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    } catch (error) {
      const errorMessage = 'Error en el proceso de envío de correos';
      console.error(errorMessage, error);
      
      return createErrorResponse(
        errorMessage,
        500,
        error instanceof Error ? error : String(error)
      );
    }
  } catch (error) {
    const errorMessage = 'Error en la API notify-lawyers';
    console.error(errorMessage, error);
    
    return createErrorResponse(
      errorMessage,
      500,
      error instanceof Error ? error : String(error)
    );
  }
};
