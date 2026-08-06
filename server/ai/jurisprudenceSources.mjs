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
// API JSON que usa la SPA de LeyChile para recuperar texto y metadatos de una
// norma (funciona sin credenciales). Devuelve el texto consolidado vía
// `html` y la vigencia/metadatos vía el campo `metadatos`.
const LEYCHILE_JSON_API = 'https://nuevo.leychile.cl/servicios/Navegar/get_norma_json';

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
  'articulo', 'art', 'n°', 'no', 'general', 'sin', 'número', 'numero',
  'saber', 'cual es', 'cuál es', 'explica',
  'esta', 'este', 'estos', 'estas', 'ese', 'eso', 'esa', 'esos', 'esas',
  'ella', 'ello', 'ello', 'ellos', 'ello', 'ellas', 'hace', 'hacen',
  'ser', 'fue', 'fueron', 'están', 'estan', 'más', 'mas', 'muy',
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
  diferida: 'Con vigencia diferida por fecha',
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

/** Norma "21719" → "21.719" (formato chileno). Conserva separadores si ya existen. */
export function formatNormNumber(value) {
  const s = String(value ?? '').trim();
  if (!s) return '';
  if (/[.,]/.test(s)) return s.replace(/,/g, '.');
  if (/^\d{1,6}$/.test(s)) return s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return s;
}

/**
 * Determina la vigencia de una norma. Prioriza la información EXPLÍCITA que
 * BCN/LeyChile reporta en sus metadatos (derogado, tipo de versión y fechas de
 * vigencia). Solo cuando BCN no la aporta se recurre a indicios del título;
 * y si tampoco hay indicios se devuelve "desconocida": NUNCA se asume vigente
 * sin que BCN lo declare.
 * @param {string} title - Título de la norma (indicio de menor confianza).
 * @param {{ derogado?: boolean, tipoVersionS?: string, inicioVigencia?: string,
 *           finVigencia?: string }} [info] - Metadatos explícitos de BCN/LeyChile.
 */
export function detectNormVigency(title, info = {}) {
  const infoDerogado = String(info?.derogado ?? '');
  if (
    info?.derogado === true ||
    /^(si|true|derogado|es[ ]?derogad[oa])$/i.test(infoDerogado.trim())
  ) {
    return 'derogada';
  }
  const tipoVersion = String(info?.tipoVersionS || '');
  const inicio = String(info?.inicioVigencia || '');
  // BCN declara una vigencia diferida ("Con Vigencia Diferida por Fecha") o
  // entrega una fecha de entrada en vigencia futura.
  if (/(diferida|diferido)/i.test(tipoVersion) || /^\d{4}-\d{2}-\d{2}$/.test(inicio)) {
    return 'diferida';
  }

  // Pista de menor confianza (solo si BCN no aportó metadatos).
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
  FILTER(STR(?number) = "${escapeSparqlString(term)}" || STR(?code) = "${escapeSparqlString(term)}")
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
  // Fase 4.0.4: cita profesional sin paréntesis de fecha (publicación y vigencia
  // se muestran por separado) y con el número en formato chileno ("Ley N° 21.719").
  const citation = normNumber
    ? `${typeLabel} N° ${formatNormNumber(normNumber)}`
    : `${typeLabel} ${title}`;
  return {
    id: `bcn-${code || title}`,
    kind: 'normativa',
    source_type: 'normativa',
    legal_authority: 'vinculante',
    vigency,
    norm_type: normType,
    norm_number: normNumber ? formatNormNumber(normNumber) : null,
    title,
    citation,
    date,
    url: code
      ? `https://www.bcn.cl/leychile/navegar?idNorma=${encodeURIComponent(code)}`
      : undefined,
    publisher: 'Biblioteca del Congreso Nacional / LeyChile',
    excerpt: `idNorma ${code || '—'} · ${NORM_TYPE_LABELS[normType] || 'Norma'} N° ${formatNormNumber(normNumber) || '—'} · ${vigencyLabel(vigency)}`,
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
  // Si el abogado cita explícitamente un número de ley (Ley 19.628, Ley N° 21.719,
  // Ley Nº 21.719, ley 21719…), busca ese número directamente en el catálogo de
  // LeyChile antes de depender de la búsqueda textual.
  const explicitNumbers = extractLawNumber(query);
  const byNumber = [];
  if (explicitNumbers.length > 0) {
    const seenNumber = new Set();
    const seenCode = new Set();
    const byNumberMatch = [];
    const byCodeMatch = [];
    for (const digits of explicitNumbers) {
      try {
        const sparql = buildNumberFilterSparql(digits, limit);
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
        for (const b of bindings) {
          const src = mapBcnBinding(b);
          if (!src) continue;
          // Prioriza el match por Nº de norma sobre el match por idNorma.
          const numberNorm = String(b.number?.value || '').replace(/[^0-9]/g, '');
          const isNumberMatch = numberNorm === digits;
          const target = isNumberMatch ? byNumberMatch : byCodeMatch;
          const seen = isNumberMatch ? seenNumber : seenCode;
          if (seen.has(src.id)) continue;
          seen.add(src.id);
          target.push(src);
          if (byNumberMatch.length + byCodeMatch.length >= limit) break;
        }
      } catch {
        // Si la búsqueda numérica falla o no arroja resultados, cae al filtro por título.
      }
    }
    // Prioriza los match por Nº de norma (respaldados por la ley). Los match
    // por idNorma se conservan solo si son leyes, para no arrastrar ruido.
    byNumber.push(
      ...byNumberMatch,
      ...byCodeMatch.filter((s) => s.norm_type === 'ley'),
    );
    if (byNumber[0]) byNumber[0].metadata = { ...byNumber[0].metadata, directNumberMatch: true };
  }

  const terms = [...new Set(
    String(query || '')
      .toLowerCase()
      .split(/\s+/)
      .map((t) => t.replace(/[^\p{L}\p{N}.-]/gu, ''))
      .filter((t) => t.length > 2 && !NORM_STOPWORDS.has(t))
  )].slice(0, 5);
  if (byNumber.length > 0) {
    return await augmentNormasWithText(byNumber, query);
  }
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
  const normTypeRank = { ley: 0, codigo: 1, dfl: 2, decreto: 3, constitucion: 4, reglamento: 5, resolucion: 6, otra: 7 };
  const ranked = [...merged.values()].sort(
    (a, b) =>
      b.count - a.count ||
      (normTypeRank[a.src.norm_type] ?? 9) - (normTypeRank[b.src.norm_type] ?? 9) ||
      (b.date < a.date ? -1 : b.date > a.date ? 1 : 0),
  );
  const srcs = ranked.slice(0, limit).map((r) => r.src);
  // En general enriquecemos solo las 1-2 normas con más texto para no saturar.
  return await augmentNormasWithText(srcs, query);
}

// ---------------------------
// Fase 4.0.3: texto verificable de normas BCN/LeyChile
// ---------------------------

// Mapa de entidades HTML nombradas frecuentes en el texto legal de LeyChile.
const NAMED_ENTITIES = {
  amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ', times: '×',
  ndash: '–', mdash: '—', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
  aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú',
  Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú',
  ntilde: 'ñ', Ntilde: 'Ñ', uml: '¨', uuml: 'ü', auml: 'ä', ouml: 'ö',
  agrave: 'à', egrave: 'è', igrave: 'ì', ograve: 'ò', ugrave: 'ù',
  nbspx: ' ', brvbar: '¦', sect: '§', para: '¶', middot: '·', ordf: 'ª',
  ordm: 'º', deg: '°', iexcl: '¡', iquest: '¿', laquo: '«', raquo: '»',
  micro: 'µ', dagger: '†', sup2: '²', sup3: '³', frac12: '½',
};

/** Convierte el HTML/entidades de LeyChile en texto plano. */
export function htmlToPlainText(html) {
  const out = String(html || '')
    .replace(/<[a-zA-Z/][^>]*>/g, ' ')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-zA-Z]+);/g, (m, name) =>
      NAMED_ENTITIES[name] !== undefined ? NAMED_ENTITIES[name] : m,
    );
  return out.replace(/\s+/g, ' ').trim();
}

/** División y ordenamiento de fragmentos por artículo de una norma. */

/**
 * Detecta si la consulta menciona explícitamente el número de una ley, en sus
 * variantes ("Ley 21.719", "Ley N° 21.719", "Ley Nº 21.719", "ley 21719"…).
 * Devuelve un arreglo con los dígitos normalizados (sin puntuación) para la
 * búsqueda directa en el catálogo BCN/LeyChile. Vacío => consulta general.
 */
export function extractLawNumber(query) {
  const text = String(query || '').normalize('NFC');
  const found = new Set();
  const pushDigits = (raw) => {
    const digits = raw.replace(/[^0-9]/g, '');
    if (/^\d{4,9}$/.test(digits)) found.add(digits);
  };
  // Con la palabra "Ley": Ley N° 21.719 / Ley 21719 / Ley Nº 19.628.
  const withLey = /\bley(?:es)?\s*(?:n\s*[°º]\.?|n[úu]mero\.?)?\s*(\d{1,2}(?:[.,]\d{3,6})|\d{4,7})\b/gi;
  for (const m of text.matchAll(withLey)) {
    pushVariant(m[1]);
  }
  // Sin la palabra "ley" pero con formato de número chileno (dígitos separados
  // por punto, ej. "21.719"). Evita números sueltos de consultas generales.
  const dotted = /\b(\d{1,2}\.\d{3,6})\b/g;
  for (const m of text.matchAll(dotted)) pushVariant(m[1]);

  return [...found];

  function pushVariant(raw) {
    const clean = raw.replace(/[.,]/g, '');
    if (/^\d{4,7}$/.test(clean)) found.add(clean);
  }
}

/**
 * Divide el texto consolidado de una norma en fragmentos por artículo.
 * Cada fragmento conserva su etiqueta de artículo y el texto literal.
 */
/**
 * Divide el texto consolidado de una norma en fragmentos por artículo.
 * Cada fragmento conserva su etiqueta de artículo y el texto literal.
 */
export function splitLawArticles(text, { maxChars = 4000 } = {}) {
  const src = String(text || '').trim();
  if (!src) return [];
  // Separación de encabezados: "Artículo primero.-", "Artículo 1°.-",
  // "Art. 22.-", "Artículo segundo transitorio". Se busca el encabezado al
  // inicio de la sección para no confundir menciones dentro del cuerpo.
  const ordinal = '(?:primera|primero|segunda|segundo|tercera|tercero|' +
    'cuarta|cuarto|quinta|quinto|sexta|sexto|se[eé]ptima|se[eé]ptimo|' +
    'octava|octavo|novena|noveno|d[eé]cima|d[eé]cimo)';
  const numero = '(?:\\d{1,3}(?:[\\.\\,0-9]*))';
  const headingRe = new RegExp(
    '(?:^|\\s)(Art(?:[\\u00ed]culo|[.]|\\.)?\\s*(?:N[°º]\\s*\\.?)?\\s*(' + numero + '|' + ordinal + '))\\b',
    'gim',
  );
  const boundaries = [];
  let m;
  while ((m = headingRe.exec(src)) !== null) boundaries.push(m);
  if (boundaries.length === 0) {
    return src.length ? [{ article: 'Preámbulo', text: src }] : [];
  }
  const out = [];
  boundaries.forEach((match, i) => {
    const start = match.index + (match[0].startsWith(' ') ? 1 : 0);
    const end = i + 1 < boundaries.length ? boundaries[i + 1].index : src.length;
    const label = match[1].trim();
    const body = src.slice(start, end).trim();
    if (!body) return;
    const chunk = body.length > maxChars ? `${body.slice(0, maxChars)}…` : body;
    if (label) out.push({ article: label, text: chunk });
  });
  return out.filter((f) => f.text && f.text.length > 0);
}

/**
 * Términos jurídicos GENÉRICOS que por sí solos NO prueban una afirmación
 * ("derechos", "titulares", "datos", "tratamiento"...). La presencia de estos
 * términos en un fragmento no puede respaldar un claim que enumera conceptos
 * sustantivos concretos; sirven solo como contexto.
 */
const GENERIC_CONCEPTS = new Set([
  'derecho', 'derechos', 'titular', 'titulares', 'dato', 'datos',
  'tratamiento', 'persona', 'personas', 'personal', 'personales',
  'informacion', 'materia', 'materias', 'norma', 'normas', 'normativa',
  'regulacion', 'objeto', 'ambito', 'finalidad', 'condicion', 'condiciones',
  'manera', 'forma', 'ejercicio', 'disposicion', 'disposiciones', 'sujeto',
  'sujetos', 'sujeta', 'sujetas', 'contenido', 'efecto', 'efectos',
  'corresponda', 'correspondan', 'correspondiente', 'conformidad', 'conforme',
  'aplicacion', 'solicitar', 'obtener', 'mantener', 'facilitar', 'poner',
  'realizar', 'recopilar', 'regular', 'regulan', 'regula', 'proteger',
  'protege', 'proteccion', 'reconoce', 'reconozca', 'reconozcan',
  'reconociendo', 'establecer', 'establecida', 'confiere', 'confieren',
  'otorga', 'otorgan', 'garantiza', 'garantizan', 'asegura', 'aseguran',
  'permite', 'permiten', 'permitir', 'dispone', 'dispondra', 'contempla',
  'contemplan', 'consagra', 'incorpora', 'incluye', 'incluyendo', 'debera',
  'deber', 'deben', 'debe', 'deben', 'goza', 'gozar', 'gozara', 'gozando',
  'podra', 'podran', 'podria', 'pueda', 'pueden', 'tiene', 'tienen',
  'adquirido', 'otorgando',
]);

/** Normaliza un texto a tokens sin acentos (palabras simples, ≥4 caracteres). */
export function normalizeClaimTokens(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9ñ\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 4 && !NORM_STOPWORDS.has(t));
}

/**
 * Extrae los TÉRMINOS SUSTANTIVOS de un texto (tokens normalizados ≥4
 * caracteres, sin stopwords ni conceptos genéricos). Se usa como base común
 * para la verificación de claims, la síntesis verificada y la detección de
 * contradicciones (Fase 4.1).
 * @param {string} text
 * @returns {string[]}
 */
export function extractSubstantiveTerms(text) {
  return normalizeClaimTokens(text).filter((t) => !GENERIC_CONCEPTS.has(t));
}

/** Verifica si un término aparece como PALABRA COMPLETA en texto normalizado. */
function hasWord(normText, term) {
  const escaped = String(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9ñ])${escaped}($|[^a-z0-9ñ])`).test(normText);
}

/**
 * Ordena los fragmentos según su relevancia a la consulta, priorizando la
 * coincidencia de CONCEPTOS JURÍDICOS SUSTANTIVOS (los términos genéricos como
 * "datos", "titulares" o "tratamiento" puntúan menos que conceptos concretos
 * como "supresión" o "portabilidad"). Los empates conservan el orden original.
 */
export function rankFragments(query, fragments, { limit = 5 } = {}) {
  const tokens = normalizeClaimTokens(query);
  const scored = fragments
    .map((f, index) => {
      const norm = `${f.article} ${f.text}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      let score = 0;
      for (const t of tokens) {
        if (!hasWord(norm, t)) continue;
        score += GENERIC_CONCEPTS.has(t) ? 1 : 2;
      }
      return { fragment: f, score, index };
    })
    .filter((s) => s.score > 0 || fragments.length <= limit);
  const ranked = scored.sort((a, b) => b.score - a.score || a.index - b.index);
  return ranked.slice(0, limit).map((s) => s.fragment);
}

/**
 * Determina si una afirmación está respaldada por el TEXTO de un fragmento,
 * distinguiendo "la fuente contiene el tema" de "el fragmento prueba la
 * afirmación". Reglas:
 *   - Las palabras se comparan como términos completos (no por subcadena).
 *   - Los conceptos sustantivos (acceso, supresión, portabilidad...) son los
 *     que cuentan; los términos genéricos (derechos, titulares, datos,
 *     tratamiento) NO pueden respaldar una enumeración concreta.
 *   - Si el claim contiene una ENUMERACIÓN jurídica (lista de ≥3 conceptos
 *     separados por comas o "y"/"o"), el fragmento debe contener TODOS los
 *     elementos enumerados; si falta uno, no es evidencia suficiente.
 *   - Si no hay conceptos sustantivos, se exige cobertura muy alta de términos.
 * @param {{ text?: string }|string} fragment - fragmento (objeto o texto plano).
 * @param {string} claimText - afirmación/concepto a verificar.
 * @returns {boolean}
 */
export function fragmentSupportsClaim(fragment, claimText, { minOverlap = 0.5 } = {}) {
  const normText = String(fragment?.text || fragment || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const tokens = normalizeClaimTokens(claimText);
  if (tokens.length < 2) return false;

  const substantive = tokens.filter((t) => !GENERIC_CONCEPTS.has(t));

  // Enumeración jurídica concreta: exige TODOS los elementos en el fragmento.
  const rawClaim = String(claimText || '');
  const isEnumeration =
    substantive.length >= 3 && (/,\s*/.test(rawClaim) || /\s(?:y|o|e)\s/i.test(rawClaim));
  if (isEnumeration) {
    const present = substantive.filter((t) => hasWord(normText, t));
    return present.length === substantive.length;
  }

  if (substantive.length >= 2) {
    const present = substantive.filter((t) => hasWord(normText, t));
    return present.length >= 2 && present.length / substantive.length >= minOverlap;
  }

  if (substantive.length === 1) {
    return hasWord(normText, substantive[0]);
  }

  // Sin conceptos sustantivos: se exige cobertura muy alta de los términos.
  const matched = tokens.filter((t) => hasWord(normText, t)).length;
  return matched / tokens.length >= 0.8;
}

/**
 * Asocia una afirmación al fragmento ESPECÍFICO que la respalda. rankFragments
 * favorece los fragmentos que contienen directamente los CONCEPTOS SUSTANTIVOS
 * de la afirmación; luego fragmentSupportsClaim exige que el texto del fragmento
 * efectivamente contenga esos conceptos (todos, si es una enumeración). Devuelve
 * el fragmento respaldante o null si ninguno respalda suficientemente.
 * @param {string} claimText - afirmación a respaldar.
 * @param {Array<{ article: string, text: string, id?: string }>} fragments
 * @returns {{ id?: string, article: string, text: string } | null}
 */
export function resolveClaimFragment(claimText, fragments, { minOverlap = 0.5 } = {}) {
  if (!Array.isArray(fragments) || fragments.length === 0) return null;
  const ranked = rankFragments(claimText, fragments, { limit: fragments.length });
  for (const frag of ranked) {
    if (fragmentSupportsClaim(frag, claimText, { minOverlap })) return frag;
  }
  return null;
}

const LEYCHILE_URL = (code) => `https://www.bcn.cl/leychile/navegar?idNorma=${encodeURIComponent(code)}`;

const CHILE_MONTHS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

/** Convierte una fecha ISO (2026-12-01) al formato usado por LeyChile (01-DIC-2026). */
export function formatChileanDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  if (!m) return iso;
  const [, year, month, day] = m;
  const label = CHILE_MONTHS[Number(month) - 1] || month;
  return `${day}-${label}-${year}`;
}

/** Construye un detalle legible de la vigencia diferenciando publicación de entrada en vigencia. */
export function buildVigenciaDetail(meta = {}) {
  const tipo = String(meta.tipo_version_s || '');
  const inicio = String(meta.vigencia?.inicio_vigencia || meta.inicio_vigencia || '');
  const publicacion = String(meta.fecha_publicacion || '');
  const parts = [];
  if (tipo) parts.push(tipo);
  if (inicio) parts.push(`entra en vigencia el ${formatChileanDate(inicio)}`);
  if (publicacion) parts.push(`publicada el ${publicacion}`);
  return parts.join(' · ');
}

/**
 * Recupera el texto consolidado y los metadatos de una norma desde la API JSON
 * que consume LeyChile. Devuelve null si no se puede acceder (para no romper
 * la búsqueda: en ese caso la fuente queda solo con metadatos).
 */
async function getLeyChileText(code, timeoutMs = 15000) {
  if (!/^\d+$/.test(String(code || ''))) return null;
  const url = `${LEYCHILE_JSON_API}?${new URLSearchParams({ idNorma: code, idVersion: '', idLey: '' })}`;
  const data = await fetchJson(url, {}, timeoutMs);
  if (!data || !Array.isArray(data.html)) return null;
  return {
    meta: data.metadatos || {},
    html: data.html,
    plain: htmlToPlainText(data.html.map((b) => (typeof b === 'string' ? b : (b && b.t) || '')).join('\n')),
  };
}

/**
 * Enriquece una fuente de normativa BCN con el texto real de LeyChile
 * (fragmentos por artículo), la vigencia explícita y las referencias oficiales.
 * Si la recuperación falla, devuelve la fuente original sin texto.
 */
async function augmentNormaWithText(src, query) {
  const code = src?.metadata?.leychileCode;
  if (!code || src.metadata?.integrity === 'text_verified') return src;
  let ley;
  try {
    ley = await getLeyChileText(code);
  } catch {
    return src;
  }
  if (!ley || !ley.plain) return src;
  const fragments = splitLawArticles(ley.plain);
  const selected = rankFragments(query, fragments, { limit: 6 });
  if (selected.length === 0) return src;

  const vigency = detectNormVigency(src.title, {
    derogado: ley.meta.derogado,
    tipoVersionS: ley.meta.tipo_version_s,
    inicioVigencia: ley.meta.vigencia?.inicio_vigencia,
  });
  const fechaPublicacion = ley.meta.fecha_publicacion || src.date;
  const entradaVigencia = ley.meta.vigencia?.inicio_vigencia || null;

  const excerpt = selected
    .map((f) => `[${f.article}] ${f.text}`)
    .join('\n\n');

  const baseUrl = LEYCHILE_URL(code);
  return {
    ...src,
    vigency,
    date: fechaPublicacion,
    excerpt: excerpt.slice(0, 14000),
    metadata: {
      ...src.metadata,
      integrity: 'text_verified',
      idNorma: code,
      leychileCode: code,
      officialUrl: baseUrl,
      fechaPublicacion,
      fechaEntradaVigencia: entradaVigencia,
      vigenciaTipo: ley.meta.tipo_version_s || null,
      vigencia_detail: buildVigenciaDetail(ley.meta),
      fragments: selected.map((f, i) => ({
        id: `frag:${code}:${i + 1}`,
        article: f.article,
        text: f.text,
        idNorma: code,
        url: baseUrl,
      })),
    },
  };
}

/** Enriquece hasta las 2 normas más relevantes de un listado con su texto real. */
async function augmentNormasWithText(sources, query) {
  if (!Array.isArray(sources) || sources.length === 0) return sources;
  const byRelevance = [...sources];
  const best = byRelevance.find((s) => s.kind === 'normativa' && s.metadata?.leychileCode);
  if (!best) return sources;
  const target = byRelevance
    .filter((s) => s.kind === 'normativa' && s.metadata?.leychileCode)
    .slice(0, 2);
  const results = await Promise.allSettled(
    target.map((src) => augmentNormaWithText(src, query)),
  );
  const enriched = new Map();
  target.forEach((src, i) => {
    if (results[i]?.status === 'fulfilled' && results[i].value) {
      enriched.set(src.id, results[i].value);
    }
  });
  return byRelevance.map((src) => enriched.get(src.id) || src);
}

// ---------------------------
// Fuente: OpenAlex (doctrina académica chilena)
// ---------------------------

/**
 * Reconstruye el abstract de OpenAlex desde su índice invertido.
 * @param {Record<string, number[]>|null} invertedIndex
 * @returns {string}
 */
export function reconstructOpenAlexAbstract(invertedIndex) {
  if (!invertedIndex || typeof invertedIndex !== 'object') return '';
  const words = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    if (!Array.isArray(positions)) continue;
    for (const pos of positions) {
      if (Number.isInteger(pos) && pos >= 0) words[pos] = word;
    }
  }
  return words.filter(Boolean).join(' ').trim();
}

export async function searchOpenAlexDoctrina(query, limit = 4) {
  const terms = normalizeSearchTerms(query, NORM_STOPWORDS);
  if (!terms) return [];
  const params = new URLSearchParams({
    search: terms,
    filter: 'authorships.institutions.country_code:CL',
    'per-page': String(Math.min(Math.max(limit, 1), 10)),
    sort: 'relevance_score:desc',
    select: 'id,title,doi,publication_year,primary_location,authorships,abstract_inverted_index',
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
    // Fase 4.1 (Etapa 6): doctrina mínimamente usable. Solo si hay abstract se
    // genera contenido citable; si no, la fuente queda sin fragmento textual
    // (metadata de bajo valor) y no podrá respaldar claims.
    const abstract = reconstructOpenAlexAbstract(w.abstract_inverted_index);
    const abstractExcerpt = truncate(abstract, 1200);
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
      excerpt: abstractExcerpt
        ? `Doctrina (no vinculante) — ${abstractExcerpt}`
        : truncate(authors ? `Autores: ${authors}` : '', 400),
      metadata: {
        source: 'openalex',
        doi: w.doi || null,
        authors: authors || null,
        abstract: abstractExcerpt || null,
        integrity: abstractExcerpt ? 'candidate' : 'low_value',
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