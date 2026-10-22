// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { derivePeriodFromProvider, matchesActiveProvider } from './subscriptions/subscriptionEvents.mjs';

describe('FASE 4B-4.1 — period derivation', () => {
  it('uses next_payment_date as period end', () => {
    const pre = { next_payment_date: '2026-10-15T00:00:00.000Z', auto_recurring: { start_date: '2026-09-15T00:00:00.000Z' }, date_created: '2026-09-01T00:00:00.000Z' };
    const p = derivePeriodFromProvider(pre);
    expect(p.end.toISOString()).toBe('2026-10-15T00:00:00.000Z');
    expect(p.start.toISOString()).toBe('2026-09-15T00:00:00.000Z');
  });
  it('fallback to date_created +30d', () => {
    const pre = { date_created: '2026-09-01T00:00:00.000Z' };
    const p = derivePeriodFromProvider(pre);
    expect(p.start.toISOString()).toBe('2026-09-01T00:00:00.000Z');
    expect(p.end.toISOString()).toBe(new Date(new Date('2026-09-01').getTime()+30*24*60*60*1000).toISOString());
  });
  it('returns null if no dates', () => {
    expect(derivePeriodFromProvider({})).toBeNull();
  });
});

describe('FASE 4B-4.1 — event idempotency', () => {
  it('same provider event id is duplicate', async () => {
    const { tryInsertSubscriptionEvent } = await import('./subscriptions/subscriptionEvents.mjs');
    const store = new Map();
    const mock = {
      from: () => ({
        insert: async (row) => {
          const key = `${row.provider}:${row.provider_event_id}:${row.product_type}`;
          if (store.has(key)) return { error: { code: '23505' } };
          store.set(key, { status: 'pending', provider_event_id: row.provider_event_id });
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
    const r1 = await tryInsertSubscriptionEvent(mock, { productType: 'ai', subscriptionId: 's1', providerEventId: 'P1:authorized:2026-09-01', providerEventAt: '2026-09-01', eventType: 'preapproval_authorized', providerStatus: 'authorized' });
    expect(r1.inserted).toBe(true);
    const r2 = await tryInsertSubscriptionEvent(mock, { productType: 'ai', subscriptionId: 's1', providerEventId: 'P1:authorized:2026-09-01', providerEventAt: '2026-09-01', eventType: 'preapproval_authorized', providerStatus: 'authorized' });
    expect(r2.duplicate).toBe(true);
  });
  it('partial failure recovery: pending event retryable', async () => {
    const { tryInsertSubscriptionEvent } = await import('./subscriptions/subscriptionEvents.mjs');
    // Verify that duplicate of pending is marked retryable, not permanently blocked
    const store = new Map();
    store.set('mercadopago:P1:ai', { status: 'pending' });
    const mock = {
      from: () => ({
        insert: async () => ({ error: { code: '23505' } }),
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
    const r = await tryInsertSubscriptionEvent(mock, { productType: 'ai', subscriptionId: 's1', providerEventId: 'P1', providerEventAt: '2026-09-01', eventType: 'payment_approved', providerStatus: 'approved' });
    expect(r.duplicate).toBe(true);
    expect(r.retryable).toBe(true);
    expect(r.status).toBe('pending');
  });
});

describe('FASE 4.57D — preapproval identity guard (matchesActiveProvider)', () => {
  it('accepts the canonical provider subscription id', () => {
    expect(matchesActiveProvider({ provider_subscription_id: 'MP1', pending_provider_subscription_id: null }, 'MP1')).toBe(true);
  });
  it('accepts the in-flight pending (upgrade) provider subscription id', () => {
    expect(matchesActiveProvider({ provider_subscription_id: 'MP_PRO', pending_provider_subscription_id: 'MP_PLUS' }, 'MP_PLUS')).toBe(true);
  });
  it('rejects a foreign or stale provider id', () => {
    expect(matchesActiveProvider({ provider_subscription_id: 'MP1', pending_provider_subscription_id: null }, 'MP_OLD')).toBe(false);
  });
  it('rejects an empty or missing provider id', () => {
    expect(matchesActiveProvider({ provider_subscription_id: 'MP1' }, '')).toBe(false);
    expect(matchesActiveProvider({ provider_subscription_id: 'MP1' }, null)).toBe(false);
    expect(matchesActiveProvider({ provider_subscription_id: 'MP1' }, undefined)).toBe(false);
  });
  it('accepts when nothing is linked yet (first authorization race)', () => {
    expect(matchesActiveProvider({ provider_subscription_id: null, pending_provider_subscription_id: null }, 'MP1')).toBe(true);
    expect(matchesActiveProvider({}, 'MP1')).toBe(true);
  });
  it('coerces non-string provider ids', () => {
    expect(matchesActiveProvider({ provider_subscription_id: 123456 }, 123456)).toBe(true);
    expect(matchesActiveProvider({ provider_subscription_id: 123456 }, '123456')).toBe(true);
  });
});
