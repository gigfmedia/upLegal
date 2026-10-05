import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const cardState = vi.hoisted(() => ({
  passwordState: 'legacy_unknown' as string,
  identities: [{ provider: 'google' }] as { provider: string }[],
}));

vi.mock('@/hooks/usePasswordSetupState', () => ({
  PASSWORD_SETUP_QUERY_KEY: ['auth-password-setup'],
  markPasswordSetupComplete: vi.fn(async () => true),
  usePasswordSetupState: () => ({
    state: cardState.passwordState,
    refetch: vi.fn(),
  }),
}));
vi.mock('@/contexts/AuthContext/clean/useAuth', () => ({
  useAuth: () => ({ user: { id: 'U1', identities: cardState.identities } }),
}));
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));
vi.mock('@/lib/supabaseClient', () => ({
  supabase: { auth: { updateUser: vi.fn(async () => ({})), signInWithPassword: vi.fn() } },
}));

import { SecurePasswordCard } from '@/components/auth/SecurePasswordCard';

const renderCard = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <SecurePasswordCard />
    </QueryClientProvider>
  );

describe('FASE 4.60A — settings para cuenta solo-Google', () => {
  it('muestra método Google y crear-opcional en vez de pedir contraseña actual', () => {
    cardState.passwordState = 'legacy_unknown';
    cardState.identities = [{ provider: 'google' }];
    renderCard();
    expect(screen.getByText('Google')).toBeInTheDocument();
    expect(screen.getByText('Crear contraseña (opcional)')).toBeInTheDocument();
    expect(screen.queryByLabelText('Contraseña actual')).not.toBeInTheDocument();
  });
  it('con identidad email mantiene flujo normal de cambio', () => {
    cardState.identities = [{ provider: 'google' }, { provider: 'email' }];
    renderCard();
    expect(screen.queryByText('Método de acceso')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña actual')).toBeInTheDocument();
  });
});
