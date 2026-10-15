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
 * Aceptación marcada en el modal de registro, transmitida por OAuth dentro
 * de `user_metadata.terms_acceptance` (mismo canal que `data.role`, que el
 * trigger lee vía `raw_user_meta_data`). El checkbox del modal es compuerta
 * local: sin este puente, el post-OAuth no tiene evidencia y re-pregunta.
 *
 * Valida estrictamente: forma, versiones vigentes y fecha no futura. Lo que
 * no calza se ignora (→ interstitial) en vez de inventar evidencia.
 */
export type OAuthTermsAcceptance = {
  acceptedAt: unknown;
  termsVersion: unknown;
  privacyVersion: unknown;
};

export function getValidTranscribableAcceptance(metadata: unknown): LegalConsentState | null {
  const acceptance = (metadata as { terms_acceptance?: unknown } | null)?.terms_acceptance as
    | OAuthTermsAcceptance
    | null
    | undefined;
  if (!acceptance || typeof acceptance !== 'object') return null;
  if (
    acceptance.termsVersion !== CURRENT_TERMS_VERSION ||
    acceptance.privacyVersion !== CURRENT_PRIVACY_VERSION
  ) {
    return null;
  }
  const acceptedMs = Date.parse(String(acceptance.acceptedAt ?? ''));
  if (Number.isNaN(acceptedMs) || acceptedMs > Date.now() + 60 * 1000) return null;
  const acceptedAt = new Date(acceptedMs).toISOString();
  return {
    terms_accepted_at: acceptedAt,
    terms_version: CURRENT_TERMS_VERSION,
    privacy_acknowledged_at: acceptedAt,
    privacy_version: CURRENT_PRIVACY_VERSION,
  };
}
