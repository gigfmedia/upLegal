import { describe, it, expect } from 'vitest';
import {
  aggregateRisks,
  normalizeIntelligenceRisks,
  riskText,
} from './caseSnapshots.mjs';

const docById = new Map([
  ['d1', { id: 'd1', original_filename: 'Contrato de arriendo.pdf' }],
  ['d2', { id: 'd2', original_filename: 'Recurso CORFO.pdf' }],
]);

const analyses = (list) => list.map(([document_id, risks]) => ({ document_id, risks }));

describe('4.61H agregación con provenance', () => {
  it('31. piloto: 3 + 2 riesgos en 2 grupos con fuente', () => {
    const risks = aggregateRisks(
      analyses([
        ['d1', ['HECHO: debe pagar la renta', 'HECHO: no puede subarrendar', 'HECHO: la garantía']],
        ['d2', ['HECHO: decisión CORFO', 'HECHO: recurso de reposición']],
      ]),
      docById
    );
    expect(risks).toHaveLength(5);
    expect(risks.filter((r) => r.document_id === 'd1')).toHaveLength(3);
    expect(risks.filter((r) => r.document_id === 'd2')).toHaveLength(2);
    expect(risks[0]).toMatchObject({ document_id: 'd1', filename: 'Contrato de arriendo.pdf' });
  });
  it('32. mismo texto en dos docs conserva ambas fuentes', () => {
    const risks = aggregateRisks(
      analyses([
        ['d1', ['Riesgo de incumplimiento'],
        ],
        ['d2', ['Riesgo de incumplimiento']],
      ]),
      docById
    );
    expect(risks).toHaveLength(2);
    expect(new Set(risks.map((r) => r.document_id))).toEqual(new Set(['d1', 'd2']));
  });
  it('33. duplicado del mismo doc colapsa (insensible a mayúsculas/espacios)', () => {
    const risks = aggregateRisks(
      analyses([['d1', ['Riesgo X', '  riesgo  x  ', 'RIESGO X']]]),
      docById
    );
    expect(risks).toHaveLength(1);
  });
  it('filename ausente no rompe: document_id siempre presente', () => {
    const risks = aggregateRisks(analyses([['dx', ['Algo']]]), new Map());
    expect(risks[0]).toMatchObject({ document_id: 'dx', filename: null });
  });
  it('normalizer legacy + riskText para downstream', () => {
    expect(normalizeIntelligenceRisks(['a', { text: 'b', document_id: 'd1' }, null, 42])).toEqual([
      { text: 'a', document_id: null, filename: null },
      { text: 'b', document_id: 'd1', filename: null },
    ]);
    expect(riskText('x')).toBe('x');
    expect(riskText({ text: 'y' })).toBe('y');
    expect(riskText(null)).toBe('');
  });
});
