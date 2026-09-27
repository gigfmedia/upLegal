/**
 * FASE 4.57B — canonical multi-tier plan foundation.
 * FASE 4.57D — Plus v1 ACTIVATED (capacity-only tier above Pro).
 *
 * Single authority for plan identity, allowances and feature resolution.
 * Backend remains authoritative; frontend mirrors only types/values.
 *
 * Canonical codes: free_case | pro | plus | legacy
 *   free_case — first lifetime LAWYER_DIRECT Case entitlement (4.44A/4.49A).
 *   pro       — paid LegalUp lawyer SaaS (any compatible stored value).
 *   plus      — LegalUp Plus v1: SAME product as Pro, HIGHER limits only.
 *               No Plus-only features, no teams, no automation.
 *   legacy    — standalone-AI compatibility (trial/essential history).
 *
 * Founder is NOT a tier: plan=pro (or plus) + founder flag/pricing
 * handled separately (server/proFounder.mjs). Founder intro pricing
 * applies ONLY to Pro; Plus is always the standard Plus price.
 */
import {
  PRO_AI_ALLOWANCE,
  PLUS_AI_ALLOWANCE,
  PAID_CASE_LIMITS,
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

/** 4.57D canonical server-side prices (client never authoritative). */
export const PLUS_PRICE_CLP = 79990;
export const PRO_STANDARD_PRICE_CLP_CANON = 49990;

/** Core paid feature set (Pro and Plus v1 share it; Plus adds NO features). */
const PAID_CORE_FEATURES = Object.freeze([
  'document_analysis',
  'case_chat',
  'case_analysis',
  'jurisprudence',
]);

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
  return planCode === PLAN_CODES.PRO || planCode === PLAN_CODES.PLUS;
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
    priceClp: PRO_STANDARD_PRICE_CLP_CANON,
    allowances: Object.freeze({
      // Mirrors pro_active_case_limit(); the DB trigger enforces.
      activeCases: Object.freeze({ limit: PAID_CASE_LIMITS.pro, period: 'current', scope: 'lawyer_direct_active' }),
      documents: Object.freeze({ limit: PRO_AI_ALLOWANCE.storedDocuments, period: 'current', scope: 'lawyer' }),
      chat: Object.freeze({ limit: PRO_AI_ALLOWANCE.chatPerMonth, period: 'calendar_month_utc', scope: 'shared_pool' }),
      analysis: Object.freeze({ limit: PRO_AI_ALLOWANCE.analysisPerMonth, period: 'calendar_month_utc', scope: 'monthly' }),
      research: Object.freeze({ limit: PRO_AI_ALLOWANCE.researchPerMonth, period: 'calendar_month_utc', scope: 'monthly' }),
    }),
    features: PAID_CORE_FEATURES,
  }),
  // 4.57D: LegalUp Plus v1 — capacity only. Same core product as Pro,
  // higher limits. Plus >= Pro expressed by shared feature set.
  plus: Object.freeze({
    status: 'paid',
    purchasable: true,
    priceClp: PLUS_PRICE_CLP,
    allowances: Object.freeze({
      activeCases: Object.freeze({ limit: PAID_CASE_LIMITS.plus, period: 'current', scope: 'lawyer_direct_active' }),
      documents: Object.freeze({ limit: PLUS_AI_ALLOWANCE.storedDocuments, period: 'current', scope: 'lawyer' }),
      chat: Object.freeze({ limit: PLUS_AI_ALLOWANCE.chatPerMonth, period: 'calendar_month_utc', scope: 'shared_pool' }),
      analysis: Object.freeze({ limit: PLUS_AI_ALLOWANCE.analysisPerMonth, period: 'calendar_month_utc', scope: 'monthly' }),
      research: Object.freeze({ limit: PLUS_AI_ALLOWANCE.researchPerMonth, period: 'calendar_month_utc', scope: 'monthly' }),
    }),
    features: PAID_CORE_FEATURES,
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
 * Legacy returns null (own historical logic).
 */
export function getPlanAllowances(planCode) {
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
 * Feature check. Pro and Plus v1 share the paid core set (Plus adds NO
 * Plus-only features). Free_case has its own set; legacy none.
 */
export function hasPlanFeature(planCode, feature) {
  const entry = PLAN_CATALOG[planCode];
  if (!entry || !entry.features) return false;
  return entry.features.includes(feature);
}

/** Active-case capacity ({limit,...}) — pro 20, plus 40. */
export function getActiveCaseLimit(planCode) {
  if (planCode === PLAN_CODES.FREE_CASE) {
    return { limit: 1, period: 'lifetime', scope: 'lawyer_direct_first' };
  }
  if (planCode === PLAN_CODES.PRO || planCode === PLAN_CODES.PLUS) {
    const limit = PAID_CASE_LIMITS[planCode];
    return { limit, period: 'current', scope: 'lawyer_direct_active' };
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
 * Explicit 'plus' → Plus (purchasable since 4.57D). Legacy values and
 * anything unknown → fail closed BEFORE any side effect (no MP call,
 * no DB write, no founder-slot touch).
 */
export function resolveCheckoutPlanCode(body) {
  const raw = body?.plan;
  if (raw === undefined || raw === null) return { ok: true, planCode: PLAN_CODES.PRO };
  const code = normalizePlanCode(raw);
  if (code === PLAN_CODES.PRO || code === PLAN_CODES.PLUS) return { ok: true, planCode: code };
  return { ok: false, code: PLAN_NOT_AVAILABLE };
}

/**
 * Price resolution by canonical plan.
 *   pro  → certified Founder/standard resolver (unchanged).
 *   plus → 79.990 ALWAYS. Founder status, intro counts and reservations
 *           never change the Plus price. Anything unpurchasable fails
 *           closed — never defaults to another tier's price.
 */
export function resolvePlanPrice({ planCode, isFounder, lifetimeApproved, reservation }) {
  if (planCode === PLAN_CODES.PLUS) return { ok: true, amountClp: PLUS_PRICE_CLP };
  if (planCode !== PLAN_CODES.PRO) return { ok: false, code: PLAN_NOT_AVAILABLE };
  return {
    ok: true,
    amountClp: decideCheckoutPrice({ isFounder, lifetimeApproved, reservation }),
  };
}
