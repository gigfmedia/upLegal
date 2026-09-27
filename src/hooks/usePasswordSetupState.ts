import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';

export const PASSWORD_SETUP_QUERY_KEY = ['auth-password-setup'] as const;

export type PasswordSetupState =
  | 'setup_required' // app_metadata.password_setup === false
  | 'setup_complete' // app_metadata.password_setup === true
  | 'legacy_unknown' // key absent: fail conservative (Cambiar path)
  | 'loading'
  | 'error';

export type UsePasswordSetupState = {
  state: PasswordSetupState;
  /** Raw marker value (true/false/absent) for tests/telemetry-free logic. */
  marker: boolean | null;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
};

const getApiBaseUrl = (): string => {
  const base = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  return (base || 'http://localhost:3001').replace(/\/+$/, '');
};

const getAccessToken = async (): Promise<string | null> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
};

/**
 * 4.53D — password-setup authority from server-controlled app_metadata.
 *
 * Mapping: false -> setup_required, true -> setup_complete,
 * absent -> legacy_unknown (fail conservative: Cambiar with real verify).
 * Never infers from providers/identities/user_metadata, and never from
 * auth.users.encrypted_password (GoTrue pre-fills unknown hashes for
 * admin-created users, so it cannot distinguish).
 */
export function usePasswordSetupState(): UsePasswordSetupState {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const query = useQuery<boolean | null | undefined>({
    queryKey: [...PASSWORD_SETUP_QUERY_KEY, userId],
    enabled: !!userId,
    retry: false,
    queryFn: async () => {
      const {
        data: { user: fresh },
        error,
      } = await supabase.auth.getUser();
      if (error) throw error;
      if (!fresh) return undefined;
      const marker = (fresh.app_metadata as Record<string, unknown> | null)?.password_setup;
      if (marker === true) return true;
      if (marker === false) return false;
      return null;
    },
  });

  if (query.isLoading) {
    return { state: 'loading', marker: null, isLoading: true, isError: false, refetch: () => void query.refetch() };
  }
  if (query.isError || query.data === undefined) {
    return { state: 'error', marker: null, isLoading: false, isError: true, refetch: () => void query.refetch() };
  }
  if (query.data === null) {
    return { state: 'legacy_unknown', marker: null, isLoading: false, isError: false, refetch: () => void query.refetch() };
  }
  return {
    state: query.data ? 'setup_complete' : 'setup_required',
    marker: query.data,
    isLoading: false,
    isError: false,
    refetch: () => void query.refetch(),
  };
}

/**
 * Marks server-side password setup AFTER a successful password update.
 * The endpoint derives the target from the bearer token; the browser never
 * chooses a uid/email. No password travels through this call.
 * Returns true when the marker is confirmed, false on recoverable failure
 * (caller must NOT claim full success; retry stays possible).
 */
export async function markPasswordSetupComplete(): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) return false;
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/auth/password-setup-complete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json().catch(() => ({}));
    return res.ok && body?.success === true;
  } catch {
    return false;
  }
}
