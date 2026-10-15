/**
 * FASE 5.6 — constantes únicas de consentimiento legal.
 * Versiones estables; cambiarlas solo ante actualización material de textos.
 */
export const CURRENT_TERMS_VERSION = '2026-10-06';
export const CURRENT_PRIVACY_VERSION = '2026-10-06';

export const TERMS_PATH = '/terminos';
export const PRIVACY_PATH = '/privacidad';

export const CONSENT_ERROR =
  'Debes aceptar los Términos y Condiciones y declarar que leíste la Política de Privacidad para crear tu cuenta.';

export type LegalConsentState = {
  terms_accepted_at: string | null;
  terms_version: string | null;
  privacy_acknowledged_at: string | null;
  privacy_version: string | null;
};

export function hasLegalConsent(profile: Partial<LegalConsentState> | null | undefined): boolean {
  return !!profile?.terms_accepted_at && !!profile?.privacy_acknowledged_at;
}

/**
 * Consentimiento vigente: con evidencia Y versiones actuales. Un historial
 * con versiones obsoletas no cuenta como vigente (los textos cambiaron).
 */
export function hasCurrentLegalConsent(
  profile: Partial<LegalConsentState> | null | undefined,
): boolean {
  return (
    hasLegalConsent(profile) &&
    profile?.terms_version === CURRENT_TERMS_VERSION &&
    profile?.privacy_version === CURRENT_PRIVACY_VERSION
  );
}

/** Destino interno seguro post-consentimiento (default: raíz). */
export function sanitizeRedirectForConsent(raw: string | null | undefined): string {
  if (!raw) return '/';
  let path = raw.trim();
  try {
    path = decodeURIComponent(path);
  } catch {
    return '/';
  }
  if (!path.startsWith('/') || path.startsWith('//')) return '/';
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(path)) return '/';
  return path;
}

export function buildConsentPatch(nowIso = new Date().toISOString()): LegalConsentState {
  return {
    terms_accepted_at: nowIso,
    terms_version: CURRENT_TERMS_VERSION,
    privacy_acknowledged_at: nowIso,
    privacy_version: CURRENT_PRIVACY_VERSION,
  };
}

/**
 * Instantánea de la aceptación marcada en el modal de registro (mismo acto
 * del usuario: checkbox + continuar con Google).
 */
export type PendingConsentSnapshot = {
  acceptedAt: string;
  termsVersion: string;
  privacyVersion: string;
};

export function buildPendingConsentSnapshot(nowIso = new Date().toISOString()): PendingConsentSnapshot {
  return {
    acceptedAt: nowIso,
    termsVersion: CURRENT_TERMS_VERSION,
    privacyVersion: CURRENT_PRIVACY_VERSION,
  };
}

/**
 * Puente modal→callback para la aceptación explícita durante la redirección
 * OAuth. Misma razón que el redirect post-auth, pero con evidencia: el SDK
 * (`signInWithOAuth`) descarta `options.data`, así que `user_metadata` NO
 * sirve como puente (verificado en @supabase/auth-js). Se guarda en el mismo
 * origen (localStorage): sobrevive al redirect de Google y el callback lo
 * consume una sola vez.
 */
const PENDING_CONSENT_KEY = 'legalup_pending_consent';
/** Ventana para completar el roundtrip OAuth (un registro real toma ~1-2 min). */
const PENDING_CONSENT_TTL_MS = 15 * 60 * 1000;

/**
 * Ventana de vinculación aceptación→intento: la cuenta debe haberse creado
 * junto a la aceptación. Fuera de ella, el puente no aporta evidencia
 * (registro abandonado + login posterior, otra cuenta, reloj disparado).
 */
export const BIND_CONSENT_WINDOW_MS = 30 * 60 * 1000;

export function storePendingConsent(snapshot: PendingConsentSnapshot): void {
  try {
    window.localStorage.setItem(PENDING_CONSENT_KEY, JSON.stringify(snapshot));
  } catch {
    /* storage no disponible: el callback pedirá el interstitial */
  }
}

/**
 * Lee y elimina el puente (un solo uso). Devuelve el patch transcribible
 * solo si la forma es válida, las versiones están vigentes y no expiró;
 * en cualquier otro caso devuelve null (→ interstitial) y limpia.
 */
export function consumePendingConsent(nowMs = Date.now()): LegalConsentState | null {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(PENDING_CONSENT_KEY);
    window.localStorage.removeItem(PENDING_CONSENT_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as {
      acceptedAt?: unknown;
      termsVersion?: unknown;
      privacyVersion?: unknown;
    };
    if (parsed.termsVersion !== CURRENT_TERMS_VERSION) return null;
    if (parsed.privacyVersion !== CURRENT_PRIVACY_VERSION) return null;
    const acceptedMs = Date.parse(String(parsed.acceptedAt ?? ''));
    if (Number.isNaN(acceptedMs) || acceptedMs > nowMs + 60 * 1000) return null;
    if (nowMs - acceptedMs > PENDING_CONSENT_TTL_MS) return null;
    const acceptedAt = new Date(acceptedMs).toISOString();
    const patch: LegalConsentState = {
      terms_accepted_at: acceptedAt,
      terms_version: CURRENT_TERMS_VERSION,
      privacy_acknowledged_at: acceptedAt,
      privacy_version: CURRENT_PRIVACY_VERSION,
    };
    if (!hasLegalConsent(patch)) return null;
    return patch;
  } catch {
    return null;
  }
}
