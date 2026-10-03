// @vitest-environment node
// FASE 4.59B — Research becomes Case memory: selección determinista,
// provenance, presupuesto acotado, exclusión de Document Chat.
import { describe, it, expect } from 'vitest';
import {
  selectRelevantResearch,
  formatResearchMemory,
  formatResearchLegalContext,
} from './researchMemory.mjs';
import { buildChatContext, buildChatSystemPrompt, CHAT_LIMITS } from './legalChatPrompt.mjs';

const R = (over = {}) => ({
  id: 'r1',
  query: '¿Qué dice la jurisprudencia sobre protección de datos personales?',
  answer: 'El Tribunal Constitucional reconoce la protección de datos como derecho fundamental.',
  sources: [{ id: 'tc-1', title: 'TC Rol 5174', kind: 'jurisprudencia', url: 'https://example.invalid/tc' }],
  created_at: '2026-09-01T00:00:00Z',
  ...over,
});

const DOC = (over = {}) => ({
  id: 'd1',
  original_filename: 'contrato.pdf',
  extracted_text: 'Contrato de prestación de servicios con obligaciones de pago.',
  ...over,
});

describe('selectRelevantResearch (determinista, sin embeddings)', () => {
  it('vacío y filtrado: filas sin answer no entran', () => {
    expect(selectRelevantResearch({ researchList: [] })).toEqual([]);
    expect(selectRelevantResearch({ researchList: [R({ answer: '  ' }), null] })).toEqual([]);
  });

  it('relevancia léxica gana a recencia', () => {
    const old = R({ id: 'old', query: 'protección de datos personales habeas data', created_at: '2026-01-01T00:00:00Z' });
    const recent = R({ id: 'new', query: 'arrendamiento y desahucio por no pago', created_at: '2026-09-20T00:00:00Z' });
    const picked = selectRelevantResearch({ researchList: [recent, old], question: 'habeas data y protección de datos' });
    expect(picked[0].id).toBe('old');
  });

  it('recencia desempata y respeta maxItems/maxChars', () => {
    const list = [1, 2, 3, 4, 5].map((i) =>
      R({ id: `r${i}`, query: 'tema común recurrente', created_at: `2026-09-0${i}T00:00:00Z` })
    );
    const picked = selectRelevantResearch({ researchList: list, question: 'tema común', maxItems: 2 });
    expect(picked.map((p) => p.id)).toEqual(['r5', 'r4']);
    const tiny = selectRelevantResearch({ researchList: list, question: 'tema común', maxChars: 100 });
    expect(tiny.length).toBeLessThanOrEqual(1);
  });

  it('provenance: query, fecha y fuentes en el bloque', () => {
    const text = formatResearchMemory(selectRelevantResearch({ researchList: [R()] }));
    expect(text).toContain('MEMORIA DE INVESTIGACIÓN');
    expect(text).toContain('protección de datos personales');
    expect(text).toContain('2026-09-01');
    expect(text).toContain('TC Rol 5174');
    expect(text).toContain('https://example.invalid/tc');
    expect(text).toContain('NO son hechos del caso');
  });

  it('legalContext separa síntesis de hechos y preserva ids/fechas', () => {
    const ctx = formatResearchLegalContext(selectRelevantResearch({ researchList: [R()] }));
    expect(ctx).toHaveLength(1);
    expect(ctx[0].research_id).toBe('r1');
    expect(ctx[0].query).toContain('protección de datos');
    expect(ctx[0].created_at).toBe('2026-09-01T00:00:00Z');
    expect(ctx[0].source_titles).toEqual(['TC Rol 5174']);
    expect(ctx[0]).not.toHaveProperty('facts');
  });
});

describe('buildChatContext con memoria (§30/31/32/52)', () => {
  it('sin research: comportamiento idéntico, sin bloque de memoria', () => {
    const { context, researchSelected } = buildChatContext({
      workspace: { name: 'caso' },
      documents: [DOC()],
      analyses: {},
      question: 'pregunta',
    });
    expect(context).not.toContain('MEMORIA DE INVESTIGACIÓN');
    expect(researchSelected).toEqual([]);
  });

  it('un research: entra con provenance y devuelve researchSelected', () => {
    const { context, researchSelected } = buildChatContext({
      workspace: { name: 'caso' },
      documents: [DOC()],
      analyses: {},
      question: 'protección de datos personales',
      researchList: [R()],
    });
    expect(context).toContain('MEMORIA DE INVESTIGACIÓN');
    expect(context).toContain('TC Rol 5174');
    expect(researchSelected.map((r) => r.id)).toEqual(['r1']);
  });

  it('Document Chat: memoria excluida aunque exista', () => {
    const { context, researchSelected } = buildChatContext({
      workspace: { name: 'caso' },
      documents: [DOC()],
      analyses: {},
      question: 'protección de datos',
      selectedDocumentId: 'd1',
      researchList: [R()],
    });
    expect(context).not.toContain('MEMORIA DE INVESTIGACIÓN');
    expect(researchSelected).toEqual([]);
    expect(context).toContain('DOCUMENTO SELECCIONADO');
  });

  it('fixture grande: acotado, documentos preservados, research truncado', () => {
    const docs = Array.from({ length: 20 }, (_, i) =>
      DOC({ id: `d${i}`, original_filename: `doc${i}.pdf`, extracted_text: 'contenido relevante del documento '.repeat(200) })
    );
    const list = Array.from({ length: 10 }, (_, i) =>
      R({ id: `r${i}`, query: `consulta número ${i} sobre datos`, answer: 'síntesis extensa '.repeat(200), created_at: `2026-09-${String(i + 1).padStart(2, '0')}T00:00:00Z` })
    );
    const { context, researchSelected } = buildChatContext({
      workspace: { name: 'caso con muchos documentos' },
      documents: docs,
      analyses: {},
      question: 'datos personales',
      researchList: list,
    });
    expect(context.length).toBeLessThanOrEqual(CHAT_LIMITS.MAX_CHAT_CONTEXT_CHARS);
    expect(researchSelected.length).toBeLessThanOrEqual(CHAT_LIMITS.MAX_RESEARCH_MEMORY_ITEMS);
    // documento 0 íntegro: la memoria no desplazó evidencia primaria
    expect(context).toContain('doc0.pdf');
    const memIdx = context.indexOf('MEMORIA DE INVESTIGACIÓN');
    const docIdx = context.indexOf('doc19.pdf');
    expect(memIdx).toBeGreaterThan(-1);
    expect(docIdx).toBeGreaterThan(-1);
    expect(docIdx).toBeLessThan(memIdx);
  });
});

describe('system prompt: autoridad y modo documento intacto', () => {
  it('modo caso incluye orden de autoridad con memoria secundaria', () => {
    const sys = buildChatSystemPrompt({ mode: 'case' });
    expect(sys).toContain('MEMORIA DE INVESTIGACIÓN');
    expect(sys).toContain('nunca prevalece');
    expect(sys).toContain('research_id');
  });

  it('modo documento sin reglas de memoria (autoridad intacta)', () => {
    const sys = buildChatSystemPrompt({ mode: 'document' });
    // El esquema JSON base puede mencionar el shape, pero no hay reglas de
    // autoridad de memoria ni orden que la incluya; la ruta además filtra
    // citas de research en modo documento (researchSelected vacío).
    expect(sys).not.toContain('MEMORIA DE INVESTIGACIÓN (contexto legal secundario');
    expect(sys).not.toContain('Orden de autoridad');
    expect(sys).toContain('DOCUMENTO SELECCIONADO');
  });
});
