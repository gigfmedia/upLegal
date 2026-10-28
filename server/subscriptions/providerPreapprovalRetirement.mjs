import { cancelMpPreapproval, reconcileMpPreapprovalStatus } from './cancelSubscription.mjs';
import { hasCurrentPaidPeriod } from './proSubscriptionRouting.mjs';

export function previousProviderIds(subscription) {
  return [...new Set(
    [subscription?.provider_subscription_id, subscription?.previous_provider_subscription_id]
      .filter((value) => value != null && String(value) !== '')
      .map(String),
  )];
}

export function needsProviderRetirement(subscription, now = Date.now()) {
  if (!subscription) return false;
  if (hasCurrentPaidPeriod(subscription, now)) return false;
  return previousProviderIds(subscription).length > 0;
}

function unresolved(code, detail = {}) {
  return { ok: false, code, transient: true, ...detail };
}

export async function retireProviderPreapproval({
  preapprovalId,
  accessToken,
  cancel = cancelMpPreapproval,
  reconcile = reconcileMpPreapprovalStatus,
}) {
  const id = preapprovalId == null ? '' : String(preapprovalId);
  if (!id) return { ok: false, code: 'MISSING_PROVIDER_ID', transient: false };
  if (!accessToken) return { ok: false, code: 'MISSING_PROVIDER_TOKEN', transient: false };

  let cancelResult;
  try {
    cancelResult = await cancel({ preapprovalId: id, accessToken });
  } catch (error) {
    return unresolved('PROVIDER_UNREACHABLE', { error });
  }

  if (cancelResult?.ok && cancelResult?.body?.status === 'cancelled') {
    return { ok: true, state: 'cancelled', providerId: id };
  }

  let reconciled;
  try {
    reconciled = await reconcile({ preapprovalId: id, accessToken });
  } catch (error) {
    reconciled = { cancelled: false, networkError: true, error };
  }

  if (reconciled?.cancelled) return { ok: true, state: 'cancelled', providerId: id };
  if (reconciled?.status === 404) return { ok: true, state: 'not_found', providerId: id };
  if (reconciled?.networkError) return unresolved('PROVIDER_UNREACHABLE', { providerId: id });

  if (cancelResult?.ok) {
    return unresolved('CANCELLATION_UNCONFIRMED', {
      providerId: id,
      providerStatus: reconciled?.status ?? cancelResult?.status ?? null,
    });
  }
  if (cancelResult?.networkError) return unresolved('PROVIDER_UNREACHABLE', { providerId: id });
  if (!cancelResult?.status) return unresolved('PROVIDER_UNREACHABLE', { providerId: id });
  if (cancelResult.status === 429 || cancelResult.status >= 500) {
    return unresolved('PROVIDER_UNAVAILABLE', { providerId: id, providerStatus: cancelResult.status });
  }
  if (cancelResult.status === 401 || cancelResult.status === 403) {
    return { ok: false, code: 'PROVIDER_AUTH', transient: false, providerId: id, providerStatus: cancelResult.status };
  }
  return {
    ok: false,
    code: 'CANCELLATION_REJECTED',
    transient: false,
    providerId: id,
    providerStatus: cancelResult.status,
  };
}

async function clearRetiredProviderLinks(supabase, subscription, now) {
  const id = subscription?.id;
  if (!id) return { ok: false, code: 'SUBSCRIPTION_MISSING', transient: false };

  const pairs = [
    ['provider_subscription_id', subscription.provider_subscription_id],
    ['previous_provider_subscription_id', subscription.previous_provider_subscription_id],
  ];
  for (const [column, expectedValue] of pairs) {
    if (expectedValue == null || String(expectedValue) === '') continue;
    const expected = String(expectedValue);
    const { data, error } = await supabase
      .from('lawyer_subscriptions')
      .update({ [column]: null, updated_at: now.toISOString() })
      .eq('id', id)
      .eq(column, expected)
      .select('id')
      .maybeSingle();
    if (error) return { ok: false, code: 'DB_ERROR', transient: true, error };

    if (data) continue;
    const { data: current, error: readError } = await supabase
      .from('lawyer_subscriptions')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (readError) return { ok: false, code: 'DB_ERROR', transient: true, error: readError };
    if (!current) return { ok: false, code: 'SUBSCRIPTION_MISSING', transient: false };
    if (current[column] != null && String(current[column]) !== expected) {
      return { ok: false, code: 'PROVIDER_LINK_CHANGED', transient: false };
    }
  }
  return { ok: true };
}

export async function prepareExpiredSubscriptionForCheckout({
  supabase,
  subscription,
  accessToken,
  cancel = cancelMpPreapproval,
  reconcile = reconcileMpPreapprovalStatus,
  now = new Date(),
}) {
  if (!needsProviderRetirement(subscription, now.getTime())) {
    return { ok: true, retired: false, subscription };
  }

  const ids = previousProviderIds(subscription);
  for (const providerId of ids) {
    const result = await retireProviderPreapproval({
      preapprovalId: providerId,
      accessToken,
      cancel,
      reconcile,
    });
    if (!result.ok) return result;
  }

  const cleared = await clearRetiredProviderLinks(supabase, subscription, now);
  if (!cleared.ok) return cleared;

  return {
    ok: true,
    retired: true,
    retiredIds: ids,
    subscription: {
      ...subscription,
      provider_subscription_id: null,
      previous_provider_subscription_id: null,
    },
  };
}
