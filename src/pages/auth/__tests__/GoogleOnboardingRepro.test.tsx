import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';

/**
 * REPRODUCCIÓN del fallo observado en producción (legalup.cl):
 *   https://legalup.cl/ → registro con Google → /auth/consent?redirectTo=%2F
 *   (aunque se habían marcado los términos en el modal) → «Aceptar y
 *   continuar» → `/` — nunca aparece `/auth/role`.
 *
 * A diferencia de las suites existentes, el mock de Supabase aquí es fiel:
 * distingue la columna de filtrado (`id` vs `user_id`), modela escrituras
 * que no afectan filas (no-op silencioso, como RLS) y usa navegación REAL
 * (sin mockear useNavigate). Por eso estos casos fallan con el código
 * actual aunque los simulados pasen.
 */
type ProfileRow = {
  id: string;
  user_id: string;
  role: string | null;
  terms_accepted_at?: string | null;
  privacy_acknowledged_at?: string | null;
};

const flowState = vi.hoisted(() => ({
  user: {
    id: 'U-repro',
    email: 'repro@gmail.com',
    created_at: new Date().toISOString(),
    email_confirmed_at: new Date().toISOString(),
    user_metadata: {} as Record<string, unknown>,
  },
  rows: new Map<string, ProfileRow>(),
  /** false = las escrituras cliente son no-op silenciosas (filas no afectadas, sin error). */
  persistWrites: true,
}));

function findRow(col: string, val: string): ProfileRow | null {
  for (const row of flowState.rows.values()) {
    if ((row as Record<string, unknown>)[col] === val) return row;
  }
  return null;
}

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      exchangeCodeForSession: async () => ({ error: null }),
      getSession: async () => ({
        data: { session: { access_token: 'tok-repro', user: flowState.user } },
        error: null,
      }),
      getUser: async () => ({ data: { user: flowState.user } }),
    },
    from: (table: string) => {
      if (table === 'lawyer_services') {
        return { select: () => ({ eq: async () => ({ count: 0, data: [] }) }) };
      }
      if (table !== 'profiles') throw new Error('tabla no mockeada: ' + table);
      return {
        select: () => ({
          eq: (col: string, val: string) => ({
            maybeSingle: async () => ({ data: findRow(col, val), error: null }),
          }),
        }),
        update: (patch: Record<string, unknown>) => ({
          eq: async (col: string, val: string) => {
            if (flowState.persistWrites) {
              const row = findRow(col, val);
              if (row) Object.assign(row, patch);
            }
            return { error: null };
          },
        }),
        upsert: (obj: Record<string, unknown>) => {
          if (flowState.persistWrites) {
            const existing = flowState.rows.get(String(obj.id));
            if (existing) Object.assign(existing, obj);
            else {
              flowState.rows.set(String(obj.id), {
                id: String(obj.id),
                user_id: String(obj.user_id ?? obj.id),
                role: (obj.role as string | null) ?? null,
                ...obj,
              } as ProfileRow);
            }
          }
          return Promise.resolve({ error: null });
        },
        insert: (obj: Record<string, unknown>) => {
          if (flowState.persistWrites) {
            flowState.rows.set(String(obj.id), obj as unknown as ProfileRow);
          }
          return Promise.resolve({ error: null });
        },
      };
    },
  },
}));

vi.mock('posthog-js', () => ({ default: { capture: vi.fn() } }));

import AuthCallback from '../AuthCallback';
import ConsentPage from '../ConsentPage';
import RoleSelectionPage from '../RoleSelectionPage';

function Probe() {
  const loc = useLocation();
  return <div data-testid="probe">{`${loc.pathname}${loc.search}`}</div>;
}

function renderFlow(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Probe />
      <Routes>
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/auth/consent" element={<ConsentPage />} />
        <Route path="/auth/role" element={<RoleSelectionPage />} />
        <Route path="/search" element={<div>Buscador final</div>} />
        <Route path="/" element={<div>Home sin rol</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

const probe = () => screen.getByTestId('probe').textContent ?? '';

async function acceptConsent() {
  // El reintento de lectura (1.5s sin fila) exige espera explícita.
  await screen.findByText('Un paso más para crear tu cuenta', undefined, { timeout: 10000 });
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'Aceptar y continuar' }));
}

async function chooseClient() {
  await screen.findByText('Bienvenido a LegalUp');
  fireEvent.click(screen.getByLabelText(/Busco un abogado\/a/));
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
}

beforeEach(() => {
  window.localStorage.clear();
  flowState.rows.clear();
  flowState.persistWrites = true;
  flowState.user = {
    id: 'U-repro',
    email: 'repro@gmail.com',
    created_at: new Date().toISOString(),
    email_confirmed_at: new Date().toISOString(),
    user_metadata: {},
  };
  // Imita POST /api/profile/role del servidor (service_role, siempre persiste).
  const fetchMock = vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
    const { role } = JSON.parse(String(init.body)) as { role: string };
    const uid = flowState.user.id;
    const existing = findRow('id', uid) ?? findRow('user_id', uid);
    if (existing) existing.role = role;
    else flowState.rows.set(uid, { id: uid, user_id: uid, role });
    return { ok: true, json: async () => ({ success: true, role }) };
  });
  vi.stubGlobal('fetch', fetchMock);
});

describe('Reproducción del fallo de onboarding Google en producción', () => {
  it('alta Google fresca sin fila: el consentimiento precede al selector (no se salta)', async () => {
    renderFlow('/auth/callback?code=fresh-no-row');
    // Hoy el callback omite el interstitial cuando no hay fila y va al rol.
    await screen.findByText('Un paso más para crear tu cuenta', undefined, { timeout: 10000 });
    expect(probe()).toContain('/auth/consent');
  }, 20000);

  it('flujo completo fresco: consent → rol → /search (nunca /), con persistencia', async () => {
    // Entrada desde la home: el redirect por defecto es la raíz.
    renderFlow('/auth/callback?code=fresh-full');
    await acceptConsent();
    await chooseClient();
    await screen.findByText('Buscador final', undefined, { timeout: 10000 });
    expect(probe()).toContain('/search');
    expect(probe()).not.toBe('/');
    const row = findRow('id', flowState.user.id);
    expect(row?.role).toBe('client');
    expect(row?.terms_accepted_at).toBeTruthy();
    expect(row?.privacy_acknowledged_at).toBeTruthy();
    expect(flowState.rows.size).toBe(1);
  }, 30000);

  it('cuenta reportada (fila sin rol ni consent, destino /): consent → rol, jamás directo a /', async () => {
    flowState.rows.set('U-repro', { id: 'U-repro', user_id: 'U-repro', role: null });
    renderFlow('/auth/callback?code=reported&redirectTo=%2F');
    await acceptConsent();
    await screen.findByText('Bienvenido a LegalUp', undefined, { timeout: 10000 });
    expect(probe()).toContain('/auth/role');
    expect(probe()).not.toBe('/');
  }, 20000);

  it('aceptación que no persiste: no avanza a / ni a rol y se queda en consentimiento', async () => {
    flowState.persistWrites = false;
    flowState.rows.set('U-repro', { id: 'U-repro', user_id: 'U-repro', role: null });
    renderFlow('/auth/consent?redirectTo=%2F');
    await acceptConsent();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Aceptar y continuar' })).toBeEnabled());
    expect(probe()).toContain('/auth/consent');
    expect(screen.queryByText('Bienvenido a LegalUp')).not.toBeInTheDocument();
  }, 20000);

  it('selector con destino /: tras elegir cliente va a /search, no a /', async () => {
    renderFlow('/auth/role?redirectTo=%2F');
    await chooseClient();
    await screen.findByText('Buscador final', undefined, { timeout: 10000 });
    expect(probe()).toContain('/search');
  }, 20000);

  it('abogado Google fresco (metadata lawyer, sin fila): flujo previo intacto, va a /lawyer/onboarding', async () => {
    flowState.user = {
      ...flowState.user,
      user_metadata: { role: 'lawyer' },
    };
    renderFlow('/auth/callback?code=lawyer-fresh');
    // Sin interstitial (flujo abogado inalterado) y sin selector de rol:
    // el metadata lawyer sigue eximiendo de la selección.
    await waitFor(() => expect(probe()).toBe('/lawyer/onboarding'), { timeout: 15000 });
    expect(screen.queryByText('Un paso más para crear tu cuenta')).not.toBeInTheDocument();
    expect(screen.queryByText('Bienvenido a LegalUp')).not.toBeInTheDocument();
    expect(flowState.rows.size).toBe(0);
  }, 25000);
});
