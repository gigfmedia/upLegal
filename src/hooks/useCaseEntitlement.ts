import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';

// 4.36B — stable token raised by the lifetime free-case trigger
// (trg_claim_free_case_grant). Frontend maps it to the LegalUp Pro modal.
export const FREE_CASE_ALLOWANCE_CONSUMED = 'FREE_CASE_ALLOWANCE_CONSUMED';

export type CaseEntitlement = {
  hasProAccess: boolean;
  freeCaseConsumed: boolean;
  canCreateDirectCase: boolean;
};

// Fail-closed: unknown/loading/anonymous callers cannot create.
const FAIL_CLOSED: CaseEntitlement = {
  hasProAccess: false,
  freeCaseConsumed: true,
  canCreateDirectCase: false,
};

export function isFreeCaseEntitlementError(err: unknown): boolean {
  if (!err) return false;
  let msg: string;
  if (err instanceof Error) msg = err.message;
  else if (typeof err === 'string') msg = err;
  else {
    try {
      msg = JSON.stringify(err);
    } catch {
      return false;
    }
  }
  return msg.includes(FREE_CASE_ALLOWANCE_CONSUMED);
}

function normalize(raw: unknown): CaseEntitlement {
  const r = (raw ?? {}) as Partial<Record<keyof CaseEntitlement, unknown>>;
  return {
    hasProAccess: r.hasProAccess === true,
    // Fail-closed on malformed payloads.
    freeCaseConsumed: r.freeCaseConsumed !== false,
    canCreateDirectCase: r.canCreateDirectCase === true,
  };
}

// 4.36B — canonical UI read authority (server-side lifetime ledger via
// get_my_case_entitlement). Never infer lifetime consumption from visible rows.
export function useCaseEntitlement() {
  const { user } = useAuth();
  const [entitlement, setEntitlement] = useState<CaseEntitlement>(FAIL_CLOSED);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async (): Promise<CaseEntitlement> => {
    if (!user?.id) {
      setEntitlement(FAIL_CLOSED);
      setLoading(false);
      return FAIL_CLOSED;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_my_case_entitlement');
      if (error) throw error;
      const next = normalize(data);
      setEntitlement(next);
      return next;
    } catch {
      setEntitlement(FAIL_CLOSED);
      return FAIL_CLOSED;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return {
    entitlement,
    loading,
    refetch,
    canCreateDirectCase: entitlement.canCreateDirectCase,
    freeCaseConsumed: entitlement.freeCaseConsumed,
    hasProAccess: entitlement.hasProAccess,
  };
}
