/**
 * FASE 1B/C/E — Catálogo canónico de eventos Pro + identidad PostHog.
 *
 * REGLAS:
 * - Todo pasa por el facade `posthogLoader` (gate de consentimiento): sin
 *   `analytics === true` las llamadas se descartan, nunca se encolan.
 * - Identidad = UUID interno de Supabase Auth. NUNCA email/RUT/nombre/
 *   teléfono ni datos jurídicos como identificador.
 * - `identifyProUser` es idempotente (memoria de última identidad); ante
 *   cambio de cuenta hace `reset()` antes de identificar.
 * - `resetProIdentity` solo actúa si hay identidad establecida (evita doble
 *   reset logout + SIGNED_OUT y resets en transiciones de carga).
 * - Marcas de "primera vez" en localStorage SOLO cuando hay consentimiento
 *   y el evento se despachó: sin consent no se marca (reintenta más tarde),
 *   nunca se usan para bypassear el gate.
 * - PII guard: las props con claves sensibles se eliminan antes de enviar.
 * - Ningún helper lanza: la instrumentación jamás bloquea negocio.
 *
 * COMPAT (eventos existentes que se reutilizan, no se renombran):
 * - `pro_landing_viewed` (LegalUpPro) = vista real de /pro.
 * - `pro_landing_cta_clicked` + `pro_free_cta_clicked` + `pro_paid_cta_clicked`
 *   = señal canónica de CTA (no se crea un 4º evento).
 * - `first_case_created` (activationAnalytics) = primer caso.
 * - `pro_paywall_opened`, `pro_subscribe_clicked`, `pro_checkout_started`
 *   (ProPricingModal) = paywall/checkout frontend.
 * - `pro_subscription_activated` (backend webhook) = suscripción + pago
 *   confirmado para Pro (el provider confirma compromiso y cobro; el
 *   frontend no puede confirmar pagos: no se duplica desde cliente).
 */
import { posthog } from './posthogLoader';
import { getStoredConsent } from './cookieConsent';
import { getProAttributionProps, registerProAttribution, clearProAttribution } from './proAttribution';

export const PRO_PRODUCT_AREA = 'pro' as const;
/** Ventana para distinguir registro reciente de login en el callback. */
export const SIGNUP_ATTRIBUTION_WINDOW_DAYS = 7;
/** Retorno = sesión autenticada a >=24h de la última sesión medida. */
export const SESSION_RETURN_MIN_INTERVAL_MS = 24 * 60 * 60 * 1000;

export type ProAuthMethod = 'email' | 'google' | 'unknown';
export type ProEntryPoint = 'pro_landing' | 'dashboard' | 'case_drawer' | 'unknown';

// --- PII guard ---------------------------------------------------------------
const PII_KEYS = new Set([
  'email', 'user_email', 'rut', 'phone', 'user_phone', 'name',
  'first_name', 'last_name', 'display_name', 'address', 'description',
  'problem_description', 'prompt', 'prompt_text', 'ai_response',
  'document_text', 'document_name', 'file_name', 'client_name',
  'case_title', 'cause_name',
]);

function stripPII(props: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    if (PII_KEYS.has(k)) continue;
    out[k] = v;
  }
  return out;
}

function hasAnalyticsConsent(): boolean {
  try {
    return getStoredConsent()?.analytics === true;
  } catch {
    return false;
  }
}

// --- Identidad ---------------------------------------------------------------
let lastIdentifiedUserId: string | null = null;

/**
 * Identifica al usuario con su UUID de Supabase Auth. Idempotente.
 * Retorna true si la identidad quedó establecida (o ya lo estaba).
 */
export function identifyProUser(userId: string | null | undefined): boolean {
  if (!userId) return false;
  if (!hasAnalyticsConsent()) return false;
  if (lastIdentifiedUserId === userId) return true;
  try {
    if (lastIdentifiedUserId !== null) {
      // Cambio de cuenta sin logout intermedio: limpiar identidad y
      // atribución antes de identificar (los UTM de A no son de B).
      posthog.reset();
      clearProAttribution();
    }
    posthog.identify(userId);
  } catch {
    return false;
  }
  lastIdentifiedUserId = userId;
  return true;
}

/** Limpia la identidad (logout). No-op si no hay identidad establecida. */
export function resetProIdentity(): void {
  if (lastIdentifiedUserId === null) return;
  try {
    posthog.reset();
  } catch {
    // noop
  }
  // La atribución de la sesión anterior no debe sobrevivir al logout.
  try {
    clearProAttribution();
  } catch {
    // noop
  }
  lastIdentifiedUserId = null;
}

/** Solo para tests. */
export function resetProIdentityForTests(): void {
  lastIdentifiedUserId = null;
}

/** Solo para tests: expone la identidad en memoria. */
export function getLastIdentifiedUserIdForTests(): string | null {
  return lastIdentifiedUserId;
}

// --- Marcas de primera vez (consent-gated) ------------------------------------
function markKey(name: string, userId: string): string {
  return `pro_analytics_fired:${name}:${userId}`;
}

function hasMark(name: string, userId: string): boolean {
  try {
    return localStorage.getItem(markKey(name, userId)) === '1';
  } catch {
    return false;
  }
}

function setMark(name: string, userId: string): void {
  try {
    localStorage.setItem(markKey(name, userId), '1');
  } catch {
    // storage bloqueado: el evento ya viajó; posible re-disparo futuro
  }
}

// --- Emisión base ---------------------------------------------------------------
function emitPro(event: string, props: Record<string, unknown> = {}): void {
  try {
    posthog.capture(event, {
      product_area: PRO_PRODUCT_AREA,
      ...stripPII(props),
      ...getProAttributionProps(),
    });
  } catch {
    // noop
  }
}

/** Emite un evento "primera vez" por usuario: solo con consentimiento + marca. */
function emitFirstTime(event: string, userId: string, props: Record<string, unknown> = {}): boolean {
  if (!userId || !hasAnalyticsConsent() || hasMark(event, userId)) return false;
  emitPro(event, { ...props, is_first: true });
  setMark(event, userId);
  return true;
}

// --- Catálogo canónico ------------------------------------------------------------
export function captureSignUpStarted(authMethod: ProAuthMethod, entryPoint: ProEntryPoint = 'pro_landing'): void {
  emitPro('sign_up_started', { auth_method: authMethod, entry_point: entryPoint });
}

export function captureSignUpCompleted(
  userId: string,
  authMethod: ProAuthMethod,
  entryPoint: ProEntryPoint = 'pro_landing',
): boolean {
  if (!identifyProUser(userId)) {
    // Sin consentimiento o sin identidad: no hay evento que despachar y no
    // se marca (reintentará cuando el callback observe la sesión con consent).
    return false;
  }
  registerProAttribution();
  return emitFirstTime('sign_up_completed', userId, { auth_method: authMethod, entry_point: entryPoint });
}

export function captureLoginCompleted(
  userId: string,
  authMethod: ProAuthMethod,
  entryPoint: ProEntryPoint = 'unknown',
): void {
  if (!identifyProUser(userId)) return;
  registerProAttribution();
  emitPro('login_completed', { auth_method: authMethod, entry_point: entryPoint });
}

export function captureEmailVerificationCompleted(userId: string, authMethod: ProAuthMethod = 'unknown'): boolean {
  if (!identifyProUser(userId)) return false;
  return emitFirstTime('email_verification_completed', userId, { auth_method: authMethod });
}

export function captureOnboardingCompleted(userId: string): boolean {
  if (!identifyProUser(userId)) return false;
  return emitFirstTime('onboarding_completed', userId, {});
}

export function captureCaseNextActionAdded(userId: string, entryPoint: ProEntryPoint = 'unknown'): boolean {
  if (!identifyProUser(userId)) return false;
  return emitFirstTime('case_next_action_added', userId, { entry_point: entryPoint });
}

export function captureCaseTaskCreated(userId: string): void {
  if (!identifyProUser(userId)) return;
  emitPro('case_task_created', {});
}

export function captureCaseTaskCompleted(userId: string): void {
  if (!identifyProUser(userId)) return;
  emitPro('case_task_completed', {});
}

export function captureCaseDocumentUploaded(userId: string): void {
  if (!identifyProUser(userId)) return;
  emitPro('case_document_uploaded', {});
}

export function captureCaseAiUsed(userId: string): boolean {
  if (!identifyProUser(userId)) return false;
  return emitFirstTime('case_ai_used', userId, {});
}

// --- Retorno ----------------------------------------------------------------------
function lastSessionKey(userId: string): string {
  return `pro_last_session:${userId}`;
}

/**
 * Registra sesión autenticada y emite `pro_session_returned` si pasaron
 * >=24h desde la última sesión medida. Solo persiste timestamp con
 * consentimiento. No llamar en cada render: usar en establecimiento de
 * sesión (boot, login, visibilidad), nunca en intervalos de polling.
 */
export function trackProSessionReturn(userId: string): boolean {
  if (!userId || !hasAnalyticsConsent()) return false;
  let last: number | null = null;
  try {
    const raw = localStorage.getItem(lastSessionKey(userId));
    last = raw ? Number(raw) : null;
  } catch {
    last = null;
  }
  const now = Date.now();
  let returned = false;
  if (last !== null && !Number.isNaN(last) && now - last >= SESSION_RETURN_MIN_INTERVAL_MS) {
    emitPro('pro_session_returned', {});
    returned = true;
  }
  try {
    localStorage.setItem(lastSessionKey(userId), String(now));
  } catch {
    // noop
  }
  return returned;
}

/** Solo para tests. */
export function resetProSessionForTests(): void {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('pro_analytics_fired:') || k.startsWith('pro_last_session:'))) {
        localStorage.removeItem(k);
      }
    }
  } catch {
    // noop
  }
}
