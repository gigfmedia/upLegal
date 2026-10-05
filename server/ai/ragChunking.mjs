/**
 * FASE 4.61B — chunking determinista de evidencia documental cruda.
 *
 * - Solo texto extraído original (nunca outputs generados).
 * - Normalización mínima: espacios, sin tocar puntuación/fechas/RUTs.
 * - Páginas: se derivan de los marcadores `--- Página N ---` de la
 *   extracción; si no existen, page_start/end quedan NULL (nunca inventar).
 * - Versiones explícitas para reindex controlado.
 */
import { createHash } from 'node:crypto';

export const RAG_CHUNK_TARGET_CHARS = 2400;
export const RAG_CHUNK_MAX_CHARS = 3000;
export const RAG_CHUNK_OVERLAP_CHARS = 300;
export const RAG_CHUNKING_VERSION = 'case-rag-chunk-v1';
export const RAG_EXTRACTION_VERSION = 'pdf-pages-v1';

const PAGE_MARKER_RE = /^--- Página (\d+) ---\s*$/gm;

/**
 * Divide el texto extraído en segmentos por página.
 * @returns {Array<{page:number,text:string}>} page=null si no hay marcadores.
 */
export function splitPages(text) {
  const matches = [...String(text || '').matchAll(PAGE_MARKER_RE)];
  if (matches.length === 0) return [{ page: null, text: String(text || '') }];
  const segments = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    segments.push({ page: Number(matches[i][1]), text: text.slice(start, end) });
  }
  return segments.filter((s) => s.text.trim().length > 0);
}

function normalizeWhitespace(text) {
  return String(text || '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Heurística barata de encabezado: primera línea no vacía del chunk si es
 * corta (<=120 chars). NULL en caso contrario. Sin LLM.
 */
export function detectHeading(chunkText) {
  const first = String(chunkText || '').split('\n').map((l) => l.trim()).find((l) => l.length > 0);
  if (!first || first.length > 120) return null;
  return first;
}

function splitLongParagraph(para, maxChars) {
  // Párrafo gigante: corte por frase aproximada, luego duro como fallback.
  const out = [];
  let rest = para;
  while (rest.length > maxChars) {
    const window = rest.slice(0, maxChars);
    const m = window.match(/.*[.?!;]\s(?=[A-ZÁÉÍÓÚÑ0-9])/);
    const cut = m ? m[0].length : maxChars;
    out.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) out.push(rest);
  return out.filter(Boolean);
}

/**
 * Fragmenta un segmento (idealmente una página) en piezas <= maxChars
 * prefiriendo párrafos, luego saltos de línea, luego frase, luego corte duro.
 */
export function chunkSegment(segmentText, { targetChars = RAG_CHUNK_TARGET_CHARS, maxChars = RAG_CHUNK_MAX_CHARS } = {}) {
  const paras = normalizeWhitespace(segmentText).split('\n').map((p) => p.trim()).filter(Boolean);
  const pieces = [];
  for (const para of paras) {
    if (para.length <= maxChars) pieces.push(para);
    else pieces.push(...splitLongParagraph(para, maxChars));
  }
  // Empaqueta piezas hasta target (conserva orden).
  const chunks = [];
  let current = '';
  for (const piece of pieces) {
    if (!current) {
      current = piece;
    } else if ((current + '\n\n' + piece).length <= targetChars) {
      current = `${current}\n\n${piece}`;
    } else {
      chunks.push(current);
      current = piece;
    }
  }
  if (current) chunks.push(current);
  return chunks.filter(Boolean);
}

export function sha256Hex(text) {
  return createHash('sha256').update(String(text ?? ''), 'utf8').digest('hex');
}

/**
 * Chunking completo de un texto extraído.
 * @returns {Array<{content,content_hash,page_start,page_end,heading,chunk_index}>}
 *   chunk_index es secuencial global (con solape aplicado entre chunks).
 */
export function chunkDocumentText(text, opts = {}) {
  const overlap = opts.overlapChars ?? RAG_CHUNK_OVERLAP_CHARS;
  const segments = splitPages(text);
  const raw = [];
  for (const seg of segments) {
    for (const piece of chunkSegment(seg.text, opts)) {
      raw.push({ content: piece, page_start: seg.page, page_end: seg.page });
    }
  }
  // Solape: sufijo del chunk anterior como prefijo (recorte a overlap).
  const chunks = raw.map((r, i) => {
    let content = r.content;
    if (i > 0 && overlap > 0) {
      const prevTail = raw[i - 1].content.slice(-overlap);
      content = `${prevTail}\n\n[...]\n\n${r.content}`;
    }
    return {
      content,
      content_hash: sha256Hex(content),
      page_start: r.page_start,
      page_end: r.page_end,
      heading: detectHeading(r.content),
      chunk_index: i,
    };
  });
  return chunks;
}
