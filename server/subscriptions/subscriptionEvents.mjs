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
          .select('status, processed_at')
          .eq('provider', 'mercadopago')
          .eq('provider_event_id', String(providerEventId))
          .eq('product_type', productType)
          .maybeSingle();
        if (existing?.status === 'processed') return { inserted: false, duplicate: true, status: 'processed' };
        if (existing?.status === 'pending' || existing?.status === 'failed') return { inserted: false, duplicate: true, status: existing.status, retryable: true };
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

export async function shouldApplyEvent(supabase, { productType, subscriptionId, providerEventAt }) {
  if (!providerEventAt) return true;
  const { data: latest } = await supabase
    .from('subscription_events')
    .select('provider_event_at')
    .eq('product_type', productType)
    .eq('subscription_id', subscriptionId)
    .eq('status', 'processed')
    .order('provider_event_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!latest?.provider_event_at) return true;
  const latestAt = new Date(latest.provider_event_at).getTime();
  const incomingAt = new Date(providerEventAt).getTime();
  if (isNaN(latestAt) || isNaN(incomingAt)) return true;
  return incomingAt >= latestAt;
}
