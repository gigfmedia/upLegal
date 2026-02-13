import { supabase } from '@/lib/supabaseClient';

export type PaymentEventType = 'started' | 'success' | 'failure' | 'pending';

interface PaymentEventParams {
  event_type: PaymentEventType;
  user_id?: string;
  appointment_id?: string;
  payment_id?: string;
  status?: string;
  amount?: number;
  metadata?: Record<string, any>;
}

/**
 * Logs a payment-related event to the database for analytics.
 */
export const logPaymentEvent = async (params: PaymentEventParams) => {
  try {
    const { error } = await supabase.from('payment_events').insert({
      event_type: params.event_type,
      user_id: params.user_id,
      appointment_id: params.appointment_id,
      payment_id: params.payment_id,
      status: params.status,
      amount: params.amount,
      metadata: params.metadata || {}
    });

    if (error) {
      console.error('Error logging payment event:', error);
    }
  } catch (err) {
    console.error('Unexpected error logging payment event:', err);
  }
};
