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

// Determine environment and select appropriate token
const isProduction = import.meta.env.VITE_MERCADOPAGO_ENV === 'production';
const accessToken = isProduction 
  ? import.meta.env.VITE_MERCADOPAGO_ACCESS_TOKEN
  : import.meta.env.VITE_MERCADOPAGO_ACCESS_TOKEN_SANDBOX;

if (!accessToken) {
  console.error('MercadoPago access token is not defined');
  throw new Error('MercadoPago access token is not configured');
}

// Initialize MercadoPago client
export const mercadopago = new MercadoPagoConfig({
  accessToken,
  options: {
    timeout: 5000,
    idempotencyKey: 'upegal-legal-services',
  },
});

// Log the environment being used
console.group('MercadoPago Configuration');
console.log('Environment:', isProduction ? 'PRODUCTION' : 'SANDBOX');
console.log('Access Token:', accessToken ? `${accessToken.substring(0, 10)}...` : 'NOT SET');
console.log('Is Production:', isProduction);
console.log('Using Production Credentials:', accessToken?.startsWith('APP_USR-'));
console.log('Base URL:', import.meta.env.VITE_APP_URL || window.location.origin);
console.groupEnd();

// Ensure we're using the correct environment
if (isProduction && accessToken?.startsWith('TEST-')) {
  console.error('WARNING: Using sandbox credentials in production mode!');
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
    
    // Create preference data with proper typing
    const preferenceData: any = {
      binary_mode: true,
      auto_return: 'approved' as const, // Explicitly type as 'approved' literal
      items: preferenceItems,
      payer: {
        ...payer,
        email: payer.email, // Email is required in our type
      },
      back_urls: {
        success: `${import.meta.env.VITE_APP_URL || window.location.origin}/payment/success`,
        failure: `${import.meta.env.VITE_APP_URL || window.location.origin}/payment/failure`,
        pending: `${import.meta.env.VITE_APP_URL || window.location.origin}/payment/pending`,
      },
      ...(import.meta.env.VITE_MERCADOPAGO_WEBHOOK_URL && {
        notification_url: import.meta.env.VITE_MERCADOPAGO_WEBHOOK_URL,
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
    
    // In production, ensure we're using the production URL
    if (isProduction) {
      // Always use init_point in production, never sandbox_init_point
      if (result.init_point) {
        const paymentUrl = new URL(result.init_point);
        
        // Force production domain and HTTPS
        paymentUrl.hostname = 'www.mercadopago.cl';
        paymentUrl.protocol = 'https:';
        
        // Ensure no sandbox in the URL
        const finalUrl = paymentUrl.toString().replace('sandbox.', '');
        
        console.log('Using production URL:', finalUrl);
        return finalUrl;
      }
      
      // If we don't have init_point, try to construct it from the preference ID
      if (result.id) {
        const prodUrl = `https://www.mercadopago.cl/checkout/v1/redirect?pref_id=${result.id}`;
        console.log('Constructed production URL from preference ID:', prodUrl);
        return prodUrl;
      }
      
      // If we get here, we couldn't create a valid URL
      console.error('Failed to create valid production URL', {
        preferenceId: result.id,
        hasInitPoint: !!result.init_point,
        hasSandboxInitPoint: !!result.sandbox_init_point
      });
      throw new Error('Failed to create valid production payment URL');
    }
    
    // In development/sandbox mode
    if (!result.sandbox_init_point) {
      console.error('sandbox_init_point is missing in development mode', result);
      throw new Error('Failed to get sandbox payment URL');
    }
    return result.sandbox_init_point;
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
