// @vitest-environment node
//
// FASE 4.65 — real PostgreSQL checks for payment event identity/order.
// Skipped unless the isolated sandbox env vars are present. Never production.
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { processProAuthorizedPaymentEvent } from './proPaymentEvent.mjs';

const URL = process.env.SANDBOX_SUPABASE_URL;
const KEY = process.env.SANDBOX_SERVICE_ROLE_KEY;
const suite = URL && KEY ? describe : describe.skip;
const supabase = URL && KEY ? createClient(URL, KEY, { auth: { persistSession: false } }) : null;

const SUB_ID = '00000000-0000-4000-8000-000000000101';
const LAWYER_ID = '00000000-0000-4000-8000-000000000102';
const PRE_ID = 'PRE-ID-1';

const deps = {
  priceClp: 19990,
  effectHandlers: {
    analytics: async () => {},
    email_welcome: async () => {},
  },
};

function payment(id, status, at, extra = {}) {
  return {
    id,
    status,
    preapproval_id: PRE_ID,
    transaction_amount: 19990,
    date_created: at,
    date_last_updated: at,
    ...extra,
  };
}

async function reset() {
  await supabase.from('subscription_effects').delete().eq('subscription_id', SUB_ID);
  await supabase.from('subscription_events').delete().eq('subscription_id', SUB_ID);
  await supabase.from('pro_subscription_payments').delete().eq('lawyer_id', LAWYER_ID);
  await supabase.from('pro_founder_reservations').delete().eq('lawyer_id', LAWYER_ID);
  await supabase.from('lawyer_subscriptions').delete().eq('id', SUB_ID);
  await supabase.from('profiles').delete().eq('id', LAWYER_ID);
  await supabase.from('profiles').insert({ id: LAWYER_ID, role: 'lawyer', is_founder: false });
  const { error } = await supabase.from('lawyer_subscriptions').insert({
    id: SUB_ID,
    lawyer_id: LAWYER_ID,
    plan: 'pro',
    status: 'pending',
    provider_subscription_id: PRE_ID,
    amount_clp: 19990,
    cancelled_at: null,
  });
  if (error) throw error;
}

async function subRow() {
  const { data, error } = await supabase.from('lawyer_subscriptions').select('*').eq('id', SUB_ID).single();
  if (error) throw error;
  return data;
}

async function ledger() {
  const { data, error } = await supabase.from('pro_subscription_payments')
    .select('*').eq('lawyer_id', LAWYER_ID).order('paid_at');
  if (error) throw error;
  return data;
}

async function events() {
  const { data, error } = await supabase.from('subscription_events')
    .select('*').eq('subscription_id', SUB_ID).order('created_at');
  if (error) throw error;
  return data;
}

suite('FASE 4.65 — payment identity/order in real Postgres sandbox', () => {
  beforeEach(reset);
  afterAll(async () => {
    await supabase.from('subscription_effects').delete().eq('subscription_id', SUB_ID);
    await supabase.from('subscription_events').delete().eq('subscription_id', SUB_ID);
    await supabase.from('pro_subscription_payments').delete().eq('lawyer_id', LAWYER_ID);
    await supabase.from('pro_founder_reservations').delete().eq('lawyer_id', LAWYER_ID);
    await supabase.from('lawyer_subscriptions').delete().eq('id', SUB_ID);
    await supabase.from('profiles').delete().eq('id', LAWYER_ID);
  });

  it('A) a previous pending event does not block the later approved event', async () => {
    const pending = payment(9101, 'pending', '2026-10-22T10:00:00.000Z');
    expect((await processProAuthorizedPaymentEvent({ supabase, payment: pending, subscription: await subRow(), preapprovalId: PRE_ID, deps })).skipped).toBe('non_final_status');
    expect((await subRow()).status).toBe('pending');
    expect(await ledger()).toHaveLength(1);

    const approved = payment(9101, 'approved', '2026-10-22T11:00:00.000Z');
    expect((await processProAuthorizedPaymentEvent({ supabase, payment: approved, subscription: await subRow(), preapprovalId: PRE_ID, deps })).ok).toBe(true);
    expect((await subRow()).status).toBe('active');
    const rows = await ledger();
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('approved');
    const evs = await events();
    expect(evs.find((e) => e.provider_event_id === '9101:pending').status).toBe('processed');
    expect(evs.find((e) => e.provider_event_id === '9101').status).toBe('processed');
  });

  it('B) historical approved identity remains terminal, while a new status is not blocked', async () => {
    const { error } = await supabase.from('subscription_events').insert({
      product_type: 'pro', subscription_id: SUB_ID, provider: 'mercadopago',
      provider_event_id: '9201', provider_event_at: '2026-10-22T10:00:00.000Z',
      event_type: 'payment_approved', provider_status: 'approved', status: 'processed',
    });
    if (error) throw error;
    const approved = payment(9201, 'approved', '2026-10-22T10:00:00.000Z');
    const r = await processProAuthorizedPaymentEvent({ supabase, payment: approved, subscription: await subRow(), preapprovalId: PRE_ID, deps });
    expect(r.skipped).toBe('terminal');
    expect(await ledger()).toHaveLength(0);

    const pending = payment(9201, 'pending', '2026-10-22T11:00:00.000Z');
    const p = await processProAuthorizedPaymentEvent({ supabase, payment: pending, subscription: await subRow(), preapprovalId: PRE_ID, deps });
    expect(p.skipped).toBe('non_final_status');
    expect(await ledger()).toHaveLength(1);
    expect((await events()).find((e) => e.provider_event_id === '9201:pending').status).toBe('processed');
  });

  it('C) an old refund/chargeback does not revoke a newer reactivated subscription', async () => {
    await supabase.from('lawyer_subscriptions').update({ status: 'active', cancelled_at: null }).eq('id', SUB_ID);
    const oldRefund = payment(9301, 'refunded', '2026-01-01T00:00:00.000Z');
    expect((await processProAuthorizedPaymentEvent({ supabase, payment: oldRefund, subscription: await subRow(), preapprovalId: PRE_ID, deps })).revoked).toBe(true);
    expect((await subRow()).status).toBe('cancelled');

    const future = new Date(Date.now() + 60_000).toISOString();
    const reactivation = payment(9302, 'approved', future);
    expect((await processProAuthorizedPaymentEvent({ supabase, payment: reactivation, subscription: await subRow(), preapprovalId: PRE_ID, deps })).ok).toBe(true);
    expect((await subRow()).status).toBe('active');

    const oldChargeback = payment(9303, 'charged_back', '2026-01-02T00:00:00.000Z');
    const cb = await processProAuthorizedPaymentEvent({ supabase, payment: oldChargeback, subscription: await subRow(), preapprovalId: PRE_ID, deps });
    expect(cb.skipped).toBe('out_of_order');
    expect((await subRow()).status).toBe('active');

    const redeliveredRefund = payment(9301, 'refunded', '2026-01-01T00:00:00.000Z');
    const rr = await processProAuthorizedPaymentEvent({ supabase, payment: redeliveredRefund, subscription: await subRow(), preapprovalId: PRE_ID, deps });
    expect(rr.skipped).toBe('terminal');
    expect((await subRow()).status).toBe('active');
  });

  it('D) date_last_updated is optional: date_created is the event time', async () => {
    const at = '2026-10-22T12:00:00.000Z';
    const p = payment(9401, 'approved', at, { date_last_updated: undefined });
    expect((await processProAuthorizedPaymentEvent({ supabase, payment: p, subscription: await subRow(), preapprovalId: PRE_ID, deps })).ok).toBe(true);
    const ev = (await events()).find((e) => e.provider_event_id === '9401');
    expect(Date.parse(ev.provider_event_at)).toBe(Date.parse(at));
    expect((await subRow()).status).toBe('active');
  });

  it('E) unknown status is audited, acked and does not mutate access', async () => {
    await supabase.from('lawyer_subscriptions').update({ status: 'active', cancelled_at: null }).eq('id', SUB_ID);
    const p = payment(9501, 'mystery_status', '2026-10-22T13:00:00.000Z');
    const r = await processProAuthorizedPaymentEvent({ supabase, payment: p, subscription: await subRow(), preapprovalId: PRE_ID, deps });
    expect(r.skipped).toBe('unhandled_status');
    expect((await subRow()).status).toBe('active');
    const ev = (await events()).find((e) => e.provider_event_id === '9501:mystery_status');
    expect(ev.status).toBe('processed');
    expect(ev.provider_status).toBe('mystery_status');
    expect((await ledger())[0].status).toBe('mystery_status');
  });
});
