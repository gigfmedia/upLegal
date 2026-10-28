// Pro-family preapproval webhook orchestrators, extracted from server.mjs so the
// retry/recovery path can be unit- and integration-tested against the REAL
// production code (not a replica). server.mjs imports these and injects its
// side-effect deps (analytics, email, Plus completer) via `deps`.
//
// Dedup/ordering model (shared with server/subscriptions/subscriptionEvents.mjs):
//   - tryInsertSubscriptionEvent inserts one row per (provider, provider_event_id,
//     product_type). All Pro-family events share product_type='pro'.
//   - shouldApplyEvent compares against the max provider_event_at of PROCESSED
//     rows for the same subscription. Because Pro preapproval events now get
//     marked processed, the comparison is SCOPED to the event family
//     (eventTypePrefix) so preapproval rows can never move the payment baseline
//     (or vice-versa).
//
// DELIVERY SEMANTICS: at-least-once. If the process dies AFTER an external
// effect (analytics/email) runs and BEFORE the event is marked processed, the
// provider retry will run that effect again (a duplicate external effect). We
// deliberately favour "no silent loss" over "no duplicate": the activation path
// does NOT short-circuit on `subscription.status === 'active'`, because a
// partial attempt has already mutated that column, so such a guard would DROP
// the welcome effect exactly on the retry meant to recover it. (Unit-tested.)
//
// LEASE vs MUTUAL EXCLUSION: a duplicate of a fresh `pending`/`processing`
// event is treated as in-flight and surfaced as transient so the HTTP caller
// returns 5xx instead of acknowledging (and losing) a delivery whose original
// may have died. Once the row's lease expires, a duplicate must win an atomic
// conditional update to `processing` before it may proceed. This closes the
// previous race where two concurrent deliveries both read the expired row.

import {
  tryInsertSubscriptionEvent,
  derivePeriodFromProvider,
  shouldApplyEvent,
  markSubscriptionEventProcessed,
  markSubscriptionEventFailed,
} from './subscriptionEvents.mjs';
import { clearPendingPlusUpgrade, isTimelyEarlyPlusClaim, isTimelyProviderPreapproval } from './proSubscriptionRouting.mjs';

function throwOnPersistenceError(result, operation) {
  if (!result?.error) return;
  const detail = result.error.message || result.error.code || 'unknown database error';
  const error = new Error(`${operation}: ${detail}`);
  error.cause = result.error;
  throw error;
}

// Gate shared by both orchestrators. Returns true when the (possibly duplicate)
// event should be processed now, false when it must be skipped.
// `ev` is the shape returned by tryInsertSubscriptionEvent.
function shouldProcessEvent(ev) {
  if (ev.inserted) return true;
  if (ev.status === 'processed' || ev.status === 'needs_review') return false; // terminal
  if (!ev.retryable) return false; // unknown duplicate
  if (ev.claimed === false) return false; // another delivery owns the lease
  if ((ev.status === 'pending' || ev.status === 'processing') && !ev.stale) return false; // in-flight, do not compete
  return true; // failed, or a lease-expired row we atomically claimed
}

function isFreshPendingDuplicate(ev) {
  return !ev.inserted
    && (ev.status === 'pending' || ev.status === 'processing')
    && ev.retryable === true
    && ev.stale === false;
}

function skippedEventResult(ev) {
  // A fresh pending duplicate means the original delivery may still be in
  // flight, or may have died after inserting the row. Acknowledging it would
  // lose that webhook if the original died. Ask the caller to return a 5xx so
  // the provider retries; after the lease expires the retry can recover it.
  if (isFreshPendingDuplicate(ev)) return { transient: true, reason: 'event_in_flight' };
  return { skipped: ev.status };
}

export async function processProPreapprovalEvent({ supabase, subscription, preapproval, deps }) {
  const { capturePostHog, getProLawyerEmail, sendAIEmail, priceClp } = deps;
  const mpStatus = preapproval.status;
  const lawyerId = subscription.lawyer_id;
  const providerEventAt = preapproval.last_modified || preapproval.date_created || new Date().toISOString();
  const providerEventId = `${preapproval.id}:${mpStatus}:${providerEventAt}`;

  const ev = await tryInsertSubscriptionEvent(supabase, {
    productType: 'pro',
    subscriptionId: subscription.id,
    providerEventId,
    providerEventAt,
    eventType: `preapproval_${mpStatus}`,
    providerStatus: mpStatus,
  });
  if (!shouldProcessEvent(ev)) return skippedEventResult(ev);

  if (!(await shouldApplyEvent(supabase, {
    productType: 'pro',
    subscriptionId: subscription.id,
    providerEventAt,
    eventTypePrefix: 'preapproval',
  }))) {
    await markSubscriptionEventProcessed(supabase, { productType: 'pro', providerEventId });
    return { skipped: 'out_of_order' };
  }

  if (subscription.status === 'cancelled' && subscription.cancelled_at) {
    const cancelledAt = new Date(subscription.cancelled_at).getTime();
    const eventAt = new Date(providerEventAt).getTime();
    if (!isNaN(cancelledAt) && !isNaN(eventAt) && eventAt <= cancelledAt) {
      await markSubscriptionEventProcessed(supabase, { productType: 'pro', providerEventId });
      return { skipped: 'stale_cancelled' };
    }
  }

  const now = new Date();
  try {
    if (mpStatus === 'authorized' || mpStatus === 'active') {
      // First link only: ignore a redelivered, old authorized Pro preapproval
      // when this row has no provider id yet. Otherwise a stale mandate could be
      // attached to a brand-new checkout and start charging on the wrong one.
      if (!subscription.provider_subscription_id
        && !subscription.pending_provider_subscription_id
        && !isTimelyProviderPreapproval(subscription, preapproval)) {
        await markSubscriptionEventProcessed(supabase, { productType: 'pro', providerEventId });
        return { skipped: 'stale_provider' };
      }
      // Link the provider id before period validation: a valid authorization
      // must never leave the row unlinkable just because the period payload is
      // malformed. Payment webhooks resolve the row by this id.
      const link = await supabase.from('lawyer_subscriptions').update({
        provider_subscription_id: String(preapproval.id),
        updated_at: now.toISOString(),
      }).eq('id', subscription.id);
      throwOnPersistenceError(link, 'pro provider link update');
      const derived = derivePeriodFromProvider(preapproval);
      if (!derived) {
        await markSubscriptionEventProcessed(supabase, { productType: 'pro', providerEventId });
        return { skipped: 'no_period' };
      }
      const activation = await supabase.from('lawyer_subscriptions').update({
        status: 'active',
        current_period_start: derived.start.toISOString(),
        current_period_end: derived.end.toISOString(),
        cancel_at_period_end: false,
        cancelled_at: null,
        updated_at: now.toISOString(),
      }).eq('id', subscription.id);
      throwOnPersistenceError(activation, 'pro activation update');
      await capturePostHog('pro_subscription_activated', lawyerId, { price_clp: priceClp });
      const userData = await getProLawyerEmail(lawyerId);
      if (userData?.email) {
        try { await sendAIEmail(userData.email, '¡Bienvenido a LegalUp Pro!', '<p>Tu suscripción Pro está activa.</p>'); } catch {}
      }
    } else if (mpStatus === 'cancelled') {
      const cancellation = await supabase.from('lawyer_subscriptions').update({
        status: 'cancelled',
        cancelled_at: now.toISOString(),
        cancel_at_period_end: true,
        updated_at: now.toISOString(),
      }).eq('id', subscription.id);
      throwOnPersistenceError(cancellation, 'pro cancellation update');
      if (subscription.plan !== 'plus') {
        try { await supabase.from('pro_founder_reservations').delete().eq('lawyer_id', lawyerId); } catch {}
      }
    } else if (mpStatus === 'paused') {
      const paused = await supabase.from('lawyer_subscriptions').update({ status: 'past_due', updated_at: now.toISOString() }).eq('id', subscription.id);
      throwOnPersistenceError(paused, 'pro paused update');
    }
    await markSubscriptionEventProcessed(supabase, { productType: 'pro', providerEventId });
    return { ok: true };
  } catch (e) {
    await markSubscriptionEventFailed(supabase, { productType: 'pro', providerEventId });
    throw e;
  }
}

export async function processPlusPreapprovalEvent({ supabase, subscription, preapproval, deps }) {
  const { capturePostHog, completePlusUpgrade } = deps;
  const mpStatus = preapproval.status;
  const preapprovalId = preapproval.id;
  const lawyerId = subscription.lawyer_id;
  const providerEventAt = preapproval.last_modified || preapproval.date_created || new Date().toISOString();
  const providerEventId = `${preapprovalId}:${mpStatus}:${providerEventAt}`;

  const ev = await tryInsertSubscriptionEvent(supabase, {
    productType: 'pro',
    subscriptionId: subscription.id,
    providerEventId,
    providerEventAt,
    eventType: `plus_preapproval_${mpStatus}`,
    providerStatus: mpStatus,
  });
  if (!shouldProcessEvent(ev)) return skippedEventResult(ev);

  if (!(await shouldApplyEvent(supabase, {
    productType: 'pro',
    subscriptionId: subscription.id,
    providerEventAt,
    eventTypePrefix: 'plus_preapproval',
  }))) {
    await markSubscriptionEventProcessed(supabase, { productType: 'pro', providerEventId });
    return { skipped: 'out_of_order' };
  }

  const now = new Date();
  try {
    if (mpStatus === 'authorized' || mpStatus === 'active') {
      const pendingId = subscription.pending_provider_subscription_id;
      const isExpected = pendingId
        ? String(pendingId) === String(preapprovalId)
        : subscription.plan === 'plus' && String(subscription.provider_subscription_id) === String(preapprovalId);
      // A brand-new Plus checkout can also beat its own id persistence. Accept
      // only a recent provider preapproval on an unlinked pending Plus row;
      // stale redeliveries are ignored instead of activating a wrong mandate.
      const isNewPlusActivation = !isExpected
        && subscription.plan === 'plus'
        && !subscription.provider_subscription_id
        && !subscription.pending_provider_subscription_id
        && !subscription.plan_change_status
        && isTimelyEarlyPlusClaim(subscription, preapproval);
      if (!isExpected && !isNewPlusActivation) {
        await markSubscriptionEventProcessed(supabase, { productType: 'pro', providerEventId });
        return { skipped: 'unexpected' };
      }
      const completed = await completePlusUpgrade(subscription, preapproval);
      if (!completed.ok) {
        try { await capturePostHog('plus_upgrade_failed', lawyerId, { reason: completed.reason }); } catch {}
        if (completed.reason === 'DB_ERROR' || completed.reason === 'PROVIDER_ERROR') {
          throw new Error(`plus upgrade failed: ${completed.reason}`);
        }
        // Definitive validation failure (amount/period): keep Pro unchanged and
        // clear only the pending transition. Never leave an early-claimed Plus
        // id blocking a future checkout.
        if (subscription.plan_change_status === 'upgrade_pending') {
          const cleared = await clearPendingPlusUpgrade(supabase, subscription.id, now);
          if (!cleared.ok) throw cleared.error ?? new Error('failed to clear rejected Plus upgrade');
        }
        await markSubscriptionEventProcessed(supabase, { productType: 'pro', providerEventId });
        return { skipped: 'upgrade_rejected', reason: completed.reason };
      }
    } else if (['cancelled', 'rejected', 'expired'].includes(mpStatus)) {
      if (subscription.plan_change_status === 'upgrade_pending' && String(subscription.pending_provider_subscription_id || '') === String(preapprovalId)) {
        const cleared = await clearPendingPlusUpgrade(supabase, subscription.id, now);
        if (!cleared.ok) throw cleared.error ?? new Error('failed to clear pending Plus upgrade');
        try { await capturePostHog('plus_upgrade_failed', lawyerId, { reason: `provider_${mpStatus}` }); } catch {}
      } else if (subscription.plan === 'plus' && String(subscription.provider_subscription_id || '') === String(preapprovalId)) {
        const cancellation = await supabase.from('lawyer_subscriptions').update({
          status: 'cancelled',
          cancelled_at: now.toISOString(),
          cancel_at_period_end: true,
          updated_at: now.toISOString(),
        }).eq('id', subscription.id);
        throwOnPersistenceError(cancellation, 'plus cancellation update');
      }
    } else if (mpStatus === 'paused') {
      if (subscription.plan === 'plus') {
        const paused = await supabase.from('lawyer_subscriptions').update({ status: 'past_due', updated_at: now.toISOString() }).eq('id', subscription.id);
        throwOnPersistenceError(paused, 'plus paused update');
      }
    }
    await markSubscriptionEventProcessed(supabase, { productType: 'pro', providerEventId });
    return { ok: true };
  } catch (e) {
    await markSubscriptionEventFailed(supabase, { productType: 'pro', providerEventId });
    throw e;
  }
}

export { shouldProcessEvent, isFreshPendingDuplicate };
