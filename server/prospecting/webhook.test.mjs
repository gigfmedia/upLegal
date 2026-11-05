// @vitest-environment node
import crypto from 'node:crypto';
import { describe, it, expect } from 'vitest';
import { mapResendEvent, verifyResendSignature } from './webhook.mjs';

function sign({ secret, id, timestamp, body }) {
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  return crypto.createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest('base64');
}

describe('resend webhook', () => {
  it('verifica firma Svix válida', () => {
    const rawSecret = crypto.randomBytes(24).toString('base64');
    const secret = `whsec_${rawSecret}`;
    const id = 'msg_123';
    const timestamp = '1762261200';
    const body = JSON.stringify({ type: 'email.delivered' });
    const signature = sign({ secret, id, timestamp, body });
    const result = verifyResendSignature({
      rawBody: Buffer.from(body),
      headers: {
        'svix-id': id,
        'svix-timestamp': timestamp,
        'svix-signature': `v1,${signature}`,
      },
      secret,
      now: Number(timestamp) * 1000,
    });
    expect(result).toMatchObject({ ok: true, svixId: id });
  });

  it('rechaza firma inválida, headers faltantes y timestamp antiguo', () => {
    const rawSecret = crypto.randomBytes(24).toString('base64');
    const secret = `whsec_${rawSecret}`;
    const id = 'msg_123';
    const timestamp = '1762261200';
    const body = JSON.stringify({ type: 'email.delivered' });
    expect(verifyResendSignature({
      rawBody: Buffer.from(body),
      headers: { 'svix-id': id, 'svix-timestamp': timestamp, 'svix-signature': 'v1,AAAA' },
      secret,
      now: Number(timestamp) * 1000,
    })).toMatchObject({ ok: false, status: 401 });
    expect(verifyResendSignature({ rawBody: Buffer.from(body), headers: {}, secret, now: Number(timestamp) * 1000 }))
      .toMatchObject({ ok: false, status: 400 });
    const signature = sign({ secret, id, timestamp, body });
    expect(verifyResendSignature({
      rawBody: Buffer.from(body),
      headers: { 'svix-id': id, 'svix-timestamp': timestamp, 'svix-signature': `v1,${signature}` },
      secret,
      now: (Number(timestamp) + 600) * 1000,
    })).toMatchObject({ ok: false, status: 401, reason: 'timestamp_out_of_tolerance' });
  });

  it('rechaza un secreto sin clave utilizable', () => {
    const result = verifyResendSignature({
      rawBody: Buffer.from('{}'),
      headers: { 'svix-id': 'id', 'svix-timestamp': '1762261200', 'svix-signature': 'v1,AAAA' },
      secret: 'whsec_',
      now: 1762261200 * 1000,
    });
    expect(result).toMatchObject({ ok: false, status: 500, reason: 'invalid_webhook_secret' });
  });

  it('mapea eventos de Resend a estados internos', () => {
    expect(mapResendEvent({ type: 'email.sent', data: { email_id: 'e1', to: ['A@B.CL'] } }))
      .toMatchObject({ status: 'sent', providerMessageId: 'e1', email: 'a@b.cl' });
    expect(mapResendEvent({ type: 'email.delivered', data: { email_id: 'e1' } }).status).toBe('delivered');
    expect(mapResendEvent({ type: 'email.bounced', data: { email_id: 'e1' } }).status).toBe('bounced');
    expect(mapResendEvent({ type: 'email.complained', data: { email_id: 'e1' } }).status).toBe('complained');
    expect(mapResendEvent({ type: 'email.opened', data: { email_id: 'e1' } }).status).toBe(null);
  });
});
