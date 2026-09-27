import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';
import { normalizePlanCode } from '@/lib/aiFeatures';

export const PRO_SUBSCRIPTION_QUERY_KEY = ['pro-subscription'];

export type CanonicalPaidPlan = 'pro' | 'plus' | null;

/**
 * 4.57D: explicit row shape for lawyer_subscriptions (the generated
 * Database type does not cover this table; untyped access would fail).
 * Backend remains the authority; new transition columns included.
 */
export type ProSubscriptionRow = {
  id: string;
  lawyer_id: string;
  plan: string | null;
  status: string | null;
  provider: string | null;
  provider_subscription_id: string | null;
  amount_clp: number | null;
  is_founder: boolean | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  cancelled_at: string | null;
  pending_plan: string | null;
  plan_change_status: string | null;
  plan_change_effective_at: string | null;
  pending_provider_subscription_id: string | null;
  pending_init_point: string | null;
  previous_provider_subscription_id: string | null;
};

export function useProSubscription() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: rawSubscription, isLoading, isFetching, refetch } = useQuery({
    queryKey: [...PRO_SUBSCRIPTION_QUERY_KEY, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      // Direct Supabase read (RLS owner)
      const { data, error } = await supabase
        .from('lawyer_subscriptions')
        .select('*')
        .eq('lawyer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as ProSubscriptionRow | null;
    },
    enabled: !!user?.id,
  });

  const subscription = rawSubscription;

  const hasProAccess = (() => {
    if (!subscription) return false;
    const now = Date.now();
    const periodEndMs = subscription.current_period_end ? Date.parse(subscription.current_period_end) : 0;
    if (subscription.status === 'active') return periodEndMs > now;
    if (subscription.status === 'cancelled') return periodEndMs > now;
    return false;
  })();

  const isActive = subscription?.status === 'active' && hasProAccess;
  const isCancelled = subscription?.status === 'cancelled';
  const isPastDue = subscription?.status === 'past_due';
  const isExpired = subscription?.status === 'expired';
  const isPending = subscription?.status === 'pending';

  // 4.57D: canonical paid tier from the stored row (legacy raw values map
  // to pro; unknown maps to null, never to plus). Plus v1 upgrade/
  // downgrade transition state, server-persisted (never browser state).
  const canonicalPlan: CanonicalPaidPlan =
    normalizePlanCode(subscription?.plan) === 'plus' ? 'plus'
    : subscription?.plan != null && normalizePlanCode(subscription.plan) === 'pro' ? 'pro'
    : null;
  const isPlus = canonicalPlan === 'plus' && hasProAccess;
  const upgradePending = subscription?.plan_change_status === 'upgrade_pending';
  const downgradeScheduled = subscription?.plan_change_status === 'downgrade_scheduled';
  const oldProCancelPending = !!subscription?.previous_provider_subscription_id;

  return {
    subscription,
    hasProAccess,
    isActive,
    isCancelled,
    isPastDue,
    isExpired,
    isPending,
    status: subscription?.status ?? null,
    isLoading,
    isFetching,
    refetch,
    plan: subscription?.plan ?? null,
    canonicalPlan,
    isPlus,
    isFounder: !!subscription?.is_founder,
    currentPeriodEnd: subscription?.current_period_end ?? null,
    pendingPlan: subscription?.pending_plan ?? null,
    planChangeStatus: subscription?.plan_change_status ?? null,
    planChangeEffectiveAt: subscription?.plan_change_effective_at ?? null,
    upgradePending,
    downgradeScheduled,
    oldProCancelPending,
  };
}

export type ProFounderStatus = {
  isFounder: boolean;
  founderSlotsRemaining: number;
  previewPriceClp: number;
  introPriceClp: number;
  standardPriceClp: number;
};

/**
 * 4.32B.4 — read-only checkout preview (display only).
 * NEVER a price authority: POST /api/pro/subscribe reserves atomically.
 */
export function useProFounderStatus(enabled = true) {
  const { user } = useAuth();
  const query = useQuery<ProFounderStatus | null>({
    queryKey: ['pro-founder-status', user?.id],
    enabled: enabled && !!user?.id,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/pro/founder-status`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return null;
      return (await res.json()) as ProFounderStatus;
    },
  });
  return query;
}

/**
 * 4.57B multi-tier foundation: optional purchase target. Default 'pro' keeps
 * existing behavior byte-for-byte (no request body). 'plus' forwards the
 * target plan; the server resolves price/quotas (Plus = $79.990, no proration).
 */
export function useProSubscribe(targetPlan: 'pro' | 'plus' = 'pro') {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/pro/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        ...(targetPlan !== 'pro' ? { body: JSON.stringify({ plan: targetPlan }) } : {}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to subscribe');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRO_SUBSCRIPTION_QUERY_KEY });
      if (user?.id) queryClient.invalidateQueries({ queryKey: [...PRO_SUBSCRIPTION_QUERY_KEY, user.id] });
    },
  });
}

export function useProCancel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/pro/subscription/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRO_SUBSCRIPTION_QUERY_KEY });
    },
  });
}

/**
 * 4.57D: schedule a Plus → Pro downgrade (effective at the Plus period end;
 * Plus limits stay fully active until then). Server-persisted, no proration.
 */
export function useProDowngrade() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/pro/downgrade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ target_plan: 'pro' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to schedule downgrade');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRO_SUBSCRIPTION_QUERY_KEY });
    },
  });
}

/** 4.57D: cancel a scheduled (not yet effective) Plus → Pro downgrade. */
export function useCancelProDowngrade() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/pro/downgrade/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel downgrade');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRO_SUBSCRIPTION_QUERY_KEY });
    },
  });
}
