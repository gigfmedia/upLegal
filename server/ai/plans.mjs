/**
 * FASE 4.57B — canonical multi-tier plan foundation.
 *
 * Single authority for plan identity, allowances and feature resolution.
 * Backend remains authoritative; frontend mirrors only types/values.
 *
 * Canonical codes: free_case | pro | plus | legacy
 *   free_case — first lifetime LAWYER_DIRECT Case entitlement (4.44A/4.49A).
 *   pro       — paid LegalUp lawyer SaaS (any compatible stored value).
 *   plus      — future tier. STRUCTURALLY present, COMMERCIALLY INACTIVE.
 *               Never purchasable, never resolved from stored state, never
 *               granted by any gate in this phase.
 *   legacy    — standalone-AI compatibility (trial/essential history).
 *
 * Founder is NOT a tier: plan=pro (or future plus) + founder flag/pricing
 * handled separately (server/proFounder.mjs). See §24-26 of the phase.
 *
 * Nothing here changes current entitlements: free/pro/legacy outputs below
 * are byte-identical to the certified 4.56 contract.
 */
import {
  PRO_AI_ALLOWANCE,
  FREE_CASE_ALLOWANCE,
} from './proAllowance.mjs';
import { decideCheckoutPrice } from '../proFounder.mjs';

export const PLAN_CODES = Object.freeze({
  FREE_CASE: 'free_case',
  PRO: 'pro',
  PLUS: 'plus',
  LEGACY: 'legacy',
});

/** Fail-closed code for inactive/unknown purchasable-tier requests. */
export const PLAN_NOT_AVAILABLE = 'PLAN_NOT_AVAILABLE';

/**
 * Raw persisted/synthesized plan values observed in the wild.
 * Every mapping is intentional; anything else resolves to null
 * (fail closed — callers choose explicit fallbacks, never silent tiers).
 */
const RAW_TO_CANONICAL = Object.freeze({
  free_case: 'free_case',
  pro: 'pro',
  pro_limited: 'pro',
  saas_essential: 'pro',
  essential: 'legacy',
  plus: 'plus',
});

/** Canonical plan code for a raw value, or null when unknown (fail closed). */
export function normalizePlanCode(raw) {
  if (typeof raw !== 'string' || raw.length === 0) return null;
  return RAW_TO_CANONICAL[raw] ?? null;
}

/** Is this canonical code commercially purchasable today? */
export function isCommerciallyAvailable(planCode) {
  return planCode === PLAN_CODES.PRO;
}

/**
 * Canonical catalog. Period vocabulary:
 *   lifetime            — no reset, no rollover (free pools).
 *   current             — current stored rows; deleting frees a slot.
 *   calendar_month_utc  — UTC month bucket; successful ops only.
 * Scopes mirror the certified authorities (DB trigger / ai_begin_operation).
 */
export const PLAN_CATALOG = Object.freeze({
  free_case: Object.freeze({
    status: 'entitlement',
    purchasable: false,
    allowances: Object.freeze({
      activeCases: Object.freeze({ limit: 1, period: 'lifetime', scope: 'lawyer_direct_first' }),
      documents: Object.freeze({ limit: FREE_CASE_ALLOWANCE.storedDocuments, period: 'current', scope: 'free_case_workspace' }),
      chat: Object.freeze({ limit: FREE_CASE_ALLOWANCE.chatLifetime, period: 'lifetime', scope: 'free_case_shared_pool' }),
      analysis: Object.freeze({ limit: FREE_CASE_ALLOWANCE.analysisLifetime, period: 'lifetime', scope: 'free_case' }),
      research: Object.freeze({ limit: FREE_CASE_ALLOWANCE.researchLifetime, period: 'lifetime', scope: 'free_case' }),
    }),
    features: Object.freeze(['document_analysis', 'case_chat', 'jurisprudence']),
  }),
  pro: Object.freeze({
    status: 'paid',
    purchasable: true,
    allowances: Object.freeze({
      // Mirrors pro_active_case_limit(); the DB trigger enforces.
      activeCases: Object.freeze({ limit: 20, period: 'current', scope: 'lawyer_direct_active' }),
      documents: Object.freeze({ limit: PRO_AI_ALLOWANCE.storedDocuments, period: 'current', scope: 'lawyer' }),
      chat: Object.freeze({ limit: PRO_AI_ALLOWANCE.chatPerMonth, period: 'calendar_month_utc', scope: 'shared_pool' }),
      analysis: Object.freeze({ limit: PRO_AI_ALLOWANCE.analysisPerMonth, period: 'calendar_month_utc', scope: 'monthly' }),
      research: Object.freeze({ limit: PRO_AI_ALLOWANCE.researchPerMonth, period: 'calendar_month_utc', scope: 'monthly' }),
    }),
    features: Object.freeze(['document_analysis', 'case_chat', 'case_analysis', 'jurisprudence']),
  }),
  // 4.57B: structural placeholder only. No quotas, no price, no purchase.
  plus: Object.freeze({
    status: 'inactive',
    purchasable: false,
    allowances: null,
    features: null,
  }),
  legacy: Object.freeze({
    status: 'compatibility',
    purchasable: false,
    allowances: null,
    features: null,
  }),
});

/**
 * Allowance set for a canonical plan, or null when unconfigured/inapplicable.
 * Plus returns null (UNCONFIGURED) — never Pro limits, never unlimited,
 * never placeholder numbers. Legacy returns null (own historical logic).
 */
export function getPlanAllowances(planCode) {
  if (planCode === PLAN_CODES.PLUS) return null;
  const entry = PLAN_CATALOG[planCode];
  if (!entry || !entry.allowances) return null;
  return entry.allowances;
}

/** Single capability allowance ({limit, period, scope}) or null. */
export function resolvePlanAllowance(planCode, capability) {
  const allowances = getPlanAllowances(planCode);
  if (!allowances) return null;
  return allowances[capability] ?? null;
}

/**
 * Feature check. Plus returns false for everything in 4.57B: the tier is
 * structurally a Pro superset (see PLAN_CATALOG.pro.features as the
 * reference set), but no gate may resolve access from the plus code while
 * the tier is commercially inactive. Fail closed, always.
 */
export function hasPlanFeature(planCode, feature) {
  if (planCode === PLAN_CODES.PLUS) return false;
  const entry = PLAN_CATALOG[planCode];
  if (!entry || !entry.features) return false;
  return entry.features.includes(feature);
}

/** Active-case capacity ({limit,...}) — pro 20; plus UNCONFIGURED (null). */
export function getActiveCaseLimit(planCode) {
  if (planCode === PLAN_CODES.FREE_CASE) {
    return { limit: 1, period: 'lifetime', scope: 'lawyer_direct_first' };
  }
  if (planCode === PLAN_CODES.PRO) {
    return { limit: 20, period: 'current', scope: 'lawyer_direct_active' };
  }
  return null;
}

/**
 * Canonical paid-tier identity for a stored subscription row shape
 * ({plan, ...}). Returns 'pro' | 'plus' | null (no access / unknown).
 * Only rows the paid-access layer already accepts can yield a tier.
 */
export function canonicalPaidPlan(subscription) {
  if (!subscription || typeof subscription !== 'object') return null;
  const code = normalizePlanCode(subscription.plan);
  if (code === PLAN_CODES.PRO || code === PLAN_CODES.PLUS) return code;
  return null;
}

/**
 * Checkout plan resolution for POST /api/pro/subscribe bodies.
 * Missing/undefined → existing Pro behavior. Explicit 'pro' → Pro.
 * 'plus', legacy values and anything unknown → fail closed BEFORE any
 * side effect (no MP call, no DB write, no founder-slot touch).
 */
export function resolveCheckoutPlanCode(body) {
  const raw = body?.plan;
  if (raw === undefined || raw === null) return { ok: true, planCode: PLAN_CODES.PRO };
  const code = normalizePlanCode(raw);
  if (code === PLAN_CODES.PRO) return { ok: true, planCode: PLAN_CODES.PRO };
  return { ok: false, code: PLAN_NOT_AVAILABLE };
}

/**
 * Price resolution by canonical plan. Pro delegates to the certified
 * Founder/standard resolver (unchanged). Plus (or anything unpurchasable)
 * fails closed — never defaults to the Pro price.
 */
export function resolvePlanPrice({ planCode, isFounder, lifetimeApproved, reservation }) {
  if (planCode !== PLAN_CODES.PRO) return { ok: false, code: PLAN_NOT_AVAILABLE };
  return {
    ok: true,
    amountClp: decideCheckoutPrice({ isFounder, lifetimeApproved, reservation }),
  };
}
