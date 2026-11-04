// Topic routing for the MercadoPago subscription webhook.
//
// MP has used both dot and underscore topic names over time. Accept both, keep
// the raw provider resource id (preapproval ids are alphanumeric), and make an
// unsupported/ambiguous topic an explicit ACK instead of silently falling
// through to the booking payment branch.

const PREAPPROVAL_TOPICS = new Set([
  'preapproval',
  'subscription.preapproval',
  'subscription_preapproval',
]);

const AUTHORIZED_PAYMENT_TOPICS = new Set([
  'authorized_payment',
  'subscription.authorized_payment',
  'subscription_authorized_payment',
]);

const CANCELLATION_TOPICS = new Set([
  'subscription.cancelled',
  'subscription_cancelled',
]);

const PAYMENT_TOPICS = new Set(['payment', 'payment.created']);

export function normalizeWebhookTopic(topic) {
  return String(topic ?? '').trim().toLowerCase();
}

export function classifyWebhookTopic(topic) {
  const normalized = normalizeWebhookTopic(topic);
  if (PAYMENT_TOPICS.has(normalized)) return { kind: 'payment', topic: normalized };
  if (PREAPPROVAL_TOPICS.has(normalized)) return { kind: 'preapproval', topic: normalized };
  if (AUTHORIZED_PAYMENT_TOPICS.has(normalized)) return { kind: 'authorized_payment', topic: normalized };
  if (CANCELLATION_TOPICS.has(normalized)) return { kind: 'cancellation', topic: normalized };
  if (normalized === 'subscription') {
    return { kind: 'unsupported', reason: 'ambiguous_subscription_topic', topic: normalized };
  }
  return { kind: 'unsupported', reason: 'unsupported_topic', topic: normalized || null };
}

// Extract the provider object id without digit-only coercion. Handles raw ids,
// `resource` URLs, and query strings.
export function normalizeProviderResourceId(value) {
  if (value == null) return null;
  let raw = String(value).trim().split('?')[0].split('#')[0];
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) {
    try {
      const parts = new URL(raw).pathname.split('/').filter(Boolean);
      raw = parts.pop() || '';
    } catch {
      return null;
    }
  }
  return raw || null;
}

export function normalizePaymentId(value) {
  const raw = normalizeProviderResourceId(value);
  const match = raw?.match(/\d+/);
  return match ? match[0] : null;
}

export async function dispatchSubscriptionWebhook({ topic, resourceId, handlers = {} }) {
  const classified = classifyWebhookTopic(topic);

  if (classified.kind === 'payment') return { handled: false, classified };
  if (classified.kind === 'unsupported') {
    return {
      handled: true,
      classified,
      result: { ignored: true, reason: classified.reason, topic: classified.topic },
    };
  }

  if (!resourceId) {
    return {
      handled: true,
      classified,
      result: { ignored: true, reason: 'missing_resource_id', topic: classified.topic },
    };
  }

  if (classified.kind === 'preapproval' || classified.kind === 'cancellation') {
    return {
      handled: true,
      classified,
      result: await handlers.handlePreapprovalWebhook(resourceId),
    };
  }

  if (classified.kind === 'authorized_payment') {
    return {
      handled: true,
      classified,
      result: await handlers.handleAuthorizedPayment(resourceId),
    };
  }

  return {
    handled: true,
    classified,
    result: { ignored: true, reason: 'unsupported_topic', topic: classified.topic },
  };
}
