// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, it, expect, vi } from 'vitest';
import {
  AI_UNRESOLVED_DECLINED_MAX_AGE_MS,
  drainAllUnresolvedAIAuthorizedPayments,
  drainUnresolvedAIAuthorizedPayments,
  listUnresolvedAIPreapprovalIds,
  stageAIAuthorizedPayment,
} from './subscriptions/aiUnresolvedEvents.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverSrc = readFileSync(resolve(__dirname, '../server.mjs'), 'utf8');
const migrationSrc = readFileSync(resolve(__dirname, '../supabase/migrations/20261026000100_ai_unresolved_provider_events.sql'), 'utf8');

function makeSupabase(seed = [], { insertError = null, updateErrorFor = null } = {}) {
  const state = { rows: seed.map((row, i) => ({ id: row.id || `a${i + 1}`, attempts: 0, status: 'pending', ...row })) };
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
        const row = { id: `a${nextId++}`, attempts: 0, status: 'pending', ...q.payload };
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

const approved = (id = 'ai-pay-1') => ({
  id,
  preapproval_id: 'AI-PRE-1',
  status: 'approved',
  transaction_amount: 49900,
  date_created: '2026-10-26T12:00:00Z',
});

describe('AI early-payment durable inbox', () => {
  it('stages an approved early AI payment idempotently with its trusted lawyer id', async () => {
    const s = makeSupabase();
    const first = await stageAIAuthorizedPayment(s, {
      preapprovalId: 'AI-PRE-1',
      lawyerId: '11111111-1111-1111-1111-111111111111',
      payment: approved(),
    });
    const second = await stageAIAuthorizedPayment(s, {
      preapprovalId: 'AI-PRE-1',
      lawyerId: '11111111-1111-1111-1111-111111111111',
      payment: approved(),
    });
    expect(first).toMatchObject({ ok: true, duplicate: false });
    expect(second).toMatchObject({ ok: true, duplicate: true });
    expect(s.state.rows).toHaveLength(1);
    expect(s.state.rows[0]).toMatchObject({
      event_kind: 'authorized_payment',
      preapproval_id: 'AI-PRE-1',
      lawyer_id: '11111111-1111-1111-1111-111111111111',
      status: 'pending',
    });
  });

  it('does not stage an event without provider identity', async () => {
    const s = makeSupabase();
    const result = await stageAIAuthorizedPayment(s, {
      preapprovalId: 'AI-PRE-1',
      lawyerId: '11111111-1111-1111-1111-111111111111',
      payment: { ...approved(), id: null },
    });
    expect(result).toMatchObject({ ok: false, invalid: true });
    expect(s.state.rows).toHaveLength(0);
  });

  it('throws instead of acknowledging a failed durable write', async () => {
    const s = makeSupabase([], { insertError: { code: 'XX000', message: 'db down' } });
    await expect(stageAIAuthorizedPayment(s, { preapprovalId: 'AI-PRE-1', payment: approved() }))
      .rejects.toMatchObject({ code: 'XX000' });
  });

  it('drains processed and invalid rows while retrying transient ones, passing the durable row', async () => {
    const s = makeSupabase([
      {
        id: 'a1', provider: 'mercadopago', provider_event_id: 'ai-pay-ok', event_kind: 'authorized_payment',
        preapproval_id: 'AI-PRE-1', lawyer_id: 'ly-1', payload: approved('ai-pay-ok'), created_at: '2026-10-26T10:00:00Z', status: 'pending',
      },
      {
        id: 'a2', provider: 'mercadopago', provider_event_id: 'ai-pay-retry', event_kind: 'authorized_payment',
        preapproval_id: 'AI-PRE-1', lawyer_id: 'ly-1', payload: approved('ai-pay-retry'), created_at: '2026-10-26T11:00:00Z', status: 'pending',
      },
      {
        id: 'a3', provider: 'mercadopago', provider_event_id: '', event_kind: 'authorized_payment',
        preapproval_id: 'AI-PRE-1', payload: approved(''), created_at: '2026-10-26T12:00:00Z', status: 'pending',
      },
    ]);
    const processPayment = vi.fn(async (payment, row) => {
      expect(row.id).toBeDefined();
      if (payment.id === 'ai-pay-retry') return { transient: true, reason: 'provider_link_not_ready' };
      return { ok: true };
    });
    const result = await drainUnresolvedAIAuthorizedPayments(s, {
      preapprovalId: 'AI-PRE-1',
      now: new Date('2026-10-26T13:00:00Z'),
      processPayment,
    });
    expect(result).toMatchObject({ ok: true, processed: 1, pending: 1, invalid: 1 });
    expect(s.state.rows.find((r) => r.id === 'a1').status).toBe('processed');
    expect(s.state.rows.find((r) => r.id === 'a2')).toMatchObject({ status: 'pending', attempts: 1 });
    expect(s.state.rows.find((r) => r.id === 'a3').status).toBe('invalid');
  });

  it('terminates a declined unlinked AI event and moves an unlinked approved payment to review', async () => {
    const now = new Date('2026-10-27T12:00:00Z');
    const old = new Date(now.getTime() - AI_UNRESOLVED_DECLINED_MAX_AGE_MS - 60 * 60 * 1000).toISOString();
    const s = makeSupabase([
      {
        id: 'a1', provider: 'mercadopago', provider_event_id: 'ai-rejected', event_kind: 'authorized_payment',
        preapproval_id: 'AI-PRE-1', provider_status: 'rejected', payload: { ...approved('ai-rejected'), status: 'rejected' },
        created_at: old, status: 'pending',
      },
      {
        id: 'a2', provider: 'mercadopago', provider_event_id: 'ai-approved-old', event_kind: 'authorized_payment',
        preapproval_id: 'AI-PRE-1', provider_status: 'approved', payload: approved('ai-approved-old'),
        created_at: old, status: 'pending',
      },
      {
        id: 'a3', provider: 'mercadopago', provider_event_id: 'ai-linked-retry', event_kind: 'authorized_payment',
        preapproval_id: 'AI-PRE-1', provider_status: 'rejected', payload: { ...approved('ai-linked-retry'), status: 'rejected' },
        created_at: old, status: 'pending',
      },
    ]);
    const result = await drainUnresolvedAIAuthorizedPayments(s, {
      preapprovalId: 'AI-PRE-1',
      now,
      processPayment: async (payment) => ({
        transient: true,
        reason: payment.id === 'ai-linked-retry' ? 'event_in_flight' : 'provider_link_not_ready',
      }),
    });
    expect(result).toMatchObject({ pending: 1, invalid: 1, review: 1 });
    expect(s.state.rows.find((r) => r.id === 'a1')).toMatchObject({ status: 'invalid' });
    expect(s.state.rows.find((r) => r.id === 'a1').last_error).toContain('declined_reconciliation_expired');
    expect(s.state.rows.find((r) => r.id === 'a2')).toMatchObject({ status: 'needs_review' });
    expect(s.state.rows.find((r) => r.id === 'a2').last_error).toContain('approved_payment_unlinked_review');
    expect(s.state.rows.find((r) => r.id === 'a3').status).toBe('pending');
  });

  it('lists and drains all unresolved AI preapprovals', async () => {
    const s = makeSupabase([
      {
        id: 'a1', provider: 'mercadopago', provider_event_id: 'ai-pay-1', event_kind: 'authorized_payment',
        preapproval_id: 'AI-PRE-1', payload: approved('ai-pay-1'), created_at: '2026-10-26T10:00:00Z', status: 'pending',
      },
      {
        id: 'a2', provider: 'mercadopago', provider_event_id: 'ai-pay-2', event_kind: 'authorized_payment',
        preapproval_id: 'AI-PRE-2', payload: { ...approved('ai-pay-2'), preapproval_id: 'AI-PRE-2' }, created_at: '2026-10-26T10:01:00Z', status: 'pending',
      },
    ]);
    expect(await listUnresolvedAIPreapprovalIds(s)).toEqual(['AI-PRE-1', 'AI-PRE-2']);
    const result = await drainAllUnresolvedAIAuthorizedPayments(s, { processPayment: async () => ({ ok: true }) });
    expect(result).toMatchObject({ preapprovals: 2, processed: 2 });
  });

  it('wires a separate AI inbox, scheduler and migration without entering the Pro path', () => {
    const authorizedStart = serverSrc.indexOf('const handleAuthorizedPayment =');
    const authorizedEnd = serverSrc.indexOf('// ---- EXTENDED WEBHOOK ----', authorizedStart);
    const body = serverSrc.slice(authorizedStart, authorizedEnd);

    expect(body).toMatch(/if \(route === 'ai'\) \{[\s\S]*stageAIAuthorizedPayment\(supabase, \{/);
    expect(body).toMatch(/await drainStoredAIPaymentsForPreapproval\(preapprovalId\)/);
    expect(body).toMatch(/if \(route !== 'pro'\) \{/);
    expect(serverSrc).toMatch(/if \(mpStatus === 'authorized' \|\| mpStatus === 'active'\) \{\s*await drainStoredAIPaymentsForPreapproval\(preapprovalId\);/);
    expect(serverSrc).toMatch(/const runUnresolvedAIRecovery = async \(\) => \{[\s\S]*drainAllUnresolvedAIAuthorizedPayments\(supabase, \{\s*processPayment: replayUnresolvedAIPayment/);
    expect(serverSrc).toMatch(/setTimeout\(runUnresolvedAIRecovery, 15 \* 1000\)/);
    expect(serverSrc).toMatch(/setInterval\(runUnresolvedAIRecovery, UNRESOLVED_PAYMENT_RECOVERY_MS\)/);
    expect(serverSrc).toMatch(/provider_subscription_id: providerSubscriptionId/);
    expect(migrationSrc).toMatch(/CREATE TABLE IF NOT EXISTS public\.ai_unresolved_provider_events/);
    expect(migrationSrc).toMatch(/UNIQUE \(provider, provider_event_id, event_kind\)/);
    expect(migrationSrc).toMatch(/REVOKE ALL ON TABLE public\.ai_unresolved_provider_events FROM PUBLIC, anon, authenticated;/);
    expect(migrationSrc).toMatch(/GRANT ALL ON TABLE public\.ai_unresolved_provider_events TO service_role;/);
  });
});
