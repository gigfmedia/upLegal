// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';

describe('FASE 6.1C — pending recovery', () => {
  it('AI pending event with failed subscription update is retryable', async () => {
    const { tryInsertSubscriptionEvent, markSubscriptionEventFailed, markSubscriptionEventProcessed } = await import('./subscriptions/subscriptionEvents.mjs');
    const store = new Map();
    const mockSupabase = {
      from: (table) => {
        if (table === 'subscription_events') {
          return {
            insert: async (row) => {
              const key = `${row.provider}:${row.provider_event_id}:${row.product_type}`;
              if (store.has(key)) return { error: { code: '23505' } };
              store.set(key, { ...row, status: 'pending' });
              return { error: null };
            },
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => {
                      for (const [k, v] of store.entries()) {
                        if (k.includes('P1')) return { data: v, error: null };
                      }
                      return { data: null, error: null };
                    },
                  }),
                }),
              }),
            }),
            update: (payload) => ({
              eq: () => ({
                eq: () => ({
                  eq: () => Promise.resolve({ error: null }),
                }),
              }),
            }),
          };
        }
        return { from: () => ({}) };
      },
    };

    // First delivery: insert pending
    const r1 = await tryInsertSubscriptionEvent(mockSupabase, { productType: 'ai', subscriptionId: 's1', providerEventId: 'P1', providerEventAt: '2026-09-01', eventType: 'payment_approved', providerStatus: 'approved' });
    expect(r1.inserted).toBe(true);
    expect(r1.status).toBe('pending');

    // Simulate subscription update failure → mark failed
    await markSubscriptionEventFailed(mockSupabase, { productType: 'ai', providerEventId: 'P1' });
    // Update our store to reflect failed status for the test
    store.set('mercadopago:P1:ai', { status: 'failed', provider_event_id: 'P1' });

    // Second delivery same P1 should be retryable (pending/failed)
    const r2 = await tryInsertSubscriptionEvent(mockSupabase, { productType: 'ai', subscriptionId: 's1', providerEventId: 'P1', providerEventAt: '2026-09-01', eventType: 'payment_approved', providerStatus: 'approved' });
    expect(r2.duplicate).toBe(true);
    expect(r2.retryable).toBe(true);
    expect(r2.status).toBe('failed');

    // After successful retry, mark processed
    await markSubscriptionEventProcessed(mockSupabase, { productType: 'ai', providerEventId: 'P1' });
    store.set('mercadopago:P1:ai', { status: 'processed' });

    // Third delivery same P1 should be idempotent (processed, not retryable)
    const r3 = await tryInsertSubscriptionEvent(mockSupabase, { productType: 'ai', subscriptionId: 's1', providerEventId: 'P1', providerEventAt: '2026-09-01', eventType: 'payment_approved', providerStatus: 'approved' });
    expect(r3.status).toBe('processed');
    expect(r3.retryable).toBeUndefined();
  });

  it('Pro pending recovery similar', async () => {
    const { tryInsertSubscriptionEvent } = await import('./subscriptions/subscriptionEvents.mjs');
    const store = new Map();
    const mock = {
      from: () => ({
        insert: async (row) => {
          const key = `${row.provider}:${row.provider_event_id}:${row.product_type}`;
          if (store.has(key)) return { error: { code: '23505' } };
          store.set(key, { status: 'pending' });
          return { error: null };
        },
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { status: 'pending' }, error: null }),
              }),
            }),
          }),
        }),
      }),
    };
    const r1 = await tryInsertSubscriptionEvent(mock, { productType: 'pro', subscriptionId: 's2', providerEventId: 'P2', providerEventAt: '2026-09-02', eventType: 'payment_approved', providerStatus: 'approved' });
    expect(r1.inserted).toBe(true);
    const r2 = await tryInsertSubscriptionEvent(mock, { productType: 'pro', subscriptionId: 's2', providerEventId: 'P2', providerEventAt: '2026-09-02', eventType: 'payment_approved', providerStatus: 'approved' });
    expect(r2.retryable).toBe(true);
  });
});
