import { unlinkedPaymentReversalReview } from './subscriptionEvents.mjs';

export const UNRESOLVED_PROVIDER_EVENTS_TABLE = 'pro_unresolved_provider_events';
export const UNRESOLVED_PAYMENT_EVENT_KIND = 'authorized_payment';
export const UNRESOLVED_EVENT_LEASE_MS = 5 * 60 * 1000;
// A rejected/refused payment that never gets a provider link must reach a
// terminal, side-effect-free state instead of retrying forever. This never
// changes a Pro subscription: it only closes the staged event.
export const UNRESOLVED_DECLINED_EVENT_MAX_AGE_MS = 24 * 60 * 60 * 1000;
// Approved payments are not disposable: if the provider link never arrives they
// move to explicit review instead of being invalidated or retried forever.
export const UNRESOLVED_REVIEW_AFTER_MS = 24 * 60 * 60 * 1000;

const DECLINED_STATUSES = new Set(['rejected', 'refused']);

export async function stageUnresolvedAuthorizedPayment(
  supabase,
  { preapprovalId, payment, reason = 'provider_link_not_ready', now = new Date() },
) {
  const providerId = preapprovalId == null ? '' : String(preapprovalId);
  const paymentStatus = payment?.status == null ? '' : String(payment.status);
  const providerEventId = payment?.id == null
    ? ''
    : (paymentStatus ? `${payment.id}:${paymentStatus}` : String(payment.id));
  if (!providerId || !providerEventId) {
    return { ok: false, invalid: true, code: 'MISSING_EVENT_IDENTITY' };
  }

  const { error } = await supabase
    .from(UNRESOLVED_PROVIDER_EVENTS_TABLE)
    .insert({
      provider: 'mercadopago',
      provider_event_id: providerEventId,
      event_kind: UNRESOLVED_PAYMENT_EVENT_KIND,
      preapproval_id: providerId,
      provider_status: payment.status == null ? null : String(payment.status),
      payload: payment,
      status: 'pending',
      attempts: 0,
      last_error: reason,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    });
  if (error) {
    if (error.code === '23505') return { ok: true, duplicate: true };
    throw error;
  }
  return { ok: true, duplicate: false };
}

export async function processUnresolvedProPayment({ payment, findSubscription, applyPayment }) {
  if (typeof findSubscription !== 'function') throw new Error('findSubscription is required');
  if (typeof applyPayment !== 'function') throw new Error('applyPayment is required');

  const preapprovalId = payment?.preapproval_id == null ? '' : String(payment.preapproval_id);
  if (!preapprovalId) return { invalid: true, reason: 'missing_preapproval_id' };

  const subscription = await findSubscription(preapprovalId);
  if (!subscription) {
    // Reversals keep their evidence and stop here for review. Other statuses
    // remain retryable until the checkout/link persistence catches up.
    return unlinkedPaymentReversalReview(payment?.status)
      ?? { transient: true, reason: 'provider_link_not_ready' };
  }

  const outcome = await applyPayment(payment);
  if (outcome?.missingSubscription) return { transient: true, reason: 'provider_link_not_ready' };
  if (outcome?.transient) return { transient: true, reason: outcome.reason || 'event_in_flight' };
  return { ok: true };
}

function isDeclinedEvent(row) {
  const status = row?.provider_status ?? row?.payload?.status;
  return DECLINED_STATUSES.has(String(status || ''));
}

function isDeclinedReconciliationExpired(row, now, maxAgeMs) {
  if (!isDeclinedEvent(row)) return false;
  const createdAt = Date.parse(row?.created_at || '');
  if (!Number.isFinite(createdAt)) return false;
  return now.getTime() - createdAt >= maxAgeMs;
}

function isApprovedReconciliationExpired(row, now, maxAgeMs) {
  const status = row?.provider_status ?? row?.payload?.status;
  if (String(status || '') !== 'approved') return false;
  const createdAt = Date.parse(row?.created_at || '');
  if (!Number.isFinite(createdAt)) return false;
  return now.getTime() - createdAt >= maxAgeMs;
}

async function updateUnresolvedEvent(supabase, id, patch) {
  const { error } = await supabase
    .from(UNRESOLVED_PROVIDER_EVENTS_TABLE)
    .update(patch)
    .eq('id', id);
  if (error) throw error;
}

async function resetStaleProcessing(supabase, { now, leaseMs }) {
  const cutoff = new Date(now.getTime() - leaseMs).toISOString();
  const { error } = await supabase
    .from(UNRESOLVED_PROVIDER_EVENTS_TABLE)
    .update({ status: 'pending', updated_at: now.toISOString() })
    .eq('event_kind', UNRESOLVED_PAYMENT_EVENT_KIND)
    .eq('status', 'processing')
    .lt('updated_at', cutoff);
  if (error) throw error;
}

async function claimUnresolvedEvent(supabase, id, now) {
  const { data, error } = await supabase
    .from(UNRESOLVED_PROVIDER_EVENTS_TABLE)
    .update({ status: 'processing', updated_at: now.toISOString() })
    .eq('id', id)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function drainUnresolvedAuthorizedPayments(
  supabase,
  {
    preapprovalId,
    processPayment,
    limit = 20,
    now = new Date(),
    leaseMs = UNRESOLVED_EVENT_LEASE_MS,
    declinedMaxAgeMs = UNRESOLVED_DECLINED_EVENT_MAX_AGE_MS,
    reviewAfterMs = UNRESOLVED_REVIEW_AFTER_MS,
  },
) {
  const providerId = preapprovalId == null ? '' : String(preapprovalId);
  if (!providerId) return { ok: true, processed: 0, pending: 0, invalid: 0, review: 0, skipped: 0 };
  if (typeof processPayment !== 'function') throw new Error('processPayment is required');

  await resetStaleProcessing(supabase, { now, leaseMs });

  const { data, error } = await supabase
    .from(UNRESOLVED_PROVIDER_EVENTS_TABLE)
    .select('*')
    .eq('preapproval_id', providerId)
    .eq('event_kind', UNRESOLVED_PAYMENT_EVENT_KIND)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(Math.max(1, Math.min(Number(limit) || 20, 100)));
  if (error) throw error;

  const summary = { ok: true, processed: 0, pending: 0, invalid: 0, review: 0, skipped: 0 };
  for (const row of data || []) {
    if (!(await claimUnresolvedEvent(supabase, row.id, now))) {
      summary.skipped += 1;
      continue;
    }
    try {
      const providerEventId = row.provider_event_id || row.payload?.id;
      if (!providerEventId) {
        await updateUnresolvedEvent(supabase, row.id, {
          status: 'invalid',
          attempts: Number(row.attempts || 0) + 1,
          last_error: 'missing_provider_event_id',
          updated_at: now.toISOString(),
        });
        summary.invalid += 1;
        continue;
      }
      const result = await processPayment(row.payload);
      if (result?.ok) {
        await updateUnresolvedEvent(supabase, row.id, {
          status: 'processed',
          processed_at: now.toISOString(),
          updated_at: now.toISOString(),
          last_error: null,
        });
        summary.processed += 1;
        continue;
      }
      if (result?.transient) {
        const reason = String(result.reason || 'transient_replay_failure').slice(0, 500);
        const linkNeverArrived = reason === 'provider_link_not_ready' || reason === 'provider_identity_conflict';
        const declinedExpired = linkNeverArrived && isDeclinedReconciliationExpired(row, now, declinedMaxAgeMs);
        const approvedExpired = linkNeverArrived && isApprovedReconciliationExpired(row, now, reviewAfterMs);
        const nextStatus = approvedExpired ? 'needs_review' : (declinedExpired ? 'invalid' : 'pending');
        await updateUnresolvedEvent(supabase, row.id, {
          status: nextStatus,
          attempts: Number(row.attempts || 0) + 1,
          last_error: approvedExpired
            ? `approved_payment_unlinked_review:${reason}`.slice(0, 500)
            : (declinedExpired ? `declined_reconciliation_expired:${reason}`.slice(0, 500) : reason),
          updated_at: now.toISOString(),
        });
        summary[nextStatus === 'needs_review' ? 'review' : (declinedExpired ? 'invalid' : 'pending')] += 1;
        continue;
      }
      if (result?.review) {
        await updateUnresolvedEvent(supabase, row.id, {
          status: 'needs_review',
          attempts: Number(row.attempts || 0) + 1,
          last_error: String(result.reason || 'manual_review_required').slice(0, 500),
          updated_at: now.toISOString(),
        });
        summary.review += 1;
        continue;
      }
      await updateUnresolvedEvent(supabase, row.id, {
        status: 'invalid',
        attempts: Number(row.attempts || 0) + 1,
        last_error: String(result?.reason || 'invalid_replay').slice(0, 500),
        updated_at: now.toISOString(),
      });
      summary.invalid += 1;
    } catch (error) {
      await updateUnresolvedEvent(supabase, row.id, {
        status: 'pending',
        attempts: Number(row.attempts || 0) + 1,
        last_error: String(error?.message || 'replay_failed').slice(0, 500),
        updated_at: now.toISOString(),
      });
      summary.pending += 1;
    }
  }
  return summary;
}

export async function listUnresolvedPreapprovalIds(supabase, { pageSize = 500 } = {}) {
  const size = Math.max(1, Math.min(Number(pageSize) || 500, 1000));
  const ids = new Set();
  let from = 0;
  while (from < 100000) {
    const { data, error } = await supabase
      .from(UNRESOLVED_PROVIDER_EVENTS_TABLE)
      .select('preapproval_id')
      .eq('event_kind', UNRESOLVED_PAYMENT_EVENT_KIND)
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: true })
      .range(from, from + size - 1);
    if (error) throw error;
    const rows = data || [];
    for (const row of rows) {
      const id = String(row.preapproval_id || '');
      if (id) ids.add(id);
    }
    if (rows.length < size) break;
    from += size;
  }
  return [...ids];
}

export async function drainAllUnresolvedAuthorizedPayments(
  supabase,
  {
    processPayment,
    pageSize = 500,
    now = new Date(),
    leaseMs = UNRESOLVED_EVENT_LEASE_MS,
    declinedMaxAgeMs = UNRESOLVED_DECLINED_EVENT_MAX_AGE_MS,
    reviewAfterMs = UNRESOLVED_REVIEW_AFTER_MS,
  } = {},
) {
  if (typeof processPayment !== 'function') throw new Error('processPayment is required');
  const preapprovalIds = await listUnresolvedPreapprovalIds(supabase, { pageSize });
  const summary = { ok: true, preapprovals: preapprovalIds.length, processed: 0, pending: 0, invalid: 0, review: 0, skipped: 0, errors: 0 };
  for (const preapprovalId of preapprovalIds) {
    try {
      const result = await drainUnresolvedAuthorizedPayments(supabase, {
        preapprovalId,
        processPayment,
        now,
        leaseMs,
        declinedMaxAgeMs,
        reviewAfterMs,
      });
      summary.processed += result.processed || 0;
      summary.pending += result.pending || 0;
      summary.invalid += result.invalid || 0;
      summary.review += result.review || 0;
      summary.skipped += result.skipped || 0;
    } catch {
      summary.errors += 1;
    }
  }
  return summary;
}
