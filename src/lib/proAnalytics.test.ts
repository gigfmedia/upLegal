/**
 * FASE 1F — Tests de instrumentación Pro: identidad, consentimiento,
 * catálogo canónico, UTM, retorno y ausencia de PII.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  init: vi.fn(),
  capture: vi.fn(),
  register: vi.fn(),
  identify: vi.fn(),
  reset: vi.fn(),
  startSessionRecording: vi.fn(),
  stopSessionRecording: vi.fn(),
  opt_in_capturing: vi.fn(),
  opt_out_capturing: vi.fn(),
}));

const supabaseMocks = vi.hoisted(() => ({
  // count configurable por test para activationAnalytics
  firstCount: 1,
}));

vi.mock('posthog-js', () => ({
  default: {
    init: (...args: unknown[]) => mocks.init(...args),
    capture: (...args: unknown[]) => mocks.capture(...args),
    register: (...args: unknown[]) => mocks.register(...args),
    identify: (...args: unknown[]) => mocks.identify(...args),
    reset: (...args: unknown[]) => mocks.reset(...args),
    startSessionRecording: (...args: unknown[]) => mocks.startSessionRecording(...args),
    stopSessionRecording: (...args: unknown[]) => mocks.stopSessionRecording(...args),
    opt_in_capturing: (...args: unknown[]) => mocks.opt_in_capturing(...args),
    opt_out_capturing: (...args: unknown[]) => mocks.opt_out_capturing(...args),
    get_distinct_id: () => 'test-distinct-id',
  },
}));

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => Promise.resolve({ count: supabaseMocks.firstCount }),
      }),
    }),
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      getUser: () => Promise.resolve({ data: { user: null } }),
    },
  },
  getSupabaseClient: () => ({
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      getUser: () => Promise.resolve({ data: { user: null } }),
    },
  }),
}));

import { resetPostHogForTests } from './posthogLoader';
import { ensurePostHog } from './consentTrackers';
import { CONSENT_STORAGE_KEY } from './cookieConsent';
import {
  identifyProUser,
  resetProIdentity,
  resetProIdentityForTests,
  captureSignUpStarted,
  captureSignUpCompleted,
  captureLoginCompleted,
  captureEmailVerificationCompleted,
  captureOnboardingCompleted,
  captureCaseNextActionAdded,
  captureCaseTaskCreated,
  captureCaseTaskCompleted,
  captureCaseDocumentUploaded,
  captureCaseAiUsed,
  trackProSessionReturn,
  resetProSessionForTests,
  SESSION_RETURN_MIN_INTERVAL_MS,
} from './proAnalytics';
import {
  captureProEntryAttribution,
  getProAttribution,
  getProAttributionProps,
  registerProAttribution,
  resetProAttributionForTests,
} from './proAttribution';
import { trackFirstCaseIfNeeded } from './activationAnalytics';

const UUID_A = '11111111-1111-4111-8111-111111111111';
const UUID_B = '22222222-2222-4222-8222-222222222222';

function seedConsent(analytics: boolean) {
  window.localStorage.setItem(
    CONSENT_STORAGE_KEY,
    JSON.stringify({
      version: '1',
      necessary: true,
      analytics,
      marketing: false,
      preferences: false,
      timestamp: new Date().toISOString(),
    }),
  );
}

async function initWithConsent() {
  seedConsent(true);
  await ensurePostHog();
  expect(mocks.init).toHaveBeenCalledTimes(1);
}

function capturedEvents(): string[] {
  return mocks.capture.mock.calls.map((call) => call[0] as string);
}

function payloadOf(event: string): Record<string, unknown> {
  const call = mocks.capture.mock.calls.find((c) => c[0] === event);
  return (call?.[1] ?? {}) as Record<string, unknown>;
}

beforeEach(() => {
  window.localStorage.clear();
  try {
    sessionStorage.clear();
  } catch {
    // noop
  }
  resetPostHogForTests();
  resetProIdentityForTests();
  resetProSessionForTests();
  resetProAttributionForTests();
  supabaseMocks.firstCount = 1;
  Object.values(mocks).forEach((fn) => fn.mockClear());
});

describe('FASE 1B — identidad con consentimiento', () => {
  it('1. login con consentimiento identifica con UUID y emite login_completed', async () => {
    await initWithConsent();
    captureLoginCompleted(UUID_A, 'email');
    expect(mocks.identify).toHaveBeenCalledTimes(1);
    expect(mocks.identify).toHaveBeenCalledWith(UUID_A);
    expect(capturedEvents()).toContain('login_completed');
    expect(payloadOf('login_completed')).toMatchObject({ product_area: 'pro', auth_method: 'email' });
  });

  it('2. registro con sesión identifica y emite sign_up_completed', async () => {
    await initWithConsent();
    captureSignUpStarted('email');
    expect(capturedEvents()).toContain('sign_up_started');
    const ok = captureSignUpCompleted(UUID_A, 'email');
    expect(ok).toBe(true);
    expect(mocks.identify).toHaveBeenCalledWith(UUID_A);
    expect(capturedEvents()).toContain('sign_up_completed');
  });

  it('3. restauración de sesión: identify idempotente (una sola vez)', async () => {
    await initWithConsent();
    expect(identifyProUser(UUID_A)).toBe(true);
    expect(identifyProUser(UUID_A)).toBe(true);
    expect(identifyProUser(UUID_A)).toBe(true);
    expect(mocks.identify).toHaveBeenCalledTimes(1);
  });

  it('4. sin consentimiento no hay identify ni eventos', async () => {
    seedConsent(false);
    expect(identifyProUser(UUID_A)).toBe(false);
    captureLoginCompleted(UUID_A, 'email');
    captureSignUpCompleted(UUID_A, 'email');
    captureSignUpStarted('email');
    expect(mocks.identify).not.toHaveBeenCalled();
    expect(mocks.capture).not.toHaveBeenCalled();
    expect(mocks.init).not.toHaveBeenCalled();
  });

  it('5. reset al cerrar sesión, una sola vez (logout + SIGNED_OUT)', async () => {
    await initWithConsent();
    identifyProUser(UUID_A);
    resetProIdentity(); // logout()
    resetProIdentity(); // SIGNED_OUT posterior: no-op
    expect(mocks.reset).toHaveBeenCalledTimes(1);
  });

  it('5b. reset sin identidad establecida es no-op (transición de carga)', async () => {
    await initWithConsent();
    resetProIdentity();
    expect(mocks.reset).not.toHaveBeenCalled();
  });

  it('6. cambio de cuenta sin logout: reset + identify nuevo, sin contaminación', async () => {
    await initWithConsent();
    identifyProUser(UUID_A);
    captureLoginCompleted(UUID_A, 'email');
    identifyProUser(UUID_B);
    expect(mocks.reset).toHaveBeenCalledTimes(1);
    expect(mocks.identify).toHaveBeenCalledTimes(2);
    expect(mocks.identify).toHaveBeenLastCalledWith(UUID_B);
  });

  it('12. fallo de PostHog no bloquea el flujo de negocio', async () => {
    await initWithConsent();
    mocks.capture.mockImplementation(() => {
      throw new Error('posthog down');
    });
    mocks.identify.mockImplementation(() => {
      throw new Error('posthog down');
    });
    expect(() => captureLoginCompleted(UUID_A, 'email')).not.toThrow();
    expect(() => captureCaseTaskCreated(UUID_A)).not.toThrow();
    expect(() => trackProSessionReturn(UUID_A)).not.toThrow();
    expect(() => resetProIdentity()).not.toThrow();
  });
});

describe('FASE 1C/E — catálogo canónico y primera vez', () => {
  it('7. sign_up_completed se mide una sola vez por usuario', async () => {
    await initWithConsent();
    expect(captureSignUpCompleted(UUID_A, 'email')).toBe(true);
    expect(captureSignUpCompleted(UUID_A, 'email')).toBe(false);
    expect(capturedEvents().filter((e) => e === 'sign_up_completed')).toHaveLength(1);
  });

  it('7b. email_verification_completed y onboarding_completed son primera vez', async () => {
    await initWithConsent();
    expect(captureEmailVerificationCompleted(UUID_A, 'email')).toBe(true);
    expect(captureEmailVerificationCompleted(UUID_A, 'email')).toBe(false);
    expect(captureOnboardingCompleted(UUID_A)).toBe(true);
    expect(captureOnboardingCompleted(UUID_A)).toBe(false);
  });

  it('8. primer caso: sin consentimiento no se marca ni se pierde (reintenta)', async () => {
    seedConsent(false);
    await trackFirstCaseIfNeeded(UUID_A, 'lawyer_direct');
    expect(mocks.capture).not.toHaveBeenCalled();
    // Con consentimiento y conteo aún en 1, el evento sí viaja.
    await initWithConsent();
    await trackFirstCaseIfNeeded(UUID_A, 'lawyer_direct');
    expect(capturedEvents()).toContain('first_case_created');
  });

  it('8b. primer caso: con conteo >1 se sella sin emitir', async () => {
    await initWithConsent();
    supabaseMocks.firstCount = 3;
    await trackFirstCaseIfNeeded(UUID_A, 'lawyer_direct');
    expect(mocks.capture).not.toHaveBeenCalled();
  });

  it('9. tarea creada y completada son eventos separados', async () => {
    await initWithConsent();
    captureCaseTaskCreated(UUID_A);
    captureCaseTaskCreated(UUID_A);
    captureCaseTaskCompleted(UUID_A);
    expect(capturedEvents().filter((e) => e === 'case_task_created')).toHaveLength(2);
    expect(capturedEvents().filter((e) => e === 'case_task_completed')).toHaveLength(1);
  });

  it('10. documento subido e IA usada emiten tras éxito; IA solo la primera', async () => {
    await initWithConsent();
    captureCaseDocumentUploaded(UUID_A);
    captureCaseDocumentUploaded(UUID_A);
    expect(capturedEvents().filter((e) => e === 'case_document_uploaded')).toHaveLength(2);
    expect(captureCaseAiUsed(UUID_A)).toBe(true);
    expect(captureCaseAiUsed(UUID_A)).toBe(false);
    expect(capturedEvents().filter((e) => e === 'case_ai_used')).toHaveLength(1);
  });

  it('primera próxima gestión: una sola vez por usuario', async () => {
    await initWithConsent();
    expect(captureCaseNextActionAdded(UUID_A)).toBe(true);
    expect(captureCaseNextActionAdded(UUID_A)).toBe(false);
  });

  it('14. ningún payload canónico contiene PII (por construcción + strip)', async () => {
    await initWithConsent();
    captureProEntryAttribution('?utm_source=email&utm_medium=outbound');
    captureLoginCompleted(UUID_A, 'email');
    captureSignUpCompleted(UUID_B, 'google');
    captureCaseTaskCreated(UUID_A);
    for (const event of ['login_completed', 'sign_up_completed', 'case_task_created']) {
      const payload = payloadOf(event);
      const serialized = JSON.stringify(payload);
      // Nunca identificadores personales ni contenido jurídico.
      expect(serialized).not.toMatch(/@|rut|phone|prompt|document_|client_name|file_name/i);
      // Solo claves allowlist + product_area + atribución.
      for (const key of Object.keys(payload)) {
        expect([
          'product_area', 'auth_method', 'entry_point', 'is_first',
          'plan_code', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content',
        ]).toContain(key);
      }
    }
    // El identificador usado es el UUID interno, nunca el email.
    expect(mocks.identify).toHaveBeenCalledWith(UUID_A);
    expect(mocks.identify).toHaveBeenCalledWith(UUID_B);
    for (const call of mocks.identify.mock.calls) {
      expect(String(call[0])).not.toContain('@');
    }
  });
});

describe('FASE 1E — retorno 24h', () => {
  it('13. no dispara en cada render: primera sesión no es retorno', async () => {
    await initWithConsent();
    expect(trackProSessionReturn(UUID_A)).toBe(false);
    expect(trackProSessionReturn(UUID_A)).toBe(false);
    expect(capturedEvents()).not.toContain('pro_session_returned');
  });

  it('13b. dispara tras >=24h desde la última sesión medida', async () => {
    await initWithConsent();
    expect(trackProSessionReturn(UUID_A)).toBe(false);
    // Simula última sesión hace 25h.
    window.localStorage.setItem(
      `pro_last_session:${UUID_A}`,
      String(Date.now() - (SESSION_RETURN_MIN_INTERVAL_MS + 3_600_000)),
    );
    expect(trackProSessionReturn(UUID_A)).toBe(true);
    expect(capturedEvents().filter((e) => e === 'pro_session_returned')).toHaveLength(1);
    // Y no repite en la misma sesión.
    expect(trackProSessionReturn(UUID_A)).toBe(false);
  });

  it('13c. sin consentimiento no persiste ni emite retorno', () => {
    seedConsent(false);
    expect(trackProSessionReturn(UUID_A)).toBe(false);
    expect(window.localStorage.getItem(`pro_last_session:${UUID_A}`)).toBeNull();
    expect(mocks.capture).not.toHaveBeenCalled();
  });
});

describe('FASE 1D — atribución UTM', () => {
  it('11. captura UTM válidos de la URL', () => {
    const attribution = captureProEntryAttribution(
      '?utm_source=email&utm_medium=outbound&utm_campaign=pro_validation_oct_2026&utm_content=hero',
    );
    expect(attribution).toMatchObject({
      utm_source: 'email',
      utm_medium: 'outbound',
      utm_campaign: 'pro_validation_oct_2026',
      utm_content: 'hero',
    });
    expect(getProAttribution()).toMatchObject({ utm_source: 'email' });
  });

  it('11b. trunca valores largos y descarta malformados', () => {
    const long = `?utm_source=${'x'.repeat(500)}&utm_medium=%00%1F&unknown_param=evil&other=1`;
    const attribution = captureProEntryAttribution(long);
    expect(attribution.utm_source).toHaveLength(128);
    expect(attribution.utm_medium).toBeUndefined();
    expect(attribution).not.toHaveProperty('unknown_param');
    expect(attribution).not.toHaveProperty('other');
  });

  it('11c. sin consentimiento no hay espejo en sessionStorage (pérdida documentada)', () => {
    seedConsent(false);
    captureProEntryAttribution('?utm_source=email&utm_medium=outbound');
    let stored: string | null = null;
    try {
      stored = sessionStorage.getItem('legalup_pro_attribution');
    } catch {
      stored = null;
    }
    expect(stored).toBeNull();
    // ...pero la memoria de la carga actual sí vale para el evento inmediato.
    expect(getProAttributionProps()).toEqual({});
  });

  it('11e. logout limpia la atribución: la cuenta siguiente no hereda UTM', async () => {
    await initWithConsent();
    captureProEntryAttribution('?utm_source=email&utm_medium=outbound&utm_campaign=pro_validation_oct_2026');
    identifyProUser(UUID_A);
    resetProIdentity(); // logout de A
    expect(getProAttribution()).toEqual({});
    let stored: string | null = 'present';
    try {
      stored = sessionStorage.getItem('legalup_pro_attribution');
    } catch {
      stored = null;
    }
    expect(stored).toBeNull();
    // B se registra en la misma pestaña: sin UTM heredados.
    captureLoginCompleted(UUID_B, 'email');
    expect(payloadOf('login_completed')).not.toHaveProperty('utm_source');
  });

  it('11f. cambio de cuenta sin logout limpia la atribución', async () => {
    await initWithConsent();
    captureProEntryAttribution('?utm_source=email&utm_medium=outbound');
    identifyProUser(UUID_A);
    identifyProUser(UUID_B); // switch
    expect(getProAttribution()).toEqual({});
    expect(mocks.reset).toHaveBeenCalledTimes(1);
  });

  it('11d. con consentimiento espeja en sesión y registra super-props', async () => {
    await initWithConsent();
    captureProEntryAttribution('?utm_source=linkedin&utm_medium=organic&utm_campaign=pro_validation_oct_2026');
    let stored: string | null = null;
    try {
      stored = sessionStorage.getItem('legalup_pro_attribution');
    } catch {
      stored = null;
    }
    expect(stored).toContain('linkedin');
    registerProAttribution();
    expect(mocks.register).toHaveBeenCalledWith(
      expect.objectContaining({ utm_source: 'linkedin' }),
    );
    // Y viajan en los eventos canónicos.
    captureLoginCompleted(UUID_A, 'email');
    expect(payloadOf('login_completed')).toMatchObject({ utm_source: 'linkedin' });
  });
});
