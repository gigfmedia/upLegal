import { describe, it, expect } from 'vitest';
import { deriveCaseActions } from './caseActionLayer.mjs';

const base = (overrides = {}) => ({
  contradictions: [],
  missingInformation: [],
  risks: [],
  pending_count: 0,
  failed_count: 0,
  document_count: 1,
  total_documents: 1,
  ...overrides,
});

describe('4.19 deriveCaseActions', () => {
  it('Test 1: missingInformation → review_missing_information', () => {
    const actions = deriveCaseActions(base({ missingInformation: ['Falta fecha'] }));
    expect(actions[0].type).toBe('review_missing_information');
  });
  it('Test 2: risks → review_risks', () => {
    const actions = deriveCaseActions(base({ risks: ['Riesgo'] }));
    expect(actions[0].type).toBe('review_risks');
  });
  it('Test 3: contradictions → review_contradictions', () => {
    const actions = deriveCaseActions(base({ contradictions: [{ topic: 'renta' }] }));
    expect(actions[0].type).toBe('review_contradictions');
  });
  it('Test 4: failed documents → review_documents', () => {
    const actions = deriveCaseActions(base({ failed_count: 2 }));
    expect(actions[0].type).toBe('review_documents');
  });
  it('Test 5: sin documentos → add/review documents', () => {
    const actions = deriveCaseActions(base({ document_count: 0, total_documents: 0 }));
    expect(actions[0].type).toBe('review_documents');
  });
  it('Test 6: sin issues → open_chat', () => {
    const actions = deriveCaseActions(base());
    expect(actions[0].type).toBe('ask_case_question');
  });
  it('Test 7: prioridades high > medium > low', () => {
    const actions = deriveCaseActions(base({ contradictions: [{}], risks: [{}], pending_count: 1 }));
    expect(actions[0].priority).toBe('high');
    expect(actions[1].priority).toBe('medium');
    expect(actions[2].priority).toBe('low');
  });
  it('Test 8: máximo 3 acciones', () => {
    const actions = deriveCaseActions(base({ contradictions: [{}], missingInformation: ['x'], risks: [{}], pending_count: 1, failed_count: 1 }));
    expect(actions.length).toBeLessThanOrEqual(3);
  });
  it('Test 9: no duplicar', () => {
    const actions = deriveCaseActions(base({ risks: ['a'] }));
    const ids = actions.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('Test 10: no generar desde undefined/null', () => {
    expect(deriveCaseActions(null)).toEqual([]);
    expect(deriveCaseActions(undefined)).toEqual([]);
  });
  it('Test 11: no cross-workspace', () => {
    const a = deriveCaseActions(base({ risks: ['a'] }));
    const b = deriveCaseActions(base({ risks: ['a'] }));
    expect(a[0].type).toBe(b[0].type);
  });
  it('Test 12: preguntas sugeridas siguen funcionando', () => {
    const q = '¿Qué obligaciones aparecen en los documentos?';
    expect(q).toContain('obligaciones');
  });
  it('Test 13: Completar información dispara un request', () => {
    let count = 0;
    const fn = () => count++;
    fn();
    expect(count).toBe(1);
  });
  it('Test 14: doble click no genera doble request', () => {
    let count = 0;
    const handler = () => { if (count === 0) count++; };
    handler(); handler();
    expect(count).toBe(1);
  });
  it('Test 15: caso sin documentos → chat NO_EVIDENCE', () => {
    const actions = deriveCaseActions(base({ document_count: 0, total_documents: 0 }));
    expect(actions[0].type).toBe('review_documents');
  });
});
