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
        success: `${window.location.origin}/payment/success`,
        failure: `${window.location.origin}/payment/failure`,
        pending: `${window.location.origin}/payment/pending`,
      },
      ...(import.meta.env.VITE_MERCADOPAGO_WEBHOOK_URL && {
        notification_url: import.meta.env.VITE_MERCADOPAGO_WEBHOOK_URL,
      }),
    };

    // Create preference
    const result = await preference.create({ body: preferenceData });
    
    // Always use init_point in production, fallback to sandbox_init_point in development
    if (isProduction) {
      if (!result.init_point) {
        console.error('init_point is missing in production mode', result);
        throw new Error('Failed to get production payment URL');
      }
      return result.init_point;
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
