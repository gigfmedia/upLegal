// MercadoPago provider reads used by subscription webhooks.
//
// A webhook must not ACK a transient provider failure: MP only redelivers when
// the response is non-2xx. Classify the failure once here so every handler
// (preapproval, authorized payment, future resources) returns the same
// retryable/permanent disposition.

export const PROVIDER_FETCH_TIMEOUT_MS = 10_000;

// 404 is included: a just-created provider resource can be temporarily
// invisible. A genuinely missing id will exhaust MP's retry budget.
const RETRYABLE_HTTP_STATUSES = new Set([404, 408, 425, 429]);

export function isRetryableProviderStatus(status) {
  const code = Number(status);
  if (!Number.isFinite(code)) return false;
  return RETRYABLE_HTTP_STATUSES.has(code) || code >= 500;
}

function errorReason(error) {
  if (!error) return 'unknown_error';
  if (error.name === 'AbortError' || error.name === 'TimeoutError') return 'timeout';
  return 'network_error';
}

export async function fetchProviderResource(url, {
  fetchImpl = globalThis.fetch,
  timeoutMs = PROVIDER_FETCH_TIMEOUT_MS,
  headers = {},
} = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(1, Number(timeoutMs) || PROVIDER_FETCH_TIMEOUT_MS));
  let response;
  try {
    response = await fetchImpl(url, { headers, signal: controller.signal });
  } catch (error) {
    return {
      ok: false,
      retryable: true,
      reason: errorReason(error),
      status: null,
      error,
    };
  } finally {
    clearTimeout(timer);
  }

  if (!response?.ok) {
    const status = response?.status ?? null;
    return {
      ok: false,
      retryable: isRetryableProviderStatus(status),
      reason: isRetryableProviderStatus(status) ? 'provider_unavailable' : 'provider_rejected',
      status,
      response,
    };
  }

  try {
    return { ok: true, retryable: false, status: response.status, data: await response.json() };
  } catch (error) {
    return {
      ok: false,
      retryable: true,
      reason: 'invalid_json',
      status: response.status,
      error,
    };
  }
}

export function providerFetchFailureResult(failure) {
  return {
    skipped: 'provider_fetch_failed',
    retry: failure?.retryable === true,
    reason: failure?.reason || 'unknown_error',
    http_status: failure?.status ?? null,
  };
}
