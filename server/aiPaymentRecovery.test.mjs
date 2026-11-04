// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { processUnresolvedAIPayment } from './subscriptions/aiPaymentRecovery.mjs';

function makeSupabase(seed = {}) {
  const state = { ai_subscriptions: seed.ai_subscriptions ? [...seed.ai_subscriptions] : [] };
  function from(table) {
    const q = { table, filters: [], order: null, limit: null };
    const match = (row) => q.filters.every(([column, value]) => String(row[column] ?? '') === String(value));
    function exec() {
      let rows = (state[table] || []).filter(match);
      if (q.order) {
        rows = [...rows].sort((a, b) => (
          q.order.ascending ? 1 : -1
        ) * (Date.parse(a[q.order.column]) - Date.parse(b[q.order.column])));
      }
      if (q.limit != null) rows = rows.slice(0, q.limit);
      return { data: rows, error: null };
    }
    const api = {
      select() { return api; },
      eq(column, value) { q.filters.push([column, value]); return api; },
      order(column, { ascending }) { q.order = { column, ascending }; return api; },
      limit(n) { q.limit = n; return api; },
      maybeSingle() { const result = exec(); return Promise.resolve({ data: result.data[0] ?? null, error: result.error }); },
      then(res, rej) { return Promise.resolve(exec()).then(res, rej); },
    };
    return api;
  }
  return { state, from };
}

const LAWYER_ID = '11111111-1111-1111-1111-111111111111';
const payment = (status = 'approved', preapprovalId = 'AI-PRE-1') => ({
  id: 'ai-pay-1',
  preapproval_id: preapprovalId,
  status,
  date_created: '2026-10-26T12:00:00Z',
});

describe('AI unresolved payment recovery', () => {
  it('applies the payment when the provider link already exists', async () => {
    const s = makeSupabase({ ai_subscriptions: [{ id: 'ai-1', lawyer_id: LAWYER_ID, provider_subscription_id: 'AI-PRE-1', created_at: '2026-10-01T00:00:00Z' }] });
    const applyPayment = vi.fn(async () => undefined);
    const result = await processUnresolvedAIPayment({
      supabase: s,
      payment: payment(),
      row: { lawyer_id: LAWYER_ID },
      applyPayment,
    });
    expect(result).toMatchObject({ ok: true });
    expect(applyPayment).toHaveBeenCalledWith(payment(), s.state.ai_subscriptions[0]);
  });

  it('falls back to the trusted lawyer id only for a non-declined payment with no conflicting provider link', async () => {
    const s = makeSupabase({ ai_subscriptions: [{ id: 'ai-1', lawyer_id: LAWYER_ID, provider_subscription_id: null, created_at: '2026-10-01T00:00:00Z' }] });
    const applyPayment = vi.fn(async () => undefined);
    const result = await processUnresolvedAIPayment({
      supabase: s,
      payment: payment(),
      row: { lawyer_id: LAWYER_ID },
      applyPayment,
    });
    expect(result).toMatchObject({ ok: true });
    expect(applyPayment).toHaveBeenCalledTimes(1);
  });

  it('does not attach a declined payment to an unlinked trial via the lawyer fallback', async () => {
    const s = makeSupabase({ ai_subscriptions: [{ id: 'ai-1', lawyer_id: LAWYER_ID, provider_subscription_id: null, created_at: '2026-10-01T00:00:00Z' }] });
    const applyPayment = vi.fn(async () => undefined);
    const result = await processUnresolvedAIPayment({
      supabase: s,
      payment: payment('rejected'),
      row: { lawyer_id: LAWYER_ID },
      applyPayment,
    });
    expect(result).toMatchObject({ transient: true, reason: 'provider_link_not_ready' });
    expect(applyPayment).not.toHaveBeenCalled();
  });

  it.each(['refunded', 'charged_back'])('moves an unlinked %s to review without touching the lawyer fallback', async (status) => {
    const s = makeSupabase({ ai_subscriptions: [{ id: 'ai-1', lawyer_id: LAWYER_ID, provider_subscription_id: null, created_at: '2026-10-01T00:00:00Z' }] });
    const applyPayment = vi.fn(async () => undefined);
    const result = await processUnresolvedAIPayment({
      supabase: s,
      payment: payment(status),
      row: { lawyer_id: LAWYER_ID },
      applyPayment,
    });
    expect(result).toEqual({
      review: true,
      reason: `payment_${status}_unlinked_reversal_review`,
    });
    expect(applyPayment).not.toHaveBeenCalled();
  });

  it('moves an amount-mismatched fallback to review instead of attaching it', async () => {
    const s = makeSupabase({ ai_subscriptions: [{ id: 'ai-1', lawyer_id: LAWYER_ID, provider_subscription_id: null, created_at: '2026-10-01T00:00:00Z' }] });
    const applyPayment = vi.fn(async () => undefined);
    const result = await processUnresolvedAIPayment({
      supabase: s,
      payment: { ...payment(), transaction_amount: 1000 },
      row: { lawyer_id: LAWYER_ID },
      applyPayment,
      expectedAmountClp: 49900,
    });
    expect(result).toMatchObject({ review: true, reason: 'ai_fallback_amount_mismatch' });
    expect(applyPayment).not.toHaveBeenCalled();
  });

  it('refuses the lawyer fallback when the AI row is linked to another preapproval', async () => {
    const s = makeSupabase({ ai_subscriptions: [{ id: 'ai-1', lawyer_id: LAWYER_ID, provider_subscription_id: 'AI-OTHER', created_at: '2026-10-01T00:00:00Z' }] });
    const applyPayment = vi.fn(async () => undefined);
    const result = await processUnresolvedAIPayment({
      supabase: s,
      payment: payment(),
      row: { lawyer_id: LAWYER_ID },
      applyPayment,
    });
    expect(result).toMatchObject({ transient: true, reason: 'provider_identity_conflict' });
    expect(applyPayment).not.toHaveBeenCalled();
  });

  it('rejects a payment without preapproval identity', async () => {
    const s = makeSupabase();
    const result = await processUnresolvedAIPayment({
      supabase: s,
      payment: { ...payment(), preapproval_id: null },
      applyPayment: vi.fn(),
    });
    expect(result).toMatchObject({ invalid: true, reason: 'missing_preapproval_id' });
  });

  it('propagates a transient apply result so the durable inbox retries', async () => {
    const s = makeSupabase({ ai_subscriptions: [{ id: 'ai-1', lawyer_id: LAWYER_ID, provider_subscription_id: 'AI-PRE-1', created_at: '2026-10-01T00:00:00Z' }] });
    const result = await processUnresolvedAIPayment({
      supabase: s,
      payment: payment(),
      row: { lawyer_id: LAWYER_ID },
      applyPayment: async () => ({ transient: true, reason: 'event_in_flight' }),
    });
    expect(result).toMatchObject({ transient: true, reason: 'event_in_flight' });
  });
});
