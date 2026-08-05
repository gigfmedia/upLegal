import fetch from 'node-fetch';

// ---------------------------------------------------------------------------
// Proveedor de IA (compatible con la API de OpenAI: OpenAI, OpenRouter, Groq…)
// Configuración en .env.local (backend-only, sin prefijo VITE_):
//   AI_PROVIDER_API_KEY = <api key del proveedor>
//   AI_PROVIDER_BASE_URL = https://api.openai.com/v1   (por defecto)
//   AI_DEFAULT_MODEL = gpt-4o-mini                      (por defecto)
// ---------------------------------------------------------------------------

const getBaseUrl = () =>
  (process.env.AI_PROVIDER_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
const getApiKey = () => process.env.AI_PROVIDER_API_KEY || process.env.OPENAI_API_KEY || '';

export function isAIProviderConfigured() {
  return Boolean(getApiKey());
}

// Costo estimado por 1.000 tokens (USD) según modelo, usado para cost tracking.
// Los valores siguen las tarifas públicas de OpenAI; si un modelo no está en el
// mapa se usa el costo por defecto. Se puede sobrescribir con AI_MODEL_COSTS_JSON.
const MODEL_COST_USD_PER_1K = {
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-4o': { input: 0.0025, output: 0.01 },
  'gpt-4.1-mini': { input: 0.0004, output: 0.0016 },
  'gpt-4.1': { input: 0.002, output: 0.008 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  default: { input: 0.00015, output: 0.0006 },
};

/** Costo estimado en USD de una llamada según modelo y tokens usados. */
export function estimateAICostUsd(model, inputTokens, outputTokens) {
  const key = String(model || '').toLowerCase();
  const price = MODEL_COST_USD_PER_1K[key] || MODEL_COST_USD_PER_1K.default;
  return (inputTokens / 1000) * price.input + (outputTokens / 1000) * price.output;
}

/** Nombre corto del proveedor a partir de la base URL (openai, openrouter, groq…). */
export function detectAIProvider(baseUrl) {
  try {
    const host = new URL(baseUrl).hostname;
    if (host.includes('openrouter')) return 'openrouter';
    if (host.includes('groq')) return 'groq';
    if (host.includes('deepseek')) return 'deepseek';
    if (host.includes('anthropic')) return 'anthropic';
    if (host.includes('openai')) return 'openai';
    return host;
  } catch {
    return 'unknown';
  }
}

/** Extrae y parsea el JSON de la respuesta, tolerando bloques markdown. */
function extractJson(text) {
  const cleaned = String(text)
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '')
    .trim();

  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) {
    throw new Error('La respuesta del modelo no contiene un JSON válido.');
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}

/**
 * Realiza un chat completion y devuelve:
 *   { data, raw, usage }
 * - data: el JSON parseado de la respuesta, o null si el proveedor devolvió
 *   texto que no contiene un objeto JSON válido.
 * - raw: el contenido crudo devuelto por el modelo (útil como fallback).
 * - usage: tokens y costo estimado para cost tracking.
 * Intenta primero con `response_format: json_object` y, si el proveedor lo
 * rechaza (HTTP 400/422), reintenta sin ese parámetro (compatibilidad).
 * No lanza por "JSON inválido": entrega `data: null` y deja que el llamador
 * decida (p. ej. el chat usa `raw` como respuesta directa).
 */
export async function chatCompletion({ model, system, user, messages, maxTokens = 4000, temperature = 0.2 }) {
  const apiKey = getApiKey();
  const baseUrl = getBaseUrl();

  if (!apiKey) {
    const error = new Error(
      'El servicio de IA no está configurado. Agrega AI_PROVIDER_API_KEY en .env.local.'
    );
    error.code = 'AI_NOT_CONFIGURED';
    throw error;
  }

  // Si se pasa `messages`, se usa como historial (con el system prompt al inicio).
  // Si no, se usa el patrón simple [system, user].
  const chatMessages = messages
    ? [{ role: 'system', content: system }, ...messages]
    : [{ role: 'system', content: system }, { role: 'user', content: user }];

  const payload = {
    model,
    messages: chatMessages,
    temperature,
    max_tokens: maxTokens,
    response_format: { type: 'json_object' },
  };

  const attempt = async (withJsonMode) => {
    const body = withJsonMode ? payload : { ...payload, response_format: undefined };
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      const error = new Error(`Proveedor IA respondió ${response.status}: ${text.slice(0, 300)}`);
      error.status = response.status;
      throw error;
    }

    const data = await response.json();
    if (data?.error) {
      const error = new Error(`Proveedor IA: ${data.error.message || JSON.stringify(data.error)}`);
      error.status = data.error.code === 'json_validate_failed' ? 400 : response.status;
      throw error;
    }
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      // Con modelos de razonamiento (p. ej. gpt-oss), un presupuesto de tokens
      // insuficiente agota el `max_tokens` en el campo `reasoning` y deja el
      // `content` vacío. Distinguimos el caso para dar un mensaje accionable.
      const finish = data?.choices?.[0]?.finish_reason;
      const reasoning = data?.choices?.[0]?.message?.reasoning;
      if (finish === 'length' || (!content && reasoning)) {
        const err = new Error(
          'La respuesta superó el presupuesto de tokens del proveedor. Intenta de nuevo con una pregunta más acotada.'
        );
        err.status = 507;
        err.code = 'OUTPUT_TOKEN_LIMIT';
        throw err;
      }
      throw new Error('El proveedor IA no devolvió contenido.');
    }

    const usage = data?.usage || {};
    const inputTokens = usage.prompt_tokens ?? 0;
    const outputTokens = usage.completion_tokens ?? 0;
    const totalTokens = usage.total_tokens ?? inputTokens + outputTokens;

    let parsed = null;
    try {
      parsed = extractJson(content);
    } catch {
      parsed = null; // Texto sin JSON válido: el llamador puede usar `raw`.
    }

    return {
      data: parsed,
      raw: content,
      usage: {
        provider: detectAIProvider(baseUrl),
        model,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: totalTokens,
        estimated_cost_usd: estimateAICostUsd(model, inputTokens, outputTokens),
      },
    };
  };

  try {
    return await attempt(true);
  } catch (error) {
    if (error.status === 400 || error.status === 422) {
      return await attempt(false);
    }
    throw error;
  }
}
