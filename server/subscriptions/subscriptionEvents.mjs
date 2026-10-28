// A duplicate of a `pending` event is only treated as retryable once it is
// older than this. Fresh pending rows are assumed in-flight and the caller must
// return a 5xx (not acknowledge) so a crashed original is recovered by the
// provider retry after the lease. This is a heuristic, NOT a mutual-exclusion
// lock: two concurrent deliveries can both read the same lease-expired row and
// both proceed. See risk notes in proPreapprovalEvent.mjs.
export const RETRY_LEASE_MS = 10 * 60 * 1000;

// Financial reversals must always reach manual review, even when their provider
// timestamp is older than a later payment. They never revoke access or mutate
// the financial ledger from the webhook path.
const PAYMENT_REVERSAL_STATUSES = new Set(['cancelled', 'refunded', 'charged_back']);

export function isPaymentReversalStatus(status) {
  return PAYMENT_REVERSAL_STATUSES.has(String(status || '').toLowerCase());
}

export function paymentReversalReviewReason(status) {
  return `payment_${String(status || 'unknown').toLowerCase()}_requires_policy_review`;
}

export function unlinkedPaymentReversalReview(status) {
  if (!isPaymentReversalStatus(status)) return null;
  return {
    review: true,
    reason: `payment_${String(status).toLowerCase()}_unlinked_reversal_review`,
  };
}

function eventLeaseStart(existing) {
  return existing?.claimed_at || existing?.created_at || null;
}

function isLeaseStale(existing, nowMs = Date.now()) {
  const startedMs = eventLeaseStart(existing) ? Date.parse(eventLeaseStart(existing)) : NaN;
  return !Number.isNaN(startedMs) && (nowMs - startedMs) >= RETRY_LEASE_MS;
}

async function claimExistingEvent(supabase, { productType, providerEventId, id, status, nowIso, expectedClaimedAt }) {
  if (!id) return false;
  let query = supabase
    .from('subscription_events')
    .update({ status: 'processing', claimed_at: nowIso })
    .eq('id', id)
    .eq('status', status);
  // A stale `processing` row keeps the same status after the claim, so the
  // old lease timestamp is part of the compare-and-swap predicate. Only one
  // concurrent delivery can replace it.
  if (status === 'processing' && expectedClaimedAt) {
    query = query.eq('claimed_at', expectedClaimedAt);
  }
  const { data, error } = await query.select('id').maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function tryInsertSubscriptionEvent(supabase, { productType, subscriptionId, providerEventId, providerEventAt, eventType, providerStatus }) {
  const nowIso = new Date().toISOString();
  try {
    const { error } = await supabase.from('subscription_events').insert({
      product_type: productType,
      subscription_id: subscriptionId,
      provider: 'mercadopago',
      provider_event_id: String(providerEventId),
      provider_event_at: providerEventAt ? new Date(providerEventAt).toISOString() : nowIso,
      event_type: eventType,
      provider_status: providerStatus,
      status: 'pending',
      claimed_at: nowIso,
    });
    if (error) {
      if (error.code === '23505') {
        const { data: existing } = await supabase
          .from('subscription_events')
          .select('id, status, processed_at, created_at, claimed_at')
          .eq('provider', 'mercadopago')
          .eq('provider_event_id', String(providerEventId))
          .eq('product_type', productType)
          .maybeSingle();
        if (existing?.status === 'processed') return { inserted: false, duplicate: true, status: 'processed' };
        if (existing?.status === 'needs_review') {
          return { inserted: false, duplicate: true, status: 'needs_review' };
        }
        if (existing?.status === 'failed') {
          const claimed = await claimExistingEvent(supabase, {
            productType, providerEventId, id: existing.id, status: 'failed', nowIso,
          });
          return {
            inserted: false, duplicate: true, status: 'failed', retryable: true,
            stale: true, claimed,
          };
        }
        if (existing?.status === 'pending' || existing?.status === 'processing') {
          const stale = isLeaseStale(existing);
          if (!stale) {
            return { inserted: false, duplicate: true, status: existing.status, retryable: true, stale: false, claimed: false };
          }
          const claimed = await claimExistingEvent(supabase, {
            productType, providerEventId, id: existing.id, status: existing.status, nowIso,
            expectedClaimedAt: existing.claimed_at,
          });
          return {
            inserted: false, duplicate: true, status: existing.status, retryable: true,
            stale: true, claimed,
          };
        }
        return { inserted: false, duplicate: true, status: existing?.status || 'unknown' };
      }
      throw error;
    }
    return { inserted: true, status: 'pending', claimed: true };
  } catch (e) {
    if (e?.code === '23505') return { inserted: false, duplicate: true, status: 'unknown' };
    throw e;
  }
}

export async function markSubscriptionEventProcessed(supabase, { productType, providerEventId }) {
  const { error } = await supabase.from('subscription_events').update({ status: 'processed', processed_at: new Date().toISOString() }).eq('provider', 'mercadopago').eq('provider_event_id', String(providerEventId)).eq('product_type', productType);
  if (error) throw error;
}

export async function markSubscriptionEventFailed(supabase, { productType, providerEventId }) {
  const { error } = await supabase.from('subscription_events').update({ status: 'failed' }).eq('provider', 'mercadopago').eq('provider_event_id', String(providerEventId)).eq('product_type', productType);
  if (error) throw error;
}

export async function markSubscriptionEventForReview(supabase, { productType, providerEventId, reason }) {
  const { error } = await supabase.from('subscription_events').update({
    status: 'needs_review',
    review_reason: String(reason || 'manual_review_required').slice(0, 500),
    processed_at: new Date().toISOString(),
  }).eq('provider', 'mercadopago').eq('provider_event_id', String(providerEventId)).eq('product_type', productType);
  if (error) throw error;
}

export function derivePeriodFromProvider(preapproval) {
  // Prefer next_payment_date as period end, start is last payment or now
  const nextPayment = preapproval.next_payment_date || preapproval.auto_recurring?.next_payment_date;
  const start = preapproval.auto_recurring?.start_date || preapproval.date_created;
  if (nextPayment) {
    const end = new Date(nextPayment);
    const startDate = start ? new Date(start) : new Date(end.getTime() - 30*24*60*60*1000);
    if (!isNaN(end.getTime()) && !isNaN(startDate.getTime())) {
      return { start: startDate, end };
    }
  }
  // Fallback to payment date + 30d if available (for payment webhooks)
  if (preapproval.date_created) {
    const start = new Date(preapproval.date_created);
    const end = new Date(start.getTime() + 30*24*60*60*1000);
    if (!isNaN(start.getTime())) return { start, end };
  }
  return null;
}

// Escape SQL LIKE metacharacters so a literal prefix (which contains '_' in the
// real event_type values, e.g. `preapproval_authorized`, `plus_preapproval_*`)
// is matched literally and the '_' is NOT treated as a single-char wildcard.
// Postgres LIKE uses backslash as the default escape, and PostgREST does not add
// an ESCAPE clause, so `\_` is a literal underscore.
export function escapeLikePattern(value) {
  return String(value).replace(/[\\%_]/g, (c) => `\\${c}`);
}

export async function shouldApplyEvent(supabase, { productType, subscriptionId, providerEventAt, eventTypePrefix }) {
  if (!providerEventAt) return true;
  let query = supabase
    .from('subscription_events')
    .select('provider_event_at')
    .eq('product_type', productType)
    .eq('subscription_id', subscriptionId)
    .eq('status', 'processed');
  // Scope the ordering baseline to one event family. Without this, marking
  // preapproval events processed would let them move the payment baseline and
  // drop legitimate payments (and vice-versa). Omitted (AI path) => unchanged.
  if (eventTypePrefix) query = query.like('event_type', `${escapeLikePattern(eventTypePrefix)}%`);
  const { data: latest } = await query
    .order('provider_event_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!latest?.provider_event_at) return true;
  const latestAt = new Date(latest.provider_event_at).getTime();
  const incomingAt = new Date(providerEventAt).getTime();
  if (isNaN(latestAt) || isNaN(incomingAt)) return true;
  return incomingAt >= latestAt;
}

// Identity guard for provider webhooks that are resolved indirectly (e.g. a Pro
// preapproval is looked up by external_reference → lawyer_id, not by the
// preapproval id). Returns true when `providerId` matches either the canonical
// or the in-flight provider subscription on the row. When nothing is linked yet
// it returns true, so a first authorization racing the id persistence is never
// blocked. Empty/missing providerId is always rejected.
export function matchesActiveProvider(subscription, providerId) {
  const candidate = providerId == null ? '' : String(providerId);
  if (!candidate) return false;
  const active = [subscription?.provider_subscription_id, subscription?.pending_provider_subscription_id]
    .filter((v) => v != null && String(v) !== '')
    .map(String);
  if (active.length === 0) return true;
  return active.includes(candidate);
}
