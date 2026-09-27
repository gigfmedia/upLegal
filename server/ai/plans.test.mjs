import { describe, it, expect } from 'vitest';
import {
  PLAN_CODES,
  PLAN_CATALOG,
  PLAN_NOT_AVAILABLE,
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

describe('4.57B canonical plans — identity and fail-closed guards', () => {
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

  it('only pro is commercially available; plus is INACTIVE', () => {
    expect(isCommerciallyAvailable(PLAN_CODES.PRO)).toBe(true);
    expect(isCommerciallyAvailable(PLAN_CODES.PLUS)).toBe(false);
    expect(isCommerciallyAvailable(PLAN_CODES.FREE_CASE)).toBe(false);
    expect(isCommerciallyAvailable(PLAN_CODES.LEGACY)).toBe(false);
    expect(isCommerciallyAvailable('vip')).toBe(false);
  });

  it('free/pro allowance outputs equal the certified 4.56 contract', () => {
    expect(resolvePlanAllowance('free_case', 'chat')).toEqual({ limit: 3, period: 'lifetime', scope: 'free_case_shared_pool' });
    expect(resolvePlanAllowance('free_case', 'analysis')).toEqual({ limit: 1, period: 'lifetime', scope: 'free_case' });
    expect(resolvePlanAllowance('free_case', 'research')).toEqual({ limit: 1, period: 'lifetime', scope: 'free_case' });
    expect(resolvePlanAllowance('free_case', 'documents')).toEqual({ limit: 2, period: 'current', scope: 'free_case_workspace' });
    expect(resolvePlanAllowance('pro', 'chat')).toEqual({ limit: 300, period: 'calendar_month_utc', scope: 'shared_pool' });
    expect(resolvePlanAllowance('pro', 'analysis')).toEqual({ limit: 40, period: 'calendar_month_utc', scope: 'monthly' });
    expect(resolvePlanAllowance('pro', 'research')).toEqual({ limit: 10, period: 'calendar_month_utc', scope: 'monthly' });
    expect(resolvePlanAllowance('pro', 'documents')).toEqual({ limit: 50, period: 'current', scope: 'lawyer' });
    expect(resolvePlanAllowance('pro', 'nonexistent')).toBeNull();
  });

  it('active-case capacity: free 1 lifetime, pro 20; plus UNCONFIGURED (null)', () => {
    expect(getActiveCaseLimit('free_case')).toEqual({ limit: 1, period: 'lifetime', scope: 'lawyer_direct_first' });
    expect(getActiveCaseLimit('pro')).toEqual({ limit: 20, period: 'current', scope: 'lawyer_direct_active' });
    expect(getActiveCaseLimit('plus')).toBeNull();
    expect(getActiveCaseLimit('legacy')).toBeNull();
  });

  it('plus allowances and features fail closed (never Pro limits, never open)', () => {
    expect(getPlanAllowances('plus')).toBeNull();
    expect(resolvePlanAllowance('plus', 'chat')).toBeNull();
    expect(hasPlanFeature('plus', 'document_analysis')).toBe(false);
    expect(hasPlanFeature('plus', 'case_analysis')).toBe(false);
    expect(getPlanAllowances('legacy')).toBeNull();
  });

  it('pro feature set is the certified 4.44–4.56 set', () => {
    for (const f of ['document_analysis', 'case_chat', 'case_analysis', 'jurisprudence']) {
      expect(hasPlanFeature('pro', f)).toBe(true);
    }
    expect(hasPlanFeature('free_case', 'case_analysis')).toBe(false);
    expect(hasPlanFeature('free_case', 'jurisprudence')).toBe(true);
  });

  it('canonicalPaidPlan only resolves pro/plus rows; never legacy/free/unknown', () => {
    expect(canonicalPaidPlan({ plan: 'saas_essential' })).toBe('pro');
    expect(canonicalPaidPlan({ plan: 'pro' })).toBe('pro');
    expect(canonicalPaidPlan({ plan: 'plus' })).toBe('plus');
    expect(canonicalPaidPlan({ plan: 'essential' })).toBeNull();
    expect(canonicalPaidPlan({ plan: 'free_case' })).toBeNull();
    expect(canonicalPaidPlan(null)).toBeNull();
  });

  it('checkout resolution: missing/pro → pro; plus/legacy/unknown → PLAN_NOT_AVAILABLE', () => {
    expect(resolveCheckoutPlanCode(undefined)).toEqual({ ok: true, planCode: 'pro' });
    expect(resolveCheckoutPlanCode({})).toEqual({ ok: true, planCode: 'pro' });
    expect(resolveCheckoutPlanCode({ plan: 'pro' })).toEqual({ ok: true, planCode: 'pro' });
    expect(resolveCheckoutPlanCode({ plan: 'plus' })).toEqual({ ok: false, code: PLAN_NOT_AVAILABLE });
    expect(resolveCheckoutPlanCode({ plan: 'essential' })).toEqual({ ok: false, code: PLAN_NOT_AVAILABLE });
    expect(resolveCheckoutPlanCode({ plan: 'vip' })).toEqual({ ok: false, code: PLAN_NOT_AVAILABLE });
  });

  it('price resolution: pro delegates to Founder/standard logic; plus never prices', () => {
    const pro = resolvePlanPrice({ planCode: 'pro', isFounder: false });
    expect(pro.ok).toBe(true);
    expect(pro.amountClp).toBe(49990);
    const founder = resolvePlanPrice({ planCode: 'pro', isFounder: true, lifetimeApproved: true, reservation: { active: true } });
    expect(founder).toEqual({ ok: true, amountClp: 19990 });
    expect(resolvePlanPrice({ planCode: 'plus' })).toEqual({ ok: false, code: PLAN_NOT_AVAILABLE });
    expect(resolvePlanPrice({ planCode: 'free_case' })).toEqual({ ok: false, code: PLAN_NOT_AVAILABLE });
  });

  it('catalog is frozen (no runtime tier smuggling)', () => {
    expect(Object.isFrozen(PLAN_CATALOG)).toBe(true);
    expect(Object.isFrozen(PLAN_CATALOG.plus)).toBe(true);
    expect(PLAN_CATALOG.plus).toEqual({ status: 'inactive', purchasable: false, allowances: null, features: null });
  });
});
