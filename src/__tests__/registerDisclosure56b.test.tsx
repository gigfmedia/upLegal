import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => vi.fn() };
});
vi.mock('@/contexts/AuthContext/clean/useAuth', () => ({
  useAuth: () => ({ login: vi.fn(), signup: vi.fn(), user: null }),
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: async () => ({ data: { user: null } }),
      signInWithOAuth: async () => ({ data: {}, error: null }),
    },
    from: () => ({ select: () => ({ ilike: () => ({ maybeSingle: async () => ({ data: null }) }) }) }),
  },
}));
vi.mock('posthog-js', () => ({ default: { capture: vi.fn() } }));

import { AuthModal } from '@/components/AuthModal';

const renderSignup = () =>
  render(
    <MemoryRouter>
      <TooltipProvider>
        <AuthModal isOpen mode="signup" onClose={() => {}} onModeChange={() => {}} />
      </TooltipProvider>
    </MemoryRouter>
  );
const renderLogin = () =>
  render(
    <MemoryRouter>
      <TooltipProvider>
        <AuthModal isOpen mode="login" onClose={() => {}} onModeChange={() => {}} />
      </TooltipProvider>
    </MemoryRouter>
  );

describe('FASE 5.6B — disclosure de registro', () => {
  it('1/2/3. signup oculta el formulario y muestra email antes que Google', () => {
    renderSignup();
    expect(screen.getByRole('button', { name: 'Continuar con email' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continuar con Google' })).toBeInTheDocument();
    // Orden: email primero.
    const buttons = Array.from(document.querySelectorAll('button')).map((b) => b.textContent);
    const emailIdx = buttons.findIndex((t) => t?.includes('Continuar con email'));
    const googleIdx = buttons.findIndex((t) => t?.includes('Continuar con Google'));
    expect(emailIdx).toBeGreaterThan(-1);
    expect(googleIdx).toBeGreaterThan(-1);
    expect(emailIdx).toBeLessThan(googleIdx);
    // Formulario email oculto (sin input de email).
    expect(document.querySelector('input[type="email"]')).toBeNull();
  });
  it('4/5. click despliega el formulario existente con validaciones', () => {
    renderSignup();
    fireEvent.click(screen.getByRole('button', { name: 'Continuar con email' }));
    expect(document.querySelector('input[type="email"]')).not.toBeNull();
    // Botón principal oculto una vez abierto.
    expect(screen.queryByRole('button', { name: 'Continuar con email' })).toBeNull();
  });
  it('6. checkbox legal visible y funcional en signup', () => {
    renderSignup();
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });
  it('9. sin link redundante: Google queda visible bajo el formulario', () => {
    renderSignup();
    fireEvent.click(screen.getByRole('button', { name: 'Continuar con email' }));
    expect(document.querySelector('input[type="email"]')).not.toBeNull();
    expect(screen.queryByRole('button', { name: /Usar otro método/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'Continuar con Google' })).toBeInTheDocument();
  });
  it('12. login mantiene formulario normal sin disclosure', () => {
    renderLogin();
    expect(document.querySelector('input[type="email"]')).not.toBeNull();
    expect(document.querySelector('input[type="password"]')).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Continuar con email' })).toBeNull();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });
});
