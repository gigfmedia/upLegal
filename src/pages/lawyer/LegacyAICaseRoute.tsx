import { useEffect, useState } from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';
import { resolveLinkedCase } from '@/hooks/useLegacyAICompat';
import AICaseDetail from '@/pages/lawyer/AICaseDetail';

/**
 * 4.30D — Compatibility wrapper for /lawyer/ai/cases/:workspaceId.
 *
 * Linked workspaces (exactly one owned lawyer_case with
 * ai_workspace_id = workspaceId) redirect to the canonical Case route.
 * Unlinked, ambiguous or foreign workspaces render the legacy detail.
 * Direct URL access is always preserved; lookup is owner-scoped.
 *
 * 4.34J — preserves legacy ?tab= intent against canonical DIRECT tabs:
 * research/intelligence/documents/timeline/overview map to their
 * canonical top-level tab (4.34J removed the generic IA bucket).
 */
const LEGACY_TAB_TARGET: Record<string, string> = {
  research: '?tab=research',
  intelligence: '?tab=intelligence',
  documents: '?tab=documents',
  timeline: '?tab=activity',
  overview: '?tab=overview',
};

export default function LegacyAICaseRoute() {
  const { caseId: workspaceId } = useParams<{ caseId: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [linkedCaseId, setLinkedCaseId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (!workspaceId || !user?.id) {
      setLinkedCaseId(null);
      return;
    }
    let cancelled = false;
    supabase
      .from('lawyer_cases')
      .select('id')
      .eq('ai_workspace_id', workspaceId)
      .eq('lawyer_id', user.id)
      .then(({ data }) => {
        if (cancelled) return;
        const ids = (data ?? []).map((r) => r.id);
        const resolution = resolveLinkedCase(ids);
        setLinkedCaseId(resolution.type === 'redirect' ? resolution.caseId : null);
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceId, user?.id]);

  if (linkedCaseId === undefined) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-900" aria-hidden="true" />
      </div>
    );
  }

  if (linkedCaseId) {
    const suffix = LEGACY_TAB_TARGET[searchParams.get('tab') ?? ''] ?? '?tab=ai';
    return <Navigate to={`/lawyer/cases/${linkedCaseId}${suffix}`} replace />;
  }

  return <AICaseDetail />;
}
