import { supabase } from '@/lib/supabaseClient';
import { CreatePaymentInput, Payment, PaymentWithDetails } from '@/types/payment';

export const createPayment = async (input: CreatePaymentInput): Promise<Payment> => {
  const { data, error } = await supabase
    .from('payments')
    .insert({
      user_id: input.userId,
      lawyer_id: input.lawyerId,
      service_id: input.serviceId,
      amount: input.amount,
      platform_fee: input.platformFee,
      lawyer_amount: input.lawyerAmount,
      currency: input.currency || 'CLP',
      status: 'pending',
      metadata: input.metadata || {},
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating payment:', error);
    throw new Error('Failed to create payment');
  }

  return data as Payment;
};

export const getPaymentById = async (paymentId: string): Promise<PaymentWithDetails | null> => {
  const { data, error } = await supabase
    .from('payments')
    .select(`
      *,
      user:user_id (id, full_name, email),
      lawyer:lawyer_id (id, full_name, email),
      service:service_id (id, title, description)
    `)
    .eq('id', paymentId)
    .single();

  if (error) {
    console.error('Error fetching payment:', error);
    return null;
  }

  return data as unknown as PaymentWithDetails;
};

export const updatePaymentStatus = async (
  paymentId: string,
  status: Payment['status']
): Promise<Payment | null> => {
  const updates: Partial<Payment> = {
    status,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('payments')
    .update(updates)
    .eq('id', paymentId)
    .select()
    .single();

  if (error) {
    console.error('Error updating payment status:', error);
    return null;
  }

  return data as Payment;
};

export const getPaymentsByUser = async (userId: string): Promise<PaymentWithDetails[]> => {
  const { data, error } = await supabase
    .from('payments')
    .select(`
      *,
      user:user_id (id, full_name, email),
      lawyer:lawyer_id (id, full_name, email),
      service:service_id (id, title, description)
    `)
    .or(`user_id.eq.${userId},lawyer_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user payments:', error);
    return [];
  }

  return data as unknown as PaymentWithDetails[];
};

export const getLawyerEarnings = async (lawyerId: string): Promise<{
  totalEarnings: number;
  availableBalance: number;
  pendingTransfers: number;
}> => {
  const { data, error } = await supabase
    .rpc('get_lawyer_earnings', { lawyer_id: lawyerId })
    .single();

  if (error) {
    console.error('Error fetching lawyer earnings:', error);
    return {
      totalEarnings: 0,
      availableBalance: 0,
      pendingTransfers: 0,
    };
  }

  return {
    totalEarnings: data?.total_earnings || 0,
    availableBalance: data?.available_balance || 0,
    pendingTransfers: data?.pending_transfers || 0,
  };
};
