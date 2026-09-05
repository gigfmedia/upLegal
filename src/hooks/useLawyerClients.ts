import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';
import { normalizeEmail } from '@/lib/normalizeEmail';
import { trackFirstClientIfNeeded } from '@/lib/activationAnalytics';

export interface LawyerClient {
  id: string;
  lawyer_id: string;
  email: string | null;
  name: string;
  phone: string | null;
  source: string;
  first_booking_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useLawyerClients() {
  const { user } = useAuth();
  const [clients, setClients] = useState<LawyerClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('lawyer_clients')
        .select('*')
        .eq('lawyer_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setClients((data || []) as LawyerClient[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const findByNormalizedEmail = useCallback(
    (email: string | null): LawyerClient | null => {
      const norm = normalizeEmail(email);
      if (!norm) return null;
      return clients.find((c) => normalizeEmail(c.email) === norm) || null;
    },
    [clients]
  );

  const createClient = useCallback(
    async (input: { name: string; email?: string | null; phone?: string | null; source?: string; first_booking_id?: string | null; notes?: string | null }): Promise<LawyerClient> => {
      if (!user?.id) throw new Error('No autenticado');
      const normalizedEmail = normalizeEmail(input.email ?? null);
      // reuse check before insert to avoid unique violation
      if (normalizedEmail) {
        const existing = findByNormalizedEmail(normalizedEmail);
        if (existing) return existing;
      }
      const payload: Record<string, unknown> = {
        lawyer_id: user.id,
        name: input.name.trim(),
        email: normalizedEmail,
        phone: input.phone?.trim() || null,
        source: input.source || 'LAWYER_DIRECT',
        first_booking_id: input.first_booking_id || null,
        notes: input.notes?.trim() || null,
      };
      const { data, error } = await supabase.from('lawyer_clients').insert(payload).select().single();
      if (error) {
        // handle unique violation race: try to fetch existing
        if (error.code === '23505' && normalizedEmail) {
          const existing = findByNormalizedEmail(normalizedEmail);
          if (existing) return existing;
        }
        throw error;
      }
      const created = data as LawyerClient;
      setClients((prev) => [created, ...prev]);
      // activation analytics (first_client) — no PII, only source
      if (user?.id) trackFirstClientIfNeeded(user.id, (payload.source as string) || 'unknown').catch(() => {});
      return created;
    },
    [user?.id, findByNormalizedEmail]
  );

  const findOrCreateClient = useCallback(
    async (input: { name: string; email?: string | null; phone?: string | null; source?: string; first_booking_id?: string | null }): Promise<LawyerClient> => {
      const normalizedEmail = normalizeEmail(input.email ?? null);
      if (normalizedEmail) {
        const existing = findByNormalizedEmail(normalizedEmail);
        if (existing) return existing;
        // also check DB directly in case clients not yet fetched
        if (user?.id) {
          const { data } = await supabase
            .from('lawyer_clients')
            .select('*')
            .eq('lawyer_id', user.id)
            .filter('email', 'ilike', normalizedEmail)
            .limit(1)
            .maybeSingle();
          // ilike may not be exact due to case, but we also check lower
          if (data) {
            const matched = normalizeEmail((data as LawyerClient).email) === normalizedEmail;
            if (matched) {
              // ensure local state has it
              setClients((prev) => (prev.find((c) => c.id === (data as LawyerClient).id) ? prev : [data as LawyerClient, ...prev]));
              return data as LawyerClient;
            }
          }
        }
      }
      return createClient(input);
    },
    [createClient, findByNormalizedEmail, user?.id]
  );

  const updateClient = useCallback(
    async (id: string, patch: Partial<Omit<LawyerClient, 'id' | 'lawyer_id' | 'created_at' | 'updated_at'>>) => {
      const payload: Record<string, unknown> = {};
      if (patch.name !== undefined) payload.name = patch.name.trim();
      if (patch.email !== undefined) payload.email = normalizeEmail(patch.email);
      if (patch.phone !== undefined) payload.phone = patch.phone?.trim() || null;
      if (patch.notes !== undefined) payload.notes = patch.notes?.trim() || null;
      if (patch.source !== undefined) payload.source = patch.source;
      const { data, error } = await supabase.from('lawyer_clients').update(payload).eq('id', id).select().single();
      if (error) throw error;
      setClients((prev) => prev.map((c) => (c.id === id ? (data as LawyerClient) : c)));
      return data as LawyerClient;
    },
    []
  );

  const deleteClient = useCallback(async (id: string) => {
    const { error } = await supabase.from('lawyer_clients').delete().eq('id', id);
    if (error) throw error;
    setClients((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return { clients, loading, error, refetch: fetchClients, createClient, findOrCreateClient, updateClient, deleteClient, findByNormalizedEmail };
}

export function useLawyerClient(clientId: string | undefined) {
  const { user } = useAuth();
  const [client, setClient] = useState<LawyerClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId || !user?.id) {
      setLoading(false);
      return;
    }
    supabase
      .from('lawyer_clients')
      .select('*')
      .eq('id', clientId)
      .eq('lawyer_id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setClient(data as LawyerClient);
        setLoading(false);
      });
  }, [clientId, user?.id]);

  return { client, loading, error };
}
