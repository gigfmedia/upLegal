export const AI_UNRESOLVED_PROVIDER_EVENTS_TABLE = 'ai_unresolved_provider_events';
export const AI_UNRESOLVED_PAYMENT_EVENT_KIND = 'authorized_payment';
export const AI_UNRESOLVED_EVENT_LEASE_MS = 5 * 60 * 1000;
// A declined payment must not retry forever when its preapproval is never
// linked. After this window the event reaches a terminal, side-effect-free
// state; a later duplicate is acknowledged but never replayed.
export const AI_UNRESOLVED_DECLINED_MAX_AGE_MS = 24 * 60 * 60 * 1000;
// An approved payment that never finds its subscription is not disposable: after
// this window it moves to an explicit review state, preserving payload/evidence
// instead of retrying forever or being marked invalid.
export const AI_UNRESOLVED_REVIEW_AFTER_MS = 24 * 60 * 60 * 1000;

const DECLINED_STATUSES = new Set(['rejected', 'refused']);

export async function stageAIAuthorizedPayment(
  supabase,
  { preapprovalId, lawyerId = null, payment, reason = 'provider_link_not_ready', now = new Date() },
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
    .from(AI_UNRESOLVED_PROVIDER_EVENTS_TABLE)
    .insert({
      provider: 'mercadopago',
      provider_event_id: providerEventId,
      event_kind: AI_UNRESOLVED_PAYMENT_EVENT_KIND,
      preapproval_id: providerId,
      lawyer_id: lawyerId == null || String(lawyerId) === '' ? null : String(lawyerId),
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

async function updateUnresolvedEvent(supabase, id, patch) {
  const { error } = await supabase
    .from(AI_UNRESOLVED_PROVIDER_EVENTS_TABLE)
    .update(patch)
    .eq('id', id);
  if (error) throw error;
}

async function resetStaleProcessing(supabase, { now, leaseMs }) {
  const cutoff = new Date(now.getTime() - leaseMs).toISOString();
  const { error } = await supabase
    .from(AI_UNRESOLVED_PROVIDER_EVENTS_TABLE)
    .update({ status: 'pending', updated_at: now.toISOString() })
    .eq('event_kind', AI_UNRESOLVED_PAYMENT_EVENT_KIND)
    .eq('status', 'processing')
    .lt('updated_at', cutoff);
  if (error) throw error;
}

async function claimUnresolvedEvent(supabase, id, now) {
  const { data, error } = await supabase
    .from(AI_UNRESOLVED_PROVIDER_EVENTS_TABLE)
    .update({ status: 'processing', updated_at: now.toISOString() })
    .eq('id', id)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();
  if (error) throw error;
  return !!data;
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

export async function drainUnresolvedAIAuthorizedPayments(
  supabase,
  {
    preapprovalId,
    processPayment,
    limit = 20,
    now = new Date(),
    leaseMs = AI_UNRESOLVED_EVENT_LEASE_MS,
    declinedMaxAgeMs = AI_UNRESOLVED_DECLINED_MAX_AGE_MS,
    reviewAfterMs = AI_UNRESOLVED_REVIEW_AFTER_MS,
  },
) {
  const providerId = preapprovalId == null ? '' : String(preapprovalId);
  if (!providerId) return { ok: true, processed: 0, pending: 0, invalid: 0, review: 0, skipped: 0 };
  if (typeof processPayment !== 'function') throw new Error('processPayment is required');

  await resetStaleProcessing(supabase, { now, leaseMs });

  const { data, error } = await supabase
    .from(AI_UNRESOLVED_PROVIDER_EVENTS_TABLE)
    .select('*')
    .eq('preapproval_id', providerId)
    .eq('event_kind', AI_UNRESOLVED_PAYMENT_EVENT_KIND)
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
      const result = await processPayment(row.payload, row);
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

export async function listUnresolvedAIPreapprovalIds(supabase, { pageSize = 500 } = {}) {
  const size = Math.max(1, Math.min(Number(pageSize) || 500, 1000));
  const ids = new Set();
  let from = 0;
  while (from < 100000) {
    const { data, error } = await supabase
      .from(AI_UNRESOLVED_PROVIDER_EVENTS_TABLE)
      .select('preapproval_id')
      .eq('event_kind', AI_UNRESOLVED_PAYMENT_EVENT_KIND)
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

export async function drainAllUnresolvedAIAuthorizedPayments(
  supabase,
  {
    processPayment,
    pageSize = 500,
    now = new Date(),
    leaseMs = AI_UNRESOLVED_EVENT_LEASE_MS,
    declinedMaxAgeMs = AI_UNRESOLVED_DECLINED_MAX_AGE_MS,
    reviewAfterMs = AI_UNRESOLVED_REVIEW_AFTER_MS,
  } = {},
) {
  if (typeof processPayment !== 'function') throw new Error('processPayment is required');
  const preapprovalIds = await listUnresolvedAIPreapprovalIds(supabase, { pageSize });
  const summary = { ok: true, preapprovals: preapprovalIds.length, processed: 0, pending: 0, invalid: 0, review: 0, skipped: 0, errors: 0 };
  for (const preapprovalId of preapprovalIds) {
    try {
      const result = await drainUnresolvedAIAuthorizedPayments(supabase, {
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
