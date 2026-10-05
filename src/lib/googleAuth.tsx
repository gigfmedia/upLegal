import posthog from 'posthog-js';
import { supabase } from '@/lib/supabaseClient';

/**
 * FASE 4.60A — Google Sign-In (autenticación solamente).
 * Scopes: defaults del provider (openid/email/profile). NUNCA se piden
 * calendar/drive/gmail aquí; la autorización de Calendar vive en su
 * integración contextual separada.
 */

const POST_AUTH_REDIRECT_KEY = 'legalup_post_auth_redirect';

function track(event: string, props?: Record<string, unknown>) {
  try {
    posthog.capture(event, props);
  } catch {
    /* analytics best-effort, nunca bloquea auth */
  }
}

/** Solo rutas internas. Rechaza absolutas, protocol-relative y esquemas. */
export function sanitizePostAuthRedirect(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let path = raw.trim();
  try {
    path = decodeURIComponent(path);
  } catch {
    return null;
  }
  if (!path.startsWith('/')) return null;
  if (path.startsWith('//')) return null;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(path)) return null;
  if (/^(javascript|data|vbscript):/i.test(path)) return null;
  return path || null;
}

export function storePostAuthRedirect(path: string | null | undefined): void {
  try {
    const clean = sanitizePostAuthRedirect(path);
    if (clean) window.localStorage.setItem(POST_AUTH_REDIRECT_KEY, clean);
  } catch {
    /* storage puede no estar disponible; el callback usa default */
  }
}

/** Consume una sola vez (evita re-navegaciones en replays del callback). */
export function consumePostAuthRedirect(): string | null {
  try {
    const raw = window.localStorage.getItem(POST_AUTH_REDIRECT_KEY);
    window.localStorage.removeItem(POST_AUTH_REDIRECT_KEY);
    return sanitizePostAuthRedirect(raw);
  } catch {
    return null;
  }
}

export type GoogleSignInRole = 'lawyer' | undefined;

/**
 * Inicia Google Sign-In vía redirect (Supabase maneja PKCE/state).
 * role='lawyer' SOLO desde superficies de adquisición de abogados
 * (el formulario ya trae role lawyer); nunca 'admin', nunca desde query.
 */
export async function beginGoogleSignIn(options?: {
  role?: GoogleSignInRole;
  redirectTo?: string | null;
}): Promise<{ error: Error | null }> {
  storePostAuthRedirect(options?.redirectTo ?? window.location.pathname);
  track('auth_started', { method: 'google', role: options?.role ?? 'client' });
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        ...(options?.role === 'lawyer' ? { data: { role: 'lawyer' } } : {}),
      },
    });
    if (error) throw error;
    return { error: null };
  } catch (e) {
    const err = e instanceof Error ? e : new Error('No se pudo iniciar sesión con Google.');
    return { error: err };
  }
}

export function trackGoogleCompleted(): void {
  track('auth_completed', { method: 'google' });
}

/** Inline "G" multicolor (sin dependencia de imagen remota). */
export function GoogleIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  );
}
