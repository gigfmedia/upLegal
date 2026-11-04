// @vitest-environment node
//
// FASE 4.60 — REAL PostgreSQL integration tests (sandbox only).
//
// Skipped unless both env vars are set:
//   SANDBOX_SUPABASE_URL=http://127.0.0.1:54321
//   SANDBOX_SERVICE_ROLE_KEY=<local service_role key>
//
// Requires the isolated Supabase project described in the 4.60 runbook
// (only subscription_events + subscription_effects + minimal Pro tables).
// It exercises the REAL modules against PostgREST/Postgres — no transport mock.
//
// NEVER point these vars at production. The tests delete rows by fixed UUIDs.
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { processProPreapprovalEvent } from './proPreapprovalEvent.mjs';
import {
  beginSubscriptionEvent,
  completeSubscriptionEvent,
  failSubscriptionEvent,
  matchesActiveProvider,
} from './subscriptionEvents.mjs';
import { drainSubscriptionEffects } from './subscriptionEffects.mjs';

const URL = process.env.SANDBOX_SUPABASE_URL;
const KEY = process.env.SANDBOX_SERVICE_ROLE_KEY;
const suite = URL && KEY ? describe : describe.skip;
const supabase = URL && KEY ? createClient(URL, KEY, { auth: { persistSession: false } }) : null;

const SUB_ID = '00000000-0000-4000-8000-000000000001';
const LAWYER_ID = '00000000-0000-4000-8000-000000000002';

const pre = (status, at, id = 'PRE-SBX-1') => ({
  id, status, date_created: at, last_modified: at,
  auto_recurring: { start_date: at },
  next_payment_date: '2026-11-22T00:00:00.000Z',
});

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

async function reset() {
  await supabase.from('subscription_effects').delete().eq('subscription_id', SUB_ID);
  await supabase.from('subscription_events').delete().eq('subscription_id', SUB_ID);
  await supabase.from('lawyer_subscriptions').delete().eq('id', SUB_ID);
  const { error } = await supabase.from('lawyer_subscriptions').insert({
    id: SUB_ID,
    lawyer_id: LAWYER_ID,
    plan: 'saas_essential',
    status: 'pending',
    cancelled_at: null,
    provider_subscription_id: 'PRE-SBX-1',
    amount_clp: 19990,
  });
  if (error) throw error;
}

async function subRow() {
  const { data, error } = await supabase.from('lawyer_subscriptions').select('*').eq('id', SUB_ID).single();
  if (error) throw error;
  return data;
}

async function effectsOf(subscriptionId = SUB_ID) {
  const { data, error } = await supabase.from('subscription_effects').select('*').eq('subscription_id', subscriptionId);
  if (error) throw error;
  return data;
}

async function eventOf(eventId) {
  const { data, error } = await supabase
    .from('subscription_events').select('*')
    .eq('provider', 'mercadopago').eq('product_type', 'pro').eq('provider_event_id', eventId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

suite('FASE 4.60 — real Postgres sandbox', () => {
  beforeEach(async () => { await reset(); });
  afterAll(async () => {
    await supabase.from('subscription_effects').delete().eq('subscription_id', SUB_ID);
    await supabase.from('subscription_events').delete().eq('subscription_id', SUB_ID);
    await supabase.from('lawyer_subscriptions').delete().eq('id', SUB_ID);
  });

  it('1) two real concurrent deliveries: exactly one wins, one effect set', async () => {
    const { calls, deps } = makeDeps();
    const p = pre('authorized', '2026-10-22T10:00:00Z');
    const [a, b] = await Promise.all([
      processProPreapprovalEvent({ supabase, subscription: await subRow(), preapproval: p, deps }),
      processProPreapprovalEvent({ supabase, subscription: await subRow(), preapproval: p, deps }),
    ]);
    expect([a, b].filter((r) => r.ok)).toHaveLength(1);
    const ev = await eventOf('PRE-SBX-1:authorized:2026-10-22T10:00:00Z');
    expect(ev.status).toBe('processed');
    expect(ev.attempts).toBe(1);
    const effects = await effectsOf();
    expect(effects).toHaveLength(2);
    expect(calls.analytics).toHaveLength(1);
    expect(calls.emails).toHaveLength(1);
  });

  it('2) a lease that expires is reclaimed; the new claim token owns the outcome', async () => {
    const { deps } = makeDeps();
    const p = pre('authorized', '2026-10-22T09:00:00Z');
    const claimA = await beginSubscriptionEvent(supabase, {
      productType: 'pro', subscriptionId: SUB_ID,
      providerEventId: 'PRE-SBX-1:authorized:2026-10-22T09:00:00Z',
      providerEventAt: p.last_modified, eventType: 'preapproval_authorized', providerStatus: 'authorized',
    });
    expect(claimA.claimed).toBe(true);
    const { error: leaseErr } = await supabase.from('subscription_events')
      .update({ lease_expires_at: new Date(Date.now() - 1000).toISOString() })
      .eq('provider', 'mercadopago').eq('product_type', 'pro')
      .eq('provider_event_id', 'PRE-SBX-1:authorized:2026-10-22T09:00:00Z');
    if (leaseErr) throw leaseErr;
    const r = await processProPreapprovalEvent({ supabase, subscription: await subRow(), preapproval: p, deps });
    expect(r.ok).toBe(true);
    const ev = await eventOf('PRE-SBX-1:authorized:2026-10-22T09:00:00Z');
    expect(ev.status).toBe('processed');
    expect(ev.attempts).toBe(2);
    // A stale completion with claim A's token is rejected.
    expect(await completeSubscriptionEvent(supabase, {
      productType: 'pro', providerEventId: ev.provider_event_id, claimToken: claimA.claim_token,
    })).toBe(0);
  });

  it('2b) effect fencing: an old effect token cannot complete after a reclaim', async () => {
    const { error } = await supabase.from('subscription_effects').insert({
      product_type: 'pro', subscription_id: SUB_ID, effect_type: 'analytics',
      transition_key: 'fence-eff', payload: {}, status: 'pending', attempts: 0,
      next_attempt_at: new Date(Date.now() - 1000).toISOString(),
    });
    if (error) throw error;
    const a = await supabase.rpc('claim_subscription_effect', { p_lease_seconds: 1, p_max_attempts: 8 });
    const effA = a.data[0];
    expect(a.error).toBeNull();
    expect(effA.claim_token).toBeTruthy();
    const { error: leaseErr } = await supabase.from('subscription_effects')
      .update({ lease_expires_at: new Date(Date.now() - 1000).toISOString() })
      .eq('id', effA.effect_id);
    if (leaseErr) throw leaseErr;
    const b = await supabase.rpc('claim_subscription_effect', { p_lease_seconds: 1, p_max_attempts: 8 });
    const effB = b.data[0];
    expect(effB.claim_token).not.toBe(effA.claim_token);
    // Stale owner: rejected, row stays processing under B's ownership.
    const stale = await supabase.rpc('complete_subscription_effect', { p_id: effA.effect_id, p_claim_token: effA.claim_token });
    expect(stale.data).toBe(false);
    let row = (await effectsOf()).find((e) => e.transition_key === 'fence-eff');
    expect(row.status).toBe('processing');
    expect(row.claim_token).toBe(effB.claim_token);
    // New owner: accepted.
    const fresh = await supabase.rpc('complete_subscription_effect', { p_id: effB.effect_id, p_claim_token: effB.claim_token });
    expect(fresh.data).toBe(true);
    row = (await effectsOf()).find((e) => e.transition_key === 'fence-eff');
    expect(row.status).toBe('sent');
  });

  it('3) crash after mutation, before complete: retry converges, effects once', async () => {
    const { calls, deps } = makeDeps();
    const p = pre('authorized', '2026-10-22T10:00:00Z');
    const claim = await beginSubscriptionEvent(supabase, {
      productType: 'pro', subscriptionId: SUB_ID,
      providerEventId: 'PRE-SBX-1:authorized:2026-10-22T10:00:00Z',
      providerEventAt: p.last_modified, eventType: 'preapproval_authorized', providerStatus: 'authorized',
    });
    expect(claim.claimed).toBe(true);
    await supabase.from('lawyer_subscriptions').update({ status: 'active' }).eq('id', SUB_ID);
    expect((await effectsOf())).toHaveLength(0);
    await supabase.from('subscription_events')
      .update({ lease_expires_at: new Date(Date.now() - 1000).toISOString() })
      .eq('provider', 'mercadopago').eq('product_type', 'pro')
      .eq('provider_event_id', 'PRE-SBX-1:authorized:2026-10-22T10:00:00Z');
    const r = await processProPreapprovalEvent({ supabase, subscription: await subRow(), preapproval: p, deps });
    expect(r.ok).toBe(true);
    expect((await effectsOf())).toHaveLength(2);
    expect(calls.analytics).toHaveLength(1);
    expect(calls.emails).toHaveLength(1);
  });

  it('4) completing an event with an invalid effect rolls back BOTH the status and the outbox row', async () => {
    const p = pre('authorized', '2026-10-22T10:00:00Z');
    const claim = await beginSubscriptionEvent(supabase, {
      productType: 'pro', subscriptionId: SUB_ID,
      providerEventId: 'PRE-SBX-1:authorized:2026-10-22T10:00:00Z',
      providerEventAt: p.last_modified, eventType: 'preapproval_authorized', providerStatus: 'authorized',
    });
    const { error } = await supabase.rpc('complete_subscription_event', {
      p_provider: 'mercadopago',
      p_event_id: 'PRE-SBX-1:authorized:2026-10-22T10:00:00Z',
      p_product_type: 'pro',
      p_claim_token: claim.claim_token,
      // transition_key is NOT NULL on subscription_effects.
      p_effects: [{ effect_type: 'analytics' }],
    });
    expect(error).not.toBeNull();
    const ev = await eventOf('PRE-SBX-1:authorized:2026-10-22T10:00:00Z');
    expect(ev.status).toBe('processing');
    expect(await effectsOf()).toHaveLength(0);
    expect(await failSubscriptionEvent(supabase, {
      productType: 'pro', providerEventId: ev.provider_event_id, claimToken: claim.claim_token, error: 'test_cleanup',
    })).toBe(true);
  });

  it('5) same transition from two notifications enqueues one effect', async () => {
    const { deps } = makeDeps();
    await processProPreapprovalEvent({ supabase, subscription: await subRow(), preapproval: pre('authorized', '2026-10-22T10:00:00Z'), deps });
    await processProPreapprovalEvent({ supabase, subscription: await subRow(), preapproval: pre('authorized', '2026-10-22T10:00:01Z'), deps });
    const effects = await effectsOf();
    expect(effects.filter((e) => e.effect_type === 'analytics')).toHaveLength(1);
    expect(effects.filter((e) => e.effect_type === 'email_welcome')).toHaveLength(1);
  });

  it('6) email sent then crash before marking: retry marks it sent (at-least-once)', async () => {
    const { calls, deps } = makeDeps();
    await processProPreapprovalEvent({ supabase, subscription: await subRow(), preapproval: pre('authorized', '2026-10-22T10:00:00Z'), deps });
    const email = (await effectsOf()).find((e) => e.effect_type === 'email_welcome');
    // Simulate: provider delivered, then the worker died before complete_effect.
    await supabase.from('subscription_effects')
      .update({ status: 'processing', lease_expires_at: new Date(Date.now() - 1000).toISOString() })
      .eq('id', email.id);
    await drainSubscriptionEffects(supabase, deps.effectHandlers);
    const after = (await effectsOf()).find((e) => e.id === email.id);
    expect(after.status).toBe('sent');
    expect(calls.emails).toHaveLength(2); // re-execution is possible: at-least-once
  });

  it('7) eight attempts -> dead', async () => {
    const { calls, deps } = makeDeps({ analyticsThrows: true });
    const { error } = await supabase.from('subscription_effects').insert({
      product_type: 'pro', subscription_id: SUB_ID, effect_type: 'analytics',
      transition_key: 'dead-test', payload: {}, status: 'failed', attempts: 7,
      next_attempt_at: new Date(Date.now() - 1000).toISOString(),
    });
    if (error) throw error;
    await drainSubscriptionEffects(supabase, deps.effectHandlers, { maxAttempts: 8 });
    const row = (await effectsOf()).find((e) => e.transition_key === 'dead-test');
    expect(row.status).toBe('dead');
    expect(row.attempts).toBe(8);
    expect(calls.analytics).toHaveLength(0);
  });

  it('8) an old preapproval id is not the active resource', () => {
    expect(matchesActiveProvider({ provider_subscription_id: 'NEW', pending_provider_subscription_id: null }, 'OLD')).toBe(false);
    expect(matchesActiveProvider({ provider_subscription_id: 'NEW', pending_provider_subscription_id: null }, 'NEW')).toBe(true);
  });
});
