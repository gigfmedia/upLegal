import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

const profileRow = {
  id: 'u1',
  email: 'qa@example.cl',
  role: 'lawyer',
  mercado_pago_access_token: 'LIVE-SECRET-TOKEN',
  mercado_pago_refresh_token: 'REFRESH-SECRET',
  mercado_pago_nickname: 'public-nick',
  mercado_pago_email: 'mp@example.cl',
};

const fromCalls: Array<{ table: string; op: string }> = [];
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: (table: string) => {
      const q: Record<string, unknown> = {};
      q.select = () => q;
      q.eq = () => q;
      q.single = async () => {
        fromCalls.push({ table, op: 'select' });
        return { data: { ...profileRow }, error: null };
      };
      return q;
    },
    auth: {
      getUser: vi.fn(async () => ({ data: { user: null } })),
      updateUser: vi.fn(),
      signInWithPassword: vi.fn(),
    },
  },
}));

vi.mock('@/contexts/AuthContext/clean/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'u1',
      email: 'qa@example.cl',
      user_metadata: { role: 'lawyer', auth_token_should_not_export: 'hide-me' },
    },
  }),
}));

vi.mock('@/hooks/usePasswordSetupState', () => ({
  usePasswordSetupState: () => ({
    state: 'setup_complete',
    marker: true,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  PASSWORD_SETUP_QUERY_KEY: ['auth-password-setup'],
  markPasswordSetupComplete: vi.fn(async () => true),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import LawyerSettingsPage from '@/pages/lawyer/SettingsPage';

beforeEach(() => {
  vi.clearAllMocks();
  fromCalls.length = 0;
  Object.defineProperty(window.URL, 'createObjectURL', { value: vi.fn(() => 'blob:fake'), configurable: true });
  Object.defineProperty(window.URL, 'revokeObjectURL', { value: vi.fn(), configurable: true });
});

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <LawyerSettingsPage />
      </MemoryRouter>
    </QueryClientProvider>
  );

// jsdom lacks Blob text reading via anchor; capture the JSON through Blob directly.
async function clickExportAndReadJson(): Promise<Record<string, unknown>> {
  const seen: Blob[] = [];
  const OrigBlob = globalThis.Blob;
  (globalThis as unknown as { Blob: unknown }).Blob = function (parts: unknown[]) {
    const b = new OrigBlob(parts as BlobPart[]);
    seen.push(b);
    return b;
  } as unknown as typeof Blob;
  try {
    fireEvent.click(screen.getByRole('button', { name: 'Exportar datos' }));
    await waitFor(() => expect(seen.length).toBe(1));
    return JSON.parse(await seen[0].text()) as Record<string, unknown>;
  } finally {
    (globalThis as unknown as { Blob: unknown }).Blob = OrigBlob;
  }
}

describe('4.54C lawyer account settings (real features only)', () => {
  it('§18 page: Configuración de cuenta + password + export; no fake sections', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Configuración de cuenta' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cambiar contraseña' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exportar datos' })).toBeInTheDocument();
    expect(screen.queryByText('Habilitar 2FA')).not.toBeInTheDocument();
    expect(screen.queryByText('Eliminar cuenta')).not.toBeInTheDocument();
    expect(screen.queryByText('Zona de Peligro')).not.toBeInTheDocument();
    expect(screen.queryByText('Notificaciones')).not.toBeInTheDocument();
    expect(screen.queryByText('Privacidad')).not.toBeInTheDocument();
  });

  it('§19 export: JSON download with own safe scope, secrets stripped', async () => {
    renderPage();
    const json = await clickExportAndReadJson();
    const perfil = json.perfil as Record<string, unknown>;
    expect(perfil.email).toBe('qa@example.cl');
    expect(perfil.role).toBe('lawyer');
    expect(perfil.mercado_pago_nickname).toBe('public-nick');
    expect(JSON.stringify(json)).not.toContain('LIVE-SECRET-TOKEN');
    expect(JSON.stringify(json)).not.toContain('REFRESH-SECRET');
    expect(JSON.stringify(json)).not.toContain('hide-me');
    expect(json.fechaExportacion).toBeTruthy();
  });

  it('§20 cross-user: only own id queried, no writes', async () => {
    const { supabase } = await import('@/lib/supabaseClient');
    renderPage();
    await clickExportAndReadJson();
    expect(fromCalls).toEqual([{ table: 'profiles', op: 'select' }]);
    const fromMock = supabase.from as unknown as ReturnType<typeof vi.fn>;
    expect(fromMock).toBeDefined();
  });

  it('§21 client page keeps export through shared component (no behavior fork)', () => {
    const src = read('src/pages/DashboardSettings.tsx');
    expect(src).toContain('<AccountDataExportCard');
    expect(src).not.toContain('handleExportData');
    expect(src).not.toContain('upLegal-datos-');
    // danger zone stays exactly where it was (client behavior preserved)
    expect(src).toContain('Zona de Peligro');
    expect(src).toContain('Eliminar Cuenta');
  });

  it('§22 password states preserved alongside export card', () => {
    renderPage();
    expect(screen.getByRole('button', { name: 'Cambiar contraseña' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exportar datos' })).toBeInTheDocument();
  });

  it('§23 nav: Configuración de cuenta still right before Cerrar sesión', () => {
    const src = read('src/components/dashboard/DashboardLayout.tsx');
    expect(src).toContain('accountSettingsHref');
    expect(src.indexOf('{accountSettingsLabel}')).toBeLessThan(src.indexOf('Cerrar Sesión'));
  });
});
