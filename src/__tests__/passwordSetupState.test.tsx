import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

const authState = vi.hoisted(() => ({ appMetadata: {} as Record<string, unknown>, error: null as unknown }));
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: async () => {
        if (authState.error) return { data: { user: null }, error: authState.error };
        return { data: { user: { id: 'u1', app_metadata: authState.appMetadata } }, error: null };
      },
    },
  },
}));
vi.mock('@/contexts/AuthContext/clean/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1' } }),
}));

import { usePasswordSetupState } from '@/hooks/usePasswordSetupState';

const renderHookState = async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => usePasswordSetupState(), { wrapper });
  await waitFor(() => expect(result.current.state).not.toBe('loading'));
  return result.current;
};

describe('4.53D password-setup authority mapping', () => {
  it('absent key (incl. empty metadata) -> legacy_unknown, never guessed', async () => {
    authState.appMetadata = {};
    const s = await renderHookState();
    expect(s.state).toBe('legacy_unknown');
  });

  it('explicit false marker -> setup_required', async () => {
    authState.appMetadata = { role: 'lawyer', password_setup: false };
    const s = await renderHookState();
    expect(s.state).toBe('setup_required');
  });

  it('true -> setup_complete (Cambiar)', async () => {
    authState.appMetadata = { role: 'lawyer', password_setup: true };
    const s = await renderHookState();
    expect(s.state).toBe('setup_complete');
  });

  it('absent -> legacy_unknown (fail conservative Cambiar)', async () => {
    authState.appMetadata = { role: 'lawyer' };
    const s = await renderHookState();
    expect(s.state).toBe('legacy_unknown');
  });

  it('user_metadata markers never drive state (server authority only)', () => {
    const src = read('src/hooks/usePasswordSetupState.ts')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|\s)\/\/.*$/gm, '$1');
    expect(src).toContain('app_metadata');
    expect(src).not.toContain('user_metadata');
    expect(src).not.toContain('has_auth_password');
    expect(src).not.toContain('encrypted_password');
  });

  it('recovery + accept flows finalize the server marker (not user_metadata)', () => {
    for (const p of ['src/pages/auth/ResetPasswordPage.tsx', 'src/pages/auth/AcceptInvite.tsx']) {
      expect(read(p)).toContain('markPasswordSetupComplete');
    }
  });
});
