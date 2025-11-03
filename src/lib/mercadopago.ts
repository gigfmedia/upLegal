import { MercadoPagoConfig, Preference } from 'mercadopago';

// Get environment variables
const isProduction = import.meta.env.VITE_MERCADOPAGO_ENV === 'production';
const accessToken = isProduction 
  ? import.meta.env.VITE_MERCADOPAGO_ACCESS_TOKEN
  : import.meta.env.VITE_MERCADOPAGO_ACCESS_TOKEN_SANDBOX;

if (!accessToken) {
  throw new Error('MercadoPago access token is not defined');
}

// Initialize MercadoPago client
export const mercadopago = new MercadoPagoConfig({
  accessToken,
  options: {
    timeout: 5000,
    idempotencyKey: 'upegal-legal-services',
  },
});

// Log environment for debugging
console.log(`MercadoPago initialized in ${isProduction ? 'PRODUCTION' : 'SANDBOX'} mode`);

// Types for MercadoPago preference
interface PreferenceItem {
  id: string;
  title: string;
  quantity: number;
  unit_price: number;
  description?: string;
  currency_id?: 'CLP' | 'USD';
}

interface CreatePreferenceData {
  items: PreferenceItem[];
  payer?: {
    name?: string;
    surname?: string;
    email?: string;
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
      street_number: number;
    };
  };
  payment_methods?: {
    excluded_payment_methods?: { id: string }[];
    excluded_payment_types?: { id: string }[];
    installments?: number;
    default_installments?: number;
  };
  back_urls?: {
    success: string;
    pending: string;
    failure: string;
  };
  auto_return?: 'approved' | 'all';
  external_reference?: string;
  notification_url?: string;
  statement_descriptor?: string;
  binary_mode?: boolean;
  expires?: boolean;
  metadata?: Record<string, unknown>;
}

// Create a preference for payment
export async function createPreference(data: CreatePreferenceData) {
  try {
    const preference = new Preference(mercadopago);
    
    // Add default values
    const preferenceData = {
      ...data,
      binary_mode: true,
      auto_return: data.auto_return || 'approved',
    };

    const response = await preference.create({ body: preferenceData });
    return response;
  } catch (error) {
    console.error('Error creating MercadoPago preference:', error);
    throw error;
  }
}

// Verify payment status
export async function getPaymentStatus(paymentId: string) {
  try {
    const response = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting payment status:', error);
    throw error;
  }
}

// Format amount to CLP (Chilean Peso)
export function formatCLP(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(amount);
}
  }>;
  payer?: {
    name?: string;
    surname?: string;
    email: string;
    phone?: {
      area_code: string;
      number: string;
    };
    address?: {
      zip_code: string;
      street_name: string;
      street_number: string;
    };
  };
  external_reference?: string;
  notification_url?: string;
  back_urls?: {
    success: string;
    pending: string;
    failure: string;
  };
  auto_return?: 'approved' | 'all';
}) {
  try {
    const preference = new Preference(mercadopago);
    
    // Add default values
    const preferenceData = {
      ...data,
      payment_methods: {
        installments: 12, // Max installments
        excluded_payment_methods: [
          { id: 'amex' }, // Exclude AMEX which is not common in Chile
        ],
        excluded_payment_types: [],
        // Only allow payment methods available in Chile
        payment_methods: [
          { id: 'webpay' },
          { id: 'servipag' },
          { id: 'khipu' },
          { id: 'multicaja' },
          { id: 'santander' },
          { id: 'bancodigital' },
          { id: 'bancodigital_inst' },
          { id: 'bancodigital_webpay' },
          { id: 'bancodigital_servipag' },
          { id: 'bancodigital_khipu' },
          { id: 'bancodigital_multicaja' },
          { id: 'bancodigital_santander' },
        ],
      },
      auto_return: 'approved',
      binary_mode: true, // Only allow completed or failed payments
      statement_descriptor: 'UPLEGAL',
    };

    const response = await preference.create({ body: preferenceData });
    return response;
  } catch (error) {
    console.error('Error creating MercadoPago preference:', error);
    throw error;
  }
}

// Verify payment status
export async function getPaymentStatus(paymentId: string) {
  try {
    const response = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Error fetching payment status');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting payment status:', error);
    throw error;
  }
}

// Format amount to CLP (Chilean Peso)
export function formatCLP(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
