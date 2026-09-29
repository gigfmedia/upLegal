/**
 * Cookie Consent — modelo centralizado de LegalUp.
 *
 * - `necessary` siempre es `true` y no es editable (auth Supabase, sesión,
 *   seguridad y preferencias técnicas imprescindibles siguen funcionando).
 * - `analytics` / `marketing` / `preferences` son opcionales y arrancan en
 *   `false`. Ningún tracker opcional debe inicializarse sin su consentimiento.
 * - Persistencia en `localStorage` bajo `legalup_cookie_consent`, sin datos
 *   personales adicionales.
 * - `CONSENT_VERSION = "1"`: un stored con versión distinta se considera
 *   pendiente (se vuelve a mostrar el banner).
 *
 * Este módulo es lógica pura + storage con guards de browser
 * (`typeof window/localStorage !== "undefined"`) para no romper tests/build.
 */

export const CONSENT_STORAGE_KEY = 'legalup_cookie_consent' as const;
export const CONSENT_VERSION = '1' as const;

export type CookieConsentPreferences = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
};

export type StoredCookieConsent = CookieConsentPreferences & {
  version: string;
  timestamp: string;
};

export const DEFAULT_CONSENT: CookieConsentPreferences = {
  necessary: true,
  analytics: false,
  marketing: false,
  preferences: false,
};

export const ACCEPT_ALL_CONSENT: CookieConsentPreferences = {
  necessary: true,
  analytics: true,
  marketing: true,
  preferences: true,
};

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function safeStorage(): Storage | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Lee el consentimiento guardado. `null` = sin decisión o versión obsoleta. */
export function getStoredConsent(): StoredCookieConsent | null {
  const storage = safeStorage();
  if (!storage) return null;
  let raw: string | null = null;
  try {
    raw = storage.getItem(CONSENT_STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredCookieConsent>;
    if (parsed.version !== CONSENT_VERSION) return null;
    return {
      version: CONSENT_VERSION,
      necessary: true,
      analytics: parsed.analytics === true,
      marketing: parsed.marketing === true,
      preferences: parsed.preferences === true,
      timestamp: typeof parsed.timestamp === 'string' ? parsed.timestamp : '',
    };
  } catch {
    return null;
  }
}

/** Normaliza preferencias parciales: `necessary` siempre true. */
export function normalizePreferences(
  input: Partial<CookieConsentPreferences>,
): CookieConsentPreferences {
  return {
    necessary: true,
    analytics: input.analytics === true,
    marketing: input.marketing === true,
    preferences: input.preferences === true,
  };
}

export function saveConsent(prefs: Partial<CookieConsentPreferences>): StoredCookieConsent {
  const normalized = normalizePreferences(prefs);
  const stored: StoredCookieConsent = {
    ...normalized,
    version: CONSENT_VERSION,
    timestamp: new Date().toISOString(),
  };
  const storage = safeStorage();
  if (storage) {
    try {
      storage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(stored));
    } catch {
      // storage lleno/bloqueado: el estado en memoria sigue valiendo
    }
  }
  notifyConsentListeners(stored);
  return stored;
}

export function hasDecidedConsent(): boolean {
  return getStoredConsent() !== null;
}

export function hasAnalyticsConsent(): boolean {
  return getStoredConsent()?.analytics === true;
}

export function hasMarketingConsent(): boolean {
  return getStoredConsent()?.marketing === true;
}

// --- listeners same-tab (storage event solo dispara cross-tab) ---
type ConsentListener = (consent: StoredCookieConsent) => void;
const listeners = new Set<ConsentListener>();

export function subscribeConsent(listener: ConsentListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyConsentListeners(stored: StoredCookieConsent): void {
  listeners.forEach((listener) => {
    try {
      listener(stored);
    } catch {
      // un listener nunca debe romper el guardado
    }
  });
}

if (isBrowser()) {
  try {
    window.addEventListener('storage', (event) => {
      if (event.key !== CONSENT_STORAGE_KEY) return;
      const current = getStoredConsent();
      if (current) notifyConsentListeners(current);
    });
  } catch {
    // entorno sin addEventListener: noop
  }
}

/**
 * Abre el modal de preferencias desde cualquier lugar (footer, /cookies)
 * sin acoplarse al contexto React.
 */
export function openCookiePreferences(): void {
  if (!isBrowser()) return;
  try {
    window.dispatchEvent(new CustomEvent('legalup:open-cookie-preferences'));
  } catch {
    // noop
  }
}
