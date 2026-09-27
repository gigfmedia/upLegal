import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const authState = vi.hoisted(() => ({
  hasPassword: null as boolean | null,
  loading: false,
  error: false,
  refetch: vi.fn(),
  updateUser: vi.fn(),
  signIn: vi.fn(),
  getUser: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('@/hooks/useHasAuthPassword', () => ({
  useHasAuthPassword: () => ({
    hasPassword: authState.hasPassword,
    isLoading: authState.loading,
    isError: authState.error,
    refetch: authState.refetch,
  }),
  AUTH_PASSWORD_QUERY_KEY: ['auth-has-password'],
}));

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: (...args: unknown[]) => authState.getUser(...args),
      updateUser: (...args: unknown[]) => authState.updateUser(...args),
      signInWithPassword: (...args: unknown[]) => authState.signIn(...args),
    },
  },
}));

vi.mock('@/contexts/AuthContext/clean/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'qa@example.cl' } }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: (...args: unknown[]) => authState.toast(...args) }),
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
  authState.hasPassword = null;
  authState.loading = false;
  authState.error = false;
  authState.getUser.mockResolvedValue({ data: { user: { email: 'qa@example.cl' } } });
  authState.updateUser.mockResolvedValue({ data: {}, error: null });
  authState.signIn.mockResolvedValue({ data: {}, error: null });
});

describe('4.53B SecurePasswordCard', () => {
  it('§30 passwordless: Crear + new/confirm, NO current field', () => {
    authState.hasPassword = false;
    renderCard();
    expect(screen.getByRole('button', { name: 'Crear contraseña' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nueva contraseña', { exact: true })).toBeInTheDocument();
    expect(screen.getByLabelText('Confirmar contraseña', { exact: true })).toBeInTheDocument();
    expect(screen.queryByLabelText('Contraseña actual', { exact: true })).not.toBeInTheDocument();
  });

  it('§32 mismatch blocks locally, 0 updateUser', async () => {
    authState.hasPassword = false;
    renderCard();
    fill('Nueva contraseña', 'Aa1!bbbb');
    fill('Confirmar contraseña', 'Aa1!cccc');
    fireEvent.click(screen.getByRole('button', { name: 'Crear contraseña' }));
    await waitFor(() => expect(authState.toast).toHaveBeenCalled());
    expect(authState.updateUser).not.toHaveBeenCalled();
  });

  it('§31 create success: updateUser(password) then metadata, refetch flips to Cambiar', async () => {
    authState.hasPassword = false;
    const { rerender } = render(
      <QueryClientProvider client={new QueryClient()}>
        <SecurePasswordCard />
      </QueryClientProvider>
    );
    fill('Nueva contraseña', 'Aa1!bbbb');
    fill('Confirmar contraseña', 'Aa1!bbbb');
    fireEvent.click(screen.getByRole('button', { name: 'Crear contraseña' }));
    await waitFor(() => expect(authState.updateUser).toHaveBeenCalledTimes(2));
    expect(authState.updateUser.mock.calls[0][0]).toEqual({ password: 'Aa1!bbbb' });
    expect(authState.refetch).toHaveBeenCalled();
    authState.hasPassword = true;
    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <SecurePasswordCard />
      </QueryClientProvider>
    );
    expect(screen.getByRole('button', { name: 'Cambiar contraseña' })).toBeInTheDocument();
    expect(rerender).toBeDefined();
  });

  it('§33 has password: Cambiar + current/new/confirm', () => {
    authState.hasPassword = true;
    renderCard();
    expect(screen.getByRole('button', { name: 'Cambiar contraseña' })).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña actual', { exact: true })).toBeInTheDocument();
    expect(screen.getByLabelText('Nueva contraseña', { exact: true })).toBeInTheDocument();
  });

  it('§34 correct current: signInWithPassword → updateUser ordering', async () => {
    authState.hasPassword = true;
    const order: string[] = [];
    authState.signIn.mockImplementation(async () => {
      order.push('signin');
      return { data: {}, error: null };
    });
    authState.updateUser.mockImplementation(async () => {
      order.push('update');
      return { data: {}, error: null };
    });
    renderCard();
    fill('Contraseña actual', 'Old1!aaa');
    fill('Nueva contraseña', 'Aa1!bbbb');
    fill('Confirmar contraseña', 'Aa1!bbbb');
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));
    await waitFor(() => expect(authState.updateUser).toHaveBeenCalled());
    expect(order).toEqual(['signin', 'update']);
    expect(authState.signIn).toHaveBeenCalledWith({ email: 'qa@example.cl', password: 'Old1!aaa' });
  });

  it('§35 wrong current: friendly error, 0 updateUser', async () => {
    authState.hasPassword = true;
    authState.signIn.mockResolvedValue({ data: {}, error: new Error('Invalid login credentials') });
    renderCard();
    fill('Contraseña actual', 'Wrong1!x');
    fill('Nueva contraseña', 'Aa1!bbbb');
    fill('Confirmar contraseña', 'Aa1!bbbb');
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));
    await waitFor(() =>
      expect(authState.toast).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'La contraseña actual no es correcta.' })
      )
    );
    expect(authState.updateUser).not.toHaveBeenCalled();
  });

  it('§6 loading skeleton; error shows retry, never defaults to Crear', () => {
    authState.loading = true;
    const { unmount } = renderCard();
    expect(screen.queryByRole('button', { name: 'Crear contraseña' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cambiar contraseña' })).not.toBeInTheDocument();
    unmount();
    authState.loading = false;
    authState.error = true;
    renderCard();
    expect(screen.getByText(/No pudimos verificar/)).toBeInTheDocument();
    expect(screen.getByText('Reintentar')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Crear contraseña' })).not.toBeInTheDocument();
  });

  it('§27 no password values leak to console', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    authState.hasPassword = false;
    renderCard();
    fill('Nueva contraseña', 'Aa1!bbbb');
    fill('Confirmar contraseña', 'Aa1!cccc');
    fireEvent.click(screen.getByRole('button', { name: 'Crear contraseña' }));
    await waitFor(() => expect(authState.toast).toHaveBeenCalled());
    const logged = errSpy.mock.calls.flat().join(' ');
    expect(logged).not.toContain('Aa1!bbbb');
    expect(logged).not.toContain('Aa1!cccc');
    errSpy.mockRestore();
  });
});
