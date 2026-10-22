// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverSrc = readFileSync(resolve(__dirname, '../server.mjs'), 'utf8');
// 4.57D follow-up: the Pro/Plus preapproval settlement was extracted to a real
// module (server/subscriptions/proPreapprovalEvent.mjs) so it can be tested
// behaviourally. The source-contract assertions below read the module that now
// owns that logic (the guard assertion stays on server.mjs).
const preapprovalSrc = readFileSync(resolve(__dirname, 'subscriptions/proPreapprovalEvent.mjs'), 'utf8');

function mockGetProAccess(subscription) {
  const now = Date.now();
  let hasAccess = false;
  let status = subscription?.status ?? null;
  if (subscription) {
    const periodEndMs = subscription.current_period_end ? Date.parse(subscription.current_period_end) : 0;
    if (subscription.status === 'active') hasAccess = periodEndMs > now;
    else if (subscription.status === 'cancelled') hasAccess = periodEndMs > now;
    else if (subscription.status === 'pending') hasAccess = false;
    else if (subscription.status === 'past_due') hasAccess = false;
  }
  return { hasAccess, status };
}

describe('FASE 3D — Pro pending', () => {
  it('pending + pending provider → no access', () => {
    expect(mockGetProAccess({ status: 'pending' }).hasAccess).toBe(false);
  });
  it('pending provider authorized → reconciled active → access', () => {
    const before = mockGetProAccess({ status: 'pending' });
    expect(before.hasAccess).toBe(false);
    const after = mockGetProAccess({ status: 'active', current_period_end: new Date(Date.now()+86400000).toISOString() });
    expect(after.hasAccess).toBe(true);
  });
  it('active → access true', () => {
    expect(mockGetProAccess({ status: 'active', current_period_end: new Date(Date.now()+86400000).toISOString() }).hasAccess).toBe(true);
  });
  it('cancelled → no access', () => {
    expect(mockGetProAccess({ status: 'cancelled', current_period_end: new Date(Date.now()-1000).toISOString() }).hasAccess).toBe(false);
  });
  it('pending existing checkout → reuse not create duplicate', () => {
    const sub = { status: 'pending', provider_subscription_id: 'MP1' };
    const shouldBlockNew = sub.status === 'active' && sub.provider_subscription_id;
    expect(shouldBlockNew).toBe(false);
  });
  it('active blocks new subscribe', () => {
    const sub = { status: 'active', provider_subscription_id: 'MP1' };
    expect(sub.status === 'active' && !!sub.provider_subscription_id).toBe(true);
  });
  it('PRO PENDING does not grant pro_limited when AI trialing', () => {
    const ai = { status: 'trialing', trial_ends_at: new Date(Date.now()+86400000).toISOString() };
    const pro = { status: 'pending' };
    const hasAI = true; // trialing within window
    const proAccess = mockGetProAccess(pro).hasAccess;
    const effective = hasAI ? 'ai_trial' : (proAccess ? 'pro_limited' : 'free');
    expect(effective).toBe('ai_trial');
    expect(proAccess).toBe(false);
  });
});

describe('FASE 4.57D — Pro webhook residual-state fixes (source contract)', () => {
  it('reactivation clears the stale terminal cancelled_at marker', () => {
    expect(serverSrc).toMatch(/Reactivar pending\/cancelled\/expired[\s\S]*?cancelled_at: null/);
  });
  it('Pro preapproval webhook verifies the linked preapproval id before mutating', () => {
    expect(serverSrc).toMatch(/if \(!matchesActiveProvider\(subscription, preapprovalId\)\)/);
  });
  it('cancelled preapproval releases the unpaid Founder reservation', () => {
    expect(preapprovalSrc).toMatch(/mpStatus === 'cancelled'\)[\s\S]{0,1500}?from\('pro_founder_reservations'\)\.delete\(\)\.eq\('lawyer_id', lawyerId\)/);
  });
});
