import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const consentState = vi.hoisted(() => ({
  user: { id: 'U-new', email: 'nuevo@gmail.com', user_metadata: {} } as null | {
    id: string;
    email: string;
    user_metadata: Record<string, unknown>;
  },
  profile: null as null | {
    id: string;
    role: string | null;
    terms_accepted_at?: string | null;
    privacy_acknowledged_at?: string | null;
  },
  updateError: null as null | Error,
}));

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: () => Promise.resolve({ data: { user: consentState.user } }),
    },
    from: () => ({
      // ConsentPage persiste con upsert (crea la fila si falta) y verifica
      // releyendo timestamps antes de navegar.
      upsert: (obj: Record<string, unknown>) => {
        if (!consentState.updateError) {
          consentState.profile = { ...(consentState.profile as object | null), ...obj } as never;
        }
        return Promise.resolve({ error: consentState.updateError });
      },
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: consentState.profile }),
        }),
      }),
    }),
  },
}));

import ConsentPage from '../ConsentPage';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/auth/consent" element={<ConsentPage />} />
        <Route path="/auth/role" element={<div>Pantalla de rol</div>} />
        <Route path="/search" element={<div>Buscador</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function acceptTerms() {
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'Aceptar y continuar' }));
}

beforeEach(() => {
  window.localStorage.clear();
  consentState.user = { id: 'U-new', email: 'nuevo@gmail.com', user_metadata: {} };
  consentState.profile = null;
  consentState.updateError = null;
});

describe('ConsentPage — cierre del bypass hacia el selector de rol', () => {
  it('usuario nuevo sin rol: tras aceptar va a /auth/role preservando el destino', async () => {
    consentState.profile = { id: 'U-new', role: null };
    renderAt('/auth/consent?redirectTo=%2Fsearch');
    await acceptTerms();
    expect(await screen.findByText('Pantalla de rol')).toBeInTheDocument();
  });

  it('usuario con rol definido: tras aceptar sigue al destino existente', async () => {
    consentState.profile = { id: 'U-new', role: 'client' };
    renderAt('/auth/consent?redirectTo=%2Fsearch');
    await acceptTerms();
    expect(await screen.findByText('Buscador')).toBeInTheDocument();
  });

  it('anti-regresión: cuenta nueva con destino / nunca termina en / sin elegir rol', async () => {
    // Reproducción exacta del caso reportado: /auth/consent?redirectTo=%2F
    // debe llevar al selector, jamás directo a /.
    consentState.profile = { id: 'U-new', role: null };
    renderAt('/auth/consent?redirectTo=%2F');
    await acceptTerms();
    expect(await screen.findByText('Pantalla de rol')).toBeInTheDocument();
  });

  it('sin aceptar: no avanza y muestra el error de consentimiento', async () => {
    renderAt('/auth/consent?redirectTo=%2Fsearch');
    fireEvent.click(screen.getByRole('button', { name: 'Aceptar y continuar' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText('Pantalla de rol')).not.toBeInTheDocument();
    expect(screen.queryByText('Buscador')).not.toBeInTheDocument();
  });

  it('error al guardar aceptación: toast/atrapado sin redirigir', async () => {
    consentState.updateError = new Error('db offline');
    consentState.profile = { id: 'U-new', role: null };
    renderAt('/auth/consent?redirectTo=%2Fsearch');
    await acceptTerms();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Aceptar y continuar' })).toBeEnabled());
    expect(screen.queryByText('Pantalla de rol')).not.toBeInTheDocument();
    expect(screen.queryByText('Buscador')).not.toBeInTheDocument();
  });
});
