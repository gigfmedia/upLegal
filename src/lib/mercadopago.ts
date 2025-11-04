import { MercadoPagoConfig, Preference } from 'mercadopago';

// Debug environment variables
console.log('=== MercadoPago Environment Check ===');
console.log('VITE_MERCADOPAGO_ENV:', import.meta.env.VITE_MERCADOPAGO_ENV);
console.log('Public Key:', import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY?.substring(0, 10) + '...');
console.log('Access Token:', import.meta.env.VITE_MERCADOPAGO_ACCESS_TOKEN?.substring(0, 10) + '...');
console.log('Is Production Environment:', import.meta.env.VITE_MERCADOPAGO_ENV === 'production');
console.log('==================================');

// Define types for MercadoPago
type PreferencePayer = {
  name?: string;
  surname?: string;
  email: string;
  phone?: {
    area_code: string;
    number: string;
  };
  identification?: {
    type: string;
    number: string;
  };
  address?: {
    zip_code: string;
    street_name: string;
    street_number: string;
  };
};

type PreferenceItem = {
  id?: string;
  title: string;
  description?: string;
  picture_url?: string;
  category_id?: string;
  quantity: number;
  currency_id: 'CLP' | 'ARS' | 'BRL' | 'MXN' | 'COP' | 'CLF' | 'PEN' | 'UYU';
  unit_price: number;
};

type CreatePreferenceData = {
  items: PreferenceItem[];
  payer: PreferencePayer;
  back_urls?: {
    success: string;
    failure: string;
    pending: string;
  };
  auto_return?: 'approved' | 'all';
  binary_mode?: boolean;
  notification_url?: string;
  statement_descriptor?: string;
  external_reference?: string;
};

// Force production mode
console.log('MercadoPago: Forcing PRODUCTION mode');
const accessToken = import.meta.env.VITE_MERCADOPAGO_ACCESS_TOKEN;

if (!accessToken) {
  console.error('MercadoPago access token is not defined');
  throw new Error('MercadoPago access token is not configured');
}

// Initialize MercadoPago client with production enforcement
export const mercadopago = new MercadoPagoConfig({
  accessToken,
  options: {
    timeout: 5000,
    idempotencyKey: 'some-idempotency-key',
    environment: 'production' // Force production environment
  },
});

// Test MercadoPago API connection
async function testMercadoPagoAPI() {
  try {
    const response = await fetch('https://api.mercadopago.com/v1/payment_methods', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    const data = await response.json();
    console.log('MercadoPago API Test Response:', data);
  } catch (error) {
    console.error('Error testing MercadoPago API:', error);
  }
}

testMercadoPagoAPI();

// Log the environment being used
console.group('MercadoPago Configuration');
console.log('Environment: PRODUCTION (Forced)');
console.log('Access Token:', accessToken ? `${accessToken.substring(0, 10)}...` : 'NOT SET');
console.log('Using Production Credentials:', accessToken?.startsWith('APP_USR-'));
console.log('Base URL:', import.meta.env.VITE_APP_URL || window.location.origin);
console.groupEnd();

// Check for sandbox credentials in production
if (accessToken?.startsWith('TEST-')) {
  console.error('WARNING: Using sandbox credentials in production mode!');
  throw new Error('Sandbox credentials detected in production mode!');
}

// Create a preference
export const createPreference = async (items: PreferenceItem[], payer: PreferencePayer) => {
  const preference = new Preference(mercadopago);
  
  try {
    // Convert items to match SDK's expected format
    const preferenceItems = items.map(item => ({
      id: item.id || Math.random().toString(36).substring(2, 9),
      title: item.title,
      description: item.description || '',
      quantity: item.quantity,
      currency_id: item.currency_id,
      unit_price: item.unit_price,
      ...(item.picture_url && { picture_url: item.picture_url }),
      ...(item.category_id && { category_id: item.category_id }),
    }));

    // Debug log environment and URLs
    console.log('MercadoPago Environment:', isProduction ? 'PRODUCTION' : 'SANDBOX');
    console.log('Using base URL:', import.meta.env.VITE_APP_URL || window.location.origin);
    
    // Force production URLs
    const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
    
    // Create preference data with proper typing
    const preferenceData: any = {
      binary_mode: true,
      auto_return: 'approved' as const,
      items: preferenceItems,
      payer: {
        ...payer,
        email: payer.email,
      },
      // Force production URLs
      back_urls: {
        success: `${baseUrl}/payment/success`,
        failure: `${baseUrl}/payment/failure`,
        pending: `${baseUrl}/payment/pending`,
      },
      // Force production webhook URL if in production
      ...(isProduction && import.meta.env.VITE_MERCADOPAGO_WEBHOOK_URL && {
        notification_url: import.meta.env.VITE_MERCADOPAGO_WEBHOOK_URL,
      }),
      // Force production settings
      ...(isProduction && {
        marketplace: 'NONE',
        processing_modes: ['aggregator'],
        integrator_id: import.meta.env.VITE_MERCADOPAGO_INTEGRATOR_ID,
        sponsor_id: import.meta.env.VITE_MERCADOPAGO_SPONSOR_ID,
        external_reference: `uplegal-${Date.now()}`,
        statement_descriptor: 'UPLEGAL',
      }),
    };

    // Debug log the preference data being sent
    console.log('Creating preference with data:', {
      ...preferenceData,
      payer: { ...preferenceData.payer, email: '[REDACTED]' } // Don't log full email
    });
    
    // Create preference
    const result = await preference.create({ body: preferenceData });
    
    // Debug log the response
    console.log('MercadoPago response:', {
      init_point: result.init_point ? '***init_point present***' : 'init_point missing',
      sandbox_init_point: result.sandbox_init_point ? '***sandbox_init_point present***' : 'sandbox_init_point missing',
      preference_id: result.id
    });
    
    // Always use production URL
    console.group('MercadoPago Production Flow');
    
    if (result.id) {
      const timestamp = Date.now();
      const prodUrl = `https://www.mercadopago.cl/checkout/v1/redirect?pref_id=${result.id}&ts=${timestamp}`;
      console.log('Redirecting to production URL:', prodUrl);
      console.groupEnd();
      
      // Force redirect immediately
      window.location.href = prodUrl;
      return prodUrl;
    }
    
    console.error('Failed to create production URL - missing preference ID');
    throw new Error('Failed to create production payment URL');
  } catch (error) {
    console.error('Error creating preference:', error);
    throw new Error('Failed to create payment preference');
  }
};

// Get payment status
export const getPaymentStatus = async (paymentId: string) => {
  try {
    const response = await fetch(`/api/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting payment status:', error);
    throw new Error('Failed to fetch payment status');
  }
};

// Format CLP currency
export const formatCLP = (amount: number): string => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(amount);
};
