/**
 * Onboarding simple post-registro: selección de tipo de cuenta.
 *
 * Lógica pura y testeable para decidir si un usuario autenticado necesita
 * elegir su rol (abogado vs cliente) y a dónde dirigirlo después.
 *
 * Fuente de verdad del rol: `profiles.role` ('client' | 'lawyer' | 'company').
 * Se considera también `user_metadata.role` (Google desde superficies de
 * abogado, o registro email) para no pedir la selección dos veces.
 *
 * Garantías:
 * - Roles administrativos (app_metadata o profile 'admin'/'superadmin')
 *   nunca pasan por esta selección ni se modifican aquí.
 * - Valores legacy ('user', '', null) = sin tipo definido → mostrar.
 * - Solo 'client' | 'lawyer' son seleccionables; la verificación profesional
 *   (verified / pjud_verified) no se toca en este flujo.
 */

import { hasLegalConsent, type LegalConsentState } from './legalConsent';

export const ROLE_ONBOARDING_PATH = '/auth/role';

/** Roles que cuentan como "tipo de cuenta ya definido". */
export const DEFINED_ACCOUNT_ROLES = ['client', 'lawyer', 'company'] as const;
export type DefinedAccountRole = (typeof DEFINED_ACCOUNT_ROLES)[number];

/** Roles que un usuario jamás puede auto-asignarse por esta vía. */
const PROTECTED_ROLES = ['admin', 'superadmin'] as const;

/** Valores aceptados por el endpoint de guardado (whitelist estricta). */
export const SELECTABLE_ROLES = ['client', 'lawyer'] as const;
export type SelectableRole = (typeof SELECTABLE_ROLES)[number];

export function isSelectableRole(value: unknown): value is SelectableRole {
  return value === 'client' || value === 'lawyer';
}

type RoleCarrier = {
  role?: unknown;
  user_metadata?: { role?: unknown } | null;
  app_metadata?: { role?: unknown } | null;
} | null | undefined;

function normalizeRole(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim().toLowerCase();
  return v === '' ? null : v;
}

function isProtectedRole(value: string | null): boolean {
  return value !== null && (PROTECTED_ROLES as readonly string[]).includes(value);
}

/**
 * Retorna el tipo de cuenta definido, o null si no hay ninguno.
 * Prioridad: profiles.role → user_metadata.role → user.role.
 * Los roles protegidos se reportan tal cual (el caller decide no mostrar).
 */
export function getDefinedAccountRole(
  profile: { role?: unknown } | null | undefined,
  user?: RoleCarrier,
): string | null {
  return (
    normalizeRole((profile as { role?: unknown } | null)?.role) ??
    normalizeRole((user as RoleCarrier)?.user_metadata?.role) ??
    normalizeRole((user as { role?: unknown } | null)?.role) ??
    null
  );
}

/**
 * True si hay que mostrar la pantalla de selección de rol.
 * - Admin/superadmin (app_metadata o profile) → false, intocables.
 * - Rol definido (client/lawyer/company o metadata lawyer) → false.
 * - Sin fila de perfil, rol legacy 'user', null o vacío → true.
 */
export function needsRoleSelection(
  profile: { role?: unknown } | null | undefined,
  user?: RoleCarrier,
): boolean {
  const appRole = normalizeRole(user?.app_metadata?.role);
  if (isProtectedRole(appRole)) return false;
  const defined = getDefinedAccountRole(profile, user);
  if (defined === null) return true;
  if (isProtectedRole(defined)) return false;
  return !(DEFINED_ACCOUNT_ROLES as readonly string[]).includes(defined);
}

/**
 * Distingue un rol elegido conscientemente de un default automático.
 *
 * El trigger `on_auth_user_created → handle_new_user()` inserta
 * `role='client'` (COALESCE sin metadata) al crear el usuario OAuth: ese
 * 'client' NO es una elección y no debe saltarse el selector. En cambio,
 * 'lawyer'/'company' (o 'client' corroborado en `user_metadata`, o cualquier
 * rol con consentimiento ya registrado) sí cuentan como definidos.
 *
 * Regla one-shot (sin bucles): el 'client' no corroborado solo exige el
 * selector mientras FALTAN los timestamps de consentimiento. Tras aceptar
 * (timestamps presentes) se confía en el rol y no se vuelve a pedir.
 */
export function needsRoleConfirmation(
  profile: { role?: unknown } & Partial<LegalConsentState> | null | undefined,
  user?: RoleCarrier,
): boolean {
  if (needsRoleSelection(profile, user)) return true;
  const role = normalizeRole((profile as { role?: unknown } | null)?.role);
  if (role !== 'client') return false;
  if (normalizeRole(user?.user_metadata?.role) === 'client') return false;
  return !hasLegalConsent(profile);
}

/**
 * Destino post-selección. Respeta el redirectTo sanitizado cuando existe;
 * si no, abogado → onboarding profesional, cliente → buscador de abogados.
 * Rutas reales existentes del proyecto (no inventadas).
 */
export function getRoleOnboardingDestination(
  role: SelectableRole,
  safeRedirect: string | null | undefined,
): string {
  if (safeRedirect) return safeRedirect;
  return role === 'lawyer' ? '/lawyer/onboarding' : '/search';
}

/** Construye la URL de la pantalla de selección preservando el retorno. */
export function buildRoleOnboardingPath(redirectTo: string | null | undefined): string {
  if (redirectTo) return `${ROLE_ONBOARDING_PATH}?redirectTo=${encodeURIComponent(redirectTo)}`;
  return ROLE_ONBOARDING_PATH;
}
