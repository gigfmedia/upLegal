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

function createRepo({ send = null, duplicate = false, failApply = false } = {}) {
  const calls = { applied: [], suppressed: [], deleted: [] };
  return {
    calls,
    async recordProviderEvent() { return { event: duplicate ? null : { id: 'event-1' }, duplicate }; },
    async deleteProviderEvent(id) { calls.deleted.push(id); },
    async findSendByProviderMessageId() { return send; },
    async applyProviderEvent(args) {
      if (failApply) throw new Error('apply_failed');
      calls.applied.push(args);
    },
    async addSuppression(args) { calls.suppressed.push(args); },
  };
}

async function deliver({ type, data, repo, id }) {
  const body = JSON.stringify({ type, data, created_at: NOW.toISOString() });
  const req = { body: Buffer.from(body), headers: sign(body, { id }) };
  const res = createRes();
  await handleWebhook(req, res, { repository: repo, env: { RESEND_WEBHOOK_SECRET: SECRET }, logger: { info() {}, error() {} }, clock: () => NOW });
  return res;
}

describe('resend webhook handler', () => {
  it('un rebote con envío asociado actualiza estado y crea supresión', async () => {
    const repo = createRepo({ send: { id: 'send-1', prospect_id: 'p-1', to_email: 'juan@estudio.cl' } });
    const res = await deliver({ type: 'email.bounced', data: { email_id: 're_1', to: ['juan@estudio.cl'] }, repo });
    expect(res.statusCode).toBe(200);
    expect(repo.calls.applied).toHaveLength(1);
    expect(repo.calls.applied[0]).toMatchObject({ status: 'bounced', email: 'juan@estudio.cl' });
    expect(repo.calls.suppressed).toHaveLength(1);
    expect(repo.calls.suppressed[0]).toMatchObject({ email: 'juan@estudio.cl', reason: 'bounce' });
  });

  it('un evento duplicado no vuelve a aplicar cambios', async () => {
    const repo = createRepo({ duplicate: true });
    const res = await deliver({ type: 'email.bounced', data: { email_id: 're_1', to: ['juan@estudio.cl'] }, repo });
    expect(res.body).toMatchObject({ ok: true, duplicate: true });
    expect(repo.calls.applied).toHaveLength(0);
    expect(repo.calls.suppressed).toHaveLength(0);
  });

  it('libera el evento si falla el procesamiento para permitir el reintento', async () => {
    const repo = createRepo({ send: { id: 'send-1', prospect_id: 'p-1', to_email: 'juan@estudio.cl' }, failApply: true });
    await expect(deliver({ type: 'email.bounced', data: { email_id: 're_1', to: ['juan@estudio.cl'] }, repo }))
      .rejects.toThrow('apply_failed');
    expect(repo.calls.deleted).toEqual(['msg_1']);
  });

  it('rechaza firmas inválidas', async () => {
    const repo = createRepo();
    const req = { body: Buffer.from('{}'), headers: { 'svix-id': 'x', 'svix-timestamp': String(Math.floor(NOW.getTime() / 1000)), 'svix-signature': 'v1,AAAA' } };
    const res = createRes();
    await handleWebhook(req, res, { repository: repo, env: { RESEND_WEBHOOK_SECRET: SECRET }, logger: { info() {}, error() {} }, clock: () => NOW });
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('invalid_signature');
  });

  it('ignora eventos no relevantes', async () => {
    const repo = createRepo();
    const res = await deliver({ type: 'email.opened', data: { email_id: 're_1', to: ['juan@estudio.cl'] }, repo });
    expect(res.body).toMatchObject({ ok: true, ignored: true });
  });
});
