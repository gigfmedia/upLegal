/**
 * Lawyer onboarding gate — lógica pura y testeable.
 * Determina a dónde debe ir un usuario autenticado según su verificación de email y perfil.
 */
export type ProfileGate = {
  role?: string | null;
  profile_setup_completed?: boolean | null;
  first_name?: string | null;
  last_name?: string | null;
};

export type UserGate = {
  email_confirmed_at?: string | null;
  user_metadata?: Record<string, unknown> | null;
  role?: string | null;
} | null | undefined;

/** True si es abogado según cualquier fuente (profile, metadata, role) */
export function isLawyer(user: UserGate, profile: ProfileGate | null | undefined): boolean {
  if (profile?.role === 'lawyer') return true;
  const metaRole = (user?.user_metadata as any)?.role;
  if (metaRole === 'lawyer') return true;
  if ((user as any)?.role === 'lawyer') return true;
  return false;
}

/** True si el email está verificado según Supabase Auth fuente de verdad */
export function isEmailVerified(user: UserGate): boolean {
  if (!user) return false;
  return user.email_confirmed_at != null && user.email_confirmed_at !== '';
}

/** True si el onboarding ya está completo */
export function isOnboardingCompleted(profile: ProfileGate | null | undefined): boolean {
  return profile?.profile_setup_completed === true;
}

/** Umbral de perfil suficientemente completo para no bloquear acceso */
export const ONBOARDING_COMPLETION_THRESHOLD = 70;

/**
 * True si el perfil se considera suficientemente completo.
 * Fuente: mismo cálculo que usa useProfile/calculateProfileCompletion; >=70.
 */
export function isProfileSufficientlyComplete(
  completionPercentage: number | null | undefined
): boolean {
  return typeof completionPercentage === 'number' && completionPercentage >= ONBOARDING_COMPLETION_THRESHOLD;
}

/**
 * True si el onboarding se considera satisfecho:
 * - profile_setup_completed = true  O
 * - completionPercentage >= 70
 * No escribe en DB; solo decisión de navegación. Actualizar profile_setup_completed
 * automáticamente desde el gate se evita a propósito para no generar efectos secundarios/RLS.
 */
export function isOnboardingSatisfied(
  profile: ProfileGate | null | undefined,
  completionPercentage?: number | null
): boolean {
  if (isOnboardingCompleted(profile)) return true;
  if (isProfileSufficientlyComplete(completionPercentage)) return true;
  return false;
}

/**
 * Determina si el abogado debe ir al onboarding.
 * Solo abogados verificados con onboarding no satisfecho van a onboarding.
 * completionPercentage es opcional pero recomendado para abogados existentes.
 */
export function shouldRedirectToOnboarding(
  user: UserGate,
  profile: ProfileGate | null | undefined,
  completionPercentage?: number | null
): boolean {
  if (!isLawyer(user, profile)) return false;
  if (!isEmailVerified(user)) return false;
  if (isOnboardingSatisfied(profile, completionPercentage)) return false;
  return true;
}

/**
 * Determina si el abogado debe ir al dashboard.
 * Abogado verificado con onboarding satisfecho.
 */
export function shouldRedirectToDashboard(
  user: UserGate,
  profile: ProfileGate | null | undefined,
  completionPercentage?: number | null
): boolean {
  if (!isLawyer(user, profile)) return false;
  if (!isEmailVerified(user)) return false;
  return isOnboardingSatisfied(profile, completionPercentage);
}

/**
 * Retorna el destino post-auth para un usuario lawyer.
 * null si no aplica (no es lawyer o no está verificado).
 * completionPercentage permite respetar >=70% sin profile_setup_completed.
 */
export function getLawyerPostAuthDestination(
  user: UserGate,
  profile: ProfileGate | null | undefined,
  completionPercentage?: number | null
): '/lawyer/onboarding' | '/lawyer/dashboard' | null {
  if (!isLawyer(user, profile)) return null;
  if (!isEmailVerified(user)) return null;
  if (isOnboardingSatisfied(profile, completionPercentage)) return '/lawyer/dashboard';
  return '/lawyer/onboarding';
}

/**
 * Valida si el usuario puede acceder al onboarding.
 * - No autenticado => false
 * - No lawyer => false
 * - No verificado => false
 * - Ya satisfecho (>=70 o completed) => false
 */
export function canAccessOnboarding(
  user: UserGate,
  profile: ProfileGate | null | undefined,
  completionPercentage?: number | null
): boolean {
  if (!user) return false;
  return shouldRedirectToOnboarding(user, profile, completionPercentage);
}
