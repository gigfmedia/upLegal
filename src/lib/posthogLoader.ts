import type { PostHog } from 'posthog-js';

const posthogKey = import.meta.env.VITE_POSTHOG_KEY || 'phc_CSTbdRjVd5ffcXTJNXS8ZgNtfir4AA3TzU2CTrpvU73C';
const posthogHost = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

let posthogInstance: PostHog | null = null;
let loadPromise: Promise<PostHog> | null = null;

const pendingCalls: Array<() => void> = [];

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
  pendingCalls.push(() => {
    try {
      if (posthogInstance) call(posthogInstance);
    } catch {
      // noop
    }
  });
};

export const getPostHogInstance = (): PostHog | null => posthogInstance;

// Facade con cola: los métodos se encolan hasta que posthog-js carga e init,
// así ningún evento/registro temprano se pierde mientras posthog-js no está en
// el critical path de la landing.
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