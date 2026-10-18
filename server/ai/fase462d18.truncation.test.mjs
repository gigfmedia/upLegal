import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';

// FASE 4.62D.18 — presupuesto de salida, truncamiento y diagnóstico seguro.
// Sin red: node-fetch mockeado. Se valida que:
//  - finish_reason='length' con content vacío O PARCIAL se rechaza como
//    OUTPUT_TOKEN_LIMIT (507, no reintentable), sin aceptar JSON parcial.
//  - el diagnóstico (err.diag) y el metering (usage_details.finish_reason)
//    llevan solo metadatos acotados, nunca contenido del proveedor.

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

const providerBody = (content, finishReason, extra = {}) => ({
  id: 'chatcmpl-462d18',
  model: 'openai/gpt-oss-20b',
  choices: [{ finish_reason: finishReason, message: { content, ...extra } }],
  usage: {
    prompt_tokens: 3000,
    completion_tokens: 4000,
    completion_tokens_details: { reasoning_tokens: 3800 },
  },
});

const providerResponse = (content, finishReason, extra = {}) => {
  const body = providerBody(content, finishReason, extra);
  return { ok: true, status: 200, text: async () => JSON.stringify(body), json: async () => body };
};

const meteringHarness = () => {
  const finishers = [];
  return {
    metering: {
      beginAttempt: vi.fn(async () => 'attempt-462d18'),
      finishAttempt: vi.fn(async (_id, data) => { finishers.push(data); }),
    },
    finishers,
  };
};

const PARTIAL_JSON = '{"title":"Escrito de prueba","content":"# Encabezado del escrito\n\nCláusula'
  .slice(0, 72); // JSON cortado a mitad, SIN cierre válido.
const PLAIN_TEXT = 'Lo siento, no puedo generar ese documento en formato JSON.';

describe('4.62D.18 · finish_reason length ⇒ truncado, no aceptado, no reintentable', () => {
  it('content vacío + finish_reason=length → OUTPUT_TOKEN_LIMIT 507 no reintentable (E.1)', async () => {
    mockedFetch.mockResolvedValueOnce(providerResponse('', 'length'));
    const err = await chatCompletion({ model: 'openai/gpt-oss-20b', system: 'sys', user: 'u' }).catch((e) => e);
    expect(err.code).toBe('OUTPUT_TOKEN_LIMIT');
    expect(err.status).toBe(507);
    expect(err.retriable).toBe(false);
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });

  it('JSON PARCIAL parecido a válido + finish_reason=length → rechazado, nunca devuelto como data (E.2)', async () => {
    mockedFetch.mockResolvedValueOnce(providerResponse(PARTIAL_JSON, 'length'));
    const err = await chatCompletion({ model: 'openai/gpt-oss-20b', system: 'sys', user: 'u' }).catch((e) => e);
    expect(err.code).toBe('OUTPUT_TOKEN_LIMIT');
    expect(err.status).toBe(507);
    expect(err.retriable).toBe(false);
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });

  it('sin truncamiento: content vacío a secas mantiene AI_PROVIDER_EMPTY_RESPONSE 502 reintentable', async () => {
    mockedFetch.mockResolvedValue(providerResponse('', 'stop'));
    const err = await chatCompletion({ model: 'openai/gpt-oss-20b', system: 'sys', user: 'u' }).catch((e) => e);
    expect(err.code).toBe('AI_PROVIDER_EMPTY_RESPONSE');
    expect(err.status).toBe(502);
    expect(err.retriable).toBe(true);
    expect(mockedFetch).toHaveBeenCalledTimes(3); // 1 + MAX_PROVIDER_RETRIES (contrato 4.2.10 intacto)
  });

  it('content vacío + reasoning (finish_reason ausente) sigue clasificando OUTPUT_TOKEN_LIMIT', async () => {
    const body = providerBody('', null, { reasoning: 'tras este fragmento del razonamiento se cortó' });
    mockedFetch.mockResolvedValueOnce({ ok: true, status: 200, text: async () => JSON.stringify(body), json: async () => body });
    const err = await chatCompletion({ model: 'openai/gpt-oss-20b', system: 'sys', user: 'u' }).catch((e) => e);
    expect(err.code).toBe('OUTPUT_TOKEN_LIMIT');
    expect(err.retriable).toBe(false);
  });

  it('otro finish_reason (stop) con contenido sin JSON → data:null + raw, sin lanzar (E.3)', async () => {
    mockedFetch.mockResolvedValueOnce(providerResponse(PLAIN_TEXT, 'stop'));
    const result = await chatCompletion({ model: 'openai/gpt-oss-20b', system: 'sys', user: 'u' });
    expect(result.data).toBeNull();
    expect(result.raw).toBe(PLAIN_TEXT);
    expect(result.finishReason).toBe('stop');
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });

  it('respuesta válida completa → data parseada + finishReason preservado (E.5)', async () => {
    mockedFetch.mockResolvedValueOnce(providerResponse('{"resumen":"ok"}', 'stop'));
    const result = await chatCompletion({ model: 'openai/gpt-oss-20b', system: 'sys', user: 'u' });
    expect(result.data).toEqual({ resumen: 'ok' });
    expect(result.finishReason).toBe('stop');
    expect(result.usage.actual_model).toBe('openai/gpt-oss-20b');
  });
});

describe('4.62D.18 · diagnóstico desinfectado (err.diag y metering)', () => {
  it('err.diag trae solo metadatos y JAMÁS el contenido truncado del modelo (E.9/E.10)', async () => {
    mockedFetch.mockResolvedValueOnce(providerResponse(PARTIAL_JSON, 'length'));
    const err = await chatCompletion({ model: 'openai/gpt-oss-20b', system: 'sys', user: 'u' }).catch((e) => e);
    expect(err.diag).toEqual({
      finish_reason: 'length',
      actual_model: 'openai/gpt-oss-20b',
      provider_request_id: 'chatcmpl-462d18',
      input_tokens: 3000,
      output_tokens: 4000,
      reasoning_tokens: 3800,
    });
    const serialized = JSON.stringify(err.diag);
    expect(serialized).not.toContain('Encabezado');
    expect(serialized).not.toContain('Cláusula');
    expect(serialized).not.toContain('test-key');
    expect(serialized).not.toContain('sys');
  });

  it('metering finishAttempt registra status failed + error_code + finish_reason en usage_details (E.8/D)', async () => {
    const { metering, finishers } = meteringHarness();
    mockedFetch.mockResolvedValueOnce(providerResponse(PARTIAL_JSON, 'length'));
    await chatCompletion({ model: 'openai/gpt-oss-20b', system: 'sys', user: 'u', metering }).catch(() => {});
    expect(finishers).toHaveLength(1);
    expect(finishers[0].status).toBe('failed');
    expect(finishers[0].error_code).toBe('OUTPUT_TOKEN_LIMIT');
    expect(finishers[0].usage_details.finish_reason).toBe('length');
    expect(finishers[0].completion_tokens).toBe(4000);
    expect(typeof finishers[0].latency_ms).toBe('number');
  });

  it('metering de éxito registra finish_reason del intento exitoso', async () => {
    const { metering, finishers } = meteringHarness();
    mockedFetch.mockResolvedValueOnce(providerResponse('{"resumen":"ok"}', 'stop'));
    await chatCompletion({ model: 'openai/gpt-oss-20b', system: 'sys', user: 'u', metering });
    expect(finishers[0].status).toBe('succeeded');
    expect(finishers[0].usage_details.finish_reason).toBe('stop');
  });
});
