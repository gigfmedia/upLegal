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
import cookieParser from 'cookie-parser';

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
const mercadoPagoWebhookUrl =
  process.env.MERCADOPAGO_WEBHOOK_URL ||
  process.env.VITE_MERCADOPAGO_WEBHOOK_URL ||
  '';
const resendApiKey = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

if (!resend) {
  console.warn('⚠️ RESEND_API_KEY is not configured. Emails will NOT be sent.');
}

if (!mercadoPagoWebhookUrl) {
  console.warn('⚠️ MERCADOPAGO_WEBHOOK_URL is not configured. MercadoPago webhooks will NOT be received, and bookings may remain pending.');
}

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

// DEBUG: Check if Service Role Key is actually a service role key
try {
  const [, payload] = serviceRoleKey.split('.');
  const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
  if (decoded.role !== 'service_role') {
    console.error('❌ CRITICAL: The key provided as VITE_SUPABASE_SERVICE_ROLE_KEY is NOT a service_role key! It is:', decoded.role);
  }
} catch (e) {
  console.error('⚠️ Could not parse Supabase Key:', e.message);
}

// Configure MercadoPago
const mpClient = new MercadoPagoConfig({
  accessToken: process.env.VITE_MERCADOPAGO_ACCESS_TOKEN,
  options: { timeout: 5000 }
});

// Create API client instance
const mp = new Payment({ client: mpClient });

// Initialize Express app
const app = express();
app.set('trust proxy', 1); // Trust first proxy (Render/Heroku load balancer) for secure cookies

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
app.use(cookieParser());

// Health check para mantener Render despierto
app.get('/health', (req, res) => {
  res.json({ ok: true, timestamp: Date.now() });
});

// Helper to normalize strings safely
const safeTrim = (value) => {
  if (typeof value !== 'string') return value ?? null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

// Constants
const DEFAULT_CLIENT_SURCHARGE_PERCENT = 0.1;
const DEFAULT_PLATFORM_FEE_PERCENT = 0.2;
const DEFAULT_CURRENCY = 'CLP';

const normalizeRut = (rut = '') => rut.replace(/\./g, '').replace(/-/g, '').toUpperCase();

// Profile management endpoint used during signup to ensure profiles are created
app.post('/api/profiles', async (req, res) => {
  try {
    const {
      userId,
      email,
      firstName,
      lastName,
      role,
      rut,
      pjudVerified,
      displayName
    } = req.body || {};

    if (!userId || !email || !role) {
      return res.status(400).json({
        error: 'Missing required fields: userId, email and role.'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedFirstName = safeTrim(firstName);
    const normalizedLastName = safeTrim(lastName);
    const computedDisplayName = safeTrim(displayName) ||
      [normalizedFirstName, normalizedLastName].filter(Boolean).join(' ') ||
      normalizedEmail.split('@')[0];

    const timestamp = new Date().toISOString();

    const payload = {
      id: userId,
      user_id: userId,
      email: normalizedEmail,
      first_name: normalizedFirstName,
      last_name: normalizedLastName,
      display_name: computedDisplayName,
      role,
      rut: safeTrim(rut) || null,
      pjud_verified: Boolean(pjudVerified),
      has_used_free_consultation: false,
      updated_at: timestamp,
      created_at: timestamp
    };

    const { data, error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .maybeSingle();

    if (error) {
      console.error('Error upserting profile from service:', error);
      return res.status(500).json({
        error: 'No se pudo guardar el perfil del usuario.'
      });
    }

    return res.json({ success: true, profile: data || payload });
  } catch (error) {
    console.error('Unexpected error in /api/profiles:', error);
    return res.status(500).json({
      error: 'Error inesperado al crear el perfil.'
    });
  }
});

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
          message: 'No se encontró el abogado en los registros del Poder Judicial',
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
    if ((!amount && !originalAmount) || !appointmentId) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['amount or originalAmount', 'appointmentId'],
        received: { amount, originalAmount, appointmentId }
      });
    }

    // Handle guest users and general consultations
    let actualUserId = userId;
    let actualLawyerId = lawyerId;

    // Create or get system user for guest consultations
    if (!userId || userId === 'guest') {
      const guestEmail = userEmail || `guest-${Date.now()}@legalup.cl`;
      const { data: existingUser } = await supabase.auth.admin.listUsers();
      const foundUser = existingUser?.users?.find(u => u.email === guestEmail);
      
      if (foundUser) {
        actualUserId = foundUser.id;
      } else {
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: guestEmail,
          email_confirm: true,
          user_metadata: { first_name: userName || 'Cliente', last_name: 'Invitado', role: 'client' }
        });
        if (createError) {
          console.error('Error creating guest user:', createError);
          return res.status(500).json({ error: 'Failed to create guest user' });
        }
        actualUserId = newUser.user.id;
      }
    }

    // Handle general consultation lawyer
    if (!lawyerId || lawyerId === 'consulta-general') {
      const systemEmail = 'sistema@legalup.cl';
      const { data: existingLawyer } = await supabase.auth.admin.listUsers();
      const foundLawyer = existingLawyer?.users?.find(u => u.email === systemEmail);
      
      if (foundLawyer) {
        actualLawyerId = foundLawyer.id;
      } else {
        const { data: newLawyer, error: createError } = await supabase.auth.admin.createUser({
          email: systemEmail,
          email_confirm: true,
          user_metadata: { first_name: 'Sistema', last_name: 'LegalUp', role: 'lawyer' }
        });
        if (createError) {
          console.error('Error creating system lawyer:', createError);
          return res.status(500).json({ error: 'Failed to create system lawyer' });
        }
        actualLawyerId = newLawyer.user.id;
      }
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
    // Fetch settings safely
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
      console.warn('Could not fetch platform settings (using defaults):', settingsError.message);
    }
    
    /* HARDCODED SETTINGS REMOVED - Logic Restored */

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
      amount: derivedOriginalAmount,  // Must equal platform_fee + lawyer_amount per DB constraint
      original_amount: derivedOriginalAmount,
      client_surcharge: clientSurcharge,
      client_surcharge_percent: clientSurchargePercent,
      platform_fee_percent: platformFeePercent,
      lawyer_amount: lawyerAmount,
      platform_fee: platformFee,
      currency,
      status: 'pending',
      user_id: actualUserId,
      lawyer_id: actualLawyerId,
      // service_id removed as it does not exist in current DB schema
      metadata: {  // Store additional data in metadata JSON field
        description: description || 'Consulta Legal',
      appointment_id: appointmentId,
        client_total: clientAmount,  // Actual amount client pays (with surcharge)
        payment_gateway_id: null
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Insert payment into database using SECURE RPC (Bypasses RLS)
    let payment;
    
    try {
      const { data, error } = await supabase.rpc('create_payment_secure', {
        p_id: paymentData.id,
        p_amount: paymentData.amount,
        p_original_amount: paymentData.original_amount,
        p_client_surcharge: paymentData.client_surcharge,
        p_client_surcharge_percent: paymentData.client_surcharge_percent,
        p_platform_fee_percent: paymentData.platform_fee_percent,
        p_lawyer_amount: paymentData.lawyer_amount,
        p_platform_fee: paymentData.platform_fee,
        p_currency: paymentData.currency,
        p_status: paymentData.status,
        p_user_id: paymentData.user_id,
        p_lawyer_id: paymentData.lawyer_id,
        p_metadata: paymentData.metadata,
        p_created_at: paymentData.created_at,
        p_updated_at: paymentData.updated_at
      });

      if (error) {
        console.error('❌ Supabase RPC INSERT Error:', JSON.stringify(error, null, 2));
        throw error;
      }
      
      // Data from RPC might come differently depending on return type, handling jsonb
      payment = data; 
    } catch (insertError) {
      console.error('❌ Exception during RPC INSERT:', insertError);
      throw insertError;
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
    
    // Create preference using raw fetch to bypass any SDK potential issues
    const mpAccessToken = process.env.VITE_MERCADOPAGO_ACCESS_TOKEN || '';
    
    // DEBUG: Check if token looks like Supabase (JWT starts with eyJ)
    const isJwt = mpAccessToken.startsWith('eyJ');
    
    if (isJwt) {
        console.error('CRITICAL CONFIG ERROR: VITE_MERCADOPAGO_ACCESS_TOKEN appears to be a Supabase Key (JWT)!');
        throw new Error('Server Config Error: MercadoPago Token is invalid');
    }
    
    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mpAccessToken}`
        },
        body: JSON.stringify(preferenceData)
    });

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
        console.error('--- DEBUG: RAW FETCH FAILED ---', mpData);
        throw new Error(`MercadoPago API Error: ${mpResponse.status} - ${JSON.stringify(mpData)}`);
    }

    // Return the payment link
    const paymentLink = mpData.init_point || mpData.sandbox_init_point;
    
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

    // Prevent double-booking: block if slot overlaps an existing booking (pending or confirmed)
    try {
      const { data: existingBookings, error: existingError } = await supabase
        .from('bookings')
        .select('id, scheduled_time, duration, status')
        .eq('lawyer_id', lawyer_id)
        .eq('scheduled_date', scheduled_date)
        .in('status', ['pending', 'confirmed']);

      if (existingError) {
        console.error('Error checking existing bookings:', existingError);
      } else if (existingBookings && existingBookings.length > 0) {
        const parseTimeToMinutes = (timeStr = '') => {
          const [hh, mm] = String(timeStr).slice(0, 5).split(':').map(Number);
          if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
          return hh * 60 + mm;
        };

        const reqStart = parseTimeToMinutes(scheduled_time);
        const reqDur = Number(duration);
        const reqEnd = reqStart == null ? null : reqStart + reqDur;

        if (reqStart != null && reqEnd != null) {
          const overlaps = existingBookings.some((b) => {
            const bStart = parseTimeToMinutes(b.scheduled_time);
            const bDur = Number(b.duration) || 0;
            const bEnd = bStart == null ? null : bStart + bDur;
            if (bStart == null || bEnd == null) return false;
            return reqStart < bEnd && reqEnd > bStart;
          });

          if (overlaps) {
            return res.status(409).json({
              error: 'Time slot not available',
              message: 'Este horario ya está reservado. Por favor elige otro.'
            });
          }
        }
      }
    } catch (e) {
      console.error('Exception checking booking overlap:', e);
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

    // Track payment start for analytics
    try {
      await supabase.from('payment_events').insert({
        event_type: 'started',
        amount: price,
        status: 'processing',
        metadata: {
          booking_id: booking.id,
          lawyer_id,
          source: 'booking_create'
        },
        user_id: null, // User not logged in yet
      });
      console.log('[analytics] payment started tracked', { bookingId: booking.id });
    } catch (trackingError) {
      console.error('Failed to track payment start:', trackingError);
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
      ...(mercadoPagoWebhookUrl ? { notification_url: mercadoPagoWebhookUrl } : {})
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

// ============================================
// MERCADOPAGO OAUTH PKCE HELPERS
// ============================================
function base64URLEncode(str) {
    return str.toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

function sha256(buffer) {
    return crypto.createHash('sha256').update(buffer).digest();
}

function generateCodeVerifier() {
    return base64URLEncode(crypto.randomBytes(32));
}

function generateCodeChallenge(verifier) {
    return base64URLEncode(sha256(verifier));
}

// OAuth callback endpoint - receives authorization code from MercadoPago
app.get('/api/mercadopago/auth-url', async (req, res) => {
    try {
        const verifier = generateCodeVerifier();
        const challenge = generateCodeChallenge(verifier);
        const state = crypto.randomUUID(); // Generate secure state
        
        const backendUrl = process.env.VITE_API_BASE_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:3001';
        const redirectUri = `${backendUrl}/api/mercadopago/oauth/callback`;
        const clientId = process.env.VITE_MERCADOPAGO_CLIENT_ID;

        // Store verifier in DB (Cookies fail on Render due to cross-site issues)
        const { error: dbError } = await supabase
            .from('auth_states')
            .insert({ state, code_verifier: verifier });

        if (dbError) {
            console.error('Failed to store PKCE state:', dbError);
            // Fallback for dev? No, strictly require DB for production stability
            return res.status(500).json({ error: 'Failed to initialize secure session' });
        }

        // Build Auth URL
        const authUrl = new URL('https://auth.mercadopago.com/authorization');
        authUrl.searchParams.append('client_id', clientId);
        authUrl.searchParams.append('response_type', 'code');
        authUrl.searchParams.append('platform_id', 'mp');
        authUrl.searchParams.append('state', state); // Valid state from DB
        authUrl.searchParams.append('redirect_uri', redirectUri);
        authUrl.searchParams.append('code_challenge', challenge);
        authUrl.searchParams.append('code_challenge_method', 'S256');

        res.json({ url: authUrl.toString() });

    } catch (error) {
        console.error('Error generating Auth URL:', error);
        res.status(500).json({ error: 'Failed to generate auth url' });
    }
});

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

    // Backend-Initiated: Retrieve verifier from TABLE using state
    let codeVerifier = null;
    
    if (state) {
        const { data: authState, error: stateError } = await supabase
            .from('auth_states')
            .select('code_verifier')
            .eq('state', state)
            .maybeSingle();

        if (authState) {
            codeVerifier = authState.code_verifier;
            // Cleanup: delete used state
            await supabase.from('auth_states').delete().eq('state', state);
        } else {
            console.warn('PKCE State not found in DB:', state);
        }
    }

    if (!codeVerifier) {
         console.warn('WARNING: code_verifier is missing. Link might have expired or state is invalid.');
    }

    // Build redirect_uri - MUST match exactly what was used in the authorization request
    const backendUrl = process.env.VITE_API_BASE_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:3001';
    const redirectUri = `${backendUrl}/api/mercadopago/oauth/callback`;
    
    // Exchange code for access token
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.VITE_MERCADOPAGO_CLIENT_ID,
      client_secret: process.env.VITE_MERCADOPAGO_CLIENT_SECRET,
      code: code,
      redirect_uri: redirectUri,
    });

    
    // Add verifier if present
    if (codeVerifier) {
        params.append('code_verifier', codeVerifier);
    }



    // Exchange code for access token
    const tokenResponse = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: params
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('MercadoPago Token Exchange Error:', errorText);
      
      let errorDetail = 'token_exchange_failed';
      try {
        const errorJson = JSON.parse(errorText);
        errorDetail = errorJson.message || errorJson.error_description || errorJson.error || 'token_exchange_failed';
      } catch (e) {
        // use default or truncated text
        errorDetail = errorText.substring(0, 100);
      }
      
      const frontendUrl = process.env.VITE_APP_URL || 'https://legalup.cl';
      return res.redirect(`${frontendUrl}/lawyer/earnings?mp_error=token_exchange_failed&details=${encodeURIComponent(errorDetail)}`);
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
      console.error('Error upserting mercadopago_accounts:', error);
      return res.status(500).json({ error: 'Failed to save account' });
    }

    // SYNC TO PROFILES: Also update the profiles table to keep it in sync
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        mercado_pago_connected: true,
        mercado_pago_user_id: mercadopagoUserId,
        mercado_pago_email: email,
        mercado_pago_nickname: nickname,
        mercado_pago_connected_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (profileError) {
      console.warn('Warning: Failed to sync MercadoPago status to profiles table:', profileError);
      // We don't fail the request here because the main account table was updated, but it's worth logging
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

    // SYNC TO PROFILES: Update profiles table to reflect disconnection
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        mercado_pago_connected: false,
        mercado_pago_connected_at: null,
        mercado_pago_user_id: null,
        mercado_pago_email: null,
        mercado_pago_nickname: null
      })
      .eq('id', userId);

    if (profileError) {
       console.warn('Warning: Failed to sync disconnection to profiles table:', profileError);
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

    const handleApprovedPayment = async (payment) => {
        const bookingId = payment.external_reference;
        
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

      if (!booking) {
        console.warn('[mp] approved payment but booking not found', {
          paymentId: payment.id,
          external_reference: bookingId,
        });
        return;
      }

          const userEmail = (booking.user_email || '').trim().toLowerCase();
          const userName = booking.user_name?.trim() || (userEmail ? userEmail.split('@')[0] : 'Cliente LegalUp');
          const [firstName, ...restName] = userName.split(' ').filter(Boolean);
          const lastName = restName.length > 0 ? restName.join(' ') : '';

          let userId = null;

      // Check if user already exists in auth.users
          if (userEmail) {
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

      // Track payment event for analytics (after checking for existing user)
      try {
        const { data: paymentEvent, error: insertError } = await supabase.from('payment_events').insert({
          event_type: 'success',
          amount: payment.transaction_amount,
          status: 'completed',
          metadata: {
            payment_id: payment.id,
            booking_id: bookingId,
            source: 'webhook',
            user_email: userEmail || null
          },
          user_id: userId || null,
        }).select().single();

        if (insertError) {
          console.error('Failed to track payment event:', insertError);
        } else {
          console.log('[analytics] payment event tracked', { 
            paymentId: payment.id, 
            bookingId,
            userId: userId || 'null',
            eventId: paymentEvent?.id 
          });
        }
      } catch (trackingError) {
        console.error('Failed to track payment event:', trackingError);
      }

          // 3. Create user if not exists
      if (userEmail && !userId) {
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

            // Update payment event with user_id if it was null
            try {
              await supabase
                .from('payment_events')
                .update({ user_id: userId })
                .eq('metadata->>booking_id', bookingId)
                .is('user_id', null);
              console.log('[analytics] Updated payment event with user_id', { bookingId, userId });
            } catch (updateError) {
              console.error('Failed to update payment event with user_id:', updateError);
            }
          }

      // 6. Ensure appointment exists for lawyer dashboard
      if (userId) {
        try {
          const { data: existingAppointment, error: existingAppointmentError } = await supabase
            .from('appointments')
            .select('id')
            .eq('lawyer_id', booking.lawyer_id)
            .eq('user_id', userId)
            .eq('appointment_date', booking.scheduled_date)
            .eq('appointment_time', booking.scheduled_time)
            .maybeSingle();

          if (existingAppointmentError) {
            console.error('Error checking existing appointment:', existingAppointmentError);
          }

          if (!existingAppointment) {
            const { error: insertAppointmentError } = await supabase
              .from('appointments')
              .insert({
                lawyer_id: booking.lawyer_id,
                user_id: userId,
                email: userEmail,
                name: userName,
                appointment_date: booking.scheduled_date,
                appointment_time: booking.scheduled_time,
                duration: booking.duration,
                price: booking.price,
                status: 'confirmed',
                consultation_type: 'paid',
                contact_method: 'platform',
                currency: 'CLP',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              });

            if (insertAppointmentError) {
              console.error('Error inserting appointment:', insertAppointmentError);
            } else {
              console.log('[booking->appointment] appointment created', {
                bookingId,
                lawyerId: booking.lawyer_id,
                userId,
                appointment_date: booking.scheduled_date,
                appointment_time: booking.scheduled_time,
              });
            }
          }
        } catch (appointmentError) {
          console.error('Exception ensuring appointment:', appointmentError);
        }
      }

          // Fetch lawyer email to send notification
          let lawyerEmail = '';
          try {
            const { data: lawyerUser, error: lawyerError } = await supabase.auth.admin.getUserById(booking.lawyer_id);
            if (lawyerUser?.user) {
          lawyerEmail = (lawyerUser.user.email || '').trim().toLowerCase();
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
          const userEmailResponse = await resend.emails.send({
            from: 'LegalUp <hola@mg.legalup.cl>',
              to: userEmail,
              subject: '¡Tu asesoría está confirmada!',
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                  <h1 style="color: #2563eb;">¡Reserva Confirmada!</h1>
                  <p>Hola <strong>${userName || 'Usuario'}</strong>,</p>
                  <p>Tu asesoría ha sido confirmada exitosamente.</p>
                  
                  <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Abogado:</strong> Consultar en plataforma</p>
                    <p style="margin: 5px 0;"><strong>Fecha:</strong> ${booking.scheduled_date || booking.date || ''}</p>
                    <p style="margin: 5px 0;"><strong>Hora:</strong> ${booking.scheduled_time || booking.time || ''}</p>
                    <p style="margin: 5px 0;"><strong>Duración:</strong> ${booking.duration || ''} min</p>
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

          console.log('[booking-email] user confirmation sent', {
            bookingId,
            to: userEmail,
            resendId: userEmailResponse?.data?.id,
          });
            } catch (emailError) {
          console.error('[booking-email] Error sending user email:', {
            bookingId,
            to: userEmail,
            error: emailError
          });
        }
          }

          // Send notification email to Lawyer
          if (lawyerEmail && resend) {
            try {
          console.log('[booking-email] sending lawyer confirmation', { bookingId, to: lawyerEmail });

          const lawyerEmailResponse = await resend.emails.send({
            from: 'LegalUp <hola@mg.legalup.cl>',
                to: lawyerEmail,
                subject: 'Nueva reserva confirmada',
                html: `
                  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #2563eb;">¡Nueva Reserva!</h1>
                    <p>Has recibido una nueva reserva confirmada.</p>
                    
                    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                      <p style="margin: 5px 0;"><strong>Cliente:</strong> ${userName}</p>
                      <p style="margin: 5px 0;"><strong>Email:</strong> ${userEmail}</p>
                      <p style="margin: 5px 0;"><strong>Fecha:</strong> ${booking.scheduled_date || booking.date || ''}</p>
                      <p style="margin: 5px 0;"><strong>Hora:</strong> ${booking.scheduled_time || booking.time || ''}</p>
                      <p style="margin: 5px 0;"><strong>Duración:</strong> ${booking.duration || ''} min</p>
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

          console.log('[booking-email] lawyer confirmation sent', {
            bookingId,
            to: lawyerEmail,
            resendId: lawyerEmailResponse?.data?.id,
          });
            } catch (emailError) {
          console.error('[booking-email] Error sending lawyer email:', {
            bookingId,
            to: lawyerEmail,
            error: emailError
          });
        }
      } else {
        console.warn('[booking-email] lawyer email not sent (missing lawyerEmail or resend not configured)', {
          bookingId,
          lawyerEmail,
          resendConfigured: Boolean(resend)
        });
      }
    };

    if (topic === 'payment') {
      const payment = await new Payment(mpClient).get({ id });
      
      if (payment.status === 'approved') {
        await handleApprovedPayment(payment);
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Error in MercadoPago webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Manual reconcile for already-approved payments (backup if webhook delivery fails)
app.post('/api/mercadopago/reconcile/:paymentId', async (req, res) => {
  try {
    const adminSecret = process.env.MP_RECONCILE_SECRET;
    const providedSecret = req.headers['x-reconcile-secret'];
    if (!adminSecret || String(providedSecret || '') !== String(adminSecret)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { paymentId } = req.params;
    const payment = await new Payment(mpClient).get({ id: paymentId });
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    if (payment.status !== 'approved') {
      return res.status(409).json({
        error: 'Payment not approved',
        status: payment.status,
        status_detail: payment.status_detail,
        external_reference: payment.external_reference,
      });
    }

    const bookingId = payment.external_reference;
    const { data: booking, error: bookingFetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .maybeSingle();
    if (bookingFetchError) {
      console.error('Error fetching booking for reconcile:', bookingFetchError);
      return res.status(500).json({ error: 'Failed to fetch booking' });
    }
    if (!booking) return res.status(404).json({ error: 'Booking not found', bookingId });

    let clientUserId = booking.user_id;
    const userEmail = (booking.user_email || '').trim().toLowerCase();
    const userName = booking.user_name?.trim() || (userEmail ? userEmail.split('@')[0] : 'Cliente LegalUp');

    if (!clientUserId && userEmail) {
      try {
        const { data: authUser } = await supabase.auth.admin.getUserByEmail(userEmail);
        if (authUser?.user?.id) {
          clientUserId = authUser.user.id;
        }
      } catch (e) {
        console.error('Error looking up user by email (reconcile):', e);
      }
    }

    if (!clientUserId && userEmail) {
      const tempPassword = crypto.randomBytes(9).toString('hex');
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: userEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: userName, role: 'client', signup_method: 'booking' }
      });
      if (createError) {
        console.error('Error creating user (reconcile):', createError);
      }
      if (newUser?.user?.id) clientUserId = newUser.user.id;
    }

    const { error: bookingUpdateError } = await supabase
      .from('bookings')
      .update({
        status: 'confirmed',
        payment_id: payment.id.toString(),
        user_id: clientUserId,
        user_email: userEmail,
        user_name: userName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);
    if (bookingUpdateError) {
      console.error('Error updating booking (reconcile):', bookingUpdateError);
      return res.status(500).json({ error: 'Failed to update booking' });
    }

    if (clientUserId) {
      const { data: existingAppointment } = await supabase
        .from('appointments')
        .select('id')
        .eq('lawyer_id', booking.lawyer_id)
        .eq('user_id', clientUserId)
        .eq('appointment_date', booking.scheduled_date)
        .eq('appointment_time', booking.scheduled_time)
        .maybeSingle();

      if (!existingAppointment) {
        const { error: apptError } = await supabase
          .from('appointments')
          .insert({
            lawyer_id: booking.lawyer_id,
            user_id: clientUserId,
            email: userEmail,
            name: userName,
            appointment_date: booking.scheduled_date,
            appointment_time: booking.scheduled_time,
            duration: booking.duration,
            price: booking.price,
            status: 'confirmed',
            consultation_type: 'paid',
            contact_method: 'platform',
            currency: 'CLP',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        if (apptError) console.error('Error creating appointment (reconcile):', apptError);
      }
    }

    return res.json({
      success: true,
      paymentId: payment.id,
      external_reference: bookingId,
      bookingUpdated: true,
      clientUserId,
    });
  } catch (error) {
    console.error('Error in MercadoPago reconcile endpoint:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint para notificar abogados
app.post('/api/admin/notify-lawyers', async (req, res) => {
  try {
    const { testMode = false, testEmail } = req.body;

    // Verificar si estamos en modo de prueba
    if (testMode) {
      if (!testEmail) {
        return res.status(400).json({ 
          success: false, 
          message: 'Se requiere un correo de prueba en modo test' 
        });
      }

      // Enviar correo de prueba
      await resend.emails.send({
        from: 'LegalUp <hola@mg.legalup.cl>',
        to: testEmail,
        subject: 'Prueba de notificación LegalUp',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="https://legalup.cl/assets/logo-200.png" alt="LegalUp" style="max-width: 200px; margin-bottom: 20px;">
              <h1 style="color: #101820; margin-bottom: 10px;">º</h1>
            </div>
            
            <p style="color: #101820; line-height: 1.6; margin-bottom: 20px;">
              Hemos notado que aún no has cargado ningún servicio en tu perfil de LegalUp. Para que los clientes puedan encontrarte y contratarte, es importante que completes esta información.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${appUrl}/lawyer/services" 
                  style="background-color: #2563eb; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 6px; font-weight: bold; 
                        display: inline-block; font-size: 16px;">
                Agregar mi primer servicio
              </a>
            </div>

            <p style="color: #101820; line-height: 1.6; margin-bottom: 20px;">
              Si necesitas ayuda para configurar tus servicios, no dudes en contactarnos a 
              <a href="mailto:juan.fercommerce@gmail.com" style="color: #2563eb; text-decoration: none;">soporte@legalup.cl</a>.
            </p>

            <p style="color: #101820; line-height: 1.6; margin-bottom: 30px;">
              ¡Estamos aquí para ayudarte a tener éxito en LegalUp!
            </p>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 14px; text-align: center;">
              <p>© ${new Date().getFullYear()} LegalUp. Todos los derechos reservados.</p>
              <p style="font-size: 12px; color: #94a3b8; margin-top: 5px;">
                Si ya has cargado tus servicios, por favor ignora este mensaje.
              </p>
              <p style="font-size: 12px; color: #94a3b8; margin-top: 5px;">
                Este es un correo automático, por favor no respondas a este mensaje.
              </p>
            </div>
          </div>
        `
      });

      return res.json({ 
        success: true, 
        message: 'Correo de prueba enviado correctamente',
        testEmail
      });
    }

    // Obtener todos los abogados
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .eq('role', 'lawyer')
      .not('email', 'is', null);

    if (profileError) {
      console.error('Error al obtener perfiles de abogados:', profileError);
      return res.status(500).json({ 
        success: false, 
        message: 'Error al obtener la lista de abogados',
        error: profileError.message 
      });
    }

    // Obtener IDs de abogados que ya tienen servicios cargados
    const { data: servicesData, error: servicesError } = await supabase
      .from('lawyer_services')
      .select('lawyer_user_id');

    if (servicesError) {
      console.error('Error al obtener lawyer_services:', servicesError);
      return res.status(500).json({ 
        success: false, 
        message: 'Error al verificar servicios de abogados',
        error: servicesError.message 
      });
    }

    // Crear un set de IDs con servicios para un filtrado eficiente
    const lawyerIdsWithServices = new Set(servicesData.map(s => s.lawyer_user_id));

    // Filtrar abogados que NO tienen servicios
    const lawyers = profiles.filter(profile => !lawyerIdsWithServices.has(profile.id));

    // Si no hay abogados para notificar
    if (!lawyers || lawyers.length === 0) {
      return res.json({ 
        success: true, 
        message: 'No hay abogados sin servicios para notificar',
        count: 0
      });
    }

    // Contadores para el resumen
    let successCount = 0;
    let failCount = 0;
    const failedEmails = [];

    // Enviar notificación a cada abogado
    for (const lawyer of lawyers) {
      try {
        const fullName = `${lawyer.first_name || ''} ${lawyer.last_name || ''}`.trim() || 'Abogado/a';
        
        await resend.emails.send({
          from: 'LegalUp <hola@mg.legalup.cl>',
          to: lawyer.email,
          subject: '¡Aún no has cargado servicios en tu perfil!',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <div style="text-align: center; margin-bottom: 20px;">
                <img src="https://legalup.cl/assets/logo-200.png" alt="LegalUp" style="max-width: 200px; margin-bottom: 20px;">
                <h1 style="color: #101820; margin-bottom: 10px;">¡Hola ${fullName}!</h1>
              </div>
              
              <p style="color: #101820; line-height: 1.6; margin-bottom: 20px;">
                Hemos notado que aún no has cargado ningún servicio en tu perfil de LegalUp. Para que los clientes puedan encontrarte y contratarte, es importante que completes esta información.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${appUrl}/lawyer/services" 
                   style="background-color: #2563eb; color: white; padding: 12px 30px; 
                          text-decoration: none; border-radius: 6px; font-weight: bold; 
                          display: inline-block; font-size: 16px;">
                  Agregar mi primer servicio
                </a>
              </div>

              <p style="color: #101820; line-height: 1.6; margin-bottom: 20px;">
                Si necesitas ayuda para configurar tus servicios, no dudes en contactarnos a 
                <a href="mailto:juan.fercommerce@gmail.com" style="color: #2563eb; text-decoration: none;">soporte@legalup.cl</a>.
              </p>

              <p style="color: #101820; line-height: 1.6; margin-bottom: 30px;">
                ¡Estamos aquí para ayudarte a tener éxito en LegalUp!
              </p>

              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 14px; text-align: center;">
                <p>© ${new Date().getFullYear()} LegalUp. Todos los derechos reservados.</p>
                <p style="font-size: 12px; color: #94a3b8; margin-top: 5px;">
                  Si ya has cargado tus servicios, por favor ignora este mensaje.
                </p>
                <p style="font-size: 12px; color: #94a3b8; margin-top: 5px;">
                  Este es un correo automático, por favor no respondas a este mensaje.
                </p>
              </div>
            </div>
          `
        });
        
        successCount++;
        
        // Pequeña pausa para evitar saturar el servicio de envío
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (emailError) {
        console.error(`Error al enviar correo a ${lawyer.email}:`, emailError);
        failCount++;
        failedEmails.push({
          email: lawyer.email,
          error: emailError.message
        });
      }
    }

    // Enviar resumen por correo al administrador
    try {
      await resend.emails.send({
        from: 'LegalUp <hola@mg.legalup.cl>',
        to: 'juan.fercommerce@gmail.com',
        subject: `Resumen de notificaciones a abogados (${new Date().toLocaleDateString()})`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb;">Resumen de notificaciones</h2>
            <p>Se han procesado las notificaciones a abogados sin servicios cargados.</p>
            
            <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p><strong>Total de abogados notificados:</strong> ${successCount + failCount}</p>
              <p style="color: #22c55e;"><strong>Notificaciones exitosas:</strong> ${successCount}</p>
              <p style="color: ${failCount > 0 ? '#ef4444' : '#22c55e'}"><strong>Notificaciones fallidas:</strong> ${failCount}</p>
            </div>
            
            ${failCount > 0 ? `
              <div style="margin-top: 20px;">
                <h3>Correos con error:</h3>
                <ul>
                  ${failedEmails.map(item => `
                    <li>${item.email}: ${item.error}</li>
                  `).join('')}
                </ul>
              </div>
            ` : ''}
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 14px;">
              <p>© ${new Date().getFullYear()} LegalUp. Todos los derechos reservados.</p>
            </div>
          </div>
        `
      });
    } catch (summaryError) {
      console.error('Error al enviar resumen:', summaryError);
    }

    return res.json({
      success: true,
      message: `Notificaciones enviadas correctamente a ${successCount} abogados`,
      details: {
        total: lawyers.length,
        success: successCount,
        failed: failCount,
        failedEmails: failedEmails.length > 0 ? failedEmails : undefined
      }
    });
  } catch (error) {
    console.error('Error en el proceso de notificación:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al procesar la solicitud',
      error: error.message
    });
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
app.listen(PORT, '0.0.0.0');

export default app;