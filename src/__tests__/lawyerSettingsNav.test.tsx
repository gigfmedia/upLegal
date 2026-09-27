import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

vi.mock('@/hooks/usePasswordSetupState', () => ({
  usePasswordSetupState: () => ({
    state: 'setup_required',
    marker: false,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  PASSWORD_SETUP_QUERY_KEY: ['auth-password-setup'],
  markPasswordSetupComplete: vi.fn(async () => true),
}));
vi.mock('@/lib/supabaseClient', () => ({
  supabase: { auth: { getUser: vi.fn(async () => ({ data: { user: null } })), updateUser: vi.fn(), signInWithPassword: vi.fn() } },
}));
vi.mock('@/contexts/AuthContext/clean/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'qa@example.cl' } }),
}));
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import LawyerSettingsPage from '@/pages/lawyer/SettingsPage';

describe('4.54A consolidated account settings navigation', () => {
  it('1. sidebar label is Configuración de cuenta (single concept)', () => {
    const src = read('src/components/dashboard/DashboardLayout.tsx');
    expect(src).toContain("const accountSettingsLabel = isLawyerSurface ? 'Configuración de cuenta' : 'Configuración';");
    expect(src).toContain('accountSettingsLabel');
    // No second competing label in nav data (bottom pinned link is the single destination)
    expect(src).not.toMatch(/label:\s*'Configuración'/);
    expect(src).not.toMatch(/label:\s*'Configuración de cuenta'/);
  });

  it('2. positioned immediately before Cerrar sesión (desktop + mobile)', () => {
    const src = read('src/components/dashboard/DashboardLayout.tsx');
    const settingsIdx = [...src.matchAll(/\{accountSettingsLabel\}/g)].map((m) => m.index ?? -1);
    const logoutIdx = [...src.matchAll(/Cerrar Sesión/g)].map((m) => m.index ?? -1);
    expect(settingsIdx).toHaveLength(2); // desktop pinned + mobile drawer
    expect(logoutIdx.length).toBeGreaterThanOrEqual(2);
    for (const s of settingsIdx) {
      const nextLogout = logoutIdx.find((l) => l > s);
      expect(nextLogout).toBeDefined();
      // nothing navigational between settings link and logout button
      expect(src.slice(s, nextLogout ?? 0)).not.toContain('<Link');
    }
  });

  it('3. route remains /lawyer/settings (role-aware bottom link)', () => {
    expect(read('src/App.tsx')).toContain('<Route path="settings" element={<LawyerSettingsPage />} />');
    const layout = read('src/components/dashboard/DashboardLayout.tsx');
    expect(layout).toContain("'/lawyer/settings'");
    expect(layout).toContain('accountSettingsHref');
  });

  it('4. page title is Configuración de cuenta', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <LawyerSettingsPage />
        </MemoryRouter>
      </QueryClientProvider>
    );
    expect(screen.getByRole('heading', { name: 'Configuración de cuenta' })).toBeInTheDocument();
  });

  it('5/6/7. page renders SecurePasswordCard (authority states covered by its suite)', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <LawyerSettingsPage />
        </MemoryRouter>
      </QueryClientProvider>
    );
    expect(screen.getByRole('button', { name: 'Crear contraseña' })).toBeInTheDocument();
  });

  it('8. logout unchanged and last', () => {
    const src = read('src/components/dashboard/DashboardLayout.tsx');
    expect(src).toContain("navigate('/')");
    expect(src.indexOf('Cerrar Sesión')).toBeGreaterThan(src.indexOf('{accountSettingsLabel}'));
  });

  it('9. Profile has no duplicate account-security configuration', () => {
    const profile = read('src/pages/lawyer/ProfilePage.tsx');
    expect(profile).not.toContain('SecurePasswordCard');
    expect(profile).not.toMatch(/Contraseña actual|Crear contraseña|Cambiar contraseña/);
  });

  it('10. mobile parity: same href/label source in both pinned regions', () => {
    const src = read('src/components/dashboard/DashboardLayout.tsx');
    expect(src.match(/to=\{accountSettingsHref\}/g)?.length).toBe(2);
    expect(src.match(/\{accountSettingsLabel\}/g)?.length).toBe(2);
  });
});
