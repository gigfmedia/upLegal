import type { AIResearchSource } from '@/hooks/useAIResearch';

// ---------------------------------------------------------------------------
// Fase 4.1.3 · Respuesta breve: la UI NO muestra extensiones de enumeraciones
// cerradas sin respaldo ("…, y bloqueo, entre otros"). Solo se elimina la
// expresión de apertura cuando los MISMOS elementos de la lista existen como
// enumeración cerrada en los claims verificados. Sin correspondencia exacta,
// no se modifica el texto (regla conservadora).
// Módulo separado (sin componentes) para preservar fast-refresh.
// ---------------------------------------------------------------------------

const OPEN_ENUM_PHRASE =
  /\b(?:entre\s+otros|entre\s+otras|entre\s+ellos|entre\s+ellas|incluyendo(?:\s+pero\s+no\s+limitad[oa])?|por\s+ejemplo|etc(?:étera)?\.?|y\s+dem[áa]s|y\s+otros|y\s+otras|u\s+otros|u\s+otras)\b/i;

const CLOSED_LIST_RE = /\b([a-záéíóúüñ]+(?:\s*,\s*[a-záéíóúüñ]+)*\s*,?\s*\b(?:y|e|o|u)\b\s+[a-záéíóúüñ]+)\b/gi;

const TRAILING_LIST_RE = /([a-záéíóúüñ]+(?:\s*,\s*[a-záéíóúüñ]+)*\s*,?\s*\b(?:y|e|o|u)\b\s+[a-záéíóúüñ]+)\s*,?\s*$/i;

const normalizeEnumWord = (w: string): string =>
  w.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/**
 * Recopila las enumeraciones CERRADAS presentes en los claims verificados.
 */
function collectClosedEnumerations(evidenceTexts: string[]): Set<string> {
  const closed = new Set<string>();
  for (const raw of evidenceTexts) {
    const norm = normalizeEnumWord(raw);
    let m: RegExpExecArray | null;
    CLOSED_LIST_RE.lastIndex = 0;
    while ((m = CLOSED_LIST_RE.exec(norm)) !== null) {
      const after = norm.slice(m.index + m[0].length).trimStart();
      if (OPEN_ENUM_PHRASE.test(after)) continue;
      const items = m[1].split(/\s*,\s*|\s+\b(?:y|e|o|u)\b\s+/i).map(normalizeEnumWord).filter(Boolean);
      if (items.length >= 2) closed.add(items.sort().join('|'));
    }
  }
  return closed;
}

/**
 * Elimina la primera apertura de enumeración cuyos elementos coincidan con una
 * enumeración cerrada de los claims. Devuelve el texto original si no es seguro.
 */
function trimUnsupportedEnumeration(text: string, evidenceTexts: string[]): string {
  const closed = collectClosedEnumerations(evidenceTexts);
  if (closed.size === 0) return text;
  let result = String(text || '');
  const re = new RegExp(OPEN_ENUM_PHRASE.source, 'gi');
  let m: RegExpExecArray | null;
  while ((m = re.exec(result)) !== null) {
    const trailing = TRAILING_LIST_RE.exec(result.slice(0, m.index));
    if (!trailing) continue;
    const items = trailing[1].split(/\s*,\s*|\s+\b(?:y|e|o|u)\b\s+/i).map(normalizeEnumWord).filter(Boolean);
    if (items.length < 2 || !closed.has(items.sort().join('|'))) continue;

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
 * Aplica la transformación SOLO a la sección "Respuesta breve" del markdown de
 * la respuesta, usando los claims verificados disponibles en la fuente.
 */
export function constrainResumenOverstatement(
  answer: string,
  sources: AIResearchSource[],
): string {
  if (!answer || !Array.isArray(sources) || sources.length === 0) return answer;
  const evidenceTexts: string[] = [];
  for (const source of sources) {
    for (const claim of source.claims ?? []) {
      if (!claim.verified) continue;
      if (claim.afirmacion) evidenceTexts.push(claim.afirmacion);
      if (claim.evidencia) evidenceTexts.push(claim.evidencia);
    }
  }
  if (evidenceTexts.length === 0) return answer;

  const lines = answer.split('\n');
  const headerIdx = lines.findIndex((l) => l.trim() === '**Respuesta breve**');
  if (headerIdx === -1) return answer;

  let start = headerIdx + 1;
  while (start < lines.length && !lines[start].trim()) start++;
  if (start >= lines.length) return answer;

  let end = start;
  while (end < lines.length && !/\*\*/.test(lines[end])) end++;
  const section = lines.slice(start, end).join('\n');
  const confined = trimUnsupportedEnumeration(section, evidenceTexts);
  if (confined === section) return answer;

  return [...lines.slice(0, start), confined, ...lines.slice(end)].join('\n');
}