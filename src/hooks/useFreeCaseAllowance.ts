import { useAIUsage, type AIAllowancePool } from '@/hooks/useAIUsage';

export type FreePool = AIAllowancePool & { remaining: number };

export type FreeCaseAllowance = {
  isFreeCase: boolean;
  isLoading: boolean;
  chat: FreePool;
  analysis: FreePool;
  documents: FreePool;
  researchAvailable: boolean;
};

const EMPTY_POOL: FreePool = { used: 0, limit: null, remaining: 0, reset: null, available: false };

/**
 * 4.44A — free first-Case lifetime allowance from server authority.
 * Returns isFreeCase=false unless the backend resolves plan 'free_case'.
 * Backend remains the quota authority; this hook is display-only.
 */
export function useFreeCaseAllowance(): FreeCaseAllowance {
  const { data, isLoading } = useAIUsage();
  const allowance = data?.allowance;

  if (!allowance || allowance.plan !== 'free_case') {
    return {
      isFreeCase: false,
      isLoading,
      chat: EMPTY_POOL,
      analysis: EMPTY_POOL,
      documents: EMPTY_POOL,
      researchAvailable: false,
    };
  }

  const withRemaining = (pool: AIAllowancePool): FreePool => ({
    ...pool,
    remaining: Math.max(0, (pool.limit ?? 0) - pool.used),
  });

  return {
    isFreeCase: true,
    isLoading,
    chat: withRemaining(allowance.chat),
    analysis: withRemaining(allowance.analysis),
    documents: withRemaining(allowance.documents),
    researchAvailable: allowance.research.available === true,
  };
}
