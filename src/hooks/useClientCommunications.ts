import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';
import { isValidChannel, type CommChannel } from '@/lib/followUp';

export interface ClientComm {
  id: string;
  lawyer_id: string;
  client_id: string;
  case_id: string | null;
  channel: CommChannel;
  note: string | null;
  communicated_at: string;
  created_at: string;
  updated_at: string;
}

type Scope = { caseId?: string; clientId?: string };

/**
 * FASE 5.4 — comunicaciones de un caso o cliente (orden desc).
 * RLS owner-scoped; el lawyer_id lo pone el servidor vía auth.
 */
export function useClientCommunications({ caseId, clientId }: Scope) {
  const { user } = useAuth();
  const [comms, setComms] = useState<ClientComm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComms = useCallback(async () => {
    if (!user?.id || (!caseId && !clientId)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let q = supabase
        .from('lawyer_client_communications')
        .select('*')
        .eq('lawyer_id', user.id)
        .order('communicated_at', { ascending: false });
      if (caseId) q = q.eq('case_id', caseId);
      if (clientId) q = q.eq('client_id', clientId);
      const { data, error } = await q;
      if (error) throw error;
      setComms((data || []) as ClientComm[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar comunicaciones');
    } finally {
      setLoading(false);
    }
  }, [user?.id, caseId, clientId]);

  useEffect(() => {
    fetchComms();
  }, [fetchComms]);

  const registerComm = useCallback(
    async (input: { client_id: string; case_id?: string | null; channel: string; note?: string | null; communicated_at?: string | null }) => {
      if (!user?.id) throw new Error('No autenticado');
      if (!input.client_id) throw new Error('Cliente requerido');
      if (!isValidChannel(input.channel)) throw new Error('Canal inválido');
      const communicatedAt = input.communicated_at || new Date().toISOString();
      if (Number.isNaN(Date.parse(communicatedAt))) throw new Error('Fecha inválida');
      const { data, error } = await supabase
        .from('lawyer_client_communications')
        .insert({
          lawyer_id: user.id,
          client_id: input.client_id,
          case_id: input.case_id || null,
          channel: input.channel,
          note: input.note?.trim().slice(0, 500) || null,
          communicated_at: communicatedAt,
        })
        .select('*')
        .single();
      if (error) throw error;
      const created = data as ClientComm;
      setComms((prev) => [created, ...prev]);
      return created;
    },
    [user?.id]
  );

  return { comms, loading, error, refetch: fetchComms, registerComm };
}

/**
 * FASE 5.4 — todas las comunicaciones del abogado en UNA query
 * (último contacto por caso/cliente sin N+1 en listas y dashboard).
 */
export function useAllCommunications() {
  const { user } = useAuth();
  const [comms, setComms] = useState<ClientComm[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lawyer_client_communications')
        .select('id,client_id,case_id,channel,note,communicated_at')
        .eq('lawyer_id', user.id)
        .order('communicated_at', { ascending: false });
      if (error) throw error;
      setComms((data || []) as ClientComm[]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { comms, loading, refetch: fetchAll };
}

/**
 * FASE 5.4 — señales por cliente para ClientsPage en 2 queries agrupadas:
 * última comunicación + casos con seguimiento vencido (sin N+1).
 */
export function useClientFollowUpOverview() {
  const { user } = useAuth();
  const [lastByClient, setLastByClient] = useState<Map<string, ClientComm>>(new Map());
  const [overdueClientIds, setOverdueClientIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const startToday = new Date();
    startToday.setHours(0, 0, 0, 0);
    Promise.all([
      supabase
        .from('lawyer_client_communications')
        .select('id,client_id,case_id,channel,note,communicated_at')
        .eq('lawyer_id', user.id)
        .order('communicated_at', { ascending: false }),
      supabase
        .from('lawyer_cases')
        .select('client_id,client_follow_up_due_at')
        .eq('lawyer_id', user.id)
        .not('status', 'in', '("closed","cancelled")')
        .not('client_follow_up_due_at', 'is', null)
        .not('client_id', 'is', null),
    ]).then(([commsRes, casesRes]) => {
      if (cancelled) return;
      const map = new Map<string, ClientComm>();
      for (const c of ((commsRes.data || []) as ClientComm[])) {
        const prev = map.get(c.client_id);
        if (!prev || Date.parse(c.communicated_at) > Date.parse(prev.communicated_at)) {
          map.set(c.client_id, c);
        }
      }
      setLastByClient(map);
      const overdue = new Set<string>();
      for (const c of ((casesRes.data || []) as { client_id: string; client_follow_up_due_at: string }[])) {
        if (Date.parse(c.client_follow_up_due_at) < startToday.getTime() && c.client_id) {
          overdue.add(c.client_id);
        }
      }
      setOverdueClientIds(overdue);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [user?.id]);

  return { lastByClient, overdueClientIds, loading };
}
