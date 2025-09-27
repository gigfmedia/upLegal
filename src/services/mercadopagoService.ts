import { createPreference, getPaymentStatus } from '@/lib/mercadopago';
import { supabase } from '@/lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';

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

export async function createMercadoPagoPayment({
  amount,
  userId,
  lawyerId,
  serviceId,
  description,
  successUrl,
  failureUrl,
  pendingUrl,
  notificationUrl,
  userEmail,
  userName,
}: CreatePaymentParams) {
  // Generate a unique ID for this payment
  const paymentId = `upegal-${uuidv4()}`;
  
  // Calculate platform fee (20%)
  const platformFee = Math.round(amount * 0.2);
  const lawyerAmount = amount - platformFee;

  try {
    // Create a payment record in the database
    const { data: payment, error } = await supabase
      .from('payments')
      .insert({
        id: paymentId,
        user_id: userId,
        lawyer_id: lawyerId,
        service_id: serviceId,
        amount,
        platform_fee: platformFee,
        lawyer_amount: lawyerAmount,
        currency: 'CLP',
        status: 'pending',
        payment_provider: 'mercadopago',
        metadata: {
          description,
        },
      })
      .select()
      .single();

    if (error) throw error;

    // Create MercadoPago preference
    const preference = await createPreference({
      items: [
        {
          id: serviceId || 'legal-service',
          title: description.substring(0, 255) || 'Servicio Legal',
          quantity: 1,
          unit_price: amount,
          description: description.substring(0, 500),
          currency_id: 'CLP',
        },
      ],
      payer: {
        email: userEmail,
        name: userName,
      },
      external_reference: paymentId,
      notification_url: notificationUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/api/payments/mercadopago/webhook`,
      back_urls: {
        success: successUrl,
        failure: failureUrl,
        pending: pendingUrl,
      },
      auto_return: 'approved',
    });

    return {
      paymentId,
      initPoint: preference.init_point || preference.sandbox_init_point,
      preferenceId: preference.id,
    };
  } catch (error) {
    console.error('Error creating MercadoPago payment:', error);
    throw error;
  }
}

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
