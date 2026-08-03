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
export type AIDocumentAnalysis = Database['public']['Tables']['ai_document_analyses']['Row'];

/** Lista de documentos sin `extracted_text` (evita cargar texto completo). */
export type AIDocumentListItem = Omit<AIDocument, 'extracted_text'>;

export const AI_DOCUMENTS_QUERY_KEY = ['ai-documents'] as const;
export const AI_ANALYSIS_QUERY_KEY = ['ai-document-analyses'] as const;

export const AI_DOCUMENTS_BUCKET = 'ai-documents';

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
    refetchInterval: (q) => {
      const busy = q.state.data?.some(
        (d) => d.status === 'processing' || d.analysis_status === 'processing'
      );
      return busy ? 4000 : false;
    },
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
