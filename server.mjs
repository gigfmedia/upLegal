import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { v4 as uuidv4 } from 'uuid';
import { load } from 'cheerio';
import axios from 'axios';

// ... (imports)

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

// Configure MercadoPago
const mpClient = new MercadoPagoConfig({
  accessToken: process.env.VITE_MERCADOPAGO_ACCESS_TOKEN,
  options: { timeout: 5000 }
});

// Create API client instance
const mp = new Payment({ client: mpClient });

// Initialize Express app
const app = express();

// Configure CORS
const corsOptions = {
  origin: [
    'https://legalup.cl',
    'https://www.legalup.cl',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'https://uplegal.netlify.app'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
};

// Apply middleware
app.use(cors(corsOptions));
app.use(express.json());

// Constants
const DEFAULT_CLIENT_SURCHARGE_PERCENT = 0.1;
const DEFAULT_PLATFORM_FEE_PERCENT = 0.2;
const DEFAULT_CURRENCY = 'CLP';

const normalizeRut = (rut = '') => rut.replace(/\./g, '').replace(/-/g, '').toUpperCase();

// Function to validate RUT verifier digit
const validateRutDV = (rut) => {
  const cleanRut = normalizeRut(rut);
  
  // Validate basic format
  if (!/^\d{7,8}[0-9K]$/i.test(cleanRut)) {
    return false;
  }

  // Extract verifier digit and number
  const dv = cleanRut.slice(-1).toUpperCase();
  const number = cleanRut.slice(0, -1);

  // Calculate expected verifier digit
  let sum = 0;
  let multiplier = 2;
  
  for (let i = number.length - 1; i >= 0; i--) {
    sum += parseInt(number.charAt(i)) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  
  const calculatedDV = (11 - (sum % 11)) % 11;
  const expectedDV = calculatedDV === 10 ? 'K' : calculatedDV.toString();
  
  return dv === expectedDV;
};

// Simple endpoint to validate RUT (format only, no PJUD verification)
app.post('/verify-rut', async (req, res) => {
  const { rut } = req.body || {};

  if (!rut) {
    return res.status(400).json({
      valid: false,
      message: 'Se requiere un RUT para la verificación.'
    });
  }

  try {
    const isValid = validateRutDV(rut);
    
    return res.json({
      valid: isValid,
      message: isValid ? 'RUT válido' : 'RUT inválido'
    });
  } catch (error) {
    console.error('Error al validar RUT:', error);
    return res.status(500).json({
      valid: false,
      message: 'Error al validar el RUT',
      error: error.message
    });
  }
});

// Verify lawyer endpoint
app.post('/verify-lawyer', async (req, res) => {
  const { rut, fullName } = req.body || {};

  if (!rut || !fullName) {
    return res.status(400).json({
      verified: false,
      message: 'Se requieren rut y nombre completo para la verificación.'
    });
  }

  try {

    // Format RUT (remove dots and dash, keep only numbers and K)
    const cleanRut = normalizeRut(rut);

    // Validate RUT format
    if (!/^\d{7,8}[0-9K]$/i.test(cleanRut)) {
      return res.status(400).json({
        verified: false,
        message: 'Formato de RUT inválido. Use el formato 12345678-9'
      });
    }

    // Split RUT into body and verifier
    const rutBody = cleanRut.slice(0, -1);
    const rutVerifier = cleanRut.slice(-1);

    // URL of the Poder Judicial AJAX search endpoint
    const searchUrl = 'https://www.pjud.cl/ajax/Lawyers/search';
    
    // Prepare form data for the search
    const formData = new URLSearchParams();
    formData.append('dni', rutBody);
    formData.append('digit', rutVerifier);

    // Submit the search form
    const searchResponse = await axios.post(searchUrl, formData.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html, */*; q=0.01',
        'Accept-Language': 'es-CL,es;q=0.9,en-US;q=0.8,en;q=0.7',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        'Origin': 'https://www.pjud.cl',
        'Referer': 'https://www.pjud.cl/transparencia/busqueda-de-abogados',
      }
    });

    // Parse the results
    const $ = load(searchResponse.data);
    
    // Check for "No results" alert
    if ($('.alert-warning').length > 0 && $('.alert-warning').text().includes('No se encontraron registros')) {
      return res.json({
        verified: false,
        message: 'No se encontró el abogado en los registros',
        details: {
          rut: cleanRut,
          nombre: fullName,
          reason: 'No se encontró en los registros del Poder Judicial'
        }
      });
    }

    // Check for success table
    const resultTable = $('table');
    
    if (resultTable.length === 0) {
      console.warn('PJUD Response unexpected:', searchResponse.data.substring(0, 200));
      return res.status(500).json({
        verified: false,
        message: 'Error al interpretar la respuesta del Poder Judicial',
        details: { requiresHumanVerification: true }
      });
    }

    // Extract data from the result table
    const rows = resultTable.find('tbody tr');
    
    if (rows.length === 0) {
      return res.json({
        verified: false,
        message: 'No se encontraron resultados válidos en la tabla'
      });
    }

    // If we found at least one row, the RUT exists as a lawyer
    const firstRow = rows.first();
    const cols = firstRow.find('td');
    
    // Check for suspension (Sanción Ejecutoriada Permanente)
    const rowText = firstRow.text();
    if (rowText.includes('Ejecutoriada') && rowText.includes('30-12-9999')) {
      return res.json({
        verified: false,
        message: 'El abogado se encuentra suspendido (Sanción Ejecutoriada Permanente). No es posible registrarse.',
        details: {
          rut: cleanRut,
          nombre: cols.length >= 1 ? $(cols[0]).text().trim() : 'No disponible',
          reason: 'Abogado suspendido indefinidamente',
          suspensionType: 'Permanente',
          suspensionDate: '30-12-9999'
        }
      });
    }

    // **Check if RUT is already registered by another user**
    console.log('Checking for duplicate RUT:', cleanRut);
    
    // Query all profiles with RUT to handle different formats
    const { data: allProfiles, error: dbError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, rut, user_id')
      .not('rut', 'is', null);

    if (dbError) {
      console.error('Error checking for duplicate RUT:', dbError);
      // Continue with verification even if DB check fails
    } else if (allProfiles && allProfiles.length > 0) {
      // Normalize and compare RUTs
      const existingProfile = allProfiles.find(profile => {
        if (!profile.rut) return false;
        const normalizedProfileRut = normalizeRut(profile.rut);
        return normalizedProfileRut === cleanRut;
      });

      if (existingProfile) {
        // RUT is already registered
        const existingName = `${existingProfile.first_name || ''} ${existingProfile.last_name || ''}`.trim();
        
        console.log('Duplicate RUT found:', {
          cleanRut,
          existingRut: existingProfile.rut,
          existingName
        });
        
        return res.json({
          verified: false,
          message: `El RUT ${rut} ya está registrado por ${existingName} en nuestra plataforma.`,
          details: {
            rut: cleanRut,
            registeredBy: existingName,
            reason: 'RUT duplicado'
          }
        });
      }
    }
    
    console.log('No duplicate RUT found, proceeding with PJUD verification');

    let lawyerData = {
      rut: cleanRut,
      nombre: cols.length >= 1 ? $(cols[0]).text().trim() : 'No disponible',
      region: cols.length > 2 ? $(cols[2]).text().trim() : '',
      source: 'Poder Judicial de Chile',
      verifiedAt: new Date().toISOString()
    };

    return res.json({
      verified: true,
      message: 'Abogado verificado exitosamente',
      details: lawyerData
    });

  } catch (error) {
    console.error('Error en verificación:', error);
    return res.status(500).json({
      verified: false,
      message: 'Error al realizar la verificación',
      error: error.message
    });
  }
});

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

    // Create MercadoPago preference data
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
    
    // Create preference using the mp client
    const mpResponse = await mp.create({ body: preferenceData });

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

export default app;