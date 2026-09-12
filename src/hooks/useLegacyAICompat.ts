import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';

/**
 * 4.30D — Legacy AI compatibility detection.
 *
 * Cases are the primary product entry. Standalone /lawyer/ai remains
 * compatibility infrastructure for:
 *  - lawyers with legacy AI history (any ai_subscriptions row), or
 *  - lawyers owning workspaces not linked to any lawyer_case.
 *
 * Normal new Pro users (no legacy row, no unlinked workspaces) should not
 * see AI as an equal primary product in navigation.
 */

/** Pure policy: show the legacy AI compatibility entry. */
export function shouldShowLegacyAI(input: {
  hasSubscriptionRow: boolean;
  hasUnlinkedWorkspaces: boolean;
}): boolean {
  return input.hasSubscriptionRow || input.hasUnlinkedWorkspaces;
}

export type LinkedCaseResolution =
  | { type: 'redirect'; caseId: string }
  | { type: 'legacy' };

/**
 * Pure policy for the old detail route /lawyer/ai/cases/:workspaceId.
 * Redirects to the canonical Case route only when exactly one owned
 * lawyer_case references the workspace. Zero or multiple matches fall
 * back to the legacy detail (never guess, never cross tenants — the
 * caller must already filter by the authenticated lawyer).
 */
export function resolveLinkedCase(linkedCaseIds: string[]): LinkedCaseResolution {
  if (linkedCaseIds.length === 1) {
    return { type: 'redirect', caseId: linkedCaseIds[0] };
  }
  return { type: 'legacy' };
}

export const LEGACY_AI_COMPAT_QUERY_KEY = ['legacy-ai-compat'] as const;

export function useLegacyAICompat() {
  const { user } = useAuth();
  const lawyerId = user?.id ?? null;

  const query = useQuery({
    queryKey: [...LEGACY_AI_COMPAT_QUERY_KEY, lawyerId],
    enabled: !!lawyerId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const [{ data: sub }, { data: workspaces }, { data: cases }] = await Promise.all([
        supabase
          .from('ai_subscriptions')
          .select('id')
          .eq('lawyer_id', lawyerId!)
          .limit(1)
          .maybeSingle(),
        supabase.from('ai_workspaces').select('id').eq('lawyer_id', lawyerId!).limit(200),
        supabase.from('lawyer_cases').select('ai_workspace_id').eq('lawyer_id', lawyerId!).limit(500),
      ]);
      const linked = new Set(
        (cases ?? []).map((c) => c.ai_workspace_id).filter(Boolean) as string[]
      );
      const hasUnlinkedWorkspaces = (workspaces ?? []).some((w) => !linked.has(w.id));
      return {
        hasSubscriptionRow: !!sub,
        hasUnlinkedWorkspaces,
        showLegacyAI: shouldShowLegacyAI({
          hasSubscriptionRow: !!sub,
          hasUnlinkedWorkspaces,
        }),
      };
    },
  });

  return query;
}
