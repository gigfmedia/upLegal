import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const cbState = vi.hoisted(() => ({
  exchanged: [] as unknown[],
  session: null as null | { user: { id: string; email_confirmed_at: string; user_metadata: Record<string, unknown> } },
  // 5.6: usuario existente CON aceptación → flujo 4.60A intacto.
  profile: { role: 'lawyer', terms_accepted_at: '2026-10-06T00:00:00.000Z', privacy_acknowledged_at: '2026-10-06T00:00:00.000Z' } as null | {
    role: string | null;
    terms_accepted_at?: string;
    privacy_acknowledged_at?: string;
  },
  failReads: false,
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
        eq: () => ({
          maybeSingle: async () => {
            if (cbState.failReads) throw new Error('db offline');
            return { data: cbState.profile };
          },
        }),
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
  cbState.failReads = false;
  cbState.session = {
    user: { id: 'U1', email_confirmed_at: new Date().toISOString(), user_metadata: { role: 'lawyer' } },
  };
  cbState.profile = { role: 'lawyer', terms_accepted_at: '2026-10-06T00:00:00.000Z', privacy_acknowledged_at: '2026-10-06T00:00:00.000Z' };
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
  it('5.6: cuenta sin aceptación va al interstitial de consentimiento', async () => {
    cbState.profile = { role: 'lawyer' };
    renderCallback('/auth/callback?redirectTo=' + encodeURIComponent('/lawyer/cases'));
    await waitFor(() => expect(navState.path).toContain('/auth/consent'));
    expect(navState.path).toContain(encodeURIComponent('/lawyer/cases'));
  });
});

describe('Onboarding de rol post-registro Google', () => {
  const googleUser = () => {
    cbState.session = {
      user: { id: 'U-new', email_confirmed_at: new Date().toISOString(), user_metadata: {} },
    };
  };
  it('usuario Google nuevo sin perfil ni rol: llega a /auth/role', async () => {
    googleUser();
    cbState.profile = null;
    renderCallback('/auth/callback?code=pkce-new-user');
    // El reintento de consentimiento (1.5s) precede al gate con perfil nulo.
    await waitFor(() => expect(navState.path).toBe('/auth/role'), { timeout: 8000 });
  });
  it('preserva el destino de retorno hacia el selector', async () => {
    googleUser();
    cbState.profile = null;
    renderCallback('/auth/callback?code=pkce-new-user&redirectTo=' + encodeURIComponent('/search'));
    await waitFor(
      () => expect(navState.path).toBe('/auth/role?redirectTo=' + encodeURIComponent('/search')),
      { timeout: 8000 },
    );
  });
  it('perfil legacy sin rol (null) pero con consentimiento: llega al selector', async () => {
    googleUser();
    cbState.profile = {
      role: null,
      terms_accepted_at: '2026-10-06T00:00:00.000Z',
      privacy_acknowledged_at: '2026-10-06T00:00:00.000Z',
    };
    renderCallback('/auth/callback?code=pkce-legacy');
    await waitFor(() => expect(navState.path).toBe('/auth/role'));
  });
  it('usuario con rol client y consentimiento: sigue al flujo existente sin re-pedir', async () => {
    googleUser();
    cbState.profile = {
      role: 'client',
      terms_accepted_at: '2026-10-06T00:00:00.000Z',
      privacy_acknowledged_at: '2026-10-06T00:00:00.000Z',
    };
    renderCallback('/auth/callback?code=pkce-existing');
    await waitFor(() => expect(navState.path).toBe('/dashboard'));
  });
  it('consentimiento precede al selector: sin timestamps va primero a /auth/consent', async () => {
    googleUser();
    cbState.profile = { role: null };
    renderCallback('/auth/callback?code=pkce-consent-first');
    await waitFor(() => expect(navState.path).toContain('/auth/consent'));
  });
  it('error al leer el perfil: redirige a login recuperable, sin rol silencioso', async () => {
    googleUser();
    cbState.profile = null;
    cbState.failReads = true;
    renderCallback('/auth/callback?code=pkce-db-down');
    await waitFor(() => expect(navState.path).toBe('/?login=true'));
  });
});
