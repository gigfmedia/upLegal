// ---------------------------------------------------------------------------
// LegalUp AI — Fase 4.0: Investigación de jurisprudencia.
// Búsqueda en fuentes públicas reales (sin API key comercial):
//   - Tribunal Constitucional (fallos reales con rol, extracto y ficha).
//   - BCN / LeyChile SPARQL (normativa con idNorma y URL oficial).
//   - OpenAlex (doctrina académica chilena).
// PJUD NO publica una API de texto: por eso este módulo solo devuelve fuentes
// verificables de las fuentes públicas anteriores y sus portales oficiales.
// ---------------------------------------------------------------------------

import { createHash } from 'node:crypto';

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

// Queries de hasta este número de términos se envían tal cual (comportamiento
// actual). Solo las consultas más largas activan el fallback progresivo.
const TC_MAX_QUERY_TERMS = 4;
// Cota superior de intentos hacia la API del TC en el fallback (evita retries
// ciegos o llamadas excesivas cuando el proveedor no devuelve resultados).
const TC_QUERY_MAX_ATTEMPTS = 8;
// Tamaños de ventana de los subconjuntos de términos del fallback, de más
// específicos (3 términos) a más generales (2 términos).
const TC_FALLBACK_WINDOW_SIZES = [3, 2];
// Presupuesto máximo de subconjuntos emitidos por tamaño de ventana: asegura
// que los pares de 2 términos (los más efectivos contra la API del TC) no
// queden fuera del tope total de intentos.
const TC_FALLBACK_WINDOW_BUDGET = 4;
// Términos de bajo valor informativo para la búsqueda en el TC: se ordenan al
// final para que los subconjuntos prioricen conceptos jurídicos específicos,
// números de ley y entidades. No se descartan (la selección es determinística).
const TC_LOW_INFORMATION_TERMS = new Set([
  'ley', 'tribunal', 'constitucional', 'constitucionalidad', 'derecho',
  'norma', 'normas', 'sentencia', 'sentencias', 'fallo', 'fallos', 'caso',
  'causa', 'recurso', 'reclamo', 'reclamacion', 'sancion', 'requerimiento',
  'expediente', 'resolucion', 'pronunciamiento', 'jurisprudencia', 'tema',
  'materia', 'principio', 'vulnera', 'vulneracion', 'infringe', 'impugna',
  'declara', 'declarar', 'establece', 'establecer', 'regula', 'regular',
  'proteccion', 'proteger', 'normativo', 'normativa', 'legal', 'legales',
  'pregunta', 'consulta', 'relaciona', 'relacion', 'segun', 'porque', 'como',
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

/**
 * Une entidades de numeración legal separadas por punto (ej. "21.719",
 * "19.628", "20.285", "21.644") en una sola representación sin separadores
 * ("21719"), para que la búsqueda no las fragmente en tokens numéricos sueltos
 * por el punto ("21" + "719") que generan coincidencias incidentales. No toca
 * años (sin punto), fechas ("13.12.2024": último grupo de 2 dígitos / tres
 * grupos) ni RUT ("12.345.678-9": 3 o más grupos), que permanecen igual.
 */
function mergeNumericEntities(text) {
  return String(text || '').replace(/\b\d{1,3}\.\d{3,4}\b(?!\.)/g, (match) =>
    match.replace(/\./g, ''),
  );
}

/** Normaliza una query: quita puntuación, stopwords y acentos para búsquedas. */
function normalizeSearchTerms(query, stopwords, { preserveNumberEntities = false } = {}) {
  const raw = String(query || '').normalize('NFC').trim();
  if (!raw) return '';
  const prepared = preserveNumberEntities ? mergeNumericEntities(raw) : raw;
  const tokens = prepared
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

/** Hash no reversible de la consulta para correlacionar logs sin exponer el texto. */
function hashQuery(query) {
  try {
    return createHash('sha256').update(String(query || '')).digest('hex').slice(0, 16);
  } catch {
    return '';
  }
}

/** Clasifica el error de red para logs estructurados (sin secretos). */
function classifyFetchError(error) {
  const msg = error instanceof Error ? error.message : String(error);
  if (error?.name === 'AbortError' || /aborted|timed? ?out|timeout/i.test(msg)) return 'timeout';
  if (/^HTTP \d{3}/.test(msg)) return 'http_error';
  if (/JSON|parse|Unexpected token/i.test(msg)) return 'invalid_response';
  return 'network_error';
}

/** Emite un log estructurado de diagnóstico (sin datos sensibles). */
function logDiagnostic(event, fields) {
  try {
    console.warn(`[LegalUpAI] ${event}`, JSON.stringify(fields));
  } catch {
    // Nunca debe romper el pipeline por un fallo de logging.
  }
}

/**
 * Limpia un mensaje de error para logs: elimina los query params de cualquier
 * URL (los términos de búsqueda van como query string) y recorta la longitud.
 * Previene que términos derivados de la consulta del usuario terminen en logs.
 */
function sanitizeLogMessage(msg) {
  return String(msg || '')
    .replace(/(https?:\/\/[^\s?]+)\?[^\s]*/gi, '$1')
    .replace(/[?#][^\s]*$/g, '')
    .slice(0, 300)
    .trim();
}

/** Resuelve cada búsqueda con allSettled: si una fuente falla no rompe el resto. */
async function settleSearch(provider, fn, warnings, { queryHash = '' } = {}) {
  const startedAt = Date.now();
  try {
    const sources = await fn();
    logDiagnostic('jurisprudence_search_provider_status', {
      provider,
      status: sources.length > 0 ? 'ok' : 'empty',
      source_count: sources.length,
      duration_ms: Date.now() - startedAt,
      query_hash: queryHash,
    });
    return sources;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    warnings.push(msg);
    logDiagnostic('jurisprudence_search_provider_error', {
      provider,
      status: 'error',
      error_type: classifyFetchError(error),
      duration_ms: Date.now() - startedAt,
      query_hash: queryHash,
      error: sanitizeLogMessage(msg),
    });
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

/** Construye la URL del endpoint de sentencias del TC para un término dado. */
function buildTcSentenciasUrl(search, competencia = null) {
  const filter = encodeURIComponent(JSON.stringify(buildTcFilter(search, competencia)));
  return `${TC_API}/sentencias?filter=${filter}`;
}

/** Dobla un término: minúsculas y sin diacríticos (para comparaciones internas). */
function foldTerm(term) {
  return String(term || '').toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').trim();
}

/**
 * Determina si un término es de bajo valor informativo para la búsqueda TC.
 * Solo usa lists fija/stopwords: es determinístico y no depende del texto crudo.
 */
function isTcLowInfoTerm(term) {
  const folded = foldTerm(term);
  return folded.length <= 1 || TC_LOW_INFORMATION_TERMS.has(folded);
}

/**
 * Normaliza el texto de una fila TC para compararlo con los términos señal de
 * un intento: minúsculas, sin diacríticos, y con la misma fusión de entidades
 * numéricas ("21.719" → "21719") que se aplica a la consulta, para que la
 * comparación sea consistente.
 */
function normalizeSignalText(text) {
  return mergeNumericEntities(String(text || ''))
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9ñ\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Términos "señal" de un intento de búsqueda TC: tokens informativos usados
 * para evaluar si las filas devueltas por el proveedor tienen respaldo temático
 * real en su texto (a diferencia de coincidencias incidentales de números
 * sueltos o palabras genéricas). Excluye tokens de bajo valor informativo y
 * tokens numéricos cortos; años y números de ley fusionados se conservan.
 */
function getTcSignalTerms(search) {
  return (search || '')
    .split(/\s+/)
    .filter(Boolean)
    .map(foldTerm)
    .filter((t) => t.length >= 3 && !isTcLowInfoTerm(t));
}

/** Indica si una fila TC contiene todos los términos señal del intento. */
function tcRowHasSignals(row, signals) {
  if (signals.length === 0) return true;
  const text = normalizeSignalText(
    `${row.content || ''} ${(row.highlightParagraphs || [])
      .map((h) => h.full ?? h.summary ?? '')
      .filter((v) => v && typeof v === 'string')
      .join(' ')}`,
  );
  return signals.every((signal) => text.includes(signal));
}

/**
 * Genera de forma determinística la lista ordenada de subconjuntos de términos
 * que se probarán contra la API del TC cuando la query normalizada es larga:
 *   - conserva números de ley / artículos (lo más específico) al frente,
 *   - prioriza conceptos jurídicos informativos antes que términos genéricos,
 *   - va de subconjuntos más específicos (más términos) a más generales.
 * Devuelve [] si la consulta ya es corta (el llamado inicial la cubre).
 * @param {string} search - Query normalizada (tokens unidos por espacios).
 * @returns {string[]} Variantes ordenadas más específicas → más generales.
 */
export function buildTcSearchTermVariants(search) {
  const tokens = (search || '').split(/\s+/).filter(Boolean);
  if (tokens.length <= TC_MAX_QUERY_TERMS) return [];

  // Anclas (números de ley/artículo) primero: identifican la materia concreta.
  const anchors = tokens.filter((t) => /\d/.test(t));
  const content = tokens.filter((t) => !/\d/.test(t));
  // Términos informativos antes que los genéricos (bajo valor para el TC).
  const ranked = [
    ...content.filter((t) => !isTcLowInfoTerm(t)),
    ...content.filter((t) => isTcLowInfoTerm(t)),
  ];
  const base = [...anchors, ...ranked].map(foldTerm);

  const out = [];
  const seen = new Set();
  for (const size of TC_FALLBACK_WINDOW_SIZES) {
    if (size > base.length) continue;
    let emitted = 0;
    for (let i = 0; i + size <= base.length; i++) {
      if (out.length >= TC_QUERY_MAX_ATTEMPTS - 1) break;
      if (emitted >= TC_FALLBACK_WINDOW_BUDGET) break;
      const cand = base.slice(i, i + size).join(' ');
      if (!seen.has(cand)) {
        seen.add(cand);
        emitted += 1;
        out.push(cand);
      }
    }
  }
  if (out.length === 0) out.push(foldTerm(search));
  return out.slice(0, TC_QUERY_MAX_ATTEMPTS - 1);
}

// Número máximo de caracteres retenidos como evidencia sustantiva por fuente TC.
const TC_SUBSTANTIVE_SOURCE_CHARS = 3000;

// Patrón de cabecera de ficha/notificación del proveedor TC (líneas de correo o
// metadata que NO son contenido jurídico de la sentencia).
const TC_HEADER_LINE_RE =
  /^(?:de|enviado el|para|asunto|datos adjuntos?|cc|bcc|importancia|prioridad|urgencia|adjuntos?|destinatarios?)\s*[:：][^\n]*\n?/gi;

// Palabras numéricas (castellano) usadas por el proveedor TC en los números de
// página ("SEISCIENTOS DIEZ Y OCHO") y que NO son contenido jurídico.
const TC_PAGE_NUMBER_WORDS = new Set([
  'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve',
  'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciseis',
  'diecisiete', 'dieciocho', 'diecinueve', 'veinte', 'veintiuno', 'veintidos',
  'veintitres', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta',
  'ochenta', 'noventa', 'cien', 'ciento', 'doscientos', 'doscientas',
  'trescientos', 'trescientas', 'cuatrocientos', 'cuatrocientas',
  'quinientos', 'quinientas', 'seiscientos', 'seiscientas', 'setecientos',
  'setecientas', 'ochocientos', 'ochocientas', 'novecientos', 'novecientas',
  'mil', 'millon', 'millones', 'y',
]);
const TC_PAGE_NUMBER_RE = new RegExp(
  `^(?:${[...TC_PAGE_NUMBER_WORDS].join('|')})(?:\s+(?:${[
    ...TC_PAGE_NUMBER_WORDS,
  ].join('|')}))*$`,
  'i',
);

// Términos demasiado genéricos para priorizar ventanas de evidencia dentro del
// texto de un fallo (no afectan la búsqueda, solo la selección del excerpt).
// "constitucional"/"chile" aparecen en casi todo fallo del TC y no discriminan.
const TC_EXCERPT_GENERIC_TERMS = new Set([
  'constitucional', 'chile', 'chileno', 'chilenos', 'existe', 'existencia',
  'existen', 'tribunal', 'sentencia', 'santiago', 'republica',
]);

/**
 * Límpia texto de cabeceras de ficha/notificación del proveedor TC (líneas tipo
 * "De:", "Para:", "Asunto:", "Datos adjuntos:", campos de correo). Solo elimina
 * esa metadata administrativa; no descarta contenido narrativo de la sentencia.
 * @param {string} text
 * @returns {string}
 */
export function cleanTcSubstantiveText(text) {
  const t = String(text || '').trim();
  if (!t) return '';
  return t.replace(TC_HEADER_LINE_RE, '').trim();
}

/** Dobla texto de un bloque del fallo para compararlo con términos de la query. */
function foldContentShard(text) {
  return mergeNumericEntities(
    String(text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, ''),
  );
}

/**
 * Términos significativos de la consulta para extraer ventanas del fallo:
 * tokens >= 3 caracteres, sin stopwords del TC ni términos genéricos del
 * excerpt. Preserva entidades numéricas legales fusionadas ("21.719"→"21719").
 */
function getTcExcerptTerms(query) {
  const merged = mergeNumericEntities(String(query || '').normalize('NFC'));
  const tokens = merged
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const seen = new Set();
  const terms = [];
  for (const t of tokens) {
    const folded = t.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
    if (folded.length < 3) continue;
    if (TC_STOPWORDS.has(folded) || TC_EXCERPT_GENERIC_TERMS.has(folded)) continue;
    if (seen.has(folded)) continue;
    seen.add(folded);
    terms.push(folded);
  }
  return terms;
}

/** Bloque puramente ruidoso (número de página, validación, banner)? */
function isTcNoiseBlock(text) {
  const t = String(text || '').trim();
  if (!t) return true;
  // Números de página ("0000544", "2022", "13") o marcadores SEO.
  if (/^\d+[.\s\d-]*$/.test(t) && /\d/.test(t) && !/[a-zñáéíóú]/i.test(t)) return true;
  // Código de validación u otros sellos del proveedor.
  if (/^c[oó]digo de validaci[oó]n/i.test(t)) return true;
  // Banners y separadores.
  if (/^repl[úu]blica de chile$/i.test(t)) return true;
  if (/^tribunal constitucional$/i.test(t)) return true;
  if (/^[_\-=*]{3,}$/.test(t)) return true;
  // Número de página en palabras ("SEISCIENTOS DIEZ Y OCHO").
  const words = t
    .replace(/[^\p{L}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (words.length && words.every((w) => TC_PAGE_NUMBER_RE.test(w))) return true;
  return false;
}

/** Divide el texto del fallo en bloques sustantivos, descartando ruido. */
function splitTcContentBlocks(content) {
  const parts = String(content || '').split(/\n\s*\n/);
  const blocks = [];
  for (const p of parts) {
    const lines = p.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;
    const text = lines.join(' ');
    if (isTcNoiseBlock(text)) continue;
    const folded = foldContentShard(text);
    if (!folded) continue;
    blocks.push({ index: blocks.length, text, folded });
  }
  return blocks;
}

/**
 * Extracción determinística y consciente de la consulta sobre el texto completo
 * del fallo. Busca ventanas alrededor de los términos significativos de la
 * consulta, prioriza los fragmentos donde coinciden varios términos, incluye
 * contexto de los bloques vecinos y siempre conserva el bloque que declara la
 * materia y la norma impugnada (REQUERIMIENTO/VISTOS/Sentencia Rol). Nunca
 * sintetiza ni inventa texto.
 * @param {string} content - texto completo del fallo (`row.content`).
 * @param {string} query - consulta del usuario (para priorizar ventanas).
 * @param {number} maxChars - presupuesto máximo del excerpt.
 * @returns {string} excerpt sustantivo ('' si no hay términos útiles).
 */
function extractTcQueryAwareExcerpt(content, query, maxChars) {
  const termFoldeds = getTcExcerptTerms(query);
  if (termFoldeds.length === 0) return '';
  const blocks = splitTcContentBlocks(content);
  if (blocks.length === 0) return '';

  for (const b of blocks) {
    b.score = termFoldeds.reduce(
      (n, term) => (b.folded.includes(term) ? n + 1 : n),
      0,
    );
  }

  // Sin evidencia real de los términos de la consulta en el fallo, no se marca
  // como extracción query-aware ni se sintetiza contenido.
  const matched = blocks
    .filter((b) => b.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index);
  if (matched.length === 0) return '';

  // Bloque de materia/norma impugnada: siempre se conserva cuando hay evidencia.
  const leadIdx = blocks.findIndex((b) =>
    /(requerimiento|vistos|sentencia\s+rol|precepto)/i.test(b.text),
  );

  const chosen = new Set();
  let used = 0;
  const lead = leadIdx >= 0 ? blocks[leadIdx] : null;
  if (lead) {
    chosen.add(lead.index);
    used = lead.text.length + 4;
  }
  for (const b of matched) {
    if (b.index === leadIdx) continue;
    const piece = b.text.trim();
    if (used + piece.length + 4 > maxChars) {
      // Un bloque que por sí solo excede el presupuesto restante no puede
      // incluirse, pero no debe truncar la selección: bloques posteriores con
      // menor score pero tamaño más pequeño aún aportan evidencia al excerpt.
      // Solo se corta cuando el presupuesto ya está completamente agotado.
      if (used >= maxChars) break;
      continue;
    }
    chosen.add(b.index);
    used += piece.length + 4;
    const prev = b.index - 1;
    const next = b.index + 1;
    if (prev >= 0 && !chosen.has(prev) && prev !== leadIdx) {
      const prevPiece = blocks[prev].text.trim();
      if (used + prevPiece.length + 4 <= maxChars) {
        chosen.add(prev);
        used += prevPiece.length + 4;
      }
    }
    if (next < blocks.length && !chosen.has(next) && next !== leadIdx) {
      const nextPiece = blocks[next].text.trim();
      if (used + nextPiece.length + 4 <= maxChars) {
        chosen.add(next);
        used += nextPiece.length + 4;
      }
    }
  }

  const finalBlocks = [...chosen]
    .sort((a, b) => a - b)
    .map((i) => blocks[i].text.trim());
  return finalBlocks.join('\n\n').trim();
}

/**
 * Extrae la evidencia sustantiva de una fila del TC. La API entrega:
 *   - `content`: el texto completo de la sentencia ("VISTOS Y CONSIDERANDO…"),
 *     cuyo inicio suele contener número de página/validación en español OCReado
 *     y NO el razonamiento del fallo.
 *   - `highlightParagraphs`: párrafos que coincidieron con la búsqueda; para
 *     varios roles solo cabeceras de notificación o bloque de cierre (firmas).
 * Por eso, cuando hay `query`, se prefiere una extracción consciente de la
 * consulta sobre el `content` completo (ventanas alrededor de sus términos
 * significativos) que garantiza evidencia jurídica real; solo si no existe
 * `content` se cae a los highlights como respaldo débil; sin `query` se
 * conserva el comportamiento histórico (inicio del `content`). Nunca sintetiza
 * ni inventa texto.
 * @param {object} r - fila cruda del endpoint TC.
 * @param {string} [query] - consulta del usuario para extracción query-aware.
 * @returns {{ excerpt: string, excerpt_source: string }}
 */
export function extractTcSubstantiveExcerpt(r, query) {
  const rawContent = String(r.content || '').trim();
  const highlights =
    (r.highlightParagraphs || [])
      .map((h) => h.full ?? h.summary)
      .filter((v) => v && typeof v === 'string' && v.trim())
      .map(cleanTcSubstantiveText)
      .filter(Boolean);

  let excerpt;
  let excerpt_source = 'fallback';
  if (rawContent && query) {
    const aware = extractTcQueryAwareExcerpt(
      rawContent,
      query,
      TC_SUBSTANTIVE_SOURCE_CHARS,
    );
    if (aware) {
      excerpt = aware;
      excerpt_source = 'content_query';
    } else {
      excerpt = truncate(rawContent, TC_SUBSTANTIVE_SOURCE_CHARS);
      excerpt_source = 'content';
    }
  } else if (rawContent) {
    excerpt = truncate(rawContent, TC_SUBSTANTIVE_SOURCE_CHARS);
    excerpt_source = 'content';
  } else if (highlights.length > 0) {
    excerpt = truncate(highlights.join(' '), TC_SUBSTANTIVE_SOURCE_CHARS);
    excerpt_source = 'highlight';
  } else {
    excerpt = '';
    excerpt_source = 'empty';
  }
  return { excerpt, excerpt_source };
}

/** Convierte una fila cruda del endpoint TC en una fuente `Source` normalizada. */
function mapTcRow(r, query) {
  const { excerpt, excerpt_source: excerptSource } = extractTcSubstantiveExcerpt(r, query);
  logDiagnostic('jurisprudence_tc_excerpt', {
    source_id: r.id ? `tc-${r.id}` : 'tc-?',
    excerpt_source: excerptSource,
    excerpt_length: excerpt.length,
    highlight_count: Array.isArray(r.highlightParagraphs) ? r.highlightParagraphs.length : 0,
    content_length: String(r.content || '').length,
  });
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
}

/**
 * Busca sentencias del TC con fallback progresivo. La API del TC hace matching
 * estricto multi-término: queries demasiado largas devuelven 0 aunque existan
 * sentencias relevantes para subconjuntos de sus términos. Para evitar esa
 * pérdida artificial, se intenta primero la query completa y, si no hay
 * resultados, se prueban subconjuntos ordenados de términos hasta completar el
 * `limit` o agotar el número acotado de intentos. Los resultados se deduplican
 * por id y se respeta el `limit` solicitado.
 *
 * @param {string} query - Consulta en lenguaje natural.
 * @param {number} [limit=5] - Máximo de fuentes a devolver.
 * @param {string|null} [competencia=null] - Competencia TC opcional.
 * @returns {Promise<object[]>} Fuentes jurisprudenciales TC.
 */
export async function searchTcSentencias(query, limit = 5, competencia = null) {
  const attempt0 = normalizeSearchTerms(query, TC_STOPWORDS, { preserveNumberEntities: true });
  if (!attempt0) return [];

  const queryHash = hashQuery(query);
  const fallbacks = buildTcSearchTermVariants(attempt0);
  const attempts = [attempt0, ...fallbacks];

  const seen = new Set();
  const collected = [];
  for (let i = 0; i < attempts.length; i++) {
    if (collected.length >= limit) break;
    const search = attempts[i];

    let rows = [];
    let status = 'empty';
    const startedAt = Date.now();
    try {
      const data = await fetchJson(buildTcSentenciasUrl(search, competencia));
      rows = data?.data?.results ?? [];
      status = rows.length ? 'ok' : 'empty';
    } catch (error) {
      status = 'error';
      logDiagnostic('jurisprudence_tc_query', {
        query_hash: queryHash,
        term_hash: hashQuery(search),
        term_count: (search || '').split(/\s+/).filter(Boolean).length,
        attempt: i + 1,
        status,
        error_type: classifyFetchError(error),
        duration_ms: Date.now() - startedAt,
      });
      continue;
    }

    // Relevancia temática (Fase 4.1.6): un intento no puede llenar el `limit`
    // con filas cuyas coincidencias son incidentales. Si las filas devueltas no
    // contienen los términos significativos del intento, se ignoran y el fallback
    // continúa hacia variantes conceptualmente más específicas, en vez de cortar
    // la búsqueda con basura numérica/genérica.
    const signals = getTcSignalTerms(search);
    let keptCount = 0;
    let ignoredCount = 0;

    for (const r of rows) {
      if (collected.length >= limit) break;
      if (signals.length > 0 && !tcRowHasSignals(r, signals)) {
        ignoredCount += 1;
        continue;
      }
      const source = mapTcRow(r, query);
      if (!seen.has(source.id)) {
        seen.add(source.id);
        collected.push(source);
        keptCount += 1;
      }
    }

    logDiagnostic('jurisprudence_tc_query', {
      query_hash: queryHash,
      term_hash: hashQuery(search),
      term_count: (search || '').split(/\s+/).filter(Boolean).length,
      attempt: i + 1,
      status: rows.length > 0 && keptCount === 0 ? 'filtered' : status,
      source_count: rows.length,
      kept_count: keptCount,
      ignored_count: ignoredCount,
      duration_ms: Date.now() - startedAt,
    });

    // Si la query completa ya dio resultados relevantes, conservar el
    // comportamiento actual: no ejecutar fallbacks (más específico y evita
    // llamadas extra).
    if (attempts.length > 1 && i === 0 && collected.length > 0) break;
  }

  return collected.slice(0, limit);
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

/**
 * Ejecuta una consulta SPARQL a BCN/LeyChile y degrada el error a un resultado
 * clasificado, dejando un log estructurado (sin exponer la query completa ni
 * secretos). Devuelve { kind, bindings }:
 *   kind: 'ok' | 'empty' | 'timeout' | 'http_error' | 'invalid_response' | 'network_error'
 * Mantiene el contrato anterior: el llamador usa `bindings` igual que antes.
 */
async function sparqlSearch({ searchType, termHash = '', sparql, queryHash = '' }) {
  const startedAt = Date.now();
  const endpoint = SPARQL_ENDPOINT;
  try {
    const data = await fetchJson(
      endpoint,
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
    const kind = bindings.length > 0 ? 'ok' : 'empty';
    logDiagnostic('jurisprudence_bcn_sparql', {
      search_type: searchType,
      term_hash: termHash,
      endpoint,
      status: kind,
      bindings: bindings.length,
      duration_ms: Date.now() - startedAt,
      query_hash: queryHash,
    });
    return { kind, bindings };
  } catch (error) {
    const errorType = classifyFetchError(error);
    const msg = error instanceof Error ? error.message : String(error);
    logDiagnostic('jurisprudence_bcn_sparql', {
      search_type: searchType,
      term_hash: termHash,
      endpoint,
      status: errorType,
      duration_ms: Date.now() - startedAt,
      query_hash: queryHash,
      error: sanitizeLogMessage(msg),
    });
    return { kind: errorType, bindings: [] };
  }
}

export async function searchBcnNormas(query, limit = 6) {
  const queryHash = hashQuery(query);
  let anyResult = false;
  let anyError = false;
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
      const sparql = buildNumberFilterSparql(digits, limit);
      const { kind, bindings } = await sparqlSearch({
        searchType: 'byNumber',
        termHash: hashQuery(digits),
        sparql,
        queryHash,
      });
      if (kind !== 'ok') {
        anyError = anyError || kind !== 'empty';
        continue;
      }
      anyResult = true;
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
    logDiagnostic('jurisprudence_bcn_result', {
      query_hash: queryHash,
      status: 'ok',
      match_by: 'byNumber',
      source_count: byNumber.length,
    });
    return await augmentNormasWithText(byNumber, query);
  }
  if (terms.length === 0) {
    logDiagnostic('jurisprudence_bcn_result', {
      query_hash: queryHash,
      status: 'no_terms',
      source_count: 0,
    });
    return [];
  }

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
    const { kind, bindings } = await sparqlSearch({
      searchType: 'title',
      termHash: hashQuery(attemptTerms.slice(0, 3).join(' ')),
      sparql,
      queryHash,
    });
    if (kind !== 'ok') {
      anyError = anyError || kind !== 'empty';
      continue;
    }
    anyResult = true;
    for (const b of bindings) {
      const src = mapBcnBinding(b);
      if (!src || merged.has(src.id)) continue;
      merged.set(src.id, { src, count: attemptTerms.length, date: src.date || '' });
    }
  }

  if (merged.size === 0) {
    logDiagnostic('jurisprudence_bcn_no_normativa', {
      query_hash: queryHash,
      had_results: anyResult,
      had_error: anyError,
      status: anyError ? 'error_then_empty' : 'no_results',
    });
    return [];
  }
  const normTypeRank = { ley: 0, codigo: 1, dfl: 2, decreto: 3, constitucion: 4, reglamento: 5, resolucion: 6, otra: 7 };
  const ranked = [...merged.values()].sort(
    (a, b) =>
      b.count - a.count ||
      (normTypeRank[a.src.norm_type] ?? 9) - (normTypeRank[b.src.norm_type] ?? 9) ||
      (b.date < a.date ? -1 : b.date > a.date ? 1 : 0),
  );
  const srcs = ranked.slice(0, limit).map((r) => r.src);
  // En general enriquecemos solo las 1-2 normas con más texto para no saturar.
  logDiagnostic('jurisprudence_bcn_result', {
    query_hash: queryHash,
    status: 'ok',
    match_by: 'title',
    source_count: srcs.length,
  });
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

/**
 * Términos de MUY bajo valor informativo para DECIDIR si una norma es relevante
 * a la consulta (Fase 4.1.12, gate de promoción automática). A diferencia de
 * GENERIC_CONCEPTS, aquí los términos de dominio que sí indican materia (datos,
 * personales, tratamiento, protección…) cuentan como señal de contenido. Esta
 * lista solo incluye los que por sí solos NO pueden hacer relevante una norma.
 */
const RELEVANCE_LOW_TERMS = new Set([
  'ley', 'leyes', 'decreto', 'decretos', 'dfl', 'dl', 'dto', 'norma', 'normas',
  'normativo', 'normativa', 'regula', 'regulan', 'regulacion', 'regular',
  'derecho', 'derechos', 'articulo', 'titular', 'titulares', 'chile', 'chilena',
  'chileno', 'chilenas', 'chilenos', 'establece', 'establecen', 'establecer',
  'aplica', 'aplican', 'aplicable', 'vigente', 'vigentes', 'materia', 'materias',
  'legal', 'legales', 'pregunta', 'consulta', 'existe', 'existen', 'saber',
  'sobre', 'para', 'segun', 'cuando', 'como', 'reconoce', 'reconocen',
  'reconozca', 'garantiza', 'garantizan', 'otorga', 'otorgan', 'confiere',
  'confieren', 'dispone', 'dispondra', 'contempla', 'contemplan', 'consagra',
  'incorpora', 'incluye', 'incluyendo', 'permite', 'permiten', 'permitir',
  'asegura', 'aseguran', 'debera', 'deben', 'debe', 'podra', 'podran', 'podria',
  'pueda', 'pueden', 'tiene', 'tienen', 'efecto', 'efectos', 'persona',
  'personas', 'personal', 'resguardo', 'resguarda', 'sujeto', 'sujetos',
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

// Umbral mínimo de la señal de relevancia para permitir la PROMOCIÓN automática
// de una norma cuando el modelo no citó normativa (Fase 4.1.12). La señal se
// pondera: coincidencia en el título oficial vale más que en extracto/fragmento,
// y los términos genéricos (ley, derechos, titular…) valen ~0. Bajo este umbral,
// es preferible NO_EVIDENCE antes que afirmar "Ley X regula la materia".
const BCN_RELEVANCE_THRESHOLD = 2.5;
// Peso de una coincidencia de término sustantivo según dónde aparece.
const BCN_RELEVANCE_WEIGHTS = { title: 3.0, excerpt: 1.5, fragment: 1.5 };
// Peso residual de un término genérico (nunca decisivo por sí solo).
const BCN_RELEVANCE_GENERIC_WEIGHT = 0.1;

/**
 * Determina si una norma BCN/LeyChile es suficientemente RELEVANTE a la consulta
 * como para PROMOVERLA automáticamente cuando el modelo no citó normativa
 * (Fase 4.1.12). Determinística y basada en señales de contenido del título,
 * extracto y fragmentos de la fuente; NO en cantidad bruta de coincidencias.
 *
 * Reglas de señal:
 *   - Términos genéricos (ley, derechos, artículo, titular, Chile, normativa,
 *     regulación…) puntúan ~0 y por sí solos NUNCA alcanzan el umbral.
 *   - Una coincidencia del número oficial de la norma citado en la consulta
 *     (p. ej. "21.719") es señal fuerte y directa: la consulta nombra la norma.
 *   - Términos sustantivos de la consulta (de dominio, no genéricos) que
 *     aparecen en el título (peso 3.0), extracto o fragmentos (1.5) suman.
 *   - Se exige señal >= umbral (2.5) con al menos un término sustantivo, o una
 *     coincidencia de número oficial.
 * @param {string} query - Consulta original del abogado.
 * @param {object} source - Fuente BCN (kind === 'normativa').
 * @returns {boolean}
 */
export function isBcnNormaRelevantToQuery(query, source) {
  const q = String(query || '').trim();
  if (!q || !source || source.kind !== 'normativa') return false;

  // Términos sustantivos = tokens de la consulta que NO son de bajo valor
  // informativo (stopwords ya removidas por normalizeClaimTokens). NO se usa
  // extractSubstantiveTerms aquí porque GENERIC_CONCEPTS descarta términos de
  // dominio (datos, personales, protección, tratamiento) que SÍ indican la
  // materia de una norma y deben contar como señal de contenido.
  const substantive = normalizeClaimTokens(q).filter((t) => !RELEVANCE_LOW_TERMS.has(t));
  const generic = normalizeClaimTokens(q).filter((t) => RELEVANCE_LOW_TERMS.has(t));
  const lawNumbers = extractLawNumber(q);

  // Señal directa y fuerte: la consulta cita el número oficial de la norma.
  const normNumber = String(source.norm_number || '').replace(/[.,]/g, '');
  const hasNumberSignal = normNumber.length >= 4 && lawNumbers.includes(normNumber);

  // Texto comparable de la fuente: título (siempre), extracto y fragmentos.
  const haystacks = [];
  if (source.title) haystacks.push({ text: source.title, weight: BCN_RELEVANCE_WEIGHTS.title });
  if (source.excerpt) {
    haystacks.push({ text: source.excerpt, weight: BCN_RELEVANCE_WEIGHTS.excerpt });
  }
  const fragments = Array.isArray(source.metadata?.fragments) ? source.metadata.fragments : [];
  for (const f of fragments) {
    if (f?.text) haystacks.push({ text: `${f.article || ''} ${f.text}`, weight: BCN_RELEVANCE_WEIGHTS.fragment });
  }
  const normalized = haystacks.map((h) => ({
    text: String(h.text)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''),
    weight: h.weight,
  }));

  let score = 0;
  let substantiveMatches = 0;
  for (const t of substantive) {
    const hit = normalized.find((h) => hasWord(h.text, t));
    if (hit) {
      score += hit.weight;
      substantiveMatches += 1;
    }
  }
  for (const t of generic) {
    if (normalized.some((h) => hasWord(h.text, t))) score += BCN_RELEVANCE_GENERIC_WEIGHT;
  }

  return hasNumberSignal || (substantiveMatches >= 1 && score >= BCN_RELEVANCE_THRESHOLD);
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

// Máximo de fragmentos preservados por señal de contenido (Fase 4.1.12). La
// preservación NO amplía el presupuesto total (limit sigue controlando cuántos
// fragmentos se devuelven); solo garantiza que los más relevantes por contenido
// no queden desplazados por términos de otras dimensiones de la consulta.
const NORMATIVE_PRESERVE_BUDGET = 2;
// Mínimo de términos de la consulta presentes en un fragmento para considerarlo
// "preservable" dentro de una norma ya identificada. Se cuenta cada término por
// igual: dentro de una norma confirmada, los términos de dominio (derechos,
// titular, datos, personales…) son señales válidas de materia.
const NORMATIVE_PRESERVE_SIGNAL = 3;
// Términos de OTRAS dimensiones (jurisprudencia/doctrina) que NO cuentan como
// señal de relevancia de un fragmento normativo (Fase 4.1.12). El texto de una
// ley suele citar "Tribunal Constitucional", "recurso" o "Constitución" como
// referencias cruzadas; esos términos no indican que el artículo responda a la
// materia consultada y pueden desplazar el artículo sustantivo correcto.
const NORM_FRAGMENT_DIMENSION_TERMS = new Set([
  'jurisprudencia', 'sentencia', 'sentencias', 'fallo', 'fallos', 'tribunal',
  'tribunales', 'corte', 'rol', 'recurso', 'recursos', 'reclamo', 'reclamacion',
  'casacion', 'resolucion', 'pronunciamiento', 'constitucional',
  'constitucionalidad', 'doctrina', 'doctrinario', 'autor', 'autores',
  'academico', 'ensayo', 'libro', 'chile', 'chilena', 'chileno', 'chilenas',
  'chilenos', 'pregunta', 'consulta', 'respuesta',
]);

/**
 * Selecciona los fragmentos de una norma con una CAPA DE PRESERVACIÓN
 * (Fase 4.1.12). Se ejecuta el ranking actual de `rankFragments` y además se
 * detectan fragmentos con señal de contenido altamente relevante (contienen al
 * menos NORMATIVE_PRESERVE_SIGNAL términos de la consulta), que se preservan al
 * frente del resultado aunque otros términos de la consulta (jurisprudencia,
 * sentencia, tribunal…) alteren el ranking del resto. El presupuesto restante se
 * completa con el ranking actual. Determinístico y basado en el contenido de los
 * fragmentos, no en IDs: generalizable a cualquier ley.
 *
 * Regla de conservación de comportamiento:
 *   - Si NINGÚN fragmento tiene señal > 0, devuelve [] (igual que el ranking
 *     actual cuando la consulta no coincide con la norma).
 * @param {string} query - Consulta del abogado.
 * @param {Array<{ article: string, text: string, id?: string }>} fragments
 * @param {{ limit?: number }} [opts]
 * @returns {Array<{ article: string, text: string, id?: string }>}
 */
export function selectNormativeFragments(query, fragments, { limit = 6 } = {}) {
  const items = Array.isArray(fragments) ? fragments : [];
  if (items.length === 0) return [];

  // Términos de la consulta que indican MATERIA de la norma: sin duplicados y
  // sin términos de otras dimensiones (jurisprudencia/doctrina) que solo
  // contaminan la señal cuando el texto de la ley los cita como referencia.
  const tokens = [...new Set(normalizeClaimTokens(query))].filter(
    (t) => !NORM_FRAGMENT_DIMENSION_TERMS.has(t),
  );
  const signals = items.map((f, index) => {
    const norm = `${f.article || ''} ${f.text || ''}`
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    let hits = 0;
    for (const t of tokens) {
      if (hasWord(norm, t)) hits += 1;
    }
    return { fragment: f, hits, index };
  });

  // Sin ninguna coincidencia de contenido: mismo comportamiento que el ranking
  // actual (no enriquecer la norma con fragmentos no relacionados).
  if (!signals.some((s) => s.hits > 0)) return [];

  const preserved = signals
    .filter((s) => s.hits >= NORMATIVE_PRESERVE_SIGNAL)
    .sort((a, b) => b.hits - a.hits || a.index - b.index)
    .slice(0, NORMATIVE_PRESERVE_BUDGET)
    .map((s) => s.fragment);

  const ranked = rankFragments(query, items, { limit: items.length });
  const merged = [];
  for (const f of [...preserved, ...ranked]) {
    if (merged.length >= limit) break;
    if (!merged.some((m) => m === f || (m?.id && f?.id && m.id === f.id))) merged.push(f);
  }
  return merged;
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
  const selected = selectNormativeFragments(query, fragments, { limit: 6 });
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

  const queryHash = hashQuery(query);

  const [tc, bcn, doctrina] = await Promise.all([
    settleSearch('tc', () => searchTcSentencias(query, allocation.tc, competencia), warnings, { queryHash }),
    settleSearch('bcn', () => searchBcnNormas(query, allocation.bcn), warnings, { queryHash }),
    settleSearch('doctrina', () => searchOpenAlexDoctrina(query, allocation.doctrina), warnings, { queryHash }),
  ]);

  const sources = prioritizeSources([...tc, ...bcn, ...doctrina], intent);
  return { sources, warnings, intent, queryHash };
}