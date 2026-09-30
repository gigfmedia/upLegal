/**
 * Gating real de trackers opcionales por consentimiento de cookies.
 *
 * - GA4 (gtag.js): solo se inyecta con `analytics === true`.
 * - PostHog: solo `init` con `analytics === true`.
 * - TikTok Pixel (único pixel browser encontrado en auditoría): solo con
 *   `marketing === true`.
 * - Meta CAPI y GA4 Measurement Protocol del backend (`server/metaCapi.mjs`,
 *   `sendGA4PurchaseEvent` en `server.mjs`) son server-side y se disparan por
 *   compras reales vía webhook — NO se gatean aquí. Ver TODO en /cookies y §J.
 *
 * Todos los helpers son no-op fuera del browser y nunca lanzan.
 */
import {
  CONSENT_VERSION,
  getStoredConsent,
} from './cookieConsent';
import { loadPostHog, getPostHogInstance } from './posthogLoader';

const GA_GTAG_SCRIPT = 'gtag/js';
const GA_MEASUREMENT_ID =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env
    ?.VITE_GA_MEASUREMENT_ID || 'G-ZJCG1RNJT6';

const TIKTOK_SDK_ID = 'D7J6UK3C77U32HD1GSC0';

let ga4Loaded = false;
let marketingLoaded = false;

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function callGtag(...args: unknown[]): void {
  try {
    const gtag = (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag;
    if (typeof gtag === 'function') gtag(...args);
  } catch {
    // noop
  }
}

function gtagScriptPresent(): boolean {
  if (!isBrowser()) return false;
  try {
    return Array.from(document.querySelectorAll('script')).some((s) =>
      (s.src || '').includes(GA_GTAG_SCRIPT),
    );
  } catch {
    return false;
  }
}

/**
 * Inicializa GA4 una sola vez. Descarta la cola pre-consentimiento del
 * dataLayer (eventos encolados por el stub de index.html antes de la
 * decisión) para no enviar nada previo al consentimiento.
 */
export function ensureGa4Loaded(): void {
  if (!isBrowser() || ga4Loaded) return;
  if (getStoredConsent()?.analytics !== true) return;
  try {
    const w = window as unknown as Record<string, unknown>;
    // Descarta eventos pre-consentimiento encolados en el stub.
    w.dataLayer = [];
    if (typeof w.gtag !== 'function') {
      w.gtag = function gtag(...args: unknown[]) {
        (w.dataLayer as unknown[]).push(args);
      };
    }
    // Habilita explícitamente (por si hubo un deny previo u owner-device).
    try {
      delete w[`ga-disable-${GA_MEASUREMENT_ID}`];
    } catch {
      // noop
    }
    if (!gtagScriptPresent()) {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
      document.head.appendChild(script);
    }
    callGtag('js', new Date());
    callGtag('consent', 'update', {
      ad_storage: 'granted',
      analytics_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
    });
    // Fuente única de page_view: el evento manual de GoogleAnalytics.tsx
    // (disparado post-Helmet con el título final). Se desactiva el page_view
    // automático de gtag/enhanced-measurement para no duplicar ni titular
    // con el shell. El resto de enhanced measurement (scroll, click…) intacto.
    callGtag('config', GA_MEASUREMENT_ID, { send_page_view: false });
    ga4Loaded = true;
  } catch {
    // analytics nunca debe romper la app
  }
}

/** Revoca GA4: niega storage y marca el flag de opt-out de gtag.js. */
export function disableGa4(): void {
  if (!isBrowser()) return;
  try {
    callGtag('consent', 'update', {
      ad_storage: 'denied',
      analytics_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
    (window as unknown as Record<string, unknown>)[`ga-disable-${GA_MEASUREMENT_ID}`] = true;
  } catch {
    // noop
  }
  ga4Loaded = false;
}

export function isGa4Loaded(): boolean {
  return ga4Loaded;
}

/** Inicializa PostHog solo con consentimiento analytics. Una sola vez. */
export function ensurePostHog(): Promise<unknown> | null {
  if (!isBrowser()) return null;
  if (getStoredConsent()?.analytics !== true) return null;
  try {
    return loadPostHog()
      .then((ph) => {
        try {
          // opt-in explícito por si hubo un opt-out previo (revocación).
          (ph as unknown as { opt_in_capturing?: () => void }).opt_in_capturing?.();
        } catch {
          // noop
        }
        return ph;
      })
      .catch(() => null);
  } catch {
    return null;
  }
}

/** Revoca PostHog: opt-out + detiene grabación si ya estaba inicializado. */
export function disablePostHog(): void {
  if (!isBrowser()) return;
  try {
    const instance = getPostHogInstance() as unknown as {
      opt_out_capturing?: () => void;
      stopSessionRecording?: () => void;
    } | null;
    instance?.opt_out_capturing?.();
    instance?.stopSessionRecording?.();
  } catch {
    // noop
  }
}

/** Carga TikTok Pixel solo con consentimiento marketing. Idempotente. */
export function ensureMarketingTrackers(): void {
  if (!isBrowser() || marketingLoaded) return;
  if (getStoredConsent()?.marketing !== true) return;
  try {
    const w = window as unknown as {
      ttq?: { load?: (id: string) => void; page?: () => void; loaded?: boolean };
    };
    // Avisa al loader diferido de index.html (stub ttq) por si aún no corrió.
    try {
      window.dispatchEvent(new Event('legalup:consent-marketing'));
    } catch {
      // noop
    }
    if (w.ttq && typeof w.ttq.load === 'function' && !w.ttq.loaded) {
      w.ttq.load(TIKTOK_SDK_ID);
      w.ttq.loaded = true;
      try {
        w.ttq.page?.();
      } catch {
        // noop
      }
    }
    marketingLoaded = true;
  } catch {
    // noop
  }
}

/**
 * Aplica el consentimiento a todos los trackers. Llamar en cada cambio de
 * preferencias (guardado inicial, modal, revocación).
 */
export function applyConsentToTrackers(): void {
  if (!isBrowser()) return;
  const stored = getStoredConsent();
  if (stored?.analytics === true) {
    ensureGa4Loaded();
    ensurePostHog();
  } else {
    disableGa4();
    disablePostHog();
  }
  if (stored?.marketing === true) {
    ensureMarketingTrackers();
  }
  // Sin "unload" real para TikTok: el SDK no expone descarga; al revocar
  // simplemente no se cargará de nuevo ni se dispararán page() futuros.
}

/**
 * Evento interno cookie_consent_updated. Solo se llama cuando analytics ya
 * está permitido (el contexto lo garantiza): nunca se envía pre-consent.
 */
export function fireConsentUpdatedEvent(prefs: {
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
}): void {
  if (!isBrowser()) return;
  try {
    void import('./posthogLoader').then(({ posthog }) => {
      try {
        posthog.capture('cookie_consent_updated', {
          analytics: prefs.analytics,
          marketing: prefs.marketing,
          preferences: prefs.preferences,
          consent_version: CONSENT_VERSION,
        });
      } catch {
        // noop
      }
    });
  } catch {
    // noop
  }
  try {
    callGtag('event', 'cookie_consent_updated', {
      analytics: prefs.analytics,
      marketing: prefs.marketing,
      preferences: prefs.preferences,
      consent_version: CONSENT_VERSION,
    });
  } catch {
    // noop
  }
}

/** Solo para tests: resetea flags de inicialización. */
export function resetTrackersForTests(): void {
  ga4Loaded = false;
  marketingLoaded = false;
}
