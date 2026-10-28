// @vitest-environment node
//
// Pure unit tests for the PROPOSED subscription_events retry/ordering semantics.
// These import the REAL production helpers (server/subscriptions/subscriptionEvents.mjs
// and server/subscriptions/proPreapprovalEvent.mjs) — not copies — so a green
// run here is evidence about the code that ships.
//
// The mock supabase below implements SQL LIKE faithfully ('%' = any run, '_' =
// any single char, '\' = escape) so the scoped `shouldApplyEvent` prefix is
// exercised exactly as Postgres would evaluate it.
import { describe, it, expect } from 'vitest';
import {
  tryInsertSubscriptionEvent,
  shouldApplyEvent,
  escapeLikePattern,
  RETRY_LEASE_MS,
} from './subscriptionEvents.mjs';
import { shouldProcessEvent } from './proPreapprovalEvent.mjs';

// ---- SQL LIKE (mirrors Postgres: default escape is backslash) ---------------
function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function sqlLike(pattern, value) {
  let re = '^';
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === '\\') { i++; re += escapeRegExp(pattern[i] ?? ''); }
    else if (c === '%') re += '.*';
    else if (c === '_') re += '.';
    else re += escapeRegExp(c);
  }
  return new RegExp(re + '$').test(value);
}

function makeSupabase(seed = { subscription_events: [], lawyer_subscriptions: [], pro_founder_reservations: [] }) {
  const state = {
    subscription_events: [...seed.subscription_events],
    lawyer_subscriptions: [...seed.lawyer_subscriptions],
    pro_founder_reservations: [...seed.pro_founder_reservations],
  };
  function exec(q) {
    const rows = state[q.table] || (state[q.table] = []);
    const match = (r) => q.filters.every(([c, v]) =>
      (v && typeof v === 'object' && v.__like != null) ? sqlLike(v.__like, String(r[c] ?? '')) : String(r[c]) === String(v));
    if (q._op === 'insert') {
      const row = q._payload;
      const dup = rows.some((r) => r.provider === row.provider && String(r.provider_event_id) === String(row.provider_event_id) && r.product_type === row.product_type);
      if (dup) return { data: null, error: { code: '23505' } };
      rows.push({ created_at: new Date().toISOString(), ...row });
      return { data: null, error: null };
    }
    if (q._op === 'update') {
      const found = rows.filter(match);
      for (const r of found) Object.assign(r, q._payload);
      return { data: found, error: null };
    }
    if (q._op === 'delete') { state[q.table] = rows.filter((r) => !match(r)); return { data: null, error: null }; }
    let out = rows.filter(match);
    if (q._order) out = [...out].sort((a, b) => (q._order.ascending ? 1 : -1) * (new Date(a[q._order.col]) - new Date(b[q._order.col])));
    if (q._limit) out = out.slice(0, q._limit);
    return { data: q._single ? (out[0] ?? null) : out, error: null };
  }
  function from(table) {
    const q = { table, filters: [], _op: null, _payload: null, _order: null, _limit: null, _single: false };
    const api = {
      insert(row) { q._op = 'insert'; q._payload = row; return api; },
      update(row) { q._op = 'update'; q._payload = row; return api; },
      delete() { q._op = 'delete'; return api; },
      select() { if (!q._op) q._op = 'select'; return api; },
      eq(c, v) { q.filters.push([c, v]); return api; },
      like(c, pat) { q.filters.push([c, { __like: pat }]); return api; },
      order(c, { ascending }) { q._order = { col: c, ascending }; return api; },
      limit(n) { q._limit = n; return api; },
      maybeSingle() { q._single = true; return Promise.resolve(exec(q)); },
      single() { q._single = true; return Promise.resolve(exec(q)); },
      then(res, rej) { return Promise.resolve(exec(q)).then(res, rej); },
    };
    return api;
  }
  return { from, state };
}

const ev = (over) => ({
  product_type: 'pro', subscription_id: 'sub-1', provider: 'mercadopago',
  provider_event_id: 'e', event_type: 'payment_approved', provider_event_at: '2026-10-22T20:00:00Z',
  status: 'processed', created_at: '2026-10-22T20:00:00Z', ...over,
});

describe('Capa 2 — tryInsertSubscriptionEvent retry/lease contract', () => {
  it('first insert is inserted=true, pending', async () => {
    const s = makeSupabase();
    const r = await tryInsertSubscriptionEvent(s, { productType: 'pro', subscriptionId: 'sub-1', providerEventId: 'E1', providerEventAt: '2026-10-22T10:00:00Z', eventType: 'preapproval_authorized', providerStatus: 'authorized' });
    expect(r.inserted).toBe(true);
    expect(r.status).toBe('pending');
  });

  it('duplicate of a processed event is terminal (not retryable)', async () => {
    const s = makeSupabase({ subscription_events: [ev({ provider_event_id: 'E1', status: 'processed' })], lawyer_subscriptions: [], pro_founder_reservations: [] });
    const r = await tryInsertSubscriptionEvent(s, { productType: 'pro', subscriptionId: 'sub-1', providerEventId: 'E1', providerEventAt: '2026-10-22T10:00:00Z', eventType: 'payment_approved', providerStatus: 'approved' });
    expect(r).toMatchObject({ inserted: false, status: 'processed' });
    expect(r.retryable).toBeUndefined();
  });

  it('duplicate of a failed event is retryable', async () => {
    const s = makeSupabase({ subscription_events: [ev({ provider_event_id: 'E1', status: 'failed' })], lawyer_subscriptions: [], pro_founder_reservations: [] });
    const r = await tryInsertSubscriptionEvent(s, { productType: 'pro', subscriptionId: 'sub-1', providerEventId: 'E1', providerEventAt: '2026-10-22T10:00:00Z', eventType: 'payment_approved', providerStatus: 'approved' });
    expect(r.retryable).toBe(true);
    expect(r.status).toBe('failed');
  });

  it('duplicate of a FRESH pending event is retryable but NOT stale (in-flight)', async () => {
    const s = makeSupabase({ subscription_events: [ev({ provider_event_id: 'E1', status: 'pending', created_at: new Date().toISOString() })], lawyer_subscriptions: [], pro_founder_reservations: [] });
    const r = await tryInsertSubscriptionEvent(s, { productType: 'pro', subscriptionId: 'sub-1', providerEventId: 'E1', providerEventAt: '2026-10-22T10:00:00Z', eventType: 'payment_approved', providerStatus: 'approved' });
    expect(r.retryable).toBe(true);
    expect(r.stale).toBe(false);
  });

  it('duplicate of an OLD pending event is stale (abandoned)', async () => {
    const s = makeSupabase({ subscription_events: [ev({ provider_event_id: 'E1', status: 'pending', created_at: new Date(Date.now() - RETRY_LEASE_MS - 60_000).toISOString() })], lawyer_subscriptions: [], pro_founder_reservations: [] });
    const r = await tryInsertSubscriptionEvent(s, { productType: 'pro', subscriptionId: 'sub-1', providerEventId: 'E1', providerEventAt: '2026-10-22T10:00:00Z', eventType: 'payment_approved', providerStatus: 'approved' });
    expect(r.retryable).toBe(true);
    expect(r.stale).toBe(true);
  });
});

describe('Capa 1 — shouldProcessEvent gate (real export)', () => {
  it('inserted -> process', () => expect(shouldProcessEvent({ inserted: true })).toBe(true));
  it('processed -> skip', () => expect(shouldProcessEvent({ inserted: false, status: 'processed' })).toBe(false));
  it('unknown non-retryable -> skip', () => expect(shouldProcessEvent({ inserted: false, status: 'unknown' })).toBe(false));
  it('failed -> process', () => expect(shouldProcessEvent({ inserted: false, status: 'failed', retryable: true })).toBe(true));
  it('pending fresh -> skip (do not compete)', () => expect(shouldProcessEvent({ inserted: false, status: 'pending', retryable: true, stale: false })).toBe(false));
  it('pending stale -> process', () => expect(shouldProcessEvent({ inserted: false, status: 'pending', retryable: true, stale: true })).toBe(true));
});

describe('Capa 2 — escapeLikePattern (literal underscores)', () => {
  it('escapes _ % and backslash', () => {
    expect(escapeLikePattern('plus_preapproval')).toBe('plus\\_preapproval');
    expect(escapeLikePattern('a%b_c\\d')).toBe('a\\%b\\_c\\\\d');
  });
  it('naive (unescaped) LIKE over-matches on a literal underscore; escaped does not', () => {
    // 'plus_preapproval' contains a LITERAL underscore: unescaped, '_' is a
    // single-char wildcard and the pattern would also match an unrelated type.
    expect(sqlLike('plus_preapproval%', 'plusXpreapproval_authorized')).toBe(true); // '_' wildcard bug
    expect(sqlLike(escapeLikePattern('plus_preapproval') + '%', 'plusXpreapproval_authorized')).toBe(false);
    expect(sqlLike(escapeLikePattern('plus_preapproval') + '%', 'plus_preapproval_authorized')).toBe(true);
  });
  it('family prefixes are mutually disjoint on the real event_type values', () => {
    const real = ['payment_approved', 'preapproval_pending', 'preapproval_authorized', 'preapproval_paused', 'preapproval_cancelled', 'plus_preapproval_authorized'];
    const test = (prefix, v) => sqlLike(escapeLikePattern(prefix) + '%', v);
    for (const v of real) {
      const p = test('preapproval', v);
      const pl = test('plus_preapproval', v);
      const pay = test('payment', v);
      // exactly one family can claim a given event_type
      expect([p, pl, pay].filter(Boolean).length).toBe(1);
    }
  });
});

describe('Capa 2 — shouldApplyEvent scoping does not move the payment/AI baselines', () => {
  // Real event_type values, one subscription, mixed processed rows.
  const seed = () => makeSupabase({
    subscription_events: [
      ev({ provider_event_id: 'pay', event_type: 'payment_approved', provider_event_at: '2026-10-22T20:00:00Z' }),
      ev({ provider_event_id: 'pre', event_type: 'preapproval_authorized', provider_event_at: '2026-10-22T21:00:00Z' }),
      ev({ provider_event_id: 'plus', event_type: 'plus_preapproval_authorized', provider_event_at: '2026-10-22T22:00:00Z' }),
      ev({ product_type: 'ai', subscription_id: 'ai-1', provider_event_id: 'aipay', event_type: 'payment_approved', provider_event_at: '2026-10-22T23:00:00Z' }),
    ],
    lawyer_subscriptions: [], pro_founder_reservations: [],
  });

  it('HAZARD: unscoped baseline (plus 22:00) drops a legitimate 20:30 payment', async () => {
    const s = seed();
    expect(await shouldApplyEvent(s, { productType: 'pro', subscriptionId: 'sub-1', providerEventAt: '2026-10-22T20:30:00Z' })).toBe(false);
  });
  it('FIX: scoped payment baseline (20:00) keeps the 20:30 payment', async () => {
    const s = seed();
    expect(await shouldApplyEvent(s, { productType: 'pro', subscriptionId: 'sub-1', providerEventAt: '2026-10-22T20:30:00Z', eventTypePrefix: 'payment' })).toBe(true);
  });
  it('preapproval scope ignores the plus and payment rows', async () => {
    const s = seed();
    expect(await shouldApplyEvent(s, { productType: 'pro', subscriptionId: 'sub-1', providerEventAt: '2026-10-22T21:30:00Z', eventTypePrefix: 'preapproval' })).toBe(true);
    expect(await shouldApplyEvent(s, { productType: 'pro', subscriptionId: 'sub-1', providerEventAt: '2026-10-22T20:30:00Z', eventTypePrefix: 'preapproval' })).toBe(false);
  });
  it('plus scope is independent of the pro preapproval row', async () => {
    const s = seed();
    // plus baseline = 22:00 only; the pro preapproval row (21:00) must not count
    expect(await shouldApplyEvent(s, { productType: 'pro', subscriptionId: 'sub-1', providerEventAt: '2026-10-22T22:30:00Z', eventTypePrefix: 'plus_preapproval' })).toBe(true);
    expect(await shouldApplyEvent(s, { productType: 'pro', subscriptionId: 'sub-1', providerEventAt: '2026-10-22T21:30:00Z', eventTypePrefix: 'plus_preapproval' })).toBe(false);
  });
  it('AI baseline (product_type=ai) is isolated and unchanged by pro scoping', async () => {
    const s = seed();
    // AI calls shouldApplyEvent WITHOUT a prefix (unchanged path)
    expect(await shouldApplyEvent(s, { productType: 'ai', subscriptionId: 'ai-1', providerEventAt: '2026-10-22T23:30:00Z' })).toBe(true);
    expect(await shouldApplyEvent(s, { productType: 'ai', subscriptionId: 'ai-1', providerEventAt: '2026-10-22T22:30:00Z' })).toBe(false);
  });
});
