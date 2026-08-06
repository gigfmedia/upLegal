// ---------------------------------------------------------------------------
// LegalUp AI — Fase 4.1: Síntesis verificada y trazable.
//
// Regla crítica: la conclusión/síntesis NO puede ser una redacción libre
// independiente de los claims. Cada oración debe poder vincularse a uno o más
// claims verificados, conservando sus source_id/fragment_id, respetando la
// categoría de la fuente y su vigencia, y sin convertir jurisprudencia o
// doctrina en normativa.
//
// Si una oración no tiene respaldo:
//   - se ELIMINA, o
//   - se etiqueta como "Inferencia del sistema" SOLO si puede construirse
//     razonablemente desde claims verificados (con lenguaje modal explícito).
// Preferencia: ELIMINAR antes que inventar.
// ---------------------------------------------------------------------------

import { extractSubstantiveTerms, normalizeClaimTokens } from './jurisprudenceSources.mjs';

// Palabras discursivas que NO prueban que la oración comparta el fondo con la
// fuente (actor/tipo de fuente: "el tribunal", "la ley", "el autor"…). Se
// excluyen del cálculo de solape para no respaldar afirmaciones vacías.
const DISCOURSE_TERMS = new Set([
  'tribunal', 'corte', 'sentencia', 'fallo', 'rol', 'caso', 'casos',
  'fuente', 'fuentes', 'autor', 'autores', 'doctrina', 'ley', 'leyes',
  'norma', 'normas', 'normativa', 'legal', 'texto', 'extracto',
  'establece', 'establecen', 'regula', 'regulan', 'consagra', 'dispone',
  'sostiene', 'sostienen', 'resolvio', 'decidio', 'ordena', 'dispone',
  'derecho', 'derechos', 'titular', 'titulares', 'persona', 'personas',
]);

// Marcadores de marco discursivo por categoría de fuente.
const FRAMING = {
  normativa: /\b(?:la\s+ley|las?\s+normas?|el\s+art[íi]culo|la\s+normativa|el\s+decreto|el\s+c[óo]digo|la\s+constituci[óo]n)\b|establece|regula|dispone|consagra/i,
  jurisprudencia: /\b(?:el\s+tribunal|la\s+corte|la\s+sentencia|el\s+fallo|el\s+rol|el\s+t[cC]|resolvi[oó]|decidi[oó]|sostuvo\s+el\s+tribunal)\b/i,
  doctrina: /\b(?:el\s+autor|la\s+doctrina|los\s+autores|sostiene|considera\s+la\s+doctrina|seg[úu]n\s+la\s+doctrina)\b/i,
};

// Lenguaje modal explícito: permite conservar una oración como inferencia.
const MODAL_HEDGE =
  /\b(?:puede\s+(?:inferirse|concluirse|sostenerse)|podr[íi]a|cabr[íi]a|probablemente|sugiere\s+que|parece\s+razonable|sobre\s+la\s+base\s+de\s+las\s+fuentes|a\s+la\s+luz\s+de|en\s+consecuencia)\b/i;

// Marcador de apertura FUERTE de inferencia: aunque la oración tenga respaldo
// sustantivo, si se abre con estos conectores se etiqueta como inferencia.
const INFERENCE_OPENER =
  /^(?:sobre\s+la\s+base\s+de\s+(?:las|estas|estas)?\s*fuentes|a\s+la\s+luz\s+de\s+las\s+fuentes|en\s+consecuencia|en\s+s[íi]ntesis|por\s+lo\s+tanto|cabe\s+(?:inferir|concluir)|puede\s+(?:inferirse|concluirse))/i;

function detectFraming(sentence) {
  for (const [category, re] of Object.entries(FRAMING)) {
    if (re.test(sentence)) return category;
  }
  return null;
}

function normalizeTokens(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Divide un texto en oraciones (protegiendo abreviaturas comunes). */
export function splitSentences(text) {
  const src = String(text || '').trim();
  if (!src) return [];
  // Protege abreviaturas ("art.", "N°", "D.F.L.", "S.A.") antes de partir.
  const protected_ = src
    .replace(/\b(art|arts|núm|num|nº|n°|dfl|dl|sa|ss)\.\s*/gi, (m) => m.replace('.', '·'))
    .replace(/\b(\d)\.(\d{3})\b/g, '$1·$2');
  const parts = protected_.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  return parts.map((s) => s.replace(/·/g, '.'));
}

function overlap(termsA, termsB) {
  const setB = new Set(termsB);
  return termsA.filter((t) => setB.has(t)).length;
}

/**
 * Verifica la síntesis del modelo contra los claims YA verificados.
 * @param {string} conclusion - texto de la conclusión del modelo.
 * @param {Array<{ source_id: string, fragment_id?: string|null, afirmacion: string,
 *   fragmento: string, source: { kind: string, citation: string, vigency?: string } }>} claims
 * @returns {{ sentences: Array<{ text: string, category: string|null, source_ids: string[],
 *   fragment_ids: string[], inference: boolean, dropped: boolean }>, warnings: string[] }}
 */
export function verifySynthesis(conclusion, claims = []) {
  const warnings = [];
  const sentences = splitSentences(conclusion).map((text) => ({
    text,
    category: null,
    source_ids: [],
    fragment_ids: [],
    inference: false,
    dropped: false,
  }));

  for (const sentence of sentences) {
    // Términos sustantivos EXCLUYENDO las palabras puramente discursivas
    // (tribunal, ley, derecho, titular…) para no respaldar afirmaciones vacías.
    const sentenceTerms = extractSubstantiveTerms(sentence.text).filter(
      (t) => !DISCOURSE_TERMS.has(t),
    );
    const framing = detectFraming(sentence.text);
    const isHedged = MODAL_HEDGE.test(sentence.text);
    const opensAsInference = INFERENCE_OPENER.test(sentence.text.trim());

    // Busca el claim con mayor solape de términos sustantivos no discursivos.
    let best = null;
    let bestOverlap = 0;
    for (const claim of claims) {
      const claimTerms = extractSubstantiveTerms(`${claim.afirmacion} ${claim.fragmento}`).filter(
        (t) => !DISCOURSE_TERMS.has(t),
      );
      const ov = overlap(sentenceTerms, claimTerms);
      if (ov > bestOverlap) {
        bestOverlap = ov;
        best = claim;
      }
    }

    // Oración que se abre como inferencia explícita: se etiqueta como tal solo
    // si comparte contenido real (tokens significativos) con algún claim.
    if (opensAsInference) {
      const sentenceTokens = normalizeClaimTokens(sentence.text).filter(
        (t) => !DISCOURSE_TERMS.has(t),
      );
      let bestMeaningfulClaim = null;
      let maxMeaningful = 0;
      for (const claim of claims) {
        const claimTokens = normalizeClaimTokens(`${claim.afirmacion} ${claim.fragmento}`).filter(
          (t) => !DISCOURSE_TERMS.has(t),
        );
        const ov = overlap(sentenceTokens, claimTokens);
        if (ov > maxMeaningful) {
          maxMeaningful = ov;
          bestMeaningfulClaim = claim;
        }
      }
      if (maxMeaningful >= 2 && bestMeaningfulClaim) {
        sentence.category = 'inferencia';
        sentence.inference = true;
        sentence.source_ids = [bestMeaningfulClaim.source_id];
        sentence.fragment_ids = bestMeaningfulClaim.fragment_id
          ? [bestMeaningfulClaim.fragment_id]
          : [];
        continue;
      }
    }

    // Regla de respaldo:
    //   - ≥2 términos sustantivos no discursivos compartidos → respaldado.
    //   - 1 término compartido + marco discursivo coherente con la categoría.
    //   - lenguaje modal Y solape amplio de tokens significativos → inferencia
    //     construible desde los claims verificados.
    if (best && bestOverlap >= 2) {
      sentence.category = best.source?.kind || null;
      sentence.source_ids = [best.source_id];
      sentence.fragment_ids = best.fragment_id ? [best.fragment_id] : [];
      continue;
    }

    if (best && bestOverlap === 1 && framing && framing === best.source?.kind) {
      sentence.category = best.source?.kind || null;
      sentence.source_ids = [best.source_id];
      sentence.fragment_ids = best.fragment_id ? [best.fragment_id] : [];
      continue;
    }

    if (isHedged) {
      const sentenceTokens = normalizeClaimTokens(sentence.text).filter(
        (t) => !DISCOURSE_TERMS.has(t),
      );
      let bestMeaningfulClaim = null;
      let maxMeaningful = 0;
      for (const claim of claims) {
        const claimTokens = normalizeClaimTokens(`${claim.afirmacion} ${claim.fragmento}`).filter(
          (t) => !DISCOURSE_TERMS.has(t),
        );
        const ov = overlap(sentenceTokens, claimTokens);
        if (ov > maxMeaningful) {
          maxMeaningful = ov;
          bestMeaningfulClaim = claim;
        }
      }
      if (maxMeaningful >= 2 && bestMeaningfulClaim) {
        sentence.category = 'inferencia';
        sentence.inference = true;
        sentence.source_ids = [bestMeaningfulClaim.source_id];
        sentence.fragment_ids = bestMeaningfulClaim.fragment_id
          ? [bestMeaningfulClaim.fragment_id]
          : [];
        continue;
      }
    }

    // Oración sin respaldo: se elimina (preferencia) y se advierte.
    sentence.dropped = true;
    warnings.push(
      `Se eliminó de la síntesis una oración sin respaldo verificable: "${sentence.text.slice(0, 90)}…".`,
    );
  }

  return { sentences, warnings };
}

// ---------------------------------------------------------------------------
// Fase 4.1.3: enumeraciones cerradas. La síntesis NO puede ampliar una
// enumeración que la evidencia presenta como cerrada ("…, acceso, rectificación
// y bloqueo, entre otros"). Solo se consideran problemáticas las expresiones de
// apertura ("entre otros", "incluyendo", "etc.", "por ejemplo", "entre ellos"…)
// que amplíen una enumeración CUYOS MISMOS elementos existan como lista cerrada
// en los claims verificados. Si no hay correspondencia exacta, no se modifica.
// ---------------------------------------------------------------------------

const OPEN_ENUM_PHRASE_RE =
  /\b(?:entre\s+otros|entre\s+otras|entre\s+ellos|entre\s+ellas|incluyendo(?:\s+pero\s+no\s+limitad[oa])?|por\s+ejemplo|etc(?:étera)?\.?|y\s+dem[áa]s|y\s+otros|y\s+otras|u\s+otros|u\s+otras)\b/i;

// Lista de elementos separados por coma y cerrada con una conjunción. La coma
// antes de la conjunción final es opcional ("a, b y c"). Se ancla al final del
// texto previo a la expresión de apertura, tolerando una coma opcional entre la
// lista y la expresión ("…, y bloqueo, entre otros").
const TRAILING_LIST_RE =
  /([a-záéíóúüñ]+(?:\s*,\s*[a-záéíóúüñ]+)*\s*,?\s*\b(?:y|e|o|u)\b\s+[a-záéíóúüñ]+)\s*,?\s*$/i;

const GLOBAL_LIST_RE =
  /\b([a-záéíóúüñ]+(?:\s*,\s*[a-záéíóúüñ]+)*\s*,?\s*\b(?:y|e|o|u)\b\s+[a-záéíóúüñ]+)\b/gi;

function normalizeEnumWord(word) {
  return String(word).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function enumItemsKey(items) {
  return [...items].sort().join('|');
}

/**
 * Recopila las enumeraciones CERRADAS presentes en los claims verificados: una
 * lista de ≥2 elementos NO seguida de una expresión de apertura en la evidencia.
 * @param {Array} claims - claims verificados (usados en síntesis).
 * @returns {Set<string>} claves de enumeraciones cerradas (elementos ordenados).
 */
function collectClosedEnumerations(claims = []) {
  const closed = new Set();
  for (const claim of claims) {
    const norm = normalizeEnumWord(`${claim.fragmento || ''} ${claim.afirmacion || ''}`);
    let m;
    GLOBAL_LIST_RE.lastIndex = 0;
    while ((m = GLOBAL_LIST_RE.exec(norm)) !== null) {
      const after = norm.slice(m.index + m[0].length).trimStart();
      // Si la evidencia misma presenta la lista como abierta, no es cerrada.
      if (OPEN_ENUM_PHRASE_RE.test(after)) continue;
      const items = m[1]
        .split(/\s*,\s*|\s+(?:y|e|o|u)\s+/i)
        .map(normalizeEnumWord)
        .filter(Boolean);
      if (items.length >= 2) closed.add(enumItemsKey(items));
    }
  }
  return closed;
}

/**
 * Elimina la primera expresión de apertura de enumeración cuya lista de
 * elementos coincida EXACTAMENTE con una enumeración cerrada de los claims.
 * Conservadora: si la lista del texto difiere de la evidencia, no modifica.
 * @param {string} text
 * @param {Set<string>} closed - enumeraciones cerradas (claves de elementos).
 * @returns {string}
 */
function trimFirstUnsupportedExtension(text, closed) {
  let result = String(text || '');
  const re = new RegExp(OPEN_ENUM_PHRASE_RE.source, 'gi');
  let m;
  while ((m = re.exec(result)) !== null) {
    const trailing = TRAILING_LIST_RE.exec(result.slice(0, m.index));
    if (!trailing) continue;
    const items = trailing[1]
      .split(/\s*,\s*|\s+(?:y|e|o|u)\s+/i)
      .map(normalizeEnumWord)
      .filter(Boolean);
    if (items.length < 2 || !closed.has(enumItemsKey(items))) continue;

    let cut = m.index;
    while (cut > 0 && /\s/.test(result[cut - 1])) cut--;
    if (result[cut - 1] === ',') cut--;
    const tail = result.slice(m.index + m[0].length).trimStart();
    const join = /^[.,;:)]/.test(tail) ? '' : ', ';
    result = `${result.slice(0, cut).trimEnd()}${join}${tail}`;
    re.lastIndex = Math.max(0, cut);
  }
  return result;
}

/**
 * Aplica la regla de enumeraciones cerradas a las oraciones conservadas.
 * @param {Array} sentences - oraciones de verifySynthesis.
 * @param {Array} claims - claims verificados.
 * @returns {{ sentences: Array, warnings: string[] }}
 */
export function constrainOpenEndedEnumerations(sentences, claims = []) {
  const closed = collectClosedEnumerations(claims);
  const warnings = [];
  const out = sentences.map((sentence) => {
    if (sentence.dropped) return sentence;
    const trimmed = trimFirstUnsupportedExtension(sentence.text, closed);
    if (trimmed !== sentence.text) {
      sentence.text = trimmed;
      warnings.push(
        'Se eliminó de la síntesis una extensión de enumeración sin respaldo ("entre otros"/"etc.") porque la evidencia presenta la lista como cerrada.',
      );
    }
    return sentence;
  });
  return { sentences: out, warnings };
}

const CATEGORY_PREFIX = {
  normativa: 'La norma establece',
  jurisprudencia: 'El Tribunal resolvió en el caso citado',
  doctrina: 'La doctrina sostiene',
  inferencia: 'Sobre la base de las fuentes, puede inferirse',
};

/**
 * Construye el texto final de la sección "Síntesis" a partir de las oraciones
 * verificadas. Cada oración conservada lleva el marco discursivo de su
 * categoría; las inferencias se etiquetan explícitamente.
 */
export function buildSynthesis(sentences = []) {
  const kept = sentences.filter((s) => !s.dropped);
  if (kept.length === 0) return '';
  const lines = kept.map((s) => {
    const prefix = s.category ? CATEGORY_PREFIX[s.category] || null : null;
    const label = s.category === 'inferencia' ? ' (Inferencia del sistema)' : '';
    return prefix ? `${prefix}: ${s.text}${label}` : s.text;
  });
  return lines.join('\n');
}

/**
 * Verifica y construye la síntesis en un solo paso.
 * @returns {{ síntesis: string, sentences: Array, warnings: string[] }}
 */
export function verifyAndBuildSynthesis(conclusion, claims = []) {
  const { sentences, warnings } = verifySynthesis(conclusion, claims);
  // Fase 4.1.3: no ampliar enumeraciones cerradas respaldadas por la evidencia.
  const { sentences: constrained, warnings: enumWarnings } =
    constrainOpenEndedEnumerations(sentences, claims);
  return {
    síntesis: buildSynthesis(constrained),
    sentences: constrained,
    warnings: [...warnings, ...enumWarnings],
  };
}