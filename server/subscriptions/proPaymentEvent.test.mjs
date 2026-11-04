// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  paymentEventIdentity,
  paymentStatusKind,
  processProAuthorizedPaymentEvent,
} from './proPaymentEvent.mjs';

function createMockSupabase({ claim = true } = {}) {
  const updates = [];
  const inserts = [];
  const completed = [];
  const ledgerIds = new Set();

  const updateChain = () => ({
    eq: () => updateChain(),
    then: (resolve, reject) => Promise.resolve({ error: null }).then(resolve, reject),
  });

  const selectChain = (opts) => ({
    eq: () => selectChain(opts),
    like: () => selectChain(opts),
    order: () => selectChain(opts),
    limit: () => selectChain(opts),
    or: () => Promise.resolve({ count: 1, error: null }),
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    then: (resolve, reject) => Promise.resolve({
      data: [],
      count: opts?.head ? 1 : null,
      error: null,
    }).then(resolve, reject),
  });

  const supabase = {
    from(table) {
      return {
        insert(row) {
          inserts.push({ table, row });
          if (table === 'pro_subscription_payments') {
            if (ledgerIds.has(row.provider_authorized_payment_id)) {
              return Promise.resolve({ error: { code: '23505' } });
            }
            ledgerIds.add(row.provider_authorized_payment_id);
          }
          return Promise.resolve({ error: null });
        },
        update(row) {
          updates.push({ table, row });
          return updateChain();
        },
        delete() {
          return updateChain();
        },
        select(_cols, opts) {
          return selectChain(opts);
        },
      };
    },
    async rpc(name, args) {
      if (name === 'claim_subscription_event') {
        if (!claim) {
          return { data: [{ claimed: false, reason: 'busy', event_id: null, claim_token: null, attempts: 1 }], error: null };
        }
        return {
          data: [{ claimed: true, reason: 'claimed', event_id: 'e1', claim_token: 't1', attempts: 1 }],
          error: null,
        };
      }
      if (name === 'complete_subscription_event') {
        completed.push(args);
        return { data: 1, error: null };
      }
      if (name === 'fail_subscription_event') return { data: true, error: null };
      if (name === 'claim_subscription_effect') return { data: null, error: null };
      if (name === 'claim_pro_founder_slot') return { data: null, error: null };
      return { data: null, error: null };
    },
  };

  return { supabase, updates, inserts, completed };
}

const subscription = {
  id: 'sub-1',
  lawyer_id: 'lawyer-1',
  plan: 'pro',
  status: 'active',
  amount_clp: 19990,
  provider_subscription_id: 'pre-1',
};

const deps = {
  completePlusUpgrade: async () => ({ ok: true }),
  ensureProStandardPrice: async () => {},
  effectHandlers: { analytics: async () => {} },
};

describe('payment event identity', () => {
  it('includes the status so pending and approved do not collide', () => {
    const pending = paymentEventIdentity({ id: 'pay-1', status: 'pending', date_created: '2026-10-01T00:00:00Z' });
    const approved = paymentEventIdentity({ id: 'pay-1', status: 'approved', date_created: '2026-10-01T00:00:00Z' });

    expect(pending.providerEventId).toBe('pay-1:pending');
    expect(approved.providerEventId).toBe('pay-1');
    expect(pending.providerEventId).not.toBe(approved.providerEventId);
    expect(pending.transitionKey).not.toBe(approved.transitionKey);
    expect(pending.resourceId).toBe('pay-1');
  });

  it('classifies final, non-final and revocation statuses', () => {
    expect(paymentStatusKind('approved')).toBe('approved');
    expect(paymentStatusKind('rejected')).toBe('rejected');
    expect(paymentStatusKind('refused')).toBe('rejected');
    expect(paymentStatusKind('pending')).toBe('non_final');
    expect(paymentStatusKind('in_process')).toBe('non_final');
    expect(paymentStatusKind('refunded')).toBe('revoked');
    expect(paymentStatusKind('charged_back')).toBe('revoked');
    expect(paymentStatusKind('in_mediation')).toBe('unsupported');
  });
});

describe('processProAuthorizedPaymentEvent', () => {
  it('busy claims stay retryable', async () => {
    const mock = createMockSupabase({ claim: false });
    const result = await processProAuthorizedPaymentEvent({
      supabase: mock.supabase,
      payment: { id: 'pay-1', status: 'approved', preapproval_id: 'pre-1', date_created: '2026-10-01T00:00:00Z' },
      subscription,
      preapprovalId: 'pre-1',
      deps,
    });
    expect(result).toEqual({ skipped: 'busy', retry: true });
  });

  it('refund revokes access and keeps one ledger row per payment id', async () => {
    const mock = createMockSupabase();
    const approved = await processProAuthorizedPaymentEvent({
      supabase: mock.supabase,
      payment: { id: 'pay-3', status: 'approved', preapproval_id: 'pre-1', transaction_amount: 19990, date_created: '2026-10-01T00:00:00Z' },
      subscription,
      preapprovalId: 'pre-1',
      deps,
    });
    expect(approved.ok).toBe(true);

    const refunded = await processProAuthorizedPaymentEvent({
      supabase: mock.supabase,
      payment: { id: 'pay-3', status: 'refunded', preapproval_id: 'pre-1', transaction_amount: 19990, date_created: '2026-10-01T00:00:00Z', date_last_updated: '2026-10-02T00:00:00Z' },
      subscription,
      preapprovalId: 'pre-1',
      deps,
    });
    expect(refunded).toMatchObject({ ok: true, revoked: true });

    const revoke = mock.updates.find((u) => u.table === 'lawyer_subscriptions' && u.row.status === 'cancelled');
    expect(revoke).toBeTruthy();
    expect(revoke.row.current_period_end).toBeTruthy();

    const ledgerRows = mock.inserts.filter((i) => i.table === 'pro_subscription_payments').map((i) => i.row);
    expect(ledgerRows.every((row) => row.provider_authorized_payment_id === 'pay-3')).toBe(true);
    expect(ledgerRows.map((row) => row.status)).toEqual(['approved', 'refunded']);
  });

  it('a stale refund does not cancel a newer subscription', async () => {
    const mock = createMockSupabase();
    const result = await processProAuthorizedPaymentEvent({
      supabase: mock.supabase,
      payment: { id: 'pay-old', status: 'refunded', preapproval_id: 'pre-1', date_created: '2026-09-01T00:00:00Z', date_last_updated: '2026-09-02T00:00:00Z' },
      subscription: { ...subscription, status: 'cancelled', cancelled_at: '2026-10-01T00:00:00Z' },
      preapprovalId: 'pre-1',
      deps,
    });
    expect(result).toEqual({ skipped: 'stale_cancelled' });
    expect(mock.updates.some((u) => u.table === 'lawyer_subscriptions')).toBe(false);
  });

  it('an unknown status is completed so it cannot strand a processing lease', async () => {
    const mock = createMockSupabase();
    const result = await processProAuthorizedPaymentEvent({
      supabase: mock.supabase,
      payment: { id: 'pay-4', status: 'in_mediation', preapproval_id: 'pre-1', date_created: '2026-10-01T00:00:00Z' },
      subscription,
      preapprovalId: 'pre-1',
      deps,
    });
    expect(result).toEqual({ skipped: 'unhandled_status', status: 'in_mediation' });
    expect(mock.completed).toHaveLength(1);
    expect(mock.updates.some((u) => u.table === 'lawyer_subscriptions')).toBe(false);
  });
});
