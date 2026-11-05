import { MAX_SEND_ATTEMPTS, TRANSIENT_HTTP_STATUSES } from './constants.mjs';

export function isTransientSendError(error) {
  if (!error) return false;
  const status = Number(error.statusCode ?? error.status ?? error.response?.status);
  if (Number.isFinite(status) && status > 0) {
    return TRANSIENT_HTTP_STATUSES.has(status);
  }
  const code = String(error.code || error.name || '').toUpperCase();
  if (['ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN', 'ECONNREFUSED', 'ENETUNREACH', 'UND_ERR_CONNECT_TIMEOUT'].includes(code)) {
    return true;
  }
  const message = String(error.message || '').toLowerCase();
  return /timeout|timed out|network|fetch failed|socket hang up|temporar|rate.?limit|too many requests|service unavailable/.test(message);
}

export function createProspectingMailer({
  resend,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  logger = console,
  maxAttempts = MAX_SEND_ATTEMPTS,
} = {}) {
  async function sendEmail(payload, idempotencyKey) {
    if (!resend) {
      return { ok: false, id: null, attempts: 0, error: 'resend_not_configured', transient: false };
    }
    let lastError = null;
    let attemptsUsed = 0;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      attemptsUsed = attempt;
      try {
        const response = await resend.emails.send(payload, { idempotencyKey });
        if (response?.error) throw response.error;
        const id = response?.data?.id || response?.id || null;
        if (!id) {
          return { ok: false, id: null, attempts: attempt, error: 'provider_returned_no_id', transient: false };
        }
        return { ok: true, id, attempts: attempt, error: null };
      } catch (error) {
        lastError = error;
        const transient = isTransientSendError(error);
        if (!transient || attempt >= maxAttempts) break;
        const delay = [500, 1500, 4000][attempt - 1] || 4000;
        logger.warn?.('[Prospecting] transient Resend failure, retrying', {
          attempt,
          delay_ms: delay,
          error: String(error?.message || error),
        });
        await sleep(delay);
      }
    }
    return {
      ok: false,
      id: null,
      attempts: attemptsUsed,
      error: String(lastError?.message || lastError || 'send_failed').slice(0, 1000),
      transient: isTransientSendError(lastError),
    };
  }

  async function sendProspectEmail({ from, to, replyTo, subject, html, text, headers, idempotencyKey }) {
    const payload = {
      from,
      to: [to],
      reply_to: replyTo,
      subject,
      html,
      text,
      headers: headers || undefined,
    };
    return sendEmail(payload, idempotencyKey);
  }

  return { sendEmail, sendProspectEmail };
}
