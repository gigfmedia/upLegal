import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

export type AIChatSource = { document_id: string; file_name: string };

export type AIChatMessage = {
  id: string;
  conversation_id: string;
  workspace_id: string;
  lawyer_id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata: { sources?: AIChatSource[]; model?: string } | null;
  created_at: string;
};

export type AIConversation = {
  id: string;
  workspace_id: string;
  lawyer_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
};

export type AIChatData = {
  conversation: AIConversation | null;
  messages: AIChatMessage[];
};

export type AIChatError = Error & { code?: string };

export const AI_CHAT_QUERY_KEY = ['ai-case-chat'] as const;

const getApiBaseUrl = (): string => {
  const base = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  return (base || 'http://localhost:3001').replace(/\/+$/, '');
};

const getAccessToken = async (): Promise<string | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
};

/**
 * Conversación principal del caso + mensajes recientes.
 * El backend hace get-or-create de la conversación y valida ownership
 * (workspace y conversación deben pertenecer al abogado autenticado).
 */
export function useAICaseChat(workspaceId: string | undefined, enabled: boolean) {
  const query = useQuery<AIChatData>({
    queryKey: [...AI_CHAT_QUERY_KEY, workspaceId],
    enabled: !!workspaceId && enabled,
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token) throw new Error('Sesión no válida. Vuelve a iniciar sesión.');

      const res = await fetch(`${getApiBaseUrl()}/api/ai/cases/${workspaceId}/chat`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error || 'No se pudo cargar la conversación.');
      }
      return {
        conversation: body?.conversation ?? null,
        messages: body?.messages ?? [],
      } as AIChatData;
    },
  });

  return query;
}

type SendChatInput = { conversationId: string; message: string };
type SendChatResult = {
  message: AIChatMessage;
  user_message: AIChatMessage | null;
  sources: AIChatSource[];
};

/** Envía una pregunta y guarda user + assistant en backend (sin contexto del cliente). */
export function useSendChatMessage(workspaceId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<SendChatResult, AIChatError, SendChatInput>({
    mutationFn: async ({ conversationId, message }) => {
      const token = await getAccessToken();
      if (!token) throw new Error('Sesión no válida. Vuelve a iniciar sesión.');

      const res = await fetch(`${getApiBaseUrl()}/api/ai/cases/${workspaceId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ conversation_id: conversationId, message }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(body?.error || 'No se pudo generar la respuesta.') as AIChatError;
        err.code = body?.code;
        throw err;
      }
      return body as SendChatResult;
    },
    onSuccess: () => {
      // Refetch de estado autoritativo: el backend guarda user + assistant.
      // Evita duplicados en reintentos y mantiene consistencia.
      queryClient.invalidateQueries({ queryKey: [...AI_CHAT_QUERY_KEY, workspaceId] });
    },
    onError: () => {
      // El backend guarda el mensaje del usuario aunque la respuesta del asistente
      // falle. Refetch para mostrar ese user como mensaje real y poder reintentarlo.
      queryClient.invalidateQueries({ queryKey: [...AI_CHAT_QUERY_KEY, workspaceId] });
    },
  });
}
