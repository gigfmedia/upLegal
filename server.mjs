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

// Load environment variables from .env.local first, then .env
dotenv.config({ path: path.resolve(__dirname, '.env.local') });
dotenv.config();

// Get environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Debug log to check if env vars are loaded
console.log('Supabase URL:', supabaseUrl ? 'Set' : 'Not set');
console.log('Service Role Key:', serviceRoleKey ? 'Set' : 'Not set');

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing required environment variables');
  console.error('Please check your .env.local file');
  process.exit(1);
}

// Create Supabase client with service role to bypass RLS
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

// Function to check payments table structure
const checkPaymentsTable = async () => {
  try {
    console.log('Checking payments table structure...');
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error checking payments table:', error);
    } else {
      console.log('Payments table structure check successful');
      if (data && data.length > 0) {
        // Remove payment_gateway_id from the output if it exists
        const { payment_gateway_id, ...sampleRecord } = data[0];
        console.log('Sample payment record:', sampleRecord);
      }
    }
  } catch (err) {
    console.error('Failed to check payments table:', err);
  }
};

// Check payments table when server starts
checkPaymentsTable();

const app = express();
app.use(cors());
app.use(express.json());

app.use(cors({
  origin: ['http://localhost:3001', 'http://localhost:3000'],
  credentials: true
}));

// Health check endpoint
app.get('/', (req, res) => {
  res.send('Server is running');
});

// Get payment methods endpoint
app.get('/api/payment-methods', async (req, res) => {
  try {
    const response = await fetch('https://api.mercadopago.com/v1/payment_methods', {
      headers: {
        'Authorization': `Bearer ${process.env.VITE_MERCADOPAGO_ACCESS_TOKEN}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('MercadoPago API error:', errorData);
      return res.status(response.status).json({ 
        error: 'Failed to fetch payment methods',
        details: errorData
      });
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({ 
      error: 'Failed to fetch payment methods',
      details: error.message 
    });
  }
});

// Create payment endpoint
app.post('/create-payment', async (req, res) => {
  try {
    const { 
      amount, 
      description, 
      user_id, 
      lawyer_id, 
      appointment_id, 
      success_url, 
      failure_url, 
      pending_url, 
      user_email, 
      user_name 
    } = req.body;

    if (!amount || !user_id || !lawyer_id || !appointment_id) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['amount', 'user_id', 'lawyer_id', 'appointment_id']
      });
    }

    // Create payment data for database
    const paymentData = {
      id: uuidv4(),
      total_amount: Math.round(Number(amount) * 100), // Convert to cents
      lawyer_amount: Math.floor(Number(amount) * 0.85 * 100), // 85% for lawyer in cents
      platform_fee: Math.ceil(Number(amount) * 0.15 * 100),   // 15% platform fee in cents
      currency: 'clp',
      status: 'pending',
      service_description: description || 'Legal Consultation',
      client_user_id: user_id,
      lawyer_user_id: lawyer_id,
      payment_gateway_id: null, // Will store MercadoPago preference ID
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Log the payment data being inserted
    console.log('Inserting payment data:', JSON.stringify(paymentData, null, 2));
    
    console.log('Skipping user existence check...');
    console.log('Creating payment with:', {
      lawyer_id,
      client_id: user_id,
      amount: paymentData.total_amount / 100, // Convert back to CLP for logging
      description: paymentData.service_description
    });
    
    // We'll let the database handle the foreign key constraints
    // If the users don't exist, the database will return an error

    // Insert payment into database
    try {
      const paymentInsert = {
        client_user_id: user_id,
        lawyer_user_id: lawyer_id,
        total_amount: paymentData.total_amount,
        lawyer_amount: paymentData.lawyer_amount,
        platform_fee: paymentData.platform_fee,
        currency: paymentData.currency,
        status: paymentData.status,
        service_description: paymentData.service_description,
        created_at: paymentData.created_at,
        updated_at: paymentData.updated_at,
        payment_gateway_id: paymentData.payment_gateway_id
      };

      console.log('Inserting payment with data:', JSON.stringify(paymentInsert, null, 2));

      const { data: paymentResult, error } = await supabase
        .from('payments')
        .insert(paymentInsert)
        .select()
        .single();
        
      if (error) {
        console.error('Database error:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw new Error(`Failed to create payment record: ${error.message}`);
      }

      if (error) {
        console.error('Database error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          table: error.table,
          constraint: error.constraint
        });
        throw error;
      }
      payment = paymentResult;
      
    } catch (error) {
      console.error('Error creating payment:', {
        message: error.message,
        code: error.code,
        details: error.details
      });
      
      return res.status(500).json({
        error: 'Failed to create payment record',
        details: error.message,
        code: error.code
      });
    }

    // Create MercadoPago preference
    try {
      const preference = new Preference(mercadopago);
      const preferenceData = {
        items: [{
          id: payment.id,
          title: description || 'Consulta Legal',
          quantity: 1,
          currency_id: 'CLP',
          unit_price: Number(amount)
        }],
        payer: {
          email: user_email,
          name: user_name || ''
        },
        back_urls: {
          success: success_url || `${process.env.FRONTEND_URL}/payment/success`,
          failure: failure_url || `${process.env.FRONTEND_URL}/payment/failure`,
          pending: pending_url || `${process.env.FRONTEND_URL}/payment/pending`
        },
        auto_return: 'approved',
        external_reference: payment.id
      };

      const mpResponse = await preference.create({ body: preferenceData });

      // Update payment with MercadoPago preference ID
      if (mpResponse.id) {
        await supabase
          .from('payments')
          .update({ 
            payment_gateway_id: mpResponse.id,
            status: 'pending',
            updated_at: new Date().toISOString()
          })
          .eq('id', payment.id);
      }

      // Return the MercadoPago preference URL
      return res.json({
        success: true,
        payment: {
          ...payment,
          payment_link: mpResponse.init_point || mpResponse.sandbox_init_point
        },
        payment_link: mpResponse.init_point || mpResponse.sandbox_init_point
      });

    } catch (error) {
      console.error('MercadoPago error:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      // Update payment status to failed
      if (payment?.id) {
        await supabase
          .from('payments')
          .update({ status: 'failed' })
          .eq('id', payment.id);
      }
      
      return res.status(500).json({
        error: 'Error creating MercadoPago payment',
        details: error.message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      });
    }
  } catch (error) {
    console.error('Server error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  
  // Log to error tracking in production
  if (process.env.NODE_ENV === 'production') {
    // Example with Sentry (uncomment and configure if using Sentry)
    // Sentry.captureException(error);
    
    // Or log to a file/cloud logging service
    console.error('Production Error:', {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });
  }
  
  res.status(500).json({ 
    error: 'Internal server error',
    // Only include stack trace in development
    ...(process.env.NODE_ENV !== 'production' && { details: err.message })
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});