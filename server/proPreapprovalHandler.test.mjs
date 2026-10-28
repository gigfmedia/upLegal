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
function makeSupabase(seed = {}, options = {}) {
  let nextId = 1;
  const state = {
    subscription_events: seed.subscription_events ? [...seed.subscription_events] : [],
    lawyer_subscriptions: seed.lawyer_subscriptions ? [...seed.lawyer_subscriptions] : [],
    pro_founder_reservations: seed.pro_founder_reservations ? [...seed.pro_founder_reservations] : [],
  };
  function exec(q) {
    const rows = state[q.table] || (state[q.table] = []);
    const match = (r) => q.filters.every(([c, v]) =>
      (v && typeof v === 'object' && v.__like != null) ? sqlLike(v.__like, String(r[c] ?? '')) : String(r[c]) === String(v));
    if (q._op === 'insert') {
      const row = q._payload;
      const dup = rows.some((r) => r.provider === row.provider && String(r.provider_event_id) === String(row.provider_event_id) && r.product_type === row.product_type);
      if (dup) return { data: null, error: { code: '23505' } };
      rows.push({ id: `ev-${nextId++}`, created_at: new Date().toISOString(), ...row });
      return { data: null, error: null };
    }
    if (q._op === 'update') {
      if (options.updateError && (!options.updateErrorTable || options.updateErrorTable === q.table)) {
        return { data: null, error: options.updateError };
      }
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

function makeDeps() {
  const calls = { posthog: [], emails: [] };
  return {
    calls,
    deps: {
      capturePostHog: async (event, id, props) => { if (calls.posthogThrow) throw new Error('posthog down'); calls.posthog.push({ event, id, props }); },
      getProLawyerEmail: async () => ({ email: 'lawyer@example.com' }),
      sendAIEmail: async (to, subj) => { calls.emails.push({ to, subj }); },
      priceClp: 19990,
    },
  };
}
function makePlusDeps(completion = { ok: true }) {
  const calls = { posthog: [], upgrades: [] };
  return {
    calls,
    deps: {
      capturePostHog: async (event, id, props) => { calls.posthog.push({ event, id, props }); },
      completePlusUpgrade: async (subscription, preapproval) => { calls.upgrades.push({ subscriptionId: subscription.id, preapprovalId: preapproval.id }); return completion; },
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

  it('activation persists the provider id on the row', async () => {
    const s = makeSupabase({ lawyer_subscriptions: [{ ...SUB, provider_subscription_id: null }] });
    const { deps } = makeDeps();
    const r = await processProPreapprovalEvent({ supabase: s, subscription: subRow(s), preapproval: pre('authorized', '2026-10-22T10:00:00Z'), deps });
    expect(r.ok).toBe(true);
    expect(subRow(s).provider_subscription_id).toBe('PRE-1');
  });

  it('links a recent first authorized Pro preapproval to an unlinked pending row', async () => {
    const s = makeSupabase({ lawyer_subscriptions: [{ ...SUB, provider_subscription_id: null, updated_at: '2026-10-22T09:00:00Z' }] });
    const { deps } = makeDeps();
    const r = await processProPreapprovalEvent({ supabase: s, subscription: subRow(s), preapproval: pre('authorized', '2026-10-22T10:00:00Z'), deps });
    expect(r.ok).toBe(true);
    expect(subRow(s).provider_subscription_id).toBe('PRE-1');
    expect(subRow(s).status).toBe('active');
  });

  it('does not attach a stale authorized Pro preapproval to a brand-new checkout', async () => {
    const s = makeSupabase({ lawyer_subscriptions: [{ ...SUB, provider_subscription_id: null, updated_at: '2026-10-24T00:00:00Z' }] });
    const { calls, deps } = makeDeps();
    const r = await processProPreapprovalEvent({ supabase: s, subscription: subRow(s), preapproval: pre('authorized', '2026-10-22T10:00:00Z'), deps });
    expect(r.skipped).toBe('stale_provider');
    expect(subRow(s).provider_subscription_id).toBeNull();
    expect(subRow(s).status).toBe('pending');
    expect(evRow(s, 'PRE-1:authorized:2026-10-22T10:00:00Z').status).toBe('processed');
    expect(calls.posthog).toHaveLength(0);
    expect(calls.emails).toHaveLength(0);
  });

  it('persists the provider id even when the period payload is unusable', async () => {
    const s = makeSupabase({ lawyer_subscriptions: [{ ...SUB, provider_subscription_id: null }] });
    const { deps } = makeDeps();
    const r = await processProPreapprovalEvent({
      supabase: s,
      subscription: subRow(s),
      preapproval: { id: 'PRE-1', status: 'authorized' },
      deps,
    });
    expect(r.skipped).toBe('no_period');
    expect(subRow(s).provider_subscription_id).toBe('PRE-1');
  });

  it('a database error while linking the provider marks the event failed instead of processed', async () => {
    const s = makeSupabase(
      { lawyer_subscriptions: [{ ...SUB }] },
      { updateError: { code: 'XX000', message: 'db down' }, updateErrorTable: 'lawyer_subscriptions' },
    );
    const { calls, deps } = makeDeps();
    await expect(processProPreapprovalEvent({ supabase: s, subscription: subRow(s), preapproval: pre('authorized', '2026-10-22T10:00:00Z'), deps }))
      .rejects.toThrow(/pro provider link update/);
    expect(evRow(s, 'PRE-1:authorized:2026-10-22T10:00:00Z').status).toBe('failed');
    expect(subRow(s).status).toBe('pending');
    expect(calls.posthog).toHaveLength(0);
  });

  it('duplicate of a processed event is a no-op', async () => {
    const s = makeSupabase({ lawyer_subscriptions: [{ ...SUB }] });
    const { calls, deps } = makeDeps();
    const p = pre('authorized', '2026-10-22T10:00:00Z');
    await processProPreapprovalEvent({ supabase: s, subscription: subRow(s), preapproval: p, deps });
    const r2 = await processProPreapprovalEvent({ supabase: s, subscription: subRow(s), preapproval: p, deps });
    expect(r2.skipped).toBe('processed');
    expect(calls.posthog).toHaveLength(1);
    expect(calls.emails).toHaveLength(1);
  });

  it('partial failure rethrows (HTTP 5xx), marks failed, and the retry is NOT dropped (at-least-once)', async () => {
    const s = makeSupabase({ lawyer_subscriptions: [{ ...SUB }] });
    const { calls, deps } = makeDeps();
    calls.posthogThrow = true;
    await expect(processProPreapprovalEvent({ supabase: s, subscription: subRow(s), preapproval: pre('authorized', '2026-10-22T10:00:00Z'), deps })).rejects.toThrow('posthog down');
    const id = 'PRE-1:authorized:2026-10-22T10:00:00Z';
    expect(evRow(s, id).status).toBe('failed');
    // The subscription was already flipped active by the partial attempt.
    expect(subRow(s).status).toBe('active');
    // Retry: the effect MUST run (no wasActive guard may drop it).
    calls.posthogThrow = false;
    const r = await processProPreapprovalEvent({ supabase: s, subscription: subRow(s), preapproval: pre('authorized', '2026-10-22T10:00:00Z'), deps });
    expect(r.ok).toBe(true);
    expect(evRow(s, id).status).toBe('processed');
    expect(calls.posthog).toHaveLength(1);
    expect(calls.emails).toHaveLength(1);
  });

  it('fresh pending duplicate is transient (not acknowledged); lease-expired pending is processed', async () => {
    const s = makeSupabase({ lawyer_subscriptions: [{ ...SUB }] });
    const { calls, deps } = makeDeps();
    s.state.subscription_events.push({ id: 'ev-pending', product_type: 'pro', subscription_id: 'sub-1', provider: 'mercadopago', provider_event_id: 'PRE-1:authorized:2026-10-22T10:00:00Z', provider_event_at: '2026-10-22T10:00:00Z', event_type: 'preapproval_authorized', status: 'pending', created_at: new Date().toISOString() });
    const rf = await processProPreapprovalEvent({ supabase: s, subscription: subRow(s), preapproval: pre('authorized', '2026-10-22T10:00:00Z'), deps });
    expect(rf).toMatchObject({ transient: true, reason: 'event_in_flight' });
    expect(calls.posthog).toHaveLength(0);
    s.state.subscription_events[0].created_at = new Date(Date.now() - 11 * 60 * 1000).toISOString();
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
    expect(r2.skipped).toBe('processed');
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

  it('a DB failure completing the upgrade marks the event failed (retryable)', async () => {
    const s = makeSupabase({ lawyer_subscriptions: [{ id: 'sub-1', lawyer_id: 'ly-1', plan: 'pro', provider_subscription_id: 'PRO-1', pending_provider_subscription_id: 'PLUS-1', plan_change_status: 'upgrade_pending' }] });
    const { deps } = makePlusDeps({ ok: false, reason: 'DB_ERROR' });
    await expect(processPlusPreapprovalEvent({ supabase: s, subscription: subRow(s), preapproval: pre('authorized', '2026-10-22T10:00:00Z', 'PLUS-1'), deps }))
      .rejects.toThrow(/plus upgrade failed: DB_ERROR/);
    expect(evRow(s, 'PLUS-1:authorized:2026-10-22T10:00:00Z').status).toBe('failed');
    expect(subRow(s).plan).toBe('pro');
  });

  it('a definitive amount/period rejection is marked processed (no retry loop)', async () => {
    const s = makeSupabase({ lawyer_subscriptions: [{ id: 'sub-1', lawyer_id: 'ly-1', plan: 'pro', provider_subscription_id: 'PRO-1', pending_provider_subscription_id: 'PLUS-1', plan_change_status: 'upgrade_pending' }] });
    const { deps } = makePlusDeps({ ok: false, reason: 'AMOUNT_MISMATCH' });
    const r = await processPlusPreapprovalEvent({ supabase: s, subscription: subRow(s), preapproval: pre('authorized', '2026-10-22T10:00:00Z', 'PLUS-1'), deps });
    expect(r.skipped).toBe('upgrade_rejected');
    expect(evRow(s, 'PLUS-1:authorized:2026-10-22T10:00:00Z').status).toBe('processed');
    expect(subRow(s).plan).toBe('pro');
    expect(subRow(s).pending_provider_subscription_id).toBeNull();
    expect(subRow(s).plan_change_status).toBeNull();
  });

  it('activates a brand-new Plus checkout whose authorized webhook beats id persistence', async () => {
    const s = makeSupabase({ lawyer_subscriptions: [{ id: 'sub-1', lawyer_id: 'ly-1', plan: 'plus', status: 'pending', provider_subscription_id: null, pending_provider_subscription_id: null, plan_change_status: null, updated_at: '2026-10-26T10:00:00Z' }] });
    const { calls, deps } = makePlusDeps();
    const r = await processPlusPreapprovalEvent({ supabase: s, subscription: subRow(s), preapproval: pre('authorized', '2026-10-26T10:05:00Z', 'PLUS-NEW'), deps });
    expect(r.ok).toBe(true);
    expect(calls.upgrades).toHaveLength(1);
    expect(evRow(s, 'PLUS-NEW:authorized:2026-10-26T10:05:00Z').status).toBe('processed');
  });

  it('does not activate a stale Plus preapproval for a brand-new checkout', async () => {
    const s = makeSupabase({ lawyer_subscriptions: [{ id: 'sub-1', lawyer_id: 'ly-1', plan: 'plus', status: 'pending', provider_subscription_id: null, pending_provider_subscription_id: null, plan_change_status: null, updated_at: '2026-10-26T10:00:00Z' }] });
    const { calls, deps } = makePlusDeps();
    const r = await processPlusPreapprovalEvent({ supabase: s, subscription: subRow(s), preapproval: pre('authorized', '2026-10-24T10:00:00Z', 'PLUS-OLD'), deps });
    expect(r.skipped).toBe('unexpected');
    expect(calls.upgrades).toHaveLength(0);
    expect(evRow(s, 'PLUS-OLD:authorized:2026-10-24T10:00:00Z').status).toBe('processed');
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
  it('payment-path recovery settles the trusted preapproval before acknowledging an early payment', () => {
    const start = serverSrc.indexOf('const handleAuthorizedPayment =');
    const end = serverSrc.indexOf('// ---- EXTENDED WEBHOOK ----', start);
    const body = serverSrc.slice(start, end);
    expect(body).toMatch(/await handleProPreapprovalWebhook\(preapprovalData\)/);
  });
  it('pro payment ledger failure fails the event instead of activating silently', () => {
    const start = serverSrc.indexOf('const handleProAuthorizedPayment =');
    const end = serverSrc.indexOf('const UNRESOLVED_PAYMENT_RECOVERY_MS', start);
    const body = serverSrc.slice(start, end);
    expect(body).toMatch(/const \{ error: ledgerErr \} = await supabase\.from\('pro_subscription_payments'\)\.insert/);
    expect(body).toMatch(/if \(ledgerErr\)/);
    expect(body).toMatch(/throw ledgerErr;/);
  });
  it('server.mjs returns a 5xx for a fresh in-flight duplicate instead of losing it', () => {
    expect(serverSrc).toMatch(/if \(outcome\?\.transient\) throw new Error\(`pro preapproval replay pending/);
    expect(serverSrc).toMatch(/if \(outcome\?\.transient\) throw new Error\(`plus preapproval replay pending/);
    expect(serverSrc).toMatch(/if \(outcome\?\.transient\) \{\s*throw new Error\(`pro payment replay pending/);
  });
  it('server.mjs keeps the identity guard before dispatch', () => {
    expect(serverSrc).toMatch(/if \(!matchesActiveProvider\(subscription, preapprovalId\)\)/);
  });
});
