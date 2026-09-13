import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';

export const PRO_SUBSCRIPTION_QUERY_KEY = ['pro-subscription'];

export function useProSubscription() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: subscription, isLoading, isFetching, refetch } = useQuery({
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
      return data;
    },
    enabled: !!user?.id,
  });

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
    isFounder: !!subscription?.is_founder,
    currentPeriodEnd: subscription?.current_period_end ?? null,
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

export function useProSubscribe() {
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
