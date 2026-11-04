import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import type { DraftCommentAnchor } from '@/components/legalup-ai/draftCommentAnchor';

export type DraftCommentStatus = 'open' | 'resolved' | 'dismissed';
export type DraftCommentAuthor = 'lawyer' | 'ai';

export type DraftComment = {
  id: string;
  draft_id: string;
  lawyer_id: string;
  lawyer_case_id: string;
  workspace_id: string;
  body: string;
  author: DraftCommentAuthor;
  status: DraftCommentStatus;
  anchor: DraftCommentAnchor;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
};

export type DraftCommentInput = {
  body: string;
  anchor: DraftCommentAnchor;
  author?: DraftCommentAuthor;
};

export type DraftCommentUpdate = {
  body?: string;
  status?: DraftCommentStatus;
  anchor?: DraftCommentAnchor;
};

export class DraftCommentApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const AI_DRAFT_COMMENTS_QUERY_KEY = ['ai-case-draft-comments'] as const;
const EMPTY_COMMENTS: DraftComment[] = [];

const getApiBaseUrl = (): string => {
  const base = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  return (base || 'http://localhost:3001').replace(/\/+$/, '');
};

const getAccessToken = async (): Promise<string | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
};

async function requestComments<T>(url: string, init: RequestInit): Promise<T> {
  const token = await getAccessToken();
  if (!token) throw new DraftCommentApiError('Sesión no válida.', 401);
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new DraftCommentApiError(
      (body as { error?: string })?.error || 'No se pudo completar la operación.',
      res.status,
      (body as { code?: string })?.code,
    );
  }
  return body as T;
}

function commentsUrl(workspaceId: string, draftId: string, commentId?: string): string {
  const base = `${getApiBaseUrl()}/api/ai/cases/${workspaceId}/drafts/${draftId}/comments`;
  return commentId ? `${base}/${commentId}` : base;
}

/** Comentarios del borrador abierto. El query key incluye borrador y workspace:
 *  un cambio de borrador nunca reutiliza comentarios del anterior. */
export function useDraftComments(workspaceId: string | undefined, draftId: string | undefined) {
  const queryClient = useQueryClient();
  const queryKey = [...AI_DRAFT_COMMENTS_QUERY_KEY, workspaceId, draftId];
  // Invalidar por prefijo (no por la clave capturada por la mutación): la
  // mutación puede haberse creado antes de que `draftId` existiera, y una
  // invalidación con draftId=undefined dejaría la lista real sin refrescar.
  const invalidateComments = () => queryClient.invalidateQueries({ queryKey: AI_DRAFT_COMMENTS_QUERY_KEY });

  const query = useQuery<DraftComment[]>({
    queryKey,
    enabled: !!workspaceId && !!draftId,
    queryFn: async () => {
      if (!workspaceId || !draftId) return [];
      const body = await requestComments<{ comments?: DraftComment[] }>(commentsUrl(workspaceId, draftId), { method: 'GET' });
      return body?.comments ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (input: DraftCommentInput) => {
      if (!workspaceId || !draftId) throw new Error('Borrador no disponible.');
      const body = await requestComments<{ comment?: DraftComment }>(commentsUrl(workspaceId, draftId), {
        method: 'POST',
        body: JSON.stringify(input),
      });
      if (!body?.comment) throw new Error('El servidor no devolvió el comentario creado.');
      return body.comment;
    },
    onSuccess: (comment) => {
      queryClient.setQueryData<DraftComment[]>(queryKey, (old) => (
        old?.some((item) => item.id === comment.id) ? old : [...(old ?? []), comment]
      ));
      invalidateComments();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, changes }: { id: string; changes: DraftCommentUpdate }) => {
      if (!workspaceId || !draftId) throw new Error('Borrador no disponible.');
      const body = await requestComments<{ comment?: DraftComment }>(commentsUrl(workspaceId, draftId, id), {
        method: 'PATCH',
        body: JSON.stringify(changes),
      });
      if (!body?.comment) throw new Error('El servidor no devolvió el comentario actualizado.');
      return body.comment;
    },
    onSuccess: (comment) => {
      queryClient.setQueryData<DraftComment[]>(queryKey, (old) => (
        old?.map((item) => (item.id === comment.id ? comment : item)) ?? [comment]
      ));
      invalidateComments();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!workspaceId || !draftId) throw new Error('Borrador no disponible.');
      await requestComments<{ ok: boolean }>(commentsUrl(workspaceId, draftId, id), { method: 'DELETE' });
      return id;
    },
    onSuccess: (id) => {
      queryClient.setQueryData<DraftComment[]>(queryKey, (old) => old?.filter((item) => item.id !== id) ?? []);
      invalidateComments();
    },
  });

  return {
    comments: query.data ?? EMPTY_COMMENTS,
    isLoading: query.isLoading,
    error: query.error,
    createComment: createMutation.mutateAsync,
    updateComment: updateMutation.mutateAsync,
    deleteComment: deleteMutation.mutateAsync,
    isMutating: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
  };
}
