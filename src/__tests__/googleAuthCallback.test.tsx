import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const cbState = vi.hoisted(() => ({
  exchanged: [] as unknown[],
  session: null as null | { user: { id: string; email_confirmed_at: string; user_metadata: Record<string, unknown> } },
  profile: null as null | { role: string },
}));

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      exchangeCodeForSession: async (code: string) => {
        cbState.exchanged.push(code);
        return { error: null };
      },
      getSession: async () => ({ data: { session: cbState.session ? { user: cbState.session.user } : null }, error: null }),
      getUser: async () => ({ data: { user: cbState.session?.user ?? null } }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: cbState.profile }) }),
      }),
    }),
  },
}));

const navState = vi.hoisted(() => ({ path: null as string | null }));
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => (to: string) => {
      navState.path = to;
    },
  };
});

import AuthCallback from '@/pages/auth/AuthCallback';

const renderCallback = (entry: string) =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/auth/callback" element={<AuthCallback />} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  cbState.exchanged.length = 0;
  navState.path = null;
  cbState.session = {
    user: { id: 'U1', email_confirmed_at: new Date().toISOString(), user_metadata: { role: 'lawyer' } },
  };
  cbState.profile = { role: 'lawyer' };
  window.localStorage.clear();
});

describe('FASE 4.60A — callback OAuth', () => {
  it('canjea ?code= por sesión (PKCE) y sigue al destino', async () => {
    window.localStorage.setItem('legalup_post_auth_redirect', '/lawyer/cases');
    renderCallback('/auth/callback?code=pkce-code-123');
    await waitFor(() => expect(cbState.exchanged).toEqual(['pkce-code-123']));
    await waitFor(() => expect(navState.path).toBe('/lawyer/cases'));
    // Consumo único: no queda redirect para replays.
    expect(window.localStorage.getItem('legalup_post_auth_redirect')).toBeNull();
  });
  it('cancelación en Google vuelve al login con error legible', async () => {
    renderCallback('/auth/callback?error=access_denied&error_description=user+cancelled');
    await waitFor(() => expect(navState.path).toContain('oauth_error='));
    expect(navState.path).toContain('login=true');
    expect(cbState.exchanged).toHaveLength(0);
  });
  it('rechaza redirect externo aunque venga en query', async () => {
    renderCallback('/auth/callback?redirectTo=' + encodeURIComponent('https://attacker/x'));
    await waitFor(() => expect(navState.path).not.toBeNull());
    expect(navState.path).not.toContain('attacker');
  });
  it('abogado no verificado no salta al destino', async () => {
    cbState.session = {
      user: { id: 'U1', email_confirmed_at: '', user_metadata: { role: 'lawyer' } },
    };
    renderCallback('/auth/callback?redirectTo=' + encodeURIComponent('/lawyer/cases'));
    await waitFor(() => expect(navState.path).toBe('/?verifyEmail=true'));
  });
});
