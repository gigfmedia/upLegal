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
