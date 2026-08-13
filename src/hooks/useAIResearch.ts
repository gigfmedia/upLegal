import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

export type AIResearchClaim = {
  source_id: string;
  fragment_id: string | null;
  category: 'normativa' | 'jurisprudencia' | 'doctrina' | 'document' | null;
  afirmacion: string;
  evidencia: string;
  verified: boolean;
  vigencia?: string | null;
  vigencia_nota?: string | null;
};

export type AIResearchSource = {
  id: string;
  kind: 'jurisprudencia' | 'normativa' | 'doctrina' | 'document';
  source_type?: 'normativa' | 'jurisprudencia' | 'doctrina';
  legal_authority?: 'vinculante' | 'persuasiva' | 'doctrinal' | 'informativa';
  vigency?: 'vigente' | 'diferida' | 'derogada' | 'modificada' | 'desconocida' | 'no_aplica';
  norm_type?: string | null;
  norm_number?: string | null;
  title?: string;
  citation: string;
  publisher?: string;
  url?: string;
  excerpt?: string;
  date?: string | null;
  vigencia_detail?: string | null;
  fragments?: Array<{ article: string; text: string; idNorma?: string; url?: string }> | null;
  claims?: AIResearchClaim[] | null;
  metadata?: Record<string, unknown> | null;
};

export type AIResearchSourceFragment = {
  id?: string;
  article: string;
  text: string;
  idNorma?: string;
  url?: string;
};

/** Evidencia primaria de una fuente: UN claim verificado + el artículo que respalda. */
export type AIResearchPrimaryEvidence = {
  fragment_id: string | null;
  article: string | null;
  afirmacion: string;
  evidencia: string;
  vigencia_nota?: string | null;
};

/** Plan de renderizado de evidencia de una fuente (Fase 4.1.1). */
export type AIResearchEvidencePlan = {
  /** Fragmentos usados por claims verificados → evidencia principal. */
  primary: AIResearchPrimaryEvidence[];
  /** Fragmentos de la fuente NO usados por ningún claim → contexto secundario. */
  context: AIResearchSourceFragment[];
  /** El excerpt crudo (concat de la fuente) se conserva como último recurso. */
  excerpt: string;
};

/**
 * Selecciona la evidencia visible de una fuente: usa SOLO los fragmentos
 * efectivamente citados por claims verificados como evidencia principal, y deja
 * el resto como contexto secundario. No modifica el payload (regla 6).
 */
export function buildSourceEvidencePlan(source: AIResearchSource): AIResearchEvidencePlan {
  const claims = (source.claims ?? []).filter((c) => c.verified);
  const fragments = (source.metadata?.fragments as AIResearchSourceFragment[] | undefined) ?? [];
  const usedIds = new Set(
    claims.map((c) => c.fragment_id).filter((id): id is string => Boolean(id)),
  );

  const primary: AIResearchPrimaryEvidence[] = claims.map((c) => {
    const frag = fragments.find((f) => f.id === c.fragment_id);
    return {
      fragment_id: c.fragment_id,
      article: frag?.article ?? null,
      afirmacion: c.afirmacion,
      evidencia: c.evidencia,
      vigencia_nota: c.vigencia_nota,
    };
  });

  const context = fragments.filter((f) => !(f.id && usedIds.has(f.id)));

  return { primary, context, excerpt: source.excerpt ?? '' };
}

export type AIResearchMatiz = {
  tipo?: string;
  fuente_ids?: string[];
  claims?: string[];
  nota?: string;
  notas?: string;
  observada?: boolean;
};

/** Tipo de investigación devuelto por el backend (Fase 4.2.6). */
export type AIResearchType = 'jurisprudence' | 'document' | 'mixed';

export type AIResearchRequest = {
  id: string;
  workspace_id: string;
  lawyer_id: string;
  query: string;
  answer: string;
  sources: AIResearchSource[];
  model: string | null;
  created_at: string;
  /** Fase 4.2.6: expuesto solo en la respuesta POST; opcional por retrocompatibilidad. */
  research_type?: AIResearchType;
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
  /** Fase 4.2.6: 'jurisprudence' | 'document' | 'mixed'. Solo en la respuesta POST. */
  research_type?: AIResearchType;
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
