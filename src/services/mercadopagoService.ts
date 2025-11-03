import { createPreference, getPaymentStatus } from '@/lib/mercadopago';
import { supabase } from '@/lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import type { PreferenceItem, PreferencePayer } from '@/lib/mercadopago';

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
  
  // Calculate amounts with 10% client surcharge
  const clientAmount = Math.round(amount * 1.1); // Add 10% surcharge
  const platformFee = Math.round(amount * 0.2); // 20% of original amount
  const lawyerAmount = amount - platformFee; // Original amount minus platform fee

  try {
    // Create a payment record in the database
    const { data: payment, error } = await supabase
      .from('payments')
      .insert({
        id: paymentId,
        user_id: userId,
        lawyer_id: lawyerId,
        service_id: serviceId,
        amount: clientAmount, // Store the amount with surcharge
        original_amount: amount, // Store the original amount without surcharge
        client_surcharge: Math.round(amount * 0.1), // Store the 10% surcharge amount
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

    // Prepare items for MercadoPago
    const items: PreferenceItem[] = [{
      id: serviceId,
      title: description.substring(0, 255) || 'Servicio Legal',
      description: description.substring(0, 500),
      quantity: 1,
      currency_id: 'CLP',
      unit_price: clientAmount,
    }];

    // Prepare payer info
    const payer: PreferencePayer = {
      email: userEmail,
      ...(userName && { name: userName }),
    };

    // Create MercadoPago preference
    const preferenceUrl = await createPreference(items, payer);

    // Update payment record with preference URL
    const { error: updateError } = await supabase
      .from('payments')
      .update({ payment_link: preferenceUrl })
      .eq('id', paymentId);

    if (updateError) {
      console.error('Error updating payment record:', updateError);
      throw updateError;
    }

    return {
      paymentId,
      paymentUrl: preferenceUrl,
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
