import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import posthog from 'posthog-js';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';
import type { Database } from '@/types/supabase';
import type { AIDocumentListItem } from '@/hooks/useAIDocuments';

export type AITimelineEvent = Database['public']['Tables']['ai_case_timeline_events']['Row'];

export type AITimelineEventType = AITimelineEvent['event_type'];

export const AI_TIMELINE_QUERY_KEY = ['ai-case-timeline-events'] as const;

export type AITimelineEventInput = {
  event_type: AITimelineEventType;
  title: string;
  description?: string | null;
  event_date?: string;
  metadata?: Record<string, unknown>;
};

/** Inserta un evento y devuelve la fila creada. RLS valida propiedad del workspace. */
async function insertTimelineEvent(
  workspaceId: string,
  lawyerId: string,
  input: AITimelineEventInput,
) {
  const { data, error } = await supabase
    .from('ai_case_timeline_events')
    .insert({
      workspace_id: workspaceId,
      lawyer_id: lawyerId,
      event_type: input.event_type,
      title: input.title,
      description: input.description ?? null,
      event_date: input.event_date ?? new Date().toISOString(),
      metadata: (input.metadata ?? {}) as never,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Inserta un evento SOLO si no existe ya otro del mismo tipo con la misma
 * referencia de recurso (p. ej. document_id). Idempotente: evita duplicados
 * de eventos automáticos si se reintenta o React Query re-ejecuta.
 */
async function insertTimelineEventIfMissing(
  workspaceId: string,
  lawyerId: string,
  input: AITimelineEventInput,
): Promise<AITimelineEvent | null> {
  let query = supabase
    .from('ai_case_timeline_events')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('event_type', input.event_type);

  const documentId = (input.metadata as { document_id?: string } | undefined)?.document_id;
  if (documentId) {
    query = query.filter('metadata->>document_id', 'eq', documentId);
  }

  const { data, error } = await query.limit(1);
  if (error) throw error;
  if (data && data.length > 0) return null;
  return insertTimelineEvent(workspaceId, lawyerId, input);
}

/**
 * Sincroniza el timeline con eventos automáticos idempotentes:
 * - case_created: si el caso aún no tiene evento.
 * - document_uploaded: por cada documento sin evento con su document_id.
 * - document_analyzed: por cada documento que SÍ terminó de analizarse
 *   (analysis_status === 'ready'), nunca al iniciar el análisis.
 */
export async function syncAICaseTimelineEvents(opts: {
  workspaceId: string;
  lawyerId: string;
  workspaceCreatedAt: string;
  documents: AIDocumentListItem[];
  events: AITimelineEvent[] | undefined;
  onSynced?: () => void;
}): Promise<void> {
  const { workspaceId, lawyerId, workspaceCreatedAt, documents, events, onSynced } = opts;
  const existing = events ?? [];
  const missing: AITimelineEventInput[] = [];

  if (!existing.some((e) => e.event_type === 'case_created')) {
    missing.push({
      event_type: 'case_created',
      title: 'Caso creado',
      event_date: workspaceCreatedAt,
      metadata: {},
    });
  }

  for (const doc of documents) {
    const hasUploaded = existing.some(
      (e) =>
        e.event_type === 'document_uploaded' &&
        (e.metadata as { document_id?: string } | null)?.document_id === doc.id,
    );
    if (!hasUploaded) {
      missing.push({
        event_type: 'document_uploaded',
        title: 'Documento incorporado',
        event_date: doc.created_at,
        metadata: { document_id: doc.id, document_name: doc.original_filename },
      });
    }

    if (doc.analysis_status === 'ready') {
      const hasAnalyzed = existing.some(
        (e) =>
          e.event_type === 'document_analyzed' &&
          (e.metadata as { document_id?: string } | null)?.document_id === doc.id,
      );
      if (!hasAnalyzed) {
        missing.push({
          event_type: 'document_analyzed',
          title: 'Análisis de documento completado',
          event_date: doc.updated_at,
          metadata: { document_id: doc.id, document_name: doc.original_filename },
        });
      }
    }
  }

  if (missing.length === 0) {
    onSynced?.();
    return;
  }

  // Inserta secuencialmente; cada inserción verifica en BD para no duplicar.
  for (const input of missing) {
    await insertTimelineEventIfMissing(workspaceId, lawyerId, input);
  }
  onSynced?.();
}

/** Obtiene los eventos del caso (más reciente primero). RLS garantiza aislamiento. */
export function useAICaseTimeline(workspaceId: string | undefined) {
  const { user } = useAuth();
  const lawyerId = user?.id ?? null;

  const query = useQuery<AITimelineEvent[]>({
    queryKey: [...AI_TIMELINE_QUERY_KEY, workspaceId],
    enabled: !!workspaceId && !!lawyerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_case_timeline_events')
        .select('*')
        .eq('workspace_id', workspaceId!)
        .order('event_date', { ascending: false });
      if (error) {
        console.error('[AICaseTimeline] Error cargando eventos:', error);
        throw new Error('No se pudo cargar el timeline del caso.');
      }
      return (data ?? []) as AITimelineEvent[];
    },
  });

  return { ...query, lawyerId };
}

/**
 * Eventos más recientes de TODOS los casos del abogado (para mini-timeline en
 * "Mis casos"). Una sola query eficiente; el componente agrupa por workspace.
 */
export function useRecentAICaseTimeline(limit = 30) {
  const { user } = useAuth();
  const lawyerId = user?.id ?? null;

  const query = useQuery<AITimelineEvent[]>({
    queryKey: [...AI_TIMELINE_QUERY_KEY, 'recent', lawyerId, limit],
    enabled: !!lawyerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_case_timeline_events')
        .select('*')
        .eq('lawyer_id', lawyerId!)
        .order('event_date', { ascending: false })
        .limit(limit);
      if (error) {
        console.error('[AICaseTimeline] Error cargando actividad reciente:', error);
        throw new Error('No se pudo cargar la actividad reciente.');
      }
      return (data ?? []) as AITimelineEvent[];
    },
  });

  return query;
}

/** Crea una nota manual (event_type = note) y registra PostHog. */
export function useCreateAITimelineNote(workspaceId?: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed) throw new Error('Escribe el contenido de la actualización.');
      if (!workspaceId || !user?.id) throw new Error('Sesión no disponible.');
      const data = await insertTimelineEvent(workspaceId, user.id, {
        event_type: 'note',
        title: 'Actualización del caso',
        description: trimmed,
        event_date: new Date().toISOString(),
        metadata: { author: user.email ?? null, source: 'manual' },
      });
      posthog.capture('ai_case_timeline_note_created', { source: 'ai_case' });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...AI_TIMELINE_QUERY_KEY, workspaceId] });
      queryClient.invalidateQueries({ queryKey: [...AI_TIMELINE_QUERY_KEY, 'recent'] });
    },
  });
}

/** Edita SOLO la descripción de una nota. Nunca cambia tipo/workspace/abogado/fechas. */
export function useUpdateAITimelineNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, description }: { id: string; description: string }) => {
      const trimmed = description.trim();
      if (!trimmed) throw new Error('Escribe el contenido de la actualización.');
      const { data, error } = await supabase
        .from('ai_case_timeline_events')
        .update({ description: trimmed })
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error('No se pudo actualizar la nota.');
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [...AI_TIMELINE_QUERY_KEY, data.workspace_id],
      });
      queryClient.invalidateQueries({ queryKey: [...AI_TIMELINE_QUERY_KEY, 'recent'] });
    },
  });
}

/** Elimina SOLO notas. Los eventos automáticos no se eliminan desde la UI. */
export function useDeleteAITimelineNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ai_case_timeline_events').delete().eq('id', id);
      if (error) throw new Error('No se pudo eliminar la actualización.');
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AI_TIMELINE_QUERY_KEY });
      posthog.capture('ai_case_timeline_note_deleted', { source: 'ai_case' });
    },
  });
}
