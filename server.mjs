import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { v4 as uuidv4 } from 'uuid';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env.local') });
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
    if (!amount || !userId || !lawyerId || !appointmentId) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['amount', 'userId', 'lawyerId', 'appointmentId'],
        received: { amount, userId, lawyerId, appointmentId }
      });
    }

    // Validate amount
    if (amount < 1000) {
      return res.status(400).json({
        error: 'Amount must be at least 1000 CLP'
      });
    }

    // Create payment record in database
    const paymentId = uuidv4();
    const paymentData = {
      id: paymentId,
      total_amount: Math.round(Number(amount) * 100), // Convert to cents
      lawyer_amount: Math.floor(Number(amount) * 0.80 * 100), // 80% for lawyer
      platform_fee: Math.ceil(Number(amount) * 0.20 * 100),   // 20% platform fee
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
        title: description || 'Consulta Legal - UpLegal',
        description: `Consulta con abogado especializado - ${description}`,
        quantity: 1,
        currency_id: 'CLP',
        unit_price: Number(amount)
      }],
      payer: {
        email: userEmail,
        name: userName || 'Cliente UpLegal'
      },
      back_urls: {
        success: successUrl || `${process.env.FRONTEND_URL}/payment/success`,
        failure: failureUrl || `${process.env.FRONTEND_URL}/payment/failure`,
        pending: pendingUrl || `${process.env.FRONTEND_URL}/payment/pending`
      },
      auto_return: 'approved',
      binary_mode: true,
      external_reference: paymentId,
      statement_descriptor: 'UPLEGAL',
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