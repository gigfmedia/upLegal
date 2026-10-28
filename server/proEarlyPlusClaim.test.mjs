// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  canClaimEarlyPlusProvider,
  claimPendingPlusProvider,
  isTimelyEarlyPlusClaim,
  persistCheckoutProviderLink,
} from './subscriptions/proSubscriptionRouting.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverSrc = readFileSync(resolve(__dirname, '../server.mjs'), 'utf8');

function makeSupabase(seed, { updateError = null, readError = null } = {}) {
  const state = { lawyer_subscriptions: seed.map((row) => ({ ...row })) };
  const rows = () => state.lawyer_subscriptions;
  const from = () => {
    const q = { op: null, payload: null, filters: [], returning: false };
    const matches = (row) => q.filters.every(([column, value]) => (
      value === null ? row[column] == null : String(row[column] ?? '') === String(value)
    ));
    const exec = () => {
      if (q.op === 'update') {
        if (updateError) return { data: null, error: updateError };
        const found = rows().filter(matches);
        for (const row of found) Object.assign(row, q.payload);
        return { data: q.returning ? (found[0] ?? null) : null, error: null };
      }
      if (readError) return { data: null, error: readError };
      return { data: rows().find(matches) ?? null, error: null };
    };
    const api = {
      update(payload) { q.op = 'update'; q.payload = payload; return api; },
      select() { q.returning = true; if (!q.op) q.op = 'select'; return api; },
      eq(column, value) { q.filters.push([column, value]); return api; },
      is(column, value) { q.filters.push([column, value]); return api; },
      maybeSingle() { return Promise.resolve(exec()); },
      single() { return Promise.resolve(exec()); },
      then(res, rej) { return Promise.resolve(exec()).then(res, rej); },
    };
    return api;
  };
  return { state, from };
}

const upgradeRow = {
  id: 'sub-1',
  plan: 'pro',
  status: 'active',
  provider_subscription_id: 'PRO-1',
  pending_provider_subscription_id: null,
  plan_change_status: 'upgrade_pending',
};

describe('P1-5 — early Plus preapproval claim', () => {
  it('claims only an empty pending id during upgrade_pending', () => {
    expect(canClaimEarlyPlusProvider(upgradeRow, true)).toBe(true);
    expect(canClaimEarlyPlusProvider({ ...upgradeRow, pending_provider_subscription_id: 'OTHER' }, true)).toBe(false);
    expect(canClaimEarlyPlusProvider({ ...upgradeRow, plan_change_status: null }, true)).toBe(false);
    expect(canClaimEarlyPlusProvider(upgradeRow, false)).toBe(false);
  });

  it('atomically writes the pending id', async () => {
    const s = makeSupabase([{ ...upgradeRow }]);
    const result = await claimPendingPlusProvider(s, { subscriptionId: 'sub-1', preapprovalId: 'PLUS-1' });
    expect(result).toMatchObject({ ok: true, claimed: true });
    expect(s.state.lawyer_subscriptions[0].pending_provider_subscription_id).toBe('PLUS-1');
  });

  it('recognizes a concurrent claim of the same id without overwriting it', async () => {
    const s = makeSupabase([{ ...upgradeRow, pending_provider_subscription_id: 'PLUS-1' }]);
    const result = await claimPendingPlusProvider(s, { subscriptionId: 'sub-1', preapprovalId: 'PLUS-1' });
    expect(result).toMatchObject({ ok: true, claimed: false, alreadyLinked: true });
    expect(s.state.lawyer_subscriptions[0].pending_provider_subscription_id).toBe('PLUS-1');
  });

  it('refuses to replace a different pending checkout', async () => {
    const s = makeSupabase([{ ...upgradeRow, pending_provider_subscription_id: 'OTHER' }]);
    const result = await claimPendingPlusProvider(s, { subscriptionId: 'sub-1', preapprovalId: 'PLUS-1' });
    expect(result).toMatchObject({ ok: false, invalid: true, code: 'PROVIDER_LINK_CHANGED' });
    expect(s.state.lawyer_subscriptions[0].pending_provider_subscription_id).toBe('OTHER');
  });

  it('reports a database error as transient', async () => {
    const s = makeSupabase([{ ...upgradeRow }], { updateError: { code: 'XX000', message: 'db down' } });
    const result = await claimPendingPlusProvider(s, { subscriptionId: 'sub-1', preapprovalId: 'PLUS-1' });
    expect(result).toMatchObject({ ok: false, transient: true });
    expect(result.error?.code).toBe('XX000');
  });

  it('rejects a stale Plus preapproval for a brand-new upgrade', () => {
    const subscription = { ...upgradeRow, updated_at: '2026-10-26T12:00:00Z' };
    expect(isTimelyEarlyPlusClaim(subscription, { date_created: '2026-10-26T11:59:00Z' })).toBe(true);
    expect(isTimelyEarlyPlusClaim(subscription, { date_created: '2026-10-24T11:00:00Z' })).toBe(false);
    expect(isTimelyEarlyPlusClaim(subscription, {})).toBe(true);
    expect(isTimelyEarlyPlusClaim({ ...subscription, updated_at: null }, { date_created: '2020-01-01T00:00:00Z' })).toBe(true);
  });

  it('uses the early claim in the real webhook handler', () => {
    expect(serverSrc).toMatch(/canClaimEarlyPlusProvider\(subscription, isPlusRef\)/);
    expect(serverSrc).toMatch(/isTimelyEarlyPlusClaim\(subscription, preapproval\)/);
    expect(serverSrc).toMatch(/claimPendingPlusProvider\(supabase,/);
  });
});

describe('P1-5 — late checkout response cannot overwrite completion', () => {
  it('persists a normal upgrade link while still upgrade_pending', async () => {
    const s = makeSupabase([{ ...upgradeRow }]);
    const result = await persistCheckoutProviderLink(s, {
      subscriptionId: 'sub-1',
      preapprovalId: 'PLUS-1',
      initPoint: 'https://mp/checkout',
      isUpgrade: true,
    });
    expect(result.ok).toBe(true);
    expect(s.state.lawyer_subscriptions[0].pending_provider_subscription_id).toBe('PLUS-1');
    expect(s.state.lawyer_subscriptions[0].pending_init_point).toBe('https://mp/checkout');
  });

  it('does not re-add a pending id after the upgrade completed', async () => {
    const s = makeSupabase([{
      id: 'sub-1',
      plan: 'plus',
      status: 'active',
      provider_subscription_id: 'PLUS-1',
      pending_provider_subscription_id: null,
      pending_init_point: null,
      plan_change_status: null,
    }]);
    const result = await persistCheckoutProviderLink(s, {
      subscriptionId: 'sub-1',
      preapprovalId: 'PLUS-1',
      initPoint: 'https://mp/checkout',
      isUpgrade: true,
    });
    expect(result).toMatchObject({ ok: true, alreadyCompleted: true });
    expect(s.state.lawyer_subscriptions[0].pending_provider_subscription_id).toBeNull();
    expect(s.state.lawyer_subscriptions[0].pending_init_point).toBeNull();
  });

  it('accepts an id already claimed by the early webhook without rewriting it', async () => {
    const s = makeSupabase([{
      ...upgradeRow,
      pending_provider_subscription_id: 'PLUS-1',
      pending_init_point: 'https://mp/original',
    }]);
    const result = await persistCheckoutProviderLink(s, {
      subscriptionId: 'sub-1',
      preapprovalId: 'PLUS-1',
      initPoint: 'https://mp/late',
      isUpgrade: true,
    });
    expect(result).toMatchObject({ ok: true, alreadyLinked: true });
    expect(s.state.lawyer_subscriptions[0].pending_init_point).toBe('https://mp/original');
  });

  it('stores the checkout URL when a pending webhook claimed the id first', async () => {
    const s = makeSupabase([{
      ...upgradeRow,
      pending_provider_subscription_id: 'PLUS-1',
      pending_init_point: null,
    }]);
    const result = await persistCheckoutProviderLink(s, {
      subscriptionId: 'sub-1',
      preapprovalId: 'PLUS-1',
      initPoint: 'https://mp/late',
      isUpgrade: true,
    });
    expect(result).toMatchObject({ ok: true, alreadyLinked: true });
    expect(s.state.lawyer_subscriptions[0].pending_provider_subscription_id).toBe('PLUS-1');
    expect(s.state.lawyer_subscriptions[0].pending_init_point).toBe('https://mp/late');
  });

  it('fails closed when another checkout replaced the pending id', async () => {
    const s = makeSupabase([{ ...upgradeRow, pending_provider_subscription_id: 'OTHER' }]);
    const result = await persistCheckoutProviderLink(s, {
      subscriptionId: 'sub-1',
      preapprovalId: 'PLUS-1',
      isUpgrade: true,
    });
    expect(result).toMatchObject({ ok: false, reason: 'checkout_state_changed' });
  });

  it('accepts a non-upgrade canonical id already written by a fast webhook', async () => {
    const s = makeSupabase([{
      id: 'sub-1',
      plan: 'plus',
      status: 'active',
      provider_subscription_id: 'PLUS-1',
      pending_provider_subscription_id: null,
      plan_change_status: null,
    }]);
    const result = await persistCheckoutProviderLink(s, {
      subscriptionId: 'sub-1',
      preapprovalId: 'PLUS-1',
      isUpgrade: false,
    });
    expect(result).toMatchObject({ ok: true, alreadyLinked: true });
  });

  it('reports DB errors instead of returning checkout success', async () => {
    const s = makeSupabase([{ ...upgradeRow }], { updateError: { code: 'XX000', message: 'db down' } });
    const result = await persistCheckoutProviderLink(s, {
      subscriptionId: 'sub-1',
      preapprovalId: 'PLUS-1',
      isUpgrade: true,
    });
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('XX000');
  });
});
