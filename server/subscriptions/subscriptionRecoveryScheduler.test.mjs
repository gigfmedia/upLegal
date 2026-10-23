// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import {
  createSubscriptionRecoveryScheduler,
  RECOVERY_LEASE_NAME,
} from './subscriptionRecoveryScheduler.mjs';
import { isSubscriptionRecoveryEnabled } from './subscriptionRecovery.mjs';

function makeSupabase({ acquired = true, leaseError = null } = {}) {
  const calls = { acquire: [], release: [] };
  return {
    calls,
    async rpc(name, params = {}) {
      if (name === 'acquire_subscription_recovery_lease') {
        calls.acquire.push(params);
        return { data: acquired, error: leaseError };
      }
      if (name === 'release_subscription_recovery_lease') {
        calls.release.push(params);
        return { data: true, error: null };
      }
      throw new Error(`unexpected_rpc:${name}`);
    },
  };
}

const handlers = () => ({
  fetchPreapproval: vi.fn(),
  fetchPayment: vi.fn(),
  handlers: {},
});

const logger = { log: vi.fn(), error: vi.fn() };

describe('subscription recovery scheduler', () => {
  it('is disabled unless SUBSCRIPTION_RECOVERY_ENABLED is exactly 1', () => {
    expect(isSubscriptionRecoveryEnabled({})).toBe(false);
    expect(isSubscriptionRecoveryEnabled({ SUBSCRIPTION_RECOVERY_ENABLED: '0' })).toBe(false);
    expect(isSubscriptionRecoveryEnabled({ SUBSCRIPTION_RECOVERY_ENABLED: 'false' })).toBe(false);
    expect(isSubscriptionRecoveryEnabled({ SUBSCRIPTION_RECOVERY_ENABLED: 'true' })).toBe(false);
    expect(isSubscriptionRecoveryEnabled({ SUBSCRIPTION_RECOVERY_ENABLED: '1' })).toBe(true);
  });

  it('does not start a timer while disabled', () => {
    const scheduler = createSubscriptionRecoveryScheduler({
      supabase: makeSupabase(),
      handlers,
      logger,
      env: {},
    });

    expect(scheduler.start()).toBe(false);
    expect(scheduler.isRunning()).toBe(false);
  });

  it('acquires and releases the DB lease around a batch', async () => {
    const supabase = makeSupabase();
    const recover = vi.fn(async () => ({ scanned: 0, recovered: 0 }));
    const scheduler = createSubscriptionRecoveryScheduler({
      supabase,
      handlers,
      logger,
      holder: '11111111-1111-4111-8111-111111111111',
      recover,
    });

    await expect(scheduler.tick()).resolves.toMatchObject({ scanned: 0 });

    expect(supabase.calls.acquire).toEqual([{
      p_name: RECOVERY_LEASE_NAME,
      p_holder: '11111111-1111-4111-8111-111111111111',
      p_lease_seconds: 120,
    }]);
    expect(supabase.calls.release).toEqual([{
      p_name: RECOVERY_LEASE_NAME,
      p_holder: '11111111-1111-4111-8111-111111111111',
    }]);
  });

  it('skips the batch when another instance holds the lease', async () => {
    const supabase = makeSupabase({ acquired: false });
    const recover = vi.fn();
    const scheduler = createSubscriptionRecoveryScheduler({ supabase, handlers, logger, recover });

    await expect(scheduler.tick()).resolves.toEqual({ skipped: 'lease_held' });
    expect(recover).not.toHaveBeenCalled();
    expect(supabase.calls.release).toEqual([]);
  });

  it('never overlaps two ticks in the same process', async () => {
    const supabase = makeSupabase();
    let resolveRecover;
    const recover = vi.fn(() => new Promise((resolve) => { resolveRecover = resolve; }));
    const scheduler = createSubscriptionRecoveryScheduler({ supabase, handlers, logger, recover });

    const first = scheduler.tick();
    await expect(scheduler.tick()).resolves.toEqual({ skipped: 'in_flight' });

    resolveRecover({ scanned: 0 });
    await expect(first).resolves.toMatchObject({ scanned: 0 });
  });

  it('engages an auth cooldown after an auth failure', async () => {
    const supabase = makeSupabase();
    const recover = vi.fn(async () => ({ scanned: 1, authFailed: 1 }));
    const scheduler = createSubscriptionRecoveryScheduler({ supabase, handlers, logger, recover });

    await expect(scheduler.tick()).resolves.toMatchObject({ authFailed: 1 });
    await expect(scheduler.tick()).resolves.toMatchObject({ skipped: 'auth_cooldown' });
    expect(recover).toHaveBeenCalledTimes(1);
  });

  it('releases the lease when the batch throws', async () => {
    const supabase = makeSupabase();
    const recover = vi.fn(async () => { throw new Error('db_down'); });
    const scheduler = createSubscriptionRecoveryScheduler({ supabase, handlers, logger, recover });

    await expect(scheduler.tick()).resolves.toEqual({ error: 'db_down' });
    expect(supabase.calls.release).toHaveLength(1);
  });
});
