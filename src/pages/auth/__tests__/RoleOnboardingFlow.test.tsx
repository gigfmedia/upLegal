import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { CURRENT_PRIVACY_VERSION, CURRENT_TERMS_VERSION } from '@/lib/legalConsent';

/**
 * Regresión del flujo completo post-registro Google con navegación REAL
 * (sin mockear useNavigate): callback → consentimiento (si corresponde) →
 * selector de rol → buscador. Cubre el caso reportado en producción donde
 * una cuenta sin rol terminaba en `/` sin ver el selector.
 */
const flowState = vi.hoisted(() => ({
  user: {
    id: 'U-flow',
    email: 'flujo@gmail.com',
    email_confirmed_at: new Date().toISOString(),
    user_metadata: {} as Record<string, unknown>,
  },
  profile: null as null | {
    id: string;
    role: string | null;
    terms_accepted_at?: string | null;
    privacy_acknowledged_at?: string | null;
    terms_version?: string | null;
    privacy_version?: string | null;
  },
}));

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      exchangeCodeForSession: async () => ({ error: null }),
      getSession: async () => ({
        data: { session: { access_token: 'tok-flow', user: flowState.user } },
        error: null,
      }),
      getUser: async () => ({ data: { user: flowState.user } }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          // Snapshot fresco por lectura (como PostgREST real).
          maybeSingle: async () => ({
            data: flowState.profile ? { ...flowState.profile } : null,
          }),
        }),
      }),
      // ConsentPage persiste con upsert (crea la fila si falta) y verifica
      // releyendo timestamps antes de navegar.
      upsert: (obj: Record<string, unknown>) => {
        if (flowState.profile) Object.assign(flowState.profile, obj);
        else {
          flowState.profile = {
            id: 'U-flow',
            role: null,
            ...(obj as object),
          } as never;
        }
        return Promise.resolve({ error: null });
      },
    }),
  },
}));

vi.mock('posthog-js', () => ({ default: { capture: vi.fn() } }));

import AuthCallback from '../AuthCallback';
import ConsentPage from '../ConsentPage';
import RoleSelectionPage from '../RoleSelectionPage';

function renderFlow(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/auth/consent" element={<ConsentPage />} />
        <Route path="/auth/role" element={<RoleSelectionPage />} />
        <Route path="/search" element={<div>Buscador final</div>} />
        <Route path="/" element={<div>Home sin rol (NO DEBE LLEGAR AQUÍ)</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function chooseClientAndContinue() {
  fireEvent.click(screen.getByLabelText(/Busco un abogado\/a/));
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
}

beforeEach(() => {
  window.localStorage.clear();
  flowState.profile = null;
  const fetchMock = vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
    const { role } = JSON.parse(String(init.body)) as { role: string };
    // Imita al servidor: actualiza o inserta solo el rol.
    flowState.profile = { ...(flowState.profile as object), id: 'U-flow', role } as never;
    return { ok: true, json: async () => ({ success: true, role }) };
  });
  vi.stubGlobal('fetch', fetchMock);
});

describe('Flujo completo de onboarding Google', () => {
  it('cuenta realmente nueva (sin fila): callback → selector → buscador, sin consent ni home', async () => {
    flowState.profile = null;
    renderFlow('/auth/callback?code=flow-new');
    await screen.findByText('Bienvenido a LegalUp', undefined, { timeout: 8000 });
    expect(screen.queryByText('Home sin rol (NO DEBE LLEGAR AQUÍ)')).not.toBeInTheDocument();
    await chooseClientAndContinue();
    expect(await screen.findByText('Buscador final')).toBeInTheDocument();
  }, 20000);

  it('reproducción reportada: fila sin rol ni consent → consent → selector → buscador (nunca /)', async () => {
    flowState.profile = { id: 'U-flow', role: null };
    renderFlow('/auth/callback?code=flow-repro');
    // Primero el interstitial de consentimiento…
    await screen.findByText('Un paso más para crear tu cuenta');
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Aceptar y continuar' }));
    // …después el selector (NO el home)…
    await screen.findByText('Bienvenido a LegalUp');
    expect(screen.queryByText('Home sin rol (NO DEBE LLEGAR AQUÍ)')).not.toBeInTheDocument();
    // …y tras elegir, el buscador con el rol persistido en memoria.
    await chooseClientAndContinue();
    expect(await screen.findByText('Buscador final')).toBeInTheDocument();
    expect(flowState.profile).toMatchObject({ role: 'client' });
  }, 20000);

  it('consentimiento ya aceptado y perfil sin rol: va directo al selector', async () => {
    flowState.profile = {
      id: 'U-flow',
      role: null,
      terms_accepted_at: '2026-10-31T00:00:00.000Z',
      privacy_acknowledged_at: '2026-10-31T00:00:00.000Z',
      terms_version: CURRENT_TERMS_VERSION,
      privacy_version: CURRENT_PRIVACY_VERSION,
    };
    renderFlow('/auth/callback?code=flow-noconsent');
    await screen.findByText('Bienvenido a LegalUp', undefined, { timeout: 8000 });
    await chooseClientAndContinue();
    expect(await screen.findByText('Buscador final')).toBeInTheDocument();
  }, 20000);
});
