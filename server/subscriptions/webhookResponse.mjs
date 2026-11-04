// MercadoPago retries a webhook whenever the response is not 2xx. A busy
// atomic claim is transient, so it must return 503; terminal/duplicate events
// and successful/ignored work must keep returning 200 so MP stops retrying.
export const WEBHOOK_BUSY_STATUS = 503;
export const WEBHOOK_ACK_STATUS = 200;

export function webhookResponseStatus(result) {
  return result?.retry === true ? WEBHOOK_BUSY_STATUS : WEBHOOK_ACK_STATUS;
}

export function sendWebhookResponse(res, result) {
  const status = webhookResponseStatus(result);
  if (status === WEBHOOK_BUSY_STATUS) {
    return res.status(status).json({ error: 'processing_in_progress', retry: true });
  }
  if (result?.ignored === true) {
    return res.status(status).json({
      ok: true,
      ignored: true,
      reason: result.reason ?? 'ignored',
      topic: result.topic ?? null,
    });
  }
  if (result?.skipped === 'provider_fetch_failed') {
    return res.status(status).json({
      ok: false,
      skipped: 'provider_fetch_failed',
      reason: result.reason ?? 'unknown_error',
      http_status: result.http_status ?? null,
    });
  }
  return res.status(status).send('OK');
}
