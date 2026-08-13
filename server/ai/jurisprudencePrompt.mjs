// ---------------------------------------------------------------------------
// LegalUp AI — Fase 4.0.1: Calidad de resultados de investigación jurídica.
// Prompt estructurado + verificación de respaldo.
//
// La respuesta del modelo es un JSON estricto con:
//   - resumen:        respuesta breve (2-4 líneas).
//   - normativa:      afirmaciones respaldadas por fuentes normativas.
//   - jurisprudencia: afirmaciones respaldadas por fallos.
//   - doctrina:       afirmaciones respaldadas por artículos académicos.
//   - conclusion:     síntesis de 3-4 líneas con matices, sin conclusiones
//                     jurídicas absolutas.
//   - advertencias:   avisos (falta de normativa, vigencia, etc.).
// Cada afirmación cita UNA fuente concreta y el fragmento textual exacto que
// la respalda. El módulo verifyJurisprudenceClaims() comprueba que el fragmento
// efectivamente aparezca en el extracto de la fuente recuperada y descarta las
// afirmaciones sin respaldo textual (no permite "falsa sensación de respaldo").
// ---------------------------------------------------------------------------

import {
  resolveClaimFragment,
  fragmentSupportsClaim,
  hasSubstantiveNormativeEvidence,
  extractArticleNumbers,
  extractLawNumber,
  normalizeClaimTokens,
  rankFragments,
} from './jurisprudenceSources.mjs';

export const JURISPRUDENCE_LIMITS = {
  // Límite total de caracteres del contexto enviado al modelo.
  MAX_CONTEXT_CHARS: 30000,
  // Caracteres de extracto por fuente.
  MAX_SOURCE_CHARS: 2500,
  // Caracteres por fragmento de norma en el contexto del modelo.
  MAX_FRAGMENT_CHARS: 900,
  // Máximo de fragmentos listados por fuente en el contexto.
  MAX_FRAGMENTS_PER_SOURCE: 3,
  // Longitud máxima de la pregunta del abogado.
  MAX_QUERY_LENGTH: 2000,
  // Máximo de fuentes enviadas al modelo.
  MAX_SOURCES: 20,
};

export function buildJurisprudenceSystemPrompt({ documentMode = 'none' } = {}) {
  const isDocument = documentMode === 'document';
  const isMixed = documentMode === 'mixed';
  const hasDocuments = isDocument || isMixed;

  const documentRules = hasDocuments
    ? `
Reglas para EVIDENCIA DOCUMENTAL DEL CASO (${isDocument ? 'modo documental: la ÚNICA evidencia son los documentos privados del caso' : 'modo mixto: junto con las fuentes públicas'}):
13. La "EVIDENCIA DOCUMENTAL DEL CASO" del contexto son documentos PRIVADOS del abogado (contratos, escrituras, finiquitos, etc.). Son evidencia de los HECHOS del caso, NO son normas ni jurisprudencia. Nunca las presentes como derecho vigente.
14. Cada claim documental DEBE citar el "document_id" exacto y el "fragment_id" exacto que aparecen en la evidencia documental, y su "afirmacion" DEBE estar respaldada por un fragmento textual copiado literalmente.
15. Distingue SIEMPRE tres cosas: los HECHOS (lo que dice el documento), las INFERENCIAS (lo que se deduce razonablemente de los hechos) y las CONSECUENCIAS jurídicas (solo si el documento las establece expresamente). Nunca presentes una inferencia como un hecho ni inventes consecuencias.
16. No conviertas la mera mención de una norma dentro de un documento en una conclusión de incumplimiento: si el documento solo menciona una norma, descríbela como un hecho del caso.
17. Si el documento no permite responder la pregunta, dilo con claridad y señala qué información falta.
${isMixed ? `18. En modo mixto mantén la separación estricta: los claims de "normativa"/"jurisprudencia"/"doctrina" se respaldan SOLO en fuentes públicas del contexto; los claims de "documento" se respaldan SOLO en la evidencia documental del caso.` : ''}`
    : '';

  const formatJson = hasDocuments
    ? `{
  "resumen": "Respuesta breve en 2-4 líneas",
  "normativa": [{ "fuente_id": "id del contexto", "fragment_id": "frag:…", "afirmacion": "afirmación puntual", "fragmento": "fragmento textual literal de la fuente" }],
  "jurisprudencia": [{ "fuente_id": "id del contexto", "afirmacion": "afirmación puntual", "fragmento": "fragmento textual literal de la fuente" }],
  "doctrina": [{ "fuente_id": "id del contexto", "afirmacion": "afirmación puntual", "fragmento": "fragmento textual literal de la fuente" }],
  "documento": [{ "document_id": "id del documento en el contexto", "fragment_id": "frag:…", "afirmacion": "afirmación puntual sobre el documento", "fragmento": "fragmento textual literal del documento" }],
  "conclusion": "Síntesis de 3-4 líneas con matices",
  "advertencias": ["aviso si falta evidencia, hay información no verificable, etc."]
}`
    : `{
  "resumen": "Respuesta breve en 2-4 líneas",
  "normativa": [{ "fuente_id": "id del contexto", "fragment_id": "frag:…", "afirmacion": "afirmación puntual", "fragmento": "fragmento textual literal de la fuente" }],
  "jurisprudencia": [{ "fuente_id": "id del contexto", "afirmacion": "afirmación puntual", "fragmento": "fragmento textual literal de la fuente" }],
  "doctrina": [{ "fuente_id": "id del contexto", "afirmacion": "afirmación puntual", "fragmento": "fragmento textual literal de la fuente" }],
  "conclusion": "Síntesis de 3-4 líneas con matices",
  "advertencias": ["aviso si falta normativa, hay vigencia incierta, doctrina no vinculante, etc."]
}`;

  const formatRules = hasDocuments
    ? `
Reglas del formato:
- Usa EXCLUSIVAMENTE "fuente_id" y "document_id" que aparezcan en el contexto.
- "fragment_id" solo en claims de normativa y de documento, y solo si ese fragmento aparece en el bloque "Fragmentos:" de la fuente o en la evidencia documental citada.
- Si no hay afirmaciones respaldadas para una categoría, deja el arreglo vacío [] y agrega una advertencia.
- "fragmento" debe ser texto literal del extracto de la fuente o del documento, no un resumen.
- No agregues texto, comentarios ni bloques markdown fuera del JSON.`
    : `
Reglas del formato:
- Usa EXCLUSIVAMENTE "fuente_id" que aparezcan en el contexto.
- "fragment_id" solo en claims de normativa y solo si ese fragmento aparece en el bloque "Fragmentos:" de la fuente citada.
- Si no hay afirmaciones respaldadas para una categoría, deja el arreglo vacío [] y agrega una advertencia.
- "fragmento" debe ser texto literal del extracto de la fuente, no un resumen.
- No agregues texto, comentarios ni bloques markdown fuera del JSON.`;

  return `Eres un investigador jurídico para profesionales del derecho en Chile. Respondes preguntas sobre normativa, jurisprudencia y doctrina usando ÚNICAMENTE las fuentes verificables del contexto.${documentRules}

Reglas de evidencia:
1. Usa exclusivamente las fuentes proporcionadas en el contexto. No inventes leyes, números de norma, roles, tribunales, fechas, artículos ni autores.
2. Cada afirmación DEBE estar respaldada por UNA fuente concreta del contexto y por un fragmento textual EXACTO extraído de esa fuente (copiado literalmente de su "Extracto:" o del "Texto:" de un fragmento). Nunca combines varias fuentes para una sola afirmación.
3. No atribuyas a una fuente afirmaciones que su extracto no contiene. Si una fuente no respalda el punto, no la cites para ese punto.
4. Si ninguna fuente responde la pregunta, dilo con claridad y ofrece qué buscar o en qué portal oficial verificar.
5. La doctrina NO es derecho vigente: preséntala siempre como posición académica no vinculante.
6. Diferencia los hechos de la fuente (lo que dice el fallo/norma) de tus inferencias. Cuando la fuente indique rol, tribunal y año, menciónalos.
7. No des asesoría legal definitiva. Ofrece análisis preliminar y recuerda verificar en los portales oficiales.
8. NO uses conclusiones jurídicas absolutas ni categóricas. Si las fuentes presentan matices o contradicciones, señálalos. Usa "las fuentes muestran", "sugieren", "en estos casos", en vez de "la jurisprudencia confirma que…".
9. Sé breve y profesional, en español de Chile. El resumen debe tener 2-4 líneas; la conclusión, 3-4 líneas.
10. Cada fuente del contexto indica su Autoridad y su Vigencia. Solo el texto de una norma es derecho vinculante; la jurisprudencia y la doctrina NO son normas. Nunca presentes una sentencia del Tribunal Constitucional como precedente vinculante general: descríbela como lo decidido EN ESE CASO ("En esta sentencia…", "El Tribunal Constitucional sostuvo en este caso…").
11. Jerarquía de presentación: primero Normativa, luego Jurisprudencia, luego Doctrina. La doctrina (autoridad doctrinal) siempre va en su sección de doctrina y se marca como no vinculante; nunca la cites en la sección de normativa. Una norma con vigencia "desconocida" o "derogada" no debe presentarse como vigente.
12. TRAZABILIDAD OBLIGATORIA: cuando una fuente normativa exponga "Fragmentos:" en su bloque, cada claim de "normativa" DEBE incluir el "fragment_id" exacto de UN fragmento que contenga literalmente el texto que respaldas. Nunca inventes un fragment_id: solo usa los listados en el contexto.

Formato de respuesta:
Responde ÚNICAMENTE con un objeto JSON válido, sin texto fuera:
${formatJson}
${formatRules}`;
}

export const LEGAL_AUTHORITY_LABELS = {
  vinculante: 'Norma vinculante',
  persuasiva: 'No vinculante',
  doctrinal: 'Doctrina · no vinculante',
  informativa: 'Informativa',
};

export const VIGENCY_LABELS = {
  vigente: 'Vigente',
  diferida: 'Con vigencia diferida por fecha',
  derogada: 'Derogada',
  modificada: 'Modificada',
  desconocida: 'Vigencia no determinada',
  no_aplica: 'No aplica (no es norma)',
};

export function authorityLabel(legalAuthority) {
  return LEGAL_AUTHORITY_LABELS[legalAuthority] || legalAuthority || '';
}

export function vigencyLabel(vigency) {
  return VIGENCY_LABELS[vigency] || '';
}

/**
 * Formatea una fuente para el contexto del modelo. Para normativa con
 * fragmentos reales (Fase 4.1), lista explícitamente hasta MAX_FRAGMENTS_PER_SOURCE
 * fragmentos con su fragment_id, artículo y texto literal para que el modelo
 * pueda citar "fragment_id" de forma trazable.
 */
function formatSource(source, index) {
  const authority = authorityLabel(source.legal_authority);
  const vigency = vigencyLabel(source.vigency);
  const lines = [
    `[Fuente ${index}] id: ${source.id}`,
    `Tipo: ${source.kind} (${source.publisher || 'Fuente pública'})`,
    authority ? `Autoridad: ${authority}` : null,
    vigency ? `Vigencia: ${vigency}` : null,
    source.citation ? `Cita: ${source.citation}` : null,
    source.date ? `Fecha: ${source.date}` : null,
    source.url ? `URL: ${source.url}` : null,
  ].filter(Boolean);

  const fragments =
    source.kind === 'normativa' && Array.isArray(source.metadata?.fragments)
      ? source.metadata.fragments.slice(0, JURISPRUDENCE_LIMITS.MAX_FRAGMENTS_PER_SOURCE)
      : [];
  if (fragments.length > 0) {
    lines.push('Fragmentos:');
    fragments.forEach((frag) => {
      const text = truncate(frag.text, JURISPRUDENCE_LIMITS.MAX_FRAGMENT_CHARS);
      lines.push(`  - fragment_id: ${frag.id} | Artículo: ${frag.article}`);
      lines.push(`    Texto: ${text}`);
    });
  }

  if (source.excerpt) {
    lines.push(`Extracto: ${truncate(source.excerpt, JURISPRUDENCE_LIMITS.MAX_SOURCE_CHARS)}`);
  }
  return lines.filter(Boolean).join('\n');
}

function truncate(text, max = 1200) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max)}…`;
}

/**
 * Construye el contexto con las fuentes reales.
 * @param {object[]} sources - fuentes de jurisprudenceSources (con id, kind,
 *   citation, url, excerpt, date, publisher).
 * @returns {{ context: string, tooLarge: boolean }}
 */
export function buildJurisprudenceContext(sources = []) {
  const limit = JURISPRUDENCE_LIMITS.MAX_SOURCES;
  // Fase 4.1.16 (evidence gate, antes del LLM): una norma IDENTIFICADA pero sin
  // evidencia sustantiva (solo título/idNorma/fecha/vigencia o texto de
  // promulgación) NO se entrega al modelo como si fuera evidencia jurídica.
  // Solo las fuentes con texto sustantivo (fragmentos o disposiciones) entran
  // al contexto. La identificación queda como diagnóstico interno.
  const withEvidence = sources.filter(
    (s) => s.kind !== 'normativa' || hasSubstantiveNormativeEvidence(s),
  );
  const selected = withEvidence.slice(0, limit);

  const blocks = [
    'CONTEXTO DE FUENTES VERIFICABLES',
    '',
    `Se encontraron ${selected.length} fuentes. Usa SOLO estas fuentes y cita sus ids en tu respuesta.`,
    '',
    ...selected.map((s, i) => formatSource(s, i + 1)),
  ];

  let context = blocks.join('\n\n');
  let tooLarge = false;
  if (context.length > JURISPRUDENCE_LIMITS.MAX_CONTEXT_CHARS) {
    context = context.slice(0, JURISPRUDENCE_LIMITS.MAX_CONTEXT_CHARS);
    tooLarge = true;
  }
  return { context, tooLarge };
}

// ---------------------------------------------------------------------------
// Fase 4.2.5 — Context Budget + Evidence-Aware Source Selection.
// Selecciona, ANTES de armar el contexto, las mejores fuentes/fragmentos para
// reducir los casos de CONTEXT_TOO_LARGE sin sacrificar las garantías de
// evidencia. El selector SOLO decide qué evidencia VÁLIDA llega al LLM; no
// decide qué evidencia es verdadera (los gates de 4.1.x-4.2.4 siguen intactos
// aguas abajo).
//
// Reglas inalterables:
//   - evidence gate: una norma metadata_only NO ocupa espacio de contexto si
//     existe evidencia sustantiva; nunca se convierte metadata en evidencia.
//   - article-first: la fuente/fragmento del artículo citado tiene prioridad.
//   - article mismatch: no se sustituye la disposición citada por otra.
//   - relacional/mixto: se reserva presupuesto para AMBOS polos (40-60% c/u)
//     cuando ambos tienen evidencia sustantiva.
//   - fallback: si el presupuesto no alcanza para representar los polos, NO se
//     inventa ni se elimina evidencia crítica: se conserva CONTEXT_TOO_LARGE
//     como resultado seguro.
//   - determinismo: misma entrada → misma selección.
// ---------------------------------------------------------------------------

export const CONTEXT_SELECTION = {
  // Fracción del límite máximo reservada al contexto de fuentes. Deja margen
  // para la cabecera, la pregunta, el contexto del caso y la guía de ensamblaje.
  HEADROOM_RATIO: 0.85,
  // Factor de seguridad del estimador de caracteres: debe ser conservador
  // (>= al formateador real) para no sobrepasar el presupuesto en el greedy.
  ESTIMATE_SAFETY_FACTOR: 1.15,
};

// Prioridad de tipo de fuente según la intención fina (Fase 4.2.1/4.2.3).
// En relacional/mixto, norma y jurisprudencia pesan igual: ambos polos deben
// quedar representados cuando ambos tienen evidencia.
const KIND_INTENT_PRIORITY = {
  ARTICLE_LOOKUP: { normativa: 1000, jurisprudencia: 120, doctrina: 60 },
  BARE_NORM_CITATION: { normativa: 1000, jurisprudencia: 120, doctrina: 60 },
  NORMATIVE_APPLICATION: { normativa: 800, jurisprudencia: 200, doctrina: 100 },
  JURISPRUDENCE_LOOKUP: { jurisprudencia: 1000, doctrina: 200, normativa: 80 },
  DOCTRINE_LOOKUP: { doctrina: 1000, jurisprudencia: 200, normativa: 80 },
  RELATIONAL_LEGAL_QUERY: { normativa: 600, jurisprudencia: 600, doctrina: 100 },
  MIXED_NORM_JURISPRUDENCE: { normativa: 600, jurisprudencia: 600, doctrina: 100 },
  DOCUMENT_ANALYSIS: { normativa: 0, jurisprudencia: 0, doctrina: 0 },
  GENERAL_LEGAL_QUERY: { normativa: 500, jurisprudencia: 480, doctrina: 260 },
};

/** Verifica si un término aparece como PALABRA COMPLETA en texto normalizado. */
function containsWord(normText, term) {
  const escaped = String(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9ñ])${escaped}($|[^a-z0-9ñ])`).test(normText);
}

/** Nº de términos de la consulta presentes como palabra en el texto de la fuente. */
function tokenOverlap(queryTokens, source) {
  const hay = [
    source.title,
    source.excerpt,
    source.citation,
    source.kind === 'normativa' && Array.isArray(source.metadata?.fragments)
      ? source.metadata.fragments.map((f) => `${f.article || ''} ${f.text || ''}`).join(' ')
      : '',
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return queryTokens.reduce((acc, t) => acc + (containsWord(hay, t) ? 2 : 0), 0);
}

/**
 * Ordena los fragmentos de una norma para el contexto: los del ARTÍCULO CITADO
 * van primero (article-first, Fase 4.2.2) y el resto por relevancia lexical.
 * No elimina fragmentos: conserva los ids para la trazabilidad claim→source→
 * fragment aguas abajo. Solo reordena (el formateador muestra los primeros 3).
 * @param {object} source - Fuente normativa.
 * @param {string} query - Consulta del abogado.
 */
export function orderSourceFragments(source, query = '') {
  if (source.kind !== 'normativa' || !Array.isArray(source.metadata?.fragments)) return source;
  const fragments = source.metadata.fragments;
  if (fragments.length <= 1) return source;
  const citedArticles = extractArticleNumbers(query);
  const ranked = rankFragments(query, fragments, { limit: fragments.length });
  if (citedArticles.length > 0) {
    const byArticle = fragments.filter((f) =>
      extractArticleNumbers(f.article || '').some((a) => citedArticles.includes(a)),
    );
    const others = ranked.filter((f) => !byArticle.includes(f));
    return { ...source, metadata: { ...source.metadata, fragments: [...byArticle, ...others] } };
  }
  return { ...source, metadata: { ...source.metadata, fragments: ranked } };
}

/**
 * Ranking evidence-aware de fuentes para el contexto. Considera, en orden de
 * prioridad: artículo citado > norma citada por número > tipo según intent >
 * evidencia sustantiva > relevancia lexical > polo > calidad > penalización por
 * expansión léxica (auxiliar). Determinístico (empates conservan el orden).
 * @param {object[]} sources
 * @param {{ query?: string, intentClass?: string }} [opts]
 */
export function rankSourcesForContext(sources, { query = '', intentClass = 'GENERAL_LEGAL_QUERY' } = {}) {
  const queryTokens = normalizeClaimTokens(query);
  const citedArticles = extractArticleNumbers(query);
  const citedLaws = extractLawNumber(query);
  const priority = KIND_INTENT_PRIORITY[intentClass] || KIND_INTENT_PRIORITY.GENERAL_LEGAL_QUERY;
  return sources
    .map((source, index) => {
      let score = priority[source.kind] ?? 0;
      if (source.kind === 'normativa') {
        if (hasSubstantiveNormativeEvidence(source)) score += 120;
        const normDigits = String(source.norm_number || '').replace(/[^0-9]/g, '');
        if (citedLaws.length > 0 && normDigits && citedLaws.includes(normDigits)) score += 800;
        const fragArticles = (source.metadata?.fragments || []).flatMap((f) =>
          extractArticleNumbers(f.article || ''),
        );
        if (citedArticles.length > 0 && fragArticles.some((a) => citedArticles.includes(a))) {
          score += 2000;
        }
      } else {
        const excerptLen = String(source.excerpt || '').length;
        if (excerptLen >= 800) score += 60;
        else if (excerptLen >= 200) score += 35;
      }
      score += tokenOverlap(queryTokens, source);
      const pole = source.metadata?.retrieval_pole;
      if (intentClass === 'RELATIONAL_LEGAL_QUERY' || intentClass === 'MIXED_NORM_JURISPRUDENCE') {
        if (pole === 'normative' && source.kind === 'normativa') score += 40;
        if (pole === 'jurisprudence' && source.kind === 'jurisprudencia') score += 40;
      } else if (pole && pole !== 'general') {
        score += 15;
      }
      if (source.metadata?.retrieval_expansion) score -= 25;
      if (source.kind === 'jurisprudencia' && source.rol) score += 12;
      if (source.kind === 'doctrina' && source.metadata?.authors) score += 5;
      return { source, score, index };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index);
}

/**
 * Estima conservadoramente los caracteres que la fuente ocupará en el contexto
 * formateado (espejo de `formatSource` + factor de seguridad). No debe
 * subestimar: el presupuesto se vuelve a verificar con el formateador real.
 * @param {object} source
 */
function estimateSourceChars(source) {
  const parts = [];
  parts.push(`[Fuente 1] id: ${source.id}`);
  parts.push(`Tipo: ${source.kind} (${source.publisher || 'Fuente pública'})`);
  if (source.legal_authority) parts.push(`Autoridad: ${authorityLabel(source.legal_authority)}`);
  if (source.vigency) parts.push(`Vigencia: ${vigencyLabel(source.vigency)}`);
  if (source.citation) parts.push(`Cita: ${source.citation}`);
  if (source.date) parts.push(`Fecha: ${source.date}`);
  if (source.url) parts.push(`URL: ${source.url}`);
  if (
    source.kind === 'normativa' &&
    Array.isArray(source.metadata?.fragments) &&
    source.metadata.fragments.length > 0
  ) {
    parts.push('Fragmentos:');
    for (const frag of source.metadata.fragments.slice(0, JURISPRUDENCE_LIMITS.MAX_FRAGMENTS_PER_SOURCE)) {
      parts.push(`  - fragment_id: ${frag.id} | Artículo: ${frag.article}`);
      parts.push(`    Texto: ${truncate(frag.text, JURISPRUDENCE_LIMITS.MAX_FRAGMENT_CHARS)}`);
    }
  }
  if (source.excerpt) parts.push(`Extracto: ${truncate(source.excerpt, JURISPRUDENCE_LIMITS.MAX_SOURCE_CHARS)}`);
  return parts.reduce((acc, p) => acc + p.length + 2, 2);
}

function isRelationalOrMixed(intentClass) {
  return intentClass === 'RELATIONAL_LEGAL_QUERY' || intentClass === 'MIXED_NORM_JURISPRUDENCE';
}

/**
 * Núcleo mínimo (floor) que la selección NUNCA reduce: el polo citado
 * (article-first) o, en relacional/mixto, la mejor fuente de CADA polo presente
 * con evidencia. Si ni siquiera el floor cabe, se conserva CONTEXT_TOO_LARGE
 * (fail-safe) en lugar de eliminar evidencia crítica o inventar polos.
 * @param {Array<{ source: object, score: number, index: number }>} ranked
 * @returns {Array<{ source: object, score: number, index: number }>}
 */
function computeFloor(ranked, query, intentClass) {
  const floor = [];
  if (isRelationalOrMixed(intentClass)) {
    const norm = ranked.find((r) => r.source.kind === 'normativa');
    const jur = ranked.find((r) => r.source.kind === 'jurisprudencia');
    if (norm) floor.push(norm);
    if (jur) floor.push(jur);
    return floor;
  }
  const citedArticles = extractArticleNumbers(query);
  if (citedArticles.length > 0) {
    const byArticle = ranked.find(
      (r) =>
        r.source.kind === 'normativa' &&
        (r.source.metadata?.fragments || []).some((f) =>
          extractArticleNumbers(f.article || '').some((a) => citedArticles.includes(a)),
        ),
    );
    if (byArticle) floor.push(byArticle);
  }
  if (floor.length === 0 && ranked.length > 0) floor.push(ranked[0]);
  return floor;
}

/**
 * Selección greedy por presupuesto de caracteres. En relacional/mixto reserva
 * ~50% del presupuesto por polo (intercala norma y jurisprudencia) para que
 * ninguno desplace al otro, y completa con el resto cuando hay sobrante.
 */
function greedySelect(ranked, floor, budget, intentClass) {
  const est = (entry) => estimateSourceChars(entry.source) * CONTEXT_SELECTION.ESTIMATE_SAFETY_FACTOR;
  const result = [...floor];
  const seen = new Set(result.map((r) => r.source.id));
  let used = result.reduce((acc, r) => acc + est(r), 0);

  if (!isRelationalOrMixed(intentClass)) {
    for (const entry of ranked) {
      if (seen.has(entry.source.id)) continue;
      const cost = est(entry);
      if (used + cost > budget) break;
      result.push(entry);
      seen.add(entry.source.id);
      used += cost;
    }
    return result;
  }

  const normPool = ranked.filter((r) => r.source.kind === 'normativa' && !seen.has(r.source.id));
  const jurPool = ranked.filter((r) => r.source.kind === 'jurisprudencia' && !seen.has(r.source.id));
  const otherPool = ranked.filter(
    (r) => r.source.kind !== 'normativa' && r.source.kind !== 'jurisprudencia' && !seen.has(r.source.id),
  );
  const quota = Math.floor(budget / 2);
  let normUsed = result.filter((r) => r.source.kind === 'normativa').reduce((a, r) => a + est(r), 0);
  let jurUsed = result.filter((r) => r.source.kind === 'jurisprudencia').reduce((a, r) => a + est(r), 0);
  let i = 0;
  let j = 0;
  const pushNorm = () => {
    if (i >= normPool.length) return false;
    const entry = normPool[i];
    const cost = est(entry);
    if (used + cost > budget || normUsed + cost > quota) return false;
    result.push(entry);
    seen.add(entry.source.id);
    used += cost;
    normUsed += cost;
    i += 1;
    return true;
  };
  const pushJur = () => {
    if (j >= jurPool.length) return false;
    const entry = jurPool[j];
    const cost = est(entry);
    if (used + cost > budget || jurUsed + cost > quota) return false;
    result.push(entry);
    seen.add(entry.source.id);
    used += cost;
    jurUsed += cost;
    j += 1;
    return true;
  };
  // Intercala ambos polos hasta agotar cuota o presupuesto.
  let progress = true;
  while (progress) {
    progress = false;
    if (i < normPool.length && normUsed < quota && pushNorm()) progress = true;
    if (j < jurPool.length && jurUsed < quota && pushJur()) progress = true;
  }
  // Completa con el sobrante (restos de polo + doctrina).
  for (const entry of [...normPool.slice(i), ...jurPool.slice(j), ...otherPool]) {
    if (seen.has(entry.source.id)) continue;
    const cost = est(entry);
    if (used + cost > budget) continue;
    result.push(entry);
    seen.add(entry.source.id);
    used += cost;
  }
  return result;
}

/** Indica si la selección conserva los polos/tipos que el intent exige. */
function polesPreserved(kindsBefore, kindsAfter, intentClass) {
  if (isRelationalOrMixed(intentClass)) {
    return (
      (!kindsBefore.has('normativa') || kindsAfter.has('normativa')) &&
      (!kindsBefore.has('jurisprudencia') || kindsAfter.has('jurisprudencia'))
    );
  }
  const required =
    intentClass === 'JURISPRUDENCE_LOOKUP'
      ? 'jurisprudencia'
      : intentClass === 'DOCTRINE_LOOKUP'
        ? 'doctrina'
        : intentClass === 'ARTICLE_LOOKUP' ||
            intentClass === 'BARE_NORM_CITATION' ||
            intentClass === 'NORMATIVE_APPLICATION'
          ? 'normativa'
          : null;
  if (!required) return true;
  return !kindsBefore.has(required) || kindsAfter.has(required);
}

/**
 * Selecciona las fuentes/fragmentos que llegan al contexto del LLM, con
 * presupuesto de caracteres explícito y evidencia-aware. Pura y determinística.
 *
 * NO modifica las fuentes originales (devuelve copias con los fragmentos
 * reordenados): la verificación aguas abajo sigue usando las fuentes completas,
 * por lo que la trazabilidad claim→source→fragment permanece intacta.
 *
 * @param {object} input
 * @param {object[]} input.sources - Fuentes recuperadas (todas).
 * @param {string} [input.query] - Consulta del abogado.
 * @param {string} [input.intentClass] - Intención fina (Fase 4.2.1).
 * @param {object} [input.classification] - Salida de classifyLegalQuery (opcional).
 * @param {object} [input.strategy] - Salida de getRetrievalStrategy (opcional).
 * @param {number} [input.maxContextChars] - Límite de caracteres del contexto
 *   (por defecto JURISPRUDENCE_LIMITS.MAX_CONTEXT_CHARS).
 * @returns {{ sources: object[], context: string, tooLarge: boolean,
 *   applied: boolean, stats: object }}
 */
export function selectSourcesForContext({
  sources = [],
  query = '',
  intentClass = 'GENERAL_LEGAL_QUERY',
  classification = null,
  strategy = null,
  maxContextChars = JURISPRUDENCE_LIMITS.MAX_CONTEXT_CHARS,
} = {}) {
  const budget = Math.floor(maxContextChars * CONTEXT_SELECTION.HEADROOM_RATIO);
  const isTooLarge = (ctx) => ctx.tooLarge || ctx.context.length > maxContextChars;

  // Contexto "antes" (lo que se habría enviado sin selección) para diagnóstico.
  const beforeCtx = buildJurisprudenceContext(sources);
  const fragmentsBefore = sources.reduce(
    (acc, s) => acc + (Array.isArray(s.metadata?.fragments) ? s.metadata.fragments.length : 0),
    0,
  );
  const kindsBefore = new Set(sources.map((s) => s.kind));

  // 1) Evidence gate (pre-context): una norma metadata_only NO ocupa espacio de
  //    contexto si existe evidencia sustantiva; nunca se convierte en evidencia.
  const eligible = sources.filter(
    (s) => s.kind !== 'normativa' || hasSubstantiveNormativeEvidence(s),
  );

  if (eligible.length === 0) {
    const ctx = buildJurisprudenceContext([]);
    return {
      sources: [],
      context: ctx.context,
      tooLarge: false,
      applied: false,
      stats: {
        sources_before: sources.length,
        sources_after: 0,
        fragments_before: 0,
        fragments_after: 0,
        context_chars_before: beforeCtx.context.length,
        context_chars_after: ctx.context.length,
        budget_applied: false,
        poles_preserved: true,
      },
    };
  }

  // 2) Reordena fragmentos (article-first + relevancia) en copias inmutables.
  const prepared = eligible.map((s) => orderSourceFragments(s, query));

  // 3) Ranking evidence-aware.
  const ranked = rankSourcesForContext(prepared, { query, intentClass });

  // 4) Núcleo mínimo: si ni el floor cabe, se conserva CONTEXT_TOO_LARGE.
  const floor = computeFloor(ranked, query, intentClass);
  const floorCtx = buildJurisprudenceContext(floor.map((r) => r.source));
  if (floor.length > 0 && isTooLarge(floorCtx)) {
    const floorSources = floor.map((r) => r.source);
    return {
      sources: floorSources,
      context: floorCtx.context,
      tooLarge: true,
      applied: true,
      stats: {
        sources_before: sources.length,
        sources_after: floorSources.length,
        fragments_before: fragmentsBefore,
        fragments_after: floorSources.reduce(
          (acc, s) =>
            acc +
            Math.min(
              Array.isArray(s.metadata?.fragments) ? s.metadata.fragments.length : 0,
              JURISPRUDENCE_LIMITS.MAX_FRAGMENTS_PER_SOURCE,
            ),
          0,
        ),
        context_chars_before: beforeCtx.context.length,
        context_chars_after: floorCtx.context.length,
        budget_applied: true,
        poles_preserved: polesPreserved(kindsBefore, new Set(floorSources.map((s) => s.kind)), intentClass),
      },
    };
  }

  // 5) Selección greedy con reserva de polos.
  let selected = greedySelect(ranked, floor, budget, intentClass);

  // 6) Recorte de seguridad verificado con el formateador real (nunca por
  //    debajo del floor).
  let final = selected;
  let ctx = buildJurisprudenceContext(final.map((r) => r.source));
  const floorSize = floor.length;
  while (isTooLarge(ctx) && final.length > floorSize) {
    final = final.slice(0, -1);
    ctx = buildJurisprudenceContext(final.map((r) => r.source));
  }

  const selectedSources = final.map((r) => r.source);
  const fragmentsAfter = selectedSources.reduce(
    (acc, s) =>
      acc +
      Math.min(
        Array.isArray(s.metadata?.fragments) ? s.metadata.fragments.length : 0,
        JURISPRUDENCE_LIMITS.MAX_FRAGMENTS_PER_SOURCE,
      ),
    0,
  );
  const kindsAfter = new Set(selectedSources.map((s) => s.kind));

  const stats = {
    sources_before: sources.length,
    sources_after: selectedSources.length,
    fragments_before: fragmentsBefore,
    fragments_after: fragmentsAfter,
    context_chars_before: beforeCtx.context.length,
    context_chars_after: ctx.context.length,
    budget_applied: selectedSources.length < sources.length || fragmentsAfter < fragmentsBefore,
    poles_preserved: polesPreserved(kindsBefore, kindsAfter, intentClass),
  };

  return {
    sources: selectedSources,
    context: ctx.context,
    tooLarge: isTooLarge(ctx),
    applied: stats.budget_applied,
    stats,
  };
}

/**
 * Guía de ensamblaje por intención fina (Fase 4.2.1): instruye al modelo cómo
 * estructurar la respuesta según la intención de la consulta. Solo se renderiza
 * cuando la ruta entrega intentClass, por lo que es retrocompatible.
 */
const INTENT_ASSEMBLY_GUIDE = {
  BARE_NORM_CITATION: 'Ancla la respuesta en la norma citada; usa jurisprudencia y doctrina solo como apoyo.',
  ARTICLE_LOOKUP: 'Explica el artículo citado: alcance, condiciones y efectos; apóyate en la norma de la que forma parte.',
  NORMATIVE_APPLICATION: 'Aplica la norma al caso concreto: responde si la norma alcanza la situación descrita y qué requisitos exige.',
  JURISPRUDENCE_LOOKUP: 'Ancla la respuesta en la jurisprudencia: criterios de los tribunales y cómo se han resuelto casos similares.',
  RELATIONAL_LEGAL_QUERY: 'Responde la relación entre las dos materias citadas: puntos de contacto, diferencias e interacciones, con respaldo de ambos polos.',
  MIXED_NORM_JURISPRUDENCE: 'Combina norma y jurisprudencia: qué establece la ley y cómo la han aplicado los tribunales, en ese orden.',
  DOCUMENT_ANALYSIS: 'Ancla la respuesta en el documento del caso citado: qué establece textualmente y qué se infiere razonablemente. No busques fuentes externas.',
  GENERAL_LEGAL_QUERY: 'Organiza la respuesta equilibrando la normativa, jurisprudencia y doctrina disponibles.',
};

/**
 * Construye el mensaje de usuario enviado al modelo.
 * @param {{ question: string, context?: string, caseContext?: string, intent?: string, documentContext?: string }} params
 *  - documentContext: evidencia documental del caso (Fase 4.2.6). Si se provee,
 *    se inserta como bloque propio "EVIDENCIA DOCUMENTAL DEL CASO".
 */
export function buildJurisprudenceUserPrompt({
  question,
  context = '',
  caseContext = '',
  intent = '',
  documentContext = '',
}) {
  const parts = [
    'CONTEXTO DEL CASO (solo como referencia)',
    caseContext || 'Sin contexto de caso.',
    context,
    documentContext
      ? `EVIDENCIA DOCUMENTAL DEL CASO\n${documentContext}`
      : '',
    `PREGUNTA DEL ABOGADO:\n${question}`,
  ];
  const guide = INTENT_ASSEMBLY_GUIDE[intent];
  if (guide) {
    parts.push(`INTENCIÓN DE LA CONSULTA (guía de ensamblaje):\n${guide}`);
  }
  return parts.filter(Boolean).join('\n\n');
}

/**
 * Construye el contexto breve del caso para acompañar la investigación.
 */
export function buildJurisprudenceCaseContext(workspace) {
  const lines = [`Nombre: ${workspace?.name || 'Sin nombre'}`];
  if (workspace?.practice_area) lines.push(`Área: ${workspace.practice_area}`);
  if (workspace?.description) lines.push(`Descripción: ${workspace.description}`);
  return lines.join('\n');
}

// -------------------------------
// Verificación de respaldo textual
// -------------------------------

/** Normaliza un texto para comparar (minúsculas, sin acentos ni puntuación). */
function normalizeForCompare(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9ñ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Detecta si una afirmación/fragmento afirma algo sobre la vigencia de una norma. */
function assertsVigencia(afirmacion, fragmento) {
  return /vigent|vigencia|derogad|actualmente|en vigor/i.test(
    `${afirmacion || ''} ${fragmento || ''}`,
  );
}

/**
 * Detecta si una afirmación PRESENTA la norma como ya en vigor ("está vigente",
 * "rige", "entró en vigencia", "en vigor", "actualmente").
 */
function assertsCurrentForce(afirmacion) {
  return /(\best[áa] vigente\b|\brige\b|\bentr[oó] en vigencia\b|\ben vigor\b|\bactualmente\b|\bya se aplica\b|\best[áa] en vigor\b)/i.test(
    String(afirmacion || ''),
  );
}

/** Lenguaje normativo categórico que una doctrina no debería emitir como regla general. */
const DOCTRINAL_OVERREACH_RE =
  /\bes obligatorio\b|\bes (?:legal|ilegal)\b|\best[áa] (?:permitid[oa]|prohibid[oa])\b|\bla (?:ley|normativa|legislaci[oó]n) (?:establece|permite|proh[íi]be)\b/i;

/**
 * Determina si el fragmento citado por el modelo tiene respaldo textual real
 * en el extracto de la fuente. Compara los tokens significativos del fragmento
 * (≥4 caracteres) contra el extracto; exige una proporción mínima de solape.
 */
function fragmentIsSupported(fragment, sourceExcerpt, { minOverlap = 0.5 } = {}) {
  const fragTokens = normalizeForCompare(fragment).split(' ').filter((t) => t.length >= 4);
  if (fragTokens.length === 0) return false;
  const excerptNorm = normalizeForCompare(sourceExcerpt);
  const matched = fragTokens.filter((token) => excerptNorm.includes(token)).length;
  return matched / fragTokens.length >= minOverlap;
}

/**
 * Verifica que cada afirmación del modelo tenga respaldo textual en su fuente.
 * @param {object[]} claims - arreglos { fuente_id, afirmacion, fragmento }.
 * @param {Map<string, object>} sourcesById - fuentes recuperadas por id.
 * @param {string} category - 'normativa' | 'jurisprudencia' | 'doctrina'.
 * @returns {{ kept: object[], warnings: string[] }}
 */
export function verifyJurisprudenceClaims(claims, sourcesById, category = '') {
  if (!Array.isArray(claims)) return { kept: [], warnings: [] };
  const kept = [];
  const warnings = [];
  // Avisa una sola vez por fuente sobre su vigencia incierta (evita ruido).
  const flaggedVigencia = new Set();

  for (const claim of claims) {
    if (!claim || typeof claim !== 'object') continue;
    const { fuente_id: fuenteId, afirmacion, fragmento, fragment_id: modelFragmentId } = claim;
    const source = fuenteId ? sourcesById.get(fuenteId) : undefined;

    if (!source) {
      warnings.push(
        `Se descartó una afirmación de ${category} sin fuente válida recuperada; no se presenta como evidencia jurídica.`,
      );
      continue;
    }
    if (!afirmacion || !String(afirmacion).trim()) continue;

    const afirmacionText = String(afirmacion).trim();
    const fragment = String(fragmento || '').trim();

    // Fase 4.0.2: la sección debe coincidir con el tipo real de la fuente.
    if (category && source.kind !== category) {
      warnings.push(
        `Se descartó una afirmación de ${category} que cita "${fuenteId}" (${source.kind}), que no corresponde a esa sección.`,
      );
      continue;
    }

    // Fase 4.0.2: una doctrina no puede emitir mandatos legales categóricos.
    if (source.kind === 'doctrina' && DOCTRINAL_OVERREACH_RE.test(afirmacionText)) {
      warnings.push(
        'Se descartó una afirmación de doctrina que usa lenguaje normativo categórico; la doctrina no es fuente normativa.',
      );
    }

    // Fase 4.0.4: alineación exacta afirmación ↔ fragmento. Cuando la fuente
    // normativa expone fragmentos por artículo, la afirmación se valida y se
    // RE-ANCLA al fragmento específico que realmente la respalda (no a todo el
    // texto de la fuente). Si ningún fragmento contiene los conceptos afirmados,
    // se descarta/reformula la afirmación.
    // Fase 4.1 (trazabilidad): si el modelo citó un fragment_id, se usa SOLO si
    // ese fragmento existe en la fuente y respalda la afirmación; un fragment_id
    // inventado, inexistente o que no respalda obliga al re-anclaje, y si ningún
    // fragmento respalda, la afirmación se descarta.
    let evidence = fragment;
    let fragmentId = null;
    // Fase 4.1.17: artículos del fragmento anclado (para el verifier de síntesis).
    let fragmentArticles = [];
    const fragments = source.kind === 'normativa' ? (source.metadata?.fragments || []) : [];
    if (fragments.length > 0) {
      let aligned = null;
      const fragmentById = new Map(fragments.map((f) => [f.id, f]));
      if (modelFragmentId && fragmentById.has(modelFragmentId)) {
        const candidate = fragmentById.get(modelFragmentId);
        if (fragmentSupportsClaim(candidate, afirmacionText)) aligned = candidate;
      }
      if (!aligned) {
        aligned = resolveClaimFragment(afirmacionText, fragments);
      }
      if (aligned) {
        // Fase 4.1.17: si la afirmación cita un ARTÍCULO específico, el fragmento
        // anclado debe corresponder a ese artículo. Una afirmación sobre
        // "artículo 99" no puede respaldarse con el texto del "Artículo 4"
        // (evita citas falsas cuando el artículo citado no existe en la fuente).
        // `fragmentArticles` (declarado al inicio del bucle) queda expuesto en el
        // claim para que el síntesis verifier aplique la misma regla.
        fragmentArticles = extractArticleNumbers(aligned.article || '');
        const citedArticles = extractArticleNumbers(afirmacionText);
        if (
          citedArticles.length > 0 &&
          fragmentArticles.length > 0 &&
          !citedArticles.some((a) => fragmentArticles.includes(a))
        ) {
          warnings.push(
            `Se descartó una afirmación de ${category} que cita "${source.citation}" (art. ${citedArticles.join(', ')}) porque ningún fragmento de esa fuente corresponde a ese artículo. "Artículo de la ley se pierde": no se sustituye la disposición citada por otra.`,
          );
          continue;
        }
        evidence = String(aligned.text).trim();
        fragmentId = aligned.id || null;
      } else {
        warnings.push(
          `Se descartó una afirmación de ${category} porque ningún fragmento de "${source.citation}" respalda específicamente su contenido; no se presenta como evidencia.`,
        );
        continue;
      }
    }

    if (evidence && !fragmentIsSupported(evidence, source.excerpt || '')) {
      warnings.push(
        `Se descartó una afirmación de ${category} cuyo fragmento no aparece en la fuente "${source.citation}".`,
      );
      continue;
    }

    // Fase 4.1 (Etapa 5): vigencia POR AFIRMACIÓN. La afirmación decide cómo se
    // presenta la norma:
    //   - vigente     → puede presentarse como vigente.
    //   - diferida    → admisible, pero NUNCA como vigente ya (aviso obligatorio).
    //   - derogada    → nunca como derecho vigente.
    //   - desconocida → advertencia de vigencia no determinada.
    let vigenciaNota = null;
    if (source.kind === 'normativa') {
      if (source.vigency === 'derogada' && assertsCurrentForce(afirmacionText)) {
        warnings.push(
          `Se descartó una afirmación que presenta como vigente la norma "${source.citation}", que está derogada.`,
        );
        continue;
      }
      if (source.vigency === 'diferida' && assertsCurrentForce(afirmacionText)) {
        warnings.push(
          `Se reformuló la afirmación sobre "${source.citation}": tiene vigencia diferida y NO es derecho vigente aún.`,
        );
      }
      if (source.vigency === 'diferida') {
        vigenciaNota =
          'Vigencia diferida: la norma aún NO rige (entra en vigencia según LeyChile).';
      }
      if (source.vigency === 'desconocida' && !flaggedVigencia.has(source.id)) {
        flaggedVigencia.add(source.id);
        warnings.push(
          `Vigencia de "${source.citation}" no determinada por la fuente consultada; verifica en LeyChile antes de citarla como vigente.`,
        );
      }
    }

    kept.push({
      source,
      source_id: source.id,
      fragment_id: fragmentId,
      article: fragmentArticles,
      category,
      afirmacion: afirmacionText,
      fragmento: evidence,
      vigencia: source.kind === 'normativa' ? source.vigency : undefined,
      vigencia_nota: vigenciaNota,
    });
  }

  return { kept, warnings };
}

/**
 * Construye el Markdown final de la investigación a partir del JSON estructurado.
 * Compatible con el render del frontend (párrafos, listas, negrita/italic).
 * Fase 4.0.2: secciones separadas por categoría con su autoridad explícita.
 */
export function buildJurisprudenceAnswer({ resumen, normativa, jurisprudencia, doctrina, documento = [], sintesis, conclusion, matices, advertencias }) {
  const lines = [];
  lines.push(`**Respuesta breve**\n\n${(resumen || '').trim()}`);

  const authoritySuffix = (c) => {
    const authority = authorityLabel(c.source?.legal_authority);
    const vigency = vigencyLabel(c.source?.vigency);
    if (!authority && !vigency) return '';
    const parts = [authority, vigency].filter(Boolean);
    return ` *(${parts.join(' · ')})*`;
  };

  const section = (title, claims) => {
    if (!Array.isArray(claims) || claims.length === 0) return null;
    const items = claims
      .map((c) => {
        const cite = c.source?.citation || c.fuente_id || '';
        const frag = c.fragmento ? ` *("${c.fragmento}")*` : '';
        const notaVigencia = c.vigencia_nota ? ` *( ${c.vigencia_nota} )*` : '';
        return `- **${cite}**${authoritySuffix(c)}: ${c.afirmacion}${frag}${notaVigencia}`;
      })
      .join('\n');
    return `**${title}**\n\n${items}`;
  };

  // Fase 4.2.6: los HECHOS del caso (evidencia documental) van primero; después
  // la normativa/jurisprudencia/doctrina que los analiza. Separa siempre hechos
  // de inferencias.
  const docFacts = section('Hechos del caso (documentos)', documento);
  const norm = section('Normativa relevante', normativa);
  const jur = section('Jurisprudencia relevante', jurisprudencia);
  const doctrinaSec = section('Doctrina (no vinculante)', doctrina);

  lines.push(docFacts, norm, jur, doctrinaSec);

  // Fase 4.1 (Etapa 2): síntesis VERIFICADA, ya procesada por synthesisVerifier.
  // Retrocompatibilidad: si no hay síntesis verificada, se usa la conclusión del
  // modelo con el encabezado histórico "Conclusión".
  if (sintesis && String(sintesis).trim()) {
    lines.push(`**Síntesis**\n\n${String(sintesis).trim()}`);
  } else if (conclusion && String(conclusion).trim()) {
    lines.push(`**Conclusión**\n\n${String(conclusion).trim()}`);
  }

  // Fase 4.1 (Etapa 4): matices y contradicciones (no resueltos).
  if (Array.isArray(matices) && matices.length > 0) {
    const items = matices
      .map((m) => `- ${m.nota || m.notas || m.tipo}`)
      .join('\n');
    lines.push(`**Matices y contradicciones**\n\n${items}`);
  }

  if (Array.isArray(advertencias) && advertencias.length > 0) {
    const avisos = advertencias.map((a) => `- ${a}`).join('\n');
    lines.push(`**Avisos**\n\n${avisos}`);
  }

  return lines.filter(Boolean).join('\n\n');
}

// -------------------------------
// Fase 4.0.2: detección de conclusiones excesivas
// -------------------------------

// Patrones de lenguaje categórico que implican una autoridad que puede faltar.
// Si la categoría requerida no quedó respaldada por fuentes, se suaviza y avisa.
const CATEGORICAL_PATTERNS = [
  {
    re: /\bla jurisprudencia confirma\b/i,
    requires: 'jurisprudencia',
    replacement: 'la jurisprudencia sugiere',
  },
  {
    re: /\bla jurisprudencia (?:establece|determina)\b/i,
    requires: 'jurisprudencia',
    replacement: 'la jurisprudencia señala',
  },
  {
    re: /\blos tribunales (?:han establecido|establecen)\b/i,
    requires: 'jurisprudencia',
    replacement: 'los tribunales han señalado',
  },
  {
    re: /\bla (?:corte|jurisprudencia) es un[áa]nime\b/i,
    requires: 'jurisprudencia',
    replacement: 'la jurisprudencia mayoritaria sugiere',
  },
  {
    re: /\bla (?:normativa|ley|legislaci[oó]n) establece\b/i,
    requires: 'normativa',
    replacement: 'la normativa contenida en las fuentes señala',
  },
  {
    re: /\b(?:la ley|la normativa) (?:permite|proh[íi]be)\b/i,
    requires: 'normativa',
    replacement: 'según las fuentes la ley permite',
  },
  {
    re: /\b(?:es|resulta) (?:legal|ilegal)\b/i,
    requires: 'normativa',
    replacement: 'según las fuentes podría ser legal',
  },
  {
    re: /\best[áa] (?:permitid[oa]|prohibid[oa])\b/i,
    requires: 'normativa',
    replacement: 'según las fuentes estaría permitido',
  },
  {
    re: /\bes obligatorio\b/i,
    requires: 'normativa',
    replacement: 'según las fuentes podría ser obligatorio',
  },
  {
    re: /\b(?:queda|est[áa]|se\s+ha) demostrad[oa]\b/i,
    requires: 'jurisprudencia',
    replacement: 'las fuentes muestran',
  },
  {
    re: /\best[áa] claro que\b/i,
    requires: 'jurisprudencia',
    replacement: 'las fuentes sugieren que',
  },
];

/**
 * Detecta conclusiones categóricas ("la jurisprudencia confirma…", "la ley
 * establece…") que no están respaldadas por fuentes de la categoría requerida.
 * Suaviza el texto y genera un aviso cuando corresponde.
 * @param {{ resumen: string, conclusion: string, normativa: object[], jurisprudencia: object[] }} input
 * @returns {{ resumen: string, conclusion: string, warnings: string[] }}
 */
export function detectExcessiveConclusions({ resumen = '', conclusion = '', normativa = [], jurisprudencia = [] } = {}) {
  const hasNormativa = Array.isArray(normativa) && normativa.length > 0;
  const hasJurisprudencia = Array.isArray(jurisprudencia) && jurisprudencia.length > 0;
  const warnings = [];

  const soften = (text) => {
    if (!text) return text;
    let out = String(text);
    for (const pattern of CATEGORICAL_PATTERNS) {
      const supported =
        pattern.requires === 'normativa' ? hasNormativa : hasJurisprudencia;
      if (supported) continue;
      if (pattern.re.test(out)) {
        const match = out.match(pattern.re)?.[0] || '';
        out = out.replace(pattern.re, pattern.replacement);
        warnings.push(
          `Se suavizó la afirmación categórica "${match}" porque las fuentes verificadas no la respaldan plenamente.`,
        );
      }
    }
    return out;
  };

  return {
    resumen: soften(resumen),
    conclusion: soften(conclusion),
    warnings,
  };
}
