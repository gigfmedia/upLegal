import { describe, it, expect } from 'vitest';
import {
  runJurisprudenceWithRetry,
  LLM_RETRY_MAX_ATTEMPTS,
  LLM_RETRY_PROMPT,
} from './jurisprudencePipeline.mjs';

// ---------------------------------------------------------------------------
// Fase 4.2.4 — retry controlado por JSON/schema inválido. El modelo free
// (gpt-oss-20b) ocasionalmente devuelve JSON sintácticamente o estructuralmente
// inválido; al repetir la llamada puede producir JSON válido. El helper
// reintenta SOLO ese caso (formato/schema), con máximo 3 intentos y sin incluir
// la salida inválida en el prompt de reintento. NO reintenta NO_EVIDENCE
// (respuesta válida), ni errores de provider, ni CONTEXT_TOO_LARGE.
// ---------------------------------------------------------------------------

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

const emptyData = {
  resumen: 'Sin normativa citada.',
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

// Registra cada llamada y emite el siguiente resultado (o lanza el Error dado).
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

describe('Fase 4.2.4 · retry por JSON/schema inválido', () => {
  it('T1: primer intento válido → 1 llamada, SUCCESS, retry_count 0', async () => {
    const llmCall = fakeLlmCall([emptyData]);
    const { outcome, attempts, retryCount } = await runJurisprudenceWithRetry({
      llmCall,
      sources: [ley21719()],
      intent: 'normativa',
      query: QUERY,
    });

    expect(llmCall.calls.length).toBe(1);
    expect(attempts).toBe(1);
    expect(retryCount).toBe(0);
    expect(outcome.status).toBe('ok');
    expect(outcome.outcome).toBe('SUCCESS');
  });

  it('T2: primer intento inválido, segundo válido → 2 llamadas, retry_count 1', async () => {
    const llmCall = fakeLlmCall([null, emptyData]);
    const { outcome, attempts, retryCount } = await runJurisprudenceWithRetry({
      llmCall,
      sources: [ley21719()],
      intent: 'normativa',
      query: QUERY,
    });

    expect(llmCall.calls.length).toBe(2);
    expect(attempts).toBe(2);
    expect(retryCount).toBe(1);
    expect(outcome.status).toBe('ok');
    expect(outcome.outcome).toBe('SUCCESS');
  });

  it('T3: dos intentos inválidos, tercero válido → 3 llamadas, retry_count 2', async () => {
    const llmCall = fakeLlmCall([null, null, emptyData]);
    const { outcome, attempts, retryCount } = await runJurisprudenceWithRetry({
      llmCall,
      sources: [ley21719()],
      intent: 'normativa',
      query: QUERY,
    });

    expect(llmCall.calls.length).toBe(3);
    expect(attempts).toBe(3);
    expect(retryCount).toBe(2);
    expect(outcome.status).toBe('ok');
    expect(outcome.outcome).toBe('SUCCESS');
  });

  it('T4: tres intentos inválidos → 3 llamadas (nunca 4) y INVALID_RESPONSE', async () => {
    const llmCall = fakeLlmCall([null, null, null]);
    const { outcome, attempts, retryCount } = await runJurisprudenceWithRetry({
      llmCall,
      sources: [ley21719()],
      intent: 'normativa',
      query: QUERY,
    });

    expect(llmCall.calls.length).toBe(3);
    expect(attempts).toBe(LLM_RETRY_MAX_ATTEMPTS);
    expect(retryCount).toBe(2);
    expect(outcome.status).toBe('invalid_response');
  });

  it('T5: JSON válido pero schema inválido → reintenta', async () => {
    const schemaInvalid = { foo: 'bar' };
    const llmCall = fakeLlmCall([schemaInvalid, emptyData]);
    const { outcome, attempts, retryCount } = await runJurisprudenceWithRetry({
      llmCall,
      sources: [ley21719()],
      intent: 'normativa',
      query: QUERY,
    });

    expect(attempts).toBe(2);
    expect(retryCount).toBe(1);
    expect(outcome.status).toBe('ok');
    expect(outcome.outcome).toBe('SUCCESS');
  });

  it('T6: NO_EVIDENCE (respuesta válida) → NO reintenta', async () => {
    const llmCall = fakeLlmCall([emptyData]);
    const { outcome, attempts, retryCount } = await runJurisprudenceWithRetry({
      llmCall,
      sources: [],
      intent: 'general',
      query: '¿Hay normativa sobre algo inexistente?',
    });

    expect(llmCall.calls.length).toBe(1);
    expect(attempts).toBe(1);
    expect(retryCount).toBe(0);
    expect(outcome.status).toBe('ok');
    expect(outcome.outcome).toBe('NO_EVIDENCE');
  });

  it('T7: error CONTEXT_TOO_LARGE → NO reintenta (propaga en 1 llamada)', async () => {
    const err = Object.assign(new Error('contexto muy grande'), { code: 'CONTEXT_TOO_LARGE' });
    const llmCall = fakeLlmCall([err]);

    await expect(
      runJurisprudenceWithRetry({ llmCall, sources: [ley21719()], intent: 'normativa', query: QUERY }),
    ).rejects.toThrow('contexto muy grande');
    expect(llmCall.calls.length).toBe(1);
  });

  it('T8: error de provider permanente → NO reintenta (propaga en 1 llamada)', async () => {
    const err = Object.assign(new Error('auth fail'), { code: 'AI_PROVIDER_AUTH' });
    const llmCall = fakeLlmCall([err]);

    await expect(
      runJurisprudenceWithRetry({ llmCall, sources: [ley21719()], intent: 'normativa', query: QUERY }),
    ).rejects.toThrow('auth fail');
    expect(llmCall.calls.length).toBe(1);
  });

  it('T9: el prompt de reintento NO incluye la salida inválida', async () => {
    const llmCall = fakeLlmCall([null, emptyData]);
    await runJurisprudenceWithRetry({
      llmCall,
      sources: [ley21719()],
      intent: 'normativa',
      query: QUERY,
    });

    const retryInstruction = llmCall.calls[1].retryInstruction;
    expect(retryInstruction).toBe(LLM_RETRY_PROMPT);
    expect(retryInstruction).toContain('JSON');
    expect(retryInstruction).not.toContain('INVALID_GARBAGE_CONTENT');
  });

  it('T10: el resultado final tras reintento pasa por la misma verificación que el primer intento', async () => {
    const llmCall = fakeLlmCall([null, emptyData]);
    const { outcome } = await runJurisprudenceWithRetry({
      llmCall,
      sources: [ley21719()],
      intent: 'normativa',
      query: QUERY,
    });

    expect(outcome.status).toBe('ok');
    expect(outcome.outcome).toBe('SUCCESS');
    expect(outcome.allVerifiedClaims.length).toBeGreaterThan(0);
    expect(outcome.allVerifiedClaims[0].source_id).toBe('bcn-1209272');
    expect(outcome.allVerifiedClaims[0].fragment_id).toBe('art-4');
    expect(outcome.allVerifiedClaims[0].fragmento).toContain('acceso, rectificación');
  });

  it('usage se acumula a través de los intentos', async () => {
    const llmCall = fakeLlmCall([null, null, emptyData]);
    const { usage } = await runJurisprudenceWithRetry({
      llmCall,
      sources: [ley21719()],
      intent: 'normativa',
      query: QUERY,
    });

    expect(usage.total_tokens).toBe(90);
    expect(usage.input_tokens).toBe(30);
    expect(usage.output_tokens).toBe(60);
    expect(usage.estimated_cost_usd).toBeCloseTo(0.003);
  });
});
