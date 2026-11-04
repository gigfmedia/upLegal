// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, it, expect, vi } from 'vitest';
import {
  drainAllUnresolvedAuthorizedPayments,
  drainUnresolvedAuthorizedPayments,
  listUnresolvedPreapprovalIds,
  processUnresolvedProPayment,
  stageUnresolvedAuthorizedPayment,
  UNRESOLVED_DECLINED_EVENT_MAX_AGE_MS,
} from './subscriptions/proUnresolvedEvents.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverSrc = readFileSync(resolve(__dirname, '../server.mjs'), 'utf8');
const inboxSrc = readFileSync(resolve(__dirname, './subscriptions/proUnresolvedEvents.mjs'), 'utf8');
const migrationSrc = readFileSync(resolve(__dirname, '../supabase/migrations/20261026000000_pro_unresolved_provider_events.sql'), 'utf8');

function makeSupabase(seed = [], { insertError = null, updateErrorFor = null } = {}) {
  const state = { rows: seed.map((row, i) => ({ id: row.id || `u${i + 1}`, attempts: 0, status: 'pending', ...row })) };
  let nextId = state.rows.length + 1;
  const from = () => {
    const q = { op: null, payload: null, filters: [], order: null, max: null };
    const matches = (row) => q.filters.every(([column, value]) => {
      if (value && typeof value === 'object' && value.__in) return value.__in.map(String).includes(String(row[column] ?? ''));
      if (value && typeof value === 'object' && value.__lt != null) return String(row[column] ?? '') < String(value.__lt);
      return String(row[column] ?? '') === String(value);
    });
    const exec = () => {
      if (q.op === 'insert') {
        if (insertError) return { data: null, error: insertError };
        const duplicate = state.rows.find((row) => (
          row.provider === q.payload.provider
          && row.provider_event_id === q.payload.provider_event_id
          && row.event_kind === q.payload.event_kind
        ));
        if (duplicate) return { data: null, error: { code: '23505', message: 'duplicate key' } };
        const row = { id: `u${nextId++}`, attempts: 0, status: 'pending', ...q.payload };
        state.rows.push(row);
        return { data: row, error: null };
      }
      if (q.op === 'update') {
        if (updateErrorFor && updateErrorFor(q.payload, q.filters)) return { data: null, error: { code: 'XX000', message: 'db down' } };
        const found = state.rows.filter(matches);
        for (const row of found) Object.assign(row, q.payload);
        return { data: found, error: null };
      }
      let found = state.rows.filter(matches);
      if (q.order) found = [...found].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
      if (q.range) found = found.slice(q.range[0], q.range[1] + 1);
      else if (q.max != null) found = found.slice(0, q.max);
      return { data: found, error: null };
    };
    const api = {
      insert(payload) { q.op = 'insert'; q.payload = payload; return api; },
      update(payload) { q.op = 'update'; q.payload = payload; return api; },
      select() { if (!q.op) q.op = 'select'; return api; },
      eq(column, value) { q.filters.push([column, value]); return api; },
      in(column, values) { q.filters.push([column, { __in: values }]); return api; },
      lt(column, value) { q.filters.push([column, { __lt: value }]); return api; },
      order() { q.order = true; return api; },
      limit(n) { q.max = n; return api; },
      range(from, to) { q.range = [from, to]; return api; },
      maybeSingle() {
        const result = exec();
        return Promise.resolve({ data: Array.isArray(result.data) ? (result.data[0] ?? null) : result.data, error: result.error });
      },
      then(res, rej) { return Promise.resolve(exec()).then(res, rej); },
    };
    return api;
  };
  return { state, from };
}

const approved = (id = 'pay-1') => ({
  id,
  preapproval_id: 'PLUS-1',
  status: 'approved',
  transaction_amount: 19990,
  date_created: '2026-10-26T12:00:00Z',
});

describe('P1-5 — durable early-payment inbox', () => {
  it('stages an approved early payment idempotently', async () => {
    const s = makeSupabase();
    const first = await stageUnresolvedAuthorizedPayment(s, { preapprovalId: 'PLUS-1', payment: approved() });
    const second = await stageUnresolvedAuthorizedPayment(s, { preapprovalId: 'PLUS-1', payment: approved() });
    expect(first).toMatchObject({ ok: true, duplicate: false });
    expect(second).toMatchObject({ ok: true, duplicate: true });
    expect(s.state.rows).toHaveLength(1);
    expect(s.state.rows[0]).toMatchObject({ event_kind: 'authorized_payment', preapproval_id: 'PLUS-1', status: 'pending' });
  });

  it('stores a rejected payment too, so a late provider link can see the outcome', async () => {
    const s = makeSupabase();
    const result = await stageUnresolvedAuthorizedPayment(s, {
      preapprovalId: 'PLUS-1',
      payment: { ...approved(), status: 'rejected' },
    });
    expect(result.ok).toBe(true);
    expect(s.state.rows[0].provider_status).toBe('rejected');
  });

  it('terminates a declined unlinked event after the reconciliation window without changing any subscription', async () => {
    const old = new Date(Date.now() - UNRESOLVED_DECLINED_EVENT_MAX_AGE_MS - 60 * 60 * 1000).toISOString();
    const s = makeSupabase([{
      id: 'u1', provider: 'mercadopago', provider_event_id: 'pay-rejected', event_kind: 'authorized_payment',
      preapproval_id: 'PLUS-1', provider_status: 'rejected', payload: { ...approved('pay-rejected'), status: 'rejected' },
      created_at: old, status: 'pending',
    }]);
    const processPayment = vi.fn(async () => ({ transient: true, reason: 'provider_link_not_ready' }));
    const result = await drainUnresolvedAuthorizedPayments(s, { preapprovalId: 'PLUS-1', processPayment });
    expect(result).toMatchObject({ ok: true, processed: 0, pending: 0, invalid: 1 });
    expect(s.state.rows[0]).toMatchObject({ status: 'invalid', attempts: 1 });
    expect(s.state.rows[0].last_error).toContain('declined_reconciliation_expired');
  });

  it('does not expire a declined event whose provider link exists but processing is transient', async () => {
    const old = new Date(Date.now() - UNRESOLVED_DECLINED_EVENT_MAX_AGE_MS - 60 * 60 * 1000).toISOString();
    const s = makeSupabase([{
      id: 'u1', provider: 'mercadopago', provider_event_id: 'pay-rejected-linked', event_kind: 'authorized_payment',
      preapproval_id: 'PLUS-1', provider_status: 'rejected', payload: { ...approved('pay-rejected-linked'), status: 'rejected' },
      created_at: old, status: 'pending',
    }]);
    const result = await drainUnresolvedAuthorizedPayments(s, {
      preapprovalId: 'PLUS-1',
      processPayment: async () => ({ transient: true, reason: 'event_in_flight' }),
    });
    expect(result).toMatchObject({ pending: 1, invalid: 0 });
    expect(s.state.rows[0].status).toBe('pending');
  });

  it('keeps a declined event inside the window and moves an unlinked approved event to review', async () => {
    const now = new Date('2026-10-27T12:00:00Z');
    const recent = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const old = new Date(now.getTime() - UNRESOLVED_DECLINED_EVENT_MAX_AGE_MS - 60 * 60 * 1000).toISOString();
    const s = makeSupabase([
      {
        id: 'u1', provider: 'mercadopago', provider_event_id: 'pay-recent-rejected', event_kind: 'authorized_payment',
        preapproval_id: 'PLUS-1', provider_status: 'rejected', payload: { ...approved('pay-recent-rejected'), status: 'rejected' },
        created_at: recent, status: 'pending',
      },
      {
        id: 'u2', provider: 'mercadopago', provider_event_id: 'pay-old-approved', event_kind: 'authorized_payment',
        preapproval_id: 'PLUS-1', provider_status: 'approved', payload: approved('pay-old-approved'),
        created_at: old, status: 'pending',
      },
    ]);
    const result = await drainUnresolvedAuthorizedPayments(s, {
      preapprovalId: 'PLUS-1',
      now,
      processPayment: async () => ({ transient: true, reason: 'provider_link_not_ready' }),
    });
    expect(result).toMatchObject({ pending: 1, invalid: 0, review: 1 });
    expect(s.state.rows.find((r) => r.id === 'u1').status).toBe('pending');
    expect(s.state.rows.find((r) => r.id === 'u2')).toMatchObject({ status: 'needs_review' });
  });

  it.each(['refunded', 'charged_back'])('moves an unlinked %s to review without applying it', async (status) => {
    const payment = { ...approved('pay-reversal'), status };
    const applyPayment = vi.fn(async () => undefined);
    const result = await processUnresolvedProPayment({
      payment,
      findSubscription: async () => null,
      applyPayment,
    });
    expect(result).toEqual({
      review: true,
      reason: `payment_${status}_unlinked_reversal_review`,
    });
    expect(applyPayment).not.toHaveBeenCalled();
  });

  it('keeps an unlinked approved payment retryable while it has no subscription', async () => {
    const result = await processUnresolvedProPayment({
      payment: approved('pay-approved'),
      findSubscription: async () => null,
      applyPayment: vi.fn(async () => undefined),
    });
    expect(result).toMatchObject({ transient: true, reason: 'provider_link_not_ready' });
  });

  it('applies normal linked payments and propagates transient outcomes', async () => {
    const applyPayment = vi.fn(async () => undefined);
    const linked = await processUnresolvedProPayment({
      payment: approved('pay-linked'),
      findSubscription: async () => ({ id: 'sub-1' }),
      applyPayment,
    });
    expect(linked).toMatchObject({ ok: true });
    expect(applyPayment).toHaveBeenCalledTimes(1);

    const transient = await processUnresolvedProPayment({
      payment: approved('pay-linked'),
      findSubscription: async () => ({ id: 'sub-1' }),
      applyPayment: async () => ({ transient: true, reason: 'event_in_flight' }),
    });
    expect(transient).toMatchObject({ transient: true, reason: 'event_in_flight' });
  });

  it('drains an unlinked reversal to needs_review exactly once', async () => {
    const s = makeSupabase();
    const payment = { ...approved('pay-refund'), status: 'refunded' };
    await stageUnresolvedAuthorizedPayment(s, { preapprovalId: 'PLUS-1', payment });
    await stageUnresolvedAuthorizedPayment(s, { preapprovalId: 'PLUS-1', payment });

    const replay = () => processUnresolvedProPayment({
      payment,
      findSubscription: async () => null,
      applyPayment: vi.fn(async () => undefined),
    });
    const first = await drainUnresolvedAuthorizedPayments(s, { preapprovalId: 'PLUS-1', processPayment: replay });
    const second = await drainUnresolvedAuthorizedPayments(s, { preapprovalId: 'PLUS-1', processPayment: replay });

    expect(first).toMatchObject({ review: 1, processed: 0, pending: 0 });
    expect(second).toMatchObject({ review: 0, processed: 0, pending: 0 });
    expect(s.state.rows).toHaveLength(1);
    expect(s.state.rows[0]).toMatchObject({
      provider_event_id: 'pay-refund:refunded',
      status: 'needs_review',
      last_error: 'payment_refunded_unlinked_reversal_review',
    });
  });

  it('does not store a payment without provider identity', async () => {
    const s = makeSupabase();
    const result = await stageUnresolvedAuthorizedPayment(s, {
      preapprovalId: 'PLUS-1',
      payment: { ...approved(), id: null },
    });
    expect(result).toMatchObject({ ok: false, invalid: true });
    expect(s.state.rows).toHaveLength(0);
  });

  it('throws instead of acknowledging a failed durable write', async () => {
    const s = makeSupabase([], { insertError: { code: 'XX000', message: 'db down' } });
    await expect(stageUnresolvedAuthorizedPayment(s, { preapprovalId: 'PLUS-1', payment: approved() }))
      .rejects.toMatchObject({ code: 'XX000' });
  });

  it('drains processed and invalid rows while retrying transient ones', async () => {
    const s = makeSupabase([
      {
        id: 'u1', provider: 'mercadopago', provider_event_id: 'pay-ok', event_kind: 'authorized_payment',
        preapproval_id: 'PLUS-1', payload: approved('pay-ok'), created_at: '2026-10-26T10:00:00Z', status: 'pending',
      },
      {
        id: 'u2', provider: 'mercadopago', provider_event_id: 'pay-retry', event_kind: 'authorized_payment',
        preapproval_id: 'PLUS-1', payload: approved('pay-retry'), created_at: '2026-10-26T11:00:00Z', status: 'pending',
      },
      {
        id: 'u3', provider: 'mercadopago', provider_event_id: '', event_kind: 'authorized_payment',
        preapproval_id: 'PLUS-1', payload: approved(''), created_at: '2026-10-26T12:00:00Z', status: 'pending',
      },
    ]);
    const result = await drainUnresolvedAuthorizedPayments(s, {
      preapprovalId: 'PLUS-1',
      now: new Date('2026-10-26T13:00:00Z'),
      processPayment: async (payment) => {
        if (payment.id === 'pay-retry') return { transient: true, reason: 'provider_link_not_ready' };
        return { ok: true };
      },
    });
    expect(result).toMatchObject({ ok: true, processed: 1, pending: 1, invalid: 1 });
    expect(s.state.rows.find((r) => r.id === 'u1').status).toBe('processed');
    expect(s.state.rows.find((r) => r.id === 'u2')).toMatchObject({ status: 'pending', attempts: 1 });
    expect(s.state.rows.find((r) => r.id === 'u3').status).toBe('invalid');
  });

  it('marks a row processed only after payment handling succeeds', async () => {
    const s = makeSupabase([{
      id: 'u1', provider: 'mercadopago', provider_event_id: 'pay-1', event_kind: 'authorized_payment',
      preapproval_id: 'PLUS-1', payload: approved(), created_at: '2026-10-26T10:00:00Z', status: 'pending',
    }]);
    const processPayment = vi.fn(async () => {
      expect(s.state.rows[0].status).toBe('processing');
      return { ok: true };
    });
    const result = await drainUnresolvedAuthorizedPayments(s, { preapprovalId: 'PLUS-1', processPayment });
    expect(result.processed).toBe(1);
    expect(processPayment).toHaveBeenCalledTimes(1);
    expect(s.state.rows[0].status).toBe('processed');
  });

  it('leaves the row pending when the handler throws', async () => {
    const s = makeSupabase([{
      id: 'u1', provider: 'mercadopago', provider_event_id: 'pay-1', event_kind: 'authorized_payment',
      preapproval_id: 'PLUS-1', payload: approved(), created_at: '2026-10-26T10:00:00Z', status: 'pending',
    }]);
    const result = await drainUnresolvedAuthorizedPayments(s, {
      preapprovalId: 'PLUS-1',
      processPayment: async () => { throw new Error('db down'); },
    });
    expect(result).toMatchObject({ ok: true, processed: 0, pending: 1 });
    expect(s.state.rows[0]).toMatchObject({ status: 'pending', attempts: 1 });
    expect(s.state.rows[0].last_error).toContain('db down');
  });

  it('claims a row so two concurrent drains process it only once', async () => {
    const s = makeSupabase([{
      id: 'u1', provider: 'mercadopago', provider_event_id: 'pay-1', event_kind: 'authorized_payment',
      preapproval_id: 'PLUS-1', payload: approved(), created_at: '2026-10-26T10:00:00Z', status: 'pending',
    }]);
    let signalEntered;
    const entered = new Promise((resolve) => { signalEntered = resolve; });
    let release;
    const hold = new Promise((resolve) => { release = resolve; });
    const processPayment = vi.fn(async () => {
      signalEntered();
      await hold;
      return { ok: true };
    });

    const first = drainUnresolvedAuthorizedPayments(s, { preapprovalId: 'PLUS-1', processPayment });
    await entered;
    const second = await drainUnresolvedAuthorizedPayments(s, { preapprovalId: 'PLUS-1', processPayment });
    expect(second.processed).toBe(0);
    expect(processPayment).toHaveBeenCalledTimes(1);

    release();
    const firstResult = await first;
    expect(firstResult.processed).toBe(1);
    expect(s.state.rows[0].status).toBe('processed');
  });

  it('reclaims a stale processing row after the lease expires', async () => {
    const staleAt = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const s = makeSupabase([{
      id: 'u1', provider: 'mercadopago', provider_event_id: 'pay-1', event_kind: 'authorized_payment',
      preapproval_id: 'PLUS-1', payload: approved(), created_at: '2026-10-26T10:00:00Z', status: 'processing', updated_at: staleAt,
    }]);
    const processPayment = vi.fn(async () => ({ ok: true }));
    const result = await drainUnresolvedAuthorizedPayments(s, { preapprovalId: 'PLUS-1', processPayment });
    expect(result.processed).toBe(1);
    expect(processPayment).toHaveBeenCalledTimes(1);
    expect(s.state.rows[0].status).toBe('processed');
  });

  it('lists distinct preapproval ids for startup recovery and drains all of them', async () => {
    const s = makeSupabase([
      {
        id: 'u1', provider: 'mercadopago', provider_event_id: 'pay-1', event_kind: 'authorized_payment',
        preapproval_id: 'PLUS-1', payload: approved('pay-1'), created_at: '2026-10-26T10:00:00Z', status: 'pending',
      },
      {
        id: 'u2', provider: 'mercadopago', provider_event_id: 'pay-2', event_kind: 'authorized_payment',
        preapproval_id: 'PLUS-1', payload: approved('pay-2'), created_at: '2026-10-26T10:01:00Z', status: 'pending',
      },
      {
        id: 'u3', provider: 'mercadopago', provider_event_id: 'pay-3', event_kind: 'authorized_payment',
        preapproval_id: 'PLUS-2', payload: { ...approved('pay-3'), preapproval_id: 'PLUS-2' }, created_at: '2026-10-26T10:02:00Z', status: 'pending',
      },
      {
        id: 'u4', provider: 'mercadopago', provider_event_id: 'pay-4', event_kind: 'authorized_payment',
        preapproval_id: 'PLUS-3', payload: { ...approved('pay-4'), preapproval_id: 'PLUS-3' }, created_at: '2026-10-26T10:03:00Z', status: 'invalid',
      },
    ]);
    const ids = await listUnresolvedPreapprovalIds(s);
    expect(ids).toEqual(['PLUS-1', 'PLUS-2']);
    const processPayment = vi.fn(async (payment) => {
      if (payment.preapproval_id === 'PLUS-2') return { transient: true, reason: 'provider_link_not_ready' };
      return { ok: true };
    });
    const result = await drainAllUnresolvedAuthorizedPayments(s, {
      now: new Date('2026-10-26T13:00:00Z'),
      processPayment,
    });
    expect(result).toMatchObject({ preapprovals: 2, processed: 2, pending: 1, invalid: 0, errors: 0 });
    expect(s.state.rows.find((r) => r.id === 'u3').status).toBe('pending');
  });

  it('schedules startup/periodic recovery and hardens the migration', () => {
    expect(serverSrc).toMatch(/drainAllUnresolvedAuthorizedPayments\(supabase, \{\s*processPayment: replayUnresolvedProPayment/);
    expect(serverSrc).toMatch(/setTimeout\(runUnresolvedPaymentRecovery/);
    expect(serverSrc).toMatch(/setInterval\(runUnresolvedPaymentRecovery/);
    expect(serverSrc).toMatch(/if \(!runningInTestMode\) \{\s*setTimeout\(runUnresolvedPaymentRecovery/);
    expect(migrationSrc).toMatch(/status IN \('pending','processing','processed','invalid'\)/);
    expect(migrationSrc).toMatch(/REVOKE ALL ON TABLE public\.pro_unresolved_provider_events FROM PUBLIC, anon, authenticated;/);
    expect(migrationSrc).toMatch(/GRANT ALL ON TABLE public\.pro_unresolved_provider_events TO service_role;/);
  });

  it('wires staging and draining into the real webhook/checkout paths', () => {
    const authorizedStart = serverSrc.indexOf('const handleAuthorizedPayment =');
    const authorizedEnd = serverSrc.indexOf('// ---- EXTENDED WEBHOOK ----', authorizedStart);
    const authorizedBody = serverSrc.slice(authorizedStart, authorizedEnd);
    const aiPreapprovalStart = serverSrc.indexOf('const handleAIPreapprovalWebhook =');
    const aiPreapprovalEnd = serverSrc.indexOf('const handleAIAuthorizedPayment =', aiPreapprovalStart);
    const aiPreapprovalBody = serverSrc.slice(aiPreapprovalStart, aiPreapprovalEnd);

    expect(authorizedStart).toBeGreaterThan(-1);
    expect(authorizedEnd).toBeGreaterThan(authorizedStart);
    expect(authorizedBody).toMatch(/stageUnresolvedAuthorizedPayment\(supabase,/);
    expect(authorizedBody).toMatch(/drainStoredPaymentsForPreapproval\(preapprovalId\)/);
    expect(serverSrc).toMatch(/drainStoredPaymentsForPreapproval\(mpResult\.id\)/);
    expect(serverSrc).toMatch(/processUnresolvedProPayment\(\{[\s\S]*applyPayment: handleProAuthorizedPayment/);
    expect(inboxSrc).toMatch(/outcome\?\.missingSubscription/);
    expect(serverSrc).toMatch(/const outcome = await handleAIAuthorizedPayment\(payment, aiSubscription\);\s*if \(outcome\?\.transient\)/);
    expect(authorizedBody).toMatch(/const shouldStageUnresolved = \['approved', 'rejected', 'refused'\]\.includes\(paymentStatus\)\s*\|\| isPaymentReversalStatus\(paymentStatus\);/);
    expect(authorizedBody).toMatch(/if \(paymentStatus === 'approved' \|\| isPaymentReversalStatus\(paymentStatus\)\) \{\s*await drainStoredPaymentsForPreapproval\(preapprovalId\);/);
    // The staging block must live in the PAYMENT handler, not the AI
    // preapproval handler (where `payment` does not exist).
    expect(aiPreapprovalBody).not.toMatch(/stageUnresolvedAuthorizedPayment|payment\.status/);
    expect(authorizedBody).not.toMatch(/preapprovalResponse\.json\(\)\.catch/);
    // AI/company early payments must not enter the Pro replay inbox.
    expect(authorizedBody).toMatch(/const route = classifyPreapprovalExternalReference\(preapprovalData\?\.external_reference/);
    expect(authorizedBody).toMatch(/if \(route !== 'pro'\) \{/);
  });
});
