import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';
import { captureCaseTaskCreated, captureCaseTaskCompleted } from '@/lib/proAnalytics';

export interface CaseTask {
  id: string;
  lawyer_id: string;
  case_id: string;
  title: string;
  due_at: string | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

/** FASE 5.1 — pendientes mínimos del caso (lawyer_case_tasks, RLS por lawyer_id). */
export function useCaseTasks(caseId: string | undefined) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<CaseTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!caseId || !user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('lawyer_case_tasks')
        .select('*')
        .eq('case_id', caseId)
        .eq('lawyer_id', user.id)
        .order('completed', { ascending: true })
        .order('due_at', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      setTasks((data || []) as CaseTask[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar pendientes');
    } finally {
      setLoading(false);
    }
  }, [caseId, user?.id]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const createTask = useCallback(
    async (input: { title: string; due_at?: string | null }) => {
      if (!user?.id || !caseId) throw new Error('No autenticado');
      const title = input.title.trim();
      if (!title) throw new Error('Título requerido');
      const { data, error } = await supabase
        .from('lawyer_case_tasks')
        .insert({
          lawyer_id: user.id,
          case_id: caseId,
          title,
          due_at: input.due_at || null,
        })
        .select('*')
        .single();
      if (error) throw error;
      const created = data as CaseTask;
      setTasks((prev) => [created, ...prev]);
      // FASE 1E: creación confirmada por el servidor (best-effort).
      try {
        if (user?.id) captureCaseTaskCreated(user.id);
      } catch {
        // noop
      }
      return created;
    },
    [user?.id, caseId]
  );

  const completeTask = useCallback(async (id: string) => {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('lawyer_case_tasks')
      .update({ completed: true, completed_at: now })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    setTasks((prev) => prev.map((t) => (t.id === id ? (data as CaseTask) : t)));
    // FASE 1E: finalización confirmada, separada de la creación.
    try {
      if (user?.id) captureCaseTaskCompleted(user.id);
    } catch {
      // noop
    }
    return data as CaseTask;
  }, [user?.id]);

  const reopenTask = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from('lawyer_case_tasks')
      .update({ completed: false, completed_at: null })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    setTasks((prev) => prev.map((t) => (t.id === id ? (data as CaseTask) : t)));
    return data as CaseTask;
  }, []);

  return { tasks, loading, error, refetch: fetchTasks, createTask, completeTask, reopenTask };
}

/**
 * FASE 5.2 — todos los pendientes del abogado en UNA query (sin N+1).
 * Fuente del Action Center junto a useLawyerCases. Sin gates de plan:
 * el caso gratuito participa igual que cualquier caso.
 */
export function useAllCaseTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<CaseTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('lawyer_case_tasks')
        .select('*')
        .eq('lawyer_id', user.id)
        .order('completed', { ascending: true })
        .order('due_at', { ascending: true, nullsFirst: false });
      if (error) throw error;
      setTasks((data || []) as CaseTask[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar pendientes');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const completeTask = useCallback(async (id: string) => {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('lawyer_case_tasks')
      .update({ completed: true, completed_at: now })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    setTasks((prev) => prev.map((t) => (t.id === id ? (data as CaseTask) : t)));
    return data as CaseTask;
  }, []);

  return { tasks, loading, error, refetch: fetchAll, completeTask };
}

export type CaseControlSummary = {
  pendingCount: number;
  overdueCount: number;
  nextOverdue: boolean;
  loading: boolean;
  refetch: () => void;
};

/**
 * FASE 5.1B — resumen liviano para el trigger "Gestionar caso"
 * (una query mínima, sin traer el detalle de cada pendiente).
 */
export function useCaseControlSummary(
  caseId: string | undefined,
  nextAction: { next_action_due_at: string | null; next_action_completed_at: string | null } | null
) {
  const { user } = useAuth();
  const [summary, setSummary] = useState<{ pendingCount: number; overdueCount: number }>({ pendingCount: 0, overdueCount: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const refetch = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (!caseId || !user?.id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from('lawyer_case_tasks')
      .select('due_at,completed')
      .eq('case_id', caseId)
      .eq('lawyer_id', user.id)
      .then(({ data }) => {
        if (cancelled) return;
        const rows = (data || []) as { due_at: string | null; completed: boolean }[];
        const now = Date.now();
        setSummary({
          pendingCount: rows.filter((r) => !r.completed).length,
          overdueCount: rows.filter((r) => {
            if (r.completed || !r.due_at) return false;
            const t = Date.parse(r.due_at);
            return !Number.isNaN(t) && t < now;
          }).length,
        });
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [caseId, user?.id, refreshKey]);

  const nextOverdue = (() => {
    if (!nextAction?.next_action_due_at || nextAction.next_action_completed_at) return false;
    const t = Date.parse(nextAction.next_action_due_at);
    return !Number.isNaN(t) && t < Date.now();
  })();

  const overdueCount = summary.overdueCount + (nextOverdue ? 1 : 0);
  return { pendingCount: summary.pendingCount, overdueCount, nextOverdue, loading, refetch } satisfies CaseControlSummary;
}
