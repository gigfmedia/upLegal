// netlify/functions/create-payment.js
const { createClient } = require('@supabase/supabase-js');
const { MercadoPagoConfig, Preference } = require('mercadopago');
const { randomUUID } = require('crypto');

const DEFAULT_CLIENT_SURCHARGE_PERCENT = 0.1;
const DEFAULT_PLATFORM_FEE_PERCENT = 0.2;
const DEFAULT_CURRENCY = 'CLP';

exports.handler = async (event) => {
  
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
    
    if (!event.body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No body provided' })
      };
    }

    const { 
      amount, 
      originalAmount,
      description, 
      userId, 
      lawyerId, 
      appointmentId,  // Puede ser de appointments o consultations
      successUrl, 
      failureUrl, 
      pendingUrl, 
      userEmail, 
      userName 
    } = JSON.parse(event.body);

    const siteUrlString = (process.env.PUBLIC_SITE_URL || process.env.URL || 'https://uplegal.netlify.app').replace(/\/$/, '');
    const siteUrl = new URL(siteUrlString.startsWith('http') ? siteUrlString : `https://${siteUrlString}`);

    const normalizeBackUrl = (requestedUrl, fallbackPath) => {
      try {
        const targetUrl = requestedUrl ? new URL(requestedUrl, siteUrl) : new URL(`${siteUrl.origin}${fallbackPath}`);
        targetUrl.protocol = 'https:';
        targetUrl.host = siteUrl.host;
        targetUrl.port = '';
        return targetUrl.toString();
      } catch (error) {
        return `${siteUrl.origin}${fallbackPath}`;
      }
    };

    const resolvedSuccessUrl = normalizeBackUrl(successUrl, '/payment/success');
    const resolvedFailureUrl = normalizeBackUrl(failureUrl, '/payment/failure');
    const resolvedPendingUrl = normalizeBackUrl(pendingUrl, '/payment/pending');

    // Validate that all URLs are non-empty strings
    if (!resolvedSuccessUrl || typeof resolvedSuccessUrl !== 'string' || resolvedSuccessUrl.trim() === '') {
      console.error('Invalid success URL:', { successUrl, resolvedSuccessUrl });
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid success URL',
          details: 'Success URL must be a valid non-empty string'
        })
      };
    }

    if (!resolvedFailureUrl || typeof resolvedFailureUrl !== 'string' || resolvedFailureUrl.trim() === '') {
      console.error('Invalid failure URL:', { failureUrl, resolvedFailureUrl });
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid failure URL',
          details: 'Failure URL must be a valid non-empty string'
        })
      };
    }

    if (!resolvedPendingUrl || typeof resolvedPendingUrl !== 'string' || resolvedPendingUrl.trim() === '') {
      console.error('Invalid pending URL:', { pendingUrl, resolvedPendingUrl });
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid pending URL',
          details: 'Pending URL must be a valid non-empty string'
        })
      };
    }

    // Validations
    if ((!amount && !originalAmount) || !userId || !lawyerId || !appointmentId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields',
          required: ['amount or originalAmount', 'userId', 'lawyerId', 'appointmentId'],
          received: { amount: !!amount, originalAmount: !!originalAmount, userId: !!userId, lawyerId: !!lawyerId, appointmentId: !!appointmentId }
        })
      };
    }

    const numericAmount = Number(amount ?? originalAmount);

    if (!Number.isFinite(numericAmount) || numericAmount < 1000) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Amount must be at least 1000 CLP' })
      };
    }

    // Check environment variables
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
    const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.VITE_MERCADOPAGO_ACCESS_TOKEN;

    if (!supabaseUrl || !supabaseKey || !mpToken) {
      console.error('Missing environment variables');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server configuration error - Missing environment variables' })
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

    // Fetch platform fee configuration (fallback to defaults)
    let clientSurchargePercent = DEFAULT_CLIENT_SURCHARGE_PERCENT;
    let platformFeePercent = DEFAULT_PLATFORM_FEE_PERCENT;
    let currency = DEFAULT_CURRENCY;

    try {
      const { data: settingsData } = await supabase
        .from('platform_settings')
        .select('client_surcharge_percent, platform_fee_percent, currency')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (settingsData) {
        clientSurchargePercent = Number(settingsData.client_surcharge_percent ?? clientSurchargePercent);
        platformFeePercent = Number(settingsData.platform_fee_percent ?? platformFeePercent);
        currency = settingsData.currency ?? currency;
      }
    } catch (settingsError) {
      console.warn('Falling back to default platform settings:', settingsError);
    }

    // Create payment record
    const paymentId = randomUUID();

    const hasOriginalAmount = typeof originalAmount === 'number' && Number.isFinite(originalAmount) && originalAmount > 0;
    const derivedOriginalAmount = hasOriginalAmount
      ? Math.round(Number(originalAmount))
      : Math.round(numericAmount / (1 + clientSurchargePercent));

    const clientAmount = hasOriginalAmount
      ? Math.round(Number(originalAmount) * (1 + clientSurchargePercent))
      : Math.round(numericAmount);

    const clientSurcharge = Math.max(clientAmount - derivedOriginalAmount, 0);
    const platformFee = Math.round(derivedOriginalAmount * platformFeePercent);
    const lawyerAmount = Math.max(derivedOriginalAmount - platformFee, 0);

    // DETERMINAR SI ES APPOINTMENT O CONSULTATION
    let isConsultation = false;
    let isAppointment = false;

    // Primero verificar en consultations
    const { data: consultationData, error: consultationError } = await supabase
      .from('consultations')
      .select('id')
      .eq('id', appointmentId)
      .single();

    if (consultationData && !consultationError) {
      isConsultation = true;
    } else {
      // Si no está en consultations, verificar en appointments
      const { data: appointmentData, error: appointmentError } = await supabase
        .from('appointments')
        .select('id')
        .eq('id', appointmentId)
        .single();

      if (appointmentData && !appointmentError) {
        isAppointment = true;
      }
    }

    if (!isConsultation && !isAppointment) {
      throw new Error('No se encontró la referencia en appointments ni consultations');
    }

    // Crear datos de pago según el tipo
    const paymentData = {
      id: paymentId,
      total_amount: clientAmount,
      original_amount: derivedOriginalAmount,
      client_surcharge: clientSurcharge,
      client_surcharge_percent: clientSurchargePercent,
      platform_fee_percent: platformFeePercent,
      lawyer_amount: lawyerAmount,
      platform_fee: platformFee,
      currency,
      status: 'pending',
      service_description: description || 'Consulta Legal',
      client_user_id: userId,
      lawyer_user_id: lawyerId,
      payment_gateway_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Agregar la referencia correcta
    if (isConsultation) {
      paymentData.consultation_id = appointmentId;
      paymentData.appointment_id = null;
    } else if (isAppointment) {
      paymentData.appointment_id = appointmentId;
      paymentData.consultation_id = null;
    }

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
          details: paymentError.message,
          hint: paymentError.hint,
          code: paymentError.code
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
        unit_price: clientAmount
      }],
      payer: {
        email: userEmail,
        name: userName || 'Cliente UpLegal'
      },
      back_urls: {
        success: resolvedSuccessUrl,
        failure: resolvedFailureUrl,
        pending: resolvedPendingUrl
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
      console.error('No payment link received from MercadoPago:', mpResponse);
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