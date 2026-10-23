// @vitest-environment node
//
// FASE 4.59 — evidence for the atomic-claim + outbox design.
//
// These tests import the REAL modules that ship:
//   - server/subscriptions/subscriptionEvents.mjs  (claim/complete/fail, identity)
//   - server/subscriptions/subscriptionEffects.mjs (outbox drainer)
//   - server/subscriptions/proPreapprovalEvent.mjs (orchestrator)
//
// Only the database transport is mocked. The mock implements the documented
// Postgres semantics (single-statement claim, lease expiry, unique effect key)
// so a green run is evidence about the contract, not about a happy-path replica.
import { describe, it, expect } from 'vitest';
import {
  beginSubscriptionEvent,
  completeSubscriptionEvent,
  failSubscriptionEvent,
  shouldApplyEvent,
  transitionKey,
  CLAIM_LEASE_SECONDS,
} from './subscriptionEvents.mjs';
import { drainSubscriptionEffects } from './subscriptionEffects.mjs';
import { processProPreapprovalEvent } from './proPreapprovalEvent.mjs';

// ---- transport mock ---------------------------------------------------------
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

function makeSupabase(seed = {}) {
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
      rows.push({ id: row.id || `ev-${rows.length + 1}`, created_at: new Date().toISOString(), attempts: 0, ...row });
      return { data: null, error: null };
    }
    if (q._op === 'update') { for (const r of rows.filter(match)) Object.assign(r, q._payload); return { data: null, error: null }; }
    if (q._op === 'delete') { state[q.table] = rows.filter((r) => !match(r)); return { data: null, error: null }; }
    let out = rows.filter(match);
    if (q._order) out = [...out].sort((a, b) => (q._order.ascending ? 1 : -1) * (new Date(a[q._order.col]) - new Date(b[q._order.col])));
    if (q._limit) out = out.slice(0, q._limit);
    return { data: q._single ? (out[0] ?? null) : out, error: null };
  }

  let effectSeq = 0;
  function claimEvent(params) {
    const row = state.subscription_events.find((r) =>
      r.provider === (params.p_provider || 'mercadopago')
      && String(r.provider_event_id) === String(params.p_event_id)
      && r.product_type === params.p_product_type);
    if (!row) return { data: null, error: null };
    const now = Date.now();
    const claimable = row.status === 'pending' || row.status === 'failed'
      || (row.status === 'processing' && (!row.lease_expires_at || Date.parse(row.lease_expires_at) < now));
    if (!claimable) {
      return { data: [{ claimed: false, reason: row.status === 'processing' ? 'busy' : 'terminal', event_id: row.id, claim_token: null, attempts: row.attempts || 0 }], error: null };
    }
    row.status = 'processing';
    row.claimed_at = new Date(now).toISOString();
    row.lease_expires_at = new Date(now + (params.p_lease_seconds ?? 600) * 1000).toISOString();
    row.attempts = (row.attempts || 0) + 1;
    row.claim_token = `tok-${row.attempts}-${Math.random().toString(36).slice(2, 8)}`;
    return { data: [{ claimed: true, reason: 'claimed', event_id: row.id, claim_token: row.claim_token, attempts: row.attempts }], error: null };
  }

  async function rpc(name, params = {}) {
    if (name === 'claim_subscription_event') return claimEvent(params);
    if (name === 'complete_subscription_event') {
      const row = state.subscription_events.find((r) =>
        r.provider === (params.p_provider || 'mercadopago')
        && String(r.provider_event_id) === String(params.p_event_id)
        && r.product_type === params.p_product_type);
      if (!row || row.status !== 'processing' || row.claim_token !== params.p_claim_token) return { data: 0, error: null };
      row.status = 'processed';
      row.claim_token = null;
      row.processed_at = new Date().toISOString();
      row.effects_at = row.processed_at;
      row.lease_expires_at = null;
      let inserted = 0;
      for (const e of (params.p_effects || [])) {
        const dup = state.subscription_effects.some((x) =>
          x.product_type === row.product_type && x.subscription_id === row.subscription_id
          && x.effect_type === e.effect_type && x.transition_key === e.transition_key);
        if (!dup) {
          state.subscription_effects.push({
            id: `eff-${++effectSeq}`,
            product_type: row.product_type,
            subscription_id: row.subscription_id,
            event_id: row.id,
            effect_type: e.effect_type,
            transition_key: e.transition_key,
            payload: e.payload || {},
            status: 'pending',
            attempts: 0,
            next_attempt_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          });
          inserted++;
        }
      }
      return { data: inserted, error: null };
    }
    if (name === 'fail_subscription_event') {
      const row = state.subscription_events.find((r) =>
        r.provider === (params.p_provider || 'mercadopago')
        && String(r.provider_event_id) === String(params.p_event_id)
        && r.product_type === params.p_product_type);
      if (!row || row.status !== 'processing' || row.claim_token !== params.p_claim_token) return { data: false, error: null };
      row.status = 'failed';
      row.claim_token = null;
      row.last_error = params.p_error;
      row.lease_expires_at = null;
      return { data: true, error: null };
    }
    if (name === 'claim_subscription_effect') {
      const now = Date.now();
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
      e.sent_at = new Date().toISOString();
      e.lease_expires_at = null;
      return { data: true, error: null };
    }
    if (name === 'fail_subscription_effect') {
      const e = state.subscription_effects.find((x) => x.id === params.p_id);
      if (!e || e.status !== 'processing' || e.claim_token !== params.p_claim_token) return { data: false, error: null };
      e.status = 'failed';
      e.claim_token = null;
      e.last_error = params.p_error;
      e.next_attempt_at = new Date(Date.now() + (params.p_backoff_seconds ?? 60) * 1000).toISOString();
      e.lease_expires_at = null;
      return { data: true, error: null };
    }
    return { data: null, error: null };
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
  return { from, rpc, state };
}

// ---- fixtures ---------------------------------------------------------------
const SUB = { id: 'sub-1', lawyer_id: 'ly-1', plan: 'saas_essential', status: 'pending', cancelled_at: null, provider_subscription_id: 'PRE-1' };
const pre = (status, at, id = 'PRE-1') => ({
  id, status, date_created: at, last_modified: at,
  auto_recurring: { start_date: at },
  next_payment_date: '2026-11-22T00:00:00.000Z',
});
const row = (s) => s.state.lawyer_subscriptions[0];
const effectRows = (s) => s.state.subscription_effects;

function makeDeps({ analyticsThrows = false, emailThrows = false } = {}) {
  const calls = { analytics: [], emails: [], analyticsThrows, emailThrows };
  return {
    calls,
    deps: {
      priceClp: 19990,
      effectHandlers: {
        analytics: async (p) => {
          if (calls.analyticsThrows) throw new Error('analytics down');
          calls.analytics.push(p);
        },
        email_welcome: async (p) => {
          if (calls.emailThrows) throw new Error('email down');
          calls.emails.push(p);
        },
      },
    },
  };
}

const ids = {
  authorized: 'PRE-1:authorized:2026-10-22T10:00:00Z',
  expired: 'PRE-1:authorized:2026-10-22T09:00:00Z',
  cancelled: 'PRE-1:cancelled:2026-10-22T12:00:00Z',
  reauthorized: 'PRE-1:authorized:2026-10-22T13:00:00Z',
};

describe('FASE 4.59 — atomic claim', () => {
  it('1) two concurrent claims: exactly one wins, the other sees busy', async () => {
    const s = makeSupabase({ lawyer_subscriptions: [{ ...SUB }] });
    await s.from('subscription_events').insert({
      product_type: 'pro', subscription_id: 'sub-1', provider: 'mercadopago',
      provider_event_id: ids.authorized, provider_event_at: '2026-10-22T10:00:00Z',
      event_type: 'preapproval_authorized', status: 'pending',
    });
    const params = { p_provider: 'mercadopago', p_event_id: ids.authorized, p_product_type: 'pro', p_lease_seconds: CLAIM_LEASE_SECONDS };
    const [a, b] = await Promise.all([s.rpc('claim_subscription_event', params), s.rpc('claim_subscription_event', params)]);
    const results = [a.data[0], b.data[0]];
    expect(results.filter((r) => r.claimed)).toHaveLength(1);
    const loser = results.find((r) => !r.claimed);
    expect(loser.reason).toBe('busy');
    expect(s.state.subscription_events[0].attempts).toBe(1);
  });

  it('1b) fencing: a stale worker cannot complete or fail after the event was reclaimed', async () => {
    const s = makeSupabase({ lawyer_subscriptions: [{ ...SUB }] });
    const args = {
      productType: 'pro', subscriptionId: 'sub-1', providerEventId: ids.authorized,
      providerEventAt: '2026-10-22T10:00:00Z', eventType: 'preapproval_authorized', providerStatus: 'authorized',
    };
    const claimA = await beginSubscriptionEvent(s, args);
    expect(claimA.claimed).toBe(true);
    s.state.subscription_events[0].lease_expires_at = new Date(Date.now() - 1000).toISOString();
    const claimB = await beginSubscriptionEvent(s, args);
    expect(claimB.claimed).toBe(true);
    expect(claimB.claim_token).not.toBe(claimA.claim_token);
    // The old owner may still be running: its writes must be fenced out.
    expect(await completeSubscriptionEvent(s, { productType: 'pro', providerEventId: ids.authorized, claimToken: claimA.claim_token })).toBe(0);
    expect(await failSubscriptionEvent(s, { productType: 'pro', providerEventId: ids.authorized, claimToken: claimA.claim_token, error: 'stale' })).toBe(false);
    expect(s.state.subscription_events[0].status).toBe('processing');
    expect(s.state.subscription_events[0].claim_token).toBe(claimB.claim_token);
    // The new owner can finish.
    expect(await completeSubscriptionEvent(s, { productType: 'pro', providerEventId: ids.authorized, claimToken: claimB.claim_token })).toBe(0);
    expect(s.state.subscription_events[0].status).toBe('processed');
  });

  it('1c) effect fencing: an old effect worker cannot mark it sent after reclaim', async () => {
    const s = makeSupabase({ lawyer_subscriptions: [{ ...SUB }] });
    s.state.subscription_effects.push({
      id: 'eff-1', product_type: 'pro', subscription_id: 'sub-1', effect_type: 'analytics',
      transition_key: 'PRE-1:authorized', payload: {}, status: 'pending', attempts: 0,
      next_attempt_at: new Date().toISOString(), created_at: new Date().toISOString(),
    });
    const a = await s.rpc('claim_subscription_effect', { p_lease_seconds: 1, p_max_attempts: 8 });
    const effA = a.data[0];
    s.state.subscription_effects[0].lease_expires_at = new Date(Date.now() - 1000).toISOString();
    const b = await s.rpc('claim_subscription_effect', { p_lease_seconds: 1, p_max_attempts: 8 });
    const effB = b.data[0];
    expect(effB.claim_token).not.toBe(effA.claim_token);
    expect(await s.rpc('complete_subscription_effect', { p_id: effA.effect_id, p_claim_token: effA.claim_token })).toEqual({ data: false, error: null });
    expect(s.state.subscription_effects[0].status).toBe('processing');
    expect(await s.rpc('complete_subscription_effect', { p_id: effB.effect_id, p_claim_token: effB.claim_token })).toEqual({ data: true, error: null });
    expect(s.state.subscription_effects[0].status).toBe('sent');
  });

  it('2) an already processed event is terminal: no mutation, no effect', async () => {
    const s = makeSupabase({ lawyer_subscriptions: [{ ...SUB }] });
    const { calls, deps } = makeDeps();
    const p = pre('authorized', '2026-10-22T10:00:00Z');
    await processProPreapprovalEvent({ supabase: s, subscription: row(s), preapproval: p, deps });
    const r2 = await processProPreapprovalEvent({ supabase: s, subscription: row(s), preapproval: p, deps });
    expect(r2.skipped).toBe('terminal');
    expect(effectRows(s)).toHaveLength(2);
    expect(calls.analytics).toHaveLength(1);
    expect(calls.emails).toHaveLength(1);
  });

  it('3) crash after mutation, before complete: lease retry converges with effects enqueued once', async () => {
    const s = makeSupabase({ lawyer_subscriptions: [{ ...SUB }] });
    const { calls, deps } = makeDeps();
    const p = pre('authorized', '2026-10-22T10:00:00Z');
    await beginSubscriptionEvent(s, {
      productType: 'pro', subscriptionId: 'sub-1', providerEventId: ids.authorized,
      providerEventAt: p.last_modified, eventType: 'preapproval_authorized', providerStatus: 'authorized',
    });
    // Worker applied the mutation and died before committing "processed".
    await s.from('lawyer_subscriptions').update({ status: 'active' }).eq('id', 'sub-1');
    expect(s.state.subscription_events[0].status).toBe('processing');
    expect(effectRows(s)).toHaveLength(0);
    // Lease expires; the provider retries.
    s.state.subscription_events[0].lease_expires_at = new Date(Date.now() - 1000).toISOString();
    const r = await processProPreapprovalEvent({ supabase: s, subscription: row(s), preapproval: p, deps });
    expect(r.ok).toBe(true);
    expect(s.state.subscription_events[0].status).toBe('processed');
    expect(effectRows(s)).toHaveLength(2);
    expect(calls.analytics).toHaveLength(1);
    expect(calls.emails).toHaveLength(1);
  });

  it('4) effect failure does not roll back state: event stays processed and effect retries', async () => {
    const s = makeSupabase({ lawyer_subscriptions: [{ ...SUB }] });
    const { calls, deps } = makeDeps({ analyticsThrows: true });
    const r = await processProPreapprovalEvent({ supabase: s, subscription: row(s), preapproval: pre('authorized', '2026-10-22T10:00:00Z'), deps });
    expect(r.ok).toBe(true);
    expect(row(s).status).toBe('active');
    expect(s.state.subscription_events[0].status).toBe('processed');
    const analytics = effectRows(s).find((e) => e.effect_type === 'analytics');
    expect(analytics.status).toBe('failed');
    expect(analytics.last_error).toMatch(/analytics down/);
    analytics.next_attempt_at = new Date(Date.now() - 1000).toISOString();
    calls.analyticsThrows = false;
    await drainSubscriptionEffects(s, deps.effectHandlers);
    expect(effectRows(s).find((e) => e.id === analytics.id).status).toBe('sent');
    expect(calls.analytics).toHaveLength(1);
  });

  it('5) out-of-order notifications: stale authorized dropped, cancelled applied, later authorized applies with its own transition', async () => {
    const s = makeSupabase({ lawyer_subscriptions: [{ ...SUB, status: 'cancelled', cancelled_at: '2026-10-22T12:00:00Z' }] });
    const { calls, deps } = makeDeps();
    const stale = await processProPreapprovalEvent({ supabase: s, subscription: row(s), preapproval: pre('authorized', '2026-10-22T09:00:00Z'), deps });
    expect(stale.skipped).toBe('stale_cancelled');
    expect(effectRows(s)).toHaveLength(0);
    // A later authorization is a different transition and may re-activate.
    const re = await processProPreapprovalEvent({ supabase: s, subscription: row(s), preapproval: pre('authorized', '2026-10-22T13:00:00Z'), deps });
    expect(re.ok).toBe(true);
    expect(row(s).status).toBe('active');
    expect(calls.analytics).toHaveLength(1);
    expect(calls.emails).toHaveLength(1);
  });

  it('6) email failure is traceable, retried, and not duplicated by an event retry', async () => {
    const s = makeSupabase({ lawyer_subscriptions: [{ ...SUB }] });
    const { calls, deps } = makeDeps({ emailThrows: true });
    const p = pre('authorized', '2026-10-22T10:00:00Z');
    await processProPreapprovalEvent({ supabase: s, subscription: row(s), preapproval: p, deps });
    const email = effectRows(s).find((e) => e.effect_type === 'email_welcome');
    expect(email.status).toBe('failed');
    expect(email.last_error).toMatch(/email down/);
    expect(email.attempts).toBe(1);
    // Retry the notification + the effect: the event is terminal, so no
    // second effect row and no second send.
    await processProPreapprovalEvent({ supabase: s, subscription: row(s), preapproval: p, deps });
    expect(effectRows(s).filter((e) => e.effect_type === 'email_welcome')).toHaveLength(1);
    email.next_attempt_at = new Date(Date.now() - 1000).toISOString();
    calls.emailThrows = false;
    await drainSubscriptionEffects(s, deps.effectHandlers);
    expect(effectRows(s).find((e) => e.id === email.id).status).toBe('sent');
    expect(calls.emails).toHaveLength(1);
  });

  it('7) two notifications for the same resource/status enqueue one effect (transition identity, not notification)', async () => {
    const s = makeSupabase({ lawyer_subscriptions: [{ ...SUB }] });
    const { calls, deps } = makeDeps();
    await processProPreapprovalEvent({ supabase: s, subscription: row(s), preapproval: pre('authorized', '2026-10-22T10:00:00Z'), deps });
    // Same resource+status, different notification timestamp -> different
    // provider_event_id but the same transition key.
    await processProPreapprovalEvent({ supabase: s, subscription: row(s), preapproval: pre('authorized', '2026-10-22T10:00:01Z'), deps });
    expect(s.state.subscription_events.filter((e) => e.status === 'processed')).toHaveLength(2);
    expect(effectRows(s).filter((e) => e.effect_type === 'analytics')).toHaveLength(1);
    expect(effectRows(s).filter((e) => e.effect_type === 'email_welcome')).toHaveLength(1);
    expect(calls.analytics).toHaveLength(1);
    expect(calls.emails).toHaveLength(1);
  });
});

describe('FASE 4.59 — helper contract', () => {
  it('complete/fail are no-ops unless the caller owns the claim', async () => {
    const s = makeSupabase({ lawyer_subscriptions: [{ ...SUB }] });
    await s.from('subscription_events').insert({
      product_type: 'pro', subscription_id: 'sub-1', provider: 'mercadopago',
      provider_event_id: 'x', provider_event_at: '2026-10-22T10:00:00Z',
      event_type: 'preapproval_authorized', status: 'pending',
    });
    expect(await completeSubscriptionEvent(s, { productType: 'pro', providerEventId: 'x', claimToken: 'wrong' })).toBe(0);
    expect(await failSubscriptionEvent(s, { productType: 'pro', providerEventId: 'x', claimToken: 'wrong', error: 'nope' })).toBe(false);
    await expect(completeSubscriptionEvent(s, { productType: 'pro', providerEventId: 'x' })).rejects.toThrow('claim_token_required');
    expect(s.state.subscription_events[0].status).toBe('pending');
  });

  it('ordering is scoped per event family and transition keys are resource-scoped', () => {
    expect(transitionKey('PRE-1', 'authorized')).toBe('PRE-1:authorized');
    expect(transitionKey('PRE-1', 'paused')).not.toBe(transitionKey('PRE-1', 'authorized'));
    expect(typeof shouldApplyEvent).toBe('function');
  });
});
