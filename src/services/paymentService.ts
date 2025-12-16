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

export const getAllPayments = async (): Promise<PaymentWithDetails[]> => {
  // First, get all payments
  const { data: payments, error: paymentsError } = await supabase
    .from('payments')
    .select('*')
    .order('created_at', { ascending: false });

  if (paymentsError) {
    console.error('Error fetching payments:', paymentsError);
    throw new Error('Failed to fetch payments');
  }

  if (!payments || payments.length === 0) {
    return [];
  }

  // Get unique user and lawyer IDs
  const userIds = [...new Set(payments.map(p => p.client_user_id))];
  const lawyerIds = [...new Set(payments.map(p => p.lawyer_user_id))];
  const serviceIds = payments.map(p => p.service_id).filter(Boolean) as string[];

  // Function to fetch user data with email from auth.users
  const fetchUserData = async (userIds: string[]) => {
    if (userIds.length === 0) return [];
    
    const { data, error } = await supabase
      .from('auth.users')
      .select(`
        id,
        email,
        raw_user_meta_data->>full_name as full_name,
        raw_user_meta_data->>avatar_url as avatar_url
      `)
      .in('id', userIds);

    if (error) {
      console.error('Error fetching users:', error);
      throw new Error('Failed to fetch user data');
    }

    return data.map(user => ({
      id: user.id,
      email: user.email || '',
      full_name: user.full_name || 'Usuario',
      avatar_url: user.avatar_url || ''
    }));
  };

  // Fetch users and lawyers data in parallel
  const [usersData, lawyersData] = await Promise.all([
    fetchUserData(userIds),
    fetchUserData(lawyerIds)
  ]);

  // Fetch services data if there are any service IDs
  let servicesData: any[] = [];
  if (serviceIds.length > 0) {
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .in('id', serviceIds);

    if (servicesError) {
      console.error('Error fetching services:', servicesError);
      // Continue without services data if there's an error
    } else {
      servicesData = services || [];
    }
  }

  // Create maps for quick lookup
  const usersMap = new Map(usersData.map(user => [user.id, user]));
  const lawyersMap = new Map(lawyersData.map(lawyer => [lawyer.id, lawyer]));
  const servicesMap = new Map(servicesData.map(service => [service.id, service]));

  // Combine the data
  return payments.map(payment => ({
    ...payment,
    user: {
      id: usersMap.get(payment.client_user_id)?.id || payment.client_user_id,
      email: usersMap.get(payment.client_user_id)?.email || '',
      full_name: usersMap.get(payment.client_user_id)?.full_name || 'Usuario',
      avatar_url: usersMap.get(payment.client_user_id)?.avatar_url || ''
    },
    lawyer: {
      id: lawyersMap.get(payment.lawyer_user_id)?.id || payment.lawyer_user_id,
      email: lawyersMap.get(payment.lawyer_user_id)?.email || '',
      full_name: lawyersMap.get(payment.lawyer_user_id)?.full_name || 'Abogado',
      avatar_url: lawyersMap.get(payment.lawyer_user_id)?.avatar_url || ''
    },
    service: payment.service_id ? servicesMap.get(payment.service_id) || null : null
  }));
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
