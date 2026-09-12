import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
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
 */
export default function LegacyAICaseRoute() {
  const { caseId: workspaceId } = useParams<{ caseId: string }>();
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
    return <Navigate to={`/lawyer/cases/${linkedCaseId}?tab=ai`} replace />;
  }

  return <AICaseDetail />;
}
