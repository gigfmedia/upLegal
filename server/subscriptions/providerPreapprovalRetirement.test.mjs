// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, it, expect, vi } from 'vitest';
import {
  needsProviderRetirement,
  prepareExpiredSubscriptionForCheckout,
  retireProviderPreapproval,
} from './providerPreapprovalRetirement.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverSrc = readFileSync(resolve(__dirname, '../../server.mjs'), 'utf8');

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

const okCancel = async () => ({ ok: true, status: 200, body: { status: 'cancelled' } });
const cancelledGet = async () => ({ cancelled: true, status: 200, body: { status: 'cancelled' } });

describe('previous provider retirement', () => {
  const now = Date.parse('2026-10-26T12:00:00Z');
  const expired = {
    id: 'sub-1',
    status: 'active',
    provider_subscription_id: 'PRO-1',
    previous_provider_subscription_id: null,
    current_period_end: '2026-10-01T00:00:00Z',
  };

  it('requires retirement only when no paid period is current and an id exists', () => {
    expect(needsProviderRetirement(expired, now)).toBe(true);
    expect(needsProviderRetirement({ ...expired, current_period_end: '2026-11-01T00:00:00Z' }, now)).toBe(false);
    expect(needsProviderRetirement({ ...expired, provider_subscription_id: null }, now)).toBe(false);
    expect(needsProviderRetirement({ ...expired, status: 'pending' }, now)).toBe(true);
  });

  it('accepts an already-cancelled response without a second provider read', async () => {
    const reconcile = vi.fn();
    const result = await retireProviderPreapproval({
      preapprovalId: 'PRO-1',
      accessToken: 'token',
      cancel: okCancel,
      reconcile,
    });
    expect(result).toMatchObject({ ok: true, state: 'cancelled' });
    expect(reconcile).not.toHaveBeenCalled();
  });

  it('confirms cancellation through GET when PUT is accepted without a terminal body', async () => {
    const result = await retireProviderPreapproval({
      preapprovalId: 'PRO-1',
      accessToken: 'token',
      cancel: async () => ({ ok: true, status: 200, body: { status: 'authorized' } }),
      reconcile: cancelledGet,
    });
    expect(result).toMatchObject({ ok: true, state: 'cancelled' });
  });

  it('confirms an already-cancelled hint through GET', async () => {
    const result = await retireProviderPreapproval({
      preapprovalId: 'PRO-1',
      accessToken: 'token',
      cancel: async () => ({ ok: false, status: 400, alreadyCancelledHint: true }),
      reconcile: cancelledGet,
    });
    expect(result).toMatchObject({ ok: true, state: 'cancelled' });
  });

  it('treats a verified 404 as no live mandate', async () => {
    const result = await retireProviderPreapproval({
      preapprovalId: 'PRO-1',
      accessToken: 'token',
      cancel: async () => ({ ok: false, status: 404, body: { message: 'not found' } }),
      reconcile: async () => ({ cancelled: false, status: 404, body: { message: 'not found' } }),
    });
    expect(result).toMatchObject({ ok: true, state: 'not_found' });
  });

  it('fails closed on network ambiguity', async () => {
    const result = await retireProviderPreapproval({
      preapprovalId: 'PRO-1',
      accessToken: 'token',
      cancel: async () => ({ ok: false, status: 0, networkError: true }),
      reconcile: async () => ({ cancelled: false, networkError: true }),
    });
    expect(result).toMatchObject({ ok: false, transient: true, code: 'PROVIDER_UNREACHABLE' });
  });

  it('fails closed when the provider still reports a non-cancelled status', async () => {
    const result = await retireProviderPreapproval({
      preapprovalId: 'PRO-1',
      accessToken: 'token',
      cancel: async () => ({ ok: false, status: 500, body: { message: 'upstream' } }),
      reconcile: async () => ({ cancelled: false, status: 200, body: { status: 'authorized' } }),
    });
    expect(result).toMatchObject({ ok: false, transient: true, code: 'PROVIDER_UNAVAILABLE' });
  });

  it('reports provider auth failures as definitive, never as a successful retirement', async () => {
    const result = await retireProviderPreapproval({
      preapprovalId: 'PRO-1',
      accessToken: 'token',
      cancel: async () => ({ ok: false, status: 401, body: { message: 'unauthorized' } }),
      reconcile: async () => ({ cancelled: false, status: 401, body: { message: 'unauthorized' } }),
    });
    expect(result).toMatchObject({ ok: false, transient: false, code: 'PROVIDER_AUTH' });
  });

  it('retires every prior id before clearing both links', async () => {
    const s = makeSupabase([{
      ...expired,
      previous_provider_subscription_id: 'OLD-1',
    }]);
    const canceled = [];
    const result = await prepareExpiredSubscriptionForCheckout({
      supabase: s,
      subscription: s.state.lawyer_subscriptions[0],
      accessToken: 'token',
      cancel: async ({ preapprovalId }) => { canceled.push(preapprovalId); return okCancel(); },
      reconcile: cancelledGet,
      now: new Date(now),
    });
    expect(result.ok).toBe(true);
    expect(result.retiredIds).toEqual(['PRO-1', 'OLD-1']);
    expect(canceled).toEqual(['PRO-1', 'OLD-1']);
    expect(s.state.lawyer_subscriptions[0].provider_subscription_id).toBeNull();
    expect(s.state.lawyer_subscriptions[0].previous_provider_subscription_id).toBeNull();
  });

  it('deduplicates the same canonical/previous id', async () => {
    const s = makeSupabase([{
      ...expired,
      previous_provider_subscription_id: 'PRO-1',
    }]);
    const cancel = vi.fn(okCancel);
    const result = await prepareExpiredSubscriptionForCheckout({
      supabase: s,
      subscription: s.state.lawyer_subscriptions[0],
      accessToken: 'token',
      cancel,
      reconcile: cancelledGet,
      now: new Date(now),
    });
    expect(result.ok).toBe(true);
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('does not clear links when any cancellation is unconfirmed', async () => {
    const s = makeSupabase([{
      ...expired,
      previous_provider_subscription_id: 'OLD-1',
    }]);
    const result = await prepareExpiredSubscriptionForCheckout({
      supabase: s,
      subscription: s.state.lawyer_subscriptions[0],
      accessToken: 'token',
      cancel: async ({ preapprovalId }) => {
        if (preapprovalId === 'OLD-1') return { ok: false, status: 503, body: { message: 'down' } };
        return okCancel();
      },
      reconcile: async () => ({ cancelled: false, status: 503, networkError: true }),
      now: new Date(now),
    });
    expect(result.ok).toBe(false);
    expect(s.state.lawyer_subscriptions[0].provider_subscription_id).toBe('PRO-1');
    expect(s.state.lawyer_subscriptions[0].previous_provider_subscription_id).toBe('OLD-1');
  });

  it('does not report success when the local link clear fails', async () => {
    const s = makeSupabase([{ ...expired }], { updateError: { code: 'XX000', message: 'db down' } });
    const result = await prepareExpiredSubscriptionForCheckout({
      supabase: s,
      subscription: s.state.lawyer_subscriptions[0],
      accessToken: 'token',
      cancel: okCancel,
      reconcile: cancelledGet,
      now: new Date(now),
    });
    expect(result).toMatchObject({ ok: false, code: 'DB_ERROR', transient: true });
  });

  it('runs retirement before the new checkout POST', () => {
    const retirement = serverSrc.indexOf('prepareExpiredSubscriptionForCheckout({');
    const post = serverSrc.indexOf("fetch('https://api.mercadopago.com/preapproval', {", retirement);
    expect(retirement).toBeGreaterThan(-1);
    expect(post).toBeGreaterThan(-1);
    expect(retirement).toBeLessThan(post);
    expect(serverSrc).toMatch(/PREVIOUS_PROVIDER_NOT_RETIRED/);
  });
});
