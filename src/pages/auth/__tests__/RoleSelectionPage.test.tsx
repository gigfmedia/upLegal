import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const supabaseState = vi.hoisted(() => ({
  user: null as null | { id: string; email: string; user_metadata: Record<string, unknown> },
  profile: null as null | { id: string; role: string | null },
  token: 'test-token',
}));

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: () => Promise.resolve({ data: { user: supabaseState.user } }),
      getSession: () =>
        Promise.resolve({ data: { session: supabaseState.token ? { access_token: supabaseState.token } : null } }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: supabaseState.profile }),
        }),
      }),
    }),
  },
}));

import RoleSelectionPage from '../RoleSelectionPage';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/auth/role" element={<RoleSelectionPage />} />
        <Route path="/search" element={<div>Buscador</div>} />
        <Route path="/lawyer/onboarding" element={<div>Onboarding abogado</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

const GOOGLE_USER = {
  id: 'user-google-1',
  email: 'nuevo@gmail.com',
  user_metadata: { name: 'Nuevo Usuario' },
};

beforeEach(() => {
  window.localStorage.clear();
  supabaseState.user = { ...GOOGLE_USER };
  supabaseState.profile = null;
  supabaseState.token = 'test-token';
  vi.unstubAllGlobals();
});

describe('RoleSelectionPage — onboarding simple post-registro', () => {
  it('1. muestra título, texto y dos opciones; Continuar deshabilitado sin selección', async () => {
    renderAt('/auth/role');
    expect(await screen.findByText('Bienvenido a LegalUp')).toBeInTheDocument();
    expect(screen.getByText('Para comenzar, cuéntanos qué necesitas hacer')).toBeInTheDocument();
    expect(screen.getByText('Soy abogado/a')).toBeInTheDocument();
    expect(screen.getByText('Busco un abogado/a')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();
  });

  it('3/4. cliente: selecciona, guarda vía servidor y llega al buscador', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, role: 'client' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    renderAt('/auth/role');
    await screen.findByText('Bienvenido a LegalUp');
    fireEvent.click(screen.getByLabelText(/Busco un abogado\/a/));
    const cta = screen.getByRole('button', { name: 'Continuar' });
    expect(cta).toBeEnabled();
    fireEvent.click(cta);
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/profile/role'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ role: 'client' }),
        }),
      );
    });
    expect(await screen.findByText('Buscador')).toBeInTheDocument();
  });

  it('3. abogado: llega al onboarding profesional existente', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, role: 'lawyer' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    renderAt('/auth/role');
    await screen.findByText('Bienvenido a LegalUp');
    fireEvent.click(screen.getByLabelText(/Soy abogado\/a/));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(await screen.findByText('Onboarding abogado')).toBeInTheDocument();
  });

  it('2/5. usuario existente con rol: no muestra la pantalla', async () => {
    supabaseState.profile = { id: 'user-google-1', role: 'client' };
    renderAt('/auth/role');
    expect(await screen.findByText('Buscador')).toBeInTheDocument();
    expect(screen.queryByText('Bienvenido a LegalUp')).not.toBeInTheDocument();
  });

  it('6. error de persistencia: mensaje claro y permite reintentar', async () => {    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({ error: 'Fallo temporal' }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true, role: 'client' }) });
    vi.stubGlobal('fetch', fetchMock);
    renderAt('/auth/role');
    await screen.findByText('Bienvenido a LegalUp');
    fireEvent.click(screen.getByLabelText(/Busco un abogado\/a/));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(await screen.findByText('Fallo temporal')).toBeInTheDocument();
    // Sigue en la pantalla y el botón permite reintentar.
    const cta = screen.getByRole('button', { name: 'Continuar' });
    expect(cta).toBeEnabled();
    fireEvent.click(cta);
    expect(await screen.findByText('Buscador')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('H1. redirectTo a /auth/ se ignora: sin spinner infinito y sin re-mostrar', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, role: 'client' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    renderAt('/auth/role?redirectTo=%2Fauth%2Frole');
    // Muestra el formulario (no queda en spinner).
    await screen.findByText('Bienvenido a LegalUp');
    fireEvent.click(screen.getByLabelText(/Busco un abogado\/a/));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    // Tras guardar va al buscador, no de vuelta a /auth/role.
    expect(await screen.findByText('Buscador')).toBeInTheDocument();
  });

  it('H1. usuario con rol y redirectTo a /auth/ sale al destino real', async () => {
    supabaseState.profile = { id: 'user-google-1', role: 'client' };
    renderAt('/auth/role?redirectTo=%2Fauth%2Frole');
    expect(await screen.findByText('Buscador')).toBeInTheDocument();
    expect(screen.queryByText('Bienvenido a LegalUp')).not.toBeInTheDocument();
  });
});
