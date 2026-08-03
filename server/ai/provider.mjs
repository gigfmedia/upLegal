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
 * Realiza un chat completion y devuelve la respuesta parseada como objeto.
 * Intenta primero con `response_format: json_object` y, si el proveedor lo
 * rechaza (HTTP 400/422), reintenta sin ese parámetro (compatibilidad).
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
      throw new Error('El proveedor IA no devolvió contenido.');
    }
    return extractJson(content);
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
