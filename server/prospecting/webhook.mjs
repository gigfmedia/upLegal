import crypto from 'crypto';

const MAX_SIGNATURE_AGE_SECONDS = 5 * 60;

export function verifyResendSignature({ rawBody, headers, secret, now = Date.now() }) {
  if (!secret) return { ok: false, status: 503, reason: 'webhook_secret_not_configured' };
  const svixId = header(headers, 'svix-id');
  const svixTimestamp = header(headers, 'svix-timestamp');
  const svixSignature = header(headers, 'svix-signature');
  if (!svixId || !svixTimestamp || !svixSignature) {
    return { ok: false, status: 400, reason: 'missing_signature_headers' };
  }

  const timestamp = Number(svixTimestamp);
  if (!Number.isFinite(timestamp)) {
    return { ok: false, status: 400, reason: 'invalid_timestamp' };
  }
  const age = Math.abs(Math.floor(now / 1000) - timestamp);
  if (age > MAX_SIGNATURE_AGE_SECONDS) {
    return { ok: false, status: 401, reason: 'timestamp_out_of_tolerance' };
  }

  const body = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody || '');
  const signedContent = `${svixId}.${svixTimestamp}.${body}`;
  const key = secret.startsWith('whsec_') ? secret.slice('whsec_'.length) : secret;
  const keyBytes = Buffer.from(key, 'base64');
  if (keyBytes.length === 0) {
    return { ok: false, status: 500, reason: 'invalid_webhook_secret' };
  }
  const expected = crypto.createHmac('sha256', keyBytes).update(signedContent).digest();
  const candidates = String(svixSignature)
    .split(/\s+/)
    .map((part) => part.trim())
    .filter((part) => part.startsWith('v1,'))
    .map((part) => part.slice(3));

  const valid = candidates.some((candidate) => {
    try {
      const provided = Buffer.from(candidate, 'base64');
      return provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
    } catch {
      return false;
    }
  });

  if (!valid) return { ok: false, status: 401, reason: 'invalid_signature' };
  return { ok: true, svixId };
}

export function mapResendEvent(payload) {
  const type = String(payload?.type || '').trim();
  const data = payload?.data || {};
  const providerMessageId = data.email_id || data.id || null;
  const email = normalizeRecipient(data.to);
  const statusByType = {
    'email.sent': 'sent',
    'email.delivered': 'delivered',
    'email.delivery_delayed': 'sent',
    'email.bounced': 'bounced',
    'email.complained': 'complained',
    'email.failed': 'failed',
    'email.opened': null,
    'email.clicked': null,
  };
  const status = Object.prototype.hasOwnProperty.call(statusByType, type)
    ? statusByType[type]
    : null;
  return { type, status, providerMessageId, email, data };
}

function normalizeRecipient(to) {
  const value = Array.isArray(to) ? to[0] : to;
  return String(value || '').trim().toLowerCase() || null;
}

function header(headers, name) {
  if (!headers) return null;
  if (typeof headers.get === 'function') return headers.get(name);
  const lower = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === lower) {
      return Array.isArray(value) ? value[0] : value;
    }
  }
  return null;
}
