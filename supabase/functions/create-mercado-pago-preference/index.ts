// @deno-types="https://deno.land/x/types/deno/deno.d.ts"
/// <reference types="https://deno.land/x/types/deno/deno.d.ts" />

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Declare Deno namespace for TypeScript
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET'
};

// Helper function to get environment variables with type safety
function getEnv(key: string): string {
  const value = Deno.env.get(key);
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

// Interfaces
export interface Item {
  id?: string;
  title: string;
  description?: string;
  quantity?: number;
  unit_price: number | string;
  currency_id?: string;
}

export interface Phone {
  area_code?: string;
  number: string;
}

export interface Payer {
  name: string;
  email: string;
  phone?: Phone;
}

export interface BackUrls {
  success?: string;
  failure?: string;
  pending?: string;
  [key: string]: string | undefined;
}

export interface MercadoPagoRequest {
  items: Item[];
  payer: Payer;
  back_urls?: BackUrls;
  success_url?: string;
  failure_url?: string;
  pending_url?: string;
  auto_return?: string;
  binary_mode?: boolean;
  statement_descriptor?: string;
  notification_url?: string;
  external_reference?: string | null;
  metadata?: Record<string, unknown>;
}

// Define a more specific type for the cause
interface MercadoPagoErrorCause {
  code?: string;
  description?: string;
  data?: Record<string, unknown>;
}

export interface MercadoPagoResponse {
  id?: string;
  init_point?: string;
  sandbox_init_point?: string;
  error?: string;
  message?: string;
  cause?: MercadoPagoErrorCause | MercadoPagoErrorCause[];
  status?: number;
  status_detail?: string;
  details?: string;
}

// Error response interface
interface ErrorResponse {
  error: string;
  message: string;
  details?: Record<string, unknown>;
}

// Helper function to create an error response
function createErrorResponse(status: number, message: string, details?: Record<string, unknown>): Response {
  const errorResponse: ErrorResponse = {
    error: 'Payment processing failed',
    message,
    ...(details && { details })
  };

  return new Response(JSON.stringify(errorResponse), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Main function
export const createMercadoPagoPreference = async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  
  // Helper function to log messages with request ID
  const log = (message: string, data: unknown = '') => {
    console.log(`[${new Date().toISOString()}] [${requestId}] ${message}`, data);
  };
  
  log('Received request', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  });

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return createErrorResponse(405, 'Method not allowed', { allowedMethods: ['POST'] });
    }

    // Parse request body
    let requestData: MercadoPagoRequest;
    try {
      requestData = await req.json();
      log('Parsed request data', requestData);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      log('Failed to parse request body', { error: err.message });
      return createErrorResponse(400, 'Invalid JSON payload');
    }

    // Validate required fields
    if (!requestData.items || !Array.isArray(requestData.items) || requestData.items.length === 0) {
      return createErrorResponse(400, 'At least one item is required');
    }

    if (!requestData.payer || !requestData.payer.email) {
      return createErrorResponse(400, 'Payer information is required');
    }

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return createErrorResponse(401, 'Missing or invalid authorization header');
    }

    // Initialize Supabase client
    const supabaseUrl = getEnv('SUPABASE_URL');
    const supabaseKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verify JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      log('Invalid or expired token', { 
        error: userError ? String(userError) : 'No user data returned' 
      });
      return createErrorResponse(401, 'Invalid or expired token');
    }

    // Get MercadoPago access token
    const mpAccessToken = getEnv('MERCADOPAGO_ACCESS_TOKEN');
    log('Using MercadoPago access token');

    // Force production environment
    const isProduction = true; // Always use production
    const baseUrl = 'https://uplegal.netlify.app';
    
    log('MercadoPago Environment', { 
      isProduction, 
      baseUrl,
      accessToken: mpAccessToken ? `${mpAccessToken.substring(0, 10)}...` : 'undefined',
      isProductionAccessToken: mpAccessToken?.startsWith('APP_USR-')
    });

    // Prepare back_urls with proper validation
    const getValidUrl = (url: string | undefined, defaultPath: string): string => {
      try {
        // If no URL is provided, use the default with the base URL
        if (!url) {
          const defaultUrl = `${baseUrl}${defaultPath}`;
          log('Using default URL:', defaultUrl);
          return defaultUrl;
        }
        
        // Ensure the URL is absolute
        let finalUrl = url;
        if (!url.startsWith('http')) {
          finalUrl = `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
        }
        
        // Ensure HTTPS in production
        if (isProduction && finalUrl.startsWith('http:')) {
          finalUrl = finalUrl.replace('http:', 'https:');
        }
        
        log('Processed URL:', { original: url, final: finalUrl });
        return finalUrl;
        
      } catch (e) {
        const fallback = `${baseUrl}${defaultPath}`;
        log('Error processing URL, using fallback:', { url, error: e, fallback });
        return fallback;
      }
    };

    // Log the incoming request data for debugging
    log('Using base URL:', baseUrl);
    log('Incoming request data:', {
      hasBackUrls: !!requestData.back_urls,
      backUrls: requestData.back_urls,
      isProduction
    });

    // Prepare items with proper validation
    const items = requestData.items.map((item, index) => ({
      id: item.id || `item-${index + 1}`,
      title: item.title,
      description: item.description || '',
      quantity: item.quantity || 1,
      unit_price: typeof item.unit_price === 'string' ? parseFloat(item.unit_price) : item.unit_price,
      currency_id: item.currency_id || 'CLP'
    }));

    // Prepare back URLs - MercadoPago requires HTTPS URLs for auto_return to work
    // In development, we'll use a placeholder HTTPS URL or omit auto_return
    const backUrls = isProduction ? {
      success: 'https://uplegal.netlify.app/payment/success',
      failure: 'https://uplegal.netlify.app/payment/failure',
      pending: 'https://uplegal.netlify.app/payment/pending'
    } : {
      success: 'https://uplegal.netlify.app/payment/success',
      failure: 'https://uplegal.netlify.app/payment/failure',
      pending: 'https://uplegal.netlify.app/payment/pending'
    };

    log('Using back_urls:', backUrls);
    log('Environment:', { isProduction });

    // Create the MercadoPago payload
    const mpPayload = {
      items,
      payer: {
        name: requestData.payer.name,
        email: requestData.payer.email,
        ...(requestData.payer.phone ? {
          phone: {
            area_code: requestData.payer.phone.area_code || '56',
            number: requestData.payer.phone.number
          }
        } : {})
      },
      back_urls: backUrls,
      auto_return: 'approved',
      binary_mode: true,
      statement_descriptor: 'Uplegal',
      notification_url: requestData.notification_url,
      external_reference: requestData.external_reference || null,
      metadata: {
        ...requestData.metadata,
        user_id: user.id,
        request_id: requestId,
        environment: 'production' // Explicitly set environment in metadata
      }
    };
    
    log('Creating MercadoPago preference', { 
      preference: {
        ...mpPayload,
        items: mpPayload.items.map(i => ({ 
          ...i, 
          unit_price: i.unit_price,
          title: i.title.substring(0, 20) + (i.title.length > 20 ? '...' : '')
        })),
        payer: { 
          ...mpPayload.payer, 
          email: mpPayload.payer?.email ? '***@***' : undefined 
        }
      } 
    });

    // Make request to MercadoPago API
    const mpApiUrl = 'https://api.mercadopago.com/checkout/preferences';
    
    // Log the request payload (with sensitive data masked)
    log('Sending request to MercadoPago API', {
      url: mpApiUrl,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mpAccessToken.substring(0, 10)}...`,
        'X-Idempotency-Key': requestId,
        'X-Tracking-Id': `up-${requestId}`
      },
      body: {
        ...mpPayload,
        items: mpPayload.items.map(item => ({
          ...item,
          title: item.title.substring(0, 20) + (item.title.length > 20 ? '...' : '')
        })),
        payer: {
          ...mpPayload.payer,
          email: mpPayload.payer?.email ? '***@***' : undefined
        }
      }
    });
    
    let response;
    let responseData;
    
    try {
      // Make the API request
      response = await fetch(mpApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mpAccessToken}`,
          'X-Idempotency-Key': requestId,
          'X-Tracking-Id': `up-${requestId}`
        },
        body: JSON.stringify(mpPayload)
      });
      
      // Try to parse the response as JSON
      try {
        responseData = await response.json();
      } catch (parseError) {
        log('Failed to parse JSON response', { 
          status: response.status,
          statusText: response.statusText,
          error: parseError.message
        });
        throw new Error('Invalid JSON response from MercadoPago API');
      }
      
      log('MercadoPago API response received', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: {
          ...responseData,
          init_point: responseData.init_point ? '***' : undefined,
          sandbox_init_point: responseData.sandbox_init_point ? '***' : undefined,
          id: responseData.id,
          status: responseData.status
        }
      });
      
      if (!response.ok) {
        const errorMessage = responseData.message || 'Payment processing failed';
        log('MercadoPago API error response', {
          status: response.status,
          error: responseData.error,
          cause: responseData.cause,
          status_detail: responseData.status_detail
        });
        throw new Error(errorMessage);
      }
      
      return new Response(JSON.stringify({
        id: responseData.id,
        init_point: responseData.init_point,
        sandbox_init_point: responseData.sandbox_init_point,
        status: responseData.status
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      log('Error in MercadoPago API request', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        responseStatus: response?.status,
        responseData: responseData || 'No response data'
      });
      
      return createErrorResponse(
        response?.status || 500,
        errorMessage,
        {
          error: responseData?.error || 'internal_error',
          status: response?.status,
          status_detail: responseData?.status_detail,
          request_id: requestId,
          cause: responseData?.cause
        }
      );
    }

    if (!response.ok) {
      return createErrorResponse(
        response.status,
        responseData.message || 'Payment processing failed',
        {
          error: responseData.error,
          status: response.status,
          status_detail: responseData.status_detail,
          request_id: requestId
        }
      );
    }

    // Return success response
    // Always use production URL or construct it
    const initPoint = responseData.init_point || 
                     (responseData.id ? `https://www.mercadopago.cl/checkout/v1/redirect?pref_id=${responseData.id}` : null);
    
    if (!initPoint) {
      throw new Error('No se pudo generar la URL de pago');
    }
    
    // Ensure we're using the production domain
    const paymentUrl = new URL(initPoint);
    paymentUrl.hostname = 'www.mercadopago.cl';
    paymentUrl.protocol = 'https:';
    
    return new Response(JSON.stringify({
      success: true,
      id: responseData.id,
      init_point: paymentUrl.toString(),
      url: paymentUrl.toString(),
      request_id: requestId
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });

  } catch (error) {
    const err = error as Error;
    log('Unexpected error', {
      error: err.message,
      stack: err.stack,
      request_id: requestId
    });
    
    return createErrorResponse(500, 'Internal server error', {
      error: 'An unexpected error occurred',
      request_id: requestId
    });
  }
};

// Start the server
console.log('MercadoPago preference function started');
serve(createMercadoPagoPreference);
