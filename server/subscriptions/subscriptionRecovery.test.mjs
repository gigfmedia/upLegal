// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import {
  recoverSubscriptionEvents,
  EVENT_RECOVERY_LIMIT,
} from './subscriptionRecovery.mjs';

function makeSupabase(events = [], { expired = 0 } = {}) {
  const calls = { expire: [], list: [], defer: [], supersede: [] };
  return {
    calls,
    async rpc(name, params = {}) {
      if (name === 'expire_subscription_events') {
        calls.expire.push(params);
        return { data: expired, error: null };
      }
      if (name === 'recoverable_subscription_events') {
        calls.list.push(params);
        return { data: events, error: null };
      }
      if (name === 'defer_subscription_event') {
        calls.defer.push(params);
        return { data: true, error: null };
      }
      if (name === 'supersede_subscription_event') {
        calls.supersede.push(params);
        return { data: true, error: null };
      }
      throw new Error(`unexpected_rpc:${name}`);
    },
  };
}

function event(overrides = {}) {
  return {
    event_id: 'ev-1',
    product_type: 'pro',
    subscription_id: 'sub-1',
    provider_event_id: 'PRE-1:authorized:2026-10-22T10:00:00Z',
    event_type: 'preapproval_authorized',
    provider_status: 'authorized',
    resource_id: 'PRE-1',
    resource_status: 'authorized',
    status: 'failed',
    attempts: 2,
    next_attempt_at: new Date(Date.now() - 1000).toISOString(),
    lease_expires_at: null,
    provider_event_at: '2026-10-22T10:00:00Z',
    created_at: '2026-10-22T10:00:00Z',
    ...overrides,
  };
}

const logger = { log: vi.fn(), error: vi.fn() };

describe('subscription recovery worker', () => {
  it('re-fetches the provider resource and re-invokes the existing preapproval handler', async () => {
    const supabase = makeSupabase([event()]);
    const fetchPreapproval = vi.fn(async () => ({ ok: true, data: { id: 'PRE-1', status: 'authorized' } }));
    const preapproval = vi.fn(async () => ({ ok: true }));

    const result = await recoverSubscriptionEvents(supabase, {
      fetchPreapproval,
      fetchPayment: vi.fn(),
      handlers: { preapproval, payment: vi.fn() },
      logger,
    });

    expect(result).toMatchObject({ scanned: 1, recovered: 1, deferred: 0, superseded: 0, busy: 0, failed: 0 });
    expect(fetchPreapproval).toHaveBeenCalledWith('PRE-1');
    expect(preapproval).toHaveBeenCalledWith({ id: 'PRE-1', status: 'authorized' });
    expect(supabase.calls.supersede).toEqual([{
      p_id: 'ev-1',
      p_expected_status: 'failed',
      p_expected_attempts: 2,
      p_reason: 'replayed',
    }]);
  });

  it('routes payment events to the payment fetcher and handler', async () => {
    const supabase = makeSupabase([event({
      provider_event_id: 'PAY-9',
      event_type: 'payment_approved',
      resource_id: 'PAY-9',
      status: 'processing',
      lease_expires_at: new Date(Date.now() - 1000).toISOString(),
    })]);
    const fetchPayment = vi.fn(async () => ({ ok: true, data: { id: 'PAY-9', status: 'approved' } }));
    const payment = vi.fn(async () => ({ ok: true }));

    const result = await recoverSubscriptionEvents(supabase, {
      fetchPreapproval: vi.fn(),
      fetchPayment,
      handlers: { preapproval: vi.fn(), payment },
      logger,
    });

    expect(result.recovered).toBe(1);
    expect(fetchPayment).toHaveBeenCalledWith('PAY-9');
    expect(payment).toHaveBeenCalledWith({ id: 'PAY-9', status: 'approved' });
  });

  it('does not touch an event whose handler reports a live busy claim', async () => {
    const supabase = makeSupabase([event()]);
    const result = await recoverSubscriptionEvents(supabase, {
      fetchPreapproval: async () => ({ ok: true, data: { id: 'PRE-1' } }),
      fetchPayment: vi.fn(),
      handlers: {
        preapproval: async () => ({ skipped: 'busy', retry: true }),
        payment: vi.fn(),
      },
      logger,
    });

    expect(result.busy).toBe(1);
    expect(supabase.calls.defer).toEqual([]);
    expect(supabase.calls.supersede).toEqual([]);
  });

  it('defers a retryable provider fetch failure with the expected row identity', async () => {
    const supabase = makeSupabase([event()]);
    const result = await recoverSubscriptionEvents(supabase, {
      fetchPreapproval: async () => ({ ok: false, retryable: true, reason: 'provider_unavailable' }),
      fetchPayment: vi.fn(),
      handlers: { preapproval: vi.fn(), payment: vi.fn() },
      logger,
    });

    expect(result.deferred).toBe(1);
    expect(supabase.calls.defer).toEqual([{
      p_id: 'ev-1',
      p_expected_status: 'failed',
      p_expected_attempts: 2,
      p_error: 'provider_unavailable',
      p_max_attempts: 8,
    }]);
    expect(supabase.calls.supersede).toEqual([]);
  });

  it('supersedes a permanent provider rejection', async () => {
    const supabase = makeSupabase([event()]);
    const result = await recoverSubscriptionEvents(supabase, {
      fetchPreapproval: async () => ({ ok: false, retryable: false, reason: 'provider_rejected' }),
      fetchPayment: vi.fn(),
      handlers: { preapproval: vi.fn(), payment: vi.fn() },
      logger,
    });

    expect(result.superseded).toBe(1);
    expect(supabase.calls.supersede).toEqual([{
      p_id: 'ev-1',
      p_expected_status: 'failed',
      p_expected_attempts: 2,
      p_reason: 'provider_rejected',
    }]);
  });

  it('pauses on an auth failure without consuming an attempt or superseding', async () => {
    const supabase = makeSupabase([event(), event({ event_id: 'ev-2', resource_id: 'PRE-2' })]);
    const fetchPreapproval = vi.fn(async () => ({
      ok: false,
      retryable: false,
      authFailure: true,
      reason: 'provider_auth_failed',
      status: 401,
    }));
    const result = await recoverSubscriptionEvents(supabase, {
      fetchPreapproval,
      fetchPayment: vi.fn(),
      handlers: { preapproval: vi.fn(), payment: vi.fn() },
      logger,
    });

    expect(result).toMatchObject({ scanned: 2, authFailed: 1, superseded: 0, deferred: 0, failed: 0 });
    // The batch stops at the first auth failure; the second event is untouched.
    expect(fetchPreapproval).toHaveBeenCalledTimes(1);
    expect(supabase.calls.defer).toEqual([]);
    expect(supabase.calls.supersede).toEqual([]);
  });

  it('never derives a provider resource id from the notification identity', async () => {
    const supabase = makeSupabase([event({
      event_id: 'ev-no-resource',
      resource_id: null,
      provider_event_id: 'PRE-1:authorized:2026-10-22T10:00:00Z',
    })]);
    const fetchPreapproval = vi.fn();
    const result = await recoverSubscriptionEvents(supabase, {
      fetchPreapproval,
      fetchPayment: vi.fn(),
      handlers: { preapproval: vi.fn(), payment: vi.fn() },
      logger,
    });

    expect(result.superseded).toBe(1);
    expect(fetchPreapproval).not.toHaveBeenCalled();
    expect(supabase.calls.supersede[0]).toMatchObject({ p_reason: 'missing_resource_id' });
  });

  it('defers a thrown handler without claiming success', async () => {
    const supabase = makeSupabase([event()]);
    const result = await recoverSubscriptionEvents(supabase, {
      fetchPreapproval: async () => ({ ok: true, data: { id: 'PRE-1' } }),
      fetchPayment: vi.fn(),
      handlers: {
        preapproval: async () => { throw new Error('db_down'); },
        payment: vi.fn(),
      },
      logger,
    });

    expect(result.failed).toBe(1);
    expect(supabase.calls.defer[0]).toMatchObject({ p_id: 'ev-1', p_error: 'db_down' });
    expect(supabase.calls.supersede).toEqual([]);
  });

  it('supersedes unsupported or incomplete legacy rows without fetching', async () => {
    const supabase = makeSupabase([
      event({ event_id: 'ev-unknown', event_type: 'mystery_event' }),
      event({ event_id: 'ev-no-resource', resource_id: null, provider_event_id: '' }),
      event({ event_id: 'ev-ai', product_type: 'ai' }),
    ]);
    const fetchPreapproval = vi.fn();
    const result = await recoverSubscriptionEvents(supabase, {
      fetchPreapproval,
      fetchPayment: vi.fn(),
      handlers: { preapproval: vi.fn(), payment: vi.fn() },
      logger,
    });

    expect(result.superseded).toBe(3);
    expect(fetchPreapproval).not.toHaveBeenCalled();
    expect(supabase.calls.supersede.map((c) => c.p_reason)).toEqual([
      'unsupported_event_type',
      'missing_resource_id',
      'unsupported_product',
    ]);
  });

  it('terminalizes exhausted events before listing and uses the default limit', async () => {
    const supabase = makeSupabase([], { expired: 4 });
    const result = await recoverSubscriptionEvents(supabase, {
      fetchPreapproval: vi.fn(),
      fetchPayment: vi.fn(),
      handlers: {},
      logger,
    });

    expect(result.expired).toBe(4);
    expect(supabase.calls.expire).toEqual([{ p_max_attempts: 8 }]);
    expect(supabase.calls.list).toEqual([{ p_limit: EVENT_RECOVERY_LIMIT, p_max_attempts: 8 }]);
  });
});
