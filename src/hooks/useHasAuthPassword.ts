import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';

export const AUTH_PASSWORD_QUERY_KEY = ['auth-has-password'] as const;

export type HasAuthPasswordState = {
  /** null while unknown; never guess on error (caller shows retry). */
  hasPassword: boolean | null;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
};

/**
 * 4.53B — authoritative password existence for the current user.
 * Calls public.has_auth_password() (caller-only, auth.uid()). Never infers
 * from providers/identities/metadata markers.
 */
export function useHasAuthPassword(): HasAuthPasswordState {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const query = useQuery<boolean | null>({
    queryKey: [...AUTH_PASSWORD_QUERY_KEY, userId],
    enabled: !!userId,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('has_auth_password');
      if (error) throw error;
      return data === true;
    },
  });

  return {
    hasPassword: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: () => {
      void query.refetch();
    },
  };
}
