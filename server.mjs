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
import { Resend } from 'resend';
import crypto from 'crypto';

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
const appUrl = process.env.VITE_APP_URL || 'https://legalup.cl';
const resendApiKey = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

if (!resend) {
  console.warn('⚠️ RESEND_API_KEY missing. Email features will be disabled.');
}

console.log('App URL:', appUrl);

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

  if (!rut) {
    return res.status(400).json({
      verified: false,
      message: 'Se requiere un RUT para la verificación.'
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

    // Create AbortController for timeout (15 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      // Submit the search form with timeout
      const searchResponse = await axios.post(searchUrl, formData.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html, */*; q=0.01',
          'Accept-Language': 'es-CL,es;q=0.9,en-US;q=0.8,en;q=0.7',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest',
          'Origin': 'https://www.pjud.cl',
          'Referer': 'https://www.pjud.cl/transparencia/busqueda-de-abogados',
        },
        signal: controller.signal,
        timeout: 15000 // Additional timeout for axios
      });
      
      clearTimeout(timeoutId);

      // Parse the results
      const $ = load(searchResponse.data);
      
      // Check for "No results" alert
      if ($('.alert-warning').length > 0 && $('.alert-warning').text().includes('No se encontraron registros')) {
        return res.json({
          verified: false,
          message: 'No se encontró el abogado en los registros',
          details: {
            rut: cleanRut,
            nombre: fullName || 'No proporcionado',
            reason: 'No se encontró en los registros del Poder Judicial'
          }
        });
      }

      // Check for success table
      const resultTable = $('table');
      
      if (resultTable.length === 0) {
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
      
      // Extract nombre from the first column - try multiple methods
      let nombre = 'No disponible';
      if (cols.length >= 1) {
        // Try multiple extraction methods
        // Method 1: Direct text extraction
        nombre = $(cols[0]).text().trim();
        
        // Method 2: If empty, try getting inner HTML and cleaning it
        if (!nombre || nombre === '' || nombre.length < 2) {
          const innerHtml = $(cols[0]).html() || '';
          nombre = innerHtml.replace(/<[^>]*>/g, '').trim();
        }
        
        // Method 3: Try finding text in nested elements
        if (!nombre || nombre === '' || nombre.length < 2) {
          const nestedText = $(cols[0]).find('*').first().text().trim();
          if (nestedText && nestedText.length > 0) {
            nombre = nestedText;
          }
        }
        
        // Clean up any extra whitespace and newlines
        nombre = nombre.replace(/\s+/g, ' ').replace(/\n/g, ' ').trim();
        
        // If still empty or too short, try the entire row text
        if (!nombre || nombre === '' || nombre.length < 2) {
          const rowText = firstRow.text().trim();
          // Try to extract name from row (usually first part before numbers or special chars)
          const nameMatch = rowText.match(/^([A-ZÁÉÍÓÚÑÜ][a-záéíóúñü]+\s+[A-ZÁÉÍÓÚÑÜ][a-záéíóúñü]+(?:\s+[A-ZÁÉÍÓÚÑÜ][a-záéíóúñü]+)*)/);
          if (nameMatch && nameMatch[1]) {
            nombre = nameMatch[1].trim();
          }
        }
      }
      
      // Check for suspension (Sanción Ejecutoriada Permanente)
      const rowText = firstRow.text();
      if (rowText.includes('Ejecutoriada') && rowText.includes('30-12-9999')) {
        return res.json({
          verified: false,
          message: 'El abogado se encuentra suspendido (Sanción Ejecutoriada Permanente). No es posible registrarse.',
          details: {
            rut: cleanRut,
            nombre: nombre,
            reason: 'Abogado suspendido indefinidamente',
            suspensionType: 'Permanente',
            suspensionDate: '30-12-9999'
          }
        });
      }

      // **Check if RUT is already registered by another user**
      // Moved AFTER PJUD verification for better performance
      // Only check if RUT was found in PJUD
      const rutVariations = [
        cleanRut, // 123456789
        `${cleanRut.slice(0, -1)}-${cleanRut.slice(-1)}`, // 12345678-9
        cleanRut.replace(/\B(?=(\d{3})+(?!\d))/g, '.'), // 12.345.6789
        `${cleanRut.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${cleanRut.slice(-1)}` // 12.345.678-9
      ];
      
      // Try to find existing RUT using a more efficient query
      const { data: existingProfiles, error: dbError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, rut, user_id')
        .in('rut', rutVariations)
        .limit(10);

      if (dbError) {
        // Continue with verification even if DB check fails
      } else if (existingProfiles && existingProfiles.length > 0) {
        // Double-check by normalizing RUTs (in case of format variations)
        const existingProfile = existingProfiles.find(profile => {
          if (!profile.rut) return false;
          const normalizedProfileRut = normalizeRut(profile.rut);
          return normalizedProfileRut === cleanRut;
        });

        if (existingProfile) {
          // RUT is already registered
          const existingName = `${existingProfile.first_name || ''} ${existingProfile.last_name || ''}`.trim();
          
          // Format RUT for display (12.345.678-9)
          const formatRutForDisplay = (rut) => {
            const clean = rut.replace(/[^0-9kK]/g, '');
            if (clean.length < 2) return clean;
            
            const body = clean.slice(0, -1);
            const dv = clean.slice(-1);
            
            // Add dots every 3 digits from right to left
            const formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
            return `${formatted}-${dv}`;
          };
          
          const formattedRut = formatRutForDisplay(cleanRut);
          
          return res.json({
            verified: false,
            message: `El RUT ${formattedRut} ya está registrado por ${existingName} en nuestra plataforma.`,
            details: {
              rut: cleanRut,
              formattedRut,
              registeredBy: existingName,
              reason: 'RUT duplicado'
            }
          });
        }
      }

      // Ensure nombre is valid before returning
      if (nombre === 'No disponible' || !nombre || nombre.trim().length < 2) {
        // Try one more time with all columns
        const allColsText = firstRow.find('td').map((i, el) => $(el).text().trim()).get();
        for (const colText of allColsText) {
          // Look for text that looks like a name (starts with capital, has spaces)
          const namePattern = /^[A-ZÁÉÍÓÚÑÜ][a-záéíóúñü]+(?:\s+[A-ZÁÉÍÓÚÑÜ][a-záéíóúñü]+)+/;
          const match = colText.match(namePattern);
          if (match && match[0].length > 5) {
            nombre = match[0].trim();
            break;
          }
        }
      }

      let lawyerData = {
        rut: cleanRut,
        nombre: nombre && nombre !== 'No disponible' ? nombre : 'No disponible',
        nombreCompleto: nombre && nombre !== 'No disponible' ? nombre : 'No disponible',
        region: cols.length > 2 ? $(cols[2]).text().trim() : '',
        source: 'Poder Judicial de Chile',
        verifiedAt: new Date().toISOString()
      };

      return res.json({
        verified: true,
        message: 'Abogado verificado exitosamente',
        details: lawyerData
      });
    } catch (axiosError) {
      clearTimeout(timeoutId);
      
      // Handle timeout specifically
      if (axiosError.code === 'ECONNABORTED' || axiosError.message?.includes('aborted') || axiosError.name === 'AbortError') {
        return res.status(408).json({
          verified: false,
          message: 'La verificación tardó demasiado. Por favor, inténtalo de nuevo.',
          error: 'timeout'
        });
      }
      
      // Re-throw to be caught by outer catch
      throw axiosError;
    }
  } catch (error) {
    // Handle timeout errors specifically
    if (error.message && (error.message.includes('Timeout') || error.message.includes('timeout'))) {
      return res.status(408).json({
        verified: false,
        message: 'La verificación tardó demasiado. Por favor, inténtalo de nuevo.',
        error: 'timeout'
      });
    }
    
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

// ============================================
// BOOKINGS ENDPOINTS
// ============================================

// Create booking endpoint - NO AUTHENTICATION REQUIRED
app.post('/api/bookings/create', async (req, res) => {
  try {
    const {
      lawyer_id,
      user_email,
      user_name,
      scheduled_date,
      scheduled_time,
      duration,
      price
    } = req.body;

    // Validate required fields
    if (!lawyer_id || !user_email || !user_name || !scheduled_date || !scheduled_time || !duration || !price) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['lawyer_id', 'user_email', 'user_name', 'scheduled_date', 'scheduled_time', 'duration', 'price']
      });
    }

    // Validate duration
    // Validate duration
    if (![30, 60, 90, 120].includes(duration)) {
      return res.status(400).json({ error: 'Duration must be 30, 60, 90 or 120 minutes' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(user_email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if lawyer exists
    const { data: lawyer, error: lawyerError } = await supabase
      .from('profiles')
      .select('user_id, first_name, last_name')
      .eq('user_id', lawyer_id)
      .eq('role', 'lawyer')
      .single();

    if (lawyerError || !lawyer) {
      return res.status(404).json({ error: 'Lawyer not found' });
    }

    // TODO: Check lawyer availability for the selected time slot
    // This would require querying the lawyer's calendar/bookings

    // Create booking record
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        lawyer_id,
        user_email,
        user_name,
        scheduled_date,
        scheduled_time,
        duration,
        price,
        status: 'pending'
      })
      .select()
      .single();

    if (bookingError) {
      console.error('Error creating booking:', bookingError);
      return res.status(500).json({ error: 'Failed to create booking' });
    }

    // Create MercadoPago preference
    const preferenceData = {
      items: [{
        id: booking.id,
        title: `Asesoría Legal - ${lawyer.first_name} ${lawyer.last_name}`,
        description: `Asesoría legal de ${duration} minutos`,
        category_id: 'services',
        quantity: 1,
        unit_price: price
      }],
      payer: {
        name: user_name,
        email: user_email
      },
      back_urls: {
        success: `${appUrl}/booking/success?booking_id=${booking.id}`,
        failure: `${appUrl}/booking/failure?booking_id=${booking.id}`,
        pending: `${appUrl}/booking/pending?booking_id=${booking.id}`
      },
      auto_return: 'approved',
      external_reference: booking.id,
      metadata: {
        booking_id: booking.id,
        lawyer_id,
        user_email,
        user_name,
        duration,
        scheduled_date,
        scheduled_time
      },
      statement_descriptor: 'LEGALUP',
      notification_url: process.env.VITE_MERCADOPAGO_WEBHOOK_URL
    };

    // Create preference using MercadoPago API
    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.VITE_MERCADOPAGO_ACCESS_TOKEN}`
      },
      body: JSON.stringify(preferenceData)
    });

    if (!mpResponse.ok) {
      const errorData = await mpResponse.json();
      console.error('MercadoPago API error:', errorData);
      throw new Error('Failed to create MercadoPago preference');
    }

    const mpData = await mpResponse.json();

    // Update booking with MercadoPago preference ID
    await supabase
      .from('bookings')
      .update({ 
        mercadopago_preference_id: mpData.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', booking.id);

    // Return booking and payment link
    const paymentLink = mpData.init_point || mpData.sandbox_init_point;

    res.json({
      success: true,
      booking_id: booking.id,
      payment_link: paymentLink,
      message: 'Booking created successfully'
    });

  } catch (error) {
    console.error('Error in /api/bookings/create:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});

// Get booking by ID - PUBLIC endpoint for success page
app.get('/api/bookings/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;

    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        *,
        lawyer:profiles!bookings_lawyer_id_fkey(
          user_id,
          first_name,
          last_name,
          specialties,
          profile_picture_url
        )
      `)
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json({ booking });
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// MERCADOPAGO OAUTH ENDPOINTS
// ============================================

// OAuth callback endpoint - receives authorization code from MercadoPago
app.get('/api/mercadopago/oauth/callback', async (req, res) => {
  try {
    const { code, state, error: oauthError } = req.query;

    // Handle OAuth errors
    if (oauthError) {
      const frontendUrl = process.env.VITE_APP_URL || 'https://legalup.cl';
      return res.redirect(`${frontendUrl}/lawyer/earnings?mp_error=${oauthError}`);
    }

    if (!code) {
      const frontendUrl = process.env.VITE_APP_URL || 'https://legalup.cl';
      return res.redirect(`${frontendUrl}/lawyer/earnings?mp_error=no_code`);
    }

    // Build redirect_uri - MUST match exactly what was used in the authorization request
    const backendUrl = process.env.VITE_API_BASE_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:3001';
    const redirectUri = `${backendUrl}/api/mercadopago/oauth/callback`;

    // Exchange code for access token
    const tokenResponse = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.VITE_MERCADOPAGO_CLIENT_ID,
        client_secret: process.env.VITE_MERCADOPAGO_CLIENT_SECRET,
        code: code,
        redirect_uri: redirectUri
      })
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      const frontendUrl = process.env.VITE_APP_URL || 'https://legalup.cl';
      return res.redirect(`${frontendUrl}/lawyer/earnings?mp_error=token_exchange_failed`);
    }

    const tokenData = await tokenResponse.json();

    // Get user info from MercadoPago
    const userResponse = await fetch('https://api.mercadopago.com/users/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });

    if (!userResponse.ok) {
      const frontendUrl = process.env.VITE_APP_URL || 'https://legalup.cl';
      return res.redirect(`${frontendUrl}/lawyer/earnings?mp_error=user_fetch_failed`);
    }

    const userData = await userResponse.json();

    // Calculate token expiration
    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));

    // Get the user_id from the state parameter (if provided) or try to get from session
    // For now, we'll need the frontend to save it, but we can also try to get it from a session
    // Since we don't have session info here, we'll redirect with the data and let frontend save it
    
    // However, we can also save it directly if we have a way to identify the user
    // For security, we'll still redirect with the data but also try to save it server-side if possible
    
    // Redirect to frontend with OAuth data
    const frontendUrl = process.env.VITE_APP_URL || 'https://legalup.cl';
    const redirectUrl = new URL(`${frontendUrl}/lawyer/earnings`);
    redirectUrl.searchParams.append('mp_success', 'true');
    redirectUrl.searchParams.append('mp_user_id', tokenData.user_id);
    redirectUrl.searchParams.append('mp_email', userData.email || '');
    redirectUrl.searchParams.append('mp_nickname', userData.nickname || '');
    
    // Store tokens temporarily in a secure way (you might want to use sessions instead)
    // For now, we'll pass them to the frontend to complete the connection
    redirectUrl.searchParams.append('mp_access_token', tokenData.access_token);
    redirectUrl.searchParams.append('mp_refresh_token', tokenData.refresh_token || '');
    redirectUrl.searchParams.append('mp_public_key', tokenData.public_key || '');
    redirectUrl.searchParams.append('mp_expires_at', expiresAt.toISOString());

    res.redirect(redirectUrl.toString());

  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect(`${process.env.VITE_APP_URL}/lawyer/earnings?mp_error=server_error`);
  }
});

// Save MercadoPago account - called by frontend after OAuth callback
app.post('/api/mercadopago/save-account', async (req, res) => {
  try {
    const {
      userId,
      mercadopagoUserId,
      accessToken,
      refreshToken,
      publicKey,
      email,
      nickname,
      firstName,
      lastName,
      expiresAt
    } = req.body;

    if (!userId || !mercadopagoUserId || !accessToken) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Upsert the account
    const { data, error } = await supabase
      .from('mercadopago_accounts')
      .upsert({
        user_id: userId,
        mercadopago_user_id: mercadopagoUserId,
        access_token: accessToken,
        refresh_token: refreshToken,
        public_key: publicKey,
        email: email,
        nickname: nickname,
        first_name: firstName,
        last_name: lastName,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString() // Ensure created_at is set on first insert
      }, {
        onConflict: 'user_id'
      })
      .select('id, mercadopago_user_id, email, nickname, first_name, last_name, expires_at, created_at')
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to save account' });
    }

    res.json({ success: true, account: data });

  } catch (error) {
    console.error('Save account error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get MercadoPago account for a user
app.get('/api/mercadopago/account/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from('mercadopago_accounts')
      .select('id, mercadopago_user_id, email, nickname, first_name, last_name, expires_at, created_at')
      .eq('user_id', userId)
      .single();

    if (!error && data) {
      return res.json({ connected: true, account: data });
    }

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('mercado_pago_connected, mercado_pago_email, mercado_pago_nickname, mercado_pago_connected_at, mercado_pago_user_id, first_name, last_name')
      .eq('id', userId)
      .single();

    if (profileError) {
      if (profileError.code === 'PGRST116') {
        return res.json({ connected: false });
      }
      throw profileError;
    }

    if (!profile?.mercado_pago_connected) {
      return res.json({ connected: false });
    }

    const accountFromProfile = {
      id: profile.mercado_pago_user_id ? profile.mercado_pago_user_id.toString() : `profile-${userId}`,
      mercadopago_user_id: profile.mercado_pago_user_id,
      email: profile.mercado_pago_email || '',
      nickname: profile.mercado_pago_nickname || '',
      first_name: profile.first_name || '',
      last_name: profile.last_name || '',
      expires_at: profile.mercado_pago_connected_at || null,
      created_at: profile.mercado_pago_connected_at || null,
    };

    return res.json({ connected: true, account: accountFromProfile });

  } catch (error) {
    console.error('Get account error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Disconnect MercadoPago account
app.delete('/api/mercadopago/disconnect/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const { error } = await supabase
      .from('mercadopago_accounts')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error disconnecting account:', error);
      return res.status(500).json({ error: 'Failed to disconnect account' });
    }

    res.json({ success: true });

  } catch (error) {
    console.error('Disconnect error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// MercadoPago Webhook
app.post('/api/mercadopago/webhook', async (req, res) => {
  try {
    const { type, data } = req.body;
    const topic = req.body.topic || type;
    const id = req.body.id || data?.id;

    console.log(`Received webhook: ${topic} ${id}`);

    if (topic === 'payment') {
      const payment = await new Payment(mpClient).get({ id });
      
      if (payment.status === 'approved') {
        const bookingId = payment.external_reference;
        console.log(`Payment approved for booking ${bookingId}`);
        
        // 1. Update booking status
        const { data: booking, error: bookingError } = await supabase
          .from('bookings')
          .update({ 
            status: 'confirmed', 
            payment_id: payment.id.toString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', bookingId)
          .select()
          .single();

        if (bookingError) {
          console.error('Error updating booking:', bookingError);
        }

        if (booking) {
          const userEmail = (booking.user_email || '').trim().toLowerCase();
          const userName = booking.user_name?.trim() || (userEmail ? userEmail.split('@')[0] : 'Cliente LegalUp');
          const [firstName, ...restName] = userName.split(' ').filter(Boolean);
          const lastName = restName.length > 0 ? restName.join(' ') : '';

          let userId = null;

          if (userEmail) {
            // 2. Check if user exists in auth.users
            try {
              const { data: authUser, error: authLookupError } = await supabase.auth.admin.getUserByEmail(userEmail);
              if (authLookupError && authLookupError.message !== 'User not found') {
                console.error('Error looking up user by email:', authLookupError);
              }
              if (authUser?.user) {
                userId = authUser.user.id;
              }
            } catch (lookupError) {
              console.error('Exception checking existing user:', lookupError);
            }
          }

          // 3. Create user if not exists
          if (!userId && userEmail) {
            console.log(`Creating new user for ${userEmail}`);
            const tempPassword = crypto.randomBytes(9).toString('hex');

            const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
              email: userEmail,
              password: tempPassword,
              email_confirm: true,
              user_metadata: {
                first_name: firstName || userName,
                last_name,
                full_name: userName,
                role: 'client',
                signup_method: 'booking'
              }
            });

            if (createError) {
              console.error('Error creating user:', createError);
            } else if (newUser?.user?.id) {
              userId = newUser.user.id;
            }
          }

          // 4. Ensure profile exists and is up to date
          if (userId && userEmail) {
            try {
              const { data: existingProfile, error: profileLookupError } = await supabase
                .from('profiles')
                .select('user_id')
                .eq('user_id', userId)
                .maybeSingle();

              if (profileLookupError) {
                console.error('Error querying profile:', profileLookupError);
              }

              const baseProfile = {
                email: userEmail,
                first_name: firstName || null,
                last_name: lastName || null,
                display_name: userName,
                role: 'client',
                updated_at: new Date().toISOString(),
              };

              if (existingProfile) {
                const { error: updateProfileError } = await supabase
                  .from('profiles')
                  .update(baseProfile)
                  .eq('user_id', userId);

                if (updateProfileError) {
                  console.error('Error updating profile:', updateProfileError);
                }
              } else {
                const { error: insertProfileError } = await supabase
                  .from('profiles')
                  .insert({
                    ...baseProfile,
                    id: userId,
                    user_id: userId,
                    created_at: new Date().toISOString(),
                    has_used_free_consultation: false,
                  });

                if (insertProfileError) {
                  console.error('Error inserting profile:', insertProfileError);
                }
              }
            } catch (profileError) {
              console.error('Exception ensuring profile:', profileError);
            }
          }

          // 5. Associate booking with user and normalize stored contact data
          if (userId && userEmail) {
            await supabase
              .from('bookings')
              .update({
                user_id: userId,
                user_email: userEmail,
                user_name: userName,
              })
              .eq('id', bookingId);
          }

          // Fetch lawyer email to send notification
          let lawyerEmail = '';
          try {
            const { data: lawyerUser, error: lawyerError } = await supabase.auth.admin.getUserById(booking.lawyer_id);
            if (lawyerUser?.user) {
              lawyerEmail = lawyerUser.user.email;
            } else {
               console.error('Could not find lawyer user for email notification', lawyerError);
            }
          } catch (e) {
            console.error('Error fetching lawyer email:', e);
          }

          // Generate Magic Link for user auto-login
          let magicLink = `${appUrl}/login`;
          if (userEmail) {
            try {
              const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
                type: 'magiclink',
                email: userEmail,
                options: {
                  redirectTo: `${appUrl}/dashboard/appointments`
                }
              });
              
              if (linkData?.properties?.action_link) {
                magicLink = linkData.properties.action_link;
              } else if (linkError) {
                  console.error('Error generating magic link:', linkError);
              }
            } catch (e) {
              console.error('Error generating magic link exception:', e);
            }
          }

          // Send confirmation email to Client
          if (resend) {
            try {
            await resend.emails.send({
              from: 'LegalUp <hola@legalup.cl>',
              to: userEmail,
              subject: '¡Tu asesoría está confirmada!',
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                  <h1 style="color: #2563eb;">¡Reserva Confirmada!</h1>
                  <p>Hola <strong>${userName || 'Usuario'}</strong>,</p>
                  <p>Tu asesoría ha sido confirmada exitosamente.</p>
                  
                  <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Abogado:</strong> Consultar en plataforma</p>
                    <p style="margin: 5px 0;"><strong>Fecha:</strong> ${booking.date}</p>
                    <p style="margin: 5px 0;"><strong>Hora:</strong> ${booking.time}</p>
                    <p style="margin: 5px 0;"><strong>Duración:</strong> ${booking.duration} min</p>
                  </div>

                  <p>Hemos creado una cuenta para ti (o actualizado la existente) para que puedas gestionar tu cita.</p>

                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${magicLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                      Ingresar a mi cuenta y ver detalles
                    </a>
                  </div>

                  <p style="font-size: 12px; color: #6b7280; margin-top: 20px;">
                    Si el botón no funciona, copia y pega este enlace: ${magicLink}
                  </p>
                </div>
              `
            });
            console.log('Confirmation email sent to user:', userEmail);
            } catch (emailError) {
               console.error('Error sending user email:', emailError);
            }
          } else {
            console.log('Skipping client email: Resend not configured');
          }

          // Send notification email to Lawyer
          if (lawyerEmail && resend) {
            try {
              await resend.emails.send({
                from: 'LegalUp <hola@legalup.cl>',
                to: lawyerEmail,
                subject: 'Nueva reserva confirmada',
                html: `
                  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #2563eb;">¡Nueva Reserva!</h1>
                    <p>Has recibido una nueva reserva confirmada.</p>
                    
                    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                      <p style="margin: 5px 0;"><strong>Cliente:</strong> ${userName}</p>
                      <p style="margin: 5px 0;"><strong>Email:</strong> ${userEmail}</p>
                      <p style="margin: 5px 0;"><strong>Fecha:</strong> ${booking.date}</p>
                      <p style="margin: 5px 0;"><strong>Hora:</strong> ${booking.time}</p>
                      <p style="margin: 5px 0;"><strong>Duración:</strong> ${booking.duration} min</p>
                    </div>

                    <p>Ingresa a tu panel para ver más detalles.</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${appUrl}/dashboard/appointments" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                        Ir a mis citas
                      </a>
                    </div>
                  </div>
                `
              });
              console.log('Notification email sent to lawyer:', lawyerEmail);
            } catch (emailError) {
               console.error('Error sending lawyer email:', emailError);
            }
          }
        }
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
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