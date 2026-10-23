// Pro-family authorized-payment orchestrator.
//
// The provider event identity includes the payment status. Without that, a
// pending notification claims the row and a later approved notification is
// rejected as a duplicate, leaving the subscription inactive. The ledger keeps
// one row per authorized payment (provider_authorized_payment_id = payment.id),
// while the audit/effect identity is payment.id + status.

import {
  beginSubscriptionEvent,
  completeSubscriptionEvent,
  failSubscriptionEvent,
  shouldApplyEvent,
} from './subscriptionEvents.mjs';
import { nonClaimedResult } from './webhookClaim.mjs';
import { analyticsEffect, drainSubscriptionEffects } from './subscriptionEffects.mjs';
import {
  PRO_INTRO_PRICE_CLP,
  PRO_INTRO_SUCCESSFUL_PAYMENTS,
  shouldAttemptFounderClaim,
} from '../proFounder.mjs';

export const PRO_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

const LEGACY_FINAL_STATUSES = new Set(['approved', 'rejected', 'refused']);

export function paymentEventIdentity(payment) {
  const paymentId = String(payment?.id ?? '').trim();
  const status = String(payment?.status ?? '').trim().toLowerCase() || 'unknown';
  // Backward compatibility: statuses the old handler processed keep the
  // unsuffixed payment id, so historical processed rows still dedupe a
  // redelivery. New statuses (pending/refund/chargeback/unknown) get their own
  // identity and can no longer be blocked by the old approved row.
  const providerEventId = LEGACY_FINAL_STATUSES.has(status)
    ? paymentId
    : `${paymentId}:${status}`;
  return {
    paymentId,
    status,
    providerEventId,
    eventType: `payment_${status}`,
    transitionKey: `payment:${paymentId}:${status}`,
    resourceId: paymentId,
    resourceStatus: status,
    providerEventAt: payment?.date_last_updated || payment?.date_created || payment?.date_approved || new Date().toISOString(),
  };
}

export function paymentStatusKind(status) {
  const normalized = String(status ?? '').trim().toLowerCase();
  if (normalized === 'approved') return 'approved';
  if (normalized === 'rejected' || normalized === 'refused') return 'rejected';
  if (normalized === 'refunded' || normalized === 'charged_back' || normalized === 'cancelled') return 'revoked';
  if (normalized === 'pending' || normalized === 'in_process' || normalized === 'authorized') return 'non_final';
  return 'unsupported';
}

export async function processProAuthorizedPaymentEvent({
  supabase,
  payment,
  subscription,
  preapprovalId,
  deps = {},
}) {
  const {
    completePlusUpgrade,
    ensureProStandardPrice,
    effectHandlers,
  } = deps;

  const identity = paymentEventIdentity(payment);
  if (!identity.paymentId) return { skipped: 'missing_payment_id' };
  if (!subscription?.id) return { skipped: 'subscription_not_found' };

  const isPlusEffective = subscription.plan === 'plus'
    || (subscription.plan_change_status === 'upgrade_pending'
      && String(subscription.pending_provider_subscription_id || '') === String(preapprovalId));

  const drainPaymentEffects = async () => {
    try {
      await drainSubscriptionEffects(supabase, effectHandlers);
    } catch (e) {
      console.error('[SubscriptionEffects] drain failed', e?.message || e);
    }
  };

  const claim = await beginSubscriptionEvent(supabase, {
    productType: 'pro',
    subscriptionId: subscription.id,
    providerEventId: identity.providerEventId,
    providerEventAt: identity.providerEventAt,
    eventType: identity.eventType,
    providerStatus: identity.status,
    resourceId: identity.resourceId,
    resourceStatus: identity.resourceStatus,
    transitionKey: identity.transitionKey,
  });
  if (!claim.claimed) return nonClaimedResult(claim);

  if (!(await shouldApplyEvent(supabase, {
    productType: 'pro',
    subscriptionId: subscription.id,
    providerEventAt: identity.providerEventAt,
    eventTypePrefix: 'payment',
  }))) {
    await completeSubscriptionEvent(supabase, {
      productType: 'pro',
      providerEventId: identity.providerEventId,
      claimToken: claim.claim_token,
    });
    return { skipped: 'out_of_order' };
  }

  if (subscription.status === 'cancelled' && subscription.cancelled_at) {
    const cancelledAt = new Date(subscription.cancelled_at).getTime();
    const eventAt = new Date(identity.providerEventAt).getTime();
    if (!isNaN(cancelledAt) && !isNaN(eventAt) && eventAt <= cancelledAt) {
      await completeSubscriptionEvent(supabase, {
        productType: 'pro',
        providerEventId: identity.providerEventId,
        claimToken: claim.claim_token,
      });
      return { skipped: 'stale_cancelled' };
    }
  }

  // Ledger dedup stays keyed by the payment id, not by status: a pending and a
  // later approved notification are the same authorized payment for billing.
  try {
    const { error: ledgerErr } = await supabase.from('pro_subscription_payments').insert({
      lawyer_subscription_id: subscription.id,
      lawyer_id: subscription.lawyer_id,
      provider_authorized_payment_id: identity.paymentId,
      provider_payment_id: String(payment.payment_id || payment.id || ''),
      amount_clp: Number(payment.transaction_amount || 0) || 0,
      currency: 'CLP',
      status: identity.status,
      paid_at: identity.providerEventAt,
      plan: isPlusEffective ? 'plus' : 'pro',
    });
    if (ledgerErr) {
      if (String(ledgerErr.code) === '23505') {
        const { error: ledgerUpdateErr } = await supabase.from('pro_subscription_payments').update({
          provider_payment_id: String(payment.payment_id || payment.id || ''),
          amount_clp: Number(payment.transaction_amount || 0) || 0,
          status: identity.status,
          paid_at: identity.providerEventAt,
        }).eq('provider_authorized_payment_id', identity.paymentId);
        if (ledgerUpdateErr) throw new Error(`ledger_update_failed:${ledgerUpdateErr.code || 'unknown'}`);
      } else {
        // A transient/unknown ledger failure must not be silent: fail the event
        // (retryable) so the provider redelivery re-runs the whole payment path.
        throw new Error(`ledger_insert_failed:${ledgerErr.code || 'unknown'}`);
      }
    }
  } catch (e) {
    try {
      await failSubscriptionEvent(supabase, {
        productType: 'pro',
        providerEventId: identity.providerEventId,
        claimToken: claim.claim_token,
        error: e?.message || e,
      });
    } catch {}
    throw e;
  }

  const statusKind = paymentStatusKind(identity.status);

  if (statusKind === 'approved') {
    // A Plus upgrade is confirmed by the first approved payment even before the
    // preapproval webhook arrives (same fail-closed completer).
    if (subscription.plan_change_status === 'upgrade_pending'
      && String(subscription.pending_provider_subscription_id || '') === String(preapprovalId)) {
      let completed;
      try {
        completed = await completePlusUpgrade(subscription, {
          id: String(preapprovalId),
          transaction_amount: Number(payment.transaction_amount || 0) || 0,
          date_created: identity.providerEventAt,
        });
      } catch (e) {
        try {
          await failSubscriptionEvent(supabase, {
            productType: 'pro',
            providerEventId: identity.providerEventId,
            claimToken: claim.claim_token,
            error: e?.message || e,
          });
        } catch {}
        throw e;
      }
      const effects = completed.ok ? [] : [analyticsEffect({
        transitionKey: identity.transitionKey,
        event: 'plus_upgrade_failed',
        lawyerId: subscription.lawyer_id,
        props: { reason: completed.reason },
      })];
      await completeSubscriptionEvent(supabase, {
        productType: 'pro',
        providerEventId: identity.providerEventId,
        claimToken: claim.claim_token,
        effects,
      });
      await drainPaymentEffects();
      return { ok: true, plus: true };
    }

    // Lifetime intro count (approved PRO-plan payments only) per lawyer.
    try {
      const { count: lifetimeApproved } = await supabase
        .from('pro_subscription_payments')
        .select('id', { count: 'exact', head: true })
        .eq('lawyer_id', subscription.lawyer_id)
        .eq('status', 'approved')
        .or('plan.is.null,plan.eq.pro');
      if ((lifetimeApproved ?? 0) >= PRO_INTRO_SUCCESSFUL_PAYMENTS && !isPlusEffective) {
        await ensureProStandardPrice({ ...subscription, amount_clp: subscription.amount_clp });
      }
    } catch {}

    // Founder: first 15 DISTINCT paying lawyers. Non-blocking; reconcile
    // repairs. Plus payments never claim a slot.
    try {
      if (!isPlusEffective && shouldAttemptFounderClaim(identity.status)) {
        await supabase.rpc('claim_pro_founder_slot', { p_lawyer_id: subscription.lawyer_id });
        try {
          await supabase.from('pro_founder_reservations').delete().eq('lawyer_id', subscription.lawyer_id);
        } catch {}
      }
    } catch (e) {
      console.error('[LegalUpPro] founder claim failed (reconciliable via reconcile_pro_founders)', e?.message || e);
    }

    const now = new Date();
    const paymentDate = new Date(identity.providerEventAt);
    const periodStart = !isNaN(paymentDate.getTime()) ? paymentDate : now;
    const periodEnd = new Date(periodStart.getTime() + PRO_MONTH_MS);
    try {
      const { error: updateError } = await supabase
        .from('lawyer_subscriptions')
        .update({
          status: 'active',
          current_period_start: periodStart.toISOString(),
          current_period_end: periodEnd.toISOString(),
          cancel_at_period_end: false,
          cancelled_at: null,
          updated_at: now.toISOString(),
        })
        .eq('id', subscription.id);
      if (updateError) throw updateError;
      await completeSubscriptionEvent(supabase, {
        productType: 'pro',
        providerEventId: identity.providerEventId,
        claimToken: claim.claim_token,
        effects: [analyticsEffect({
          transitionKey: identity.transitionKey,
          event: 'pro_subscription_activated',
          lawyerId: subscription.lawyer_id,
          props: { price_clp: subscription.amount_clp ?? PRO_INTRO_PRICE_CLP },
        })],
      });
    } catch (e) {
      try {
        await failSubscriptionEvent(supabase, {
          productType: 'pro',
          providerEventId: identity.providerEventId,
          claimToken: claim.claim_token,
          error: e?.message || e,
        });
      } catch {}
      throw e;
    }
    await drainPaymentEffects();
    return { ok: true };
  }

  if (statusKind === 'rejected') {
    const { error: updateError } = await supabase
      .from('lawyer_subscriptions')
      .update({ status: 'past_due', updated_at: new Date().toISOString() })
      .eq('id', subscription.id);
    if (updateError) {
      try {
        await failSubscriptionEvent(supabase, {
          productType: 'pro',
          providerEventId: identity.providerEventId,
          claimToken: claim.claim_token,
          error: updateError.message || 'update_failed',
        });
      } catch {}
      throw updateError;
    }
    await completeSubscriptionEvent(supabase, {
      productType: 'pro',
      providerEventId: identity.providerEventId,
      claimToken: claim.claim_token,
      effects: [analyticsEffect({
        transitionKey: identity.transitionKey,
        event: 'pro_subscription_payment_failed',
        lawyerId: subscription.lawyer_id,
        props: { payment_id: identity.paymentId, status: identity.status },
      })],
    });
    await drainPaymentEffects();
    return { ok: true };
  }

  if (statusKind === 'revoked') {
    const now = new Date();
    const { error: updateError } = await supabase
      .from('lawyer_subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: now.toISOString(),
        current_period_end: now.toISOString(),
        cancel_at_period_end: false,
        updated_at: now.toISOString(),
      })
      .eq('id', subscription.id);
    if (updateError) {
      try {
        await failSubscriptionEvent(supabase, {
          productType: 'pro',
          providerEventId: identity.providerEventId,
          claimToken: claim.claim_token,
          error: updateError.message || 'revoke_failed',
        });
      } catch {}
      throw updateError;
    }
    await completeSubscriptionEvent(supabase, {
      productType: 'pro',
      providerEventId: identity.providerEventId,
      claimToken: claim.claim_token,
      effects: [analyticsEffect({
        transitionKey: identity.transitionKey,
        event: 'pro_subscription_payment_revoked',
        lawyerId: subscription.lawyer_id,
        props: { payment_id: identity.paymentId, status: identity.status },
      })],
    });
    await drainPaymentEffects();
    return { ok: true, revoked: true };
  }

  // Pending/in_process/authorized are valid notifications but are not a final
  // outcome. Ack them without mutating access; a later approved event has its
  // own identity and can still activate the subscription.
  if (statusKind === 'non_final') {
    await completeSubscriptionEvent(supabase, {
      productType: 'pro',
      providerEventId: identity.providerEventId,
      claimToken: claim.claim_token,
    });
    return { skipped: 'non_final_status', status: identity.status };
  }

  // Unknown statuses are recorded and acked explicitly so a later valid
  // transition is not blocked by a permanent processing lease.
  console.warn('[LegalUpPro] Unhandled authorized payment status:', identity.status, {
    payment_id: identity.paymentId,
  });
  await completeSubscriptionEvent(supabase, {
    productType: 'pro',
    providerEventId: identity.providerEventId,
    claimToken: claim.claim_token,
  });
  return { skipped: 'unhandled_status', status: identity.status };
}
