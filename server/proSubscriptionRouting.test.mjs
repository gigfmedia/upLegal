// @vitest-environment node
//
// Focused tests for the routing/persistence decisions that caused the two P0s:
//   P0-1 PLUS_* preapprovals must reach the Pro-family handler.
//   P0-2 payments for a pending Plus upgrade must find the pending column.
// These import the real module used by server.mjs (not a copy).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  classifyPreapprovalExternalReference,
  clearPendingPlusUpgrade,
  findProSubscriptionByProviderId,
  hasCurrentPaidPeriod,
  isPendingPlusUpgrade,
  persistCheckoutProviderLink,
} from './subscriptions/proSubscriptionRouting.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverSrc = readFileSync(resolve(__dirname, '../server.mjs'), 'utf8');
const PREFIXES = { ai: 'AI_', pro: 'PRO_', plus: 'PLUS_' };

function makeSupabase(seed = { lawyer_subscriptions: [] }, { updateError = null, queryError = null } = {}) {
  const state = { lawyer_subscriptions: seed.lawyer_subscriptions.map((r) => ({ ...r })) };
  function from(table) {
    const q = { table, op: null, payload: null, filters: [], returning: false };
    const rows = () => state[table] || (state[table] = []);
    const match = (r) => q.filters.every(([c, v]) => (v === null ? r[c] == null : String(r[c] ?? '') === v));
    const done = () => {
      if (q.op === 'update') {
        if (updateError) return { data: null, error: updateError };
        const found = rows().filter(match);
        for (const row of found) Object.assign(row, q.payload);
        return { data: q.returning ? (found[0] ?? null) : null, error: null };
      }
      if (queryError) return { data: null, error: queryError };
      return { data: rows().find(match) ?? null, error: null };
    };
    const api = {
      select() { q.returning = true; if (!q.op) q.op = 'select'; return api; },
      update(payload) { q.op = 'update'; q.payload = payload; return api; },
      eq(c, v) { q.filters.push([c, String(v)]); return api; },
      is(c, v) { q.filters.push([c, v]); return api; },
      maybeSingle() { return Promise.resolve(done()); },
      then(res, rej) { return Promise.resolve(done()).then(res, rej); },
    };
    return api;
  }
  return { from, state };
}

describe('P0-1 — preapproval routing', () => {
  it('routes PLUS_* and PRO_* to the Pro family; AI_* stays AI; companies stay company', () => {
    expect(classifyPreapprovalExternalReference('PLUS_ly-1', PREFIXES)).toBe('pro');
    expect(classifyPreapprovalExternalReference('PRO_ly-1', PREFIXES)).toBe('pro');
    expect(classifyPreapprovalExternalReference('AI_ly-1', PREFIXES)).toBe('ai');
    expect(classifyPreapprovalExternalReference('company-1', PREFIXES)).toBe('company');
    expect(classifyPreapprovalExternalReference('', PREFIXES)).toBe('company');
  });

  it('server.mjs uses the shared classifier for preapproval dispatch', () => {
    expect(serverSrc).toMatch(/classifyPreapprovalExternalReference\(externalRef/);
  });
});

describe('P0-2 — payment lookup for Plus upgrades', () => {
  it('finds a preapproval id in provider_subscription_id', async () => {
    const s = makeSupabase({ lawyer_subscriptions: [{ id: 'sub-1', provider_subscription_id: 'PRE-1', pending_provider_subscription_id: null }] });
    const row = await findProSubscriptionByProviderId(s, 'PRE-1');
    expect(row?.id).toBe('sub-1');
  });

  it('finds a pending Plus upgrade in pending_provider_subscription_id', async () => {
    const s = makeSupabase({ lawyer_subscriptions: [{ id: 'sub-1', provider_subscription_id: 'PRO-1', pending_provider_subscription_id: 'PLUS-1' }] });
    const row = await findProSubscriptionByProviderId(s, 'PLUS-1');
    expect(row?.id).toBe('sub-1');
  });

  it('returns null when neither column matches, and propagates query errors', async () => {
    const s = makeSupabase({ lawyer_subscriptions: [{ id: 'sub-1', provider_subscription_id: 'PRO-1', pending_provider_subscription_id: null }] });
    await expect(findProSubscriptionByProviderId(s, 'OTHER')).resolves.toBeNull();
    const broken = makeSupabase({ lawyer_subscriptions: [] }, { queryError: { code: 'XX000', message: 'db down' } });
    await expect(findProSubscriptionByProviderId(broken, 'PLUS-1')).rejects.toMatchObject({ code: 'XX000' });
  });

  it('server.mjs uses the shared lookup for payment dispatch', () => {
    expect(serverSrc).toMatch(/findProSubscriptionByProviderId\(supabase, preapprovalId\)/);
  });
});

describe('P1-1 — expired access is not a duplicate subscription', () => {
  const now = Date.parse('2026-10-26T12:00:00Z');

  it('blocks only an active paid period whose end is still in the future', () => {
    expect(hasCurrentPaidPeriod({ status: 'active', provider_subscription_id: 'PRE-1', current_period_end: '2026-11-01T00:00:00Z' }, now)).toBe(true);
    expect(hasCurrentPaidPeriod({ status: 'active', provider_subscription_id: 'PRE-1', current_period_end: '2026-10-25T00:00:00Z' }, now)).toBe(false);
    expect(hasCurrentPaidPeriod({ status: 'active', provider_subscription_id: null, current_period_end: '2026-11-01T00:00:00Z' }, now)).toBe(false);
    expect(hasCurrentPaidPeriod({ status: 'cancelled', provider_subscription_id: 'PRE-1', current_period_end: '2026-11-01T00:00:00Z' }, now)).toBe(false);
    expect(hasCurrentPaidPeriod(null, now)).toBe(false);
  });

  it('server.mjs gates hasActivePaid through the shared expiry helper', () => {
    expect(serverSrc).toMatch(/hasActivePaid = hasCurrentPaidPeriod\(subscription\)/);
  });
});

describe('P1-2 — provider link persistence errors are observable', () => {
  it('persists the canonical or pending provider id', async () => {
    const s = makeSupabase({ lawyer_subscriptions: [{ id: 'sub-1', status: 'pending', provider_subscription_id: null }] });
    const r1 = await persistCheckoutProviderLink(s, { subscriptionId: 'sub-1', preapprovalId: 'PRE-1', isUpgrade: false });
    expect(r1.ok).toBe(true);
    expect(s.state.lawyer_subscriptions[0].provider_subscription_id).toBe('PRE-1');

    const s2 = makeSupabase({ lawyer_subscriptions: [{ id: 'sub-2', plan: 'pro', status: 'active', provider_subscription_id: 'PRO-1', pending_provider_subscription_id: null, plan_change_status: 'upgrade_pending' }] });
    const r2 = await persistCheckoutProviderLink(s2, { subscriptionId: 'sub-2', preapprovalId: 'PLUS-1', initPoint: 'https://mp/checkout', isUpgrade: true });
    expect(r2.ok).toBe(true);
    expect(s2.state.lawyer_subscriptions[0].pending_provider_subscription_id).toBe('PLUS-1');
    expect(s2.state.lawyer_subscriptions[0].pending_init_point).toBe('https://mp/checkout');
  });

  it('reports a database error instead of silently succeeding', async () => {
    const s = makeSupabase({ lawyer_subscriptions: [{ id: 'sub-1', plan: 'pro', pending_provider_subscription_id: null, plan_change_status: 'upgrade_pending' }] }, { updateError: { code: 'XX000', message: 'db down' } });
    const r = await persistCheckoutProviderLink(s, { subscriptionId: 'sub-1', preapprovalId: 'PLUS-1', isUpgrade: true });
    expect(r.ok).toBe(false);
    expect(r.error?.code).toBe('XX000');
  });

  it('server.mjs checks the persistence result before returning checkout success', () => {
    expect(serverSrc).toMatch(/const providerLink = await persistCheckoutProviderLink/);
    expect(serverSrc).toMatch(/if \(!providerLink\.ok\)/);
  });
});

describe('Plus rejection — preserve an active Pro', () => {
  it('detects only the matching pending upgrade', () => {
    expect(isPendingPlusUpgrade({ plan_change_status: 'upgrade_pending', pending_provider_subscription_id: 'PLUS-1' }, 'PLUS-1')).toBe(true);
    expect(isPendingPlusUpgrade({ plan_change_status: 'upgrade_pending', pending_provider_subscription_id: 'PLUS-1' }, 'PLUS-2')).toBe(false);
    expect(isPendingPlusUpgrade({ plan_change_status: null, pending_provider_subscription_id: 'PLUS-1' }, 'PLUS-1')).toBe(false);
  });

  it('clears transition state without changing the Pro plan/status', async () => {
    const s = makeSupabase({ lawyer_subscriptions: [{ id: 'sub-1', plan: 'pro', status: 'active', provider_subscription_id: 'PRO-1', pending_provider_subscription_id: 'PLUS-1', plan_change_status: 'upgrade_pending', pending_plan: 'plus' }] });
    const r = await clearPendingPlusUpgrade(s, 'sub-1');
    expect(r.ok).toBe(true);
    const row = s.state.lawyer_subscriptions[0];
    expect(row.plan).toBe('pro');
    expect(row.status).toBe('active');
    expect(row.provider_subscription_id).toBe('PRO-1');
    expect(row.pending_provider_subscription_id).toBeNull();
    expect(row.plan_change_status).toBeNull();
  });

  it('reports database errors when clearing the upgrade', async () => {
    const s = makeSupabase({ lawyer_subscriptions: [{ id: 'sub-1' }] }, { updateError: { code: 'XX000', message: 'db down' } });
    const r = await clearPendingPlusUpgrade(s, 'sub-1');
    expect(r.ok).toBe(false);
    expect(r.error?.code).toBe('XX000');
  });

  it('server.mjs clears the upgrade for a rejected pending Plus payment', () => {
    expect(serverSrc).toMatch(/if \(isPendingPlusUpgrade\(subscription, preapprovalId\)\)/);
    expect(serverSrc).toMatch(/clearPendingPlusUpgrade\(supabase, subscription\.id\)/);
  });
});
