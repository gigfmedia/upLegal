// Recovery for AI authorized payments that arrived before the AI subscription
// row had its provider id persisted. This path is deliberately separate from
// the Pro/Plus inbox: it can only touch ai_subscriptions and never falls back
// to a Pro row.

import { unlinkedPaymentReversalReview } from './subscriptionEvents.mjs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DECLINED_STATUSES = new Set(['rejected', 'refused']);

export function isUuidLike(value) {
  return UUID_RE.test(String(value || ''));
}

function isDeclinedPayment(payment) {
  return DECLINED_STATUSES.has(String(payment?.status || ''));
}

async function findAISubscriptionByProviderId(supabase, preapprovalId) {
  const { data, error } = await supabase
    .from('ai_subscriptions')
    .select('*')
    .eq('provider_subscription_id', String(preapprovalId))
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

async function findAISubscriptionByLawyerId(supabase, lawyerId) {
  if (!isUuidLike(lawyerId)) return null;
  const { data, error } = await supabase
    .from('ai_subscriptions')
    .select('*')
    .eq('lawyer_id', String(lawyerId))
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function processUnresolvedAIPayment({
  supabase,
  payment,
  row = {},
  applyPayment,
  expectedAmountClp = null,
}) {
  if (typeof applyPayment !== 'function') throw new Error('applyPayment is required');
  const preapprovalId = payment?.preapproval_id == null ? '' : String(payment.preapproval_id);
  if (!preapprovalId) return { invalid: true, reason: 'missing_preapproval_id' };

  let subscription = await findAISubscriptionByProviderId(supabase, preapprovalId);

  if (!subscription) {
    // A refund/chargeback is a financial reversal with enough identity to be
    // reviewed even when its preapproval was never linked. Never attach it to
    // an unrelated AI row through the lawyer fallback.
    const reversalReview = unlinkedPaymentReversalReview(payment?.status);
    if (reversalReview) return reversalReview;

    // A declined payment must not be attached to an unrelated trial via the
    // lawyer fallback: it has no activation value and could mutate a live row.
    // It stays pending until the preapproval handler links it; the inbox then
    // terminates it after the bounded reconciliation window.
    if (isDeclinedPayment(payment)) {
      return { transient: true, reason: 'provider_link_not_ready' };
    }
    const candidate = await findAISubscriptionByLawyerId(supabase, row?.lawyer_id);
    if (!candidate) return { transient: true, reason: 'provider_link_not_ready' };
    if (
      candidate.provider_subscription_id
      && String(candidate.provider_subscription_id) !== preapprovalId
    ) {
      return { transient: true, reason: 'provider_identity_conflict' };
    }
    if (String(payment?.status || '') !== 'approved') {
      return { transient: true, reason: 'non_approved_fallback_payment' };
    }
    if (expectedAmountClp != null) {
      const amount = Number(payment?.transaction_amount);
      if (!Number.isFinite(amount) || amount !== Number(expectedAmountClp)) {
        return { review: true, reason: 'ai_fallback_amount_mismatch' };
      }
    }
    subscription = candidate;
  }

  const outcome = await applyPayment(payment, subscription);
  if (outcome?.transient) {
    return { transient: true, reason: outcome.reason || 'event_in_flight' };
  }
  return { ok: true };
}
