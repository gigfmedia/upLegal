import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import posthog from 'posthog-js';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';
import { canUseAIFeature, type AIFeatureKey } from '@/lib/aiFeatures';
import type { Database } from '@/types/supabase';

export type AISubscription = Database['public']['Tables']['ai_subscriptions']['Row'];

export const AI_SUBSCRIPTION_QUERY_KEY = ['ai-subscription'] as const;

export type AIAccessStatus =
  | 'trialing'
  | 'active'
  | 'cancelled'
  | 'past_due'
  | 'expired'
  | 'none';

const getApiBaseUrl = (): string => {
  const base = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  return (base || 'http://localhost:3001').replace(/\/+$/, '');
};

const getAccessToken = async (): Promise<string | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Suscripción AI del abogado (la fila más reciente). El acceso lo calcula el
 * backend (402 AI_PLAN_REQUIRED); aquí solo orientamos la UI.
 */
export function useAISubscription() {
  const { user } = useAuth();
  const lawyerId = user?.id ?? null;

  const query = useQuery<AISubscription | null>({
    queryKey: [...AI_SUBSCRIPTION_QUERY_KEY, lawyerId],
    enabled: !!lawyerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_subscriptions')
        .select('*')
        .eq('lawyer_id', lawyerId!)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('[LegalUpAI] Error cargando suscripción:', error);
        return null;
      }

      return (data ?? null) as AISubscription | null;
    },
  });

  const subscription = query.data ?? null;
  const now = Date.now();

  const trialEndsAt = subscription?.trial_ends_at ?? null;
  const trialEndMs = trialEndsAt ? Date.parse(trialEndsAt) : 0;
  const currentPeriodEnd = subscription?.current_period_end ?? null;
  const periodEndMs = currentPeriodEnd ? Date.parse(currentPeriodEnd) : 0;
  const withinTrial = trialEndMs > now;

  const isTrialing =
    (subscription?.status === 'trialing' && withinTrial) ||
    ((subscription?.status === 'cancelled' || subscription?.status === 'past_due') &&
      withinTrial &&
      periodEndMs <= now);
  const isActive = subscription?.status === 'active' && periodEndMs > now;
  const isCancelledWithAccess =
    subscription?.status === 'cancelled' && (periodEndMs > now || withinTrial);

  const hasAccess = isTrialing || isActive || isCancelledWithAccess;

  let status: AIAccessStatus;
  if (!subscription) {
    status = 'none';
  } else if (isActive) {
    status = 'active';
  } else if (isTrialing) {
    status = 'trialing';
  } else if (hasAccess) {
    status = 'cancelled';
  } else if (subscription.status === 'cancelled') {
    status = 'cancelled';
  } else if (subscription.status === 'past_due') {
    status = 'past_due';
  } else {
    // trialing vencido o expired.
    status = 'expired';
  }

  const trialDaysRemaining =
    trialEndMs > now ? Math.max(1, Math.ceil((trialEndMs - now) / DAY_MS)) : 0;

  return {
    ...query,
    subscription,
    status,
    plan: subscription?.plan ?? 'free',
    isTrialing,
    isActive,
    hasAccess,
    trialEndsAt,
    trialDaysRemaining,
    currentPeriodEnd,
    cancelAtPeriodEnd: !!subscription?.cancel_at_period_end,
  };
}

/**
 * Indica si el abogado puede usar una feature de LegalUp AI.
 * Requiere acceso (trial o plan activo) y plan con la feature.
 */
export function useAIFeatureAccess() {
  const { subscription, status, plan, hasAccess, trialDaysRemaining } = useAISubscription();

  return {
    subscription,
    plan,
    status,
    hasAccess,
    trialDaysRemaining,
    canUse: (feature: AIFeatureKey) => hasAccess && canUseAIFeature(feature, plan),
  };
}

export type AITrialErrorCode =
  | 'EMAIL_NOT_CONFIRMED'
  | 'NOT_LAWYER'
  | 'TRIAL_ALREADY_USED'
  | 'AI_PLAN_REQUIRED';

export class AITrialError extends Error {
  code: AITrialErrorCode;
  constructor(message: string, code: AITrialErrorCode) {
    super(message);
    this.name = 'AITrialError';
    this.code = code;
  }
}

/** Inicia la prueba gratuita (idempotente en el backend). */
export function useStartAITrial() {
  const queryClient = useQueryClient();

  return useMutation<{ subscription: AISubscription; already_started: boolean }, Error, void>({
    mutationFn: async () => {
      const token = await getAccessToken();
      if (!token) throw new Error('Sesión no válida. Vuelve a iniciar sesión.');

      const res = await fetch(`${getApiBaseUrl()}/api/ai/trial/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Mapea códigos conocidos del backend para que la UI pueda reaccionar.
        const code = body?.code as AITrialErrorCode | undefined;
        throw new AITrialError(body?.error || 'No se pudo iniciar la prueba gratuita.', code || 'AI_PLAN_REQUIRED');
      }
      return body;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: AI_SUBSCRIPTION_QUERY_KEY });
      // Onboarding comienza cuando el abogado inicia su primer trial.
      try {
        posthog.capture('ai_onboarding_started', { first_trial: !data.already_started });
      } catch {
        /* analytics no debe romper el flujo */
      }
    },
  });
}

/** Reenvía el correo de confirmación de la cuenta del usuario actual. */
export async function resendAIEmailConfirmation(): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const email = session?.user?.email;
  if (!email) throw new Error('No se pudo reenviar el correo: falta tu sesión.');
  const { error } = await supabase.auth.resend({ type: 'signup', email });
  if (error) throw error;
}

export type AISubscribeResult = { success: boolean; initPoint: string };

/** Crea el preapproval recurrente en Mercado Pago; devuelve el init_point. */
export function useAISubscribe() {
  const queryClient = useQueryClient();

  return useMutation<AISubscribeResult, Error, void>({
    mutationFn: async () => {
      const token = await getAccessToken();
      if (!token) throw new Error('Sesión no válida. Vuelve a iniciar sesión.');

      const res = await fetch(`${getApiBaseUrl()}/api/ai/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || 'No se pudo iniciar la suscripción.');
      return body;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AI_SUBSCRIPTION_QUERY_KEY });
    },
  });
}

/** Baja la suscripción a fin de período (conserva acceso hasta current_period_end). */
export function useCancelAISubscription() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      const token = await getAccessToken();
      if (!token) throw new Error('Sesión no válida. Vuelve a iniciar sesión.');

      const res = await fetch(`${getApiBaseUrl()}/api/ai/subscription/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || 'No se pudo cancelar la suscripción.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AI_SUBSCRIPTION_QUERY_KEY });
    },
  });
}
