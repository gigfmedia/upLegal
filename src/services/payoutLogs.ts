import { supabase } from '@/lib/supabaseClient';

export interface PayoutLog {
  id: string;
  created_at: string;
  status: string;
  total_amount: number;
  total_payments?: number;
  lawyer_user_id: string;
  metadata: {
    payment_ids: string[];
    error?: string;
    mercado_pago_reference?: string;
    [key: string]: any;
  };
  reference?: string;
  error?: string;
  [key: string]: any; // Para propiedades adicionales que puedan venir de Supabase
}

interface PayoutLogRow {
  id: string;
  created_at: string;
  status: string;
  total_amount: number;
  lawyer_user_id: string;
  metadata: {
    payment_ids?: string[];
    error?: string;
    mercado_pago_reference?: string;
    [key: string]: any;
  };
  reference?: string;
  error?: string;
  [key: string]: any;
}

export const fetchPayoutLogs = async (limit = 20): Promise<PayoutLog[]> => {
  const { data, error } = await supabase
    .from('payout_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching payout logs:', error);
    throw error;
  }

  // Convertir los datos a PayoutLog
  return (data as PayoutLogRow[] || []).map(log => ({
    ...log,
    total_payments: log.metadata?.payment_ids?.length || 0,
    metadata: {
      payment_ids: log.metadata?.payment_ids || [],
      error: log.metadata?.error,
      mercado_pago_reference: log.metadata?.mercado_pago_reference,
      ...log.metadata
    }
  }));
};

export const triggerManualPayout = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-weekly-payouts`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cron-secret': import.meta.env.VITE_PAYOUT_CRON_SECRET,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ manual_trigger: true }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }

    return { success: true };
  } catch (error) {
    console.error('Error triggering manual payout:', error);
    return { success: false, error: error.message };
  }
};
