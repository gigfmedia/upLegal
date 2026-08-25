// Fase 4.13: Resolución determinista de evidencia para chat parafraseado.
// No usa embeddings, RAG, ni LLM. Solo reutiliza claims ya verificados.
import { normalizeClaimTokens, extractSubstantiveTerms } from './jurisprudenceSources.mjs';

function extractNumericFacts(text) {
  const lower = String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const facts = new Set();
  for (const m of lower.match(/\d{1,3}(?:[.,]\d{3})+|\d+/g) || []) {
    const n = parseInt(m.replace(/[.,]/g, ''), 10);
    if (Number.isFinite(n)) facts.add(n);
  }
  return [...facts];
}

function normalize(text) {
  return String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function extractRoleWords(text) {
  // Reutiliza la lógica de documentGrounding para roles, pero simplificada aquí
  // para evitar dependencia circular; usa los mismos términos que documentGrounding
  const roles = ['arrendador','arrendadora','arrendatario','arrendataria','propietario','propietaria','demandante','demandado'];
  const tokens = normalizeClaimTokens(text);
  return tokens.filter(t => roles.includes(t));
}

function hasNumbersClaim(claim) {
  return extractNumericFacts(claim.afirmacion || '').length > 0 || extractNumericFacts(claim.fragmento || '').length > 0;
}

function numbersMatch(answerNumbers, claimNumbers) {
  if (claimNumbers.length === 0) return true; // claim sin números, no hay restricción
  if (answerNumbers.length === 0) return false; // claim tiene números pero answer no los menciona -> no es mismo hecho
  // Todos los números del claim deben estar en la respuesta y viceversa (para evitar $500k vs $600k)
  return claimNumbers.every(n => answerNumbers.includes(n)) && answerNumbers.every(n => claimNumbers.includes(n));
}

function datesMatch(answer, claim) {
  // Extrae fechas simples (01/01/2026, 1 de enero de 2026)
  const dateRe = /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{1,2} de [a-z]+ de \d{4})\b/gi;
  const aDates = (String(answer).toLowerCase().match(dateRe) || []).map(d => normalize(d));
  const cDates = (String(claim.afirmacion || '').toLowerCase().match(dateRe) || []).map(d => normalize(d));
  if (cDates.length === 0) return true;
  if (aDates.length === 0) return false;
  return cDates.every(d => aDates.includes(d)) && aDates.every(d => cDates.includes(d));
}

function rolesMatch(answer, claim) {
  const aRoles = extractRoleWords(answer);
  const cRoles = extractRoleWords(claim.afirmacion || '');
  if (cRoles.length === 0) return true;
  if (aRoles.length === 0) return false;
  // No permitir cambio de rol: si claim es arrendatario y answer dice arrendador, es diferente
  return cRoles.every(r => aRoles.includes(r)) && aRoles.every(r => cRoles.includes(r));
}

/**
 * Resuelve evidencia para una respuesta de chat parafraseada contra claims verificados.
 * @param {{answer: string, verifiedClaims: Array<{afirmacion:string, fragmento:string, source_id:string, fragment_id:string|null, evidence:string, page_number:number|null}>}} input
 * @returns {object|null} claim verificado que respalda la respuesta, o null si no hay match seguro
 */
export function resolveChatEvidenceFromVerifiedClaims({ answer, verifiedClaims }) {
  const ans = String(answer || '').trim();
  if (!ans || !Array.isArray(verifiedClaims) || verifiedClaims.length === 0) return null;

  // Filtra claims con source_id y evidencia válida
  const candidates = verifiedClaims.filter(c => c && c.source_id && c.fragment_id && c.evidence && String(c.evidence).trim());
  if (candidates.length === 0) return null;

  const answerNumbers = extractNumericFacts(ans);
  const answerTokens = new Set(normalizeClaimTokens(ans));
  const answerSubstantive = new Set(extractSubstantiveTerms(ans));

  let best = null;
  let bestScore = -1;
  let bestCount = 0;

  for (const claim of candidates) {
    // Validación estricta de números, fechas, roles
    const claimNumbers = extractNumericFacts(claim.afirmacion + ' ' + claim.fragmento);
    if (!numbersMatch(answerNumbers, claimNumbers)) continue;
    if (!datesMatch(ans, claim)) continue;
    if (!rolesMatch(ans, claim)) continue;

    // Coincidencia de términos sustantivos (al menos 2, no solo genéricos)
    // Para respuestas cortas con número (ej. "La renta es de $500.000."), 1 término + número coincidente es suficiente
    const claimTokens = new Set([...normalizeClaimTokens(claim.afirmacion), ...normalizeClaimTokens(claim.fragmento)]);
    const claimSubstantive = new Set([...extractSubstantiveTerms(claim.afirmacion), ...extractSubstantiveTerms(claim.fragmento)]);
    let overlap = 0;
    for (const t of answerSubstantive) if (claimSubstantive.has(t)) overlap++;
    // Si no hay sustantivos, usa tokens normales
    if (overlap === 0) {
      for (const t of answerTokens) if (claimTokens.has(t)) overlap++;
    }
    const hasNumber = answerNumbers.length > 0 && claimNumbers.length > 0;
    if (hasNumber) {
      if (overlap < 1) continue;
    } else {
      if (overlap < 2) continue; // una sola palabra genérica no es suficiente sin número
    }

    // Score por overlap
    const score = overlap;
    if (score > bestScore) {
      bestScore = score;
      best = claim;
      bestCount = 1;
    } else if (score === bestScore) {
      bestCount++;
    }
  }

  if (!best || bestCount !== 1) return null; // ambiguo o sin match seguro
  return best;
}

function splitSentences(text) {
  return String(text || '').split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
}

// Fase 4.16: segmentación intra-oración conservadora para una sola oración con múltiples claims.
// Solo divide cuando hay conectores claros entre dos afirmaciones independientes y no destruye relaciones semánticas.
function splitClausesSafe(sentence) {
  const s = String(sentence || '').trim();
  if (!s) return [s];
  // No dividir si la oración contiene nombres propios con "y" (ej. "Juan Pérez y María González")
  // Heurística: si "y" está entre dos nombres propios (mayúscula), no dividir
  if (/\b[A-Z][a-z]+ [A-Z][a-z]+ y [A-Z][a-z]+ [A-Z][a-z]+\b/.test(s)) return [s];
  // No dividir "renta y los gastos comunes" si es una enumeración simple sin verbo en la segunda parte
  // Para 4.16, solo dividimos en " y " cuando ambas partes tienen verbo o número/fecha
  const parts = s.split(/\s+y\s+|\s+pero\s+|\s+además\s+|\s+mientras que\s+|\s+sin embargo\s+/i);
  if (parts.length <= 1) return [s];
  // Verifica que cada parte tenga al menos un verbo o número/fecha para ser afirmación independiente
  const hasVerbOrNumber = (part) => /\b(es|son|tiene|tienen|debe|deben|comenzó|termina|dura|corresponde|asciende)\b|\d/.test(part.toLowerCase());
  const allValid = parts.every((p) => p.trim().length > 10 && hasVerbOrNumber(p));
  if (!allValid) return [s];
  // No dividir si alguna parte es muy corta (<15 chars) o parece enumeración
  if (parts.some((p) => p.trim().length < 15)) return [s];
  return parts.map((p) => p.trim()).filter(Boolean);
}

/**
 * Fase 4.15: Resolución multi-claim — cada oración de la respuesta se evalúa
 * contra los claims verificados con las mismas reglas conservadoras de 4.13.
 * Preserva orden de aparición, deduplica por claim, y rechaza ambigüedad por oración.
 * @param {{answer: string, verifiedClaims: Array}} input
 * @returns {Array} claims verificados que respaldan cada oración (orden de respuesta, sin duplicados)
 */
export function resolveMultiClaimEvidence({ answer, verifiedClaims }) {
  const ans = String(answer || '').trim();
  if (!ans || !Array.isArray(verifiedClaims) || verifiedClaims.length === 0) return [];
  const sentences = splitSentences(ans);
  if (sentences.length === 0) return [];
  const matched = [];
  const seen = new Set();
  for (const sentence of sentences) {
    const m = resolveChatEvidenceFromVerifiedClaims({ answer: sentence, verifiedClaims });
    if (m && !seen.has(m.source_id + '::' + m.fragment_id)) {
      seen.add(m.source_id + '::' + m.fragment_id);
      matched.push(m);
      continue;
    }
    // Fase 4.16: si la oración completa no matchea (ej. una sola oración con dos claims y dos números/fechas), intenta segmentación intra-oración
    const clauses = splitClausesSafe(sentence);
    if (clauses.length > 1) {
      for (const clause of clauses) {
        const cm = resolveChatEvidenceFromVerifiedClaims({ answer: clause, verifiedClaims });
        if (cm && !seen.has(cm.source_id + '::' + cm.fragment_id)) {
          seen.add(cm.source_id + '::' + cm.fragment_id);
          matched.push(cm);
        }
      }
    }
  }
  return matched;
}
