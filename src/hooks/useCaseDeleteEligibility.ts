import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

/** Advisory only: the DB rechecks atomically on DELETE. Never fetched on cards. */
export function useCaseDeleteEligibility(caseId: string, open: boolean) {
  const [result, setResult] = useState<{ id: string; allowed: boolean } | null>(null);
  useEffect(() => {
    let active = true;
    setResult(null);
    if (open && caseId) {
      void (async () => {
        try {
          const { data, error } = await supabase.rpc('get_case_delete_eligibility', { p_case_id: caseId });
          if (active) setResult({ id: caseId, allowed: !error && typeof data === 'object' && data !== null && !Array.isArray(data) && data.can_delete === true });
        } catch {
          if (active) setResult({ id: caseId, allowed: false });
        }
      })();
    }
    return () => { active = false; };
  }, [caseId, open]);
  return { canDelete: open && result?.id === caseId && result.allowed, loading: open && !result };
}

export function isCaseNotDeletable(error: unknown) {
  return typeof error === 'object' && error !== null && 'message' in error
    && String(error.message).includes('CASE_NOT_DELETABLE');
}
