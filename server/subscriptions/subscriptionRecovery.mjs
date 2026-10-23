// H4: recovery worker for subscription events that no longer receive provider
// redeliveries.
//
// The atomic claim in subscriptionEvents.mjs remains the only mutation gate.
// This worker only:
//   1. terminalizes events that exhausted their attempts,
//   2. lists due Pro events,
//   3. re-fetches the provider resource and calls the SAME Pro handler,
//   4. defers or supersedes the old audit row without touching a live claim.
//
// AI legacy events are intentionally excluded: they do not use the atomic claim
// yet, so replaying them automatically would reopen the duplicate-application
// window this phase is meant to close.

import { EVENT_MAX_ATTEMPTS } from './subscriptionEvents.mjs';

export const EVENT_RECOVERY_LIMIT = 10;
export const EVENT_RECOVERY_INTERVAL_MS = 60 * 1000;

// Default OFF. Recovery must stay disabled until the H4 migrations are applied
// and the operator explicitly enables it per environment.
export function isSubscriptionRecoveryEnabled(env = process.env) {
  return env?.SUBSCRIPTION_RECOVERY_ENABLED === '1';
}

function eventKind(eventType) {
  const value = String(eventType || '');
  if (value.startsWith('plus_preapproval_') || value.startsWith('preapproval_')) {
    return 'preapproval';
  }
  if (value.startsWith('payment_')) return 'payment';
  return 'unsupported';
}

function resourceIdOf(event) {
  // provider_event_id is a notification identity, not a provider resource id.
  // Never derive a resource from it: a synthesized id like `PRE-1:authorized:…`
  // would silently fetch a resource that does not exist.
  const resourceId = event?.resource_id == null ? '' : String(event.resource_id).trim();
  return resourceId || null;
}

async function defer(supabase, event, error, maxAttempts) {
  const { data, error: rpcError } = await supabase.rpc('defer_subscription_event', {
    p_id: event.event_id,
    p_expected_status: event.status,
    p_expected_attempts: event.attempts,
    p_error: String(error ?? 'recovery_deferred'),
    p_max_attempts: maxAttempts,
  });
  if (rpcError) throw rpcError;
  return data === true;
}

async function supersede(supabase, event, reason) {
  const { data, error } = await supabase.rpc('supersede_subscription_event', {
    p_id: event.event_id,
    p_expected_status: event.status,
    p_expected_attempts: event.attempts,
    p_reason: String(reason ?? 'resolved'),
  });
  if (error) throw error;
  return data === true;
}

export async function recoverSubscriptionEvents(supabase, {
  limit = EVENT_RECOVERY_LIMIT,
  maxAttempts = EVENT_MAX_ATTEMPTS,
  fetchPreapproval,
  fetchPayment,
  handlers = {},
  logger = console,
} = {}) {
  const { data: expiredData, error: expireError } = await supabase.rpc('expire_subscription_events', {
    p_max_attempts: maxAttempts,
  });
  if (expireError) throw expireError;

  const { data, error } = await supabase.rpc('recoverable_subscription_events', {
    p_limit: limit,
    p_max_attempts: maxAttempts,
  });
  if (error) throw error;

  const events = Array.isArray(data) ? data : [];
  const result = {
    scanned: events.length,
    recovered: 0,
    deferred: 0,
    superseded: 0,
    busy: 0,
    failed: 0,
    authFailed: 0,
    expired: Number(expiredData) || 0,
  };

  for (const event of events) {
    if (event.product_type !== 'pro') {
      result.superseded++;
      await supersede(supabase, event, 'unsupported_product');
      continue;
    }

    const kind = eventKind(event.event_type);
    const resourceId = resourceIdOf(event);
    if (kind === 'unsupported' || !resourceId) {
      result.superseded++;
      await supersede(supabase, event, kind === 'unsupported' ? 'unsupported_event_type' : 'missing_resource_id');
      continue;
    }

    let fetched;
    try {
      fetched = kind === 'preapproval'
        ? await fetchPreapproval(resourceId)
        : await fetchPayment(resourceId);
    } catch (e) {
      result.failed++;
      await defer(supabase, event, e?.message || e, maxAttempts);
      continue;
    }

    if (!fetched?.ok) {
      if (fetched?.authFailure === true) {
        // Auth is operational, not event-specific. Alert, do not touch the row
        // (no attempt consumed, never terminalized) and stop this batch so the
        // scheduler can cool down instead of hammering the provider.
        result.authFailed++;
        logger.error('[SubscriptionRecovery] provider auth failure; recovery paused', {
          event_id: event.event_id,
          http_status: fetched?.status ?? null,
          reason: fetched?.reason || 'provider_auth_failed',
        });
        break;
      }
      if (fetched?.retryable === true) {
        result.deferred++;
        await defer(supabase, event, fetched.reason || 'provider_unavailable', maxAttempts);
      } else {
        result.superseded++;
        await supersede(supabase, event, fetched.reason || 'provider_rejected');
      }
      continue;
    }

    try {
      const handler = kind === 'preapproval' ? handlers.preapproval : handlers.payment;
      if (!handler) throw new Error(`no_recovery_handler:${kind}`);
      const handlerResult = await handler(fetched.data);

      if (handlerResult?.retry === true) {
        if (handlerResult.skipped === 'busy') {
          result.busy++;
          continue;
        }
        result.deferred++;
        await defer(
          supabase,
          event,
          handlerResult.skipped || handlerResult.reason || 'retry',
          maxAttempts,
        );
        continue;
      }

      if (handlerResult?.ok === true) {
        result.recovered++;
      } else {
        result.superseded++;
      }
      await supersede(supabase, event, handlerResult?.skipped || 'replayed');
    } catch (e) {
      result.failed++;
      await defer(supabase, event, e?.message || e, maxAttempts);
    }
  }

  if (result.scanned > 0 || result.expired > 0) {
    logger.log('[SubscriptionRecovery]', result);
  }
  return result;
}
