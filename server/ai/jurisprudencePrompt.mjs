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

export const JURISPRUDENCE_LIMITS = {
  // Límite total de caracteres del contexto enviado al modelo.
  MAX_CONTEXT_CHARS: 30000,
  // Caracteres de extracto por fuente.
  MAX_SOURCE_CHARS: 2500,
  // Longitud máxima de la pregunta del abogado.
  MAX_QUERY_LENGTH: 2000,
  // Máximo de fuentes enviadas al modelo.
  MAX_SOURCES: 20,
};

export function buildJurisprudenceSystemPrompt() {
  return `Eres un investigador jurídico para profesionales del derecho en Chile. Respondes preguntas sobre normativa, jurisprudencia y doctrina usando ÚNICAMENTE las fuentes verificables del contexto.

Reglas de evidencia:
1. Usa exclusivamente las fuentes proporcionadas en el contexto. No inventes leyes, números de norma, roles, tribunales, fechas, artículos ni autores.
2. Cada afirmación DEBE estar respaldada por UNA fuente concreta del contexto y por un fragmento textual EXACTO extraído de esa fuente (copiado literalmente de su "Extracto:"). Nunca combines varias fuentes para una sola afirmación.
3. No atribuyas a una fuente afirmaciones que su extracto no contiene. Si una fuente no respalda el punto, no la cites para ese punto.
4. Si ninguna fuente responde la pregunta, dilo con claridad y ofrece qué buscar o en qué portal oficial verificar.
5. La doctrina NO es derecho vigente: preséntala siempre como posición académica no vinculante.
6. Diferencia los hechos de la fuente (lo que dice el fallo/norma) de tus inferencias. Cuando la fuente indique rol, tribunal y año, menciónalos.
7. No des asesoría legal definitiva. Ofrece análisis preliminar y recuerda verificar en los portales oficiales.
8. NO uses conclusiones jurídicas absolutas ni categóricas. Si las fuentes presentan matices o contradicciones, señálalos. Usa "las fuentes muestran", "sugieren", "en estos casos", en vez de "la jurisprudencia confirma que…".
9. Sé breve y profesional, en español de Chile. El resumen debe tener 2-4 líneas; la conclusión, 3-4 líneas.
10. Cada fuente del contexto indica su Autoridad y su Vigencia. Solo el texto de una norma es derecho vinculante; la jurisprudencia y la doctrina NO son normas. Nunca presentes una sentencia del Tribunal Constitucional como precedente vinculante general: descríbela como lo decidido EN ESE CASO ("En esta sentencia…", "El Tribunal Constitucional sostuvo en este caso…").
11. Jerarquía de presentación: primero Normativa, luego Jurisprudencia, luego Doctrina. La doctrina (autoridad doctrinal) siempre va en su sección de doctrina y se marca como no vinculante; nunca la cites en la sección de normativa. Una norma con vigencia "desconocida" o "derogada" no debe presentarse como vigente.

Formato de respuesta:
Responde ÚNICAMENTE con un objeto JSON válido, sin texto fuera:
{
  "resumen": "Respuesta breve en 2-4 líneas",
  "normativa": [{ "fuente_id": "id del contexto", "afirmacion": "afirmación puntual", "fragmento": "fragmento textual literal de la fuente" }],
  "jurisprudencia": [{ "fuente_id": "id del contexto", "afirmacion": "afirmación puntual", "fragmento": "fragmento textual literal de la fuente" }],
  "doctrina": [{ "fuente_id": "id del contexto", "afirmacion": "afirmación puntual", "fragmento": "fragmento textual literal de la fuente" }],
  "conclusion": "Síntesis de 3-4 líneas con matices",
  "advertencias": ["aviso si falta normativa, hay vigencia incierta, doctrina no vinculante, etc."]
}

Reglas del formato:
- Usa EXCLUSIVAMENTE "fuente_id" que aparezcan en el contexto.
- Si no hay afirmaciones respaldadas para una categoría, deja el arreglo vacío [] y agrega una advertencia.
- "fragmento" debe ser texto literal del extracto de la fuente, no un resumen.
- No agregues texto, comentarios ni bloques markdown fuera del JSON.`;
}

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

export function authorityLabel(legalAuthority) {
  return LEGAL_AUTHORITY_LABELS[legalAuthority] || legalAuthority || '';
}

export function vigencyLabel(vigency) {
  return VIGENCY_LABELS[vigency] || '';
}

/**
 * Formatea una fuente para el contexto del modelo.
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
    source.excerpt
      ? `Extracto: ${truncate(source.excerpt, JURISPRUDENCE_LIMITS.MAX_SOURCE_CHARS)}`
      : null,
  ].filter(Boolean);
  return lines.join('\n');
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
  const selected = sources.slice(0, limit);

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

/**
 * Construye el mensaje de usuario enviado al modelo.
 */
export function buildJurisprudenceUserPrompt({ question, context, caseContext = '' }) {
  const parts = [
    'CONTEXTO DEL CASO (solo como referencia)',
    caseContext || 'Sin contexto de caso.',
    context,
    `PREGUNTA DEL ABOGADO:\n${question}`,
  ];
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
    const { fuente_id: fuenteId, afirmacion, fragmento } = claim;
    const source = fuenteId ? sourcesById.get(fuenteId) : undefined;

    if (!source) {
      warnings.push(
        `Se descartó una afirmación sin fuente válida (${category}: "${(afirmacion || '').slice(0, 60)}…").`,
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
        `La afirmación de doctrina "${afirmacionText.slice(0, 80)}…" usa lenguaje normativo; la doctrina no es fuente normativa.`,
      );
    }

    if (fragment && !fragmentIsSupported(fragment, source.excerpt || '')) {
      warnings.push(
        `Se descartó una afirmación de ${category} cuyo fragmento no aparece en la fuente "${source.citation}".`,
      );
      continue;
    }

    // Fase 4.0.2: vigencia de una norma.
    if (source.kind === 'normativa') {
      if (source.vigency === 'derogada' && assertsVigencia(afirmacionText, fragment)) {
        warnings.push(
          `Se descartó una afirmación que presenta como vigente la norma "${source.citation}", que tiene indicios de estar derogada.`,
        );
        continue;
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
      afirmacion: afirmacionText,
      fragmento: fragment,
    });
  }

  return { kept, warnings };
}

/**
 * Construye el Markdown final de la investigación a partir del JSON estructurado.
 * Compatible con el render del frontend (párrafos, listas, negrita/italic).
 * Fase 4.0.2: secciones separadas por categoría con su autoridad explícita.
 */
export function buildJurisprudenceAnswer({ resumen, normativa, jurisprudencia, doctrina, conclusion, advertencias }) {
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
        return `- **${cite}**${authoritySuffix(c)}: ${c.afirmacion}${frag}`;
      })
      .join('\n');
    return `**${title}**\n\n${items}`;
  };

  const norm = section('Normativa relevante', normativa);
  const jur = section('Jurisprudencia relevante', jurisprudencia);
  const doc = section('Doctrina (no vinculante)', doctrina);

  lines.push(norm, jur, doc);

  if (conclusion && String(conclusion).trim()) {
    lines.push(`**Conclusión**\n\n${String(conclusion).trim()}`);
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
    re: /\b(?:queda|est[áa]) demostrado\b/i,
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
