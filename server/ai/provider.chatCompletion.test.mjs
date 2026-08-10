import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';

// Fase 4.1.11 — Resiliencia del proveedor de IA (chatCompletion).
// Se mockea node-fetch para validar reintentos, clasificación de errores y el
// contrato { data, raw, usage } sin red real. El backoff se fija en 0 y la
// API key se define ANTES de importar provider.mjs (lee process.env al cargar).

vi.mock('node-fetch', () => ({ default: vi.fn() }));

import fetch from 'node-fetch';

let chatCompletion;
let mockedFetch;

beforeAll(async () => {
  process.env.AI_PROVIDER_RETRY_BACKOFF_MS = '1';
  process.env.AI_PROVIDER_API_KEY = 'test-key';
  ({ chatCompletion } = await import('./provider.mjs'));
});

beforeEach(() => {
  mockedFetch = vi.mocked(fetch);
  mockedFetch.mockReset();
});

const okBody = (content = '{"resumen":"ok"}', usage = { prompt_tokens: 10, completion_tokens: 5 }) => ({
  choices: [{ message: { content } }],
  usage: { total_tokens: 15, ...usage },
});

const okResponse = (content = '{"resumen":"ok"}') => ({
  ok: true,
  status: 200,
  text: async () => JSON.stringify(okBody(content)),
  json: async () => okBody(content),
});

const errResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  json: async () => {
    throw new Error('no json');
  },
});

const netError = Object.assign(
  new Error('request to https://api.openai.com/v1/chat/completions failed, reason: connect ECONNREFUSED'),
  { code: 'ECONNREFUSED' },
);

const callChat = () =>
  chatCompletion({
    model: 'gpt-4o-mini',
    system: 'system',
    messages: [{ role: 'user', content: 'hola' }],
  });

describe('chatCompletion · reintentos y clasificación (Fase 4.1.11)', () => {
  it('HTTP 429 → reintenta UNA vez y tiene éxito (máx 2 llamadas)', async () => {
    mockedFetch
      .mockResolvedValueOnce(errResponse(429, '{}'))
      .mockResolvedValueOnce(okResponse());
    const result = await callChat();
    expect(result.data).toEqual({ resumen: 'ok' });
    expect(mockedFetch).toHaveBeenCalledTimes(2);
  });

  it('HTTP 429 persistente → lanza AI_PROVIDER_RATE_LIMITED SIN reintento infinito', async () => {
    mockedFetch.mockResolvedValue(errResponse(429, '{}'));
    await expect(callChat()).rejects.toMatchObject({ code: 'AI_PROVIDER_RATE_LIMITED', retriable: true });
    expect(mockedFetch).toHaveBeenCalledTimes(2);
  });

  it('429 oculto en el body con otro status (OpenRouter free) → AI_PROVIDER_RATE_LIMITED', async () => {
    const hidden = JSON.stringify({
      error: {
        code: 429,
        message: 'Request failed with status code 429',
        metadata: { raw: 'Rate limit exceeded for the model', provider_name: 'SomeProvider' },
      },
    });
    mockedFetch.mockResolvedValue(errResponse(500, hidden));
    await expect(callChat()).rejects.toMatchObject({ code: 'AI_PROVIDER_RATE_LIMITED' });
    expect(mockedFetch).toHaveBeenCalledTimes(2);
  });

  it('HTTP 5xx persistente → AI_PROVIDER_SERVER_ERROR con 2 llamadas (sin loop)', async () => {
    mockedFetch.mockResolvedValue(errResponse(503, 'upstream error'));
    await expect(callChat()).rejects.toMatchObject({ code: 'AI_PROVIDER_SERVER_ERROR', retriable: true });
    expect(mockedFetch).toHaveBeenCalledTimes(2);
  });

  it('5xx temporal → el reintento puede tener éxito', async () => {
    mockedFetch
      .mockResolvedValueOnce(errResponse(502, 'bad gateway'))
      .mockResolvedValueOnce(okResponse());
    const result = await callChat();
    expect(result.data.resumen).toBe('ok');
    expect(mockedFetch).toHaveBeenCalledTimes(2);
  });

  it('fallo de red → AI_PROVIDER_NETWORK, reintentable y con detalle solo interno', async () => {
    mockedFetch.mockRejectedValue(netError);
    const error = await callChat().catch((e) => e);
    expect(error.code).toBe('AI_PROVIDER_NETWORK');
    expect(error.retriable).toBe(true);
    expect(error.status).toBe(502);
    expect(error.message).not.toContain('ECONNREFUSED');
    expect(error.detail).toContain('ECONNREFUSED');
    expect(mockedFetch).toHaveBeenCalledTimes(2);
  });

  it('401 → NO reintenta (1 llamada) y lanza AI_PROVIDER_AUTH', async () => {
    mockedFetch.mockResolvedValue(errResponse(401, 'unauthorized'));
    await expect(callChat()).rejects.toMatchObject({ code: 'AI_PROVIDER_AUTH', retriable: false });
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });
});

describe('chatCompletion · contrato de respuesta', () => {
  it('JSON válido → data parseada + usage con costo estimado', async () => {
    mockedFetch.mockResolvedValueOnce(okResponse('{"resumen":"ok","normativa":[]}'));
    const result = await callChat();
    expect(result.data.normativa).toEqual([]);
    expect(result.raw).toContain('resumen');
    expect(result.usage.provider).toBe('openai');
    expect(result.usage.total_tokens).toBe(15);
    expect(typeof result.usage.estimated_cost_usd).toBe('number');
  });

  it('contenido sin JSON válido → data: null + raw (no lanza)', async () => {
    mockedFetch.mockResolvedValueOnce(okResponse('respuesta en texto plano, sin JSON'));
    const result = await callChat();
    expect(result.data).toBeNull();
    expect(result.raw).toContain('texto plano');
  });

  it('JSON en bloque markdown ```json ... ``` → se extrae correctamente', async () => {
    mockedFetch.mockResolvedValueOnce(okResponse('```json\n{"resumen":"ok"}\n```'));
    const result = await callChat();
    expect(result.data).toEqual({ resumen: 'ok' });
  });

  it('400 con json_object → reintenta SIN response_format y tiene éxito', async () => {
    mockedFetch
      .mockResolvedValueOnce(errResponse(400, JSON.stringify({ error: { code: 'json_validate_failed' } })))
      .mockResolvedValueOnce(okResponse());
    const result = await callChat();
    expect(result.data.resumen).toBe('ok');
    expect(mockedFetch).toHaveBeenCalledTimes(2);
    const first = JSON.parse(mockedFetch.mock.calls[0][1].body);
    const second = JSON.parse(mockedFetch.mock.calls[1][1].body);
    expect(first.response_format).toEqual({ type: 'json_object' });
    expect('response_format' in second).toBe(false);
  });

  it('sin API key → AI_NOT_CONFIGURED antes de cualquier fetch', async () => {
    const previous = process.env.AI_PROVIDER_API_KEY;
    delete process.env.AI_PROVIDER_API_KEY;
    try {
      await expect(callChat()).rejects.toMatchObject({ code: 'AI_NOT_CONFIGURED' });
      expect(mockedFetch).not.toHaveBeenCalled();
    } finally {
      process.env.AI_PROVIDER_API_KEY = previous;
    }
  });
});
