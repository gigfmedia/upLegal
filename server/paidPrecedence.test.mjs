import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const read = (p) => readFileSync(resolve(process.cwd(), p), 'utf8');

describe('4.58A.5 paid SaaS dominates legacy AI access', () => {
  it('getAILawyerAccess resolves paid SaaS before legacy rows', () => {
    const server = read('server.mjs');
    const fnStart = server.indexOf('const getAILawyerAccess = async (userId)');
    expect(fnStart).toBeGreaterThan(-1);
    const fnEnd = server.indexOf('const requireAIAccess', fnStart);
    const body = server.slice(fnStart, fnEnd);
    const paidFirst = body.indexOf('await getProLawyerAccess(userId)');
    const legacyAfter = body.indexOf('await getAILawyerSubscription(userId)');
    expect(paidFirst).toBeGreaterThan(-1);
    expect(legacyAfter).toBeGreaterThan(paidFirst);
    // Paid return carries its own plan; legacy never overrides it.
    expect(body).toContain("const paidPlan = proAccess.subscription?.plan === 'plus' ? 'plus' : 'pro_limited'");
    // No legacy deletion anywhere in the resolver (trial-expiry status
    // writes are legacy-path only and untouched).
    expect(body).not.toMatch(/DELETE FROM public\.ai_subscriptions/i);
  });

  it('usage allowance already resolves paid pools (no change needed)', () => {
    const server = read('server.mjs');
    expect(server).toContain("plan === 'plus' ? PLUS_AI_ALLOWANCE.storedDocuments");
    expect(server).toContain('commercialQuotaForPlan(plan)');
  });

  it('migration 060 adds paid branches, preserves hardened free/legacy paths', () => {
    const sql = read('supabase/migrations/20261006000000_paid_dominates_legacy_docs.sql');
    expect(sql).toContain('v_has_paid');
    expect(sql).toContain('WHEN v_has_paid OR v_is_pro_limited THEN 50');
    expect(sql).toContain('IF v_is_pro_limited OR v_has_paid THEN');
    // Hardened free/legacy behavior intact.
    expect(sql).toContain('v_free_workspace');
    expect(sql).toContain('v_is_ai_active');
    expect(sql).toContain('FREE_CASE_DOCUMENT_LIMIT_REACHED');
    expect(sql).toContain('AI_FREE_CASE_DOCUMENT_SCOPE');
    expect(sql).toContain('AI_FREE_CASE_INVALID_SCOPE');
    expect(sql).toContain('IF v_count >= 2 THEN');
    expect(sql).toContain('ELSE 10 END');
    // No legacy row mutation, no destructive change.
    expect(sql).not.toMatch(/DELETE FROM public\.ai_subscriptions/i);
    expect(sql).not.toMatch(/UPDATE public\.ai_subscriptions/i);
    expect(sql).not.toContain('DROP TABLE');
  });

  it('VM-extracted access functions use no new module imports', () => {
    // getAILawyerAccess/getPlanForAccess bodies must stay free of imports
    // so vm-harness isolated tests keep working.
    const server = read('server.mjs');
    const fnStart = server.indexOf('const getAILawyerAccess = async (userId)');
    const fnEnd = server.indexOf('const requireAIAccess', fnStart);
    const body = server.slice(fnStart, fnEnd);
    expect(body).not.toContain('canonicalPaidPlan(');
    expect(body).not.toContain('from./server/ai/');
  });
});
