import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';

export type CaseStatus = 'new' | 'quoted' | 'paid' | 'in_progress' | 'delivered' | 'closed' | 'cancelled';

export interface LawyerCase {
  id: string;
  lawyer_id: string;
  client_id: string | null;
  booking_id: string | null;
  quote_request_id: string | null;
  title: string;
  description: string | null;
  practice_area: string | null;
  status: CaseStatus;
  source: string;
  ai_workspace_id: string | null;
  price_clp: number | null;
  currency: string;
  created_at: string;
  updated_at: string;
  // joined
  client?: { id: string; name: string; email: string | null } | null;
  booking?: { id: string; user_name: string; service_title: string | null; status: string } | null;
}

export function useLawyerCases() {
  const { user } = useAuth();
  const [cases, setCases] = useState<LawyerCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCases = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('lawyer_cases')
        .select('*, client:lawyer_clients(id,name,email), booking:bookings!lawyer_cases_booking_id_fkey(id,user_name,service_title,status)')
        .eq('lawyer_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCases((data || []) as unknown as LawyerCase[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar casos');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const createCase = useCallback(
    async (input: {
      title: string;
      description?: string | null;
      client_id?: string | null;
      booking_id?: string | null;
      quote_request_id?: string | null;
      practice_area?: string | null;
      status?: CaseStatus;
      source?: string;
      price_clp?: number | null;
    }): Promise<LawyerCase> => {
      if (!user?.id) throw new Error('No autenticado');
      const payload: Record<string, unknown> = {
        lawyer_id: user.id,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        client_id: input.client_id || null,
        booking_id: input.booking_id || null,
        quote_request_id: input.quote_request_id || null,
        practice_area: input.practice_area?.trim() || null,
        status: input.status || 'new',
        source: input.source || 'LAWYER_DIRECT',
        price_clp: input.price_clp ?? null,
      };
      const { data, error } = await supabase.from('lawyer_cases').insert(payload).select('*, client:lawyer_clients(id,name,email), booking:bookings!lawyer_cases_booking_id_fkey(id,user_name,service_title,status)').single();
      if (error) throw error;
      const created = data as unknown as LawyerCase;
      setCases((prev) => [created, ...prev]);
      return created;
    },
    [user?.id]
  );

  const updateCase = useCallback(async (id: string, patch: Partial<Pick<LawyerCase, 'title' | 'description' | 'practice_area' | 'status' | 'client_id' | 'booking_id' | 'price_clp'>>) => {
    const payload: Record<string, unknown> = {};
    if (patch.title !== undefined) payload.title = patch.title.trim();
    if (patch.description !== undefined) payload.description = patch.description?.trim() || null;
    if (patch.practice_area !== undefined) payload.practice_area = patch.practice_area?.trim() || null;
    if (patch.status !== undefined) payload.status = patch.status;
    if (patch.client_id !== undefined) payload.client_id = patch.client_id;
    if (patch.booking_id !== undefined) payload.booking_id = patch.booking_id;
    if (patch.price_clp !== undefined) payload.price_clp = patch.price_clp;
    const { data, error } = await supabase.from('lawyer_cases').update(payload).eq('id', id).select('*, client:lawyer_clients(id,name,email), booking:bookings!lawyer_cases_booking_id_fkey(id,user_name,service_title,status)').single();
    if (error) throw error;
    setCases((prev) => prev.map((c) => (c.id === id ? (data as unknown as LawyerCase) : c)));
    return data as unknown as LawyerCase;
  }, []);

  const deleteCase = useCallback(async (id: string) => {
    const { error } = await supabase.from('lawyer_cases').delete().eq('id', id);
    if (error) throw error;
    setCases((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return { cases, loading, error, refetch: fetchCases, createCase, updateCase, deleteCase };
}

export function useLawyerCase(caseId: string | undefined) {
  const { user } = useAuth();
  const [caseData, setCaseData] = useState<LawyerCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!caseId || !user?.id) {
      setLoading(false);
      return;
    }
    supabase
      .from('lawyer_cases')
      .select('*, client:lawyer_clients(id,name,email,phone), booking:bookings!lawyer_cases_booking_id_fkey(id,user_name,user_email,service_title,price,status,scheduled_date,scheduled_time)')
      .eq('id', caseId)
      .eq('lawyer_id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setCaseData(data as unknown as LawyerCase);
        setLoading(false);
      });
  }, [caseId, user?.id]);

  return { caseData, loading, error };
}
