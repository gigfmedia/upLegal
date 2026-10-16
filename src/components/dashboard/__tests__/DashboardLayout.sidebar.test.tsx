import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

/**
 * El sidebar lo decide el ROL DEL USUARIO (perfil persistido primero), no la
 * ruta que contiene la página: /dashboard/payment-settings es compartida y
 * un abogado debe conservar su navegación.
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

const lawyerUser = (overrides: Record<string, unknown> = {}) => ({
  id: 'U-lawyer',
  email: 'a@test.cl',
  email_confirmed_at: '2026-10-15T12:00:00.000Z',
  user_metadata: {},
  profile: { id: 'U-lawyer', role: 'lawyer' },
  ...overrides,
});

const clientUser = (overrides: Record<string, unknown> = {}) => ({
  id: 'U-client',
  email: 'c@test.cl',
  user_metadata: {},
  profile: { id: 'U-client', role: 'client' },
  ...overrides,
});

function renderAt(entry: string) {
  const router = createMemoryRouter(
    [
      {
        path: '/dashboard',
        element: <DashboardLayout />,
        children: [
          { index: true, element: <div>Panel cliente</div> },
          { path: 'payment-settings', element: <div>Pago compartido</div> },
        ],
      },
      {
        path: '/lawyer/dashboard',
        element: <DashboardLayout />,
        children: [{ index: true, element: <div>Panel abogado</div> }],
      },
      { path: '/', element: <div>Home</div> },
    ],
    { initialEntries: [entry] },
  );
  const utils = render(<RouterProvider router={router} />);
  return { router, ...utils };
}

describe('DashboardLayout — sidebar según rol del usuario', () => {
  it('abogado en /dashboard/payment-settings (directo): sidebar de abogado', async () => {
    layoutAuth.user = lawyerUser();
    layoutAuth.isLoading = false;
    renderAt('/dashboard/payment-settings');
    expect(await screen.findByText('Pago compartido')).toBeInTheDocument();
    expect(screen.getAllByText('Inicio').length).toBeGreaterThan(0);
    expect(screen.getAllByText('CUENTA').length).toBeGreaterThan(0);
    expect(screen.queryByText('Resumen')).not.toBeInTheDocument();
  });

  it('cliente en /dashboard/payment-settings: sidebar de cliente', async () => {
    layoutAuth.user = clientUser();
    layoutAuth.isLoading = false;
    renderAt('/dashboard/payment-settings');
    expect(await screen.findByText('Pago compartido')).toBeInTheDocument();
    expect(screen.getAllByText('Resumen').length).toBeGreaterThan(0);
    expect(screen.queryByText('Inicio')).not.toBeInTheDocument();
  });

  it('cliente en su dashboard: sidebar de cliente', async () => {
    layoutAuth.user = clientUser();
    layoutAuth.isLoading = false;
    renderAt('/dashboard');
    expect(await screen.findByText('Panel cliente')).toBeInTheDocument();
    expect(screen.getAllByText('Resumen').length).toBeGreaterThan(0);
  });

  it('cambio de abogado a cliente: el sidebar cambia sin conservar el anterior', async () => {
    layoutAuth.user = lawyerUser();
    layoutAuth.isLoading = false;
    const first = renderAt('/lawyer/dashboard');
    expect(await screen.findByText('Panel abogado')).toBeInTheDocument();
    expect(screen.getAllByText('Inicio').length).toBeGreaterThan(0);
    first.unmount();
    layoutAuth.user = clientUser();
    renderAt('/dashboard');
    expect(await screen.findByText('Panel cliente')).toBeInTheDocument();
    expect(screen.getAllByText('Resumen').length).toBeGreaterThan(0);
    expect(screen.queryByText('Inicio')).not.toBeInTheDocument();
  });

  it('cargando: spinner sin sidebar equivocado', async () => {
    layoutAuth.user = null;
    layoutAuth.isLoading = true;
    renderAt('/dashboard/payment-settings');
    await new Promise((r) => setTimeout(r, 300));
    expect(screen.queryByText('Inicio')).not.toBeInTheDocument();
    expect(screen.queryByText('Resumen')).not.toBeInTheDocument();
  });

  it('sin perfil en ruta /lawyer: heurística de ruta preservada', async () => {
    layoutAuth.user = { id: 'U-x', email: 'x@test.cl', email_confirmed_at: '2026-10-15T12:00:00.000Z', user_metadata: {} };
    layoutAuth.isLoading = false;
    renderAt('/lawyer/dashboard');
    await waitFor(() => expect(screen.queryAllByText('Inicio').length).toBeGreaterThan(0), { timeout: 15000 });
  }, 20000);
});
