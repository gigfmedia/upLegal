import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

export type AIResearchSource = {
  id: string;
  kind: 'jurisprudencia' | 'normativa' | 'doctrina';
  source_type?: 'normativa' | 'jurisprudencia' | 'doctrina';
  legal_authority?: 'vinculante' | 'persuasiva' | 'doctrinal' | 'informativa';
  vigency?: 'vigente' | 'derogada' | 'modificada' | 'desconocida' | 'no_aplica';
  norm_type?: string | null;
  norm_number?: string | null;
  title?: string;
  citation: string;
  publisher?: string;
  url?: string;
  excerpt?: string;
  date?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type AIResearchRequest = {
  id: string;
  workspace_id: string;
  lawyer_id: string;
  query: string;
  answer: string;
  sources: AIResearchSource[];
  model: string | null;
  created_at: string;
};

export type AIResearchError = Error & { code?: string };

export const AI_RESEARCH_QUERY_KEY = ['ai-case-research'] as const;

const getApiBaseUrl = (): string => {
  const base = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  return (base || 'http://localhost:3001').replace(/\/+$/, '');
};

const getAccessToken = async (): Promise<string | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
};

/** Historial de investigaciones de jurisprudencia del caso (get-or-create). */
export function useAICaseResearch(workspaceId: string | undefined, enabled: boolean) {
  const query = useQuery<AIResearchRequest[]>({
    queryKey: [...AI_RESEARCH_QUERY_KEY, workspaceId],
    enabled: !!workspaceId && enabled,
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token) throw new Error('Sesión no válida. Vuelve a iniciar sesión.');

      const res = await fetch(
        `${getApiBaseUrl()}/api/ai/cases/${workspaceId}/jurisprudence`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error || 'No se pudo cargar el historial de investigaciones.');
      }
      return (body?.research ?? []) as AIResearchRequest[];
    },
  });

  return query;
}

type RunResearchInput = { query: string };
type RunResearchResult = {
  research: AIResearchRequest;
  sources: AIResearchSource[];
  warnings?: string[];
};

/** Ejecuta una investigación de jurisprudencia y la guarda en el caso. */
export function useRunAIResearch(workspaceId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<RunResearchResult, AIResearchError, RunResearchInput>({
    mutationFn: async ({ query }) => {
      const token = await getAccessToken();
      if (!token) throw new Error('Sesión no válida. Vuelve a iniciar sesión.');

      const res = await fetch(
        `${getApiBaseUrl()}/api/ai/cases/${workspaceId}/jurisprudence`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ query }),
        }
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(
          body?.error || 'No se pudo completar la investigación.'
        ) as AIResearchError;
        err.code = body?.code;
        throw err;
      }
      return body as RunResearchResult;
    },
    onSuccess: (data) => {
      const queryKey = [...AI_RESEARCH_QUERY_KEY, workspaceId];
      queryClient.setQueryData<AIResearchRequest[]>(queryKey, (old) => {
        if (!data.research) return old;
        const current = old ?? [];
        if (current.some((r) => r.id === data.research.id)) return current;
        return [data.research, ...current];
      });
      queryClient.invalidateQueries({ queryKey });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: [...AI_RESEARCH_QUERY_KEY, workspaceId] });
    },
  });
}
