import type { PostHog } from 'posthog-js';
import { getStoredConsent } from './cookieConsent';

const posthogKey = import.meta.env.VITE_POSTHOG_KEY || 'phc_CSTbdRjVd5ffcXTJNXS8ZgNtfir4AA3TzU2CTrpvU73C';
const posthogHost = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

let posthogInstance: PostHog | null = null;
let loadPromise: Promise<PostHog> | null = null;

// Cola acotada al vuelo de init: solo acumula llamadas hechas CON
// consentimiento analytics vigente (entre loadPostHog() y su init).
// Sin consentimiento, las llamadas se descartan (nunca se encolan ni se
// reproducen después). Sin replay de eventos pre-consentimiento.
const pendingCalls: Array<() => void> = [];

/** `true` solo si el usuario otorgó consentimiento analytics (versión válida). */
const hasAnalyticsConsent = (): boolean => {
  try {
    return getStoredConsent()?.analytics === true;
  } catch {
    return false;
  }
};

export const loadPostHog = (): Promise<PostHog> => {
  if (loadPromise) return loadPromise;

  loadPromise = import('posthog-js')
    .then((mod) => {
      const posthog = mod.default;
      posthog.init(posthogKey, {
        api_host: posthogHost,
        defaults: '2026-01-30',
        person_profiles: 'identified_only',
      });
      posthogInstance = posthog;
      const queued = pendingCalls.splice(0, pendingCalls.length);
      queued.forEach((call) => {
        try {
          call();
        } catch {
          // noop — nunca dejar que la cola rompa el flujo
        }
      });
      return posthog;
    })
    .catch((err) => {
      loadPromise = null;
      throw err;
    });

  return loadPromise;
};

const runWhenReady = (call: (posthog: PostHog) => void): void => {
  if (posthogInstance) {
    try {
      call(posthogInstance);
    } catch {
      // noop
    }
    return;
  }
  // Sin consentimiento analytics: descartar, NO encolar. Los eventos
  // pre-consentimiento no deben conservarse para un replay posterior.
  if (!hasAnalyticsConsent()) return;
  pendingCalls.push(() => {
    try {
      if (posthogInstance) call(posthogInstance);
    } catch {
      // noop
    }
  });
};

export const getPostHogInstance = (): PostHog | null => posthogInstance;

/**
 * Vacía la cola de vuelo (se usa al revocar opcionales: nada pendiente debe
 * viajar sin consentimiento vigente).
 */
export const dropPendingCalls = (): void => {
  pendingCalls.splice(0, pendingCalls.length);
};

/** Solo para tests: resetea el singleton y la cola. */
export const resetPostHogForTests = (): void => {
  posthogInstance = null;
  loadPromise = null;
  pendingCalls.splice(0, pendingCalls.length);
};

// Facade con gate de consentimiento: sin `analytics === true` las llamadas
// se descartan (sin cola ni replay). Con consentimiento, los métodos se
// encolan solo durante el vuelo de init y luego van directo a la instancia,
// así la captura comienza desde el momento del consentimiento.
export const posthog = {
  register: (properties: Record<string, unknown>): void => {
    runWhenReady((ph) => ph.register(properties));
  },
  capture: (event_name: string, properties?: Record<string, unknown>): void => {
    runWhenReady((ph) => ph.capture(event_name, properties));
  },
  startSessionRecording: (): void => {
    runWhenReady((ph) => ph.startSessionRecording());
  },
  get_distinct_id: (): string | null => posthogInstance?.get_distinct_id() ?? null,
};