/**
 * PRO.2.3 — decisión pura de CTA Free/Pro (testeable sin render).
 *
 * FREE:
 * - sin auth → signup (el acceso Free es la realidad actual post-onboarding:
 *   dashboard lectura + 1er caso + servicios; sin código nuevo).
 * - con auth → dashboard.
 *
 * PRO:
 * - sin auth → signup (el llamador registra intent checkout antes).
 * - con auth + Pro activo → dashboard ("Ir a LegalUp Pro", no recompra).
 * - con auth + pending → checkout (el endpoint reconcilia el preapproval
 *   existente en vez de duplicar).
 * - con auth sin Pro (free/expired/past_due) → checkout.
 */

export type PlanCTAAction =
  | { type: "signup" }
  | { type: "dashboard" }
  | { type: "checkout" };

export function resolveFreeCTA(authenticated: boolean): PlanCTAAction {
  return authenticated ? { type: "dashboard" } : { type: "signup" };
}

export function resolveProCTA(input: {
  authenticated: boolean;
  hasProAccess: boolean;
}): PlanCTAAction {
  if (!input.authenticated) return { type: "signup" };
  if (input.hasProAccess) return { type: "dashboard" };
  return { type: "checkout" };
}
