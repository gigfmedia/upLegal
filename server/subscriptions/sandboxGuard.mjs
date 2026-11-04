/**
 * Guard de seguridad para pruebas con Supabase.
 *
 * Reglas deliberadamente estrictas:
 * - Solo se permite Supabase local por HTTP en loopback y puerto 54321.
 * - No hay fallback a SUPABASE_URL, VITE_SUPABASE_URL, SERVICE_ROLE_KEY
 *   ni a `.env.local`.
 * - Ninguna variable de entorno puede habilitar hosts remotos.
 * - El guard solo funciona en modo test.
 *
 * Si necesitas otro puerto local, cámbialo aquí de forma explícita y revisada.
 */

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);
const ALLOWED_PROTOCOL = 'http:';
const ALLOWED_PORT = '54321';
export const REMOTE_SUPABASE_PROJECT_REF = 'lgxsfmvyjctxehwslvyw';
const MIN_SERVICE_KEY_LENGTH = 20;

export class SandboxGuardError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SandboxGuardError';
  }
}

export function isTestMode(env = process.env) {
  return (
    env.NODE_ENV === 'test' ||
    env.VITEST === '1' ||
    env.VITEST === 'true' ||
    env.LEGALUP_TEST_MODE === '1'
  );
}

export function assertTestMode(env = process.env) {
  if (!isTestMode(env)) {
    throw new SandboxGuardError(
      'Sandbox guard refused to run outside test mode (set NODE_ENV=test or LEGALUP_TEST_MODE=1).'
    );
  }
}

function normalizeHost(hostname) {
  return String(hostname || '')
    .trim()
    .toLowerCase()
    .replace(/^\[/, '')
    .replace(/\]$/, '');
}

export function assertLoopbackSupabaseUrl(rawUrl, { label = 'SANDBOX_SUPABASE_URL' } = {}) {
  if (typeof rawUrl !== 'string' || rawUrl.trim() === '') {
    throw new SandboxGuardError(`${label} is required.`);
  }

  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new SandboxGuardError(`${label} must be a valid URL.`);
  }

  if (parsed.protocol !== ALLOWED_PROTOCOL) {
    throw new SandboxGuardError(`${label} must use http:// (local Supabase only).`);
  }

  const host = normalizeHost(parsed.hostname);
  if (!LOOPBACK_HOSTS.has(host)) {
    throw new SandboxGuardError(
      `${label} must use an explicit loopback host (127.0.0.1, localhost or ::1).`
    );
  }

  if (parsed.port !== ALLOWED_PORT) {
    throw new SandboxGuardError(`${label} must use the local Supabase port ${ALLOWED_PORT}.`);
  }

  if (parsed.username || parsed.password) {
    throw new SandboxGuardError(`${label} must not contain credentials.`);
  }

  if (parsed.pathname !== '/' || parsed.search || parsed.hash) {
    throw new SandboxGuardError(`${label} must not contain a path, query or fragment.`);
  }

  if (rawUrl.toLowerCase().includes(REMOTE_SUPABASE_PROJECT_REF)) {
    throw new SandboxGuardError(`${label} must not reference the remote Supabase project.`);
  }

  return parsed;
}

export function assertServiceRoleKey(rawKey, { label = 'SANDBOX_SERVICE_ROLE_KEY' } = {}) {
  if (typeof rawKey !== 'string' || rawKey.trim() === '') {
    throw new SandboxGuardError(`${label} is required.`);
  }

  const key = rawKey.trim();
  if (key.length < MIN_SERVICE_KEY_LENGTH) {
    throw new SandboxGuardError(`${label} looks too short to be a service role key.`);
  }

  if (/^sb_publishable_/i.test(key)) {
    throw new SandboxGuardError(`${label} must be a service role key, not a publishable key.`);
  }

  return key;
}

/**
 * Configuración de sandbox para tests. Nunca lee SUPABASE_URL/SERVICE_ROLE_KEY.
 */
export function requireSandboxConfig(env = process.env) {
  assertTestMode(env);

  assertLoopbackSupabaseUrl(env.SANDBOX_SUPABASE_URL, {
    label: 'SANDBOX_SUPABASE_URL',
  });
  const key = assertServiceRoleKey(env.SANDBOX_SERVICE_ROLE_KEY, {
    label: 'SANDBOX_SERVICE_ROLE_KEY',
  });

  return {
    url: env.SANDBOX_SUPABASE_URL,
    key,
  };
}

/**
 * Validación para `server.mjs` cuando se arranca en modo test.
 * Acepta nombres de producción, pero solo con valores locales explícitos.
 */
export function assertTestServerConfig({ url, key, env = process.env }) {
  assertTestMode(env);
  assertLoopbackSupabaseUrl(url, { label: 'SUPABASE_URL' });
  assertServiceRoleKey(key, { label: 'SUPABASE_SERVICE_ROLE_KEY' });
}

/**
 * Resuelve las variables de servidor con el mismo orden que usa `server.mjs`.
 * Mantener este orden aquí permite probar los fallbacks sin arrancar el servidor.
 */
export function resolveServerSupabaseConfig(env = process.env) {
  return {
    url: env.SUPABASE_URL || env.VITE_SUPABASE_URL,
    key: env.SUPABASE_SERVICE_ROLE_KEY || env.SERVICE_ROLE_KEY,
  };
}

export const SANDBOX_ALLOWED_PORT = ALLOWED_PORT;
