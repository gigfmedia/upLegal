import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const authMocks = {
  user: { id: 'lawyer-1' } as { id: string } | null,
  session: { user: { id: 'lawyer-1' } } as unknown as { user: { id: string } } | null,
  rows: [] as unknown[],
  error: null as { message: string } | null,
};

vi.mock('@/contexts/AuthContext/clean/useAuth', () => ({
  useAuth: () => ({ user: authMocks.user }),
}));

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => {
        void args;
        return Promise.resolve({ data: { session: authMocks.session } });
      },
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => {
            if (authMocks.error) return Promise.resolve({ data: null, error: authMocks.error });
            // Simulate RLS: no session → silent empty (proven in production diagnosis)
            if (!authMocks.session) return Promise.resolve({ data: [], error: null });
            return Promise.resolve({ data: authMocks.rows, error: null });
          },
        }),
      }),
    }),
  },
}));

vi.mock('@/lib/normalizeEmail', () => ({
  normalizeEmail: (v: unknown) => v,
}));
vi.mock('@/lib/activationAnalytics', () => ({
  trackFirstClientIfNeeded: vi.fn(),
}));

import { useLawyerClients } from '@/hooks/useLawyerClients';

describe('4.31C.1 — useLawyerClients session guard (real-data path)', () => {
  beforeEach(() => {
    authMocks.user = { id: 'lawyer-1' };
    authMocks.session = { user: { id: 'lawyer-1' } } as unknown as { user: { id: string } };
    authMocks.rows = [
      { id: 'c-1', lawyer_id: 'lawyer-1', name: 'Juan Guajardo' },
      { id: 'c-2', lawyer_id: 'lawyer-1', name: 'Cliente Test' },
    ];
    authMocks.error = null;
  });

  it('valid session returns the two owned clients', async () => {
    const { result } = renderHook(() => useLawyerClients());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeNull();
    expect(result.current.clients).toHaveLength(2);
  });

  it('missing session surfaces an explicit error instead of silent empty', async () => {
    authMocks.session = null;
    const { result } = renderHook(() => useLawyerClients());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.clients).toHaveLength(0);
    expect(result.current.error).toMatch(/sesi.n/i);
  });

  it('refetch after session restore returns clients (no stale closure)', async () => {
    authMocks.session = null;
    const { result } = renderHook(() => useLawyerClients());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).not.toBeNull();
    authMocks.session = { user: { id: 'lawyer-1' } } as unknown as { user: { id: string } };
    await result.current.refetch();
    await waitFor(() => expect(result.current.clients).toHaveLength(2));
    expect(result.current.error).toBeNull();
  });

  it('query error is surfaced, not swallowed as empty', async () => {
    authMocks.error = new Error('RLS denied');
    const { result } = renderHook(() => useLawyerClients());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('RLS denied');
  });
});
