// @vitest-environment node
import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { handleWebhook } from './index.mjs';

const SECRET = 'whsec_' + Buffer.from('test-webhook-key').toString('base64');
const NOW = new Date('2026-11-04T12:00:00.000Z');

function sign(body, { id = 'msg_1', timestamp = Math.floor(NOW.getTime() / 1000) } = {}) {
  const key = Buffer.from(SECRET.slice('whsec_'.length), 'base64');
  const signature = crypto.createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest('base64');
  return { 'svix-id': id, 'svix-timestamp': String(timestamp), 'svix-signature': `v1,${signature}` };
}

function createRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

function createRepo({ result = { processed: true, status: 'bounced', applied: true }, failIngest = false } = {}) {
  const calls = { ingested: [] };
  return {
    calls,
    async ingestProviderEvent(args) {
      calls.ingested.push(args);
      if (failIngest) throw new Error('ingest_failed');
      return result;
    },
  };
}

async function deliver({ type, data, repo, id }) {
  const body = JSON.stringify({ type, data, created_at: NOW.toISOString() });
  const req = { body: Buffer.from(body), headers: sign(body, { id }) };
  const res = createRes();
  await handleWebhook(req, res, { repository: repo, env: { RESEND_WEBHOOK_SECRET: SECRET }, logger: { info() {}, warn() {}, error() {} }, clock: () => NOW });
  return res;
}

describe('resend webhook handler', () => {
  it('ingiere el evento y deja que el ledger aplique la supresión', async () => {
    const repo = createRepo();
    const res = await deliver({ type: 'email.bounced', data: { email_id: 're_1', to: ['juan@estudio.cl'] }, repo });
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ ok: true, status: 'bounced', applied: true });
    expect(repo.calls.ingested).toHaveLength(1);
    expect(repo.calls.ingested[0]).toMatchObject({
      providerEventId: 'msg_1',
      eventType: 'email.bounced',
      providerMessageId: 're_1',
      email: 'juan@estudio.cl',
    });
  });

  it('un evento duplicado no vuelve a aplicar cambios', async () => {
    const repo = createRepo({ result: { duplicate: true, processed: true } });
    const res = await deliver({ type: 'email.bounced', data: { email_id: 're_1', to: ['juan@estudio.cl'] }, repo });
    expect(res.body).toMatchObject({ ok: true, duplicate: true, processed: true });
    expect(repo.calls.ingested).toHaveLength(1);
  });

  it('un evento sin asociación única responde 200 para que el worker lo revise', async () => {
    const repo = createRepo({ result: { needs_review: true, reason: 'ambiguous_provider_message_id' } });
    const res = await deliver({ type: 'email.bounced', data: { email_id: 're_1', to: ['juan@estudio.cl'] }, repo });
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ ok: true, needs_review: true, reason: 'ambiguous_provider_message_id' });
  });

  it('responde 500 sin borrar el evento si falla la ingesta', async () => {
    const repo = createRepo({ failIngest: true });
    const res = await deliver({ type: 'email.bounced', data: { email_id: 're_1', to: ['juan@estudio.cl'] }, repo });
    expect(res.statusCode).toBe(500);
    expect(res.body).toMatchObject({ ok: false, error: 'webhook_processing_failed' });
  });

  it('rechaza firmas inválidas', async () => {
    const repo = createRepo();
    const req = { body: Buffer.from('{}'), headers: { 'svix-id': 'x', 'svix-timestamp': String(Math.floor(NOW.getTime() / 1000)), 'svix-signature': 'v1,AAAA' } };
    const res = createRes();
    await handleWebhook(req, res, { repository: repo, env: { RESEND_WEBHOOK_SECRET: SECRET }, logger: { info() {}, warn() {}, error() {} }, clock: () => NOW });
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('invalid_signature');
  });

  it('ignora eventos no relevantes', async () => {
    const repo = createRepo();
    const res = await deliver({ type: 'email.opened', data: { email_id: 're_1', to: ['juan@estudio.cl'] }, repo });
    expect(res.body).toMatchObject({ ok: true, ignored: true });
    expect(repo.calls.ingested).toHaveLength(0);
  });
});
