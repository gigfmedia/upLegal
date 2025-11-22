// netlify/functions/create-payment.js
const { createClient } = require('@supabase/supabase-js');
const { MercadoPagoConfig, Preference } = require('mercadopago');

// Usar crypto para generar UUIDs en lugar del paquete uuid
const { randomUUID } = require('crypto');

exports.handler = async (event) => {
  console.log('Function invoked with method:', event.httpMethod);
  
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ 
        error: 'Method not allowed',
        allowed: ['POST']
      })
    };
  }

  try {
    console.log('Processing payment request...');
    
    if (!event.body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No body provided' })
      };
    }

    const { 
      amount, 
      description, 
      userId, 
      lawyerId, 
      appointmentId, 
      successUrl, 
      failureUrl, 
      pendingUrl, 
      userEmail, 
      userName 
    } = JSON.parse(event.body);

    console.log('Payment request data:', { 
      amount, 
      userId: userId?.substring(0, 8) + '...',
      lawyerId: lawyerId?.substring(0, 8) + '...',
      appointmentId: appointmentId?.substring(0, 8) + '...',
      userEmail: userEmail?.substring(0, 8) + '...'
    });

    // Validations
    if (!amount || !userId || !lawyerId || !appointmentId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields',
          required: ['amount', 'userId', 'lawyerId', 'appointmentId'],
          received: { amount, userId: !!userId, lawyerId: !!lawyerId, appointmentId: !!appointmentId }
        })
      };
    }

    if (amount < 1000) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Amount must be at least 1000 CLP' })
      };
    }

    // Check environment variables
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
    const mpToken = process.env.VITE_MERCADOPAGO_ACCESS_TOKEN;

    if (!supabaseUrl || !supabaseKey || !mpToken) {
      console.error('Missing environment variables');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server configuration error' })
      };
    }

    // Initialize Supabase
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Initialize MercadoPago
    const mercadopago = new MercadoPagoConfig({
      accessToken: mpToken,
      options: { timeout: 5000 }
    });

    // Create payment record - usar randomUUID en lugar de uuidv4
    const paymentId = randomUUID();
    const paymentData = {
      id: paymentId,
      total_amount: Math.round(Number(amount) * 100),
      lawyer_amount: Math.floor(Number(amount) * 0.85 * 100),
      platform_fee: Math.ceil(Number(amount) * 0.15 * 100),
      currency: 'clp',
      status: 'pending',
      service_description: description || 'Consulta Legal',
      client_user_id: userId,
      lawyer_user_id: lawyerId,
      appointment_id: appointmentId,
      payment_gateway_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('Inserting payment into database...');

    // Insert payment into database
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert(paymentData)
      .select()
      .single();

    if (paymentError) {
      console.error('Database error:', paymentError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Failed to create payment record',
          details: paymentError.message
        })
      };
    }

    console.log('Payment record created, creating MercadoPago preference...');

    // Create MercadoPago preference
    const preference = new Preference(mercadopago);
    
    const preferenceData = {
      items: [{
        id: paymentId,
        title: description || 'Consulta Legal - UpLegal',
        description: `Consulta con abogado especializado`,
        quantity: 1,
        currency_id: 'CLP',
        unit_price: Number(amount)
      }],
      payer: {
        email: userEmail,
        name: userName || 'Cliente UpLegal'
      },
      back_urls: {
        success: successUrl,
        failure: failureUrl,
        pending: pendingUrl
      },
      auto_return: 'approved',
      binary_mode: true,
      external_reference: paymentId,
      statement_descriptor: 'UPLEGAL'
    };

    const mpResponse = await preference.create({ body: preferenceData });

    // Update payment with MercadoPago preference ID
    if (mpResponse.id) {
      await supabase
        .from('payments')
        .update({ 
          payment_gateway_id: mpResponse.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId);
    }

    const paymentLink = mpResponse.init_point || mpResponse.sandbox_init_point;
    
    if (!paymentLink) {
      throw new Error('No payment link received from MercadoPago');
    }

    console.log('Payment created successfully, returning payment link');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        payment_id: paymentId,
        payment_link: paymentLink,
        message: 'Payment created successfully'
      })
    };

  } catch (error) {
    console.error('Error in create-payment function:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message
      })
    };
  }
};