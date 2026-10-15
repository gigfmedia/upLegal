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
  profile_setup_completed?: boolean | null;
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
          // PostgREST devuelve snapshots frescos por lectura: se copia para
          // que el upsert no mute el estado "previo" ya leído.
          eq: (col: string, val: string) => ({
            maybeSingle: async () => {
              const row = findRow(col, val);
              return { data: row ? { ...row } : null, error: null };
            },
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
import { CURRENT_PRIVACY_VERSION, CURRENT_TERMS_VERSION, storePendingConsent } from '@/lib/legalConsent';

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
        <Route path="/lawyer/onboarding" element={<div>Onboarding abogado final</div>} />
        <Route path="/lawyer/dashboard" element={<div>Dashboard abogado final</div>} />
        <Route path="/lawyer/cases" element={<div>Casos abogado</div>} />
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

  it("trigger autogenerado (role client sin timestamps): aceptar lleva al selector, no a /", async () => {
    // Reproducción exacta del caso de producción: handle_new_user() insertó
    // role='client' por defecto y el usuario jamás eligió su rol.
    flowState.rows.set('U-repro', { id: 'U-repro', user_id: 'U-repro', role: 'client' });
    renderFlow('/auth/callback?code=trigger-row&redirectTo=%2F');
    await acceptConsent();
    await screen.findByText('Bienvenido a LegalUp', undefined, { timeout: 10000 });
    expect(probe()).toContain('/auth/role');
    expect(probe()).not.toBe('/');
  }, 25000);

  it('trigger autogenerado: cadena completa consent → rol → /search con persistencia', async () => {
    flowState.rows.set('U-repro', { id: 'U-repro', user_id: 'U-repro', role: 'client' });
    renderFlow('/auth/callback?code=trigger-full&redirectTo=%2F');
    await acceptConsent();
    await chooseClient();
    await screen.findByText('Buscador final', undefined, { timeout: 10000 });
    expect(probe()).toContain('/search');
    const row = findRow('id', flowState.user.id);
    expect(row?.role).toBe('client');
    expect(row?.terms_accepted_at).toBeTruthy();
    expect(row?.privacy_acknowledged_at).toBeTruthy();
    expect(flowState.rows.size).toBe(1);
  }, 30000);

  it('usuario existente con rol elegido e historial: va al destino sin consent ni rol', async () => {
    flowState.rows.set('U-repro', {
      id: 'U-repro',
      user_id: 'U-repro',
      role: 'client',
      terms_accepted_at: '2026-10-06T00:00:00.000Z',
      privacy_acknowledged_at: '2026-10-06T00:00:00.000Z',
    });
    renderFlow('/auth/callback?code=established&redirectTo=%2F');
    await waitFor(() => expect(probe()).toBe('/'), { timeout: 10000 });
    expect(screen.queryByText('Un paso más para crear tu cuenta')).not.toBeInTheDocument();
    expect(screen.queryByText('Bienvenido a LegalUp')).not.toBeInTheDocument();
  }, 20000);

  function seedBridge(snapshot: Record<string, unknown>) {
    window.localStorage.setItem('legalup_pending_consent', JSON.stringify(snapshot));
  }

  function validSnapshot() {
    return {
      acceptedAt: new Date().toISOString(),
      termsVersion: CURRENT_TERMS_VERSION,
      privacyVersion: CURRENT_PRIVACY_VERSION,
    };
  }

  it('aceptación del modal en puente vigente: se transcribe y no se re-pregunta', async () => {
    seedBridge(validSnapshot());
    flowState.rows.set('U-repro', { id: 'U-repro', user_id: 'U-repro', role: 'client' });
    renderFlow('/auth/callback?code=modal-accepted&redirectTo=%2F');
    // Sin interstitial: va directo al selector y los timestamps quedaron.
    await screen.findByText('Bienvenido a LegalUp', undefined, { timeout: 10000 });
    expect(probe()).toContain('/auth/role');
    expect(findRow('id', flowState.user.id)?.terms_accepted_at).toBeTruthy();
    // Consumo único: el puente quedó limpio.
    expect(window.localStorage.getItem('legalup_pending_consent')).toBeNull();
  }, 20000);

  it('aceptación del modal sin fila: se transcribe creando la fila, sin interstitial', async () => {
    seedBridge(validSnapshot());
    renderFlow('/auth/callback?code=modal-accepted-norow');
    await screen.findByText('Bienvenido a LegalUp', undefined, { timeout: 10000 });
    const row = findRow('id', flowState.user.id);
    expect(row?.terms_accepted_at).toBeTruthy();
    expect(row?.privacy_acknowledged_at).toBeTruthy();
  }, 20000);

  it('puente con versiones antiguas: se ignora y aparece el interstitial', async () => {
    seedBridge({ ...validSnapshot(), termsVersion: '2024-01-01' });
    flowState.rows.set('U-repro', { id: 'U-repro', user_id: 'U-repro', role: 'client' });
    renderFlow('/auth/callback?code=modal-stale');
    await screen.findByText('Un paso más para crear tu cuenta', undefined, { timeout: 10000 });
    expect(probe()).toContain('/auth/consent');
  }, 20000);

  it('transcripción que no persiste: fail-safe al interstitial, sin saltarlo', async () => {
    flowState.persistWrites = false;
    seedBridge(validSnapshot());
    flowState.rows.set('U-repro', { id: 'U-repro', user_id: 'U-repro', role: 'client' });
    renderFlow('/auth/callback?code=modal-nowrite');
    await screen.findByText('Un paso más para crear tu cuenta', undefined, { timeout: 10000 });
    expect(probe()).toContain('/auth/consent');
  }, 20000);

  it('OAuth cancelado: limpia el puente y va al login, sin transcribir', async () => {    seedBridge(validSnapshot());
    flowState.rows.set('U-repro', { id: 'U-repro', user_id: 'U-repro', role: 'client' });
    renderFlow('/auth/callback?error=access_denied&error_description=denied');
    await waitFor(() => expect(probe()).toContain('login=true'), { timeout: 10000 });
    expect(window.localStorage.getItem('legalup_pending_consent')).toBeNull();
    expect(findRow('id', flowState.user.id)?.terms_accepted_at).toBeFalsy();
  }, 20000);

  it('puente de intento abandonado + login de cuenta antigua: no se transcribe', async () => {
    // El puente es de un registro abandonado; la cuenta que inicia sesión
    // existe hace meses: sin vinculación temporal no hay transcripción.
    seedBridge(validSnapshot());
    flowState.user = {
      ...flowState.user,
      created_at: '2026-01-05T12:00:00.000Z',
    };
    flowState.rows.set('U-repro', { id: 'U-repro', user_id: 'U-repro', role: null });
    renderFlow('/auth/callback?code=stale-bridge-login');
    await screen.findByText('Un paso más para crear tu cuenta', undefined, { timeout: 10000 });
    expect(probe()).toContain('/auth/consent');
    expect(findRow('id', flowState.user.id)?.terms_accepted_at).toBeFalsy();
  }, 20000);

  it('puente sin created_at en el usuario: no se transcribe (fail-safe)', async () => {
    seedBridge(validSnapshot());
    flowState.user = { ...flowState.user, created_at: undefined } as never;
    flowState.rows.set('U-repro', { id: 'U-repro', user_id: 'U-repro', role: null });
    renderFlow('/auth/callback?code=no-created-at');
    await screen.findByText('Un paso más para crear tu cuenta', undefined, { timeout: 10000 });
    expect(probe()).toContain('/auth/consent');
  }, 20000);

  it('segundo intento sobrescribe al abandonado: vale la aceptación vigente', async () => {
    seedBridge({ ...validSnapshot(), termsVersion: '2024-01-01' });
    storePendingConsent({
      acceptedAt: new Date().toISOString(),
      termsVersion: CURRENT_TERMS_VERSION,
      privacyVersion: CURRENT_PRIVACY_VERSION,
    });
    flowState.rows.set('U-repro', { id: 'U-repro', user_id: 'U-repro', role: 'client' });
    renderFlow('/auth/callback?code=second-attempt&redirectTo=%2F');
    await screen.findByText('Bienvenido a LegalUp', undefined, { timeout: 10000 });
    expect(probe()).toContain('/auth/role');
  }, 20000);

  it('abogado existente sin destino explícito: va a /lawyer/onboarding, no a /', async () => {
    flowState.rows.set('U-repro', {
      id: 'U-repro',
      user_id: 'U-repro',
      role: 'lawyer',
      terms_accepted_at: '2026-10-06T00:00:00.000Z',
      privacy_acknowledged_at: '2026-10-06T00:00:00.000Z',
    });
    renderFlow('/auth/callback?code=lawyer-login&redirectTo=%2F');
    await screen.findByText('Onboarding abogado final', undefined, { timeout: 10000 });
    expect(probe()).toBe('/lawyer/onboarding');
  }, 20000);

  it('abogado con onboarding completo: va a /lawyer/dashboard', async () => {
    flowState.rows.set('U-repro', {
      id: 'U-repro',
      user_id: 'U-repro',
      role: 'lawyer',
      profile_setup_completed: true,
      terms_accepted_at: '2026-10-06T00:00:00.000Z',
      privacy_acknowledged_at: '2026-10-06T00:00:00.000Z',
    });
    renderFlow('/auth/callback?code=lawyer-done&redirectTo=%2F');
    await screen.findByText('Dashboard abogado final', undefined, { timeout: 10000 });
    expect(probe()).toBe('/lawyer/dashboard');
  }, 20000);

  it('abogado con destino interno explícito: se respeta', async () => {
    flowState.rows.set('U-repro', {
      id: 'U-repro',
      user_id: 'U-repro',
      role: 'lawyer',
      terms_accepted_at: '2026-10-06T00:00:00.000Z',
      privacy_acknowledged_at: '2026-10-06T00:00:00.000Z',
    });
    renderFlow('/auth/callback?code=lawyer-deep&redirectTo=%2Flawyer%2Fcases');
    await screen.findByText('Casos abogado', undefined, { timeout: 10000 });
    expect(probe()).toBe('/lawyer/cases');
  }, 20000);

  it('cliente existente sin destino explícito: conserva ir a /', async () => {
    flowState.rows.set('U-repro', {
      id: 'U-repro',
      user_id: 'U-repro',
      role: 'client',
      terms_accepted_at: '2026-10-06T00:00:00.000Z',
      privacy_acknowledged_at: '2026-10-06T00:00:00.000Z',
    });
    renderFlow('/auth/callback?code=client-login&redirectTo=%2F');
    await waitFor(() => expect(probe()).toBe('/'), { timeout: 10000 });
    expect(screen.queryByText('Un paso más para crear tu cuenta')).not.toBeInTheDocument();
  }, 20000);

  it('redirect externo con abogado: se sanitiza y va al destino por rol', async () => {
    flowState.rows.set('U-repro', {
      id: 'U-repro',
      user_id: 'U-repro',
      role: 'lawyer',
      terms_accepted_at: '2026-10-06T00:00:00.000Z',
      privacy_acknowledged_at: '2026-10-06T00:00:00.000Z',
    });
    renderFlow('/auth/callback?code=lawyer-evil&redirectTo=' + encodeURIComponent('https://attacker/x'));
    await screen.findByText('Onboarding abogado final', undefined, { timeout: 10000 });
    expect(probe()).toBe('/lawyer/onboarding');
  }, 20000);
});
