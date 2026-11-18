import { AMBIGUOUS_HTTP_STATUSES, TRANSIENT_HTTP_STATUSES } from './constants.mjs';

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

export function isExplicitProviderRejection(error) {
  if (!error || isAmbiguousSendError(error)) return false;
  const status = Number(error.statusCode ?? error.status ?? error.response?.status);
  if (Number.isFinite(status) && status > 0) return true;
  const code = String(error.code || error.name || '').toUpperCase();
  if (['RATE_LIMIT_EXCEEDED', 'TOO_MANY_REQUESTS'].includes(code)) return true;
  const message = String(error.message || '').toLowerCase();
  return /rate.?limit|too many requests/.test(message);
}

export function isAmbiguousSendError(error) {
  if (!error) return false;
  const status = Number(error.statusCode ?? error.status ?? error.response?.status);
  if (Number.isFinite(status) && status > 0) {
    return (status >= 500 && status <= 599) || AMBIGUOUS_HTTP_STATUSES.has(status);
  }
  const code = String(error.code || error.name || '').toUpperCase();
  if ([
    'ECONNRESET',
    'ETIMEDOUT',
    'EPIPE',
    'UND_ERR_CONNECT_TIMEOUT',
    'UND_ERR_HEADERS_TIMEOUT',
    'UND_ERR_BODY_TIMEOUT',
    'UND_ERR_SOCKET',
  ].includes(code)) {
    return true;
  }
  const message = String(error.message || '').toLowerCase();
  return /timeout|timed out|socket hang up|econnreset|connection (?:reset|closed)|premature close/.test(message);
}
