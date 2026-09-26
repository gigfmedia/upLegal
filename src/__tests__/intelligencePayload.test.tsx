import { describe, it, expect } from 'vitest';
import { normalizeCaseIntelligence } from '@/hooks/useAIDocuments';
import { deriveCaseActions } from '@/lib/caseActions';

describe('intelligence payload hardening (malformed 200 never crashes render)', () => {
  it('null/empty payload normalizes to safe empty shape', () => {
    for (const raw of [null, undefined, {}, { document_count: 2 }]) {
      const n = normalizeCaseIntelligence(raw);
      expect(n.facts).toEqual([]);
      expect(n.parties).toEqual([]);
      expect(n.obligations).toEqual([]);
      expect(n.deadlines).toEqual([]);
      expect(n.risks).toEqual([]);
      expect(n.contradictions).toEqual([]);
      expect(n.missingInformation).toEqual([]);
      expect(n.caseSummary).toBe('');
      expect(n.documents).toEqual([]);
    }
  });

  it('valid payload passes through untouched (elements + counts preserved)', () => {
    const raw = {
      workspace_id: 'w1',
      document_count: 1,
      pending_count: 0,
      failed_count: 0,
      total_documents: 1,
      documents: [{ id: 'd1' }],
      facts: [{ text: 'f' }],
      parties: ['p'],
      obligations: ['o'],
      deadlines: [{ date: '2026-01-01', description: 'd' }],
      risks: ['r'],
      contradictions: [],
      missingInformation: [],
      caseSummary: 's',
      attributionCoverage: 1,
    };
    const n = normalizeCaseIntelligence(raw);
    expect(n.document_count).toBe(1);
    expect(n.facts).toEqual([{ text: 'f' }]);
    expect(n.caseSummary).toBe('s');
    // deriveCaseActions (render path) tolerates the normalized shape
    expect(() => deriveCaseActions(n)).not.toThrow();
  });

  it('normalized partial shape selects the empty state instead of throwing', () => {
    const n = normalizeCaseIntelligence({ document_count: 0, pending_count: 0, failed_count: 0 });
    expect(n.document_count).toBe(0);
    expect(n.facts.length).toBe(0);
  });
});
