import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';

export interface ProPayment {
  id: string;
  paid_at: string | null;
  amount_clp: number;
  currency: string;
  status: string;
  provider_payment_id: string | null;
  provider_authorized_payment_id: string;
  plan: string | null;
}

const HISTORY_LIMIT = 10;

/**
 * FASE 5.2G — historial de cobros Pro desde pro_subscription_payments.
 * RLS (lawyer_id = auth.uid()) es la autoridad; el frontend nunca pasa
 * IDs arbitrarios ni usa claves privilegiadas. Orden desc por paid_at.
 */
export function useProPaymentHistory() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<ProPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('pro_subscription_payments')
        .select('id,paid_at,amount_clp,currency,status,provider_payment_id,provider_authorized_payment_id,plan')
        .eq('lawyer_id', user.id)
        .order('paid_at', { ascending: false, nullsFirst: false });
      if (error) throw error;
      setPayments((data || []) as ProPayment[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos cargar tu historial de pagos.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return { payments, loading, error, initialLimit: HISTORY_LIMIT };
}
