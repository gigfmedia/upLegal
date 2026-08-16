import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Fase 4.2.10 — Provider Reliability / Timeouts / Output Token Limits.
// 1) Timeout por llamada (AbortController) → AI_PROVIDER_TIMEOUT, tipado y
//    DISTINTO de NO_EVIDENCE (nunca se convierte en "no hay evidencia").
// 2) Retries acotados: máx. 2 reintentos ante errores temporales (429/5xx/red/
//    vacío), respetando Retry-After con tope. Presupuesto global de llamadas
//    por request (provider + schema) para que nunca haya retry explosion.
// 3) OUTPUT_TOKEN_LIMIT: recuperación controlada (salida compacta) UNA vez.
// 4) Compatibilidad: se preservan el contrato { data, raw, usage } y el retry
//    de JSON/schema (Fase 4.2.4).
// ---------------------------------------------------------------------------

vi.mock('node-fetch', () => ({ default: vi.fn() }));

import fetch from 'node-fetch';

let chatCompletion;
let createLlmCallBudget;
let resolveRetryDelayMs;
let runJurisprudenceWithRetry;
let OUTPUT_TOKEN_LIMIT_RETRY_PROMPT;
let mockedFetch;

beforeAll(async () => {
  process.env.AI_PROVIDER_RETRY_BACKOFF_MS = '1';
  process.env.AI_PROVIDER_MAX_RETRY_AFTER_MS = '1';
  process.env.AI_PROVIDER_TIMEOUT_MS = '30000';
  process.env.AI_PROVIDER_API_KEY = 'test-key';
  ({ chatCompletion, createLlmCallBudget, resolveRetryDelayMs } = await import('./provider.mjs'));
  ({ runJurisprudenceWithRetry, OUTPUT_TOKEN_LIMIT_RETRY_PROMPT } = await import(
    './jurisprudencePipeline.mjs'
  ));
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

const emptyChoicesResponse = () => ({
  ok: true,
  status: 200,
  text: async () => JSON.stringify({ choices: [], usage: {} }),
  json: async () => ({ choices: [], usage: {} }),
});

const lengthLimitResponse = () => ({
  ok: true,
  status: 200,
  text: async () =>
    JSON.stringify({
      choices: [{ message: { content: '', reasoning: 'razonamiento largo...' }, finish_reason: 'length' }],
      usage: {},
    }),
  json: async () => ({
    choices: [{ message: { content: '', reasoning: 'razonamiento largo...' }, finish_reason: 'length' }],
    usage: {},
  }),
});

const errResponse = (status, body, headers = null) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  json: async () => {
    throw new Error('no json');
  },
  headers: headers ? { get: (name) => headers[name] ?? null } : null,
});

const netError = (code) => Object.assign(new Error(`request failed, reason: ${code}`), { code });

// Fetch que NUNCA resuelve: cuelga hasta que nuestro AbortController la aborta.
function hangingFetch() {
  vi.mocked(fetch).mockImplementation(
    (_url, opts) =>
      new Promise((_resolve, reject) => {
        opts.signal?.addEventListener('abort', () =>
          reject(Object.assign(new Error('The operation was aborted'), { name: 'AbortError' })),
        );
      }),
  );
}

const callChat = () =>
  chatCompletion({
    model: 'gpt-4o-mini',
    system: 'system',
    messages: [{ role: 'user', content: 'hola' }],
  });

const callChatWithBudget = (budget) =>
  chatCompletion({
    model: 'gpt-4o-mini',
    system: 'system',
    messages: [{ role: 'user', content: 'hola' }],
    budget,
  });

// -------------------------------
// Fixtures del pipeline (4.2.10)
// -------------------------------

const ley21719 = () => ({
  id: 'bcn-1209272',
  kind: 'normativa',
  source_type: 'normativa',
  legal_authority: 'vinculante',
  vigency: 'desconocida',
  norm_type: 'ley',
  norm_number: '21.719',
  citation: 'Ley 21.719',
  title: 'Ley N° 21.719',
  excerpt:
    'Derechos del titular de datos personales: acceso, rectificación, supresión, oposición, portabilidad y bloqueo.',
  metadata: {
    leychileCode: '1209272',
    fragments: [
      {
        id: 'art-4',
        article: 'Artículo 4',
        text: 'El titular de datos personales tiene derecho a acceso, rectificación, supresión, oposición, portabilidad y bloqueo de sus datos personales.',
      },
    ],
  },
});

const validData = {
  resumen: 'La Ley 21.719 regula los derechos de los titulares de datos personales.',
  normativa: [
    {
      fuente_id: 'bcn-1209272',
      fragment_id: 'art-4',
      afirmacion:
        'El titular de datos personales tiene derecho a acceso, rectificación y supresión de sus datos.',
      fragmento:
        'El titular de datos personales tiene derecho a acceso, rectificación, supresión, oposición, portabilidad y bloqueo de sus datos personales.',
    },
  ],
  jurisprudencia: [],
  doctrina: [],
  advertencias: [],
};

const emptyData = {
  resumen: 'Sin evidencia.',
  normativa: [],
  jurisprudencia: [],
  doctrina: [],
  advertencias: [],
};

const USAGE_ONE = {
  provider: 'openrouter',
  model: 'gpt-oss-20b',
  input_tokens: 10,
  output_tokens: 20,
  total_tokens: 30,
  estimated_cost_usd: 0.001,
};

const QUERY = '¿Qué establece la Ley 21.719 sobre la protección de datos personales?';

const outputLimitError = Object.assign(new Error('presupuesto de salida agotado'), {
  code: 'OUTPUT_TOKEN_LIMIT',
  status: 507,
  retriable: false,
});

function fakeLlmCall(results) {
  const calls = [];
  const fn = (retryInstruction) => {
    calls.push({ retryInstruction });
    const next = results.shift();
    if (next instanceof Error) throw next;
    return { data: next, raw: 'INVALID_GARBAGE_CONTENT', usage: USAGE_ONE };
  };
  fn.calls = calls;
  return fn;
}

// ---------------------------------------------------------------------------
// 1) Timeout
// ---------------------------------------------------------------------------
describe('provider · timeout (Fase 4.2.10)', () => {
  it('timeout por AbortController → AI_PROVIDER_TIMEOUT, retriable=false, status 504, 1 llamada', async () => {
    process.env.AI_PROVIDER_TIMEOUT_MS = '30';
    hangingFetch();
    const err = await callChat().catch((e) => e);
    process.env.AI_PROVIDER_TIMEOUT_MS = '30000';

    expect(err.code).toBe('AI_PROVIDER_TIMEOUT');
    expect(err.retriable).toBe(false);
    expect(err.status).toBe(504);
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });

  it('timeout: mensaje seguro al cliente (sin raw/AbortError) y detalle solo interno', async () => {
    process.env.AI_PROVIDER_TIMEOUT_MS = '30';
    hangingFetch();
    const err = await callChat().catch((e) => e);
    process.env.AI_PROVIDER_TIMEOUT_MS = '30000';

    expect(err.message).toContain('tardando más de lo esperado');
    expect(err.message).not.toContain('AbortError');
    expect(err.message).not.toContain('timed out');
    expect(err.detail).toBe('request timed out');
  });

  it('AbortError externo (sin nuestro timer) → AI_PROVIDER_NETWORK reintentable', async () => {
    vi.mocked(fetch).mockRejectedValue(
      Object.assign(new Error('aborted externally'), { name: 'AbortError' }),
    );
    const err = await callChat().catch((e) => e);
    expect(err.code).toBe('AI_PROVIDER_NETWORK');
    expect(err.retriable).toBe(true);
    expect(mockedFetch).toHaveBeenCalledTimes(3);
  });

  it('timeout adjunta latencyMs (solo metadata) y NO reintenta internamente', async () => {
    process.env.AI_PROVIDER_TIMEOUT_MS = '40';
    hangingFetch();
    const err = await callChat().catch((e) => e);
    process.env.AI_PROVIDER_TIMEOUT_MS = '30000';

    expect(err.code).toBe('AI_PROVIDER_TIMEOUT');
    expect(typeof err.latencyMs).toBe('number');
    expect(err.latencyMs).toBeGreaterThanOrEqual(35);
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// 2) Rate limit (429) y Retry-After
// ---------------------------------------------------------------------------
describe('provider · rate limit 429 (Fase 4.2.10)', () => {
  it('429 → hasta 2 reintentos y éxito en la 3ª llamada (máx 3 llamadas)', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(errResponse(429, '{}'))
      .mockResolvedValueOnce(errResponse(429, '{}'))
      .mockResolvedValueOnce(okResponse());
    const result = await callChat();
    expect(result.data).toEqual({ resumen: 'ok' });
    expect(mockedFetch).toHaveBeenCalledTimes(3);
  });

  it('429 persistente → AI_PROVIDER_RATE_LIMITED con 3 llamadas (máx 2 retries, sin loop)', async () => {
    vi.mocked(fetch).mockResolvedValue(errResponse(429, '{}'));
    const err = await callChat().catch((e) => e);
    expect(err.code).toBe('AI_PROVIDER_RATE_LIMITED');
    expect(err.retriable).toBe(true);
    expect(mockedFetch).toHaveBeenCalledTimes(3);
  });

  it('429 con Retry-After → error conserva retryAfter y el delay respeta el header con tope', async () => {
    vi.mocked(fetch).mockResolvedValue(errResponse(429, '{}', { 'retry-after': '2' }));
    const err = await callChat().catch((e) => e);
    expect(err.code).toBe('AI_PROVIDER_RATE_LIMITED');
    expect(err.retryAfter).toBe(2);
    expect(
      resolveRetryDelayMs({
        attempt: 1,
        retryAfterSeconds: 2,
        baseBackoffMs: 1,
        maxRetryAfterMs: 10000,
      }),
    ).toBe(2000);
    expect(
      resolveRetryDelayMs({ attempt: 1, retryAfterSeconds: 2, maxRetryAfterMs: 500, baseBackoffMs: 1 }),
    ).toBe(500);
    expect(
      resolveRetryDelayMs({
        attempt: 2,
        retryAfterSeconds: null,
        baseBackoffMs: 1000,
        maxRetryAfterMs: 5000,
      }),
    ).toBe(2000);
    expect(
      resolveRetryDelayMs({ attempt: 0, retryAfterSeconds: 5, baseBackoffMs: 1, maxRetryAfterMs: 5000 }),
    ).toBe(0);
  });

  it('429 oculto en el body con otro status (OpenRouter free) → AI_PROVIDER_RATE_LIMITED', async () => {
    const hidden = JSON.stringify({
      error: {
        code: 429,
        message: 'Request failed with status code 429',
        metadata: { raw: 'Rate limit exceeded for the model', provider_name: 'SomeProvider' },
      },
    });
    vi.mocked(fetch).mockResolvedValue(errResponse(500, hidden));
    const err = await callChat().catch((e) => e);
    expect(err.code).toBe('AI_PROVIDER_RATE_LIMITED');
    expect(mockedFetch).toHaveBeenCalledTimes(3);
  });
});

// ---------------------------------------------------------------------------
// 3) Errores 5xx (500/502/503/504)
// ---------------------------------------------------------------------------
describe('provider · errores 5xx (Fase 4.2.10)', () => {
  it('500 persistente → AI_PROVIDER_SERVER_ERROR, 3 llamadas (retry limitado)', async () => {
    vi.mocked(fetch).mockResolvedValue(errResponse(500, 'internal'));
    const err = await callChat().catch((e) => e);
    expect(err.code).toBe('AI_PROVIDER_SERVER_ERROR');
    expect(err.retriable).toBe(true);
    expect(mockedFetch).toHaveBeenCalledTimes(3);
  });

  it('502 → éxito en la 3ª llamada (2 reintentos)', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(errResponse(502, 'bad gateway'))
      .mockResolvedValueOnce(errResponse(502, 'bad gateway'))
      .mockResolvedValueOnce(okResponse());
    const result = await callChat();
    expect(result.data.resumen).toBe('ok');
    expect(mockedFetch).toHaveBeenCalledTimes(3);
  });

  it('503 → éxito en la 3ª llamada (2 reintentos)', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(errResponse(503, 'unavailable'))
      .mockResolvedValueOnce(errResponse(503, 'unavailable'))
      .mockResolvedValueOnce(okResponse());
    const result = await callChat();
    expect(result.data.resumen).toBe('ok');
    expect(mockedFetch).toHaveBeenCalledTimes(3);
  });

  it('504 → éxito en la 3ª llamada (2 reintentos)', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(errResponse(504, 'gateway timeout'))
      .mockResolvedValueOnce(errResponse(504, 'gateway timeout'))
      .mockResolvedValueOnce(okResponse());
    const result = await callChat();
    expect(result.data.resumen).toBe('ok');
    expect(mockedFetch).toHaveBeenCalledTimes(3);
  });
});

// ---------------------------------------------------------------------------
// 4) Errores de red
// ---------------------------------------------------------------------------
describe('provider · errores de red (Fase 4.2.10)', () => {
  it('ECONNRESET → AI_PROVIDER_NETWORK, reintentable y detalle solo interno', async () => {
    vi.mocked(fetch).mockRejectedValue(netError('ECONNRESET'));
    const err = await callChat().catch((e) => e);
    expect(err.code).toBe('AI_PROVIDER_NETWORK');
    expect(err.retriable).toBe(true);
    expect(err.message).not.toContain('ECONNRESET');
    expect(err.detail).toContain('ECONNRESET');
    expect(mockedFetch).toHaveBeenCalledTimes(3);
  });

  it('ECONNREFUSED → reintenta y tiene éxito (2 llamadas)', async () => {
    vi.mocked(fetch)
      .mockRejectedValueOnce(netError('ECONNREFUSED'))
      .mockResolvedValueOnce(okResponse());
    const result = await callChat();
    expect(result.data.resumen).toBe('ok');
    expect(mockedFetch).toHaveBeenCalledTimes(2);
  });

  it('ETIMEDOUT persistente → AI_PROVIDER_NETWORK, 3 llamadas, sin raw en el mensaje', async () => {
    vi.mocked(fetch).mockRejectedValue(netError('ETIMEDOUT'));
    const err = await callChat().catch((e) => e);
    expect(err.code).toBe('AI_PROVIDER_NETWORK');
    expect(err.message).not.toContain('ETIMEDOUT');
    expect(mockedFetch).toHaveBeenCalledTimes(3);
  });

  it('UND_ERR_CONNECT_TIMEOUT → AI_PROVIDER_NETWORK y se recupera en el reintento', async () => {
    vi.mocked(fetch)
      .mockRejectedValueOnce(netError('UND_ERR_CONNECT_TIMEOUT'))
      .mockResolvedValueOnce(okResponse());
    const result = await callChat();
    expect(result.data.resumen).toBe('ok');
    expect(mockedFetch).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// 5) Respuesta vacía (200 sin contenido)
// ---------------------------------------------------------------------------
describe('provider · respuesta vacía (Fase 4.2.10)', () => {
  it('choices=[] persistente → AI_PROVIDER_EMPTY_RESPONSE, 3 llamadas; NUNCA NO_EVIDENCE', async () => {
    vi.mocked(fetch).mockResolvedValue(emptyChoicesResponse());
    const err = await callChat().catch((e) => e);
    expect(err.code).toBe('AI_PROVIDER_EMPTY_RESPONSE');
    expect(err.retriable).toBe(true);
    expect(err.code).not.toBe('NO_EVIDENCE');
    expect(mockedFetch).toHaveBeenCalledTimes(3);
  });

  it('content vacío → AI_PROVIDER_EMPTY_RESPONSE y se recupera en la 2ª llamada', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(okResponse(''))
      .mockResolvedValueOnce(okResponse());
    const result = await callChat();
    expect(result.data.resumen).toBe('ok');
    expect(mockedFetch).toHaveBeenCalledTimes(2);
  });

  it('finish_reason=length (razonamiento agotado) → OUTPUT_TOKEN_LIMIT, SIN reintento interno', async () => {
    vi.mocked(fetch).mockResolvedValue(lengthLimitResponse());
    const err = await callChat().catch((e) => e);
    expect(err.code).toBe('OUTPUT_TOKEN_LIMIT');
    expect(err.retriable).toBe(false);
    expect(err.code).not.toBe('NO_EVIDENCE');
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// 6) Recuperación controlada de OUTPUT_TOKEN_LIMIT (pipeline)
// ---------------------------------------------------------------------------
describe('pipeline · recuperación OUTPUT_TOKEN_LIMIT (Fase 4.2.10)', () => {
  it('OUTPUT_TOKEN_LIMIT en la 1ª llamada → recupera con salida compacta (1 vez) y SUCCESS', async () => {
    const llmCall = fakeLlmCall([outputLimitError, validData]);
    const result = await runJurisprudenceWithRetry({
      llmCall,
      sources: [ley21719()],
      intent: 'normativa',
      query: QUERY,
    });

    expect(result.outcome.status).toBe('ok');
    expect(result.outcome.outcome).toBe('SUCCESS');
    expect(result.outputLimitRecovered).toBe(true);
    expect(llmCall.calls.length).toBe(2);
    expect(llmCall.calls[1].retryInstruction).toBe(OUTPUT_TOKEN_LIMIT_RETRY_PROMPT);
    expect(OUTPUT_TOKEN_LIMIT_RETRY_PROMPT).toContain('JSON');
    expect(OUTPUT_TOKEN_LIMIT_RETRY_PROMPT).toContain('mínima');
  });

  it('OUTPUT_TOKEN_LIMIT persiste tras la recuperación → propaga; NO hay 2ª recuperación', async () => {
    const llmCall = fakeLlmCall([outputLimitError, outputLimitError]);
    await expect(
      runJurisprudenceWithRetry({ llmCall, sources: [ley21719()], intent: 'normativa', query: QUERY }),
    ).rejects.toMatchObject({ code: 'OUTPUT_TOKEN_LIMIT' });
    expect(llmCall.calls.length).toBe(2);
    expect(llmCall.calls[1].retryInstruction).toBe(OUTPUT_TOKEN_LIMIT_RETRY_PROMPT);
  });

  it('OUTPUT_TOKEN_LIMIT tras schema inválido → se recupera UNA sola vez en la misma request', async () => {
    const llmCall = fakeLlmCall([null, outputLimitError, validData]);
    const result = await runJurisprudenceWithRetry({
      llmCall,
      sources: [ley21719()],
      intent: 'normativa',
      query: QUERY,
    });

    expect(result.outcome.outcome).toBe('SUCCESS');
    expect(result.outputLimitRecovered).toBe(true);
    expect(llmCall.calls.length).toBe(3);
    expect(llmCall.calls[2].retryInstruction).toBe(OUTPUT_TOKEN_LIMIT_RETRY_PROMPT);
  });
});

// ---------------------------------------------------------------------------
// 7) Presupuesto global de llamadas por request
// ---------------------------------------------------------------------------
describe('provider · presupuesto global (Fase 4.2.10)', () => {
  it('budget agotado → AI_PROVIDER_CALL_LIMIT con exactamente maxCalls fetch', async () => {
    vi.mocked(fetch).mockResolvedValue(errResponse(429, '{}'));
    const budget = createLlmCallBudget(2);
    const err = await callChatWithBudget(budget).catch((e) => e);

    expect(err.code).toBe('AI_PROVIDER_CALL_LIMIT');
    expect(err.retriable).toBe(false);
    expect(mockedFetch).toHaveBeenCalledTimes(2);
    expect(budget.calls).toBe(2);
  });

  it('AI_PROVIDER_CALL_LIMIT compartido → el pipeline lo propaga SIN reintento de schema', async () => {
    const callLimitError = Object.assign(new Error('presupuesto alcanzado'), {
      code: 'AI_PROVIDER_CALL_LIMIT',
      retriable: false,
      status: 503,
    });
    const llmCall = fakeLlmCall([callLimitError]);
    await expect(
      runJurisprudenceWithRetry({ llmCall, sources: [ley21719()], intent: 'normativa', query: QUERY }),
    ).rejects.toMatchObject({ code: 'AI_PROVIDER_CALL_LIMIT' });
    expect(llmCall.calls.length).toBe(1);
  });

  it('createLlmCallBudget: contrato { maxCalls >= 1, calls inicial 0 }', () => {
    const budget = createLlmCallBudget();
    expect(budget.maxCalls).toBeGreaterThanOrEqual(1);
    expect(budget.calls).toBe(0);
    expect(createLlmCallBudget(2).maxCalls).toBe(2);
    expect(createLlmCallBudget(0).maxCalls).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 8) Compatibilidad y regresiones
// ---------------------------------------------------------------------------
describe('compatibilidad · regresiones 4.1.11 / 4.2.4 (Fase 4.2.10)', () => {
  it('respuesta válida → contrato { data, raw, usage } intacto', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(okResponse('{"resumen":"ok","normativa":[]}'));
    const result = await callChat();
    expect(result.data.normativa).toEqual([]);
    expect(result.raw).toContain('resumen');
    expect(result.usage.provider).toBe('openai');
    expect(result.usage.total_tokens).toBe(15);
  });

  it('texto sin JSON → data: null + raw (no lanza)', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(okResponse('respuesta en texto plano, sin JSON'));
    const result = await callChat();
    expect(result.data).toBeNull();
    expect(result.raw).toContain('texto plano');
  });

  it('JSON en bloque markdown ```json ... ``` → se extrae correctamente', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(okResponse('```json\n{"resumen":"ok"}\n```'));
    const result = await callChat();
    expect(result.data).toEqual({ resumen: 'ok' });
  });

  it('400 json_validate_failed → reintenta SIN response_format y tiene éxito', async () => {
    vi.mocked(fetch)
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

  it('runJurisprudenceWithRetry: NO_EVIDENCE válido → 1 llamada, sin reintento', async () => {
    const llmCall = fakeLlmCall([emptyData]);
    const result = await runJurisprudenceWithRetry({
      llmCall,
      sources: [],
      intent: 'general',
      query: '¿Hay normativa sobre algo inexistente?',
    });
    expect(llmCall.calls.length).toBe(1);
    expect(result.outcome.status).toBe('ok');
    expect(result.outcome.outcome).toBe('NO_EVIDENCE');
    expect(result.outputLimitRecovered).toBe(false);
  });

  it('runJurisprudenceWithRetry: schema inválido ×3 → 3 llamadas (nunca 4) e INVALID_RESPONSE', async () => {
    const llmCall = fakeLlmCall([null, null, null]);
    const result = await runJurisprudenceWithRetry({
      llmCall,
      sources: [ley21719()],
      intent: 'normativa',
      query: QUERY,
    });
    expect(llmCall.calls.length).toBe(3);
    expect(result.outcome.status).toBe('invalid_response');
  });
});