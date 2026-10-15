import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';

const pageState = vi.hoisted(() => ({
  user: null as null | {
    id: string;
    email: string;
    email_confirmed_at: string | null;
    user_metadata: Record<string, unknown>;
  },
  profile: null as null | Record<string, unknown>,
  servicesCount: 0,
  updates: [] as Record<string, unknown>[],
}));

vi.mock('@/contexts/AuthContext/clean/useAuth', () => ({
  useAuth: () => ({ user: pageState.user, isLoading: false }),
}));

vi.mock('@/components/Header', () => ({ default: () => <div>Header</div> }));

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      resend: async () => ({}),
      refreshSession: async () => ({}),
      getUser: async () => ({ data: { user: pageState.user } }),
    },
    from: (table: string) => {
      if (table === 'lawyer_services') {
        return {
          select: () => ({ eq: async () => ({ count: pageState.servicesCount }) }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: pageState.profile ? { ...pageState.profile } : null }),
          }),
        }),
        update: (patch: Record<string, unknown>) => ({
          eq: async () => {
            pageState.updates.push(patch);
            if (pageState.profile) Object.assign(pageState.profile, patch);
            return { error: null };
          },
        }),
      };
    },
  },
}));

vi.mock('posthog-js', () => ({ default: { capture: vi.fn() } }));

import LawyerOnboardingPage from '../LawyerOnboardingPage';

function Probe() {
  const loc = useLocation();
  return <div data-testid="probe">{`${loc.pathname}${loc.search}`}</div>;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Probe />
      <Routes>
        <Route path="/lawyer/onboarding" element={<LawyerOnboardingPage />} />
        <Route path="/lawyer/dashboard" element={<div>Dashboard abogado</div>} />
        <Route path="/" element={<div>Home</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

const VERIFIED_LAWYER = {
  id: 'U-lawyer',
  email: 'abogado@test.cl',
  email_confirmed_at: '2026-10-15T12:00:00.000Z',
  user_metadata: {},
};

beforeEach(() => {
  window.localStorage.clear();
  pageState.user = { ...VERIFIED_LAWYER, user_metadata: {} };
  pageState.profile = { id: 'U-lawyer', user_id: 'U-lawyer', role: 'lawyer' };
  pageState.servicesCount = 0;
  pageState.updates = [];
  vi.unstubAllGlobals();
});

describe('LawyerOnboardingPage — omitir onboarding', () => {
  it('abogado OAuth (sin invitación): muestra Omitir y sale al dashboard conservando el rol', async () => {
    renderAt('/lawyer/onboarding');
    const skip = await screen.findByRole('button', { name: 'Omitir por ahora' }, { timeout: 10000 });
    fireEvent.click(skip);
    await waitFor(() => expect(screen.getByTestId('probe').textContent).toBe('/lawyer/dashboard'), { timeout: 10000 });
    expect(await screen.findByText('Dashboard abogado')).toBeInTheDocument();
    // Solo marca el paso pospuesto: el rol lawyer queda intacto.
    expect(pageState.updates).toHaveLength(1);
    expect(pageState.updates[0]).toEqual({ profile_setup_completed: true });
    expect(pageState.profile).toMatchObject({ role: 'lawyer' });
  }, 25000);

  it('abogado invitado (magic link admin): mantiene Omitir (sin regresión)', async () => {
    pageState.user = {
      ...VERIFIED_LAWYER,
      user_metadata: { admin_lawyer_magic_link: 'm1', role: 'lawyer' },
    };
    renderAt('/lawyer/onboarding');
    expect(await screen.findByRole('button', { name: 'Omitir por ahora' }, { timeout: 10000 })).toBeInTheDocument();
  }, 25000);

  it('no abogado: no muestra wizard ni Omitir (redirige a /)', async () => {
    pageState.profile = { id: 'U-lawyer', user_id: 'U-lawyer', role: 'client' };
    renderAt('/lawyer/onboarding');
    await screen.findByText('Home', undefined, { timeout: 10000 });
    expect(screen.queryByRole('button', { name: 'Omitir por ahora' })).not.toBeInTheDocument();
  }, 25000);
});
