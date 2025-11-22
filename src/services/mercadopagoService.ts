import { supabase } from '@/lib/supabaseClient';

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

export const createMercadoPagoPayment = async (params: CreatePaymentParams) => {
  try {
    const API_BASE_URL = 'https://uplegal.netlify.app';

    const response = await fetch(`${API_BASE_URL}/create-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      mode: 'cors',
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create payment');
    }

    return await response.json();
  } catch (error) {
    console.error('Error in createMercadoPagoPayment:', error);
    throw new Error(error.message || 'Error creating payment');
  }
};