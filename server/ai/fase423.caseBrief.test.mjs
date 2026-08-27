import { describe, it, expect } from 'vitest';
import { deriveCaseBrief } from './caseBrief.mjs';

const baseIntel = (o = {}) => ({
  document_count: 1,
  facts: [],
  risks: [],
  contradictions: [],
  missingInformation: [],
  documents: [{ id: 'd1' }],
  pending_count: 0,
  failed_count: 0,
  ...o,
});

describe('4.23 caseBrief', () => {
  it('A sin documentos → 0 y sin highlights', () => {
    const intel = baseIntel({ document_count: 0, facts: [], risks: [], contradictions: [], missingInformation: [] });
    const brief = deriveCaseBrief(intel, [], []);
    expect(brief.documentCount).toBe(0);
    expect(brief.highlights.length).toBe(0);
    expect(brief.factCount).toBe(0);
  });
  it('B con facts → factCount correcto', () => {
    const intel = baseIntel({ facts: [{ text: 'Hecho 1', source_ids: ['d1'], evidences: [{ fragment_id: 'f1', page_number: 1, evidence: 'ev' }] }] });
    const brief = deriveCaseBrief(intel, [], []);
    expect(brief.factCount).toBe(1);
    expect(brief.highlights.some((h) => h.category === 'fact')).toBe(true);
  });
  it('C con risks → riskCount', () => {
    const intel = baseIntel({ risks: ['Riesgo 1'] });
    const brief = deriveCaseBrief(intel, [], []);
    expect(brief.riskCount).toBe(1);
  });
  it('D con contradictions → count', () => {
    const intel = baseIntel({ contradictions: [{ topic: 'renta', versions: [{ source_id: 'd1', evidence: 'ev' }] }] });
    const brief = deriveCaseBrief(intel, [], []);
    expect(brief.contradictionCount).toBe(1);
  });
  it('E con missing → count', () => {
    const intel = baseIntel({ missingInformation: ['Falta fecha'] });
    const brief = deriveCaseBrief(intel, [], []);
    expect(brief.missingInformationCount).toBe(1);
  });
  it('F prioridad high antes de medium/low', () => {
    const intel = baseIntel({ risks: ['R'], contradictions: [{ topic: 't', versions: [] }], missingInformation: ['M'], facts: [{ text: 'F', source_ids: [], evidences: [] }] });
    const brief = deriveCaseBrief(intel, [], []);
    expect(brief.highlights[0].priority).toBe('high');
    expect(brief.highlights[1].priority).toBe('high');
    expect(brief.highlights[2].priority).toBe('medium');
  });
  it('G workflow completed no aparece como pendiente', () => {
    const intel = baseIntel({});
    const wf = [{ id: '1', action_id: 'review_risks', status: 'completed', priority: 'medium', created_at: new Date().toISOString() }];
    const brief = deriveCaseBrief(intel, wf, []);
    expect(brief.nextActions.length).toBe(0);
  });
  it('H dismissed no aparece', () => {
    const wf = [{ id: '1', action_id: 'review_risks', status: 'dismissed', priority: 'medium', created_at: new Date().toISOString() }];
    const brief = deriveCaseBrief(baseIntel({}), wf, []);
    expect(brief.nextActions.length).toBe(0);
  });
  it('I in_progress antes que pending', () => {
    const now = new Date().toISOString();
    const wf = [
      { id: '1', action_id: 'a', status: 'pending', priority: 'high', created_at: now },
      { id: '2', action_id: 'b', status: 'in_progress', priority: 'low', created_at: now },
    ];
    const brief = deriveCaseBrief(baseIntel({}), wf, []);
    expect(brief.nextActions[0].status).toBe('in_progress');
  });
  it('J evidence preservado', () => {
    const intel = baseIntel({ facts: [{ text: 'Hecho', source_ids: ['d1'], evidences: [{ fragment_id: 'f1', page_number: 2, evidence: 'texto evidencia' }] }] });
    const brief = deriveCaseBrief(intel, [], []);
    const h = brief.highlights.find((x) => x.category === 'fact');
    expect(h.evidence.fragmentId).toBe('f1');
    expect(h.evidence.pageNumber).toBe(2);
    expect(h.evidence.evidence).toBe('texto evidencia');
  });
  it('K no evidence no CTA inventada', () => {
    const intel = baseIntel({ facts: [{ text: 'Hecho sin evidencia', source_ids: ['d1'], evidences: [] }] });
    const brief = deriveCaseBrief(intel, [], []);
    const h = brief.highlights.find((x) => x.category === 'fact');
    expect(h.evidence).toBe(null);
  });
  it('L multi-document conteo', () => {
    const intel = baseIntel({ document_count: 3, facts: [], risks: [] });
    const brief = deriveCaseBrief(intel, [], [{}, {}, {}]);
    expect(brief.documentCount).toBe(3);
  });
  it('M ownership determinista (no LLM)', () => {
    const intel = baseIntel({ risks: ['R1'] });
    const b1 = deriveCaseBrief(intel, [], []);
    const b2 = deriveCaseBrief(intel, [], []);
    expect(JSON.stringify(b1)).toBe(JSON.stringify(b2));
  });
  it('N no LLM, status descriptivo no predictivo', () => {
    const intel = baseIntel({ contradictions: [{ topic: 'x', versions: [] }] });
    const brief = deriveCaseBrief(intel, [], []);
    expect(brief.status.label).not.toContain('ganado');
    expect(brief.status.label).not.toContain('éxito');
    expect(brief.status.label.toLowerCase()).toContain('contradic');
  });
});
