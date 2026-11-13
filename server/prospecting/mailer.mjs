import { TRANSIENT_HTTP_STATUSES } from './constants.mjs';

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
