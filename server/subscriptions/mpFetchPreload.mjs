// Test-only preload for FASE 4.65 exact-route tests.
// Intercepts only MercadoPago API reads; Supabase/PostgREST keeps using the
// real local sandbox. State is read from MP_MOCK_FILE on every request so the
// test can change responses without restarting the server.
import fs from 'node:fs';

const stateFile = process.env.MP_MOCK_FILE;
const realFetch = globalThis.fetch;

if (stateFile) {
  globalThis.fetch = async (url, options = {}) => {
    const raw = String(url);
    if (!raw.startsWith('https://api.mercadopago.com/')) {
      return realFetch(url, options);
    }

    let state = {};
    try {
      state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    } catch {
      state = {};
    }
    const pathname = new URL(raw).pathname;
    const entry = state.responses?.[pathname] ?? state.responses?.['*'];
    if (!entry) {
      return new Response(JSON.stringify({ error: 'mock_not_found', pathname }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (entry.networkError) {
      throw new TypeError('mock_network_error');
    }
    if (entry.timeout) {
      return new Promise((_, reject) => {
        const abort = () => reject(Object.assign(new Error('mock_timeout'), { name: 'AbortError' }));
        if (options.signal?.aborted) abort();
        else options.signal?.addEventListener('abort', abort, { once: true });
      });
    }
    return new Response(JSON.stringify(entry.body ?? {}), {
      status: entry.status ?? 200,
      headers: { 'content-type': 'application/json' },
    });
  };
}
