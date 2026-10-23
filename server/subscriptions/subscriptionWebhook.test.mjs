// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import {
  classifyWebhookTopic,
  dispatchSubscriptionWebhook,
  normalizePaymentId,
  normalizeProviderResourceId,
} from './subscriptionWebhook.mjs';

describe('subscription topic routing', () => {
  it('accepts dot and underscore MP topic names', () => {
    expect(classifyWebhookTopic('subscription_preapproval').kind).toBe('preapproval');
    expect(classifyWebhookTopic('subscription.preapproval').kind).toBe('preapproval');
    expect(classifyWebhookTopic('subscription_authorized_payment').kind).toBe('authorized_payment');
    expect(classifyWebhookTopic('subscription.authorized_payment').kind).toBe('authorized_payment');
    expect(classifyWebhookTopic('subscription_cancelled').kind).toBe('cancellation');
    expect(classifyWebhookTopic('subscription.cancelled').kind).toBe('cancellation');
  });

  it('keeps alphanumeric preapproval ids and extracts numeric payment ids', () => {
    const preapprovalId = '2c938084726fca480172750000000000';
    expect(normalizeProviderResourceId(preapprovalId)).toBe(preapprovalId);
    expect(normalizeProviderResourceId(`https://api.mercadopago.com/preapproval/${preapprovalId}?x=1`)).toBe(preapprovalId);
    expect(normalizePaymentId(preapprovalId)).not.toBe(preapprovalId);
    expect(normalizePaymentId('https://api.mercadopago.com/v1/payments/123456')).toBe('123456');
  });

  it('dispatches preapproval and cancellation to the authoritative preapproval handler', async () => {
    const handlePreapprovalWebhook = vi.fn(async (id) => ({ ok: true, id }));
    const handleAuthorizedPayment = vi.fn();

    const preapproval = await dispatchSubscriptionWebhook({
      topic: 'subscription_preapproval',
      resourceId: '2c938084726fca480172750000000000',
      handlers: { handlePreapprovalWebhook, handleAuthorizedPayment },
    });
    expect(preapproval).toMatchObject({ handled: true, result: { ok: true } });
    expect(handlePreapprovalWebhook).toHaveBeenLastCalledWith('2c938084726fca480172750000000000');

    const cancelled = await dispatchSubscriptionWebhook({
      topic: 'subscription_cancelled',
      resourceId: '2c938084726fca480172750000000000',
      handlers: { handlePreapprovalWebhook, handleAuthorizedPayment },
    });
    expect(cancelled.handled).toBe(true);
    expect(handlePreapprovalWebhook).toHaveBeenLastCalledWith('2c938084726fca480172750000000000');
    expect(handleAuthorizedPayment).not.toHaveBeenCalled();
  });

  it('dispatches authorized payments separately', async () => {
    const handleAuthorizedPayment = vi.fn(async (id) => ({ ok: true, id }));
    const result = await dispatchSubscriptionWebhook({
      topic: 'subscription_authorized_payment',
      resourceId: '987654',
      handlers: { handlePreapprovalWebhook: vi.fn(), handleAuthorizedPayment },
    });
    expect(result).toMatchObject({ handled: true, result: { ok: true } });
    expect(handleAuthorizedPayment).toHaveBeenCalledWith('987654');
  });

  it('acks ambiguous/unsupported topics explicitly instead of falling through', async () => {
    const result = await dispatchSubscriptionWebhook({
      topic: 'subscription',
      resourceId: 'abc',
      handlers: {},
    });
    expect(result).toMatchObject({
      handled: true,
      result: { ignored: true, reason: 'ambiguous_subscription_topic', topic: 'subscription' },
    });

    const unknown = await dispatchSubscriptionWebhook({
      topic: 'some_new_topic',
      resourceId: 'abc',
      handlers: {},
    });
    expect(unknown).toMatchObject({
      handled: true,
      result: { ignored: true, reason: 'unsupported_topic', topic: 'some_new_topic' },
    });
  });

  it('does not dispatch a known subscription topic without a resource id', async () => {
    const result = await dispatchSubscriptionWebhook({
      topic: 'subscription_preapproval',
      resourceId: null,
      handlers: { handlePreapprovalWebhook: vi.fn() },
    });
    expect(result).toMatchObject({
      handled: true,
      result: { ignored: true, reason: 'missing_resource_id' },
    });
  });

  it('leaves booking payments for the legacy payment branch', async () => {
    const result = await dispatchSubscriptionWebhook({
      topic: 'payment',
      resourceId: '123',
      handlers: {},
    });
    expect(result).toEqual({ handled: false, classified: expect.objectContaining({ kind: 'payment' }) });
  });
});
