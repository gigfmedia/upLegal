import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

// Get environment variables with proper Deno compatibility
const getEnv = (key: string): string => {
  const value = Deno.env.get(key);
  if (!value) {
    console.error(`FATAL: ${key} environment variable is not set`);
    Deno.exit(1);
  }
  return value;
};

const mpAccessToken = getEnv('MERCADOPAGO_ACCESS_TOKEN');
const supabaseUrl = getEnv('SUPABASE_URL');
const supabaseKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

// Initialize Supabase admin client
const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

console.log('MercadoPago function initialized');

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Interface for the request body
interface MercadoPagoRequest {
  items: Array<{
    id: string;
    title: string;
    description: string;
    quantity: number;
    unit_price: number;
    currency_id: string;
  }>;
  payer: {
    name: string;
    email: string;
    phone?: {
      area_code: string;
      number: string;
    };
  };
  back_urls: {
    success: string;
    failure: string;
    pending: string;
  };
  binary_mode: boolean;
  statement_descriptor: string;
  metadata: {
    client_id: string;
    lawyer_id: string;
    service_type: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Log request headers for debugging
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));
    
    // Get the raw body as text first
    const rawBody = await req.text();
    console.log('Raw request body:', rawBody);
    
    if (!rawBody) {
      throw new Error('Empty request body');
    }

    let requestData: MercadoPagoRequest;
    try {
      requestData = JSON.parse(rawBody);
    } catch (e) {
      console.error('Failed to parse request body:', e);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    console.log('Parsed request data:', JSON.stringify(requestData, null, 2));

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Verify the JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Prepare test user data
    const testPayer = {
      ...requestData.payer,
      // Ensure test user data is used in sandbox
      email: 'test_user_123456@testuser.com',
      identification: {
        type: 'DNI',
        number: '12345678'
      },
      address: {
        zip_code: '1234',
        street_name: 'Calle Falsa',
        street_number: '123',
        neighborhood: 'Centro',
        city: 'Santiago',
        federal_unit: 'RM'
      }
    };

    // Create the payment in MercadoPago
    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': crypto.randomUUID()
      },
      body: JSON.stringify({
        items: requestData.items.map(item => ({
          ...item,
          id: item.id || `item-${Date.now()}`,
          currency_id: 'CLP',
          quantity: 1,
          unit_price: Math.round(parseFloat(item.unit_price) || 0)
        })),
        payer: testPayer,
        payment_methods: {
          excluded_payment_types: [
            { id: 'ticket' },
            { id: 'bank_transfer' },
            { id: 'atm' }
          ],
          installments: 1
        },
        back_urls: {
          success: requestData.back_urls?.success || 'http://localhost:8080/payment/success',
          failure: requestData.back_urls?.failure || 'http://localhost:8080/payment/failure',
          pending: requestData.back_urls?.pending || 'http://localhost:8080/payment/pending'
        },
        auto_return: 'approved',
        binary_mode: true,
        statement_descriptor: 'UPLEGAL',
        external_reference: `ref-${Date.now()}`,
        notification_url: requestData.notification_url || 'https://834703e13045.ngrok-free.app/api/mercadopago/webhook',
        metadata: {
          ...requestData.metadata,
          platform: 'upLegal',
          version: '1.0.0',
          environment: 'sandbox'
        },
        additional_info: {
          items: requestData.items.map(item => ({
            id: item.id,
            title: item.title,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            category_id: 'services',
            currency_id: 'CLP'
          }))
        }
      }),
    });

    const responseData = await mpResponse.json();
    console.log('MercadoPago API response:', { status: mpResponse.status, data: responseData });

    if (!mpResponse.ok) {
      throw new Error(`MercadoPago API error: ${JSON.stringify(responseData)}`);
    }

    // Calculate amounts
    const totalAmount = requestData.items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    const platformFee = Math.ceil(totalAmount * 0.1); // 10% platform fee
    const lawyerAmount = totalAmount - platformFee;

    // Prepare payment data according to the existing schema
    const paymentData = {
      client_user_id: user.id,
      lawyer_user_id: requestData.metadata?.lawyer_id || user.id, // Fallback to user.id if lawyer_id is not provided
      stripe_session_id: responseData.id, // Store MercadoPago preference ID here
      total_amount: totalAmount,
      lawyer_amount: lawyerAmount,
      platform_fee: platformFee,
      currency: requestData.items[0]?.currency_id?.toLowerCase() || 'clp',
      status: 'pending',
      service_description: requestData.items[0]?.title || 'Consulta Legal',
      // Store additional data in the service_description or other available fields
      // as the metadata column doesn't exist in your schema
    };

    console.log('Saving payment record:', paymentData);

    // Save the payment record to the database
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert(paymentData)
      .select()
      .single();

    if (paymentError) {
      console.error('Error saving payment record:', paymentError);
      // Continue with the payment flow even if saving to DB fails
      // The payment can still be processed, we'll just log the error
    } else {
      console.log('Payment record saved successfully:', payment);
    }

    // Return the MercadoPago response to the client
    return new Response(
      JSON.stringify({
        init_point: responseData.init_point,
        sandbox_init_point: responseData.sandbox_init_point,
        preference_id: responseData.id,
        payment_id: payment?.id,
        payment_status: 'pending'
      }),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Error desconocido'
      }),
      {
        status: 400,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
      }
    );
  }
});
