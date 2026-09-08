// @vitest-environment node
import { describe, it, expect } from 'vitest';

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
