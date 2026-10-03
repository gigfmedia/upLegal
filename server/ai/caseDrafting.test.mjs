// @vitest-environment node
// FASE 4.59D — unitarias del módulo de drafting: prompt, contexto, citas.
import { describe, it, expect } from 'vitest';
import {
  buildDraftSystemPrompt,
  buildDraftContext,
  selectDraftEvidence,
  validateDraftSources,
  DRAFT_LIMITS,
  DRAFT_TYPES,
} from './caseDrafting.mjs';

const DOCS = [
  { id: 'd1', original_filename: 'contrato.pdf', extracted_text: 'Contrato de arriendo con renta mensual de quinientos mil pesos y plazo de un año.', workspace_id: 'w', lawyer_id: 'u' },
  { id: 'd2', original_filename: 'demanda.pdf', extracted_text: 'Demanda por incumplimiento de pago de rentas del arrendamiento.', workspace_id: 'w', lawyer_id: 'u' },
];

describe('prompt y tipos', () => {
  it('tipos V1 acotados sin plantillas procesales', () => {
    expect(DRAFT_TYPES).toEqual(['escrito', 'informe', 'carta', 'otro']);
  });

  it('system prompt: borrador para revisión, sin invenciones, marcador único', () => {
    const sys = buildDraftSystemPrompt({ draftType: 'escrito' });
    expect(sys).toContain('BORRADOR');
    expect(sys).toContain('[POR COMPLETAR:');
    expect(sys).toContain('No inventes fechas');
    expect(sys).toContain('Nunca rellenes');
  });
});

describe('contexto acotado y ordenado', () => {
  it('orden instrucción→caso→snapshot→research y tope global', () => {
    const ctx = buildDraftContext({
      instruction: 'Preparar contestación',
      draftType: 'escrito',
      caseHeader: 'Caso: Arriendo',
      snapshot: { caseSummary: 'Resumen.', facts: [{ text: 'Hecho.' }], parties: ['A contra B'], legalContext: [{ research_id: 'r', query: 'q', created_at: '2026-01-01', synthesis: 'Síntesis.', source_titles: ['Ley'] }] },
      researchBlocks: '',
    });
    expect(ctx.indexOf('INSTRUCCIÓN')).toBeLessThan(ctx.indexOf('CASO:'));
    expect(ctx.indexOf('CASO:')).toBeLessThan(ctx.indexOf('RESUMEN DE INTELIGENCIA'));
    expect(ctx.length).toBeLessThanOrEqual(DRAFT_LIMITS.MAX_CONTEXT_CHARS);
  });

  it('evidencia por relevancia reutilizando grounding', () => {
    const { context, docMap } = selectDraftEvidence({ documents: DOCS, instruction: 'renta mensual impaga', workspaceId: 'w', lawyerId: 'u' });
    expect(context).toContain('contrato.pdf');
    expect(docMap.get('d1').file_name).toBe('contrato.pdf');
  });
});

describe('validateDraftSources: solo lo verificable', () => {
  const docMap = new Map([['d1', { file_name: 'contrato.pdf', text: DOCS[0].extracted_text }]]);
  const researchMap = new Map([['r1', { query: 'q', created_at: '2026-01-01', urls: new Set(['https://example.invalid/x']) }]]);

  it('acepta documental válida y research validado; descarta el resto', () => {
    const { sources, dropped, warnings } = validateDraftSources([
      { kind: 'document', document_id: 'd1', file_name: 'contrato.pdf', fragment_id: 'document::d1::0', evidence: 'renta mensual de quinientos mil' },
      { kind: 'research', research_id: 'r1', title: 'Ley', url: 'https://example.invalid/x' },
      { kind: 'research', research_id: 'nope', url: 'https://evil.invalid' },
      { kind: 'document', document_id: 'dx', file_name: 'otro.pdf' },
      null,
    ], { docMap, researchMap });
    expect(sources).toHaveLength(2);
    expect(sources[0].fragment_id).toBe('document::d1::0');
    expect(sources[1].url).toBe('https://example.invalid/x');
    expect(dropped).toBe(3);
    expect(warnings.length).toBe(1);
  });

  it('URL no suministrada se descarta aunque el research exista', () => {
    const { sources, dropped } = validateDraftSources(
      [{ kind: 'research', research_id: 'r1', url: 'https://evil.invalid/y' }],
      { docMap, researchMap }
    );
    expect(sources).toHaveLength(0);
    expect(dropped).toBe(1);
  });

  it('fragmento con file_name distinto se descarta', () => {
    const { sources } = validateDraftSources(
      [{ kind: 'document', document_id: 'd1', file_name: 'demanda.pdf', fragment_id: 'document::d1::0', evidence: 'renta mensual' }],
      { docMap, researchMap }
    );
    expect(sources).toHaveLength(0);
  });
});
