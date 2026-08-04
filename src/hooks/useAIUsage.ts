import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';
import { tokensToCredits } from '@/lib/aiUsage';

export type AIUsageSummary = {
  total_tokens: number;
  total_credits: number;
  document_analysis_count: number;
  chat_message_count: number;
  estimated_cost_usd: number;
};

export type AIUsageResponse = {
  success: boolean;
  period_start: string;
  period_end: string;
  usage: AIUsageSummary;
  protection_limits: {
    monthly_tokens: number;
    monthly_requests: number;
    rate_limit_per_minute: number;
    monthly_tokens_used: number;
    monthly_requests_used: number;
  };
};

export const AI_USAGE_QUERY_KEY = ['ai-usage'] as const;

const getApiBaseUrl = (): string => {
  const base = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  return (base || 'http://localhost:3001').replace(/\/+$/, '');
};

/**
 * Consumo de IA del abogado en el mes en curso (Fase 3.6).
 * Expone tokens/créditos/costos para el medidor de la UI.
 */
export function useAIUsage() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  return useQuery<AIUsageResponse | null>({
    queryKey: [...AI_USAGE_QUERY_KEY, userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? null;
      if (!token) return null;

      const res = await fetch(`${getApiBaseUrl()}/api/ai/usage`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      return (await res.json()) as AIUsageResponse;
    },
  });
}

/** Formatea tokens como "1.234.567" (es-CL). */
export function formatTokens(value: number): string {
  return new Intl.NumberFormat('es-CL').format(value || 0);
}
