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
// LEASE vs MUTUAL EXCLUSION: a duplicate of a `pending` event is treated as
// in-flight (skipped) until it is older than RETRY_LEASE_MS, then retryable.
// This is NOT a hard mutual exclusion — two concurrent deliveries can both read
// the same lease-expired row and both proceed (see risk notes). The schema
// (status CHECK has no 'processing' state) cannot express a claim without a
// migration, so the lease is a heuristic, not a lock.

import {
  tryInsertSubscriptionEvent,
  derivePeriodFromProvider,
  shouldApplyEvent,
  markSubscriptionEventProcessed,
  markSubscriptionEventFailed,
} from './subscriptionEvents.mjs';

// Gate shared by both orchestrators. Returns true when the (possibly duplicate)
// event should be processed now, false when it must be skipped.
// `ev` is the shape returned by tryInsertSubscriptionEvent.
function shouldProcessEvent(ev) {
  if (ev.inserted) return true;
  if (ev.status === 'processed') return false; // terminal
  if (!ev.retryable) return false; // unknown duplicate
  if (ev.status === 'pending' && !ev.stale) return false; // in-flight, do not compete
  return true; // failed, or pending past its lease -> retry
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
  if (!shouldProcessEvent(ev)) return { skipped: ev.status };

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
      const derived = derivePeriodFromProvider(preapproval);
      if (!derived) {
        await markSubscriptionEventProcessed(supabase, { productType: 'pro', providerEventId });
        return { skipped: 'no_period' };
      }
      await supabase.from('lawyer_subscriptions').update({
        status: 'active',
        current_period_start: derived.start.toISOString(),
        current_period_end: derived.end.toISOString(),
        cancel_at_period_end: false,
        cancelled_at: null,
        updated_at: now.toISOString(),
      }).eq('id', subscription.id);
      await capturePostHog('pro_subscription_activated', lawyerId, { price_clp: priceClp });
      const userData = await getProLawyerEmail(lawyerId);
      if (userData?.email) {
        try { await sendAIEmail(userData.email, '¡Bienvenido a LegalUp Pro!', '<p>Tu suscripción Pro está activa.</p>'); } catch {}
      }
    } else if (mpStatus === 'cancelled') {
      await supabase.from('lawyer_subscriptions').update({
        status: 'cancelled',
        cancelled_at: now.toISOString(),
        cancel_at_period_end: true,
        updated_at: now.toISOString(),
      }).eq('id', subscription.id);
      if (subscription.plan !== 'plus') {
        try { await supabase.from('pro_founder_reservations').delete().eq('lawyer_id', lawyerId); } catch {}
      }
    } else if (mpStatus === 'paused') {
      await supabase.from('lawyer_subscriptions').update({ status: 'past_due', updated_at: now.toISOString() }).eq('id', subscription.id);
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
  if (!shouldProcessEvent(ev)) return { skipped: ev.status };

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
      if (!isExpected && subscription.plan_change_status !== 'upgrade_pending') {
        await markSubscriptionEventProcessed(supabase, { productType: 'pro', providerEventId });
        return { skipped: 'unexpected' };
      }
      const completed = await completePlusUpgrade(subscription, preapproval);
      if (!completed.ok) {
        try { await capturePostHog('plus_upgrade_failed', lawyerId, { reason: completed.reason }); } catch {}
      }
    } else if (['cancelled', 'rejected', 'expired'].includes(mpStatus)) {
      if (subscription.plan_change_status === 'upgrade_pending' && String(subscription.pending_provider_subscription_id || '') === String(preapprovalId)) {
        await supabase.from('lawyer_subscriptions').update({
          pending_plan: null,
          plan_change_status: null,
          plan_change_effective_at: null,
          pending_provider_subscription_id: null,
          pending_init_point: null,
          previous_provider_subscription_id: null,
          updated_at: now.toISOString(),
        }).eq('id', subscription.id);
        try { await capturePostHog('plus_upgrade_failed', lawyerId, { reason: `provider_${mpStatus}` }); } catch {}
      } else if (subscription.plan === 'plus' && String(subscription.provider_subscription_id || '') === String(preapprovalId)) {
        await supabase.from('lawyer_subscriptions').update({
          status: 'cancelled',
          cancelled_at: now.toISOString(),
          cancel_at_period_end: true,
          updated_at: now.toISOString(),
        }).eq('id', subscription.id);
      }
    } else if (mpStatus === 'paused') {
      if (subscription.plan === 'plus') {
        await supabase.from('lawyer_subscriptions').update({ status: 'past_due', updated_at: now.toISOString() }).eq('id', subscription.id);
      }
    }
    await markSubscriptionEventProcessed(supabase, { productType: 'pro', providerEventId });
    return { ok: true };
  } catch (e) {
    await markSubscriptionEventFailed(supabase, { productType: 'pro', providerEventId });
    throw e;
  }
}

export { shouldProcessEvent };
