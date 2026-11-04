// Pure-ish routing/persistence helpers for the Pro/Plus subscription flow.
// server.mjs uses these directly so tests exercise the code that ships, not a
// replica. Supabase is injected to keep the helpers unit-testable.

export function classifyPreapprovalExternalReference(externalRef, prefixes) {
  const ref = externalRef == null ? '' : String(externalRef);
  if (!ref) return 'company';
  if (prefixes?.ai && ref.startsWith(prefixes.ai)) return 'ai';
  if (
    (prefixes?.pro && ref.startsWith(prefixes.pro))
    || (prefixes?.plus && ref.startsWith(prefixes.plus))
  ) {
    return 'pro';
  }
  return 'company';
}

export async function findProSubscriptionByProviderId(supabase, preapprovalId) {
  const id = preapprovalId == null ? '' : String(preapprovalId);
  if (!id) return null;

  for (const column of ['provider_subscription_id', 'pending_provider_subscription_id']) {
    const { data, error } = await supabase
      .from('lawyer_subscriptions')
      .select('*')
      .eq(column, id)
      .maybeSingle();
    if (error) throw error;
    if (data) return data;
  }
  return null;
}

export function hasCurrentPaidPeriod(subscription, now = Date.now()) {
  if (!subscription) return false;
  if (subscription.status !== 'active') return false;
  if (!subscription.provider_subscription_id) return false;
  const periodEndMs = Date.parse(subscription.current_period_end || '');
  return Number.isFinite(periodEndMs) && periodEndMs > now;
}

export function isPendingPlusUpgrade(subscription, preapprovalId) {
  return !!subscription
    && subscription.plan_change_status === 'upgrade_pending'
    && String(subscription.pending_provider_subscription_id || '') === String(preapprovalId);
}

export function canClaimEarlyPlusProvider(subscription, isPlusRef) {
  return !!subscription
    && isPlusRef === true
    && subscription.plan_change_status === 'upgrade_pending'
    && String(subscription.pending_provider_subscription_id || '') === '';
}

// An early Plus webhook may claim the pending id before the checkout response
// persists it. Only accept a recent provider preapproval: a redelivered, old
// authorized Plus preapproval must not be linked to a brand-new upgrade (that
// would activate the wrong mandate and could start a second recurring charge).
// Missing timestamps are allowed so an incomplete provider payload is never
// turned into a silent payment loss.
export const EARLY_PLUS_CLAIM_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export function isTimelyProviderPreapproval(subscription, preapproval, { maxAgeMs = EARLY_PLUS_CLAIM_MAX_AGE_MS } = {}) {
  const providerCreatedMs = Date.parse(preapproval?.date_created || '');
  const subscriptionUpdatedMs = Date.parse(subscription?.updated_at || '');
  if (!Number.isFinite(providerCreatedMs) || !Number.isFinite(subscriptionUpdatedMs)) return true;
  return providerCreatedMs >= subscriptionUpdatedMs - maxAgeMs;
}
// Backwards-compatible name used by the Plus-specific call sites/tests.
export const isTimelyEarlyPlusClaim = isTimelyProviderPreapproval;

export async function claimPendingPlusProvider(supabase, { subscriptionId, preapprovalId, now = new Date() }) {
  const id = preapprovalId == null ? '' : String(preapprovalId);
  if (!id) return { ok: false, invalid: true, code: 'MISSING_PROVIDER_ID' };

  const { data, error } = await supabase
    .from('lawyer_subscriptions')
    .update({
      pending_provider_subscription_id: id,
      updated_at: now.toISOString(),
    })
    .eq('id', subscriptionId)
    .eq('plan_change_status', 'upgrade_pending')
    .is('pending_provider_subscription_id', null)
    .select('*')
    .maybeSingle();
  if (error) return { ok: false, transient: true, error };

  if (data) return { ok: true, claimed: true, subscription: data };

  const { data: current, error: readError } = await supabase
    .from('lawyer_subscriptions')
    .select('*')
    .eq('id', subscriptionId)
    .maybeSingle();
  if (readError) return { ok: false, transient: true, error: readError };
  if (!current) return { ok: false, invalid: true, code: 'SUBSCRIPTION_MISSING' };
  if (String(current.pending_provider_subscription_id || '') === id) {
    return { ok: true, claimed: false, alreadyLinked: true, subscription: current };
  }
  if (String(current.provider_subscription_id || '') === id) {
    return { ok: true, claimed: false, alreadyCompleted: true, subscription: current };
  }
  return { ok: false, invalid: true, code: 'PROVIDER_LINK_CHANGED', subscription: current };
}

export function pendingPlusClearPatch(now = new Date()) {
  return {
    pending_plan: null,
    plan_change_status: null,
    plan_change_effective_at: null,
    pending_provider_subscription_id: null,
    pending_init_point: null,
    previous_provider_subscription_id: null,
    updated_at: now.toISOString(),
  };
}

export async function clearPendingPlusUpgrade(supabase, subscriptionId, now = new Date()) {
  const { error } = await supabase
    .from('lawyer_subscriptions')
    .update(pendingPlusClearPatch(now))
    .eq('id', subscriptionId);
  return { ok: !error, error: error ?? null };
}

export async function persistCheckoutProviderLink(
  supabase,
  { subscriptionId, preapprovalId, initPoint, isUpgrade, now = new Date() },
) {
  const id = preapprovalId == null ? '' : String(preapprovalId);
  if (!id) return { ok: false, reason: 'missing_provider_id' };

  const patch = isUpgrade
    ? {
        pending_provider_subscription_id: id,
        pending_init_point: initPoint || null,
        updated_at: now.toISOString(),
      }
    : {
        provider_subscription_id: id,
        updated_at: now.toISOString(),
      };

  let update = supabase
    .from('lawyer_subscriptions')
    .update(patch)
    .eq('id', subscriptionId);

  // A webhook can finish before the checkout HTTP response reaches this write.
  // Never resurrect a completed upgrade by writing its pending id again.
  update = isUpgrade
    ? update.eq('plan_change_status', 'upgrade_pending').is('pending_provider_subscription_id', null)
    : update.is('provider_subscription_id', null);

  const { data, error } = await update.select('*').maybeSingle();
  if (error) return { ok: false, error };

  if (data) return { ok: true, link: data };

  const { data: current, error: readError } = await supabase
    .from('lawyer_subscriptions')
    .select('*')
    .eq('id', subscriptionId)
    .maybeSingle();
  if (readError) return { ok: false, error: readError };
  if (!current) return { ok: false, reason: 'subscription_missing' };

  const linkedColumn = isUpgrade ? 'pending_provider_subscription_id' : 'provider_subscription_id';
  if (String(current[linkedColumn] || '') === id) {
    // A pending-state webhook may have claimed the id before this response.
    // Store the checkout URL on that same in-flight id without re-opening a
    // completed upgrade or overwriting a different checkout.
    if (isUpgrade && initPoint && current.plan_change_status === 'upgrade_pending' && !current.pending_init_point) {
      const { data: withInitPoint, error: initError } = await supabase
        .from('lawyer_subscriptions')
        .update({ pending_init_point: initPoint, updated_at: now.toISOString() })
        .eq('id', subscriptionId)
        .eq('plan_change_status', 'upgrade_pending')
        .eq('pending_provider_subscription_id', id)
        .select('*')
        .maybeSingle();
      if (initError) return { ok: false, error: initError };
      if (withInitPoint) return { ok: true, alreadyLinked: true, link: withInitPoint };
    }
    return { ok: true, alreadyLinked: true, link: current };
  }
  if (isUpgrade && String(current.provider_subscription_id || '') === id) {
    return { ok: true, alreadyCompleted: true, link: current };
  }
  return { ok: false, reason: 'checkout_state_changed', link: current };
}
