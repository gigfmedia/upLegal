/**
 * FASE 4.59B — Research becomes Case memory.
 *
 * Funciones puras (sin IO) para seleccionar y formatear investigaciones
 * previas como contexto legal del caso. El consumidor canónico es
 * buildChatContext (Case Chat) y la ruta intelligence (campo legalContext).
 *
 * Reglas:
 * - Solo research EXITOSO entra (la tabla solo contiene éxito: el insert
 *   ocurre únicamente tras pipeline ok; fallos responden 4xx/5xx sin fila).
 * - Selección determinista: recencia + solapamiento léxico con la pregunta.
 *   Sin embeddings ni infraestructura nueva.
 * - Presupuesto acotado: la memoria NUNCA desplaza evidencia documental.
 * - Provenance explícita: cada bloque declara query, fecha y fuentes.
 */

const STOP_ES = new Set(
  'el la los las un una unos unas de del en y o que se su sus por para con como más pero este esta estos estas ese esa eso aquí hay fue son ser está están tienen tiene hacer hace desde entre hasta cada cual cuales donde cuando quien qué cuál cómo porqué porque ello ello mismo misma esto estos este'.split(' ')
);

export function researchTokens(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9áéíóúñü]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length > 3 && !STOP_ES.has(t));
}

function sourceLabel(source) {
  if (!source || typeof source !== 'object') return null;
  const title = source.title || source.citation || source.id || null;
  if (!title) return null;
  const kind = source.kind || source.source_type || source.type || null;
  const url = typeof source.url === 'string' && source.url ? source.url : null;
  return { title: String(title), kind: kind ? String(kind) : null, url };
}

/**
 * Selección determinista de research relevante.
 * @param {object} opts
 * @param {Array} opts.researchList filas ai_research_requests {id,query,answer,sources,created_at}
 * @param {string} opts.question pregunta actual (puede ser '')
 * @param {number} opts.maxItems tope de items (default 3)
 * @param {number} opts.maxChars tope de chars del bloque formateado (default 6000)
 * @returns {Array} items {id,query,created_at,answer,sources:[{title,kind,url}],score}
 */
export function selectRelevantResearch({ researchList = [], question = '', maxItems = 3, maxChars = 6000 } = {}) {
  const rows = (Array.isArray(researchList) ? researchList : []).filter(
    (r) => r && r.id && typeof r.query === 'string' && typeof r.answer === 'string' && r.answer.trim().length > 0
  );
  if (!rows.length || maxItems <= 0 || maxChars <= 0) return [];
  const qTokens = new Set(researchTokens(question));
  const scored = rows.map((r, idx) => {
    const hay = new Set([...researchTokens(r.query), ...researchTokens(r.answer).slice(0, 400)]);
    let overlap = 0;
    for (const t of qTokens) if (hay.has(t)) overlap += 1;
    // Recencia como desempate estable: índice en lista ordenada desc ya viene
    // del caller; además se prefiere created_at mayor.
    return { row: r, idx, overlap, created: String(r.created_at || '') };
  });
  scored.sort((a, b) => {
    if (b.overlap !== a.overlap) return b.overlap - a.overlap;
    if (b.created !== a.created) return b.created < a.created ? -1 : 1;
    return a.idx - b.idx;
  });
  const selected = [];
  let used = 0;
  for (const s of scored) {
    if (selected.length >= maxItems) break;
    const sources = (Array.isArray(s.row.sources) ? s.row.sources : [])
      .map(sourceLabel)
      .filter(Boolean)
      .slice(0, 8);
    const answer = String(s.row.answer).slice(0, 2500);
    const item = {
      id: String(s.row.id),
      query: String(s.row.query).slice(0, 500),
      created_at: s.row.created_at || null,
      answer,
      sources,
      score: s.overlap,
    };
    const itemChars =
      item.query.length + item.answer.length + sources.reduce((n, x) => n + x.title.length + (x.url || '').length, 0);
    if (used + itemChars > maxChars) continue;
    used += itemChars;
    selected.push(item);
  }
  return selected;
}

/**
 * Bloque de contexto para Case Chat. Etiqueta explícita: síntesis previa,
 * NO hechos del caso, NO legislación vigente per se.
 */
export function formatResearchMemory(selected) {
  if (!Array.isArray(selected) || !selected.length) return '';
  const blocks = selected.map((item, i) => {
    const lines = [
      `INVESTIGACIÓN PREVIA ${i + 1} (síntesis de una investigación anterior de este mismo caso; NO son hechos del caso ni norma vigente sin verificar vigencia):`,
      `Pregunta original: ${item.query}`,
      `Fecha de la investigación: ${item.created_at || 'no registrada'}`,
      `Síntesis: ${item.answer}`,
    ];
    if (item.sources.length) {
      lines.push(
        `Fuentes que la respaldaron: ${item.sources
          .map((s) => `${s.title}${s.kind ? ` (${s.kind})` : ''}${s.url ? ` — ${s.url}` : ''}`)
          .join(' | ')}`
      );
    } else {
      lines.push('Fuentes que la respaldaron: no registradas en esta investigación.');
    }
    return lines.join('\n');
  });
  return [
    'MEMORIA DE INVESTIGACIÓN DEL CASO (contexto legal secundario):',
    'Lo siguiente son síntesis de investigaciones jurídicas previas realizadas para este mismo caso. Úsalas como contexto legal orientativo con su fecha y fuentes. Nunca las presentes como hechos del caso ni como legislación vigente sin verificar; si contradicen la evidencia documental del caso, prima el documento.',
    ...blocks,
  ].join('\n\n');
}

/**
 * Representación mínima para intelligence.legalContext: query/fecha/síntesis
 * acotada + títulos de fuentes. Explícitamente NO hechos del caso.
 */
export function formatResearchLegalContext(selected) {
  if (!Array.isArray(selected) || !selected.length) return [];
  return selected.map((item) => ({
    research_id: item.id,
    query: item.query,
    created_at: item.created_at,
    synthesis: String(item.answer).slice(0, 1200),
    source_titles: item.sources.map((s) => s.title).slice(0, 8),
    source_urls: item.sources.map((s) => s.url).filter(Boolean).slice(0, 8),
  }));
}
