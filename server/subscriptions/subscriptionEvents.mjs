// Legacy retry lease, kept for the AI path and the old helper contract. The
// Pro-family path no longer uses this heuristic: it claims atomically through
// `claim_subscription_event` (status goes pending -> processing) and this value
// is now only the default claim lease duration.
export const RETRY_LEASE_MS = 10 * 60 * 1000;

// Lease for the real, atomic claim. Kept equal to RETRY_LEASE_MS so recovery
// behaviour of in-flight events is unchanged.
export const CLAIM_LEASE_SECONDS = Math.ceil(RETRY_LEASE_MS / 1000);

function toIso(value) {
  return value ? new Date(value).toISOString() : new Date().toISOString();
}

/**
 * Insert the audit row (idempotent) and atomically claim it.
 *
 * The claim is one UPDATE ... WHERE in Postgres (claim_subscription_event):
 * exactly one concurrent caller can flip the row to `processing`; the others
 * get `busy` or `terminal`. No read-then-decide window.
 *
 * The claim returns a fencing token. complete/fail MUST present it, so a worker
 * whose lease expired can never overwrite the outcome of the worker that
 * reclaimed the event.
 *
 * `providerEventId` remains the notification identity (backward compatible).
 * `notificationId`, `resourceId`, `resourceStatus` and `transitionKey` are
 * additive audit/effect identity and never change event dedup.
 */
export async function beginSubscriptionEvent(supabase, {
  productType,
  subscriptionId,
  providerEventId,
  providerEventAt,
  eventType,
  providerStatus,
  notificationId = null,
  resourceId = null,
  resourceStatus = null,
  transitionKey = null,
  leaseSeconds = CLAIM_LEASE_SECONDS,
}) {
  let claimEventId = String(providerEventId);
  const { error } = await supabase.from('subscription_events').insert({
    product_type: productType,
    subscription_id: subscriptionId,
    provider: 'mercadopago',
    provider_event_id: claimEventId,
    provider_event_at: toIso(providerEventAt),
    event_type: eventType,
    provider_status: providerStatus,
    status: 'pending',
    notification_id: notificationId,
    resource_id: resourceId,
    resource_status: resourceStatus,
    transition_key: transitionKey,
  });

  if (error) {
    if (error.code !== '23505') throw error;
    // A known delivery id may arrive with a different synthesized event id.
    // Reuse the audited row instead of claiming a non-existent one.
    if (notificationId) {
      const { data: existing } = await supabase
        .from('subscription_events')
        .select('provider_event_id')
        .eq('provider', 'mercadopago')
        .eq('product_type', productType)
        .eq('notification_id', notificationId)
        .maybeSingle();
      if (existing?.provider_event_id) claimEventId = String(existing.provider_event_id);
    }
  }

  const { data, error: claimError } = await supabase.rpc('claim_subscription_event', {
    p_provider: 'mercadopago',
    p_event_id: claimEventId,
    p_product_type: productType,
    p_lease_seconds: leaseSeconds,
  });
  if (claimError) throw claimError;
  const row = Array.isArray(data) ? data[0] : data;
  return row ?? { claimed: false, reason: 'not_found', event_id: null, claim_token: null, attempts: 0 };
}

export async function completeSubscriptionEvent(supabase, { productType, providerEventId, claimToken, effects = [] }) {
  if (!claimToken) throw new Error('claim_token_required');
  const { data, error } = await supabase.rpc('complete_subscription_event', {
    p_provider: 'mercadopago',
    p_event_id: String(providerEventId),
    p_product_type: productType,
    p_claim_token: claimToken,
    p_effects: effects,
  });
  if (error) throw error;
  return data ?? 0;
}

export async function failSubscriptionEvent(supabase, { productType, providerEventId, claimToken, error }) {
  if (!claimToken) throw new Error('claim_token_required');
  const { data, error: rpcError } = await supabase.rpc('fail_subscription_event', {
    p_provider: 'mercadopago',
    p_event_id: String(providerEventId),
    p_product_type: productType,
    p_claim_token: claimToken,
    p_error: String(error ?? 'unknown'),
  });
  if (rpcError) throw rpcError;
  return data === true;
}

/**
 * Deterministic effect identity. Notification redeliveries of the SAME
 * transition share a key (enqueue once); a different status gets a new key.
 * Transitions are resource-scoped on purpose: a pause -> authorized cycle is a
 * new transition, while re-delivering `authorized` is not.
 */
export function transitionKey(resourceId, resourceStatus) {
  return `${resourceId}:${resourceStatus}`;
}

export async function tryInsertSubscriptionEvent(supabase, { productType, subscriptionId, providerEventId, providerEventAt, eventType, providerStatus }) {
  try {
    const { error } = await supabase.from('subscription_events').insert({
      product_type: productType,
      subscription_id: subscriptionId,
      provider: 'mercadopago',
      provider_event_id: String(providerEventId),
      provider_event_at: providerEventAt ? new Date(providerEventAt).toISOString() : new Date().toISOString(),
      event_type: eventType,
      provider_status: providerStatus,
      status: 'pending',
    });
    if (error) {
      if (error.code === '23505') {
        const { data: existing } = await supabase
          .from('subscription_events')
          .select('status, processed_at, created_at')
          .eq('provider', 'mercadopago')
          .eq('provider_event_id', String(providerEventId))
          .eq('product_type', productType)
          .maybeSingle();
        if (existing?.status === 'processed') return { inserted: false, duplicate: true, status: 'processed' };
        if (existing?.status === 'pending' || existing?.status === 'failed') {
          const createdMs = existing.created_at ? Date.parse(existing.created_at) : NaN;
          const stale = !Number.isNaN(createdMs) && (Date.now() - createdMs) >= RETRY_LEASE_MS;
          return { inserted: false, duplicate: true, status: existing.status, retryable: true, stale };
        }
        return { inserted: false, duplicate: true, status: existing?.status || 'unknown' };
      }
      throw error;
    }
    return { inserted: true, status: 'pending' };
  } catch (e) {
    if (e?.code === '23505') return { inserted: false, duplicate: true, status: 'unknown' };
    throw e;
  }
}

export async function markSubscriptionEventProcessed(supabase, { productType, providerEventId }) {
  await supabase.from('subscription_events').update({ status: 'processed', processed_at: new Date().toISOString() }).eq('provider', 'mercadopago').eq('provider_event_id', String(providerEventId)).eq('product_type', productType);
}

export async function markSubscriptionEventFailed(supabase, { productType, providerEventId }) {
  await supabase.from('subscription_events').update({ status: 'failed' }).eq('provider', 'mercadopago').eq('provider_event_id', String(providerEventId)).eq('product_type', productType);
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
