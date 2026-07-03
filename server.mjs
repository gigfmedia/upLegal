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

const resolveWebhookUrl = (req) => {
  if (mercadoPagoWebhookUrl) return mercadoPagoWebhookUrl;
  const forwardedProto = req.get('x-forwarded-proto');
  const protocol = forwardedProto || req.protocol || 'https';
  const host = req.get('x-forwarded-host') || req.get('host');
  if (!host) return '';
  return `${protocol}://${host}/api/mercadopago/webhook`;
};

if (!resend) {
  console.warn('⚠️ RESEND_API_KEY is not configured. Emails will NOT be sent.');
}

if (!mercadoPagoWebhookUrl) {
  console.warn('⚠️ MERCADOPAGO_WEBHOOK_URL is not configured. MercadoPago webhooks will NOT be received, and bookings may remain pending.');
}

// GA4 Measurement Protocol Configuration
const ga4MeasurementId = process.env.GA4_MEASUREMENT_ID;
const ga4ApiSecret = process.env.GA4_API_SECRET;

if (!ga4MeasurementId || !ga4ApiSecret) {
  console.warn('⚠️ GA4_MEASUREMENT_ID or GA4_API_SECRET is not configured. GA4 purchase events will NOT be sent.');
}

// Send GA4 Purchase Event using Measurement Protocol
const sendGA4PurchaseEvent = async (params) => {
  const { transaction_id, value, currency, booking_id, lawyer_id, appointment_id } = params;

  if (!ga4MeasurementId || !ga4ApiSecret) {
    console.warn('[GA4] Skipping purchase event - GA4 credentials not configured');
    return;
  }

  try {
    console.log('[GA4] Sending purchase event', { transaction_id, value, currency, booking_id, lawyer_id, appointment_id });

    const url = `https://www.google-analytics.com/mp/collect?measurement_id=${ga4MeasurementId}&api_secret=${ga4ApiSecret}`;

    const payload = {
      client_id: transaction_id, // Use transaction_id as client_id for server-side events
      events: [
        {
          name: 'purchase',
          params: {
            transaction_id,
            value,
            currency,
            items: [
              {
                item_id: booking_id,
                item_name: 'Legal Consultation',
                price: value,
                quantity: 1
              }
            ],
            custom_parameters: {
              booking_id,
              lawyer_id,
              ...(appointment_id && { appointment_id })
            }
          }
        }
      ]
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[GA4] Purchase event failed', { status: response.status, error: errorText });
      return;
    }

    console.log('[GA4] Purchase event sent successfully', { transaction_id, value, currency });
  } catch (error) {
    console.error('[GA4] Purchase event failed', error);
    // Do not throw - payment flow should continue even if GA4 fails
  }
};

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
    const webhookUrl = resolveWebhookUrl(req);
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
      ...(webhookUrl ? { notification_url: webhookUrl } : {})
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
      user_id,
      user_email,
      user_name,
      user_phone,
      scheduled_date,
      scheduled_time,
      duration,
      price,
      booking_type = 'appointment',
      service_id,
      service_title,
      service_description,
      service_delivery_time,
      requires_meeting,
    } = req.body;

    const isServiceBooking = booking_type === 'service';

    console.log('[booking/create] body:', req.body);

    console.log('[booking/create] validation', {
      lawyer_id,
      user_email,
      user_name,
      price,
      booking_type,
      service_id,
    });

    if (!lawyer_id || !user_email || !user_name || !price) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['lawyer_id', 'user_email', 'user_name', 'price'],
      });
    }

    if (isServiceBooking) {
      if (!service_id || !service_title) {
        return res.status(400).json({
          error: 'Missing service fields',
          required: ['service_id', 'service_title'],
        });
      }
    } else if (!scheduled_date || !scheduled_time || !duration) {
      return res.status(400).json({
        error: 'Missing appointment fields',
        required: ['scheduled_date', 'scheduled_time', 'duration', 'price'],
      });
    }

    const resolvedDuration = isServiceBooking ? (duration || 0) : duration;

    if (!isServiceBooking && ![30, 60, 90, 120].includes(resolvedDuration)) {
      return res.status(400).json({ error: 'Duration must be 30, 60, 90 or 120 minutes' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(user_email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Prevent double-booking for scheduled appointments only
    if (!isServiceBooking) {
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
          const reqDur = Number(resolvedDuration);
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
                message: 'Este horario ya está reservado. Por favor elige otro.',
              });
            }
          }
        }
      } catch (e) {
        console.error('Exception checking booking overlap:', e);
      }
    }

    const { data: lawyer, error: lawyerError } = await supabase
      .from('profiles')
      .select('user_id, first_name, last_name')
      .eq('user_id', lawyer_id)
      .eq('role', 'lawyer')
      .single();

    if (lawyerError || !lawyer) {
      return res.status(404).json({ error: 'Lawyer not found' });
    }

    const inferRequiresMeeting = () => {
      if (typeof requires_meeting === 'boolean') return requires_meeting;
      if (!service_title) return true;
      const title = service_title.toLowerCase();
      if (title.includes('consulta')) return true;
      if (title.includes('videollamada')) return true;
      if (title.includes('reunión') || title.includes('reunion')) return true;
      return false;
    };

    const { data: testInsert, error: testError } = await supabase
      .from('bookings')
      .insert({
        lawyer_id,
        user_email: 'test@test.cl',
        user_name: 'Test',
        price: 1000,
        status: 'pending',
        booking_type: 'service',
        duration: null,
        scheduled_date: null,
        scheduled_time: null,
        requires_meeting: false,
      })
      .select();

    console.log('TEST INSERT', testInsert);
    console.log('TEST ERROR', testError);

    const bookingInsert = {
      lawyer_id,
      user_id: user_id || null,
      user_email,
      user_name,
      user_phone: user_phone || null,
      scheduled_date: isServiceBooking ? null : scheduled_date,
      scheduled_time: isServiceBooking ? null : scheduled_time,
      duration: isServiceBooking ? null : resolvedDuration,
      price,
      status: 'pending',
      booking_type: isServiceBooking ? 'service' : 'appointment',
      service_id: isServiceBooking ? service_id : null,
      service_title: isServiceBooking ? service_title : null,
      service_description: isServiceBooking ? (service_description || null) : null,
      service_delivery_time: isServiceBooking ? (service_delivery_time || null) : null,
      requires_meeting: isServiceBooking ? inferRequiresMeeting() : true,
    };

    console.log('BOOKING INSERT', bookingInsert);

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert(bookingInsert)
      .select()
      .single();

    if (bookingError) {
      console.error('Error creating booking:', bookingError);
      return res.status(500).json({ error: 'Failed to create booking' });
    }

    try {
      await supabase.from('payment_events').insert({
        event_type: 'started',
        amount: price,
        status: 'processing',
        metadata: {
          booking_id: booking.id,
          lawyer_id,
          booking_type: booking.booking_type,
          service_id: booking.service_id || null,
          source: isServiceBooking ? 'service_checkout' : 'booking_create',
        },
        user_id: user_id || null,
      });
    } catch (trackingError) {
      console.error('Failed to track payment start:', trackingError);
    }

    let leadId = null;
    try {
      const { data: leadData, error: leadError } = await supabase
        .from('booking_leads')
        .insert({
          lawyer_id,
          name: user_name,
          email: user_email,
          phone: user_phone || null,
          selected_date: scheduled_date || null,
          selected_time: scheduled_time || null,
          duration: resolvedDuration || null,
          price,
          booking_id: booking.id,
          booking_type: booking.booking_type,
          service_id: booking.service_id,
          service_title: booking.service_title,
          status: 'started',
        })
        .select('id')
        .single();

      if (leadError) {
        console.error('Failed to save booking_lead:', leadError);
      } else {
        leadId = leadData.id;
      }
    } catch (leadErr) {
      console.error('Exception saving booking_lead:', leadErr);
    }

    const webhookUrl = resolveWebhookUrl(req);
    const mpItemTitle = isServiceBooking
      ? `${service_title} — ${lawyer.first_name} ${lawyer.last_name}`
      : `Asesoría Legal - ${lawyer.first_name} ${lawyer.last_name}`;
    const mpItemDescription = isServiceBooking
      ? (service_description || service_title)
      : `Asesoría legal de ${resolvedDuration} minutos`;

    const preferenceData = {
      items: [{
        id: booking.id,
        title: mpItemTitle,
        description: mpItemDescription,
        category_id: 'services',
        quantity: 1,
        unit_price: price,
      }],
      payer: {
        name: user_name,
        email: user_email,
      },
      back_urls: {
        success: `${appUrl}/booking/success?booking_id=${booking.id}`,
        failure: `${appUrl}/booking/failure?booking_id=${booking.id}`,
        pending: `${appUrl}/booking/pending?booking_id=${booking.id}`,
      },
      auto_return: 'approved',
      external_reference: booking.id,
      metadata: {
        booking_id: booking.id,
        booking_type: booking.booking_type,
        lawyer_id,
        user_id: user_id || null,
        user_email,
        user_name,
        service_id: booking.service_id || null,
        service_title: booking.service_title || null,
        requires_meeting: booking.requires_meeting,
        duration: resolvedDuration,
        scheduled_date: scheduled_date || null,
        scheduled_time: scheduled_time || null,
      },
      statement_descriptor: 'LEGALUP',
      ...(webhookUrl ? { notification_url: webhookUrl } : {}),
    };

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.VITE_MERCADOPAGO_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(preferenceData),
    });

    if (!mpResponse.ok) {
      const errorData = await mpResponse.json();
      console.error('MercadoPago API error:', errorData);
      throw new Error('Failed to create MercadoPago preference');
    }

    const mpData = await mpResponse.json();

    await supabase
      .from('bookings')
      .update({
        mercadopago_preference_id: mpData.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', booking.id);

    if (leadId) {
      try {
        await supabase.from('booking_leads').update({ status: 'checkout' }).eq('id', leadId);
      } catch (leadUpdateErr) {
        console.error('Failed to update booking_lead to checkout:', leadUpdateErr);
      }
    }

    const paymentLink = mpData.init_point || mpData.sandbox_init_point;

    res.json({
      success: true,
      booking_id: booking.id,
      lead_id: leadId,
      payment_link: paymentLink,
      message: isServiceBooking ? 'Service booking created successfully' : 'Booking created successfully',
    });
  } catch (error) {
    console.error('Error in /api/bookings/create:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    });
  }
});

// -------------------------------------------------------
// PATCH /api/leads/:id/status
// Actualizar el status de un booking_lead.
// Usado por: BookingSuccessPage (paid), webhook (paid/abandoned)
// -------------------------------------------------------
app.patch('/api/leads/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['started', 'checkout', 'paid', 'abandoned'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const { data, error } = await supabase
      .from('booking_leads')
      .update({ status })
      .eq('id', id)
      .select('id, status')
      .single();

    if (error) {
      console.error('Error updating booking_lead status:', error);
      return res.status(404).json({ error: 'Lead not found or update failed' });
    }

    res.json({ success: true, lead: data });
  } catch (error) {
    console.error('Error in PATCH /api/leads/:id/status:', error);
    res.status(500).json({ error: 'Internal server error' });
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
    console.log('Webhook RAW payload:', {
      body: req.body,
      query: req.query,
    });

    const topic = req.body?.topic || req.body?.type || req.body?.action;

    console.log('Detected topic/type/action:', topic);

    // 1. Ignore merchant_order immediately
    if (topic === 'merchant_order') {
      console.log('Ignoring merchant_order webhook');
      return res.status(200).send('OK');
    }

    let paymentId = null;
    let source = '';

    // helper: limpia IDs
    const normalizeId = (value) => {
      if (!value) return null;

      const str = String(value)
        .trim()
        .split('?')[0]     // elimina query params
        .split('#')[0];    // seguridad extra

      // extrae solo números
      const match = str.match(/\d+/);
      return match ? match[0] : null;
    };

    // PRIORIDAD 1: data.id (recomendado MP v2)
    if (req.body?.data?.id) {
      paymentId = normalizeId(req.body.data.id);
      source = 'body.data.id';
    }

    // PRIORIDAD 2: resource
    if (!paymentId && req.body?.resource) {
      paymentId = normalizeId(req.body.resource);
      source = 'body.resource';
    }

    // PRIORIDAD 3: query params
    if (!paymentId && req.query?.['data.id']) {
      paymentId = normalizeId(req.query['data.id']);
      source = "query['data.id']";
    }

    if (!paymentId && req.query?.id) {
      paymentId = normalizeId(req.query.id);
      source = 'query.id';
    }

    console.log('Extracted Payment ID:', paymentId);
    console.log('Payment ID source:', source);
    console.log('Final topic:', topic);
    console.log('access token exists:', !!process.env.VITE_MERCADOPAGO_ACCESS_TOKEN);
    console.log('access token start:', process.env.VITE_MERCADOPAGO_ACCESS_TOKEN?.substring(0, 20));

    // validación estricta
    if (!paymentId && (topic === 'payment' || topic === 'payment.created')) {
      console.log('❌ No paymentId could be extracted');
      return res.status(200).send('OK');
    }

    const handleApprovedPayment = async (payment) => {
      const bookingId = payment.external_reference;
      const paymentId = payment.id.toString();

      console.log('[webhook] step=payment_ingestion payment_id=' + paymentId + ' booking_id=' + bookingId);

      // STEP 1: Payment ingestion - Get booking
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .update({
          status: 'confirmed',
          payment_status: 'approved',
          payment_id: paymentId,
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId)
        .select()
        .maybeSingle();

      if (bookingError || !booking) {
        console.error('[webhook] step=payment_ingestion status=failed error=' + (bookingError?.message || 'booking not found'));
        return;
      }

      console.log('[webhook] step=payment_ingestion status=ok booking_id=' + bookingId);

      // STEP 2: Lawyer resolution (STRICT VALIDATION)
      console.log('[webhook] step=lawyer_resolution lawyer_id=' + booking.lawyer_id);

      let lawyerEmail = '';
      let lawyerName = 'Abogado';
      let lawyerProfile = null;

      try {
        const { data: lawyerData, error: lawyerError } = await supabase
          .from('profiles')
          .select('id, display_name, first_name, last_name, user_id, meet_link')
          .eq('user_id', booking.lawyer_id)
          .maybeSingle();

        if (lawyerError || !lawyerData) {
          console.error('[webhook] step=lawyer_resolution status=failed error=lawyer_not_found lawyer_id=' + booking.lawyer_id);

          // Mark booking for manual review
          await supabase
            .from('bookings')
            .update({ needs_manual_review: true })
            .eq('id', bookingId);

          console.log('[webhook] step=lawyer_resolution action=marked_manual_review booking_id=' + bookingId);
          return; // STOP automation flow
        }

        lawyerProfile = lawyerData;
        lawyerName = lawyerProfile.display_name ||
          `${lawyerProfile.first_name || ''} ${lawyerProfile.last_name || ''}`.trim() ||
          'Abogado';

        // Get email from auth.users
        const lawyerAuthId = lawyerProfile.user_id || booking.lawyer_id;
        if (lawyerAuthId) {
          const { data: lawyerUser, error: lawyerError } = await supabase.auth.admin.getUserById(lawyerAuthId);
          if (lawyerUser?.user) {
            lawyerEmail = (lawyerUser.user.email || '').trim().toLowerCase();

            if (lawyerName === 'Abogado' && lawyerUser.user.user_metadata) {
              const metaName = lawyerUser.user.user_metadata.full_name ||
                lawyerUser.user.user_metadata.first_name;
              if (metaName) lawyerName = metaName;
            }
          }
        }

        console.log('[webhook] step=lawyer_resolution status=ok lawyer_id=' + booking.lawyer_id + ' lawyer_email=' + lawyerEmail);
      } catch (e) {
        console.error('[webhook] step=lawyer_resolution status=failed error=exception', e);
        await supabase
          .from('bookings')
          .update({ needs_manual_review: true })
          .eq('id', bookingId);
        return;
      }

      // STEP 3: Booking normalization - Client creation/update
      console.log('[webhook] step=booking_normalization booking_id=' + bookingId);

      const userEmail = (booking.user_email || '').trim().toLowerCase();
      const userName = booking.user_name?.trim() || (userEmail ? userEmail.split('@')[0] : 'Cliente LegalUp');
      const [firstName, ...restName] = userName.split(' ').filter(Boolean);
      const lastName = restName.length > 0 ? restName.join(' ') : '';
      let userId = null;

      // Check if user exists
      if (userEmail) {
        try {
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', userEmail)
            .maybeSingle();

          if (existingProfile) {
            userId = existingProfile.id;
          }
        } catch (lookupError) {
          console.error('[webhook] step=booking_normalization error=user_lookup', lookupError);
        }
      }

      // Create user if not exists
      if (userEmail && !userId) {
        try {
          const tempPassword = crypto.randomBytes(9).toString('hex');
          const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email: userEmail,
            password: tempPassword,
            email_confirm: true,
            user_metadata: {
              first_name: firstName || userName,
              last_name: lastName,
              full_name: userName,
              role: 'client',
              signup_method: 'booking'
            }
          });

          if (!createError && newUser?.user?.id) {
            userId = newUser.user.id;
          }
        } catch (createError) {
          console.error('[webhook] step=booking_normalization error=user_creation', createError);
        }
      }

      // Ensure profile exists
      if (userId && userEmail) {
        try {
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('user_id', userId)
            .maybeSingle();

          const baseProfile = {
            email: userEmail,
            first_name: firstName || null,
            last_name: lastName || null,
            display_name: userName,
            role: 'client',
            updated_at: new Date().toISOString(),
          };

          if (existingProfile) {
            await supabase.from('profiles').update(baseProfile).eq('user_id', userId);
          } else {
            await supabase.from('profiles').insert({
              ...baseProfile,
              id: userId,
              user_id: userId,
              created_at: new Date().toISOString(),
              has_used_free_consultation: false,
            });
          }
        } catch (profileError) {
          console.error('[webhook] step=booking_normalization error=profile_update', profileError);
        }
      }

      // Associate booking with user
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

      console.log('[webhook] step=booking_normalization status=ok user_id=' + (userId || 'null'));

      const shouldCreateAppointment = booking.requires_meeting !== false;

      // Track payment event
      try {
        await supabase.from('payment_events').insert({
          event_type: 'success',
          amount: payment.transaction_amount,
          status: 'completed',
          metadata: {
            payment_id: paymentId,
            booking_id: bookingId,
            source: 'webhook',
            user_email: userEmail || null
          },
          user_id: userId || null,
        });
      } catch (trackingError) {
        console.error('[webhook] step=booking_normalization error=payment_event', trackingError);
      }

      // STEP 4: Appointment creation (only when the service requires a meeting)
      console.log('[webhook] step=appointment_creation booking_id=' + bookingId + ' requires_meeting=' + shouldCreateAppointment);

      let appointmentId = null;
      if (shouldCreateAppointment && userId) {
        try {
          const { data: existingAppointment } = await supabase
            .from('appointments')
            .select('id, meet_link, status')
            .eq('lawyer_id', booking.lawyer_id)
            .eq('user_id', userId)
            .eq('appointment_date', booking.scheduled_date)
            .eq('appointment_time', booking.scheduled_time)
            .maybeSingle();

          if (existingAppointment) {
            appointmentId = existingAppointment.id;
            console.log('[webhook] step=appointment_creation status=exists appointment_id=' + appointmentId);
          } else {
            const { data: newAppointment } = await supabase
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
                status: 'pending_meet_link',
                consultation_type: 'paid',
                contact_method: 'platform',
                currency: 'CLP',
                meet_status: 'pending',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .select('id')
              .maybeSingle();

            if (newAppointment) {
              appointmentId = newAppointment.id;
              console.log('[webhook] step=appointment_creation status=created appointment_id=' + appointmentId);
            }
          }
        } catch (appointmentError) {
          console.error('[webhook] step=appointment_creation status=failed', appointmentError);
        }
      }

      // Send GA4 Purchase Event
      try {
        await sendGA4PurchaseEvent({
          transaction_id: paymentId,
          value: payment.transaction_amount,
          currency: 'CLP',
          booking_id: bookingId,
          lawyer_id: booking.lawyer_id,
          appointment_id: appointmentId
        });
      } catch (ga4Error) {
        console.error('[webhook] step=ga4_event status=failed', ga4Error);
      }

      // STEP 5: Google Meet generation (only for bookings that require a meeting)
      console.log('[webhook] step=meet_generation appointment_id=' + appointmentId);

      let meetLink = '';
      let meetStatus = 'fallback';
      let meetProvider = 'jitsi';

      if (shouldCreateAppointment) {
        // PRIORITY 1: Use lawyer's fixed meet_link if configured
        if (lawyerProfile?.meet_link) {
          meetLink = lawyerProfile.meet_link;
          meetStatus = 'fixed';
          // Detect provider from URL pattern
          if (meetLink.includes('meet.google.com') || meetLink.includes('hangouts.google.com')) {
            meetProvider = 'google';
          } else if (meetLink.includes('jitsi')) {
            meetProvider = 'jitsi';
          } else {
            meetProvider = 'custom';
          }
          console.log('[webhook] step=meet_generation status=fixed provider=' + meetProvider + ' source=lawyer_profile meet_link=' + meetLink);
        }
        // PRIORITY 2: Generate dynamic meet link if no fixed link
        else if (appointmentId) {
          try {
            console.log('[webhook] invoking create-google-meeting', {
              appointmentId,
              lawyerId: booking.lawyer_id
            });

            const { data: meetData, error: meetError } = await supabase.functions.invoke('create-google-meeting', {
              body: { appointmentId }
            });

            console.log('[webhook] create-google-meeting result', {
              data: meetData,
              error: meetError
            });

            if (!meetError && meetData?.meetLink) {
              meetLink = meetData.meetLink;
              meetProvider = meetData.source || 'jitsi';
              meetStatus = meetData.existing ? 'success' : (meetData.source === 'jitsi' ? 'fallback' : 'success');
              console.log('[webhook] step=meet_generation status=' + meetStatus + ' meet_link=' + meetLink + ' provider=' + meetProvider + ' existing=' + (meetData.existing || false));
              if (meetData.existing) {
                console.log('[webhook] step=meet_generation action=reused_existing_link');
              }
            } else {
              console.warn('[webhook] step=meet_generation status=fallback error=' + (meetError?.message || 'no_link_returned'));
            }
          } catch (meetError) {
            console.error('[webhook] create-google-meeting exception', meetError);
            console.warn('[webhook] step=meet_generation status=fallback error=exception');
          }
        }

        // CRITICAL: Always persist meet_link to DB before email dispatch
        if (appointmentId) {
          try {
            const updateData = {
              meet_status: meetStatus,
              meet_provider: meetProvider,
              updated_at: new Date().toISOString(),
            };

            if (meetLink) {
              updateData.meet_link = meetLink;
              updateData.status = 'confirmed';
            }

            // UPDATE (write only)
            const { error: updateError } = await supabase
              .from('appointments')
              .update(updateData)
              .eq('id', appointmentId);

            if (updateError) {
              console.error('[webhook] step=meet_generation status=update_failed', updateError);
              throw updateError;
            }

            // RE-READ DB explicitly (source of truth)
            const { data: fresh, error: fetchError } = await supabase
              .from('appointments')
              .select('id, meet_link')
              .eq('id', appointmentId)
              .single();

            if (fetchError || !fresh) {
              console.error('[webhook] step=meet_generation status=fetch_after_update_failed', fetchError);
              throw new Error('Fetch after update failed');
            }

            if (!fresh.meet_link) {
              console.error('[webhook] step=meet_generation status=missing_meet_link_after_update', {
                appointmentId,
                fresh
              });
              throw new Error('meet_link not persisted');
            }

            console.log('[webhook] step=meet_generation status=updated appointment_id=' + appointmentId + ' meet_status=' + meetStatus + ' meet_provider=' + meetProvider + ' meet_link=' + fresh.meet_link);
          } catch (updateError) {
            console.error('[webhook] step=meet_generation status=update_failed', updateError);
            throw updateError;
          }
        }
      }

      // STEP 6: Email dispatch
      console.log('[webhook] step=email_dispatch appointment_id=' + (appointmentId || 'no') + ' booking_type=' + (booking.booking_type || 'appointment'));

      if (!shouldCreateAppointment && resend && userEmail) {
        const serviceTitle = booking.service_title || 'Servicio legal';
        const deliveryTime = booking.service_delivery_time || 'Según lo acordado con el abogado';
        const serviceDescription = booking.service_description || '';

        try {
          await resend.emails.send({
            from: 'LegalUp <hola@mg.legalup.cl>',
            to: userEmail,
            subject: 'Tu solicitud de servicio ha sido confirmada',
            html: `
                <body style="margin:0;padding:16px;background:#f9fafb;">
                  <div style="max-width:580px;margin:0 auto;font-family:Inter,Arial,sans-serif;color:#111827;padding:28px;border:1px solid #e5e7eb;border-radius:12px;background:#ffffff;line-height:1.6;">
                    <div style="text-align:center;margin-bottom:28px;">
                      <img src="https://legalup.cl/apple-touch-icon.png" alt="LegalUp" style="height:40px;width:40px;vertical-align:middle;margin-right:10px;border:0;" />
                      <span style="color:#1a202c;font-size:22px;font-weight:800;vertical-align:middle;">LegalUp</span>
                    </div>
                    <h1 style="color:#1a202c;">Servicio confirmado</h1>
                    <p>Hola <strong>${userName || 'Usuario'}</strong>,</p>
                    <p>Tu pago por <strong>${serviceTitle}</strong> fue recibido correctamente.</p>
                    <div style="background:#f3f4f6;padding:20px;border-radius:8px;margin:20px 0;">
                      <p style="margin:5px 0;"><strong>Abogado:</strong> ${lawyerName}</p>
                      <p style="margin:5px 0;"><strong>Servicio:</strong> ${serviceTitle}</p>
                      ${serviceDescription ? `<p style="margin:5px 0;"><strong>Detalle:</strong> ${serviceDescription}</p>` : ''}
                      <p style="margin:5px 0;"><strong>Plazo de entrega:</strong> ${deliveryTime}</p>
                      <p style="margin:5px 0;"><strong>Monto pagado:</strong> $${(booking.price || payment.transaction_amount || 0).toLocaleString('es-CL')} CLP</p>
                    </div>
                    <p>El abogado recibirá tu solicitud y se pondrá en contacto contigo para iniciar el trabajo.</p>
                    <p style="font-size:11px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:16px;margin-top:32px;text-align:center;">
                      © 2026 LegalUp — Asesoría legal online en Chile.<br />
                      Todos los derechos reservados.<br />
                      Este es un correo automático, por favor no respondas a este mensaje.
                    </p>
                  </div>
                </body>
              `,
          });
          console.log('[webhook] step=email_dispatch status=sent type=service_client');
        } catch (emailError) {
          console.error('[webhook] step=email_dispatch status=failed type=service_client', emailError);
        }

        if (lawyerEmail) {
          try {
            await resend.emails.send({
              from: 'LegalUp <hola@mg.legalup.cl>',
              to: lawyerEmail,
              subject: 'Nueva solicitud de servicio pagada',
              html: `
                  <body style="margin:0;padding:16px;background:#f9fafb;">
                    <div style="max-width:580px;margin:0 auto;font-family:Inter,Arial,sans-serif;color:#111827;padding:28px;border:1px solid #e5e7eb;border-radius:12px;background:#ffffff;line-height:1.6;">
                      <div style="text-align:center;margin-bottom:28px;">
                        <img src="https://legalup.cl/apple-touch-icon.png" alt="LegalUp" style="height:40px;width:40px;vertical-align:middle;margin-right:10px;border:0;" />
                        <span style="color:#1a202c;font-size:22px;font-weight:800;vertical-align:middle;">LegalUp</span>
                      </div>
                      <h1 style="color:#1a202c;">Nuevo servicio contratado</h1>
                      <p>Un cliente pagó un servicio a través de LegalUp.</p>
                      <div style="background:#f3f4f6;padding:20px;border-radius:8px;margin:20px 0;">
                        <p style="margin:5px 0;"><strong>Cliente:</strong> ${userName}</p>
                        <p style="margin:5px 0;"><strong>Email:</strong> ${userEmail}</p>
                        <p style="margin:5px 0;"><strong>Servicio:</strong> ${serviceTitle}</p>
                        <p style="margin:5px 0;"><strong>Plazo:</strong> ${deliveryTime}</p>
                        <p style="margin:5px 0;"><strong>Monto:</strong> $${(booking.price || payment.transaction_amount || 0).toLocaleString('es-CL')} CLP</p>
                      </div>
                      <div style="text-align: center">
                        <p>Ingresa a tu panel para gestionar la solicitud.</p>
                        <a href="${appUrl}/dashboard" style="display:inline-block;background:#111;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;">Ir a mi panel</a>
                      </div>
                      <p style="font-size:11px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:16px;margin-top:32px;text-align:center;">
                        © 2026 LegalUp — Asesoría legal online en Chile.<br />
                        Todos los derechos reservados.<br />
                        Este es un correo automático, por favor no respondas a este mensaje.
                      </p>
                    </div>
                  </body>
                `,
            });
            console.log('[webhook] step=email_dispatch status=sent type=service_lawyer');
          } catch (emailError) {
            console.error('[webhook] step=email_dispatch status=failed type=service_lawyer', emailError);
          }
        }
      } else if (appointmentId && resend) {
        // Re-fetch appointment from DB to get fresh meet_link
        const { data: freshAppointment, error: fetchError } = await supabase
          .from('appointments')
          .select('id, meet_link, meet_provider, meet_status, user_id, lawyer_id')
          .eq('id', appointmentId)
          .single();

        if (fetchError || !freshAppointment) {
          console.error('[webhook] step=email_dispatch status=fetch_failed error=', fetchError);
          return;
        }

        console.log('[webhook] step=email_dispatch status=fetched_from_db meet_link=' + (freshAppointment.meet_link ? 'yes' : 'no') + ' meet_provider=' + (freshAppointment.meet_provider || 'none'));

        // HARD GUARD: Ensure meet_link exists before sending email
        if (!freshAppointment.meet_link) {
          console.error('[webhook] step=email_dispatch status=skipped reason=missing_meet_link appointment_id=' + appointmentId);
          return;
        }

        const freshMeetLink = freshAppointment.meet_link;
        const freshMeetProvider = freshAppointment.meet_provider;
        // Generate Magic Link
        let magicLink = `${appUrl}/login`;
        if (userEmail) {
          try {
            const { data: linkData } = await supabase.auth.admin.generateLink({
              type: 'magiclink',
              email: userEmail,
              options: {
                redirectTo: `${appUrl}/dashboard/appointments`
              }
            });

            if (linkData?.properties?.action_link) {
              magicLink = linkData.properties.action_link;
            }
          } catch (e) {
            console.error('[webhook] step=email_dispatch error=magic_link', e);
          }
        }

        // Send client email
        try {
          await resend.emails.send({
            from: 'LegalUp <hola@mg.legalup.cl>',
            to: userEmail,
            subject: 'Tu cita ha sido confirmada',
            html: `
                <body style="margin:0;padding:16px;background:#f9fafb;">
                    <div style="max-width:580px;margin:0 auto;font-family:Inter,Arial,sans-serif;color:#111827;padding:28px;border:1px solid #e5e7eb;border-radius:12px;background:#ffffff;line-height:1.6;">
                      <div style="text-align:center;margin-bottom:28px;">
                        <img src="https://legalup.cl/apple-touch-icon.png" alt="LegalUp" style="height:40px;width:40px;vertical-align:middle;margin-right:10px;border:0;" />
                        <span style="color:#1a202c;font-size:22px;font-weight:800;vertical-align:middle;">LegalUp</span>
                      </div>
                      <h1 style="color: #1a202c;">Tu cita ha sido confirmada</h1>
                      <p>Hola <strong>${userName || 'Usuario'}</strong>,</p>
                      <p>Tu consulta está lista. Aquí tienes los detalles para conectarte con tu abogado.</p>
                      
                      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 5px 0;"><strong>Abogado:</strong> ${lawyerName}</p>
                        <p style="margin: 5px 0;"><strong>Fecha:</strong> ${booking.scheduled_date || booking.date || ''}</p>
                        <p style="margin: 5px 0;"><strong>Hora:</strong> ${booking.scheduled_time || booking.time || ''}</p>
                        <p style="margin: 5px 0;"><strong>Duración:</strong> ${booking.duration || ''} min</p>
                      </div>

                      <div style="background-color: #e8f0fe; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #4285F4;">
                        <p style="margin: 0 0 10px; color: #1967d2; font-weight: 600;">Enlace de Google Meet</p>
                        <a href="${freshMeetLink}" style="display: inline-block; background-color: #4285F4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
                          Unirse a la videollamada
                        </a>
                        <p style="margin: 10px 0 0; font-size: 12px; color: #5f6368;">
                          O copia este enlace: <span style="word-break: break-all; color: #1967d2;">${freshMeetLink}</span>
                        </p>
                      </div>

                      <p style="font-size:11px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:16px;margin-top:32px;text-align:center;">
                        © 2026 LegalUp — Asesoría legal online en Chile.<br />
                        Todos los derechos reservados.<br />
                        Este es un correo automático, por favor no respondas a este mensaje.
                      </p>
                    </div>
                </body>
              `
          });
          console.log('[webhook] step=email_dispatch status=sent type=client');
        } catch (emailError) {
          console.error('[webhook] step=email_dispatch status=failed type=client', emailError);
        }

        // Send lawyer email
        if (lawyerEmail) {
          try {
            await resend.emails.send({
              from: 'LegalUp <hola@mg.legalup.cl>',
              to: lawyerEmail,
              subject: 'Tienes una nueva cita agendada',
              html: `
                  <body style="margin:0;padding:16px;background:#f9fafb;">
                    <div style="max-width:580px;margin:0 auto;font-family:Inter,Arial,sans-serif;color:#111827;padding:28px;border:1px solid #e5e7eb;border-radius:12px;background:#ffffff;line-height:1.6;">
                      <div style="text-align:center;margin-bottom:28px;">
                        <img src="https://legalup.cl/apple-touch-icon.png" alt="LegalUp" style="height:40px;width:40px;vertical-align:middle;margin-right:10px;border:0;" />
                        <span style="color:#1a202c;font-size:22px;font-weight:800;vertical-align:middle;">LegalUp</span>
                      </div>
                      <h1 style="color: #1a202c;">Tienes una nueva cita agendada</h1>
                      <p>Un cliente ha reservado una consulta contigo a través de LegalUp.cl</p>
                      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 5px 0;"><strong>Cliente:</strong> ${userName}</p>
                        <p style="margin: 5px 0;"><strong>Email:</strong> ${userEmail}</p>
                        <p style="margin: 5px 0;"><strong>Fecha:</strong> ${booking.scheduled_date || booking.date || ''}</p>
                        <p style="margin: 5px 0;"><strong>Hora:</strong> ${booking.scheduled_time || booking.time || ''}</p>
                        <p style="margin: 5px 0;"><strong>Duración:</strong> ${booking.duration || ''} min</p>
                      </div>

                      <div style="background-color: #e8f0fe; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #4285F4;">
                        <p style="margin: 0 0 10px; color: #1967d2; font-weight: 600;">Enlace de Google Meet para esta cita</p>
                        <a href="${freshMeetLink}" style="display: inline-block; background-color: #4285F4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
                          Unirse a la videollamada
                        </a>
                        <p style="margin: 10px 0 0; font-size: 12px; color: #5f6368;">
                          Enlace: <span style="word-break: break-all; color: #1967d2;">${freshMeetLink}</span>
                        </p>
                      </div>

                      <p style="text-align:center">Ingresa a tu panel para ver más detalles.</p>
                      <div style="text-align: center; margin: 30px 0;">
                        <a href="${appUrl}/dashboard/appointments" style="background-color: #111; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                          Ir a mis citas
                        </a>
                      </div>
                      <p style="font-size:11px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:16px;margin-top:32px;text-align:center;">
                        © 2026 LegalUp — Asesoría legal online en Chile.<br />
                        Todos los derechos reservados.<br />
                        Este es un correo automático, por favor no respondas a este mensaje.
                      </p>
                    </div>
                  </body>
                `
            });
            console.log('[webhook] step=email_dispatch status=sent type=lawyer');
          } catch (emailError) {
            console.error('[webhook] step=email_dispatch status=failed type=lawyer', emailError);
          }
        }
      } else {
        console.log('[webhook] step=email_dispatch status=skipped reason=inconsistent_state meet_link=' + (meetLink ? 'yes' : 'no') + ' appointment_id=' + (appointmentId || 'no'));
      }

      // STEP 7: Admin notification (NON-BLOCKING)
      console.log('[webhook] step=admin_notification status=sending booking_id=' + bookingId);

      try {
        const totalAmount = payment.transaction_amount || booking.price || 0;
        const legalUpCommission = Math.round(totalAmount * 0.30);
        const lawyerAmount = Math.round(totalAmount * 0.70);

        await resend.emails.send({
          from: 'LegalUp <hola@mg.legalup.cl>',
          to: 'gigfmedia@icloud.com',
          subject: 'Nuevo pago recibido en LegalUp',
          html: `
              <body style="margin:0;padding:16px;background:#f9fafb;">
                <div style="max-width:580px;margin:0 auto;font-family:Inter,Arial,sans-serif;color:#111827;padding:28px;border:1px solid #e5e7eb;border-radius:12px;background:#ffffff;line-height:1.6;">
                  <div style="text-align:center;margin-bottom:28px;">
                    <img src="https://legalup.cl/apple-touch-icon.png" alt="LegalUp" style="height:40px;width:40px;vertical-align:middle;margin-right:10px;border:0;" />
                    <span style="color:#1a202c;font-size:22px;font-weight:800;vertical-align:middle;">LegalUp</span>
                  </div>
                  <h1 style="color: #1a202c;">Nuevo pago recibido en LegalUp</h1>

                  <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Nombre cliente:</strong> ${userName || 'N/A'}</p>
                    <p style="margin: 5px 0;"><strong>Nombre abogado:</strong> ${lawyerName}</p>
                    <p style="margin: 5px 0;"><strong>Fecha consulta:</strong> ${booking.scheduled_date || booking.date || 'N/A'}</p>
                    <p style="margin: 5px 0;"><strong>Duración:</strong> ${booking.duration || 'N/A'} minutos</p>
                  </div>

                  <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #10b981;">
                    <p style="margin: 5px 0;"><strong>Monto total:</strong> $${totalAmount.toLocaleString('es-CL')}</p>
                    <p style="margin: 5px 0;"><strong>Comisión LegalUp (30%):</strong> $${legalUpCommission.toLocaleString('es-CL')}</p>
                    <p style="margin: 5px 0;"><strong>Monto abogado (70%):</strong> $${lawyerAmount.toLocaleString('es-CL')}</p>
                  </div>

                  <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #3b82f6;">
                    <p style="margin: 5px 0;"><strong>Booking ID:</strong> ${bookingId}</p>
                    <p style="margin: 5px 0;"><strong>Appointment ID:</strong> ${appointmentId || 'N/A'}</p>
                    <p style="margin: 5px 0;"><strong>Payment ID:</strong> ${paymentId}</p>
                    <p style="margin: 5px 0;"><strong>Fecha de pago:</strong> ${new Date(payment.date_created || new Date()).toLocaleString('es-CL')}</p>
                  </div>

                  <p style="font-size:11px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:16px;margin-top:32px;text-align:center;">
                    © 2026 LegalUp — Asesoría legal online en Chile.<br />
                    Todos los derechos reservados.<br />
                    Este es un correo automático de notificación administrativa.
                  </p>
                </div>
              </body>
            `
        });
        console.log('[webhook] step=admin_notification status=sent booking_id=' + bookingId);
      } catch (adminEmailError) {
        console.error('[webhook] step=admin_notification status=failed booking_id=' + bookingId, adminEmailError);
        // DO NOT interrupt main flow - admin email failure is non-critical
      }

      console.log('[webhook] step=complete booking_id=' + bookingId + ' appointment_id=' + (appointmentId || 'no') + ' meet_status=' + meetStatus);
    };

    if ((topic === 'payment' || topic === 'payment.created') && paymentId) {
      console.log('About to fetch payment from MercadoPago', paymentId);

      const response = await fetch(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.VITE_MERCADOPAGO_ACCESS_TOKEN}`
          }
        }
      );

      const payment = await response.json();
      console.log('MP payment status:', payment.status);

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
        // Replaced deprecated auth.admin.getUserByEmail with profiles lookup
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', userEmail)
          .maybeSingle();

        if (profile) clientUserId = profile.id;
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
        payment_status: 'approved',
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

// GET /api/admin/booking-leads-count
// Returns booking_leads count + daily timestamps using service role key (bypasses RLS)
app.get('/api/admin/booking-leads-count', async (req, res) => {
  try {
    const { start, end } = req.query;

    // Count with date filter
    let countQuery = supabase.from('booking_leads').select('*', { count: 'exact', head: true });
    if (start) countQuery = countQuery.gte('created_at', start);
    if (end) countQuery = countQuery.lte('created_at', end);

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('[/api/admin/booking-leads-count] Count error:', countError);
      return res.status(500).json({ error: countError.message });
    }

    // Fetch daily timestamps for chart aggregation
    let dailyQuery = supabase.from('booking_leads').select('created_at');
    if (start) dailyQuery = dailyQuery.gte('created_at', start);
    if (end) dailyQuery = dailyQuery.lte('created_at', end);

    const { data: dailyData, error: dailyError } = await dailyQuery;
    if (dailyError) {
      console.error('[/api/admin/booking-leads-count] Daily error:', dailyError);
    }

    return res.json({
      count: count || 0,
      daily: (dailyData || []).map(r => r.created_at)
    });
  } catch (err) {
    console.error('[/api/admin/booking-leads-count] Exception:', err);
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
            <body style="margin:0;padding:16px;background:#f9fafb;">
              <div style="max-width:580px;margin:0 auto;font-family:Inter,Arial,sans-serif;color:#111827;padding:28px;border:1px solid #e5e7eb;border-radius:12px;background:#ffffff;line-height:1.6;">
                  <div style="text-align:center;margin-bottom:28px;">
                      <img src="https://legalup.cl/apple-touch-icon.png" alt="LegalUp" style="height:40px;width:40px;vertical-align:middle;margin-right:10px;border:0;" />
                      <span style="color:#1a202c;font-size:22px;font-weight:800;vertical-align:middle;">LegalUp</span>
                  </div>
                  <h1 style="color: #101820; margin-bottom: 10px;">Hola ${fullName}.</h1>
            
            
                  <p style="color: #101820; line-height: 1.6; margin-bottom: 20px;">
                      Hemos notado que aún no has cargado ningún servicio en tu perfil de LegalUp. Para que los clientes puedan encontrarte y contratarte, es importante que completes esta información.
                  </p>
                
                  <div style="text-align: center; margin: 30px 0;">
                      <a href="${appUrl}/lawyer/services" 
                        style="background-color: #101820; color: white; padding: 12px 30px; 
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
              
                  <p style="font-size:11px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:16px;margin-top:32px;text-align:center;">
                      © 2026 LegalUp — Asesoría legal online en Chile.<br />
                      Todos los derechos reservados.<br />
                      Este es un correo automático de notificación administrativa.
                  </p>
              </div>
          </body>
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