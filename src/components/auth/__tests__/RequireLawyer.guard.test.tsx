import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';

/**
 * Guards de abogado: esperan inicialización lenta y protegen ante
 * desconexión real. No cubren el nulo transitorio post-init (ese es el
 * fix P2 pendiente: checkSession no debe anularlo).
 */
const guardAuth = vi.hoisted(() => ({
  user: null as null | Record<string, unknown>,
  isLoading: true,
  isAuthenticated: false,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: guardAuth.user,
    isLoading: guardAuth.isLoading,
    isAuthenticated: guardAuth.isAuthenticated,
  }),
}));

import RequireLawyer from '@/components/auth/RequireLawyer';

function Probe() {
  const loc = useLocation();
  return <div data-testid="probe">{`${loc.pathname}${loc.search}`}</div>;
}

function renderGuard(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Probe />
      <Routes>
        <Route
          path="/lawyer/dashboard"
          element={
            <RequireLawyer>
              <div>Panel abogado</div>
            </RequireLawyer>
          }
        />
        <Route path="/" element={<div>Home</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequireLawyer — espera y protección', () => {
  it('inicialización lenta: no redirige ni muestra login', () => {
    guardAuth.user = null;
    guardAuth.isLoading = true;
    guardAuth.isAuthenticated = false;
    renderGuard('/lawyer/dashboard');
    expect(screen.getByTestId('probe').textContent).toBe('/lawyer/dashboard');
    expect(screen.queryByText('Panel abogado')).not.toBeInTheDocument();
    expect(screen.queryByText('Home')).not.toBeInTheDocument();
  });

  it('desconexión real post-init: redirige a login con retorno', () => {
    guardAuth.user = null;
    guardAuth.isLoading = false;
    guardAuth.isAuthenticated = false;
    renderGuard('/lawyer/dashboard');
    expect(screen.getByTestId('probe').textContent).toContain('login=true');
    expect(screen.queryByText('Panel abogado')).not.toBeInTheDocument();
  });

  it('abogado autenticado con perfil: renderiza sin redirigir', () => {
    guardAuth.user = { id: 'U-1', profile: { role: 'lawyer' } };
    guardAuth.isLoading = false;
    guardAuth.isAuthenticated = true;
    renderGuard('/lawyer/dashboard');
    expect(screen.getByText('Panel abogado')).toBeInTheDocument();
    expect(screen.getByTestId('probe').textContent).toBe('/lawyer/dashboard');
  });
});
