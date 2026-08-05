// ---------------------------------------------------------------------------
// LegalUp AI — Fase 4.0: Investigación de jurisprudencia.
// Búsqueda en fuentes públicas reales (sin API key comercial):
//   - Tribunal Constitucional (fallos reales con rol, extracto y ficha).
//   - BCN / LeyChile SPARQL (normativa con idNorma y URL oficial).
//   - OpenAlex (doctrina académica chilena).
// PJUD NO publica una API de texto: por eso este módulo solo devuelve fuentes
// verificables de las fuentes públicas anteriores y sus portales oficiales.
// ---------------------------------------------------------------------------

// --- Configuración y constantes ---
const TC_API = 'https://buscador-backend.tcchile.cl/api/extended';
const TC_FICHA_API = 'https://buscador-backend.tcchile.cl/api/buscadorexterno/ficha';
const TC_UI = 'https://buscador.tcchile.cl';
const SPARQL_ENDPOINT = 'https://datos.bcn.cl/sparql';
const OPENALEX_API = 'https://api.openalex.org/works';

const DEFAULT_TIMEOUT_MS = Number(process.env.JURISPRUDENCE_TIMEOUT_MS) || 15000;

// Palabras vacías del TC: su buscador ANDea cada token, incluidos artículos.
const TC_STOPWORDS = new Set([
  'a', 'al', 'ante', 'bajo', 'cada', 'como', 'con', 'contra', 'cuando', 'de',
  'del', 'desde', 'donde', 'durante', 'el', 'en', 'entre', 'es', 'esta',
  'estas', 'este', 'estos', 'fue', 'ha', 'hacia', 'hasta', 'la', 'las', 'le',
  'lo', 'los', 'mas', 'más', 'mediante', 'mi', 'ni', 'no', 'o', 'para', 'pero',
  'por', 'porque', 'que', 'se', 'segun', 'según', 'si', 'sin', 'sobre', 'su',
  'sus', 'te', 'tras', 'tu', 'un', 'una', 'unos', 'unas', 'y', 'ya',
]);

const NORM_STOPWORDS = new Set([
  'ley', 'leyes', 'dl', 'dfl', 'dto', 'decreto', 'decretos', 'sobre', 'para',
  'con', 'del', 'de', 'la', 'las', 'los', 'el', 'una', 'uno', 'un', 'unos',
  'y', 'o', 'en', 'por', 'que', 'qué', 'cual', 'cuál', 'cuáles', 'cuales',
  'dice', 'dicen', 'digan', 'norma', 'normas', 'normativa', 'chilena',
  'chileno', 'chilenas', 'chilenos', 'legal', 'legales', 'vigente',
  'vigentes', 'establece', 'establecen', 'establezca', 'establezcan',
  'regula', 'regulan', 'regulación', 'regulacion', 'aplica', 'aplican',
  'aplicable', 'refiere', 'referida', 'referidas', 'segun', 'según',
  'cuando', 'como', 'cómo', 'pregunta', 'consulta', 'existe', 'existen',
  'puede', 'pueden', 'es', 'son', 'qué pasa', 'que pasa', 'artículo',
  'articulo', 'art', 'n°', 'no',
]);

// ----------------------- Utilidades compartidas ---------------------------

function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => {
    clearTimeout(timer);
  });
}

async function fetchJson(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const response = await fetchWithTimeout(url, options, timeoutMs);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} en ${url}`);
  }
  return response.json();
}

/** Normaliza una query: quita puntuación, stopwords y acentos para búsquedas. */
function normalizeSearchTerms(query, stopwords) {
  const raw = String(query || '').normalize('NFC').trim();
  if (!raw) return '';
  const tokens = raw
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const kept = tokens.filter((t) => {
    const folded = t.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
    return folded.length > 1 && !stopwords.has(folded) && !stopwords.has(t.toLowerCase());
  });
  return (kept.length ? kept : tokens).join(' ');
}

/** Escapa una cadena para inyección segura en SPARQL. */
function escapeSparqlString(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ');
}

function truncate(text, max = 1200) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max)}…`;
}

/** Resuelve cada búsqueda con allSettled: si una fuente falla no rompe el resto. */
async function settleSearch(fn, warnings) {
  try {
    return await fn();
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    warnings.push(msg);
    return [];
  }
}

// ---------------------------
// Fase 4.0.2: clasificación de fuentes
// ---------------------------

export const LEGAL_AUTHORITY_LABELS = {
  vinculante: 'Norma vinculante',
  persuasiva: 'No vinculante',
  doctrinal: 'Doctrina · no vinculante',
  informativa: 'Informativa',
};

export const VIGENCY_LABELS = {
  vigente: 'Vigente',
  derogada: 'Derogada',
  modificada: 'Modificada',
  desconocida: 'Vigencia no determinada',
  no_aplica: 'No aplica (no es norma)',
};

export const NORM_TYPE_LABELS = {
  ley: 'Ley',
  decreto: 'Decreto',
  decreto_ley: 'Decreto Ley',
  dfl: 'DFL',
  codigo: 'Código',
  reglamento: 'Reglamento',
  resolucion: 'Resolución',
  constitucion: 'Constitución',
  otra: 'Norma',
};

export function vigencyLabel(vigency) {
  return VIGENCY_LABELS[vigency] || 'Vigencia no determinada';
}

/**
 * Clasifica la jerarquía y autoridad de una fuente según su tipo real.
 *   - normativa:      derecho positivo → vinculante.
 *   - jurisprudencia: decisión de un tribunal → persuasiva (resuelve un caso,
 *                     no establece norma general de forma automática).
 *   - doctrina:       posición académica → doctrinal (nunca vinculante).
 */
export function classifySourceKind(kind) {
  switch (kind) {
    case 'normativa':
      return { source_type: 'normativa', legal_authority: 'vinculante' };
    case 'jurisprudencia':
      return { source_type: 'jurisprudencia', legal_authority: 'persuasiva' };
    case 'doctrina':
      return { source_type: 'doctrina', legal_authority: 'doctrinal' };
    default:
      return { source_type: 'normativa', legal_authority: 'informativa' };
  }
}

/** Detecta el tipo de norma según el inicio del título de LeyChile. */
const NORM_TYPE_PATTERNS = [
  { type: 'decreto_ley', re: /^decreto\s+ley/i },
  { type: 'dfl', re: /^decreto\s+con\s+fuerza\s+de\s+ley/i },
  { type: 'codigo', re: /^c[oó]digo/i },
  { type: 'decreto', re: /^decreto/i },
  { type: 'resolucion', re: /^resoluci[oó]n/i },
  { type: 'constitucion', re: /constituci[oó]n\s+pol[ií]tica/i },
  { type: 'ley', re: /^ley/i },
  { type: 'reglamento', re: /reglamento/i },
];

export function classifyNormType(title) {
  const t = String(title || '').trim();
  for (const { type, re } of NORM_TYPE_PATTERNS) {
    if (re.test(t)) return type;
  }
  return 'otra';
}

/** Extrae el número de una norma desde el título (Ley 19.628 → "19.628"). */
export function extractNormNumber(title) {
  const m = String(title || '').match(/\d{1,2}(?:[.,]\d{3,6})/);
  return m ? m[0] : null;
}

/**
 * Infiere el estado de vigencia desde el título de LeyChile. Nunca declara
 * "vigente" sin evidencia: solo cuando el título lo indica explícitamente.
 */
export function detectNormVigency(title) {
  const t = String(title || '').toLowerCase();
  if (/(derogad|abrogad|deroga)/.test(t)) return 'derogada';
  if (/(modificad|reformad|sustituid|reemplazad)/.test(t)) return 'modificada';
  if (/(texto refundido|texto actualizado|vigente)/.test(t)) return 'vigente';
  return 'desconocida';
}

// ---------------------------
// Fuente: Tribunal Constitucional
// ---------------------------

function buildTcFilter(search, competencia = null) {
  return {
    folio: '',
    fecha_sentencia: null,
    search,
    tipo_resolucion: null,
    resultado: null,
    competencia,
    articulo_constitucion: null,
    ministro: null,
    cuerpo_legal: null,
    palabra_clave: null,
  };
}

export async function searchTcSentencias(query, limit = 5, competencia = null) {
  const search = normalizeSearchTerms(query, TC_STOPWORDS);
  if (!search) return [];
  const filter = encodeURIComponent(JSON.stringify(buildTcFilter(search, competencia)));
  const data = await fetchJson(`${TC_API}/sentencias?filter=${filter}`);
  const rows = data?.data?.results ?? [];
  return rows.slice(0, limit).map((r) => {
    const highlights =
      r.highlightParagraphs
        ?.map((h) => h.full ?? h.summary)
        .filter(Boolean) ?? [];
    const excerpt = highlights.join(' ') || truncate(r.content, 3000);
    return {
      id: `tc-${r.id}`,
      kind: 'jurisprudencia',
      source_type: 'jurisprudencia',
      legal_authority: 'persuasiva',
      vigency: 'no_aplica',
      title: r.rol ? `Rol ${r.rol}` : `Sentencia TC ${r.id}`,
      citation: `Tribunal Constitucional — Rol ${r.rol}`,
      publisher: 'Tribunal Constitucional',
      url: `${TC_UI}/#/ficha/${r.rol}`,
      excerpt,
      metadata: {
        rol: r.rol,
        competencia: r.competenciaShortName ?? r.competencia,
        sentenceId: r.sentence_id ? String(r.sentence_id) : null,
        provider: 'tc_buscador',
        integrity: 'verified',
        legal_authority: 'persuasiva',
        vigency: 'no_aplica',
      },
    };
  });
}

export async function getTcFicha(folio, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const data = await fetchJson(
    `${TC_FICHA_API}/${encodeURIComponent(String(folio))}`,
    {},
    timeoutMs,
  );
  const f = data?.data;
  if (!f?.folio) return {};
  const findRow = (names) => (Array.isArray(f.detalle) ? f.detalle : []).find((d) =>
    names.some((n) => d?.parametro?.nombre?.toLowerCase().includes(n.toLowerCase()))
  );
  const valueFrom = (names) => {
    const row = findRow(names);
    if (!row) return undefined;
    if (row.valor) return String(row.valor).replace(/<[^>]+>/g, ' ').trim();
    return row.detalle_multiple?.map((m) => m.valor).filter(Boolean).join('; ') || undefined;
  };
  return {
    folio: String(f.folio),
    fecha: f.fecha_sentencia?.slice(0, 10),
    competencia: f.template?.complete_name ?? f.nombre,
    gestion: valueFrom(['gestión', 'gestion']),
    resultado: valueFrom(['resultado']),
    doctrina: valueFrom(['doctrina']),
    tipoResolucion: valueFrom(['tipo de resolución', 'tipo de resolucion']),
    articulosCpr: valueFrom(['artículo de la constitución', 'articulo de la constitucion']),
    fichaUrl: `${TC_UI}/#/ficha/${f.folio}`,
  };
}

// ---------------------------
// Fuente: BCN / LeyChile SPARQL
// ---------------------------

function buildTitleFilterSparql(terms, limit) {
  const andFilters = terms
    .map(
      (t) => `FILTER(CONTAINS(LCASE(STR(?title)), "${escapeSparqlString(t)}"))`,
    )
    .join('\n  ');
  return `
PREFIX bcnnorms: <http://datos.bcn.cl/ontologies/bcn-norms#>
PREFIX dc: <http://purl.org/dc/elements/1.1/>

SELECT DISTINCT ?norma ?title ?number ?date ?code
WHERE {
  ?norma a bcnnorms:Norm .
  ?norma dc:title ?title .
  OPTIONAL { ?norma bcnnorms:hasNumber ?number }
  OPTIONAL { ?norma bcnnorms:publishDate ?date }
  OPTIONAL { ?norma bcnnorms:leychileCode ?code }
  ${andFilters}
}
ORDER BY DESC(?date)
LIMIT ${Math.min(Math.max(limit * 3, 12), 30)}
`.trim();
}

function buildNumberFilterSparql(term, limit) {
  return `
PREFIX bcnnorms: <http://datos.bcn.cl/ontologies/bcn-norms#>
PREFIX dc: <http://purl.org/dc/elements/1.1/>

SELECT DISTINCT ?norma ?title ?number ?date ?code
WHERE {
  ?norma a bcnnorms:Norm .
  ?norma dc:title ?title .
  OPTIONAL { ?norma bcnnorms:hasNumber ?number }
  OPTIONAL { ?norma bcnnorms:publishDate ?date }
  OPTIONAL { ?norma bcnnorms:leychileCode ?code }
  FILTER(CONTAINS(STR(?number), "${escapeSparqlString(term)}") || CONTAINS(STR(?code), "${escapeSparqlString(term)}"))
  FILTER(isNumeric(?number))
}
ORDER BY DESC(?date)
LIMIT ${Math.min(Math.max(limit * 2, 10), 25)}
`.trim();
}

/** Convierte un binding SPARQL de BCN/LeyChile en una fuente clasificada. */
function mapBcnBinding(b) {
  const title = b.title?.value;
  if (!title) return null;
  const code = b.code?.value;
  const number = b.number?.value;
  const date = b.date?.value?.slice(0, 10);
  let normType = classifyNormType(title);
  const normNumber = extractNormNumber(title) || number || null;
  // Las leyes chilenas suelen empezar por un verbo ("REGULA…", "CONSAGRA…",
  // "MODIFICA…") y llevan número puramente numérico de 4-7 dígitos. Las
  // resoluciones/decretos "exenta" no: se mantienen como "otra".
  if (
    normType === 'otra' &&
    normNumber &&
    /^\d{4,7}$/.test(normNumber)
  ) {
    normType = 'ley';
  }
  const vigency = detectNormVigency(title);
  const typeLabel = NORM_TYPE_LABELS[normType] || 'Norma';
  const citation = normNumber
    ? `${typeLabel} N° ${normNumber}${date ? ` (${date})` : ''}`
    : `${typeLabel} ${title}`;
  return {
    id: `bcn-${code || title}`,
    kind: 'normativa',
    source_type: 'normativa',
    legal_authority: 'vinculante',
    vigency,
    norm_type: normType,
    norm_number: normNumber,
    title,
    citation,
    date,
    url: code
      ? `https://www.bcn.cl/leychile/navegar?idNorma=${encodeURIComponent(code)}`
      : undefined,
    publisher: 'Biblioteca del Congreso Nacional / LeyChile',
    excerpt: `idNorma ${code || '—'} · ${NORM_TYPE_LABELS[normType] || 'Norma'} N° ${normNumber || '—'} · ${vigencyLabel(vigency)}`,
    metadata: {
      leychileCode: code || null,
      hasNumber: number || null,
      norm_type: normType,
      vigency,
      integrity: 'verified',
      source: 'bcn_sparql',
    },
  };
}

export async function searchBcnNormas(query, limit = 6) {
  // Si el abogado cita explícitamente un número de ley (Ley 19.628, norma 21.096…),
  // busca ese número directamente en el catálogo de LeyChile.
  const numberMatch = String(query || '').match(/\b\d{1,2}(?:[.,]\d{3,6}|\d{3,6})\b/);
  if (numberMatch) {
    const rawTerm = numberMatch[0];
    const variants = [rawTerm.replace('.', '').replace(',', ''), rawTerm.replace(',', '.')];
    for (const term of variants) {
      try {
        const sparql = buildNumberFilterSparql(term, limit);
        const data = await fetchJson(
          SPARQL_ENDPOINT,
          {
            method: 'POST',
            headers: {
              Accept: 'application/sparql-results+json',
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({ query: sparql }),
          },
          12000,
        );
        const bindings = data?.results?.bindings ?? [];
        const out = [];
        const seen = new Set();
        for (const b of bindings) {
          const src = mapBcnBinding(b);
          if (!src || seen.has(src.citation)) continue;
          seen.add(src.citation);
          out.push(src);
          if (out.length >= limit) break;
        }
        if (out.length > 0) return out;
      } catch {
        // Si la búsqueda numérica falla o no arroja resultados, cae al filtro por título.
      }
    }
  }

  const terms = [...new Set(
    String(query || '')
      .toLowerCase()
      .split(/\s+/)
      .map((t) => t.replace(/[^\p{L}\p{N}.-]/gu, ''))
      .filter((t) => t.length > 2 && !NORM_STOPWORDS.has(t))
  )].slice(0, 5);
  if (terms.length === 0) return [];

  // Prueba combos de términos de menos a más restrictivos (4→3→2→1) y los
  // ACUMULA: el AND con muchos términos es frágil y a veces solo un término
  // encuentra la ley correcta (p. ej. "protección de datos personales").
  // Luego ordena por cuántos términos coinciden (más = más relevante) y fecha.
  const attempts = [];
  for (let k = Math.min(terms.length, 4); k >= 1; k--) {
    attempts.push(terms.slice(0, k));
  }

  const merged = new Map(); // id -> { src, count, date }
  for (const attemptTerms of attempts) {
    const sparql = buildTitleFilterSparql(attemptTerms, limit);
    let data;
    try {
      data = await fetchJson(
        SPARQL_ENDPOINT,
        {
          method: 'POST',
          headers: {
            Accept: 'application/sparql-results+json',
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ query: sparql }),
        },
        12000,
      );
    } catch {
      continue;
    }
    const bindings = data?.results?.bindings ?? [];
    for (const b of bindings) {
      const src = mapBcnBinding(b);
      if (!src || merged.has(src.id)) continue;
      merged.set(src.id, { src, count: attemptTerms.length, date: src.date || '' });
    }
  }

  if (merged.size === 0) return [];
  const ranked = [...merged.values()].sort(
    (a, b) =>
      b.count - a.count ||
      (b.date < a.date ? -1 : b.date > a.date ? 1 : 0),
  );
  return ranked.slice(0, limit).map((r) => r.src);
}

// ---------------------------
// Fuente: OpenAlex (doctrina académica chilena)
// ---------------------------

export async function searchOpenAlexDoctrina(query, limit = 4) {
  const terms = normalizeSearchTerms(query, NORM_STOPWORDS);
  if (!terms) return [];
  const params = new URLSearchParams({
    search: terms,
    filter: 'authorships.institutions.country_code:CL',
    'per-page': String(Math.min(Math.max(limit, 1), 10)),
    sort: 'relevance_score:desc',
    select: 'id,title,doi,publication_year,primary_location,authorships',
  });
  const data = await fetchJson(`${OPENALEX_API}?${params}`);
  const works = data?.results ?? [];
  return works.slice(0, limit).map((w) => {
    const url =
      w.primary_location?.landing_page_url ||
      (w.doi ? `https://doi.org/${w.doi.replace(/^https?:\/\/doi\.org\//i, '')}` : '');
    const authors = Array.isArray(w.authorships)
      ? w.authorships.map((a) => a?.author?.display_name).filter(Boolean).join('; ')
      : '';
    return {
      id: `doctrina-${String(w.id).split('/').pop() || w.doi || w.title}`,
      kind: 'doctrina',
      source_type: 'doctrina',
      legal_authority: 'doctrinal',
      vigency: 'no_aplica',
      title: w.title,
      citation: authors ? `${authors}. (${w.publication_year}). ${w.title}.` : w.title,
      date: w.publication_year ? String(w.publication_year) : undefined,
      url,
      publisher: 'Doctrina académica (OpenAlex)',
      excerpt: truncate(authors ? `Autores: ${authors}` : '', 400),
      metadata: {
        source: 'openalex',
        doi: w.doi || null,
        integrity: 'candidate',
        legal_authority: 'doctrinal',
        vigency: 'no_aplica',
      },
    };
  });
}

// ---------------------------
// Orquestador
// ---------------------------

// Detecta el tipo de fuente que el abogado busca según la redacción de la
// consulta, para priorizar normativa, jurisprudencia o doctrina.
const QUERY_INTENT_KEYWORDS = {
  normativa: [
    'ley', 'leyes', 'norma', 'normas', 'normativa', 'regula', 'regulan',
    'regulación', 'regulacion', 'artículo', 'articulo', 'art.', 'código',
    'codigo', 'decreto', 'reforma', 'vigente', 'vigencia', 'disposición',
    'disposicion', 'texto legal', 'establece la ley', 'qué dice la ley',
    'que dice la ley', 'legal',
  ],
  jurisprudencia: [
    'jurisprudencia', 'sentencia', 'sentencias', 'fallo', 'fallos',
    'tribunal', 'corte suprema', 'corte de apelaciones', 'corte',
    'rol', 'resolución', 'resolucion', 'casación', 'casacion', 'recurso',
    'ha dicho', 'ha resuelto', 'se ha pronunciado', 'la corte',
    'los tribunales', 'doctrina jurisprudencial',
  ],
  doctrina: [
    'doctrina', 'doctrinario', 'autor', 'autores', 'sostiene', 'sostienen',
    'académico', 'academico', 'ensayo', 'libro', 'artículo académico',
    'articulo academico', 'papel de la doctrina', 'posición de la doctrina',
    'posicion de la doctrina',
  ],
};

export function detectQueryIntent(query) {
  const text = String(query || '')
    .toLowerCase()
    .normalize('NFC');
  const scores = { normativa: 0, jurisprudencia: 0, doctrina: 0 };
  for (const [kind, keywords] of Object.entries(QUERY_INTENT_KEYWORDS)) {
    for (const kw of keywords) {
      if (text.includes(kw)) scores[kind] += 1;
    }
  }
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const top = sorted[0];
  if (top[1] === 0) return 'general';
  return top[0];
}

/**
 * Ordena las fuentes según la intención de la consulta: la jerarquía por
 * defecto es Normativa → Jurisprudencia → Doctrina. Si el abogado pregunta
 * explícitamente por jurisprudencia o doctrina, ese tipo pasa al frente.
 */
export function prioritizeSources(sources, intent) {
  const order =
    intent === 'jurisprudencia'
      ? { jurisprudencia: 0, normativa: 1, doctrina: 2 }
      : intent === 'doctrina'
        ? { doctrina: 0, normativa: 1, jurisprudencia: 2 }
        : { normativa: 0, jurisprudencia: 1, doctrina: 2 };
  const ranked = [...sources];
  ranked.sort(
    (a, b) => (order[a.kind] ?? 9) - (order[b.kind] ?? 9),
  );
  return ranked;
}

/**
 * Busca jurisprudencia + normativa + doctrina de forma resiliente. Cada fuente
 * se consulta en paralelo; si una falla, no rompe las demás. Las fuentes se
 * ordenan según la intención de la consulta (normativa → jurisprudencia →
 * doctrina por defecto).
 * @param {string} query - Consulta en lenguaje natural del abogado.
 * @param {{ limit?: number, competencia?: string }} [opts]
 * @returns {Promise<{ sources: object[], warnings: string[], intent: string }>}
 */
export async function searchJurisprudence(
  query,
  { limit = 6, competencia = null } = {},
) {
  const warnings = [];
  const intent = detectQueryIntent(query);

  // Ajusta el reparto de fuentes según la intención: más del tipo buscado.
  const allocation =
    intent === 'normativa'
      ? { tc: Math.max(2, Math.round(limit * 0.3)), bcn: Math.max(3, limit), doctrina: 2 }
      : intent === 'doctrina'
        ? { tc: 3, bcn: 2, doctrina: Math.max(3, limit) }
        : { tc: Math.round(limit * 0.5), bcn: 3, doctrina: 3 };

  const [tc, bcn, doctrina] = await Promise.all([
    settleSearch(() => searchTcSentencias(query, allocation.tc, competencia), warnings),
    settleSearch(() => searchBcnNormas(query, allocation.bcn), warnings),
    settleSearch(() => searchOpenAlexDoctrina(query, allocation.doctrina), warnings),
  ]);

  const sources = prioritizeSources([...tc, ...bcn, ...doctrina], intent);
  return { sources, warnings, intent };
}