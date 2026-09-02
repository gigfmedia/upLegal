import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';

vi.mock('node-fetch', () => ({ default: vi.fn() }));
import fetch from 'node-fetch';
let chatCompletion;
let classifyProviderError;
let mockedFetch;

beforeAll(async () => {
  process.env.AI_PROVIDER_RETRY_BACKOFF_MS = '1';
  process.env.AI_PROVIDER_MAX_RETRY_AFTER_MS = '1';
  process.env.AI_PROVIDER_TIMEOUT_MS = '30000';
  process.env.AI_PROVIDER_API_KEY = 'test-key';
  ({ chatCompletion, classifyProviderError } = await import('./provider.mjs'));
});

beforeEach(() => {
  mockedFetch = vi.mocked(fetch);
  mockedFetch.mockReset();
});

const okBody = (content = '{"summary":"Documento de prueba"}') => ({
  choices: [{ message: { content } }],
  usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
});
const okResponse = (content = '{"summary":"Documento de prueba"}') => ({
  ok: true,
  status: 200,
  text: async () => JSON.stringify(okBody(content)),
  json: async () => okBody(content),
});
const errResponse = (status, body) => ({
  ok: false,
  status,
  text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  json: async () => { throw new Error('no json'); },
  headers: { get: () => null },
});

describe('FASE 4.26.1.1 — provider retry json_validate_failed', () => {
  it('A — clasificación 400 json_validate_failed → AI_PROVIDER_JSON_VALIDATE_FAILED retriable true', () => {
    const err = classifyProviderError(400, JSON.stringify({ error: { code: 'json_validate_failed', message: 'json validate failed' } }));
    expect(err.code).toBe('AI_PROVIDER_JSON_VALIDATE_FAILED');
    expect(err.retriable).toBe(true);
    expect(err.status).toBe(400);
  });

  it('B — retry real: 400 json_validate_failed → 200 (chatCompletion con fetch mock)', async () => {
    // Flujo real: chatCompletion → fetch 400 → classify → AI_PROVIDER_JSON_VALIDATE_FAILED retriable
    // pero attemptWithJsonFallback hace fallback SIN response_format y tiene éxito en 2ª llamada.
    mockedFetch
      .mockResolvedValueOnce(errResponse(400, { error: { code: 'json_validate_failed', message: 'json validate failed' } }))
      .mockResolvedValueOnce(okResponse());
    const result = await chatCompletion({ model: 'gpt-4o-mini', system: 'sys', user: 'test' });
    expect(result.data.summary).toBe('Documento de prueba');
    expect(mockedFetch).toHaveBeenCalledTimes(2);
    // Verifica que la clasificación previa fue retriable y permitió el paso al fallback/success
    const errCheck = classifyProviderError(400, JSON.stringify({ error: { code: 'json_validate_failed' } }));
    expect(errCheck.retriable).toBe(true);
  });

  it('C — response_format fallback: primer intento con json_object, segundo sin', async () => {
    mockedFetch
      .mockResolvedValueOnce(errResponse(400, { error: { code: 'json_validate_failed' } }))
      .mockResolvedValueOnce(okResponse());
    await chatCompletion({ model: 'gpt-4o-mini', system: 'sys', user: 'test' });
    const first = JSON.parse(mockedFetch.mock.calls[0][1].body);
    const second = JSON.parse(mockedFetch.mock.calls[1][1].body);
    expect(first.response_format).toEqual({ type: 'json_object' });
    expect('response_format' in second).toBe(false);
  });

  it('D — límite: 400 persistente → error final sin loop infinito (fallback + outer retry)', async () => {
    // DECISIÓN FALLBACK/OUTER RETRY (Fase 4.26.1.1):
    // attemptWithJsonFallback hace 2 fetch por iteración outer (con y sin response_format) si status 400.
    // chatCompletion outer loop reintenta si retriable===true hasta MAX_PROVIDER_RETRIES=2 (3 iteraciones).
    // Por tanto persistente json_validate_failed = 3 iteraciones * 2 fetches = 6 llamadas totales.
    // No es 3, porque 3 ignoraría el fallback. No se modifica arquitectura para forzar 3.
    mockedFetch.mockResolvedValue(errResponse(400, { error: { code: 'json_validate_failed' } }));
    const err = await chatCompletion({ model: 'gpt-4o-mini', system: 'sys', user: 'test' }).catch((e) => e);
    expect(err.code).toBe('AI_PROVIDER_JSON_VALIDATE_FAILED');
    expect(err.retriable).toBe(true);
    expect(mockedFetch).toHaveBeenCalledTimes(6);
  });

  it('E — error no retriable 400 genérico no reintenta outer (solo fallback par)', async () => {
    mockedFetch.mockResolvedValue(errResponse(400, { error: { code: 'other_error', message: 'bad request' } }));
    const err = await chatCompletion({ model: 'gpt-4o-mini', system: 'sys', user: 'test' }).catch((e) => e);
    // 400 genérico → fallback par (con y sin response_format) = 2 llamadas, luego error no retriable → no outer retry
    expect(err.code).toBe('AI_PROVIDER_ERROR');
    expect(err.retriable).toBe(false);
    expect(mockedFetch).toHaveBeenCalledTimes(2);
  });
});
