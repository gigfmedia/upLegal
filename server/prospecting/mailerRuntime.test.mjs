// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { createProspectingMailer } from './mailerRuntime.mjs';

const PAYLOAD = {
  from: 'LegalUp <juan@legalup.cl>',
  to: ['juan@estudio.cl'],
  replyTo: 'juan@legalup.cl',
  subject: 'Contacto LegalUp',
  html: '<p>Hola</p>',
  text: 'Hola',
  headers: { 'List-Unsubscribe': '<https://legalup.cl/unsubscribe/token>' },
  idempotencyKey: 'legalup-prospect-1',
};

function harness(handler) {
  const send = vi.fn(handler);
  const mailer = createProspectingMailer({ resend: { emails: { send } } });
  return { mailer, send };
}

async function sendProspect(mailer) {
  return mailer.sendProspectEmail(PAYLOAD);
}

function httpError(status, message = `http_${status}`) {
  return Object.assign(new Error(message), { statusCode: status });
}

describe('createProspectingMailer', () => {
  it('hace exactamente una llamada al proveedor y devuelve el id en éxito', async () => {
    const { mailer, send } = harness(async () => ({ data: { id: 'resend-1' } }));
    const result = await sendProspect(mailer);
    expect(send).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ ok: true, id: 'resend-1', attempts: 1 });
  });

  it('429 explícito hace una llamada y se clasifica como rechazo definitivo', async () => {
    const { mailer, send } = harness(async () => { throw httpError(429, 'rate limit'); });
    const result = await sendProspect(mailer);
    expect(send).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      ok: false,
      attempts: 1,
      transient: true,
      ambiguous: false,
      definitiveRejection: true,
    });
  });

  it('425 explícito hace una llamada y se clasifica como rechazo definitivo', async () => {
    const { mailer, send } = harness(async () => { throw httpError(425, 'too early'); });
    const result = await sendProspect(mailer);
    expect(send).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      ok: false,
      attempts: 1,
      transient: true,
      ambiguous: false,
      definitiveRejection: true,
    });
  });

  it('408 hace una llamada y queda ambiguo sin retry', async () => {
    const { mailer, send } = harness(async () => { throw httpError(408, 'request timeout'); });
    const result = await sendProspect(mailer);
    expect(send).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      ok: false,
      attempts: 1,
      ambiguous: true,
      definitiveRejection: false,
    });
  });

  it.each([500, 501, 502, 503, 504, 599])('%i hace una llamada y queda ambiguo sin retry', async (status) => {
    const { mailer, send } = harness(async () => { throw httpError(status); });
    const result = await sendProspect(mailer);
    expect(send).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      ok: false,
      attempts: 1,
      ambiguous: true,
      definitiveRejection: false,
    });
  });

  it('timeout hace una llamada y queda ambiguo sin retry', async () => {
    const { mailer, send } = harness(async () => {
      throw Object.assign(new Error('request timed out'), { code: 'ETIMEDOUT' });
    });
    const result = await sendProspect(mailer);
    expect(send).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      ok: false,
      attempts: 1,
      ambiguous: true,
      definitiveRejection: false,
    });
  });

  it('reset de conexión hace una llamada y queda ambiguo sin retry', async () => {
    const { mailer, send } = harness(async () => {
      throw Object.assign(new Error('socket hang up'), { code: 'ECONNRESET' });
    });
    const result = await sendProspect(mailer);
    expect(send).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      ok: false,
      attempts: 1,
      ambiguous: true,
      definitiveRejection: false,
    });
  });

  it('fallo de red previo al proveedor hace una llamada y no consume intento', async () => {
    const { mailer, send } = harness(async () => {
      throw Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' });
    });
    const result = await sendProspect(mailer);
    expect(send).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      ok: false,
      attempts: 1,
      transient: true,
      ambiguous: false,
      definitiveRejection: false,
    });
  });

  it('una respuesta sin id hace una llamada y queda ambigua sin retry', async () => {
    const { mailer, send } = harness(async () => ({ data: {} }));
    const result = await sendProspect(mailer);
    expect(send).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      ok: false,
      attempts: 1,
      error: 'provider_returned_no_id',
      ambiguous: true,
    });
  });

  it('no llama al proveedor si Resend no está configurado', async () => {
    const { mailer, send } = harness(async () => ({ data: { id: 'unused' } }));
    const unconfigured = createProspectingMailer({ resend: null });
    const result = await unconfigured.sendProspectEmail(PAYLOAD);
    expect(send).not.toHaveBeenCalled();
    expect(result).toMatchObject({ ok: false, attempts: 0, error: 'resend_not_configured' });
  });

  it('regresión: un 429 no se reintenta aunque el segundo intento simulado fuera exitoso', async () => {
    let calls = 0;
    const { mailer, send } = harness(async () => {
      calls += 1;
      if (calls === 1) throw httpError(429, 'rate limit');
      return { data: { id: 'resend-second-attempt' } };
    });
    const result = await sendProspect(mailer);
    expect(send).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ ok: false, attempts: 1, definitiveRejection: true });
  });
});
