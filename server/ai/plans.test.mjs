import { describe, it, expect } from 'vitest';
import {
  PLAN_CODES,
  PLAN_CATALOG,
  PLAN_NOT_AVAILABLE,
  PLUS_PRICE_CLP,
  normalizePlanCode,
  isCommerciallyAvailable,
  getPlanAllowances,
  resolvePlanAllowance,
  hasPlanFeature,
  getActiveCaseLimit,
  canonicalPaidPlan,
  resolveCheckoutPlanCode,
  resolvePlanPrice,
} from './plans.mjs';

describe('4.57D canonical plans — Plus v1 contract', () => {
  it('normalizes every known raw value; unknown fails closed (null)', () => {
    expect(normalizePlanCode('free_case')).toBe('free_case');
    expect(normalizePlanCode('pro')).toBe('pro');
    expect(normalizePlanCode('pro_limited')).toBe('pro');
    expect(normalizePlanCode('saas_essential')).toBe('pro');
    expect(normalizePlanCode('essential')).toBe('legacy');
    expect(normalizePlanCode('plus')).toBe('plus');
    expect(normalizePlanCode('vip')).toBeNull();
    expect(normalizePlanCode('')).toBeNull();
    expect(normalizePlanCode(null)).toBeNull();
    expect(normalizePlanCode(undefined)).toBeNull();
  });

  it('pro and plus are commercially available; legacy never', () => {
    expect(isCommerciallyAvailable(PLAN_CODES.PRO)).toBe(true);
    expect(isCommerciallyAvailable(PLAN_CODES.PLUS)).toBe(true);
    expect(isCommerciallyAvailable(PLAN_CODES.FREE_CASE)).toBe(false);
    expect(isCommerciallyAvailable(PLAN_CODES.LEGACY)).toBe(false);
    expect(isCommerciallyAvailable('vip')).toBe(false);
  });

  it('Plus v1 exact contract: 40 / 150 / 750 / 100 / 25 @ 79990', () => {
    expect(PLUS_PRICE_CLP).toBe(79990);
    expect(PLAN_CATALOG.plus.purchasable).toBe(true);
    expect(PLAN_CATALOG.plus.priceClp).toBe(79990);
    expect(resolvePlanAllowance('plus', 'activeCases')).toEqual({ limit: 40, period: 'current', scope: 'lawyer_direct_active' });
    expect(resolvePlanAllowance('plus', 'documents')).toEqual({ limit: 150, period: 'current', scope: 'lawyer' });
    expect(resolvePlanAllowance('plus', 'chat')).toEqual({ limit: 750, period: 'calendar_month_utc', scope: 'shared_pool' });
    expect(resolvePlanAllowance('plus', 'analysis')).toEqual({ limit: 100, period: 'calendar_month_utc', scope: 'monthly' });
    expect(resolvePlanAllowance('plus', 'research')).toEqual({ limit: 25, period: 'calendar_month_utc', scope: 'monthly' });
    expect(resolvePlanAllowance('plus', 'drafting')).toEqual({ limit: 75, period: 'calendar_month_utc', scope: 'monthly' });
    expect(resolvePlanAllowance('plus', 'nonexistent')).toBeNull();
  });

  it('Pro contract unchanged: 20 / 50 / 300 / 40 / 10 + drafting 30 (4.59E)', () => {
    expect(resolvePlanAllowance('pro', 'activeCases')).toEqual({ limit: 20, period: 'current', scope: 'lawyer_direct_active' });
    expect(resolvePlanAllowance('pro', 'documents')).toEqual({ limit: 50, period: 'current', scope: 'lawyer' });
    expect(resolvePlanAllowance('pro', 'chat')).toEqual({ limit: 300, period: 'calendar_month_utc', scope: 'shared_pool' });
    expect(resolvePlanAllowance('pro', 'analysis')).toEqual({ limit: 40, period: 'calendar_month_utc', scope: 'monthly' });
    expect(resolvePlanAllowance('pro', 'research')).toEqual({ limit: 10, period: 'calendar_month_utc', scope: 'monthly' });
    expect(resolvePlanAllowance('pro', 'drafting')).toEqual({ limit: 30, period: 'calendar_month_utc', scope: 'monthly' });
  });

  it('Free contract unchanged: 1 / 2 / 3 / 1 / 1', () => {
    expect(resolvePlanAllowance('free_case', 'activeCases')).toEqual({ limit: 1, period: 'lifetime', scope: 'lawyer_direct_first' });
    expect(resolvePlanAllowance('free_case', 'documents')).toEqual({ limit: 2, period: 'current', scope: 'free_case_workspace' });
    expect(resolvePlanAllowance('free_case', 'chat')).toEqual({ limit: 3, period: 'lifetime', scope: 'free_case_shared_pool' });
    expect(resolvePlanAllowance('free_case', 'analysis')).toEqual({ limit: 1, period: 'lifetime', scope: 'free_case' });
    expect(resolvePlanAllowance('free_case', 'research')).toEqual({ limit: 1, period: 'lifetime', scope: 'free_case' });
  });

  it('Plus shares the Pro core feature set; no Plus-only features', () => {
    for (const f of ['document_analysis', 'case_chat', 'case_analysis', 'jurisprudence']) {
      expect(hasPlanFeature('plus', f)).toBe(true);
      expect(hasPlanFeature('pro', f)).toBe(true);
    }
    expect(hasPlanFeature('plus', 'workflow_generation')).toBe(false);
    expect(hasPlanFeature('plus', 'document_drafting')).toBe(false);
    expect(PLAN_CATALOG.plus.features).toBe(PLAN_CATALOG.pro.features);
  });

  it('active-case capacity: free 1 lifetime, pro 20, plus 40', () => {
    expect(getActiveCaseLimit('free_case')).toEqual({ limit: 1, period: 'lifetime', scope: 'lawyer_direct_first' });
    expect(getActiveCaseLimit('pro')).toEqual({ limit: 20, period: 'current', scope: 'lawyer_direct_active' });
    expect(getActiveCaseLimit('plus')).toEqual({ limit: 40, period: 'current', scope: 'lawyer_direct_active' });
    expect(getActiveCaseLimit('legacy')).toBeNull();
  });

  it('canonicalPaidPlan resolves plus rows; never legacy/free/unknown', () => {
    expect(canonicalPaidPlan({ plan: 'saas_essential' })).toBe('pro');
    expect(canonicalPaidPlan({ plan: 'pro' })).toBe('pro');
    expect(canonicalPaidPlan({ plan: 'plus' })).toBe('plus');
    expect(canonicalPaidPlan({ plan: 'essential' })).toBeNull();
    expect(canonicalPaidPlan({ plan: 'free_case' })).toBeNull();
    expect(canonicalPaidPlan(null)).toBeNull();
  });

  it('checkout resolution: missing/pro/plus ok; legacy/unknown fail closed', () => {
    expect(resolveCheckoutPlanCode(undefined)).toEqual({ ok: true, planCode: 'pro' });
    expect(resolveCheckoutPlanCode({})).toEqual({ ok: true, planCode: 'pro' });
    expect(resolveCheckoutPlanCode({ plan: 'pro' })).toEqual({ ok: true, planCode: 'pro' });
    expect(resolveCheckoutPlanCode({ plan: 'plus' })).toEqual({ ok: true, planCode: 'plus' });
    expect(resolveCheckoutPlanCode({ plan: 'essential' })).toEqual({ ok: false, code: PLAN_NOT_AVAILABLE });
    expect(resolveCheckoutPlanCode({ plan: 'vip' })).toEqual({ ok: false, code: PLAN_NOT_AVAILABLE });
  });

  it('price: pro Founder/standard unchanged; plus always 79990 founder-blind', () => {
    expect(resolvePlanPrice({ planCode: 'pro', isFounder: false })).toEqual({ ok: true, amountClp: 49990 });
    expect(resolvePlanPrice({ planCode: 'pro', isFounder: true, lifetimeApproved: 1, reservation: null })).toEqual({ ok: true, amountClp: 19990 });
    expect(resolvePlanPrice({ planCode: 'pro', isFounder: true, lifetimeApproved: 3, reservation: null })).toEqual({ ok: true, amountClp: 49990 });
    expect(resolvePlanPrice({ planCode: 'plus' })).toEqual({ ok: true, amountClp: 79990 });
    expect(resolvePlanPrice({ planCode: 'plus', isFounder: true, lifetimeApproved: 0 })).toEqual({ ok: true, amountClp: 79990 });
    expect(resolvePlanPrice({ planCode: 'free_case' })).toEqual({ ok: false, code: PLAN_NOT_AVAILABLE });
  });

  it('catalog is frozen (no runtime tier smuggling)', () => {
    expect(Object.isFrozen(PLAN_CATALOG)).toBe(true);
    expect(Object.isFrozen(PLAN_CATALOG.plus)).toBe(true);
  });
});
