/**
 * FASE 1D — Atribución UTM para LegalUp Pro.
 *
 * - Lee solo `utm_source`, `utm_medium`, `utm_campaign`, `utm_content` al
 *   entrar a `/pro`. Nunca guarda URLs completas, query strings arbitrarias
 *   ni parámetros desconocidos. Valores truncados a 128 chars.
 * - Memoria en módulo siempre; espejo en `sessionStorage` SOLO con
 *   consentimiento analytics vigente (sin storage persistente pre-consent).
 * - Los UTM solo viajan a PostHog con consentimiento (vía facade, que
 *   además los descarta sin él). Sin consentimiento la atribución puede
 *   perderse entre recargas: constancia técnica, no bypass.
 * - Nunca se escriben UTM al perfil público ni a tablas de negocio.
 *
 * Convención de campañas futuras:
 * - `?utm_source=email&utm_medium=outbound&utm_campaign=pro_validation_oct_2026`
 * - `?utm_source=linkedin&utm_medium=organic&utm_campaign=pro_validation_oct_2026`
 * - `?utm_source=reddit&utm_medium=organic&utm_campaign=pro_validation_oct_2026`
 */
import { posthog } from './posthogLoader';
import { getStoredConsent } from './cookieConsent';

export const PRO_UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'] as const;
export type ProUtmKey = (typeof PRO_UTM_KEYS)[number];
export type ProAttribution = Partial<Record<ProUtmKey, string>>;

const MAX_UTM_LENGTH = 128;
const SESSION_KEY = 'legalup_pro_attribution';

let memoryAttribution: ProAttribution = {};

function hasAnalyticsConsent(): boolean {
  try {
    return getStoredConsent()?.analytics === true;
  } catch {
    return false;
  }
}

function sanitizeUtmValue(raw: string | null): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Sin URLs ni control chars: solo texto corto.
  const clean = trimmed.replace(/[\u0000-\u001F\u007F]/g, '');
  if (!clean) return null;
  return clean.slice(0, MAX_UTM_LENGTH);
}

function readSessionMirror(): ProAttribution {
  if (!hasAnalyticsConsent()) return {};
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<Record<string, unknown>>;
    const out: ProAttribution = {};
    for (const key of PRO_UTM_KEYS) {
      const v = parsed[key];
      if (typeof v === 'string' && v) out[key] = v.slice(0, MAX_UTM_LENGTH);
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * Captura la atribución de la URL actual (llamar al montar `/pro`).
 * `search` es `window.location.search` (se inyecta por parámetro para tests).
 */
export function captureProEntryAttribution(search: string): ProAttribution {
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(search || '');
  } catch {
    return { ...memoryAttribution };
  }
  let changed = false;
  for (const key of PRO_UTM_KEYS) {
    const value = sanitizeUtmValue(params.get(key));
    if (value && memoryAttribution[key] !== value) {
      memoryAttribution[key] = value;
      changed = true;
    }
  }
  // Espejo de sesión solo con consentimiento vigente.
  if (changed && hasAnalyticsConsent()) {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(memoryAttribution));
    } catch {
      // storage bloqueado: la memoria sigue valiendo en esta carga
    }
  }
  return { ...memoryAttribution };
}

/** Atribución vigente (memoria + espejo de sesión si hay consentimiento). */
export function getProAttribution(): ProAttribution {
  return { ...readSessionMirror(), ...memoryAttribution };
}

/**
 * Registra la atribución como super-props de PostHog (viaja en todos los
 * eventos posteriores). Solo con consentimiento; via facade (no-op sin él).
 */
export function registerProAttribution(): void {
  const attribution = getProAttribution();
  if (Object.keys(attribution).length === 0) return;
  try {
    posthog.register({ ...attribution });
  } catch {
    // analytics nunca bloquea
  }
}

/** Props de atribución para adjuntar a un evento (vacío sin consentimiento). */
export function getProAttributionProps(): ProAttribution {
  if (!hasAnalyticsConsent()) return {};
  return getProAttribution();
}

/**
 * Limpia la atribución (logout / cambio de cuenta): la memoria de la pestaña
 * y el espejo de sesión. Sin esto, los UTM de una cuenta contaminarían los
 * eventos de la siguiente cuenta en la misma pestaña.
 */
export function clearProAttribution(): void {
  memoryAttribution = {};
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // noop
  }
}

/** Solo para tests. */
export function resetProAttributionForTests(): void {
  clearProAttribution();
}
