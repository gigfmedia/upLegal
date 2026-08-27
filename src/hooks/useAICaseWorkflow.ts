import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';

export type AICaseWorkflowItem = {
  id: string;
  lawyer_id: string;
  workspace_id: string;
  case_id: string;
  action_id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
  priority: 'high' | 'medium' | 'low';
  source_type: string | null;
  source_document_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  dismissed_at: string | null;
};

export const AI_WORKFLOW_QUERY_KEY = ['ai-case-workflow'] as const;

const getApiBaseUrl = (): string => {
  const base = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  return (base || 'http://localhost:3001').replace(/\/+$/, '');
};

const getAccessToken = async (): Promise<string | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
};

export function useAICaseWorkflow(workspaceId: string | undefined) {
  const { user } = useAuth();
  return useQuery<{ items: AICaseWorkflowItem[] }>({
    queryKey: [...AI_WORKFLOW_QUERY_KEY, workspaceId, user?.id],
    enabled: !!workspaceId && !!user?.id,
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token) throw new Error('Sesión no válida.');
      const res = await fetch(`${getApiBaseUrl()}/api/ai/cases/${workspaceId}/workflow`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(body?.error || 'No se pudo cargar el workflow.') as Error & { status?: number; code?: string };
        err.status = res.status;
        err.code = body?.code;
        throw err;
      }
      return body as { items: AICaseWorkflowItem[] };
    },
  });
}

export function useSyncAICaseWorkflow(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation<{ items: AICaseWorkflowItem[] }, Error, void>({
    mutationFn: async () => {
      if (!workspaceId) throw new Error('Falta el caso.');
      const token = await getAccessToken();
      if (!token) throw new Error('Sesión no válida.');
      const res = await fetch(`${getApiBaseUrl()}/api/ai/cases/${workspaceId}/workflow/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(body?.error || 'No se pudo sincronizar el workflow.') as Error & { status?: number };
        err.status = res.status;
        throw err;
      }
      return body as { items: AICaseWorkflowItem[] };
    },
    onSuccess: (data) => {
      queryClient.setQueryData([...AI_WORKFLOW_QUERY_KEY, workspaceId, user?.id], data);
      queryClient.invalidateQueries({ queryKey: [...AI_WORKFLOW_QUERY_KEY, workspaceId] });
    },
  });
}

export function useUpdateAICaseWorkflow(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation<AICaseWorkflowItem, Error, { itemId: string; status: AICaseWorkflowItem['status'] }>({
    mutationFn: async ({ itemId, status }) => {
      if (!workspaceId) throw new Error('Falta el caso.');
      const token = await getAccessToken();
      if (!token) throw new Error('Sesión no válida.');
      const res = await fetch(`${getApiBaseUrl()}/api/ai/cases/${workspaceId}/workflow/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(body?.error || 'No se pudo actualizar.') as Error & { status?: number };
        err.status = res.status;
        throw err;
      }
      return body.item as AICaseWorkflowItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...AI_WORKFLOW_QUERY_KEY, workspaceId] });
    },
  });
}
