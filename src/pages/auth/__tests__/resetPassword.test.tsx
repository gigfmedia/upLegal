import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
      getUser: vi.fn(async () => ({ data: { user: { id: 'u1' } }, error: null })),
      setSession: vi.fn(async () => ({ data: { user: { id: 'u1' } }, error: null })),
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
vi.mock('@/hooks/use-toast', () => {
  const toast = vi.fn();
  return { useToast: () => ({ toast }) };
});
vi.mock('@/components/Header', () => ({ default: () => <div>Header</div> }));

import { supabase } from '@/lib/supabase';
import { sendPasswordResetEmail } from '@/utils/auth-utils';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';

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
  beforeEach(() => {
    vi.resetAllMocks();
    sessionStorage.clear();
    window.history.pushState({}, '', '/');
    const { getSession, setSession, exchangeCodeForSession, verifyOtp, updateUser } = supabase.auth;
    vi.mocked(getSession).mockResolvedValue({ data: { session: null }, error: null } as never);
    vi.mocked(setSession).mockResolvedValue({ data: { user: { id: 'u1' } }, error: null } as never);
    vi.mocked(exchangeCodeForSession).mockResolvedValue({ data: { user: { id: 'u1' } }, error: null } as never);
    vi.mocked(verifyOtp).mockResolvedValue({ data: { user: { id: 'u1' } }, error: null } as never);
    vi.mocked(updateUser).mockResolvedValue({ data: {}, error: null } as never);
  });
  it('enlace consumido (error otp_expired) muestra causa específica + reenvío', async () => {
    window.history.pushState({}, '', '/reset-password?error=access_denied&error_code=otp_expired');
    render(
      <MemoryRouter initialEntries={['/reset-password?error=access_denied&error_code=otp_expired']}>
        <ResetPasswordPage />
      </MemoryRouter>
    );
    expect(await screen.findByText(/ya fue utilizado o expiró/)).toBeDefined();
    expect(screen.getByLabelText(/Correo electrónico/)).toBeDefined();
    window.history.pushState({}, '', '/');
  });

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

  it('canje fallido con sesión activa continúa (carrera del auto-canje)', async () => {
    const { exchangeCodeForSession, getSession } = supabase.auth;
    vi.mocked(exchangeCodeForSession).mockResolvedValueOnce({ data: {}, error: new Error('code used') } as never);
    vi.mocked(getSession).mockResolvedValue({
      data: { session: { user: { id: 'u1' } } },
      error: null,
    } as never);
    window.history.pushState({}, '', '/reset-password?code=abc123');
    render(
      <MemoryRouter initialEntries={['/reset-password?code=abc123']}>
        <ResetPasswordPage />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText(/Restablecer contraseña/)).toBeDefined());
    expect(screen.queryByText(/no es válido o ha expirado/)).toBeNull();
    window.history.pushState({}, '', '/');
  });

  it('canje fallido sin sesión muestra enlace inválido', async () => {
    const { exchangeCodeForSession, getSession } = supabase.auth;
    vi.mocked(exchangeCodeForSession).mockResolvedValueOnce({ data: {}, error: new Error('bad code') } as never);
    vi.mocked(getSession).mockResolvedValue({ data: { session: null }, error: null } as never);
    window.history.pushState({}, '', '/reset-password?code=badcode');
    render(
      <MemoryRouter initialEntries={['/reset-password?code=badcode']}>
        <ResetPasswordPage />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText(/no es válido o ha expirado/)).toBeDefined());
    expect(exchangeCodeForSession).toHaveBeenCalledTimes(1);
    window.history.pushState({}, '', '/');
  });

  it('tokens en fragmento establecen sesión una sola vez y muestran el formulario', async () => {
    const { setSession } = supabase.auth;
    window.history.pushState({}, '', '/reset-password#access_token=aaa&refresh_token=bbb&type=recovery');
    render(
      <MemoryRouter initialEntries={['/reset-password']}>
        <ResetPasswordPage />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText(/Restablecer contraseña/)).toBeDefined());
    expect(setSession).toHaveBeenCalledTimes(1);
    expect(setSession).toHaveBeenCalledWith({ access_token: 'aaa', refresh_token: 'bbb' });
    window.history.pushState({}, '', '/');
  });

  it('sesión preestablecida por recovery previo muestra el formulario sin tokens', async () => {
    sessionStorage.setItem('legalup_recovery_ok', 'u1');
    const { getSession } = supabase.auth;
    vi.mocked(getSession).mockResolvedValue({
      data: { session: { user: { id: 'u1' } } },
      error: null,
    } as never);
    render(
      <MemoryRouter initialEntries={['/reset-password']}>
        <ResetPasswordPage />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText(/Restablecer contraseña/)).toBeDefined());
    expect(screen.queryByText(/Enlace inválido o expirado/)).toBeNull();
    window.history.pushState({}, '', '/');
  });

  it('sesión ordinaria sin marca NO autoriza el restablecimiento', async () => {
    const { getSession } = supabase.auth;
    vi.mocked(getSession).mockResolvedValue({
      data: { session: { user: { id: 'u9' } } },
      error: null,
    } as never);
    render(
      <MemoryRouter initialEntries={['/reset-password']}>
        <ResetPasswordPage />
      </MemoryRouter>
    );
    expect(await screen.findByText(/Enlace inválido o expirado/)).toBeDefined();
    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
    window.history.pushState({}, '', '/');
  });

  it('ojo muestra/oculta cada campo de forma independiente', async () => {
    window.history.pushState({}, '', '/reset-password?code=ok123');
    render(
      <MemoryRouter initialEntries={['/reset-password?code=ok123']}>
        <ResetPasswordPage />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText(/Restablecer contraseña/)).toBeDefined());
    const toggles = screen.getAllByRole('button', { name: /Mostrar Nueva contraseña|Mostrar Confirmar contraseña/ });
    expect(toggles).toHaveLength(2);
    fireEvent.click(toggles[0]);
    expect(screen.getByRole('button', { name: /Ocultar Nueva contraseña/ })).toBeDefined();
    expect(screen.getByRole('button', { name: /Mostrar Confirmar contraseña/ })).toBeDefined();
    const inputs = document.querySelectorAll('input');
    expect(inputs[0].getAttribute('type')).toBe('text');
    expect(inputs[1].getAttribute('type')).toBe('password');
    window.history.pushState({}, '', '/');
  });

  it('rechaza clave débil con el mensaje canónico compartido', async () => {
    window.history.pushState({}, '', '/reset-password?code=ok123');
    render(
      <MemoryRouter initialEntries={['/reset-password?code=ok123']}>
        <ResetPasswordPage />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText(/Restablecer contraseña/)).toBeDefined());
    fireEvent.change(screen.getByLabelText(/Nueva contraseña/, { selector: 'input' }), { target: { value: 'corta1!' } });
    fireEvent.change(screen.getByLabelText(/Confirmar contraseña/, { selector: 'input' }), { target: { value: 'corta1!' } });
    fireEvent.click(screen.getByRole('button', { name: /Actualizar contraseña/ }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/entre 8 y 18 caracteres e incluir mayúscula/));
    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
    window.history.pushState({}, '', '/');
  });

  it('cambio de usuario antes de enviar bloquea y limpia la marca', async () => {
    window.history.pushState({}, '', '/reset-password?code=ok123');
    render(
      <MemoryRouter initialEntries={['/reset-password?code=ok123']}>
        <ResetPasswordPage />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText(/Restablecer contraseña/)).toBeDefined());
    // La visita marcó u1; la sesión vigente ahora es de otro usuario.
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'u2' } },
      error: null,
    } as never);
    fireEvent.change(screen.getByLabelText(/Nueva contraseña/, { selector: 'input' }), { target: { value: 'NuevaSegura1!' } });
    fireEvent.change(screen.getByLabelText(/Confirmar contraseña/, { selector: 'input' }), { target: { value: 'NuevaSegura1!' } });
    fireEvent.click(screen.getByRole('button', { name: /Actualizar contraseña/ }));
    await waitFor(() => expect(screen.getByText(/La sesión cambió durante el proceso/)).toBeDefined());
    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('legalup_recovery_ok')).toBeNull();
    window.history.pushState({}, '', '/');
  });

  it('envío exitoso actualiza la clave y muestra éxito', async () => {
    window.history.pushState({}, '', '/reset-password?code=ok123');
    render(
      <MemoryRouter initialEntries={['/reset-password?code=ok123']}>
        <ResetPasswordPage />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText(/Restablecer contraseña/)).toBeDefined());
    fireEvent.change(screen.getByLabelText(/Nueva contraseña/, { selector: 'input' }), { target: { value: 'NuevaSegura1!' } });
    fireEvent.change(screen.getByLabelText(/Confirmar contraseña/, { selector: 'input' }), { target: { value: 'NuevaSegura1!' } });
    fireEvent.click(screen.getByRole('button', { name: /Actualizar contraseña/ }));
    await waitFor(() =>
      expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: 'NuevaSegura1!' })
    );
    expect(await screen.findByText(/¡Contraseña actualizada!/)).toBeDefined();
    expect(sessionStorage.getItem('legalup_recovery_ok')).toBeNull();
    window.history.pushState({}, '', '/');
  });
});
