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
