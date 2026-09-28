import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { PLUS_AI_ALLOWANCE, PAID_CASE_LIMITS, PRO_AI_ALLOWANCE, commercialQuotaForPlan } from './ai/proAllowance.mjs';
import { isPlusAcquisitionEnabled, PLUS_ACQUISITION_DISABLED } from './ai/plans.mjs';

const read = (p) => readFileSync(resolve(process.cwd(), p), 'utf8');

describe('4.57D Plus v1 — allowances and server wiring', () => {
  it('PLUS_AI_ALLOWANCE = 750/100/25 chat/analysis/research + 150 docs', () => {
    expect(PLUS_AI_ALLOWANCE).toEqual({
      chatPerMonth: 750,
      analysisPerMonth: 100,
      researchPerMonth: 25,
      storedDocuments: 150,
    });
    expect(PAID_CASE_LIMITS).toEqual({ pro: 20, plus: 40 });
  });

  it('commercialQuotaForPlan: plus pools, pro unchanged, else null', () => {
    expect(commercialQuotaForPlan('plus')).toEqual({ chat: 750, analysis: 100, research: 25 });
    expect(commercialQuotaForPlan('pro_limited')).toEqual({
      chat: PRO_AI_ALLOWANCE.chatPerMonth,
      analysis: PRO_AI_ALLOWANCE.analysisPerMonth,
      research: PRO_AI_ALLOWANCE.researchPerMonth,
    });
    expect(commercialQuotaForPlan('free_case')).toBeNull();
    expect(commercialQuotaForPlan('essential')).toBeNull();
    expect(commercialQuotaForPlan('vip')).toBeNull();
  });

  it('checkout supports plan=plus with server-resolved price (no client price)', () => {
    const server = read('server.mjs');
    expect(server).toContain("resolveCheckoutPlanCode(req.body)");
    expect(server).toContain('PLUS_EXTERNAL_REF_PREFIX');
    expect(server).toContain("'LegalUp Plus - Suscripción mensual'");
    expect(server).toContain('is_founder: isPlusTarget ? false : isFounderSlot');
    // Client-supplied price/amount/discount/quota never read in subscribe.
    const start = server.indexOf("app.post('/api/pro/subscribe'");
    const end = server.indexOf("app.post('/api/pro/subscription/cancel'");
    const block = server.slice(start, end);
    expect(block).not.toContain('req.body.price');
    expect(block).not.toContain('req.body.amount');
    expect(block).not.toContain('req.body.discount');
    expect(block).not.toContain('req.body.quota');
    expect(block).not.toContain('req.body.founder');
    expect(block).toContain('resolveCheckoutPlanCode');
    expect(block).toContain('transaction_amount: initialPrice');
    // Founder intro-payment count reads Pro-plan payments only.
    expect(block).toContain(".or('plan.is.null,plan.eq.pro')");
  });

  it('upgrade is staged, never naive cancel-then-create', () => {
    const server = read('server.mjs');
    expect(server).toContain('upgrade_pending');
    expect(server).toContain('previous_provider_subscription_id');
    expect(server).toContain('pending_provider_subscription_id');
    expect(server).toContain('pending_init_point');
    expect(server).toContain('completePlusUpgrade');
    expect(server).toContain('Pro access stays intact until Plus is confirmed');
    // Upgrade resume reuses the stored checkout (idempotency).
    expect(server).toContain('pending_checkout');
    // No-proration disclosure in the upgrade response.
    expect(server).toContain('prorated_credit: false');
  });

  it('Plus activation is fail-closed on amount and never touches Founder', () => {
    const server = read('server.mjs');
    expect(server).toContain('AMOUNT_MISMATCH');
    expect(server).toContain('PLUS_SUBSCRIPTION_PRICE_CLP');
    expect(server).toContain('!isPlusEffective && shouldAttemptFounderClaim');
    expect(server).toContain("plan: isPlusEffective ? 'plus' : 'pro'");
  });

  it('webhook settles plan from trusted provider metadata (PLUS_ prefix)', () => {
    const server = read('server.mjs');
    expect(server).toContain('handlePlusPreapprovalWebhook');
    expect(server).toContain("startsWith(PLUS_EXTERNAL_REF_PREFIX)");
    expect(server).toContain('plus_preapproval_');
    expect(server).toContain('plus_upgrade_completed');
    expect(server).toContain('plus_upgrade_failed');
    // Downgrade + stale-cancel reconciliation on Pro-family events.
    expect(server).toContain('maybeApplyScheduledDowngrade');
    expect(server).toContain('retryOldProCancel');
    expect(server).toContain('plus_downgrade_completed');
  });

  it('downgrade is scheduled, effective at period end, server-persisted', () => {
    const server = read('server.mjs');
    expect(server).toContain("app.post('/api/pro/downgrade'");
    expect(server).toContain("app.post('/api/pro/downgrade/cancel'");
    expect(server).toContain('downgrade_scheduled');
    expect(server).toContain('plan_change_effective_at');
    expect(server).toContain('plus_downgrade_scheduled');
    expect(server).toContain("app.get('/api/pro/subscription'");
  });

  it('cancel is plan-aware and never restores free entitlement', () => {
    const server = read('server.mjs');
    expect(server).toContain('upgrade_abandoned');
    expect(server).toContain('free_case_consumed');
  });

  it('migration: plan-aware capacity + transition state, additive only', () => {
    const sql = read('supabase/migrations/20261005000000_plus_v1_capacity_and_transitions.sql');
    expect(sql).toContain('has_plus_access');
    expect(sql).toContain('lawyer_active_case_limit');
    expect(sql).toContain('WHEN public.has_plus_access(p_lawyer_id) THEN 40');
    expect(sql).toContain('lawyer_active_case_limit(NEW.lawyer_id)');
    expect(sql).toContain('lawyer_active_case_limit(auth.uid())');
    expect(sql).toContain('WHEN v_is_plus THEN 150 WHEN v_is_pro_limited THEN 50 ELSE 10 END');
    // 4.57D.2: the hardened Free branches must survive (P0 regression guard).
    // The trigger body must be the 4.44A/4.44C version + Plus, nothing less.
    expect(sql).toContain('v_free_workspace');
    expect(sql).toContain('v_is_ai_active');
    expect(sql).toContain('FREE_CASE_DOCUMENT_LIMIT_REACHED');
    expect(sql).toContain('AI_FREE_CASE_DOCUMENT_SCOPE');
    expect(sql).toContain('AI_FREE_CASE_INVALID_SCOPE');
    expect(sql).toContain('IF v_count >= 2 THEN');
    expect(sql).toContain('límite de 50 documentos almacenados de tu plan');
    expect(sql).toContain('límite de 150 documentos almacenados de tu plan');
    expect(sql).toContain('pending_plan');
    expect(sql).toContain('plan_change_status');
    expect(sql).toContain('plan_change_effective_at');
    expect(sql).toContain('pending_provider_subscription_id');
    expect(sql).toContain('pending_init_point');
    expect(sql).toContain('previous_provider_subscription_id');
    // Founder ledger: Plus excluded from reconciliation.
    expect(sql).toContain("AND (p.plan IS NULL OR p.plan = 'pro')");
    // RLS posture: service-role only, no client-writeable transitions.
    expect(sql).not.toMatch(/CREATE POLICY/i);
    expect(sql).not.toMatch(/TO authenticated/i);
    // Never edits prior migrations' authorities destructively: the Pro
    // limit function keeps its definition (called as fallback, never
    // redefined here); no table drops.
    expect(sql).not.toContain('FUNCTION public.pro_active_case_limit');
    expect(sql).not.toContain('DROP TABLE');
  });

  it('usage allowance resolves Plus pools server-side', () => {
    const server = read('server.mjs');
    expect(server).toContain('PLUS_AI_ALLOWANCE');
    expect(server).toContain("plan === 'plus' ? PLUS_AI_ALLOWANCE.storedDocuments");
  });

  it('kill switch gates new Plus acquisition only (server authoritative)', () => {
    expect(isPlusAcquisitionEnabled()).toBe(true);
    expect(isPlusAcquisitionEnabled({})).toBe(true);
    expect(isPlusAcquisitionEnabled({ PLUS_ACQUISITION_ENABLED: 'true' })).toBe(true);
    expect(isPlusAcquisitionEnabled({ PLUS_ACQUISITION_ENABLED: 'false' })).toBe(false);
    expect(isPlusAcquisitionEnabled({ PLUS_ACQUISITION_ENABLED: 'FALSE' })).toBe(false);
    expect(PLUS_ACQUISITION_DISABLED).toBe('PLUS_ACQUISITION_DISABLED');
    const server = read('server.mjs');
    expect(server).toContain('isPlusAcquisitionEnabled()');
    expect(server).toContain('PLUS_ACQUISITION_DISABLED');
    // Gate sits before any side effect, Plus-target only.
    const idx = server.indexOf('isPlusAcquisitionEnabled()');
    expect(server.lastIndexOf('resolveCheckoutPlanCode(req.body)', idx)).toBeGreaterThan(-1);
    expect(server.indexOf('is_founder', idx)).toBeGreaterThan(idx);
  });

  it('AI access maps Plus rows to the plus plan (never pro_limited quotas)', () => {
    const server = read('server.mjs');
    expect(server).toContain("proAccess.subscription?.plan === 'plus' ? 'plus' : 'pro_limited'");
    expect(server).toContain("if (access.plan === 'plus') return 'plus'");
    expect(server).toContain("plus: ['document_analysis','case_chat','case_analysis','jurisprudence']");
    // Canonical resolver still guards transition paths (checkout/downgrade).
    expect(server).toContain('canonicalPaidPlan(subscription)');
  });
});
