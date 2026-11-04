// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  tryInsertSubscriptionEvent,
  markSubscriptionEventProcessed,
  markSubscriptionEventFailed,
  markSubscriptionEventForReview,
  isPaymentReversalStatus,
  paymentReversalReviewReason,
  unlinkedPaymentReversalReview,
  shouldApplyEvent,
} from './subscriptions/subscriptionEvents.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverSrc = readFileSync(resolve(__dirname, '../server.mjs'), 'utf8');
const eventMigration = readFileSync(resolve(__dirname, '../supabase/migrations/20261026000200_subscription_events_hardening.sql'), 'utf8');
const inboxMigration = readFileSync(resolve(__dirname, '../supabase/migrations/20261026000300_unresolved_inbox_review_state.sql'), 'utf8');

function ledgerMock({ updateError = null } = {}) {
  const state = { rows: [] };
  let nextId = 1;
  const match = (row, filters) => filters.every(([column, value]) => String(row[column] ?? '') === String(value));
  function from() {
    const q = { op: null, payload: null, filters: [], single: false };
    function exec() {
      if (q.op === 'insert') {
        const duplicate = state.rows.some((row) => (
          row.provider === q.payload.provider
          && String(row.provider_event_id) === String(q.payload.provider_event_id)
          && row.product_type === q.payload.product_type
        ));
        if (duplicate) return { data: null, error: { code: '23505' } };
        const row = { id: `e${nextId++}`, created_at: new Date().toISOString(), ...q.payload };
        state.rows.push(row);
        return { data: row, error: null };
      }
      if (q.op === 'update') {
        if (updateError) return { data: null, error: updateError };
        const found = state.rows.filter((row) => match(row, q.filters));
        for (const row of found) Object.assign(row, q.payload);
        return { data: found, error: null };
      }
      const found = state.rows.filter((row) => match(row, q.filters));
      return { data: q.single ? (found[0] ?? null) : found, error: null };
    }
    const api = {
      insert(payload) { q.op = 'insert'; q.payload = payload; return api; },
      update(payload) { q.op = 'update'; q.payload = payload; return api; },
      select() { if (!q.op) q.op = 'select'; return api; },
      eq(column, value) { q.filters.push([column, value]); return api; },
      maybeSingle() { q.single = true; return Promise.resolve(exec()); },
      then(res, rej) { return Promise.resolve(exec()).then(res, rej); },
    };
    return api;
  }
  return { state, from };
}

function orderMock(rows) {
  return {
    from: () => {
      const q = { filters: [] };
      const api = {
        select() { return api; },
        eq(column, value) { q.filters.push([column, value]); return api; },
        like(column, pattern) {
          const needle = String(pattern).replace(/\\/g, '').replace(/%$/, '');
          q.filters.push([column, (value) => String(value || '').startsWith(needle)]);
          return api;
        },
        order() { return api; },
        limit() { return api; },
        maybeSingle() {
          const found = rows
            .filter((row) => q.filters.every(([column, expected]) => (
              typeof expected === 'function' ? expected(row[column]) : String(row[column]) === String(expected)
            )))
            .sort((a, b) => Date.parse(b.provider_event_at) - Date.parse(a.provider_event_at));
          return Promise.resolve({ data: found[0] ?? null, error: null });
        },
      };
      return api;
    },
  };
}

describe('subscription event hardening', () => {
  it('moves a rejected/refused event terminal and returns persistence errors', async () => {
    await expect(markSubscriptionEventProcessed(ledgerMock({ updateError: { code: 'XX000' } }), {
      productType: 'ai', providerEventId: 'e1',
    })).rejects.toMatchObject({ code: 'XX000' });
    await expect(markSubscriptionEventFailed(ledgerMock({ updateError: { code: 'XX000' } }), {
      productType: 'pro', providerEventId: 'e1',
    })).rejects.toMatchObject({ code: 'XX000' });
  });

  it('claims an expired lease exactly once', async () => {
    const s = ledgerMock();
    await tryInsertSubscriptionEvent(s, {
      productType: 'pro', subscriptionId: 'sub-1', providerEventId: 'E1',
      providerEventAt: '2026-10-22T10:00:00Z', eventType: 'payment_approved', providerStatus: 'approved',
    });
    s.state.rows[0].status = 'pending';
    s.state.rows[0].created_at = new Date(Date.now() - 11 * 60 * 1000).toISOString();
    s.state.rows[0].claimed_at = s.state.rows[0].created_at;

    const first = await tryInsertSubscriptionEvent(s, {
      productType: 'pro', subscriptionId: 'sub-1', providerEventId: 'E1',
      providerEventAt: '2026-10-22T10:00:00Z', eventType: 'payment_approved', providerStatus: 'approved',
    });
    const second = await tryInsertSubscriptionEvent(s, {
      productType: 'pro', subscriptionId: 'sub-1', providerEventId: 'E1',
      providerEventAt: '2026-10-22T10:00:00Z', eventType: 'payment_approved', providerStatus: 'approved',
    });

    expect(first).toMatchObject({ duplicate: true, retryable: true, stale: true, claimed: true });
    expect(second).toMatchObject({ duplicate: true, retryable: true, stale: false, claimed: false });
    expect(s.state.rows[0].status).toBe('processing');
  });

  it('keeps AI payment and preapproval ordering independent in both arrival orders', async () => {
    const paymentLater = orderMock([
      { product_type: 'ai', subscription_id: 'ai-1', provider_event_at: '2026-10-22T22:00:00Z', event_type: 'payment_approved', status: 'processed' },
    ]);
    expect(await shouldApplyEvent(paymentLater, {
      productType: 'ai', subscriptionId: 'ai-1', providerEventAt: '2026-10-22T21:30:00Z', eventTypePrefix: 'preapproval',
    })).toBe(true);

    const preapprovalLater = orderMock([
      { product_type: 'ai', subscription_id: 'ai-1', provider_event_at: '2026-10-22T22:00:00Z', event_type: 'preapproval_authorized', status: 'processed' },
    ]);
    expect(await shouldApplyEvent(preapprovalLater, {
      productType: 'ai', subscriptionId: 'ai-1', providerEventAt: '2026-10-22T21:30:00Z', eventTypePrefix: 'payment',
    })).toBe(true);
  });

  it('classifies refunds, chargebacks and cancellations as manual-review reversals', () => {
    for (const status of ['refunded', 'charged_back', 'cancelled', 'REFUNDED']) {
      expect(isPaymentReversalStatus(status)).toBe(true);
    }
    for (const status of ['approved', 'rejected', 'refused', 'pending', 'in_process', 'authorized', '', null]) {
      expect(isPaymentReversalStatus(status)).toBe(false);
    }
    expect(paymentReversalReviewReason('charged_back')).toBe('payment_charged_back_requires_policy_review');
    expect(unlinkedPaymentReversalReview('refunded')).toEqual({
      review: true,
      reason: 'payment_refunded_unlinked_reversal_review',
    });
    expect(unlinkedPaymentReversalReview('approved')).toBeNull();
  });

  it('does not drop an old reversal just because a later payment moved the baseline', async () => {
    const laterPayment = orderMock([
      { product_type: 'pro', subscription_id: 'pro-1', provider_event_at: '2026-10-22T22:00:00Z', event_type: 'payment_approved', status: 'processed' },
    ]);
    expect(await shouldApplyEvent(laterPayment, {
      productType: 'pro', subscriptionId: 'pro-1', providerEventAt: '2026-10-01T10:00:00Z', eventTypePrefix: 'payment',
    })).toBe(false);
    expect(isPaymentReversalStatus('refunded')).toBe(true);
  });

  it('reviews reversals before the ordering gate in both payment handlers', () => {
    const aiStart = serverSrc.indexOf('const handleAIAuthorizedPayment =');
    const aiEnd = serverSrc.indexOf('const replayUnresolvedAIPayment =', aiStart);
    const proStart = serverSrc.indexOf('const handleProAuthorizedPayment =');
    const proEnd = serverSrc.indexOf('// Durable inbox recovery:', proStart);
    const aiBody = serverSrc.slice(aiStart, aiEnd);
    const proBody = serverSrc.slice(proStart, proEnd);

    for (const body of [aiBody, proBody]) {
      const reversalAt = body.indexOf('isPaymentReversalStatus(paymentStatus)');
      const reviewAt = body.indexOf('markSubscriptionEventForReview', reversalAt);
      const orderingAt = body.indexOf('shouldApplyEvent', reversalAt);
      expect(reversalAt).toBeGreaterThan(-1);
      expect(reviewAt).toBeGreaterThan(reversalAt);
      expect(orderingAt).toBeGreaterThan(reviewAt);
      expect(body).toMatch(/paymentReversalReviewReason\(paymentStatus\)/);
      expect(body).toMatch(/if \(ev\.status === 'processed' \|\| ev\.status === 'needs_review'\) return;/);
    }
  });

  it('treats a redelivered reversal as terminal review without duplicating records', async () => {
    const s = ledgerMock();
    const event = {
      productType: 'pro',
      subscriptionId: 'pro-1',
      providerEventId: 'pay-1:refunded',
      providerEventAt: '2026-10-01T10:00:00Z',
      eventType: 'payment_refunded',
      providerStatus: 'refunded',
    };
    expect(await tryInsertSubscriptionEvent(s, event)).toMatchObject({ inserted: true });
    await markSubscriptionEventForReview(s, {
      productType: 'pro',
      providerEventId: event.providerEventId,
      reason: paymentReversalReviewReason('refunded'),
    });
    expect(await tryInsertSubscriptionEvent(s, event)).toMatchObject({
      inserted: false,
      duplicate: true,
      status: 'needs_review',
    });
    expect(s.state.rows).toHaveLength(1);
    expect(s.state.rows[0]).toMatchObject({
      provider_event_id: 'pay-1:refunded',
      status: 'needs_review',
      review_reason: 'payment_refunded_requires_policy_review',
    });
  });

  it('wires AI prefixes, identity guard and review branches into the real handlers', () => {
    const start = serverSrc.indexOf('const handleAIPreapprovalWebhook =');
    const paymentStart = serverSrc.indexOf('const handleAIAuthorizedPayment =', start);
    const paymentEnd = serverSrc.indexOf('const replayUnresolvedAIPayment =', paymentStart);
    const preapprovalBody = serverSrc.slice(start, paymentStart);
    const paymentBody = serverSrc.slice(paymentStart, paymentEnd);

    expect(preapprovalBody).toMatch(/matchesActiveProvider\(subscription, preapprovalId\)/);
    expect(preapprovalBody).toMatch(/eventTypePrefix: 'preapproval'/);
    expect(paymentBody).toMatch(/eventTypePrefix: 'payment'/);
    expect(paymentBody).toMatch(/const providerEventId = `\$\{payment\.id\}:\$\{paymentStatus\}`/);
    expect(paymentBody).toMatch(/isPaymentReversalStatus\(paymentStatus\)/);
    expect(paymentBody).toMatch(/markSubscriptionEventForReview/);
  });

  it('hardens subscription_events and preserves approved inbox rows for review', () => {
    expect(eventMigration).toMatch(/ENABLE ROW LEVEL SECURITY/);
    expect(eventMigration).toMatch(/REVOKE ALL ON TABLE public\.subscription_events FROM PUBLIC, anon, authenticated/);
    expect(eventMigration).toMatch(/GRANT ALL ON TABLE public\.subscription_events TO service_role/);
    expect(eventMigration).toMatch(/claimed_at/);
    expect(eventMigration).toMatch(/needs_review/);
    expect(inboxMigration).toMatch(/pro_unresolved_provider_events_status_check/);
    expect(inboxMigration).toMatch(/ai_unresolved_provider_events_status_check/);
    expect(inboxMigration).toMatch(/needs_review/);
  });
});
