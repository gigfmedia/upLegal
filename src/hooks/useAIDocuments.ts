import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import posthog from 'posthog-js';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';
import type { Database } from '@/types/supabase';
import {
  MAX_DOCUMENT_SIZE_BYTES,
  isDocumentOverMaxSize,
  toFriendlyUploadError,
} from '@/lib/aiDocumentLimits';

export { MAX_DOCUMENT_SIZE_BYTES };

export type AIDocument = Database['public']['Tables']['ai_documents']['Row'];
export type AIDocumentAnalysis = Database['public']['Tables']['ai_document_analyses']['Row'] & {
  claims?: Array<{ text: string; source_id: string; fragment_id: string | null; evidence: string; page_number: number | null }>;
  evidence_sources?: Array<{ text: string; source_id: string; fragment_id: string | null; evidence: string; page_number: number | null }>;
};

/** Lista de documentos sin `extracted_text` (evita cargar texto completo). */
export type AIDocumentListItem = Omit<AIDocument, 'extracted_text'>;

export const AI_DOCUMENTS_QUERY_KEY = ['ai-documents'] as const;
export const AI_ANALYSIS_QUERY_KEY = ['ai-document-analyses'] as const;

export const AI_DOCUMENTS_BUCKET = 'ai-documents';

/**
 * Polling guard: devuelve el intervalo de polling de documentos mientras haya
 * documentos en procesamiento/análisis, pero se detiene si un documento permanece
 * continuamente en `processing` más del límite (evita que un caso atascado genere
 * miles de requests). La lógica es pura e inyectable para poder testearla.
 */
export const DOCUMENTS_POLL_INTERVAL_MS = 4000;
export const DOCUMENTS_STUCK_PROCESSING_MS = 10 * 60 * 1000; // 10 minutos

export type DocumentPollState = { startedAtById: Map<string, number> };

export function createDocumentPollingState(): DocumentPollState {
  return { startedAtById: new Map() };
}

export function computeDocumentPollInterval(
  state: DocumentPollState,
  docs: AIDocumentListItem[] | undefined,
  now: number
): number | false {
  const processing = (docs ?? []).filter(
    (d) => d.status === 'processing' || d.analysis_status === 'processing'
  );
  const processingIds = new Set(processing.map((d) => d.id));

  // Limpia marcadores de documentos que ya no están en processing (completed/failed).
  for (const id of Array.from(state.startedAtById.keys())) {
    if (!processingIds.has(id)) state.startedAtById.delete(id);
  }
  // Registra el inicio continuo de processing para documentos nuevos.
  for (const doc of processing) {
    if (!state.startedAtById.has(doc.id)) state.startedAtById.set(doc.id, now);
  }

  if (processing.length === 0) return false;

  let earliestStart = now;
  for (const doc of processing) {
    const start = state.startedAtById.get(doc.id) ?? now;
    if (start < earliestStart) earliestStart = start;
  }

  const elapsed = now - earliestStart;
  return elapsed >= DOCUMENTS_STUCK_PROCESSING_MS ? false : DOCUMENTS_POLL_INTERVAL_MS;
}

// Clarificado: `state` compartido a nivel de módulo para sobrevivir remontajes de
// componentes con la misma sesión (evita que un documento atascado reactive el
// polling al volver a montar la página).
const documentsPollingState = createDocumentPollingState();

const getApiBaseUrl = (): string => {
  const base = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  return (base || 'http://localhost:3001').replace(/\/+$/, '');
};

const getAccessToken = async (): Promise<string | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
};

/**
 * Documentos de un caso (workspace). La seguridad la garantiza RLS.
 * Hace polling solo mientras hay documentos en procesamiento/análisis.
 */
export function useAIDocuments(workspaceId: string | undefined) {
  const { user } = useAuth();
  const lawyerId = user?.id ?? null;

  const query = useQuery<AIDocumentListItem[]>({
    queryKey: [...AI_DOCUMENTS_QUERY_KEY, lawyerId, workspaceId],
    enabled: !!lawyerId && !!workspaceId,
    refetchInterval: (q) =>
      computeDocumentPollInterval(
        documentsPollingState,
        q.state.data as AIDocumentListItem[] | undefined,
        Date.now()
      ),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_documents')
        .select(
          'id, lawyer_id, workspace_id, original_filename, file_path, file_size_bytes, mime_type, status, page_count, analysis_status, analysis_error, model, created_at, updated_at'
        )
        .eq('workspace_id', workspaceId!)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[LegalUpAI] Error cargando documentos:', error);
        throw new Error('No se pudieron cargar los documentos del caso.');
      }

      return (data ?? []) as AIDocumentListItem[];
    },
  });

  return query;
}

/** Análisis IA de un documento específico (uno por documento). */
export function useAIDocumentAnalysis(documentId: string | undefined, enabled = true) {
  const query = useQuery<AIDocumentAnalysis | null>({
    queryKey: [...AI_ANALYSIS_QUERY_KEY, documentId],
    enabled: !!documentId && enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_document_analyses')
        .select('*')
        .eq('document_id', documentId!)
        .maybeSingle();

      if (error) {
        console.error('[LegalUpAI] Error cargando análisis:', error);
        throw new Error('No se pudo cargar el análisis.');
      }

      return (data ?? null) as AIDocumentAnalysis | null;
    },
  });

  return query;
}

/** Sube un PDF a un caso: crea la fila (id generado en cliente) y sube al bucket privado. */
export function useUploadAIDocument(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<AIDocument, Error, File>({
    mutationFn: async (file) => {
      if (!user?.id) throw new Error('Sesión no válida. Vuelve a iniciar sesión.');
      if (!workspaceId) throw new Error('Falta el identificador del caso.');

      if (file.type !== 'application/pdf') {
        throw new Error('Solo se permiten archivos PDF.');
      }
      if (file.size <= 0) {
        throw new Error('El archivo está vacío.');
      }
      if (isDocumentOverMaxSize(file.size)) {
        throw new Error('El PDF no puede superar los 20 MB.');
      }

      const documentId = crypto.randomUUID();
      const filePath = `${user.id}/${workspaceId}/${documentId}/original.pdf`;

      const { data: inserted, error: insertError } = await supabase
        .from('ai_documents')
        .insert({
          id: documentId,
          lawyer_id: user.id,
          workspace_id: workspaceId,
          original_filename: file.name,
          file_path: filePath,
          file_size_bytes: file.size,
          mime_type: 'application/pdf',
          status: 'pending',
        })
        .select()
        .single();

      if (insertError) {
        console.error('[LegalUpAI] Error creando documento:', insertError);
        throw new Error('No se pudo registrar el documento. Inténtalo de nuevo.');
      }

      const { error: uploadError } = await supabase.storage
        .from(AI_DOCUMENTS_BUCKET)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'application/pdf',
        });

      if (uploadError) {
        // El upload falló: eliminar el registro para no dejar documentos huérfanos.
        await supabase.from('ai_documents').delete().eq('id', documentId);
        console.error('[LegalUpAI] Error subiendo PDF:', uploadError);
        throw toFriendlyUploadError(uploadError);
      }

      // Evento de activación: solo el primer documento subido del abogado.
      try {
        const { count } = await supabase
          .from('ai_documents')
          .select('id', { count: 'exact', head: true })
          .eq('lawyer_id', user.id);
        if (count === 1) {
          posthog.capture('ai_first_document_uploaded', {
            workspace_id: workspaceId,
            file_size_bytes: file.size,
          });
        }
      } catch (error) {
        console.error('[LegalUpAI] ai_first_document_uploaded failed', error);
      }

      return inserted as AIDocument;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AI_DOCUMENTS_QUERY_KEY });
    },
  });
}

/** Elimina un documento (fila + archivo en storage). El análisis se borra en cascada. */
export function useDeleteAIDocument() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, AIDocumentListItem>({
    mutationFn: async (doc) => {
      const { error: delError } = await supabase.from('ai_documents').delete().eq('id', doc.id);
      if (delError) {
        console.error('[LegalUpAI] Error eliminando documento:', delError);
        throw new Error('No se pudo eliminar el documento.');
      }

      const { error: storageError } = await supabase.storage
        .from(AI_DOCUMENTS_BUCKET)
        .remove([doc.file_path]);
      if (storageError) {
        console.error('[LegalUpAI] Error eliminando archivo:', storageError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AI_DOCUMENTS_QUERY_KEY });
    },
  });
}

/** Extrae el texto del PDF en el backend. */
export function useProcessAIDocument() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (documentId) => {
      if (!documentId) throw new Error('Falta el documento.');
      const token = await getAccessToken();
      if (!token) throw new Error('Sesión no válida. Vuelve a iniciar sesión.');

      const res = await fetch(`${getApiBaseUrl()}/api/ai/documents/${documentId}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || 'No se pudo procesar el PDF.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: AI_DOCUMENTS_QUERY_KEY });
    },
  });
}

type AnalyzeInput = { documentId: string; model: string };

/** Genera (o reemplaza) el análisis IA del documento en el backend. */
export function useAnalyzeAIDocument() {
  const queryClient = useQueryClient();

  return useMutation<AIDocumentAnalysis, Error, AnalyzeInput>({
    mutationFn: async ({ documentId, model }) => {
      if (!documentId) throw new Error('Falta el documento.');
      const token = await getAccessToken();
      if (!token) throw new Error('Sesión no válida. Vuelve a iniciar sesión.');

      const res = await fetch(`${getApiBaseUrl()}/api/ai/documents/${documentId}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ model }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || 'No se pudo analizar el documento.');

      return body?.analysis as AIDocumentAnalysis;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: AI_DOCUMENTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: AI_ANALYSIS_QUERY_KEY });
    },
  });
}

/** Genera una URL firmada (1 hora) para ver/descargar el PDF. Nunca expone URLs públicas. */
export async function getAIDocumentSignedUrl(filePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(AI_DOCUMENTS_BUCKET)
    .createSignedUrl(filePath, 3600);
  if (error) {
    console.error('[LegalUpAI] Error generando enlace firmado:', error);
    throw new Error('No se pudo generar el enlace del documento.');
  }
  return data.signedUrl;
}

/** Formatea el tamaño de archivo de forma legible. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export type AICaseIntelligence = {
  workspace_id: string;
  document_count: number;
  documents: AIDocumentListItem[];
  facts: Array<{ text: string; source_id: string; evidence: string; page_number: number | null; document_filename: string; source_ids: string[]; evidences: Array<{ evidence: string; page_number: number | null; document_filename: string }> }>;
  parties: string[];
  obligations: string[];
  deadlines: Array<{ date: string; description: string }>;
  risks: string[];
  contradictions: Array<{ topic: string; versions: Array<{ text: string; source_id: string; document_filename: string; evidence: string }> }>;
  missingInformation: string[];
  caseSummary: string;
  attributionCoverage: number;
};

export const AI_CASE_INTELLIGENCE_QUERY_KEY = ['ai-case-intelligence'] as const;

export function useAICaseIntelligence(workspaceId: string | undefined, enabled = true) {
  const { user } = useAuth();
  return useQuery<AICaseIntelligence>({
    queryKey: [...AI_CASE_INTELLIGENCE_QUERY_KEY, workspaceId, user?.id],
    enabled: !!workspaceId && !!user?.id && enabled,
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token) throw new Error('Sesión no válida.');
      const res = await fetch(`${getApiBaseUrl()}/api/ai/cases/${workspaceId}/intelligence`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || 'No se pudo cargar la inteligencia del caso.');
      return body as AICaseIntelligence;
    },
  });
}
