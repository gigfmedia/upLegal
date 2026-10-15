import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

/**
 * El guard de DashboardLayout ante ausencia de sesión debe reemplazar la
 * entrada del historial (no apilar): un redirect con push deja una home
 * fantasma atrás y rompe el botón Atrás durante parpadeos de sesión.
 */
const layoutAuth = vi.hoisted(() => ({
  user: null as null | Record<string, unknown>,
  isLoading: false,
}));

vi.mock('@/contexts/AuthContext/clean/useAuth', () => ({
  useAuth: () => ({ user: layoutAuth.user, isLoading: layoutAuth.isLoading, logout: vi.fn() }),
}));

vi.mock('@/contexts/NotificationContext', () => ({
  useNotifications: () => ({ unreadCount: 0, isLoading: false }),
}));

vi.mock('@/hooks/useLegacyAICompat', () => ({
  useLegacyAICompat: () => ({ data: null }),
}));

vi.mock('@/hooks/useProSubscription', () => ({
  useProSubscription: () => ({ hasProAccess: false }),
}));

vi.mock('@/components/Header', () => ({ default: () => <div>Header</div> }));
vi.mock('@/components/lawyer/GlobalSearch', () => ({
  GlobalSearch: () => <div>Search</div>,
}));

vi.mock('@/lib/supabaseClient', () => {
  const chain = (): Record<string, unknown> => {
    const builder: Record<string, unknown> = {
      select: () => builder,
      eq: () => builder,
      neq: () => builder,
      gte: () => builder,
      in: () => builder,
      maybeSingle: async () => ({ data: null }),
      then: (resolve: (v: unknown) => void) => resolve({ count: 0, data: [] }),
    };
    return builder;
  };
  const supabase = { from: () => chain(), auth: { getUser: async () => ({ data: { user: null } }) } };
  return { supabase };
});

vi.mock('posthog-js', () => ({ default: { capture: vi.fn() } }));

import DashboardLayout from '@/components/dashboard/DashboardLayout';

function renderAt(entry: string) {
  const router = createMemoryRouter(
    [
      {
        path: '/lawyer/dashboard',
        element: <DashboardLayout />,
        children: [{ index: true, element: <div>Panel</div> }],
      },
      { path: '/', element: <div>Home</div> },
    ],
    { initialEntries: [entry] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

describe('DashboardLayout — guard sin sesión', () => {
  it('redirige con replace: no apila home fantasma en el historial', async () => {
    layoutAuth.user = null;
    layoutAuth.isLoading = false;
    const router = renderAt('/lawyer/dashboard');
    await waitFor(() => expect(router.state.location.pathname).toBe('/'), { timeout: 5000 });
    expect(await screen.findByText('Home')).toBeInTheDocument();
    // replace: la última acción es REPLACE (push dejaría PUSH y una home
    // fantasma atrás para el botón Atrás).
    expect(router.state.historyAction).toBe('REPLACE');
  });

  it('cargando: no redirige (espera inicialización)', async () => {
    layoutAuth.user = null;
    layoutAuth.isLoading = true;
    const router = renderAt('/lawyer/dashboard');
    await new Promise((r) => setTimeout(r, 500));
    expect(router.state.location.pathname).toBe('/lawyer/dashboard');
  });
});
