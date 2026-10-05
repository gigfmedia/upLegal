/**
 * FASE 4.61B — embeddings de evidencia documental cruda.
 *
 * Mismo proveedor OpenAI-compatible ya configurado (base URL + API key del
 * chat/analysis). Un único modelo canónico, sin fallback multi-provider.
 * Entrada: contenido del chunk + filename/heading estructurales (no
 * generados). Lotes para baja sobrecarga. Sin stopwords ni mutaciones.
 */

const getBaseUrl = () =>
  (process.env.AI_PROVIDER_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
const getApiKey = () =>
  process.env.AI_PROVIDER_API_KEY || process.env.OPENAI_API_KEY || '';

export const RAG_EMBEDDING_MODEL = 'text-embedding-3-small';
export const RAG_EMBEDDING_VERSION = 'te3-small-v1';
export const RAG_EMBEDDING_DIMS = 1536;
export const RAG_EMBED_BATCH_SIZE = 64;

export function embeddingInputFor({ filename = '', heading = '', content = '' } = {}) {
  const head = [filename ? `[${String(filename).slice(0, 200)}]` : '', heading ? String(heading).slice(0, 200) : '']
    .filter(Boolean)
    .join('\n');
  return head ? `${head}\n${content}` : String(content);
}

/**
 * Genera embeddings para un lote de inputs.
 * @param {string[]} inputs
 * @returns {Promise<{embeddings:number[][], model:string}>}
 */
export async function embedBatch(inputs, { fetchFn = fetch, batchSize = RAG_EMBED_BATCH_SIZE } = {}) {
  if (!getApiKey()) throw new Error('EMBEDDING_PROVIDER_NOT_CONFIGURED');
  const out = [];
  for (let i = 0; i < inputs.length; i += batchSize) {
    const batch = inputs.slice(i, i + batchSize);
    const res = await fetchFn(`${getBaseUrl()}/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getApiKey()}` },
      body: JSON.stringify({ model: RAG_EMBEDDING_MODEL, input: batch }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`EMBEDDING_REQUEST_FAILED:${res.status}:${text.slice(0, 200)}`);
    }
    const body = await res.json().catch(() => ({}));
    const items = Array.isArray(body?.data) ? body.data : [];
    if (items.length !== batch.length) {
      throw new Error(`EMBEDDING_COUNT_MISMATCH:${items.length}/${batch.length}`);
    }
    items.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    for (const item of items) {
      if (!Array.isArray(item.embedding) || item.embedding.length !== RAG_EMBEDDING_DIMS) {
        throw new Error(`EMBEDDING_DIMS_MISMATCH:${item?.embedding?.length}`);
      }
      out.push(item.embedding);
    }
  }
  return { embeddings: out, model: RAG_EMBEDDING_MODEL };
}
