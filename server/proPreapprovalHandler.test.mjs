// @vitest-environment node
//
// INTEGRATION tests for the PROPOSED Pro/Plus preapproval orchestration.
//
// These import the REAL production module
//   server/subscriptions/proPreapprovalEvent.mjs
// (the exact file server.mjs delegates to) and the REAL helper
//   server/subscriptions/subscriptionEvents.mjs
// so a green run is evidence about the code that ships — NOT about a replica.
// Only the transport (supabase) and the side-effect deps (analytics/email/Plus
// completer) are mocked; the orchestration, gate, ordering, marking and branch
// logic under test are the production implementations.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { processProPreapprovalEvent, processPlusPreapprovalEvent } from './subscriptions/proPreapprovalEvent.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const moduleSrc = readFileSync(resolve(__dirname, 'subscriptions/proPreapprovalEvent.mjs'), 'utf8');
const serverSrc = readFileSync(resolve(__dirname, '../server.mjs'), 'utf8');

// ---- SQL LIKE faithful mock supabase ---------------------------------------
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
function makeSupabase(seed = {}, { updateError = null } = {}) {
  const state = {
    subscription_events: seed.subscription_events ? [...seed.subscription_events] : [],
    lawyer_subscriptions: seed.lawyer_subscriptions ? [...seed.lawyer_subscriptions] : [],
    pro_founder_reservations: seed.pro_founder_reservations ? [...seed.pro_founder_reservations] : [],
    subscription_effects: seed.subscription_effects ? [...seed.subscription_effects] : [],
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
      if (updateError) return { data: null, error: updateError };
      for (const r of rows.filter(match)) Object.assign(r, q._payload);
      return { data: null, error: null };
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

  let effectSeq = 0;
  async function rpc(name, params = {}) {
    const now = Date.now();
    const findEvent = () => state.subscription_events.find((r) =>
      r.provider === (params.p_provider || 'mercadopago')
      && String(r.provider_event_id) === String(params.p_event_id)
      && r.product_type === params.p_product_type);
    if (name === 'claim_subscription_event') {
      const row = findEvent();
      if (!row) return { data: null, error: null };
      const leaseExpired = !row.lease_expires_at || Date.parse(row.lease_expires_at) < now;
      const claimable = row.status === 'pending' || row.status === 'failed'
        || (row.status === 'processing' && leaseExpired);
      if (!claimable) {
        return { data: [{ claimed: false, reason: row.status === 'processing' ? 'busy' : 'terminal', event_id: row.id || null, claim_token: null, attempts: row.attempts || 0 }], error: null };
      }
      row.status = 'processing';
      row.claimed_at = new Date(now).toISOString();
      row.lease_expires_at = new Date(now + (params.p_lease_seconds ?? 600) * 1000).toISOString();
      row.attempts = (row.attempts || 0) + 1;
      row.claim_token = `tok-${row.attempts}-${Math.random().toString(36).slice(2, 8)}`;
      return { data: [{ claimed: true, reason: 'claimed', event_id: row.id || null, claim_token: row.claim_token, attempts: row.attempts }], error: null };
    }
    if (name === 'complete_subscription_event') {
      const row = findEvent();
      if (!row || row.status !== 'processing' || row.claim_token !== params.p_claim_token) return { data: 0, error: null };
      row.status = 'processed';
      row.claim_token = null;
      row.processed_at = new Date(now).toISOString();
      row.effects_at = row.processed_at;
      row.lease_expires_at = null;
      let inserted = 0;
      for (const e of (params.p_effects || [])) {
        const key = {
          product_type: row.product_type,
          subscription_id: row.subscription_id,
          effect_type: e.effect_type,
          transition_key: e.transition_key,
        };
        const dup = state.subscription_effects.some((x) =>
          x.product_type === key.product_type && x.subscription_id === key.subscription_id
          && x.effect_type === key.effect_type && x.transition_key === key.transition_key);
        if (!dup) {
          state.subscription_effects.push({
            id: `eff-${++effectSeq}`, ...key, event_id: row.id || null,
            payload: e.payload || {}, status: 'pending', attempts: 0,
            next_attempt_at: new Date(now).toISOString(),
            created_at: new Date(now).toISOString(),
          });
          inserted++;
        }
      }
      return { data: inserted, error: null };
    }
    if (name === 'fail_subscription_event') {
      const row = findEvent();
      if (!row || row.status !== 'processing' || row.claim_token !== params.p_claim_token) return { data: false, error: null };
      row.status = 'failed';
      row.claim_token = null;
      row.last_error = params.p_error;
      row.lease_expires_at = null;
      return { data: true, error: null };
    }
    if (name === 'claim_subscription_effect') {
      const max = params.p_max_attempts ?? 8;
      const due = state.subscription_effects
        .filter((e) => e.attempts < max && (
          (['pending', 'failed'].includes(e.status) && Date.parse(e.next_attempt_at) <= now)
          || (e.status === 'processing' && (!e.lease_expires_at || Date.parse(e.lease_expires_at) < now))))
        .sort((a, b) => Date.parse(a.next_attempt_at) - Date.parse(b.next_attempt_at))[0];
      if (!due) return { data: null, error: null };
      due.status = 'processing';
      due.claimed_at = new Date(now).toISOString();
      due.lease_expires_at = new Date(now + (params.p_lease_seconds ?? 120) * 1000).toISOString();
      due.attempts += 1;
      due.last_error = null;
      due.claim_token = `efftok-${due.attempts}-${Math.random().toString(36).slice(2, 8)}`;
      return { data: [{ effect_id: due.id, product_type: due.product_type, subscription_id: due.subscription_id, effect_type: due.effect_type, transition_key: due.transition_key, payload: due.payload, claim_token: due.claim_token, attempts: due.attempts }], error: null };
    }
    if (name === 'complete_subscription_effect') {
      const e = state.subscription_effects.find((x) => x.id === params.p_id);
      if (!e || e.status !== 'processing' || e.claim_token !== params.p_claim_token) return { data: false, error: null };
      e.status = 'sent';
      e.claim_token = null;
      e.sent_at = new Date(now).toISOString();
      e.lease_expires_at = null;
      return { data: true, error: null };
    }
    if (name === 'fail_subscription_effect') {
      const e = state.subscription_effects.find((x) => x.id === params.p_id);
      if (!e || e.status !== 'processing' || e.claim_token !== params.p_claim_token) return { data: false, error: null };
      e.status = 'failed';
      e.claim_token = null;
      e.last_error = params.p_error;
      e.next_attempt_at = new Date(now + (params.p_backoff_seconds ?? 60) * 1000).toISOString();
      e.lease_expires_at = null;
      return { data: true, error: null };
    }
    return { data: null, error: null };
  }
  return { from, rpc, state };
}

function makeDeps() {
  const calls = { posthog: [], emails: [] };
  return {
    calls,
    deps: {
      getProLawyerEmail: async () => ({ email: 'lawyer@example.com' }),
      priceClp: 19990,
      effectHandlers: {
        analytics: async (p) => {
          if (calls.posthogThrow) throw new Error('posthog down');
          calls.posthog.push({ event: p.event, id: p.lawyer_id, props: p.props });
        },
        email_welcome: async (p) => {
          const u = await (async () => ({ email: 'lawyer@example.com' }))();
          calls.emails.push({ to: u.email, subj: p.subject });
        },
      },
    },
  };
}
function makePlusDeps() {
  const calls = { posthog: [], upgrades: [] };
  return {
    calls,
    deps: {
      completePlusUpgrade: async (subscription, preapproval) => { calls.upgrades.push({ subscriptionId: subscription.id, preapprovalId: preapproval.id }); return { ok: true }; },
      effectHandlers: {
        analytics: async (p) => { calls.posthog.push({ event: p.event, id: p.lawyer_id, props: p.props }); },
      },
    },
  };
}

const SUB = { id: 'sub-1', lawyer_id: 'ly-1', plan: 'saas_essential', status: 'pending', cancelled_at: null, provider_subscription_id: 'PRE-1' };
const subRow = (s) => s.state.lawyer_subscriptions[0];
const evRow = (s, id) => s.state.subscription_events.find((r) => r.provider_event_id === id);
const pre = (status, at, id = 'PRE-1') => ({ id, status, date_created: at, last_modified: at, auto_recurring: { start_date: at }, next_payment_date: '2026-11-22T00:00:00.000Z' });

describe('Pro preapproval orchestrator (real module)', () => {
  it('first authorized activates, clears cancelled_at, and runs effects once', async () => {
    const s = makeSupabase({ lawyer_subscriptions: [{ ...SUB }] });
    const { calls, deps } = makeDeps();
    const r = await processProPreapprovalEvent({ supabase: s, subscription: subRow(s), preapproval: pre('authorized', '2026-10-22T10:00:00Z'), deps });
    expect(r.ok).toBe(true);
    expect(subRow(s).status).toBe('active');
    expect(subRow(s).cancelled_at).toBeNull();
    expect(evRow(s, 'PRE-1:authorized:2026-10-22T10:00:00Z').status).toBe('processed');
    expect(calls.posthog).toHaveLength(1);
    expect(calls.emails).toHaveLength(1);
  });

  it('a DB error updating the subscription fails the event instead of completing it', async () => {
    const s = makeSupabase({ lawyer_subscriptions: [{ ...SUB }] }, { updateError: { message: 'db_down' } });
    const { calls, deps } = makeDeps();

    await expect(processProPreapprovalEvent({
      supabase: s,
      subscription: subRow(s),
      preapproval: pre('authorized', '2026-10-22T10:00:00Z'),
      deps,
    })).rejects.toThrow('db_down');

    const ev = evRow(s, 'PRE-1:authorized:2026-10-22T10:00:00Z');
    expect(ev.status).toBe('failed');
    expect(ev.last_error).toMatch(/db_down/);
    expect(subRow(s).status).toBe('pending');
    expect(calls.posthog).toHaveLength(0);
    expect(calls.emails).toHaveLength(0);
  });

  it('duplicate of a processed event is a no-op', async () => {
    const s = makeSupabase({ lawyer_subscriptions: [{ ...SUB }] });
    const { calls, deps } = makeDeps();
    const p = pre('authorized', '2026-10-22T10:00:00Z');
    await processProPreapprovalEvent({ supabase: s, subscription: subRow(s), preapproval: p, deps });
    const r2 = await processProPreapprovalEvent({ supabase: s, subscription: subRow(s), preapproval: p, deps });
    expect(r2.skipped).toBe('terminal');
    expect(r2.retry).toBeUndefined();
    expect(calls.posthog).toHaveLength(1);
    expect(calls.emails).toHaveLength(1);
  });

  it('a failing side effect does not fail the event: it is retried from the outbox', async () => {
    const s = makeSupabase({ lawyer_subscriptions: [{ ...SUB }] });
    const { calls, deps } = makeDeps();
    calls.posthogThrow = true;
    const r = await processProPreapprovalEvent({ supabase: s, subscription: subRow(s), preapproval: pre('authorized', '2026-10-22T10:00:00Z'), deps });
    expect(r.ok).toBe(true);
    const id = 'PRE-1:authorized:2026-10-22T10:00:00Z';
    // The event is committed as processed; only the effect is pending retry.
    expect(evRow(s, id).status).toBe('processed');
    expect(subRow(s).status).toBe('active');
    const analytics = s.state.subscription_effects.find((e) => e.effect_type === 'analytics');
    const email = s.state.subscription_effects.find((e) => e.effect_type === 'email_welcome');
    expect(analytics.status).toBe('failed');
    expect(analytics.last_error).toMatch(/posthog down/);
    expect(email.status).toBe('sent');
    expect(calls.posthog).toHaveLength(0);
    expect(calls.emails).toHaveLength(1);
    // Retry window: the failed effect is reclaimed and sent exactly once.
    analytics.next_attempt_at = new Date(Date.now() - 1000).toISOString();
    calls.posthogThrow = false;
    const { drainSubscriptionEffects } = await import('./subscriptions/subscriptionEffects.mjs');
    await drainSubscriptionEffects(s, deps.effectHandlers);
    expect(s.state.subscription_effects.find((e) => e.id === analytics.id).status).toBe('sent');
    expect(calls.posthog).toHaveLength(1);
    expect(calls.emails).toHaveLength(1);
  });

  it('fresh pending duplicate is skipped (in-flight); lease-expired pending is processed', async () => {
    const s = makeSupabase({ lawyer_subscriptions: [{ ...SUB }] });
    const { calls, deps } = makeDeps();
    s.state.subscription_events.push({ product_type: 'pro', subscription_id: 'sub-1', provider: 'mercadopago', provider_event_id: 'PRE-1:authorized:2026-10-22T10:00:00Z', provider_event_at: '2026-10-22T10:00:00Z', event_type: 'preapproval_authorized', status: 'processing', claimed_at: new Date().toISOString(), lease_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), attempts: 1, created_at: new Date().toISOString() });
    const rf = await processProPreapprovalEvent({ supabase: s, subscription: subRow(s), preapproval: pre('authorized', '2026-10-22T10:00:00Z'), deps });
    expect(rf).toMatchObject({ skipped: 'busy', retry: true });
    expect(calls.posthog).toHaveLength(0);
    // The original delivery still owns the lease; a competing retry must not
    // steal it or add effects while the lease is live.
    expect(s.state.subscription_events[0].status).toBe('processing');
    s.state.subscription_events[0].lease_expires_at = new Date(Date.now() - 60 * 1000).toISOString();
    const rs = await processProPreapprovalEvent({ supabase: s, subscription: subRow(s), preapproval: pre('authorized', '2026-10-22T10:00:00Z'), deps });
    expect(rs.ok).toBe(true);
    expect(calls.posthog).toHaveLength(1);
  });

  it('out-of-order: a stale authorized after a newer cancelled is dropped; a later cancelled applies', async () => {
    const s = makeSupabase({ lawyer_subscriptions: [{ ...SUB, status: 'cancelled', cancelled_at: '2026-10-22T12:00:00Z' }] });
    const { deps } = makeDeps();
    const r = await processProPreapprovalEvent({ supabase: s, subscription: subRow(s), preapproval: pre('authorized', '2026-10-22T11:00:00Z'), deps });
    expect(r.skipped).toBe('stale_cancelled');
    expect(subRow(s).status).toBe('cancelled');
    const r2 = await processProPreapprovalEvent({ supabase: s, subscription: subRow(s), preapproval: pre('cancelled', '2026-10-22T13:00:00Z'), deps });
    expect(r2.ok).toBe(true);
  });

  it('cancelled releases the unpaid Founder reservation, and a duplicate is safe', async () => {
    const s = makeSupabase({ lawyer_subscriptions: [{ ...SUB }], pro_founder_reservations: [{ lawyer_id: 'ly-1', provider_subscription_id: 'PRE-1' }] });
    const { deps } = makeDeps();
    const r = await processProPreapprovalEvent({ supabase: s, subscription: subRow(s), preapproval: pre('cancelled', '2026-10-22T10:00:00Z'), deps });
    expect(r.ok).toBe(true);
    expect(s.state.pro_founder_reservations).toHaveLength(0);
    const r2 = await processProPreapprovalEvent({ supabase: s, subscription: subRow(s), preapproval: pre('cancelled', '2026-10-22T10:00:00Z'), deps });
    expect(r2.skipped).toBe('terminal');
    expect(s.state.pro_founder_reservations).toHaveLength(0);
  });

  it('regression: preapproval rows never move the payment baseline (real module + real helper)', async () => {
    const s = makeSupabase({ lawyer_subscriptions: [{ ...SUB }] });
    const { deps } = makeDeps();
    // a processed preapproval at 21:00 exists in the ledger
    s.state.subscription_events.push({ product_type: 'pro', subscription_id: 'sub-1', provider: 'mercadopago', provider_event_id: 'pre-old', provider_event_at: '2026-10-22T21:00:00Z', event_type: 'preapproval_authorized', status: 'processed', created_at: '2026-10-22T21:00:00Z' });
    // a 20:30 preapproval must be dropped by the PREAPPROVAL baseline...
    const r = await processProPreapprovalEvent({ supabase: s, subscription: subRow(s), preapproval: pre('authorized', '2026-10-22T20:30:00Z'), deps });
    expect(r.skipped).toBe('out_of_order');
  });
});

describe('Plus preapproval orchestrator (real module)', () => {
  it('expected upgrade completes and is marked processed', async () => {
    const s = makeSupabase({ lawyer_subscriptions: [{ id: 'sub-1', lawyer_id: 'ly-1', plan: 'pro', provider_subscription_id: 'PRO-1', pending_provider_subscription_id: 'PLUS-1', plan_change_status: 'upgrade_pending' }] });
    const { calls, deps } = makePlusDeps();
    const r = await processPlusPreapprovalEvent({ supabase: s, subscription: subRow(s), preapproval: pre('authorized', '2026-10-22T10:00:00Z', 'PLUS-1'), deps });
    expect(r.ok).toBe(true);
    expect(calls.upgrades).toHaveLength(1);
    expect(evRow(s, 'PLUS-1:authorized:2026-10-22T10:00:00Z').status).toBe('processed');
  });

  it('busy Plus delivery is retryable, keeps the lease, and upgrades only after expiry', async () => {
    const s = makeSupabase({
      lawyer_subscriptions: [{ id: 'sub-1', lawyer_id: 'ly-1', plan: 'pro', provider_subscription_id: 'PRO-1', pending_provider_subscription_id: 'PLUS-1', plan_change_status: 'upgrade_pending' }],
      subscription_events: [{ product_type: 'pro', subscription_id: 'sub-1', provider: 'mercadopago', provider_event_id: 'PLUS-1:authorized:2026-10-22T10:00:00Z', provider_event_at: '2026-10-22T10:00:00Z', event_type: 'plus_preapproval_authorized', status: 'processing', claimed_at: new Date().toISOString(), lease_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), attempts: 1, created_at: new Date().toISOString() }],
    });
    const { calls, deps } = makePlusDeps();
    const r = await processPlusPreapprovalEvent({ supabase: s, subscription: subRow(s), preapproval: pre('authorized', '2026-10-22T10:00:00Z', 'PLUS-1'), deps });
    expect(r).toMatchObject({ skipped: 'busy', retry: true });
    expect(calls.upgrades).toHaveLength(0);
    expect(evRow(s, 'PLUS-1:authorized:2026-10-22T10:00:00Z').status).toBe('processing');

    s.state.subscription_events[0].lease_expires_at = new Date(Date.now() - 60 * 1000).toISOString();
    const r2 = await processPlusPreapprovalEvent({ supabase: s, subscription: subRow(s), preapproval: pre('authorized', '2026-10-22T10:00:00Z', 'PLUS-1'), deps });
    expect(r2.ok).toBe(true);
    expect(calls.upgrades).toHaveLength(1);
  });

  it('unexpected preapproval is marked processed (no retry loop) and does not upgrade', async () => {
    const s = makeSupabase({ lawyer_subscriptions: [{ id: 'sub-1', lawyer_id: 'ly-1', plan: 'saas_essential', provider_subscription_id: 'PRE-1', pending_provider_subscription_id: null, plan_change_status: null }] });
    const { calls, deps } = makePlusDeps();
    const r = await processPlusPreapprovalEvent({ supabase: s, subscription: subRow(s), preapproval: pre('authorized', '2026-10-22T10:00:00Z', 'PLUS-OTHER'), deps });
    expect(r.skipped).toBe('unexpected');
    expect(calls.upgrades).toHaveLength(0);
    expect(evRow(s, 'PLUS-OTHER:authorized:2026-10-22T10:00:00Z').status).toBe('processed');
  });

  it('cancelled upgrade clears transition state without touching an active Pro', async () => {
    const s = makeSupabase({ lawyer_subscriptions: [{ id: 'sub-1', lawyer_id: 'ly-1', plan: 'pro', provider_subscription_id: 'PRO-1', pending_provider_subscription_id: 'PLUS-1', plan_change_status: 'upgrade_pending', pending_plan: 'plus' }] });
    const { deps } = makePlusDeps();
    const r = await processPlusPreapprovalEvent({ supabase: s, subscription: subRow(s), preapproval: pre('cancelled', '2026-10-22T10:00:00Z', 'PLUS-1'), deps });
    expect(r.ok).toBe(true);
    expect(subRow(s).plan_change_status).toBeNull();
    expect(subRow(s).pending_provider_subscription_id).toBeNull();
  });
});

describe('Source invariants of the real module / handler', () => {
  it('the orchestrator does NOT use a wasActive-style guard on the activation effects', () => {
    expect(moduleSrc).not.toMatch(/wasActive/);
  });
  it('server.mjs delegates the Pro preapproval path to processProPreapprovalEvent', () => {
    expect(serverSrc).toMatch(/processProPreapprovalEvent\(\{/);
  });
  it('server.mjs keeps the identity guard before dispatch', () => {
    expect(serverSrc).toMatch(/if \(!matchesActiveProvider\(subscription, preapprovalId\)\)/);
  });
  it('server.mjs surfaces resolver DB errors instead of treating them as missing', () => {
    expect(serverSrc).toMatch(/if \(error\) throw error;/);
    expect(serverSrc).toMatch(/if \(pending\.error\) throw pending\.error;/);
  });
  it('recovery handlers never reconcile before the atomic claim', () => {
    const sliceBetween = (start, end) => {
      const from = serverSrc.indexOf(start);
      const to = serverSrc.indexOf(end, from + start.length);
      expect(from).toBeGreaterThan(-1);
      expect(to).toBeGreaterThan(from);
      return serverSrc.slice(from, to);
    };
    const preapprovalRecovery = sliceBetween('const handleProPreapprovalRecovery', 'const handlePlusPreapprovalWebhook');
    const paymentRecovery = sliceBetween('const handleProAuthorizedPaymentRecovery', 'const handlePreapprovalWebhook');
    for (const body of [preapprovalRecovery, paymentRecovery]) {
      expect(body).not.toMatch(/maybeApplyScheduledDowngrade/);
      expect(body).not.toMatch(/retryOldProCancel/);
    }
    expect(preapprovalRecovery).toMatch(/processProPreapprovalEvent\(\{/);
    expect(paymentRecovery).toMatch(/processProAuthorizedPaymentEvent\(\{/);
  });
});
