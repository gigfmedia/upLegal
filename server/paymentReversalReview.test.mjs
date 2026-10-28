// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  PAYMENT_REVERSAL_REVIEW_REASONS,
  PAYMENT_REVERSAL_REVIEW_TABLE,
  stagePaymentReversalReview,
} from './subscriptions/paymentReversalReview.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverSrc = readFileSync(resolve(__dirname, '../server.mjs'), 'utf8');
const helperSrc = readFileSync(resolve(__dirname, './subscriptions/paymentReversalReview.mjs'), 'utf8');
const migrationSrc = readFileSync(
  resolve(__dirname, '../supabase/migrations/20261027000000_unresolved_payment_reversal_events.sql'),
  'utf8',
);

const NOW = new Date('2026-10-27T09:00:00Z');

function payment(id = 'pay-1', status = 'refunded') {
  return {
    id,
    status,
    external_reference: 'pro:lawyer-1',
    transaction_amount: 1000,
    currency_id: 'ARS',
  };
}

function makeSupabase({ insertError = null } = {}) {
  const state = { rows: [], tables: [] };
  const supabase = {
    from(table) {
      state.tables.push(table);
      return {
        async insert(row) {
          if (insertError) return { data: null, error: insertError };
          if (state.rows.some((existing) => (
            existing.provider === row.provider
            && existing.provider_event_id === row.provider_event_id
          ))) {
            return { data: null, error: { code: '23505', message: 'duplicate key' } };
          }
          state.rows.push({ id: `r${state.rows.length + 1}`, ...row });
          return { data: null, error: null };
        },
      };
    },
  };
  return { supabase, state };
}

describe('neutral payment reversal review inbox', () => {
  it('persists a refund when the preapproval lookup returns 404', async () => {
    const { supabase, state } = makeSupabase();
    const result = await stagePaymentReversalReview(supabase, {
      payment: payment('pay-404', 'refunded'),
      preapprovalId: 'PRE-404',
      reason: PAYMENT_REVERSAL_REVIEW_REASONS.PREAPPROVAL_NOT_FOUND,
      now: NOW,
    });

    expect(result).toEqual({ ok: true, duplicate: false });
    expect(state.tables).toEqual([PAYMENT_REVERSAL_REVIEW_TABLE]);
    expect(state.rows).toHaveLength(1);
    expect(state.rows[0]).toMatchObject({
      provider: 'mercadopago',
      provider_event_id: 'pay-404:refunded',
      provider_payment_id: 'pay-404',
      preapproval_id: 'PRE-404',
      external_reference: null,
      provider_status: 'refunded',
      review_reason: 'preapproval_not_found',
      status: 'needs_review',
      created_at: NOW.toISOString(),
    });
  });

  it('persists a chargeback when preapproval_id is missing', async () => {
    const { supabase, state } = makeSupabase();
    await stagePaymentReversalReview(supabase, {
      payment: payment('pay-no-preapproval', 'charged_back'),
      reason: PAYMENT_REVERSAL_REVIEW_REASONS.MISSING_PREAPPROVAL_ID,
      now: NOW,
    });

    expect(state.rows[0]).toMatchObject({
      provider_event_id: 'pay-no-preapproval:charged_back',
      preapproval_id: null,
      external_reference: null,
      provider_status: 'charged_back',
      review_reason: 'missing_preapproval_id',
    });
  });

  it('persists a cancellation when the external_reference is not a trusted product route', async () => {
    const { supabase, state } = makeSupabase();
    await stagePaymentReversalReview(supabase, {
      payment: payment('pay-unclassified', 'cancelled'),
      preapprovalId: 'PRE-UNKNOWN',
      externalReference: 'unknown-product:42',
      reason: PAYMENT_REVERSAL_REVIEW_REASONS.UNCLASSIFIED_PRODUCT,
      now: NOW,
    });

    expect(state.rows[0]).toMatchObject({
      provider_event_id: 'pay-unclassified:cancelled',
      preapproval_id: 'PRE-UNKNOWN',
      external_reference: 'unknown-product:42',
      provider_status: 'cancelled',
      review_reason: 'unclassified_product',
    });
  });

  it('keeps redelivery idempotent by provider payment and status', async () => {
    const { supabase, state } = makeSupabase();
    const args = {
      payment: payment('pay-duplicate', 'refunded'),
      preapprovalId: 'PRE-404',
      reason: PAYMENT_REVERSAL_REVIEW_REASONS.PREAPPROVAL_NOT_FOUND,
      now: NOW,
    };

    expect(await stagePaymentReversalReview(supabase, args)).toEqual({ ok: true, duplicate: false });
    expect(await stagePaymentReversalReview(supabase, args)).toEqual({ ok: true, duplicate: true });
    expect(state.rows).toHaveLength(1);
  });

  it('does not persist non-reversal payments', async () => {
    const { supabase, state } = makeSupabase();
    const result = await stagePaymentReversalReview(supabase, {
      payment: payment('pay-approved', 'approved'),
      preapprovalId: 'PRE-404',
      reason: PAYMENT_REVERSAL_REVIEW_REASONS.PREAPPROVAL_NOT_FOUND,
      now: NOW,
    });

    expect(result).toEqual({ ok: false, invalid: true, code: 'NOT_A_REVERSAL' });
    expect(state.rows).toHaveLength(0);
  });

  it('propagates non-duplicate insert failures so the webhook retries', async () => {
    const { supabase } = makeSupabase({ insertError: { code: '08006', message: 'connection failure' } });
    await expect(stagePaymentReversalReview(supabase, {
      payment: payment('pay-db-down', 'refunded'),
      reason: PAYMENT_REVERSAL_REVIEW_REASONS.PREAPPROVAL_NOT_FOUND,
      now: NOW,
    })).rejects.toMatchObject({ code: '08006' });
  });

  it('wires all three unclassified reversal paths to the neutral inbox', () => {
    const missingIdx = serverSrc.indexOf('if (!preapprovalId) {');
    const missingStageIdx = serverSrc.indexOf('stagePaymentReversalReview', missingIdx);
    const missingLogIdx = serverSrc.indexOf('console.warn', missingStageIdx);
    expect(missingStageIdx).toBeGreaterThan(missingIdx);
    expect(serverSrc.slice(missingIdx, missingLogIdx)).toContain('isPaymentReversalStatus(payment.status)');
    expect(serverSrc.slice(missingIdx, missingLogIdx)).toContain('MISSING_PREAPPROVAL_ID');

    const notFoundIdx = serverSrc.indexOf('if (preapprovalResponse.status === 404) {');
    const notFoundStageIdx = serverSrc.indexOf('stagePaymentReversalReview', notFoundIdx);
    const notFoundLogIdx = serverSrc.indexOf('console.warn', notFoundStageIdx);
    expect(notFoundStageIdx).toBeGreaterThan(notFoundIdx);
    expect(serverSrc.slice(notFoundIdx, notFoundLogIdx)).toContain('isPaymentReversalStatus(paymentStatus)');
    expect(serverSrc.slice(notFoundIdx, notFoundLogIdx)).toContain('PREAPPROVAL_NOT_FOUND');

    const routeIdx = serverSrc.indexOf("if (route !== 'pro') {");
    const routeStageIdx = serverSrc.indexOf('stagePaymentReversalReview', routeIdx);
    const routeLogIdx = serverSrc.indexOf('console.warn', routeStageIdx);
    expect(routeStageIdx).toBeGreaterThan(routeIdx);
    expect(serverSrc.slice(routeIdx, routeLogIdx)).toContain('isPaymentReversalStatus(paymentStatus)');
    expect(serverSrc.slice(routeIdx, routeLogIdx)).toContain('UNCLASSIFIED_PRODUCT');
  });

  it('hardens the neutral table and keeps product/ledger tables out of the helper', () => {
    expect(migrationSrc).toMatch(/CREATE TABLE IF NOT EXISTS public\.unresolved_payment_reversal_events/);
    expect(migrationSrc).toMatch(/UNIQUE \(provider, provider_event_id\)/);
    expect(migrationSrc).toMatch(/ENABLE ROW LEVEL SECURITY/);
    expect(migrationSrc).toMatch(/REVOKE ALL ON TABLE public\.unresolved_payment_reversal_events FROM PUBLIC, anon, authenticated;/);
    expect(migrationSrc).toMatch(/GRANT ALL ON TABLE public\.unresolved_payment_reversal_events TO service_role;/);
    expect(helperSrc).not.toMatch(/ai_subscriptions|lawyer_subscriptions|company_subscriptions|pro_subscription_payments/);
  });
});
