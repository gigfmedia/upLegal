import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';

// 4.36B — stable token raised by the lifetime free-case trigger
// (trg_claim_free_case_grant). Frontend maps it to the LegalUp Pro modal.
export const FREE_CASE_ALLOWANCE_CONSUMED = 'FREE_CASE_ALLOWANCE_CONSUMED';

// 4.36D — stable token raised when Pro active capacity is exhausted
// (commit-time admission trigger). Frontend maps it to the capacity UX,
// never to the subscription modal.
export const ACTIVE_CASE_LIMIT_REACHED = 'ACTIVE_CASE_LIMIT_REACHED';

export type CaseEntitlement = {
  hasProAccess: boolean;
  freeCaseConsumed: boolean;
  /** 4.36D — live ACTIVE direct count (server authority; never count locally). */
  activeCaseCount: number;
  /** 4.36D — canonical Pro limit received from the server (no local literal). */
  activeCaseLimit: number;
  canCreateDirectCase: boolean;
};

// Fail-closed: unknown/loading/anonymous callers cannot create.
const FAIL_CLOSED: CaseEntitlement = {
  hasProAccess: false,
  freeCaseConsumed: true,
  activeCaseCount: 0,
  activeCaseLimit: 0,
  canCreateDirectCase: false,
};

function tokenInMessage(err: unknown, token: string): boolean {
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
  return msg.includes(token);
}

export function isFreeCaseEntitlementError(err: unknown): boolean {
  return tokenInMessage(err, FREE_CASE_ALLOWANCE_CONSUMED);
}

export function isActiveCapacityError(err: unknown): boolean {
  return tokenInMessage(err, ACTIVE_CASE_LIMIT_REACHED);
}

function toCount(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

function normalize(raw: unknown): CaseEntitlement {
  const r = (raw ?? {}) as Partial<Record<keyof CaseEntitlement, unknown>>;
  return {
    hasProAccess: r.hasProAccess === true,
    // Fail-closed on malformed payloads.
    freeCaseConsumed: r.freeCaseConsumed !== false,
    activeCaseCount: toCount(r.activeCaseCount),
    activeCaseLimit: toCount(r.activeCaseLimit),
    canCreateDirectCase: r.canCreateDirectCase === true,
  };
}

// 4.36B — canonical UI read authority (server-side lifetime ledger via
// get_my_case_entitlement). Never infer lifetime consumption from visible rows.
export function useCaseEntitlement() {
  const { user } = useAuth();
  const [entitlement, setEntitlement] = useState<CaseEntitlement>(FAIL_CLOSED);
  const [loading, setLoading] = useState(true);
  // 4.43A: error explícito para no confundir falla de lectura con falta de
  // derecho (el paywall solo abre con lectura exitosa + canCreate=false).
  const [error, setError] = useState(false);

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
      setError(false);
      return next;
    } catch {
      setEntitlement(FAIL_CLOSED);
      setError(true);
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
    error,
    refetch,
    canCreateDirectCase: entitlement.canCreateDirectCase,
    freeCaseConsumed: entitlement.freeCaseConsumed,
    hasProAccess: entitlement.hasProAccess,
  };
}
