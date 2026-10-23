// @vitest-environment node
//
// H4 — REAL PostgreSQL sandbox evidence for stuck-event recovery and outbox
// terminalization. Skipped unless both env vars are set:
//   SANDBOX_SUPABASE_URL=http://127.0.0.1:54321
//   SANDBOX_SERVICE_ROLE_KEY=<local service_role key>
//
// NEVER point these at production. The tests delete rows by fixed UUIDs.
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { processProPreapprovalEvent } from './proPreapprovalEvent.mjs';
import { expireSubscriptionEffects } from './subscriptionEffects.mjs';
import { recoverSubscriptionEvents } from './subscriptionRecovery.mjs';

const URL = process.env.SANDBOX_SUPABASE_URL;
const KEY = process.env.SANDBOX_SERVICE_ROLE_KEY;
const suite = URL && KEY ? describe : describe.skip;
const supabase = URL && KEY ? createClient(URL, KEY, { auth: { persistSession: false } }) : null;

const SUB_ID = '00000000-0000-4000-8000-0000000000a1';
const LAWYER_ID = '00000000-0000-4000-8000-0000000000a2';
const PRE_ID = 'PRE-SBX-R1';

const pre = (status, at, id = PRE_ID) => ({
  id, status, date_created: at, last_modified: at,
  auto_recurring: { start_date: at },
  next_payment_date: '2026-11-22T00:00:00.000Z',
});

function makeDeps() {
  const calls = { analytics: [], emails: [] };
  return {
    calls,
    deps: {
      priceClp: 19990,
      effectHandlers: {
        analytics: async (p) => { calls.analytics.push(p); },
        email_welcome: async (p) => { calls.emails.push(p); },
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
    provider_subscription_id: PRE_ID,
    amount_clp: 19990,
  });
  if (error) throw error;
}

async function subRow() {
  const { data, error } = await supabase.from('lawyer_subscriptions').select('*').eq('id', SUB_ID).single();
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

async function insertEvent(overrides = {}) {
  const row = {
    product_type: 'pro',
    subscription_id: SUB_ID,
    provider: 'mercadopago',
    provider_event_id: `${PRE_ID}:authorized:2026-10-22T10:00:00Z`,
    provider_event_at: '2026-10-22T10:00:00Z',
    event_type: 'preapproval_authorized',
    provider_status: 'authorized',
    resource_id: PRE_ID,
    resource_status: 'authorized',
    status: 'failed',
    attempts: 1,
    next_attempt_at: new Date(Date.now() - 1000).toISOString(),
    ...overrides,
  };
  const { error } = await supabase.from('subscription_events').insert(row);
  if (error) throw error;
  return row;
}

function handlers(deps) {
  return {
    preapproval: async (preapproval) => processProPreapprovalEvent({
      supabase,
      subscription: await subRow(),
      preapproval,
      deps,
    }),
    payment: async () => ({ ok: true }),
  };
}

suite('H4 — real Postgres subscription recovery', () => {
  beforeEach(async () => { await reset(); });
  afterAll(async () => {
    await supabase.from('subscription_effects').delete().eq('subscription_id', SUB_ID);
    await supabase.from('subscription_events').delete().eq('subscription_id', SUB_ID);
    await supabase.from('lawyer_subscriptions').delete().eq('id', SUB_ID);
  });

  it('1) recovers a failed event by re-running the same handler and keeps one effect set', async () => {
    const at = '2026-10-22T10:00:00Z';
    const eventId = `${PRE_ID}:authorized:${at}`;
    await insertEvent({ provider_event_id: eventId, provider_event_at: at });
    const { calls, deps } = makeDeps();

    const result = await recoverSubscriptionEvents(supabase, {
      fetchPreapproval: async () => ({ ok: true, data: pre('authorized', at) }),
      fetchPayment: async () => ({ ok: false, retryable: false, reason: 'unexpected' }),
      handlers: handlers(deps),
      logger: { log() {} },
    });

    expect(result).toMatchObject({ scanned: 1, recovered: 1, deferred: 0, superseded: 0, busy: 0, failed: 0 });
    const ev = await eventOf(eventId);
    expect(ev.status).toBe('processed');
    expect(ev.attempts).toBe(2);
    expect(calls.analytics).toHaveLength(1);
    expect(calls.emails).toHaveLength(1);
  });

  it('2) a changed provider identity is processed as a new event; the stale row is superseded', async () => {
    const oldAt = '2026-10-22T09:00:00Z';
    const newAt = '2026-10-22T10:00:00Z';
    const oldId = `${PRE_ID}:authorized:${oldAt}`;
    const newId = `${PRE_ID}:authorized:${newAt}`;
    await insertEvent({ provider_event_id: oldId, provider_event_at: oldAt });
    const { deps } = makeDeps();

    const result = await recoverSubscriptionEvents(supabase, {
      fetchPreapproval: async () => ({ ok: true, data: pre('authorized', newAt) }),
      fetchPayment: async () => ({ ok: false, retryable: false, reason: 'unexpected' }),
      handlers: handlers(deps),
      logger: { log() {} },
    });

    expect(result.recovered).toBe(1);
    const oldRow = await eventOf(oldId);
    const newRow = await eventOf(newId);
    expect(oldRow.status).toBe('dead');
    expect(oldRow.last_error).toBe('superseded:replayed');
    expect(newRow.status).toBe('processed');
  });

  it('3) a failed event inside its backoff window is not recovered yet', async () => {
    await insertEvent({ next_attempt_at: new Date(Date.now() + 60_000).toISOString() });
    const result = await recoverSubscriptionEvents(supabase, {
      fetchPreapproval: async () => ({ ok: true, data: pre('authorized', '2026-10-22T10:00:00Z') }),
      fetchPayment: async () => ({ ok: true, data: {} }),
      handlers: handlers(makeDeps().deps),
      logger: { log() {} },
    });

    expect(result.scanned).toBe(0);
    expect((await eventOf(`${PRE_ID}:authorized:2026-10-22T10:00:00Z`)).status).toBe('failed');
  });

  it('4) an exhausted event is terminalized before listing and is not retried', async () => {
    const eventId = `${PRE_ID}:authorized:2026-10-22T10:00:00Z`;
    await insertEvent({ provider_event_id: eventId, attempts: 8 });
    const result = await recoverSubscriptionEvents(supabase, {
      fetchPreapproval: async () => ({ ok: true, data: pre('authorized', '2026-10-22T10:00:00Z') }),
      fetchPayment: async () => ({ ok: true, data: {} }),
      handlers: handlers(makeDeps().deps),
      logger: { log() {} },
    });

    expect(result.expired).toBe(1);
    expect(result.scanned).toBe(0);
    const ev = await eventOf(eventId);
    expect(ev.status).toBe('dead');
    expect(ev.dead_at).toBeTruthy();
  });

  it('5) an effect stuck at max attempts is terminalized even without a drainer', async () => {
    const { error } = await supabase.from('subscription_effects').insert({
      product_type: 'pro', subscription_id: SUB_ID, effect_type: 'analytics',
      transition_key: 'h4-dead-effect', payload: {}, status: 'processing',
      attempts: 8, next_attempt_at: new Date(Date.now() - 1000).toISOString(),
      lease_expires_at: new Date(Date.now() - 1000).toISOString(),
    });
    if (error) throw error;

    expect(await expireSubscriptionEffects(supabase)).toBe(1);
    const { data } = await supabase.from('subscription_effects').select('*')
      .eq('subscription_id', SUB_ID).eq('transition_key', 'h4-dead-effect').single();
    expect(data.status).toBe('dead');
  });

  it('6) defer is guarded by the expected row identity and does not clobber a live claim', async () => {
    const eventId = `${PRE_ID}:authorized:2026-10-22T10:00:00Z`;
    await insertEvent({ provider_event_id: eventId, attempts: 1 });

    const wrong = await supabase.rpc('defer_subscription_event', {
      p_id: (await eventOf(eventId)).id,
      p_expected_status: 'failed',
      p_expected_attempts: 0,
      p_error: 'stale_worker',
      p_max_attempts: 8,
    });
    expect(wrong.data).toBe(false);
    expect((await eventOf(eventId)).status).toBe('failed');

    const right = await supabase.rpc('defer_subscription_event', {
      p_id: (await eventOf(eventId)).id,
      p_expected_status: 'failed',
      p_expected_attempts: 1,
      p_error: 'provider_down',
      p_max_attempts: 8,
    });
    expect(right.data).toBe(true);
    const row = await eventOf(eventId);
    expect(row.status).toBe('failed');
    expect(Date.parse(row.next_attempt_at)).toBeGreaterThan(Date.now());
  });

  it('7) claim returns backoff without incrementing attempts, then claims when due', async () => {
    const eventId = `${PRE_ID}:authorized:2026-10-22T10:00:00Z`;
    await insertEvent({
      provider_event_id: eventId,
      attempts: 1,
      next_attempt_at: new Date(Date.now() + 60_000).toISOString(),
    });

    const early = await supabase.rpc('claim_subscription_event', {
      p_provider: 'mercadopago', p_event_id: eventId, p_product_type: 'pro',
      p_lease_seconds: 600, p_max_attempts: 8,
    });
    expect(early.data[0]).toMatchObject({ claimed: false, reason: 'backoff', attempts: 1 });

    await supabase.from('subscription_events')
      .update({ next_attempt_at: new Date(Date.now() - 1000).toISOString() })
      .eq('provider_event_id', eventId);
    const due = await supabase.rpc('claim_subscription_event', {
      p_provider: 'mercadopago', p_event_id: eventId, p_product_type: 'pro',
      p_lease_seconds: 600, p_max_attempts: 8,
    });
    expect(due.data[0]).toMatchObject({ claimed: true, reason: 'claimed', attempts: 2 });
  });

  it('8) fail at the attempt limit becomes dead and cannot be reclaimed', async () => {
    const eventId = `${PRE_ID}:authorized:2026-10-22T10:00:00Z`;
    await insertEvent({ provider_event_id: eventId, attempts: 7 });
    const claim = await supabase.rpc('claim_subscription_event', {
      p_provider: 'mercadopago', p_event_id: eventId, p_product_type: 'pro',
      p_lease_seconds: 600, p_max_attempts: 8,
    });
    expect(claim.data[0].claimed).toBe(true);

    const failed = await supabase.rpc('fail_subscription_event', {
      p_provider: 'mercadopago', p_event_id: eventId, p_product_type: 'pro',
      p_claim_token: claim.data[0].claim_token, p_error: 'boom', p_max_attempts: 8,
    });
    expect(failed.data).toBe(true);
    const row = await eventOf(eventId);
    expect(row.status).toBe('dead');
    expect(row.dead_at).toBeTruthy();

    const again = await supabase.rpc('claim_subscription_event', {
      p_provider: 'mercadopago', p_event_id: eventId, p_product_type: 'pro',
      p_lease_seconds: 600, p_max_attempts: 8,
    });
    expect(again.data[0]).toMatchObject({ claimed: false, reason: 'terminal', attempts: 8 });
  });

  it('9) defer increments attempts, backs off and terminalizes at the limit', async () => {
    const eventId = `${PRE_ID}:authorized:2026-10-22T10:00:00Z`;
    await insertEvent({ provider_event_id: eventId, attempts: 0, status: 'failed' });

    let row = await eventOf(eventId);
    for (let attempt = 1; attempt <= 3; attempt++) {
      const { data, error } = await supabase.rpc('defer_subscription_event', {
        p_id: row.id,
        p_expected_status: row.status,
        p_expected_attempts: row.attempts,
        p_error: 'provider_down',
        p_max_attempts: 3,
      });
      if (error) throw error;
      expect(data).toBe(true);
      row = await eventOf(eventId);
      expect(row.attempts).toBe(attempt);
    }

    expect(row.status).toBe('dead');
    expect(row.dead_at).toBeTruthy();
    expect(row.next_attempt_at).toBeNull();
  });

  it('10) recovery only lists eligible rows with a real resource id', async () => {
    await insertEvent({
      provider_event_id: 'EV-INELIGIBLE',
      recovery_eligible: false,
      resource_id: 'PRE-INELIGIBLE',
    });
    await insertEvent({
      provider_event_id: 'EV-NO-RESOURCE',
      recovery_eligible: true,
      resource_id: null,
    });
    await insertEvent({
      provider_event_id: 'EV-OK',
      recovery_eligible: true,
      resource_id: 'PRE-OK',
    });

    const { data, error } = await supabase.rpc('recoverable_subscription_events', {
      p_limit: 10,
      p_max_attempts: 8,
    });
    if (error) throw error;

    expect(data.map((e) => e.provider_event_id)).toEqual(['EV-OK']);
  });

  it('11) the recovery lease is exclusive, releasable and owner-fenced', async () => {
    const name = `sbx-lease-${Date.now()}`;
    const holderA = '00000000-0000-4000-8000-0000000000b1';
    const holderB = '00000000-0000-4000-8000-0000000000b2';

    const first = await supabase.rpc('acquire_subscription_recovery_lease', {
      p_name: name, p_holder: holderA, p_lease_seconds: 60,
    });
    expect(first.data).toBe(true);

    const second = await supabase.rpc('acquire_subscription_recovery_lease', {
      p_name: name, p_holder: holderB, p_lease_seconds: 60,
    });
    expect(second.data).toBe(false);

    const wrongRelease = await supabase.rpc('release_subscription_recovery_lease', {
      p_name: name, p_holder: holderB,
    });
    expect(wrongRelease.data).toBe(false);

    const release = await supabase.rpc('release_subscription_recovery_lease', {
      p_name: name, p_holder: holderA,
    });
    expect(release.data).toBe(true);

    const after = await supabase.rpc('acquire_subscription_recovery_lease', {
      p_name: name, p_holder: holderB, p_lease_seconds: 60,
    });
    expect(after.data).toBe(true);

    await supabase.from('subscription_recovery_leases').delete().eq('name', name);
  });

  it('12) requeue reopens only a dead Pro event and writes an audit row', async () => {
    const eventId = `${PRE_ID}:authorized:2026-10-22T10:00:00Z`;
    await insertEvent({
      provider_event_id: eventId,
      status: 'dead',
      attempts: 8,
      next_attempt_at: null,
      dead_at: new Date().toISOString(),
    });
    const row = await eventOf(eventId);

    const requeued = await supabase.rpc('requeue_subscription_event', {
      p_id: row.id,
      p_operator: 'ops@example.com',
      p_reason: 'provider recovered',
    });
    expect(requeued.data).toBe(true);

    const after = await eventOf(eventId);
    expect(after.status).toBe('failed');
    expect(after.attempts).toBe(0);
    expect(after.dead_at).toBeNull();
    expect(after.recovery_eligible).toBe(true);

    const { data: audit, error: auditError } = await supabase
      .from('subscription_event_requeues')
      .select('*')
      .eq('event_id', row.id)
      .single();
    if (auditError) throw auditError;
    expect(audit).toMatchObject({
      operator: 'ops@example.com',
      reason: 'provider recovered',
      previous_status: 'dead',
      previous_attempts: 8,
    });

    // A live event is never reopened by requeue.
    await insertEvent({ provider_event_id: 'EV-LIVE', status: 'failed', attempts: 1 });
    const live = await eventOf('EV-LIVE');
    const liveRequeue = await supabase.rpc('requeue_subscription_event', {
      p_id: live.id,
      p_operator: 'ops@example.com',
      p_reason: 'should not happen',
    });
    expect(liveRequeue.data).toBe(false);

    // An operator is mandatory.
    const noOperator = await supabase.rpc('requeue_subscription_event', {
      p_id: row.id,
      p_operator: '   ',
      p_reason: 'missing operator',
    });
    expect(noOperator.error).toBeTruthy();
  });
});
