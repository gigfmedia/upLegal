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
  return { síntesis: buildSynthesis(sentences), sentences, warnings };
}