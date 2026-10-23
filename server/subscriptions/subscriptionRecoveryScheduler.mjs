// H4: recovery scheduler guard rails.
//
// Recovery is OFF by default and must be explicitly enabled per environment
// after the H4 migrations are applied. A tick:
//   1. respects an auth-failure cooldown,
//   2. refuses to overlap with a still-running tick in this process,
//   3. acquires a short DB lease so only one instance scans at a time,
//   4. always releases the lease, even when the batch throws.

import { randomUUID } from 'node:crypto';
import {
  EVENT_RECOVERY_INTERVAL_MS,
  EVENT_RECOVERY_LIMIT,
  isSubscriptionRecoveryEnabled,
  recoverSubscriptionEvents,
} from './subscriptionRecovery.mjs';

export const RECOVERY_LEASE_NAME = 'subscription-recovery';
export const RECOVERY_LEASE_SECONDS = 120;
export const RECOVERY_AUTH_COOLDOWN_MS = 5 * 60 * 1000;

export function createSubscriptionRecoveryScheduler({
  supabase,
  handlers,
  logger = console,
  holder = randomUUID(),
  limit = EVENT_RECOVERY_LIMIT,
  intervalMs = EVENT_RECOVERY_INTERVAL_MS,
  leaseSeconds = RECOVERY_LEASE_SECONDS,
  authCooldownMs = RECOVERY_AUTH_COOLDOWN_MS,
  recover = recoverSubscriptionEvents,
  env = process.env,
  now = Date.now,
} = {}) {
  if (!supabase) throw new Error('supabase_required');
  if (typeof handlers !== 'function') throw new Error('handlers_provider_required');

  let timer = null;
  let inFlight = false;
  let cooldownUntil = 0;

  async function tick() {
    if (now() < cooldownUntil) {
      return { skipped: 'auth_cooldown', until: new Date(cooldownUntil).toISOString() };
    }
    if (inFlight) {
      return { skipped: 'in_flight' };
    }

    inFlight = true;
    let leased = false;
    try {
      const { data: acquired, error: leaseError } = await supabase.rpc(
        'acquire_subscription_recovery_lease',
        {
          p_name: RECOVERY_LEASE_NAME,
          p_holder: holder,
          p_lease_seconds: leaseSeconds,
        },
      );
      if (leaseError) throw leaseError;
      if (acquired !== true) {
        return { skipped: 'lease_held' };
      }
      leased = true;

      const result = await recover(supabase, {
        limit,
        ...handlers(),
      });

      if (result?.authFailed > 0) {
        cooldownUntil = now() + authCooldownMs;
        logger.error('[SubscriptionRecovery] auth cooldown engaged', {
          until: new Date(cooldownUntil).toISOString(),
        });
      }
      return result;
    } catch (e) {
      logger.error('[SubscriptionRecovery] tick failed', {
        error: String(e?.message || e),
      });
      return { error: String(e?.message || e) };
    } finally {
      if (leased) {
        try {
          const { error } = await supabase.rpc('release_subscription_recovery_lease', {
            p_name: RECOVERY_LEASE_NAME,
            p_holder: holder,
          });
          if (error) {
            logger.error('[SubscriptionRecovery] lease release failed', {
              error: String(error?.message || error),
            });
          }
        } catch (e) {
          logger.error('[SubscriptionRecovery] lease release failed', {
            error: String(e?.message || e),
          });
        }
      }
      inFlight = false;
    }
  }

  function start() {
    if (timer) return true;
    if (!isSubscriptionRecoveryEnabled(env)) {
      logger.log('[SubscriptionRecovery] disabled (set SUBSCRIPTION_RECOVERY_ENABLED=1 to enable)');
      return false;
    }
    timer = setInterval(tick, intervalMs);
    timer.unref?.();
    return true;
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  return {
    tick,
    start,
    stop,
    holder,
    isRunning: () => timer !== null,
  };
}

export function startSubscriptionRecovery(options = {}) {
  const scheduler = createSubscriptionRecoveryScheduler(options);
  scheduler.start();
  return scheduler;
}
