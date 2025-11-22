const { createClient } = require('@supabase/supabase-js');
const { MercadoPagoConfig, Preference } = require('mercadopago');
const { v4: uuidv4 } = require('uuid');

exports.handler = async (event) => {
  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
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

    console.log('Payment request:', { amount, userId, lawyerId, appointmentId });

    // Validations
    if (!amount || !userId || !lawyerId || !appointmentId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields',
          required: ['amount', 'userId', 'lawyerId', 'appointmentId']
        })
      };
    }

    // Initialize Supabase
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Initialize MercadoPago
    const mercadopago = new MercadoPagoConfig({
      accessToken: process.env.VITE_MERCADOPAGO_ACCESS_TOKEN,
      options: { timeout: 5000 }
    });

    // Create payment record
    const paymentId = uuidv4();
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
    console.error('Error:', error);
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