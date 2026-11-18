import { isAmbiguousSendError, isExplicitProviderRejection, isTransientSendError } from './mailer.mjs';

function failure(error) {
  const ambiguous = isAmbiguousSendError(error);
  const transient = isTransientSendError(error);
  return {
    ok: false,
    id: null,
    attempts: 1,
    error: String(error?.message || error || 'send_failed').slice(0, 1000),
    transient,
    ambiguous,
    definitiveRejection: !ambiguous && isExplicitProviderRejection(error),
  };
}

export function createProspectingMailer({ resend } = {}) {
  async function sendEmail(payload, idempotencyKey) {
    if (!resend) {
      return {
        ok: false,
        id: null,
        attempts: 0,
        error: 'resend_not_configured',
        transient: false,
        ambiguous: false,
        definitiveRejection: false,
      };
    }

    let response;
    try {
      response = await resend.emails.send(payload, { idempotencyKey });
    } catch (error) {
      return failure(error);
    }

    if (response?.error) return failure(response.error);

    const id = response?.data?.id || response?.id || null;
    if (!id) {
      return {
        ok: false,
        id: null,
        attempts: 1,
        error: 'provider_returned_no_id',
        transient: false,
        ambiguous: true,
        definitiveRejection: false,
      };
    }

    return {
      ok: true,
      id,
      attempts: 1,
      error: null,
      transient: false,
      ambiguous: false,
      definitiveRejection: false,
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
