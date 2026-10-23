// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { claimDisposition, nonClaimedResult } from './webhookClaim.mjs';
import {
  WEBHOOK_ACK_STATUS,
  WEBHOOK_BUSY_STATUS,
  sendWebhookResponse,
  webhookResponseStatus,
} from './webhookResponse.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverSrc = readFileSync(resolve(__dirname, '../../server.mjs'), 'utf8');
const preapprovalSrc = readFileSync(resolve(__dirname, './proPreapprovalEvent.mjs'), 'utf8');
const proPaymentSrc = readFileSync(resolve(__dirname, 'proPaymentEvent.mjs'), 'utf8');

function fakeRes() {
  const calls = { status: null, json: null, send: null };
  const res = {
    status(code) { calls.status = code; return res; },
    json(body) { calls.json = body; return res; },
    send(body) { calls.send = body; return res; },
  };
  return { res, calls };
}

describe('claimDisposition', () => {
  it('processes a claimed event', () => {
    expect(claimDisposition({ claimed: true })).toEqual({ action: 'process' });
  });

  it('marks a live lease as retryable', () => {
    expect(claimDisposition({ claimed: false, reason: 'busy' })).toEqual({ action: 'retry', reason: 'busy' });
  });

  it('marks a scheduled backoff as retryable without claiming it', () => {
    expect(claimDisposition({ claimed: false, reason: 'backoff' })).toEqual({ action: 'retry', reason: 'backoff' });
  });

  it('acks terminal duplicates without effects', () => {
    expect(claimDisposition({ claimed: false, reason: 'terminal' })).toEqual({ action: 'ack', reason: 'terminal' });
  });

  it('treats a missing event as an internal error, not a retry or silent ack', () => {
    expect(claimDisposition({ claimed: false, reason: 'not_found' })).toEqual({ action: 'internal_error', reason: 'not_found' });
  });

  it('acks unknown non-claimed results', () => {
    expect(claimDisposition({ claimed: false, reason: 'other' })).toEqual({ action: 'ack', reason: 'other' });
    expect(claimDisposition(null)).toEqual({ action: 'ack', reason: 'no_claim' });
  });
});

describe('nonClaimedResult', () => {
  it('returns a retryable busy result without side effects', () => {
    expect(nonClaimedResult({ claimed: false, reason: 'busy' })).toEqual({ skipped: 'busy', retry: true });
    expect(nonClaimedResult({ claimed: false, reason: 'backoff' })).toEqual({ skipped: 'backoff', retry: true });
  });

  it('acks terminal duplicates and throws on a missing event', () => {
    expect(nonClaimedResult({ claimed: false, reason: 'terminal' })).toEqual({ skipped: 'terminal' });
    expect(() => nonClaimedResult({ claimed: false, reason: 'not_found' })).toThrow('subscription_event_not_found');
  });
});

describe('webhook response contract', () => {
  it('returns 503 only for a retryable busy claim', () => {
    expect(webhookResponseStatus({ skipped: 'busy', retry: true })).toBe(WEBHOOK_BUSY_STATUS);
    expect(webhookResponseStatus({ skipped: 'terminal' })).toBe(WEBHOOK_ACK_STATUS);
    expect(webhookResponseStatus({ ok: true })).toBe(WEBHOOK_ACK_STATUS);
    expect(webhookResponseStatus(undefined)).toBe(WEBHOOK_ACK_STATUS);
  });

  it('sends a retryable JSON 503 for busy and 200 for terminal/normal results', () => {
    const busy = fakeRes();
    sendWebhookResponse(busy.res, { skipped: 'busy', retry: true });
    expect(busy.calls).toEqual({ status: 503, json: { error: 'processing_in_progress', retry: true }, send: null });

    const terminal = fakeRes();
    sendWebhookResponse(terminal.res, { skipped: 'terminal' });
    expect(terminal.calls).toEqual({ status: 200, json: null, send: 'OK' });

    const normal = fakeRes();
    sendWebhookResponse(normal.res, { ok: true });
    expect(normal.calls).toEqual({ status: 200, json: null, send: 'OK' });
  });
});

describe('source invariants for the A1 fix', () => {
  it('the Pro payment handler no longer silently acks a non-claimed event', () => {
    expect(proPaymentSrc).not.toMatch(/if \(!claim\.claimed\) return;/);
    expect(proPaymentSrc).toMatch(/if \(!claim\.claimed\) return nonClaimedResult\(claim\);/);
  });

  it('both Pro-family preapproval orchestrators classify busy/terminal/not_found', () => {
    expect(preapprovalSrc.match(/nonClaimedResult\(claim\)/g)).toHaveLength(2);
  });

  it('all subscription webhook routes use the shared response helper', () => {
    expect(serverSrc).toMatch(/sendWebhookResponse\(res, subscriptionDispatch\.result\)/);
    expect(serverSrc).toMatch(/dispatchSubscriptionWebhook\(/);
  });
});
