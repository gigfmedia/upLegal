import fetch from 'node-fetch';
import { providerUsage } from './modelCosts.mjs';
export { estimateAICostUsd } from './modelCosts.mjs';

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

// ---------------------------------------------------------------------------
// Clasificación de errores del proveedor (Fase 4.1.10).
// Convierte un status HTTP / cuerpo de error de OpenRouter en un error
// TIPADO (code) para que el pipeline distinga con certeza:
//   - AI_PROVIDER_RATE_LIMITED  → 429 OpenRouter (free models: rate-limit upstream)
//   - AI_PROVIDER_AUTH          → 401/403
//   - AI_PROVIDER_SERVER_ERROR  → 5xx temporales
//   - AI_PROVIDER_NETWORK       → fallo de red / timeout
//   - AI_PROVIDER_ERROR         → cualquier otro fallo del proveedor
// El mensaje devuelto es SIEMPRE seguro para el cliente (sin JSON crudo,
// sin "Darkbloom", sin metadata del proveedor). El detalle crudo queda en
// `error.detail` para logging interno, nunca para la UI.
// ---------------------------------------------------------------------------

const isRateLimitBody = (body) => {
  if (!body || typeof body !== 'object') return false;
  const error = body.error || {};
  const metadata = error.metadata || {};
  const rawText = `${String(metadata.raw || '')} ${String(metadata.provider_name || '')} ${String(error.message || '')}`;
  return error.code === 429 || /\b429\b/i.test(rawText) || /rate[ ._-]?limit/i.test(rawText);
};

/**
 * Clasifica un error del proveedor y devuelve un Error tipado.
 * @param {number} status - status HTTP real.
 * @param {string} text - cuerpo de la respuesta (para detectar 429 de OpenRouter).
 * @param {string|null} retryAfterSeconds - header Retry-After (para backoff).
 */
export function classifyProviderError(status, text = '', retryAfterSeconds = null) {
  const raw = String(text || '').slice(0, 300);
  const body = (() => {
    try {
      return JSON.parse(String(text || ''));
    } catch {
      return null;
    }
  })();

  let code;
  let message;
  let retriable;

  if (status === 429 || (status !== 401 && status !== 403 && isRateLimitBody(body))) {
    code = 'AI_PROVIDER_RATE_LIMITED';
    message =
      'El proveedor de IA está temporalmente limitado. Intenta nuevamente en unos minutos.';
    retriable = true;
  } else if (status === 401 || status === 403) {
    code = 'AI_PROVIDER_AUTH';
    message = 'No se pudo autenticar con el proveedor de IA. Contacta al equipo de LegalUp.';
    retriable = false;
  } else if (status >= 500) {
    code = 'AI_PROVIDER_SERVER_ERROR';
    message = 'El proveedor de IA presentó un error temporal. Intenta nuevamente en unos minutos.';
    retriable = true;
  } else if (
    String(body?.error?.code || '') === 'json_validate_failed' ||
    /json_validate_failed/i.test(raw)
  ) {
    // Fase 4.26.1.1 — 400 con json_validate_failed es RETRIABLE (retry + fallback)
    // El proveedor validó el JSON de salida contra response_format=json_object y falló.
    // Se tipa como AI_PROVIDER_JSON_VALIDATE_FAILED para que chatCompletion lo reintente.
    code = 'AI_PROVIDER_JSON_VALIDATE_FAILED';
    message = 'El proveedor de IA no pudo procesar la solicitud. Intenta nuevamente en unos minutos.';
    retriable = true;
  } else {
    code = 'AI_PROVIDER_ERROR';
    message = `El proveedor de IA no pudo completar la solicitud (${status}).`;
    retriable = false;
  }

  const parsedRetryAfter = Number(retryAfterSeconds);
  const error = new Error(message);
  error.status = status;
  error.code = code;
  error.retriable = retriable;
  error.retryAfter =
    retryAfterSeconds == null || !Number.isFinite(parsedRetryAfter) ? null : parsedRetryAfter;
  error.detail = raw; // solo logging interno, nunca al cliente.
  return error;
}

// ---------------------------------------------------------------------------
// Fase 4.2.10 — resiliencia del proveedor.
// Timeout por llamada (AbortController), reintentos con backoff que respetan
// Retry-After, límite global de llamadas por request y errores TIPADOS que se
// distinguen con certeza de NO_EVIDENCE (nunca se convierten en "no hay
// evidencia"). Configurable vía env (backend-only):
//   AI_PROVIDER_TIMEOUT_MS      → timeout total por fetch (por defecto 60000 ms)
//   AI_PROVIDER_RETRY_BACKOFF_MS→ backoff base (por defecto 1000 ms)
// ---------------------------------------------------------------------------
const AI_PROVIDER_TIMEOUT_MS = 60000; // por defecto; se lee del env al momento de la llamada.

// Reintentos máximos ante errores temporales (429/5xx/red/vacío). Nunca para
// 401/403, ni errores de schema/prompt. El presupuesto global por request
// (MAX_LLM_CALLS_PER_REQUEST) impide que provider + schema retry se multipliquen
// sin cota: cada llamada agota el mismo budget compartido.
const MAX_PROVIDER_RETRIES = 2;
const RETRY_BACKOFF_MS = Number(process.env.AI_PROVIDER_RETRY_BACKOFF_MS) || 1000;
const MAX_RETRY_AFTER_MS = 5000; // tope para Retry-After (no bloquear al abogado)
const MAX_LLM_CALLS_PER_REQUEST = 6; // presupuesto global de llamadas por request

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Delay de reintento: respeta el header Retry-After del proveedor (con tope) o
 * usa backoff lineal por intento. Puro y testeable.
 * @param {{ attempt: number, retryAfterSeconds?: number|null,
 *   baseBackoffMs?: number, maxRetryAfterMs?: number }} input
 */
export function resolveRetryDelayMs({
  attempt,
  retryAfterSeconds = null,
  baseBackoffMs = RETRY_BACKOFF_MS,
  maxRetryAfterMs = Number(process.env.AI_PROVIDER_MAX_RETRY_AFTER_MS) || MAX_RETRY_AFTER_MS,
}) {
  if (attempt <= 0) return 0;
  const seconds = Number(retryAfterSeconds);
  if (Number.isFinite(seconds) && seconds > 0) {
    return Math.min(seconds * 1000, maxRetryAfterMs);
  }
  return baseBackoffMs * attempt;
}

/**
 * Presupuesto compartido de llamadas al LLM para una MISMA request (Fase
 * 4.2.10). Se crea en la ruta y se comparte entre el retry de provider (dentro
 * de chatCompletion) y el retry de schema (runJurisprudenceWithRetry) para que
 * el total de fetch por request sea determinista y acotado.
 */
export function createLlmCallBudget(maxCalls = MAX_LLM_CALLS_PER_REQUEST) {
  return { maxCalls: Math.max(1, maxCalls), calls: 0 };
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
 * Reintenta UNA vez con backoff breve los errores temporales tipados
 * (AI_PROVIDER_RATE_LIMITED, AI_PROVIDER_SERVER_ERROR, AI_PROVIDER_NETWORK).
 * No lanza por "JSON inválido": entrega `data: null` y deja que el llamador
 * decida (p. ej. el chat usa `raw` como respuesta directa).
 */
export async function chatCompletion({ model, system, user, messages, maxTokens = 4000, temperature = 0.2, budget = null, metering = null }) {
  const startedAt = Date.now();
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
    // Fase 4.2.10: presupuesto global compartido (provider + schema retry).
    // Al agotarse se lanza un error tipado NO reintentable: el total de fetch
    // por request queda determinista y acotado.
    if (budget) {
      if (budget.calls >= budget.maxCalls) {
        const err = new Error(
          'Se alcanzó el límite de llamadas al proveedor de IA para esta consulta. Intenta nuevamente en unos minutos.'
        );
        err.status = 503;
        err.code = 'AI_PROVIDER_CALL_LIMIT';
        err.retriable = false;
        throw err;
      }
      budget.calls += 1;
    }

    const attemptStartedAt = Date.now();
    const provider = detectAIProvider(baseUrl);
    // UTF-8 byte length is a conservative input estimate, not a measured token count.
    // Each retry reserves independently; known usage from prior attempts is retained.
    const attemptId = metering ? await metering.beginAttempt({
      provider, model, budget: Buffer.byteLength(JSON.stringify(chatMessages), 'utf8') + maxTokens + 1024,
    }) : null;
    let attemptUsage = providerUsage(null, model, provider);
    let attemptError = null;
    try {
    const body = withJsonMode ? payload : { ...payload, response_format: undefined };
    // Fase 4.2.10: timeout por llamada con AbortController. Se lee del env en
    // cada llamada para permitir ajuste por entorno/test sin reiniciar el módulo.
    // Si se aborta por nuestro timer se tipa como AI_PROVIDER_TIMEOUT (distinto
    // de NO_EVIDENCE); si el AbortError viene de fuera, cae como fallo de red.
    const timeoutMs = Number(process.env.AI_PROVIDER_TIMEOUT_MS) || AI_PROVIDER_TIMEOUT_MS;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
      response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (netError) {
      if (controller.signal.aborted) {
        // Abortó nuestro timer de timeout: fallo TIPADO, distinto de NO_EVIDENCE.
        const error = new Error(
          'El servicio de IA está tardando más de lo esperado. Intenta nuevamente.'
        );
        error.status = 504;
        error.code = 'AI_PROVIDER_TIMEOUT';
        error.retriable = false;
        error.detail = 'request timed out'; // solo logging interno.
        throw error;
      }
      // Fallo de red (ECONNRESET/ECONNREFUSED/ETIMEDOUT/UND_ERR_CONNECT_TIMEOUT/
      // socket hang up/fetch failed). Un AbortError externo (sin nuestro timer)
      // cae aquí también: es un fallo de conectividad, no un timeout propio.
      const error = new Error(
        'No se pudo conectar con el proveedor de IA. Intenta nuevamente en unos minutos.'
      );
      error.status = 502;
      error.code = 'AI_PROVIDER_NETWORK';
      error.retriable = true;
      error.detail = String(netError?.message || 'network error');
      throw error;
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      const text = await response.text();
      try { attemptUsage = providerUsage(JSON.parse(text), model, provider); } catch { /* metadata unavailable */ }
      attemptUsage.provider_request_id ||= response.headers?.get?.('x-request-id') || null;
      const retryAfter = response.headers?.get?.('retry-after') ?? null;
      throw classifyProviderError(response.status, text, retryAfter);
    }

    const data = await response.json();
    attemptUsage = providerUsage(data, model, provider);
    attemptUsage.provider_request_id ||= response.headers?.get?.('x-request-id') || null;
    if (data?.error) {
      const isJsonValidateFailed = data.error.code === 'json_validate_failed';
      const status = isJsonValidateFailed ? 400 : response.status;
      const error = new Error(
        'El proveedor de IA no pudo procesar la solicitud. Intenta nuevamente en unos minutos.'
      );
      error.status = status;
      error.code = isJsonValidateFailed ? 'AI_PROVIDER_JSON_VALIDATE_FAILED' : 'AI_PROVIDER_ERROR';
      error.retriable = isJsonValidateFailed;
      error.detail = String(data.error.message || JSON.stringify(data.error)).slice(0, 300);
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
        err.retriable = false;
        throw err;
      }
      // Fase 4.2.10: respuesta HTTP 200 sin contenido (choices vacío o content
      // null/vacío) es un fallo TIPADO del proveedor, con retry controlado y
      // NUNCA se convierte en NO_EVIDENCE.
      const err = new Error(
        'El proveedor de IA no devolvió contenido. Intenta nuevamente en unos minutos.'
      );
      err.status = 502;
      err.code = 'AI_PROVIDER_EMPTY_RESPONSE';
      err.retriable = true;
      throw err;
    }

    let parsed = null;
    try {
      parsed = extractJson(content);
    } catch {
      parsed = null; // Texto sin JSON válido: el llamador puede usar `raw`.
    }

    return {
      data: parsed,
      raw: content,
      usage: attemptUsage,
    };
    } catch (error) {
      attemptError = error;
      throw error;
    } finally {
      if (metering && attemptId) await metering.finishAttempt(attemptId, {
        actual_model: attemptUsage.actual_model,
        provider_request_id: attemptUsage.provider_request_id,
        prompt_tokens: attemptUsage.input_tokens,
        completion_tokens: attemptUsage.output_tokens,
        total_tokens: attemptUsage.total_tokens,
        provider_cost_actual: attemptUsage.provider_cost_actual,
        provider_cost_estimated: attemptUsage.estimated_cost_usd,
        usage_details: attemptUsage.usage_details,
        latency_ms: Date.now() - attemptStartedAt,
        status: attemptError ? 'failed' : 'succeeded',
        error_code: attemptError?.code || (attemptError ? 'AI_PROVIDER_ERROR' : null),
      });
    }
  };

  // Un intento, reintentando una vez con `response_format: json_object`
  // desactivado si el proveedor lo rechaza (HTTP 400/422), y con backoff breve
  // si el error es temporal (429/5xx/red).
  const attemptWithJsonFallback = async () => {
    try {
      return await attempt(true);
    } catch (error) {
      if (error.status === 400 || error.status === 422) {
        return await attempt(false);
      }
      throw error;
    }
  };

  let lastError = null;
  for (let retry = 0; retry <= MAX_PROVIDER_RETRIES; retry += 1) {
    try {
      if (retry > 0) {
        await sleep(
          resolveRetryDelayMs({
            attempt: retry,
            retryAfterSeconds: lastError?.retryAfter ?? null,
          }),
        );
      }
      return await attemptWithJsonFallback();
    } catch (error) {
      lastError = error;
      if (error.retriable === true && retry < MAX_PROVIDER_RETRIES) continue;
      error.latencyMs = Date.now() - startedAt; // solo metadata de logging.
      throw error;
    }
  }
  throw lastError;
}
