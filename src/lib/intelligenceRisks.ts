/**
 * FASE 4.61H — modelo canónico de riesgos para UI.
 * Tolera snapshots legacy (string[]) y nuevos (objetos con fuente).
 */

export type IntelligenceRisk = {
  text: string;
  document_id: string | null;
  filename: string | null;
};

export const UNKNOWN_SOURCE_LABEL = 'Documento no identificado';

/** Fallback exacto del prompt cuando la consecuencia no consta. */
const FALLBACK_CONSEQUENCE = 'consecuencia no determinada en el documento';

function normalizeText(t: string): string {
  return t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.]+$/, '');
}

export function normalizeIntelligenceRisks(risks: unknown): IntelligenceRisk[] {
  if (!Array.isArray(risks)) return [];
  return risks
    .map((r): IntelligenceRisk => {
      if (typeof r === 'string') return { text: r, document_id: null, filename: null };
      if (r && typeof r === 'object') {
        const o = r as Record<string, unknown>;
        return {
          text: typeof o.text === 'string' ? o.text : '',
          document_id:
            typeof o.document_id === 'string'
              ? o.document_id
              : typeof o.documentId === 'string'
                ? o.documentId
                : null,
          filename: typeof o.filename === 'string' ? o.filename : null,
        };
      }
      return { text: '', document_id: null, filename: null };
    })
    .filter((r) => r.text.trim().length > 0);
}

export function riskText(r: string | IntelligenceRisk): string {
  if (typeof r === 'string') return r;
  return r?.text ?? '';
}

/**
 * Quita la oración fallback exacta ("Consecuencia no determinada...").
 * Solo variantes seguras (capitalización/punto final); el resto intacto.
 */
export function stripRiskFallback(text: string): string {
  const sentences = String(text ?? '').split(/(?<=[.!?])\s+/);
  const kept = sentences.filter((s) => normalizeText(s) !== FALLBACK_CONSEQUENCE);
  const out = kept.join(' ').trim();
  return out || String(text ?? '').trim();
}

export type RiskGroup = {
  key: string;
  filename: string | null;
  items: IntelligenceRisk[];
};

/** Agrupa por documento preservando orden de primera aparición. */
export function groupRisksByDocument(risks: IntelligenceRisk[]): RiskGroup[] {
  const groups: RiskGroup[] = [];
  const byKey = new Map<string, RiskGroup>();
  for (const r of risks) {
    const key = r.document_id || '__unknown__';
    let g = byKey.get(key);
    if (!g) {
      g = { key, filename: r.filename, items: [] };
      byKey.set(key, g);
      groups.push(g);
    }
    if (!g.filename && r.filename) g.filename = r.filename;
    g.items.push(r);
  }
  return groups;
}

export type ParsedRisk = {
  sourceText: string;
  fact: string | null;
  risk: string | null;
  consequence: string | null;
};

const SEGMENT_ARROW = /→|->|=>/;

function cleanSegment(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/** Etiqueta inicial del segmento (normalizada) o null. */
function segmentLabel(segment: string): 'fact' | 'risk' | 'consequence' | null {
  const head = normalizeText(segment.split(':')[0] ?? '');
  if (head === 'hecho') return 'fact';
  if (
    head === 'inferencia / riesgo' ||
    head === 'inferencia/riesgo' ||
    head === 'inferencia' ||
    head === 'riesgo'
  ) {
    return 'risk';
  }
  if (head === 'consecuencia') return 'consequence';
  return null;
}

function stripLabel(segment: string): string {
  const idx = segment.indexOf(':');
  if (idx === -1) return cleanSegment(segment);
  return cleanSegment(segment.slice(idx + 1));
}

/**
 * FASE 4.61H.1 — parsea el formato generado conocido:
 *   HECHO: A. → INFERENCIA / RIESGO: B. → CONSECUENCIA: C.
 * Solo presentación: no reescribe contenido, no usa LLM. Si no reconoce
 * el formato, devuelve null y se renderiza el texto original.
 */
export function parseIntelligenceRiskText(text: string): ParsedRisk | null {
  const sourceText = String(text ?? '');
  const segments = sourceText
    .split(SEGMENT_ARROW)
    .map((s) => cleanSegment(s))
    .filter(Boolean);
  if (segments.length === 0) return null;

  let fact: string | null = null;
  let risk: string | null = null;
  let consequence: string | null = null;
  let recognized = 0;

  for (const seg of segments) {
    const label = segmentLabel(seg);
    if (!label) continue;
    recognized += 1;
    const value = stripLabel(seg);
    if (!value) continue;
    if (label === 'fact' && fact === null) fact = value;
    else if (label === 'risk' && risk === null) risk = value;
    else if (label === 'consequence' && consequence === null) {
      consequence =
        normalizeText(value) === 'consecuencia no determinada en el documento' ? null : value;
    }
  }

  // Sin ninguna etiqueta conocida no es el formato generado: raw fallback.
  if (recognized === 0) return null;
  // Sin riesgo extraíble no hay nada que jerarquizar: raw fallback.
  if (risk === null) return null;
  return { sourceText, fact, risk, consequence };
}
