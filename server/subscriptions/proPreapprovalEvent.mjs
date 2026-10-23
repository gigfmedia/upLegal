// Pro-family preapproval webhook orchestrators, extracted from server.mjs so the
// retry/recovery path can be unit- and integration-tested against the REAL
// production code (not a replica). server.mjs imports these and injects its
// side-effect handlers (analytics, email, Plus completer) via `deps`.
//
// FASE 4.59 delivery model:
//   - claim: beginSubscriptionEvent() inserts the audit row then calls the
//     atomic `claim_subscription_event` RPC (one UPDATE). Exactly one delivery
//     can move the row to `processing`; concurrent duplicates see `busy` or
//     `terminal`. No read-then-decide window.
//   - apply: only the claim winner mutates subscription state.
//   - commit: `complete_subscription_event` marks the event processed AND
//     enqueues its external effects in the same transaction. A crash after the
//     mutation but before commit leaves `processing`; the lease expires and the
//     mutation is re-applied idempotently.
//   - effects: email/analytics are drained from `subscription_effects`, so a
//     failing side effect never leaves the event half-processed. The outbox is
//     at-least-once; its dedupe key is the RESOURCE TRANSITION, not the
//     notification id.
//
// Identity separation:
//   - notification: provider_event_id (compat) and notification_id (when known)
//     — audit only, never effect dedupe.
//   - resource: resource_id (preapproval/payment id) + resource_status.
//   - transition: `<resource_id>:<status>` used only for effect dedupe.
//     Re-delivery of the same status dedupes; pause -> authorized is a new key.
//
// Ordering is still notification-based (`shouldApplyEvent` scoped by event
// family prefix), so preapproval rows can never move the payment baseline.

import {
  beginSubscriptionEvent,
  completeSubscriptionEvent,
  failSubscriptionEvent,
  derivePeriodFromProvider,
  shouldApplyEvent,
  transitionKey,
} from './subscriptionEvents.mjs';
import {
  drainSubscriptionEffects,
  analyticsEffect,
  emailEffect,
} from './subscriptionEffects.mjs';
import { nonClaimedResult } from './webhookClaim.mjs';

// Legacy pure gate, kept for the retry-contract tests. The live path uses the
// atomic claim and does not call this.
function shouldProcessEvent(ev) {
  if (ev.inserted) return true;
  if (ev.status === 'processed') return false; // terminal
  if (!ev.retryable) return false; // unknown duplicate
  if (ev.status === 'pending' && !ev.stale) return false; // in-flight, do not compete
  return true; // failed, or pending past its lease -> retry
}

async function drain(deps, supabase) {
  if (!deps?.effectHandlers) return;
  try {
    await (deps.drainEffects ?? drainSubscriptionEffects)(supabase, deps.effectHandlers);
  } catch (e) {
    // The event is already committed; a drain failure must not turn it into a
    // provider retry (the retry would be terminal). Effects stay claimable.
    console.error('[SubscriptionEffects] drain failed', e?.message || e);
  }
}

export async function processProPreapprovalEvent({ supabase, subscription, preapproval, deps }) {
  const { priceClp, effectHandlers } = deps;
  const mpStatus = preapproval.status;
  const lawyerId = subscription.lawyer_id;
  const providerEventAt = preapproval.last_modified || preapproval.date_created || new Date().toISOString();
  const providerEventId = `${preapproval.id}:${mpStatus}:${providerEventAt}`;
  const tk = transitionKey(preapproval.id, mpStatus);

  const claim = await beginSubscriptionEvent(supabase, {
    productType: 'pro',
    subscriptionId: subscription.id,
    providerEventId,
    providerEventAt,
    eventType: `preapproval_${mpStatus}`,
    providerStatus: mpStatus,
    resourceId: String(preapproval.id),
    resourceStatus: mpStatus,
    transitionKey: tk,
  });
  if (!claim.claimed) return nonClaimedResult(claim);

  if (!(await shouldApplyEvent(supabase, {
    productType: 'pro',
    subscriptionId: subscription.id,
    providerEventAt,
    eventTypePrefix: 'preapproval',
  }))) {
    await completeSubscriptionEvent(supabase, { productType: 'pro', providerEventId, claimToken: claim.claim_token });
    return { skipped: 'out_of_order' };
  }

  if (subscription.status === 'cancelled' && subscription.cancelled_at) {
    const cancelledAt = new Date(subscription.cancelled_at).getTime();
    const eventAt = new Date(providerEventAt).getTime();
    if (!isNaN(cancelledAt) && !isNaN(eventAt) && eventAt <= cancelledAt) {
      await completeSubscriptionEvent(supabase, { productType: 'pro', providerEventId, claimToken: claim.claim_token });
      return { skipped: 'stale_cancelled' };
    }
  }

  const now = new Date();
  try {
    const effects = [];
    if (mpStatus === 'authorized' || mpStatus === 'active') {
      const derived = derivePeriodFromProvider(preapproval);
      if (!derived) {
        await completeSubscriptionEvent(supabase, { productType: 'pro', providerEventId, claimToken: claim.claim_token });
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
      effects.push(analyticsEffect({
        transitionKey: tk,
        event: 'pro_subscription_activated',
        lawyerId,
        props: { price_clp: priceClp },
      }));
      effects.push(emailEffect({
        transitionKey: tk,
        lawyerId,
        subject: '¡Bienvenido a LegalUp Pro!',
        html: '<p>Tu suscripción Pro está activa.</p>',
      }));
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
    await completeSubscriptionEvent(supabase, { productType: 'pro', providerEventId, claimToken: claim.claim_token, effects });
    await drain({ drainEffects: deps.drainEffects, effectHandlers }, supabase);
    return { ok: true };
  } catch (e) {
    try { await failSubscriptionEvent(supabase, { productType: 'pro', providerEventId, claimToken: claim.claim_token, error: e?.message || e }); } catch {}
    throw e;
  }
}

export async function processPlusPreapprovalEvent({ supabase, subscription, preapproval, deps }) {
  const { completePlusUpgrade, effectHandlers } = deps;
  const mpStatus = preapproval.status;
  const preapprovalId = preapproval.id;
  const lawyerId = subscription.lawyer_id;
  const providerEventAt = preapproval.last_modified || preapproval.date_created || new Date().toISOString();
  const providerEventId = `${preapprovalId}:${mpStatus}:${providerEventAt}`;
  const tk = transitionKey(preapprovalId, mpStatus);

  const claim = await beginSubscriptionEvent(supabase, {
    productType: 'pro',
    subscriptionId: subscription.id,
    providerEventId,
    providerEventAt,
    eventType: `plus_preapproval_${mpStatus}`,
    providerStatus: mpStatus,
    resourceId: String(preapprovalId),
    resourceStatus: mpStatus,
    transitionKey: tk,
  });
  if (!claim.claimed) return nonClaimedResult(claim);

  if (!(await shouldApplyEvent(supabase, {
    productType: 'pro',
    subscriptionId: subscription.id,
    providerEventAt,
    eventTypePrefix: 'plus_preapproval',
  }))) {
    await completeSubscriptionEvent(supabase, { productType: 'pro', providerEventId, claimToken: claim.claim_token });
    return { skipped: 'out_of_order' };
  }

  const now = new Date();
  try {
    const effects = [];
    if (mpStatus === 'authorized' || mpStatus === 'active') {
      const pendingId = subscription.pending_provider_subscription_id;
      const isExpected = pendingId
        ? String(pendingId) === String(preapprovalId)
        : subscription.plan === 'plus' && String(subscription.provider_subscription_id) === String(preapprovalId);
      if (!isExpected && subscription.plan_change_status !== 'upgrade_pending') {
        await completeSubscriptionEvent(supabase, { productType: 'pro', providerEventId, claimToken: claim.claim_token });
        return { skipped: 'unexpected' };
      }
      const completed = await completePlusUpgrade(subscription, preapproval);
      if (!completed.ok) {
        effects.push(analyticsEffect({
          transitionKey: tk,
          event: 'plus_upgrade_failed',
          lawyerId,
          props: { reason: completed.reason },
        }));
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
        effects.push(analyticsEffect({
          transitionKey: tk,
          event: 'plus_upgrade_failed',
          lawyerId,
          props: { reason: `provider_${mpStatus}` },
        }));
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
    await completeSubscriptionEvent(supabase, { productType: 'pro', providerEventId, claimToken: claim.claim_token, effects });
    await drain({ drainEffects: deps.drainEffects, effectHandlers }, supabase);
    return { ok: true };
  } catch (e) {
    try { await failSubscriptionEvent(supabase, { productType: 'pro', providerEventId, claimToken: claim.claim_token, error: e?.message || e }); } catch {}
    throw e;
  }
}

export { shouldProcessEvent };
