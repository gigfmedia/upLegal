import { createPreference, getPaymentStatus } from '@/lib/mercadopago';
import { supabase } from '@/lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import type { PreferenceItem, PreferencePayer } from '@/lib/mercadopago';

// Define types for database columns
interface TableColumn {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

interface TableInfo {
  columns: TableColumn[];
}

export interface CreatePaymentParams {
  amount: number; // in CLP
  userId: string;
  lawyerId: string;
  serviceId?: string;
  description: string;
  successUrl: string;
  failureUrl: string;
  pendingUrl: string;
  notificationUrl?: string;
  userEmail: string;
  userName?: string;
}

const API_BASE_URL = 'https://uplegal.netlify.app'; // Production URL

export const createMercadoPagoPayment = async (params: CreatePaymentParams & { appointmentId: string }) => {
  try {
    const paymentData = {
      amount: params.amount,
      description: params.description,
      user_id: params.userId,
      lawyer_id: params.lawyerId,
      appointment_id: params.appointmentId,
      success_url: params.successUrl,
      failure_url: params.failureUrl,
      pending_url: params.pendingUrl,
      user_email: params.userEmail,
      user_name: params.userName || ''
    };

    console.log('Sending payment data to production:', paymentData);

    const response = await fetch(`${API_BASE_URL}/create-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      mode: 'cors',
      body: JSON.stringify(paymentData)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Payment API error:', errorData);
      throw new Error(errorData.error || 'Failed to create payment');
    }

    return await response.json();
  } catch (error) {
    console.error('Error in createMercadoPagoPayment:', error);
    
    // Log to error tracking in production
    if (process.env.NODE_ENV === 'production') {
      // Example with Sentry (uncomment and configure if using Sentry)
      // Sentry.captureException(error);
      
      // Or log to a service
      console.error('Payment Error:', {
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
    
    throw new Error(error.message || 'Error creating payment');
  }
};

interface MercadoPagoWebhookData {
  type: string;
  data: {
    id: string;
  };
}

export async function handleMercadoPagoWebhook(data: MercadoPagoWebhookData) {
  try {
    const { type, data: { id } } = data;
    
    if (type === 'payment') {
      // Get payment details from MercadoPago
      const payment = await getPaymentStatus(id);
      const { external_reference: paymentId, status, status_detail } = payment;
      
      // Map MercadoPago status to our status
      let paymentStatus: 'pending' | 'succeeded' | 'failed' | 'refunded' | 'in_process';
      
      switch (status) {
        case 'approved':
          paymentStatus = 'succeeded';
          break;
        case 'pending':
        case 'in_process':
          paymentStatus = 'pending';
          break;
        case 'rejected':
        case 'cancelled':
          paymentStatus = 'failed';
          break;
        case 'refunded':
          paymentStatus = 'refunded';
          break;
        default:
          paymentStatus = 'pending';
      }

      // Update payment in database
      const { data: updatedPayment, error } = await supabase
        .from('payments')
        .update({
          status: paymentStatus,
          metadata: {
            mercadopago_payment_id: id,
            status_detail: status_detail,
            raw_response: payment,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', paymentId)
        .select('*')
        .single();

      if (error) throw error;

      // If payment succeeded, update lawyer's balance
      if (paymentStatus === 'succeeded' && updatedPayment) {
        try {
          // Get current balance
          const { data: profileData, error: fetchError } = await supabase
            .from('profiles')
            .select('balance')
            .eq('id', updatedPayment.lawyer_user_id)
            .single();

          if (fetchError) throw fetchError;

          // Calculate new balance
          const currentBalance = profileData?.balance || 0;
          const newBalance = currentBalance + (updatedPayment.lawyer_amount || 0);

          // Update balance
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ 
              balance: newBalance,
              updated_at: new Date().toISOString()
            })
            .eq('id', updatedPayment.lawyer_user_id);

          if (updateError) throw updateError;
          
        } catch (error) {
          console.error('Error updating lawyer balance:', error);
          // Log the error but don't fail the webhook
        }
      }

      return { success: true, payment: updatedPayment };
    }

    return { success: false, message: 'Unhandled webhook type' };
  } catch (error) {
    console.error('Error handling MercadoPago webhook:', error);
    throw error;
  }
}
