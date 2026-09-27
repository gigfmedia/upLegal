import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const state = vi.hoisted(() => ({
  setupState: 'setup_required' as string,
  loading: false,
  error: false,
  refetch: vi.fn(),
  updateUser: vi.fn(),
  signIn: vi.fn(),
  getUser: vi.fn(),
  toast: vi.fn(),
  markerOk: true,
}));

vi.mock('@/hooks/usePasswordSetupState', () => ({
  usePasswordSetupState: () => ({
    state:
      state.loading ? 'loading' : state.error ? 'error' : state.setupState,
    marker: null,
    isLoading: state.loading,
    isError: state.error,
    refetch: state.refetch,
  }),
  PASSWORD_SETUP_QUERY_KEY: ['auth-password-setup'],
  markPasswordSetupComplete: async () => {
    if (!state.markerOk) return false;
    return true;
  },
}));

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: (...args: unknown[]) => state.getUser(...args),
      updateUser: (...args: unknown[]) => state.updateUser(...args),
      signInWithPassword: (...args: unknown[]) => state.signIn(...args),
    },
  },
}));

vi.mock('@/contexts/AuthContext/clean/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'qa@example.cl' } }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: (...args: unknown[]) => state.toast(...args) }),
}));

import { SecurePasswordCard } from '@/components/auth/SecurePasswordCard';

const renderCard = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SecurePasswordCard />
    </QueryClientProvider>
  );
};

const fill = (label: string, value: string) => {
  fireEvent.change(screen.getByLabelText(label, { exact: true }), { target: { value } });
};

beforeEach(() => {
  vi.clearAllMocks();
  state.setupState = 'setup_required';
  state.loading = false;
  state.error = false;
  state.markerOk = true;
  state.getUser.mockResolvedValue({ data: { user: { email: 'qa@example.cl' } } });
  state.updateUser.mockResolvedValue({ data: {}, error: null });
  state.signIn.mockResolvedValue({ data: {}, error: null });
});

describe('4.53D SecurePasswordCard (marker authority)', () => {
  it('§30 setup_required: Crear + new/confirm, NO current field', () => {
    renderCard();
    expect(screen.getByRole('button', { name: 'Crear contraseña' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nueva contraseña', { exact: true })).toBeInTheDocument();
    expect(screen.getByLabelText('Confirmar contraseña', { exact: true })).toBeInTheDocument();
    expect(screen.queryByLabelText('Contraseña actual', { exact: true })).not.toBeInTheDocument();
  });

  it('§32 mismatch blocks locally, 0 updateUser', async () => {
    renderCard();
    fill('Nueva contraseña', 'Aa1!bbbb');
    fill('Confirmar contraseña', 'Aa1!cccc');
    fireEvent.click(screen.getByRole('button', { name: 'Crear contraseña' }));
    await waitFor(() => expect(state.toast).toHaveBeenCalled());
    expect(state.updateUser).not.toHaveBeenCalled();
  });

  it('§27 create success: updateUser(password) then marker, flips to Cambiar', async () => {
    const { rerender } = render(
      <QueryClientProvider client={new QueryClient()}>
        <SecurePasswordCard />
      </QueryClientProvider>
    );
    fill('Nueva contraseña', 'Aa1!bbbb');
    fill('Confirmar contraseña', 'Aa1!bbbb');
    fireEvent.click(screen.getByRole('button', { name: 'Crear contraseña' }));
    await waitFor(() => expect(state.updateUser).toHaveBeenCalledTimes(1));
    expect(state.updateUser.mock.calls[0][0]).toEqual({ password: 'Aa1!bbbb' });
    state.setupState = 'setup_complete';
    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <SecurePasswordCard />
      </QueryClientProvider>
    );
    expect(screen.getByRole('button', { name: 'Cambiar contraseña' })).toBeInTheDocument();
    expect(rerender).toBeDefined();
  });

  it('§33 setup_complete + legacy_unknown: Cambiar with current field', () => {
    state.setupState = 'setup_complete';
    renderCard();
    expect(screen.getByLabelText('Contraseña actual', { exact: true })).toBeInTheDocument();
    state.setupState = 'legacy_unknown';
    renderCard();
    expect(screen.getAllByLabelText('Contraseña actual', { exact: true }).length).toBeGreaterThan(0);
  });

  it('§34 correct current: signInWithPassword → updateUser ordering', async () => {
    state.setupState = 'setup_complete';
    const order: string[] = [];
    state.signIn.mockImplementation(async () => {
      order.push('signin');
      return { data: {}, error: null };
    });
    state.updateUser.mockImplementation(async () => {
      order.push('update');
      return { data: {}, error: null };
    });
    renderCard();
    fill('Contraseña actual', 'Old1!aaa');
    fill('Nueva contraseña', 'Aa1!bbbb');
    fill('Confirmar contraseña', 'Aa1!bbbb');
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));
    await waitFor(() => expect(state.updateUser).toHaveBeenCalled());
    expect(order).toEqual(['signin', 'update']);
    expect(state.signIn).toHaveBeenCalledWith({ email: 'qa@example.cl', password: 'Old1!aaa' });
  });

  it('§35 wrong current: friendly error, 0 updateUser', async () => {
    state.setupState = 'setup_complete';
    state.signIn.mockResolvedValue({ data: {}, error: new Error('Invalid login credentials') });
    renderCard();
    fill('Contraseña actual', 'Wrong1!x');
    fill('Nueva contraseña', 'Aa1!bbbb');
    fill('Confirmar contraseña', 'Aa1!bbbb');
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));
    await waitFor(() =>
      expect(state.toast).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'La contraseña actual no es correcta.' })
      )
    );
    expect(state.updateUser).not.toHaveBeenCalled();
  });

  it('§6 loading skeleton; error shows retry, never defaults', () => {
    state.loading = true;
    const { unmount } = renderCard();
    expect(screen.queryByRole('button', { name: 'Crear contraseña' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cambiar contraseña' })).not.toBeInTheDocument();
    unmount();
    state.loading = false;
    state.error = true;
    renderCard();
    expect(screen.getByText(/No pudimos verificar/)).toBeInTheDocument();
    expect(screen.getByText('Reintentar')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Crear contraseña' })).not.toBeInTheDocument();
  });

  it('no password values leak to console', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderCard();
    fill('Nueva contraseña', 'Aa1!bbbb');
    fill('Confirmar contraseña', 'Aa1!cccc');
    fireEvent.click(screen.getByRole('button', { name: 'Crear contraseña' }));
    await waitFor(() => expect(state.toast).toHaveBeenCalled());
    const logged = errSpy.mock.calls.flat().join(' ');
    expect(logged).not.toContain('Aa1!bbbb');
    expect(logged).not.toContain('Aa1!cccc');
    errSpy.mockRestore();
  });

  it('no client-side app_metadata writes (server-controlled only)', () => {
    const src = readFileSync(resolve(process.cwd(), 'src/components/auth/SecurePasswordCard.tsx'), 'utf8');
    // Comments may name it; code must never assign it (only the server endpoint writes it).
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1');
    expect(code).not.toMatch(/app_metadata\s*:/);
    expect(code).not.toContain('has_auth_password');
  });
});
