import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { v4 as uuidv4 } from 'uuid';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

app.post('/verify-lawyer', async (req, res) => {
  const { rut, fullName } = req.body || {};

  if (!rut || !fullName) {
    return res.status(400).json({
      verified: false,
      message: 'Se requieren rut y nombre completo para la verificación.'
    });
  }

  const apiKey = process.env.PJUD_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      verified: false,
      message: 'PJUD_API_KEY no está configurado en el servidor.'
    });
  }

  try {
    const cleanRut = normalizeRut(rut);
    const dv = cleanRut.slice(-1);
    const body = {
      rut: cleanRut.slice(0, -1),
      dv,
      nombre: fullName
    };

    console.log('Enviando verificación PJUD desde el servidor...', body);

    const response = await fetch(PJUD_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });

    const rawText = await response.text();
    let data = null;
    try {
      data = rawText ? JSON.parse(rawText) : null;
    } catch (parseError) {
      console.error('No se pudo parsear la respuesta del PJUD:', parseError, rawText);
    }

    if (!response.ok) {
      console.error('Error en respuesta del PJUD:', response.status, data);
      return res.status(response.status).json({
        verified: false,
        message: data?.message || 'Error en la verificación con el Poder Judicial',
        details: data || rawText
      });
    }

    const verified = data?.verificado === true;
    return res.json({
      verified,
      details: data
    });
  } catch (error) {
    console.error('Error al contactar al Poder Judicial:', error);
    return res.status(500).json({
      verified: false,
      message: 'No se pudo contactar al Poder Judicial',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});
dotenv.config();

// Get environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Initialize MercadoPago client
const mercadopago = new MercadoPagoConfig({
  accessToken: process.env.VITE_MERCADOPAGO_ACCESS_TOKEN,
  options: { timeout: 5000 }
});

const DEFAULT_CLIENT_SURCHARGE_PERCENT = 0.1;
const DEFAULT_PLATFORM_FEE_PERCENT = 0.2;
const DEFAULT_CURRENCY = 'CLP';
const PJUD_API_URL = process.env.PJUD_API_URL || 'https://api.pjud.cl/consulta-abogados';

const app = express();

// CORS configuration - CORREGIDO
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://uplegal.netlify.app',
      'http://localhost:3000', 
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001'
    ];
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('Blocked by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

app.use(express.json());

const normalizeRut = (rut = '') => rut.replace(/\./g, '').replace(/-/g, '').toUpperCase();

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Create payment endpoint
app.post('/create-payment', async (req, res) => {
  try {
    // Log the incoming request
    console.log('Received payment request from origin:', req.get('origin'));
    
    const { 
      amount, 
      originalAmount,
      description, 
      userId, 
      lawyerId, 
      appointmentId, 
      successUrl, 
      failureUrl, 
      pendingUrl, 
      userEmail, 
      userName 
    } = req.body;

    console.log('Payment request data:', {
      amount, userId, lawyerId, appointmentId, userEmail
    });

    // Validations
    if ((!amount && !originalAmount) || !userId || !lawyerId || !appointmentId) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['amount or originalAmount', 'userId', 'lawyerId', 'appointmentId'],
        received: { amount, originalAmount, userId, lawyerId, appointmentId }
      });
    }

    const numericAmount = Number(amount ?? originalAmount);

    if (!Number.isFinite(numericAmount) || numericAmount < 1000) {
      return res.status(400).json({
        error: 'Amount must be at least 1000 CLP'
      });
    }

    let clientSurchargePercent = DEFAULT_CLIENT_SURCHARGE_PERCENT;
    let platformFeePercent = DEFAULT_PLATFORM_FEE_PERCENT;
    let currency = DEFAULT_CURRENCY;

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

    const paymentId = uuidv4();

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
      appointment_id: appointmentId,
      payment_gateway_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('Inserting payment data:', paymentData);

    // Insert payment into database
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert(paymentData)
      .select()
      .single();

    if (paymentError) {
      console.error('Database error:', paymentError);
      return res.status(500).json({
        error: 'Failed to create payment record',
        details: paymentError.message,
        code: paymentError.code
      });
    }

    console.log('Payment record created successfully');

    // Create MercadoPago preference
    const preference = new Preference(mercadopago);
    
    const preferenceData = {
      items: [{
        id: paymentId,
        title: description || 'Consulta Legal - LegalUp',
        description: `Consulta con abogado especializado - ${description}`,
        quantity: 1,
        currency_id: currency,
        unit_price: clientAmount
      }],
      payer: {
        email: userEmail,
        name: userName || 'Cliente LegalUp'
      },
      back_urls: {
        success: successUrl || `${process.env.FRONTEND_URL}/payment/success`,
        failure: failureUrl || `${process.env.FRONTEND_URL}/payment/failure`,
        pending: pendingUrl || `${process.env.FRONTEND_URL}/payment/pending`
      },
      auto_return: 'approved',
      binary_mode: true,
      external_reference: paymentId,
      statement_descriptor: 'LEGALUP',
      notification_url: process.env.VITE_MERCADOPAGO_WEBHOOK_URL
    };

    console.log('Creating MercadoPago preference...');

    const mpResponse = await preference.create({ body: preferenceData });

    console.log('MercadoPago response received');

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

    // Return the payment link
    const paymentLink = mpResponse.init_point || mpResponse.sandbox_init_point;
    
    if (!paymentLink) {
      throw new Error('No payment link received from MercadoPago');
    }

    console.log('Payment link generated successfully');

    return res.json({
      success: true,
      payment_id: paymentId,
      payment_link: paymentLink,
      message: 'Payment created successfully'
    });

  } catch (error) {
    console.error('Error in create-payment:', error);
    
    // More detailed error logging
    if (error.response) {
      console.error('MercadoPago API error:', error.response);
    }
    
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});

// Test endpoint for CORS
app.get('/test-cors', (req, res) => {
  res.json({ 
    message: 'CORS is working!',
    origin: req.get('origin'),
    timestamp: new Date().toISOString()
  });
});

// Get payment status endpoint
app.get('/payment/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;

    const { data: payment, error } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json({ payment });
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error.message === 'Not allowed by CORS') {
    return res.status(403).json({ 
      error: 'CORS policy blocked this request',
      allowedOrigins: [
        'https://uplegal.netlify.app',
        'http://localhost:3000', 
        'http://localhost:3001'
      ]
    });
  }
  
  console.error('Server error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { details: error.message })
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`CORS enabled for:`);
  console.log(`- https://uplegal.netlify.app`);
  console.log(`- http://localhost:3000`);
  console.log(`- http://localhost:3001`);
  console.log(`- http://127.0.0.1:3000`);
  console.log(`- http://127.0.0.1:3001`);
});