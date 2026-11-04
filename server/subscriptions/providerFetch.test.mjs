// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import {
  fetchProviderResource,
  isRetryableProviderStatus,
  providerFetchFailureResult,
} from './providerFetch.mjs';

function response(status, body = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

describe('providerFetch', () => {
  it('classifies timeouts and network errors as retryable', async () => {
    const timeout = await fetchProviderResource('https://mp.test/preapproval/x', {
      fetchImpl: async () => {
        const err = new Error('aborted');
        err.name = 'AbortError';
        throw err;
      },
    });
    expect(timeout).toMatchObject({ ok: false, retryable: true, reason: 'timeout' });

    const network = await fetchProviderResource('https://mp.test/preapproval/x', {
      fetchImpl: async () => { throw new Error('ECONNRESET'); },
    });
    expect(network).toMatchObject({ ok: false, retryable: true, reason: 'network_error' });
  });

  it('retries 408/425/429/5xx and does not retry 4xx', async () => {
    for (const status of [404, 408, 425, 429, 500, 502, 503]) {
      const result = await fetchProviderResource('https://mp.test/x', {
        fetchImpl: async () => response(status),
      });
      expect(result.retryable).toBe(true);
      expect(providerFetchFailureResult(result)).toMatchObject({
        skipped: 'provider_fetch_failed',
        retry: true,
        http_status: status,
      });
    }

    for (const status of [400, 401, 403, 422]) {
      const result = await fetchProviderResource('https://mp.test/x', {
        fetchImpl: async () => response(status),
      });
      expect(isRetryableProviderStatus(status)).toBe(false);
      expect(result.retryable).toBe(false);
      expect(providerFetchFailureResult(result)).toMatchObject({
        skipped: 'provider_fetch_failed',
        retry: false,
        http_status: status,
      });
    }
  });

  it('retries invalid JSON because the provider delivery is still recoverable', async () => {
    const result = await fetchProviderResource('https://mp.test/x', {
      fetchImpl: async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('bad json'); } }),
    });
    expect(result).toMatchObject({ ok: false, retryable: true, reason: 'invalid_json' });
  });

  it('returns parsed data on success', async () => {
    const result = await fetchProviderResource('https://mp.test/x', {
      fetchImpl: async () => response(200, { id: '2c938084726fca480172750000000000', status: 'authorized' }),
    });
    expect(result).toMatchObject({ ok: true, retryable: false, status: 200 });
    expect(result.data.status).toBe('authorized');
  });

  it('aborts a hanging provider call', async () => {
    vi.useFakeTimers();
    const pending = fetchProviderResource('https://mp.test/x', {
      timeoutMs: 10,
      fetchImpl: (_url, { signal }) => new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => {
          const err = new Error('aborted');
          err.name = 'AbortError';
          reject(err);
        });
      }),
    });
    await vi.advanceTimersByTimeAsync(20);
    await expect(pending).resolves.toMatchObject({ ok: false, retryable: true, reason: 'timeout' });
    vi.useRealTimers();
  });
});
