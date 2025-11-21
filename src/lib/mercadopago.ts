import { MercadoPagoConfig, Preference } from 'mercadopago';

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
    const baseUrl = 'https://uplegal.netlify.app'; // Production URL
    console.log(`Fetching payment methods from: ${baseUrl}/api/payment-methods`);
    
    const response = await fetch(`${baseUrl}/api/payment-methods`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      mode: 'cors' // Ensure CORS mode is enabled
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('MercadoPago API Response:', data);
    return data;
  } catch (error) {
    console.error('Error in testMercadoPagoAPI:', error);
    
    // Log to error tracking in production
    if (process.env.NODE_ENV === 'production') {
      // Example with Sentry (uncomment and configure if using Sentry)
      // Sentry.captureException(error);
      
      // Or log to a service
      console.error('MercadoPago API Error:', {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        // Add any relevant context
        ...(error.response && { 
          status: error.response.status,
          statusText: error.response.statusText 
        })
      });
    }
    
    throw new Error(`Failed to fetch payment methods: ${error.message}`);
  }
}

testMercadoPagoAPI();

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
