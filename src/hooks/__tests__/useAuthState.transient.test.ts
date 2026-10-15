import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

/**
 * Demostración del incidente P1/P2 sin tocar src: el estado de auth pierde
 * datos ante eventos/fallos transitorios y los guards reaccionan a ese
 * estado intermedio.
 *
 * - "falla transitoria conserva sesión" y "TOKEN_REFRESHED conserva perfil"
 *   FALLAN con el código actual (demuestran P1/P2).
 * - El resto documenta comportamiento correcto que no debe regresar.
 */
const sim = vi.hoisted(() => ({
  session: null as null | { user: Record<string, unknown>; access_token: string; expires_at: number },
  profile: null as null | Record<string, unknown>,
  getSessionImpl: null as null | (() => Promise<unknown>),
  refreshImpl: null as null | (() => Promise<unknown>),
  listener: null as null | ((event: string, session: unknown) => void),
}));

const baseUser = (overrides: Record<string, unknown> = {}) => ({
  id: 'U-1',
  email: 'u@test.cl',
  email_confirmed_at: '2026-10-15T12:00:00.000Z',
  created_at: '2026-10-15T12:00:00.000Z',
  user_metadata: {},
  app_metadata: {},
  ...overrides,
});

const baseSession = (user: Record<string, unknown>) => ({
  user,
  access_token: 'tok',
  // Vigente por una hora: validateAndRefreshSession no intenta refresh.
  expires_at: Math.floor(Date.now() / 1000) + 3600,
});

vi.mock('@/lib/supabaseClient', () => {
  const supabase = {
    auth: {
      getSession: () =>
        sim.getSessionImpl ? sim.getSessionImpl() : Promise.resolve({ data: { session: sim.session } }),
      refreshSession: () =>
        sim.refreshImpl ? sim.refreshImpl() : Promise.resolve({ data: { session: sim.session }, error: null }),
      onAuthStateChange: (cb: (event: string, session: unknown) => void) => {
        sim.listener = cb;
        return { data: { subscription: { unsubscribe() {} } } };
      },
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: sim.profile ? { ...sim.profile } : null, error: null }),
        }),
      }),
    }),
  };
  return { supabase, getSupabaseClient: () => supabase };
});

vi.mock('posthog-js', () => ({ default: { capture: vi.fn(), identify: vi.fn(), reset: vi.fn() } }));

import { useAuthState } from '../useAuthState';

beforeEach(() => {
  sim.session = null;
  sim.profile = null;
  sim.getSessionImpl = null;
  sim.refreshImpl = null;
  sim.listener = null;
  vi.unstubAllGlobals();
});

async function establishLawyerSession() {
  sim.profile = { id: 'U-1', user_id: 'U-1', role: 'lawyer' };
  sim.session = baseSession(baseUser()) as never;
  const { result, unmount } = renderHook(() => useAuthState());
  await act(async () => {
    await result.current.checkSession();
  });
  expect(result.current.user).not.toBeNull();
  return { result, unmount };
}

describe('useAuthState — robustez ante transitorios (P1/P2)', () => {
  it('fallo transitorio de refresh con sesión vigente NO cierra la sesión establecida', async () => {
    const { result, unmount } = await establishLawyerSession();
    // Vuelta de ventana: el token roza expiración y el refresh falla por red.
    // getSession sigue devolviendo la sesión (válida en storage).
    sim.session = {
      ...(sim.session as object),
      expires_at: Math.floor(Date.now() / 1000) - 10,
    } as never;
    sim.refreshImpl = async () => {
      throw new Error('network offline');
    };
    await act(async () => {
      await result.current.checkSession();
    });
    expect(result.current.user).not.toBeNull();
    expect(result.current.user?.id).toBe('U-1');
    unmount();
  });

  it('error lanzado por getSession: conserva al usuario (ya es así)', async () => {
    const { result, unmount } = await establishLawyerSession();
    sim.getSessionImpl = async () => {
      throw new Error('network offline');
    };
    await act(async () => {
      await result.current.checkSession();
    });
    expect(result.current.user?.id).toBe('U-1');
    unmount();
  });

  it('sin sesión limpia (desconexión real): sí se limpia el usuario', async () => {
    const { result, unmount } = await establishLawyerSession();
    sim.session = null;
    await act(async () => {
      await result.current.checkSession();
    });
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    unmount();
  });

  it('TOKEN_REFRESHED conserva el perfil adjunto del mismo usuario', async () => {
    const { result, unmount } = await establishLawyerSession();
    expect(sim.listener).not.toBeNull();
    // El evento trae el usuario crudo de Supabase (sin .profile adjunto).
    await act(async () => {
      await sim.listener!('TOKEN_REFRESHED', { user: baseUser() });
    });
    expect(result.current.user).not.toBeNull();
    expect((result.current.user as { profile?: { role?: string } })?.profile?.role).toBe('lawyer');
    unmount();
  });

  it('evento de OTRO usuario no arrastra el perfil anterior', async () => {
    const { result, unmount } = await establishLawyerSession();
    await act(async () => {
      await sim.listener!('TOKEN_REFRESHED', { user: baseUser({ id: 'U-2' }) });
    });
    expect(result.current.user?.id).toBe('U-2');
    expect((result.current.user as { profile?: unknown })?.profile).not.toMatchObject({ role: 'lawyer' });
    unmount();
  });
});
