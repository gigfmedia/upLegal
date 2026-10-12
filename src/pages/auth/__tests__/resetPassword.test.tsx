import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
      setSession: vi.fn(async () => ({ data: {}, error: null })),
      exchangeCodeForSession: vi.fn(async () => ({ data: {}, error: null })),
      verifyOtp: vi.fn(async () => ({ data: {}, error: null })),
      updateUser: vi.fn(async () => ({ data: {}, error: null })),
      signOut: vi.fn(async () => ({})),
    },
  },
}));
vi.mock('@/utils/auth-utils', () => ({
  sendPasswordResetEmail: vi.fn(async () => ({ success: true })),
}));
vi.mock('@/hooks/usePasswordSetupState', () => ({
  markPasswordSetupComplete: vi.fn(async () => true),
}));
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));
vi.mock('@/components/Header', () => ({ default: () => <div>Header</div> }));

import { supabase } from '@/lib/supabase';
import { sendPasswordResetEmail } from '@/utils/auth-utils';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';

const mockedGetSession = vi.mocked(supabase.auth.getSession);

describe('recovery nunca va a /auth/callback (App.tsx)', () => {
  const app = readFileSync(join(process.cwd(), 'src/App.tsx'), 'utf8');
  it('type=recovery sale antes del manejo genérico y va a /reset-password', () => {
    const guardAt = app.indexOf("if (type === 'recovery')");
    const callbackNav = app.indexOf("navigate('/auth/callback')");
    expect(guardAt).toBeGreaterThan(-1);
    expect(callbackNav).toBeGreaterThan(guardAt);
    expect(app.slice(guardAt, guardAt + 400)).toContain('/reset-password');
  });
});

describe('ResetPasswordPage', () => {
  it('sin tokens muestra pantalla inválida con reenvío (no exige login)', async () => {
    render(
      <MemoryRouter initialEntries={['/reset-password']}>
        <ResetPasswordPage />
      </MemoryRouter>
    );
    expect(await screen.findByText(/Enlace inválido o expirado/)).toBeDefined();
    const email = screen.getByLabelText(/Correo electrónico/) as HTMLInputElement;
    fireEvent.change(email, { target: { value: 'cliente@test.cl' } });
    fireEvent.click(screen.getByRole('button', { name: /Enviar nuevo enlace/ }));
    await waitFor(() => expect(sendPasswordResetEmail).toHaveBeenCalledWith('cliente@test.cl'));
  });

  it('con sesión ya establecida no re-canjea código (session-first)', async () => {
    mockedGetSession.mockResolvedValue({
      data: { session: { user: { id: 'u1' } } },
      error: null,
    } as never);
    window.history.pushState({}, '', '/reset-password?code=abc123');
    render(
      <MemoryRouter initialEntries={['/reset-password?code=abc123']}>
        <ResetPasswordPage />
      </MemoryRouter>
    );
    await waitFor(() => expect(mockedGetSession).toHaveBeenCalled());
    expect(supabase.auth.exchangeCodeForSession).not.toHaveBeenCalled();
    window.history.pushState({}, '', '/');
  });
});
