import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';
import { selectLatestAnalysis, type LatestAnalysisRow } from '@/lib/aiLatestAnalysis';

export const AI_LATEST_ANALYSIS_QUERY_KEY = ['ai-case-latest-analysis'] as const;

export type LatestCaseAnalysis = LatestAnalysisRow & {
  documentFilename: string;
};

/**
 * 4.46B — latest persisted document summary for a Case workspace.
 * Single read query (analyses + embedded owner document row, no N+1),
 * authenticated RLS `select_own` on both tables. Returns null while
 * loading, on error, or when no non-empty summary exists (caller hides
 * the card). Never calls the provider, never consumes quota.
 */
export function useLatestCaseAnalysis(workspaceId: string | null | undefined) {
  const { user } = useAuth();
  const lawyerId = user?.id ?? null;

  return useQuery<LatestCaseAnalysis | null>({
    queryKey: [...AI_LATEST_ANALYSIS_QUERY_KEY, lawyerId, workspaceId],
    enabled: !!lawyerId && !!workspaceId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_document_analyses')
        .select(
          'id,document_id,summary,created_at,updated_at,document:ai_documents!inner(id,original_filename,workspace_id)'
        )
        .eq('workspace_id', workspaceId!)
        .order('updated_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('[LegalUpAI] Error cargando último análisis:', error);
        throw new Error('No se pudo cargar el último análisis.');
      }

      const picked = selectLatestAnalysis((data ?? []) as unknown as LatestAnalysisRow[]);
      if (!picked) return null;
      return {
        ...picked,
        documentFilename: picked.document?.original_filename ?? 'Documento',
      };
    },
  });
}
