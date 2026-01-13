import { supabase } from '@/lib/supabaseClient';

// Types
export interface CreatePaymentParams {
  amount: number;
  userId: string;
  lawyerId: string;
  appointmentId: string;
  description: string;
  successUrl: string;
  failureUrl: string;
  pendingUrl: string;
  userEmail: string;
  userName?: string;
}

interface MercadoPagoOAuthResponse {
  access_token: string;
  refresh_token: string;
  public_key: string;
  user_id: number;
  expires_in: number;
  scope: string;
  token_type: string;
}

interface MercadoPagoUserResponse {
  id: number;
  email: string;
  nickname: string;
  first_name: string;
  last_name: string;
  identification: {
    type: string;
    number: string;
  };
  address: {
    zip_code: string;
    street_name: string;
    street_number: string;
  };
  phone: {
    area_code: string;
    number: string;
  };
}

// OAuth Functions
export const getMercadoPagoAuthUrl = (): string => {
  const clientId = import.meta.env.VITE_MERCADOPAGO_CLIENT_ID || '';
  const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
  const redirectUri = encodeURIComponent(`${appUrl}/api/mercadopago/oauth/callback`);
  const state = Math.random().toString(36).substring(2);
  
  // Save state to localStorage for validation
  localStorage.setItem('mp_auth_state', state);
  
  // Construir la URL de autenticación
  const authUrl = new URL('https://www.mercadopago.cl/integrations/v1/web-plataform');
  authUrl.searchParams.append('client_id', clientId);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('platform_id', 'mp');
  authUrl.searchParams.append('state', state);
  authUrl.searchParams.append('redirect_uri', `${appUrl}/api/mercadopago/oauth/callback`);
  
  console.log('MercadoPago Auth URL:', authUrl.toString());
  return authUrl.toString();
};

export const exchangeCodeForToken = async (code: string): Promise<MercadoPagoOAuthResponse> => {
  const response = await fetch('/api/mercadopago/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    throw new Error('Error al intercambiar código por token');
  }

  return response.json();
};

export const getMercadoPagoUser = async (accessToken: string): Promise<MercadoPagoUserResponse> => {
  const response = await fetch('/api/mercadopago/user', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Error al obtener información del usuario de MercadoPago');
  }

  return response.json();
};

// Payment Functions
export const createMercadoPagoPayment = async (params: CreatePaymentParams) => {
  try {
    // Use the backend API URL, not the frontend URL
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
    const normalizedBaseUrl = apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl;
    const endpoint = `${normalizedBaseUrl}/create-payment`;

    console.log('Creating payment at endpoint:', endpoint);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || 'Failed to create payment');
    }

    const data = await response.json();
    console.log('Payment created successfully:', data);
    return data;
  } catch (error) {
    console.error('Error in createMercadoPagoPayment:', error);
    throw new Error(error instanceof Error ? error.message : 'Error creating payment');
  }
};