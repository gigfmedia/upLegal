import { isPaymentReversalStatus } from './subscriptionEvents.mjs';

export const PAYMENT_REVERSAL_REVIEW_TABLE = 'unresolved_payment_reversal_events';

export const PAYMENT_REVERSAL_REVIEW_REASONS = Object.freeze({
  PREAPPROVAL_NOT_FOUND: 'preapproval_not_found',
  MISSING_PREAPPROVAL_ID: 'missing_preapproval_id',
  UNCLASSIFIED_PRODUCT: 'unclassified_product',
});

export async function stagePaymentReversalReview(
  supabase,
  {
    payment,
    preapprovalId = null,
    externalReference = null,
    reason,
    now = new Date(),
  },
) {
  const paymentId = payment?.id == null ? '' : String(payment.id);
  const providerStatus = String(payment?.status || '').toLowerCase();
  if (!paymentId || !isPaymentReversalStatus(providerStatus)) {
    return { ok: false, invalid: true, code: 'NOT_A_REVERSAL' };
  }
  if (!reason) throw new Error('reason is required');

  const providerEventId = `${paymentId}:${providerStatus}`;
  const normalizedPreapprovalId = preapprovalId == null || String(preapprovalId) === ''
    ? null
    : String(preapprovalId);
  const normalizedExternalReference = externalReference == null || String(externalReference) === ''
    ? null
    : String(externalReference);

  const { error } = await supabase
    .from(PAYMENT_REVERSAL_REVIEW_TABLE)
    .insert({
      provider: 'mercadopago',
      provider_event_id: providerEventId,
      provider_payment_id: paymentId,
      preapproval_id: normalizedPreapprovalId,
      external_reference: normalizedExternalReference,
      provider_status: providerStatus,
      review_reason: String(reason).slice(0, 200),
      payload: payment,
      status: 'needs_review',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    });

  if (error) {
    if (error.code === '23505') return { ok: true, duplicate: true };
    throw error;
  }
  return { ok: true, duplicate: false };
}
