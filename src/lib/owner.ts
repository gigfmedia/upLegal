import posthog from 'posthog-js';

const OWNER_EMAILS = [
  'gigfmedia@icloud.com',
  'juan.fercommerce@gmail.com',
];

const normalizeEmail = (email?: string | null): string =>
  (email || '').trim().toLowerCase();

export const isOwnerEmail = (email?: string | null): boolean =>
  OWNER_EMAILS.includes(normalizeEmail(email));

export const isTestHostname = (): boolean => {
  const host = window.location.hostname;
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.netlify.app') ||
    host.includes('-preview') ||
    import.meta.env.DEV === true
  );
};

export const getOwnerContext = (email?: string | null): { is_owner: boolean } => ({
  is_owner: isTestHostname() || isOwnerEmail(email),
});

// Flag mutable que se activa cuando el usuario autenticado es el dueño.
// Permite descartar el tráfico del dueño de GA4/PostHog en producción,
// de modo que sus sesiones no contaminen la data (las IPs cambian y no
// sirven como filtro estable).
let ownerActive = false;

export const setOwnerActive = (active: boolean): void => {
  ownerActive = active;
  if (active) {
    markOwnerDevice();
    // Marca la persona de PostHog como dueña en runtime (producción). En test
    // hosts o dispositivos del dueño, main.tsx ya lo registra al bootear.
    try {
      posthog.register({ is_owner: true, environment: 'prod' });
    } catch {
      // noop — no debe romper el flujo de auth
    }
  }
};

export const isOwnerActive = (): boolean =>
  ownerActive || isTestHostname() || isOwnerDevice();

// Marcador persistente en localStorage: cuando el dueño inicia sesión desde
// un dispositivo, ese navegador queda identificado como "del dueño" para
// futuras visitas (incluso sin sesión), de modo que su tráfico se bloquee
// de analytics de forma estable.
const OWNER_DEVICE_KEY = 'legalup_owner_device';

export const markOwnerDevice = (): void => {
  try {
    localStorage.setItem(OWNER_DEVICE_KEY, '1');
  } catch {
    // localStorage no disponible: el bloqueo solo aplicará por sesión
  }
};

export const isOwnerDevice = (): boolean => {
  try {
    return localStorage.getItem(OWNER_DEVICE_KEY) === '1';
  } catch {
    return false;
  }
};