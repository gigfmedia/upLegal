import { supabase } from '@/lib/supabaseClient';
import { createClient } from '@supabase/supabase-js';
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

export const getAllPaymentsAndAppointments = async (): Promise<PaymentWithDetails[]> => {
  console.log('getAllPaymentsAndAppointments: Starting to fetch...');
  
  // Use service role key for admin operations to bypass RLS
  const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  
  if (!serviceRoleKey || !supabaseUrl) {
    console.error('Missing service role key for admin operations');
    throw new Error('Admin access requires service role key');
  }
  
  // Create admin client with service role key
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  });
  
  // Get all payments
  const { data: payments, error: paymentsError } = await adminClient
    .from('payments')
    .select('*')
    .order('created_at', { ascending: false });

  console.log('Payments data:', payments);
  console.log('Payments error:', paymentsError);

  // Get all paid appointments that don't have payments
  const { data: paidAppointments, error: appointmentsError } = await adminClient
    .from('appointments')
    .select('*')
    .eq('consultation_type', 'paid')
    .eq('status', 'confirmed')
    .is('amount', null)
    .order('created_at', { ascending: false });

  console.log('Paid appointments without payments:', paidAppointments);
  console.log('Appointments error:', appointmentsError);

  if (paymentsError) {
    console.error('Error fetching payments:', paymentsError);
    throw new Error('Failed to fetch payments');
  }

  if (appointmentsError) {
    console.error('Error fetching appointments:', appointmentsError);
  }

  // Filter out appointments that already have corresponding payments
  const paymentExternalIds = new Set((payments || []).map(p => p.external_reference).filter(Boolean));
  
  // Also filter by checking if there's already a payment for the same user_id and amount
  const appointmentsWithoutPayments = (paidAppointments || []).filter(appointment => {
    // First check external_reference
    if (paymentExternalIds.has(appointment.id.toString())) {
      return false;
    }
    
    // Then check if there's already a payment for this user with the same amount
    const hasMatchingPayment = (payments || []).some(payment => 
      payment.user_id === appointment.user_id && 
      payment.amount === appointment.price
    );
    
    return !hasMatchingPayment;
  });

  console.log('Payment external_reference IDs:', Array.from(paymentExternalIds));
  console.log('Paid appointments IDs:', (paidAppointments || []).map(a => a.id));
  console.log('Appointments filtered (without existing payments):', appointmentsWithoutPayments);

  const allTransactions = [...(payments || []), ...appointmentsWithoutPayments];
  
  console.log('Total transactions:', allTransactions.length);

  // Get unique user and lawyer IDs
  const userIds = [...new Set(allTransactions.map(p => p.user_id).filter(Boolean))] as string[];
  const lawyerIds = [...new Set(allTransactions.map(p => p.lawyer_id).filter(Boolean))] as string[];
  const serviceIds = allTransactions.map(p => p.service_id).filter(Boolean) as string[];

  console.log('userIds:', userIds);
  console.log('lawyerIds:', lawyerIds);
  console.log('serviceIds:', serviceIds);

  // Function to fetch user data from profiles (auth.users is not accessible from the frontend)
  const fetchUserData = async (ids: string[]) => {
    const cleanIds = (ids || []).filter((id): id is string => Boolean(id));
    if (cleanIds.length === 0) return [];

    try {
      const [{ data: byUserId, error: byUserIdError }, { data: byId, error: byIdError }] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, user_id, email, display_name, first_name, last_name, avatar_url')
          .in('user_id', cleanIds),
        supabase
          .from('profiles')
          .select('id, user_id, email, display_name, first_name, last_name, avatar_url')
          .in('id', cleanIds)
      ]);

      if (byUserIdError) console.error('Error fetching users by user_id:', byUserIdError);
      if (byIdError) console.error('Error fetching users by id:', byIdError);

      const combined = [...(byUserId || []), ...(byId || [])];
      const uniqueByProfileId = new Map<string, {
        id?: string;
        user_id?: string;
        email?: string;
        display_name?: string;
        first_name?: string;
        last_name?: string;
        avatar_url?: string;
      }>();
      for (const row of combined) {
        if (!row?.id) continue;
        if (!uniqueByProfileId.has(row.id)) uniqueByProfileId.set(row.id, row);
      }

      return Array.from(uniqueByProfileId.values()).map((p) => {
        const fullName = (p.display_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Usuario') as string;
        return {
          id: p.user_id || p.id,
          email: p.email || '',
          full_name: fullName,
          avatar_url: p.avatar_url || ''
        };
      });
    } catch (error) {
      console.error('Error fetching users from profiles:', error);
      return [];
    }
  };

  // Fetch users and lawyers data in parallel
  const [usersData, lawyersData] = await Promise.all([
    fetchUserData(userIds),
    fetchUserData(lawyerIds)
  ]);

  // Fetch services data if there are any service IDs
  let servicesData: {
    id: string;
    title?: string;
    description?: string;
    price?: number;
    category?: string;
  }[] = [];
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

  // Combine data for all transactions
  return allTransactions.map((transaction, index) => {
    console.log(`Processing transaction ${index}:`, {
      id: transaction.id,
      name: transaction.name,
      email: transaction.email,
      isAppointment: !!(transaction.name && transaction.email)
    });
    
    // Handle appointments differently
    if (transaction.name && transaction.email) {
      // This is an appointment
      return {
        id: transaction.id,
        user_id: transaction.user_id || '',
        lawyer_id: transaction.lawyer_id || '',
        service_id: null,
        amount: transaction.price || 0,
        original_amount: transaction.price || 0,
        client_surcharge: 0,
        client_surcharge_percent: 0.1,
        platform_fee: Math.round((transaction.price || 0) * 0.2),
        platform_fee_percent: 0.2,
        lawyer_amount: Math.round((transaction.price || 0) * 0.8),
        currency: transaction.currency || 'clp',
        status: 'succeeded' as const,
        metadata: {},
        created_at: transaction.created_at,
        updated_at: transaction.updated_at,
        user: {
          id: transaction.user_id || '',
          full_name: transaction.name || 'Usuario',
          email: transaction.email || '',
          avatar_url: ''
        },
        lawyer: {
          id: transaction.lawyer_id || '',
          full_name: 'Abogado',
          email: '',
          avatar_url: ''
        },
        service: null,
        service_description: `Consulta - ${transaction.name}`,
        total_amount: transaction.price || 0
      };
    } else {
      // This is a regular payment
      console.log(`Processing regular payment ${index}:`, {
        id: transaction.id,
        user_id: transaction.user_id,
        lawyer_id: transaction.lawyer_id,
        amount: transaction.amount,
        total_amount: transaction.total_amount
      });
      
      const user = usersMap.get(transaction.user_id);
      const lawyer = lawyersMap.get(transaction.lawyer_id);
      const service = transaction.service_id ? servicesMap.get(transaction.service_id) || null : null;
      
      return {
        ...transaction,
        user: {
          id: user?.id || transaction.user_id,
          email: user?.email || '',
          full_name: user?.full_name || 'Usuario',
          avatar_url: user?.avatar_url || ''
        },
        lawyer: {
          id: lawyer?.id || transaction.lawyer_id,
          email: lawyer?.email || '',
          full_name: lawyer?.full_name || 'Abogado',
          avatar_url: lawyer?.avatar_url || ''
        },
        service: service,
        service_description: transaction.service_description || 'Servicio',
        total_amount: transaction.total_amount || transaction.amount || 0
      };
    }
  });
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
      pendingTransfers: 0
    };
  }

  const earnings = data as {
    total_earnings?: number;
    available_balance?: number;
    pending_transfers?: number;
  };
  
  return {
    totalEarnings: earnings.total_earnings || 0,
    availableBalance: earnings.available_balance || 0,
    pendingTransfers: earnings.pending_transfers || 0
  };
};
