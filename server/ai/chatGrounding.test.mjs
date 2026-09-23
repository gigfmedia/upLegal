import { describe, it, expect } from 'vitest';
import {
  buildChatContext,
  buildChatSystemPrompt,
  buildChatUserPrompt,
  CHAT_LIMITS,
} from './legalChatPrompt.mjs';

// 4.39B — autoridad del documento seleccionado (sin provider).
const docA = {
  id: 'doc-A',
  original_filename: 'Contrato de Arriendo.pdf',
  extracted_text: 'Contrato de arrendamiento entre partes. Fecha límite: 30 de junio. ',
};
const docB = {
  id: 'doc-B',
  original_filename: 'Recurso_Reposicion.pdf',
  extracted_text: 'Recurso de reposición interpuesto. Fecha límite: 15 de noviembre. ',
};
const ws = { id: 'ws-1', name: 'Caso QA' };
const Q = '¿Cuál es la fecha límite?';

describe('4.39B selected-document authority (deterministic, no provider)', () => {
  it('§22 selecciona B: bloque primario etiquetado + instrucción de autoridad', () => {
    const { context, tooLarge } = buildChatContext({
      workspace: ws,
      documents: [docA, docB],
      analyses: {},
      question: Q,
      selectedDocumentId: 'doc-B',
    });
    expect(tooLarge).toBe(false);
    // B explícitamente etiquetado y ANTES que A.
    expect(context).toContain('DOCUMENTO SELECCIONADO: Recurso_Reposicion.pdf');
    expect(context.indexOf('DOCUMENTO SELECCIONADO')).toBeLessThan(
      context.indexOf('OTRO DOCUMENTO DEL CASO')
    );
    expect(context).toContain('15 de noviembre');
    // Instrucción de autoridad presente.
    expect(context).toContain('Responde basándote principalmente en él');
    expect(context).toContain('Si la respuesta no está en este documento, dilo claramente');
    // A queda como secundario, no omitido.
    expect(context).toContain('OTRO DOCUMENTO DEL CASO (contexto secundario): Contrato de Arriendo.pdf');
    expect(context.length).toBeLessThanOrEqual(CHAT_LIMITS.MAX_CHAT_CONTEXT_CHARS);
  });

  it('§23 selección inversa: A primario cuando se selecciona A', () => {
    const { context } = buildChatContext({
      workspace: ws,
      documents: [docA, docB],
      analyses: {},
      question: Q,
      selectedDocumentId: 'doc-A',
    });
    expect(context).toContain('DOCUMENTO SELECCIONADO: Contrato de Arriendo.pdf');
    expect(context.indexOf('DOCUMENTO SELECCIONADO')).toBeLessThan(
      context.indexOf('OTRO DOCUMENTO DEL CASO')
    );
    expect(context).not.toContain('DOCUMENTO SELECCIONADO: Recurso_Reposicion.pdf');
  });

  it('§24 hermano grande (~48k): B seleccionado siempre presente en bloque primario', () => {
    const bigA = { id: 'doc-A', original_filename: 'A.pdf', extracted_text: 'x '.repeat(24000) };
    const smallB = { id: 'doc-B', original_filename: 'B.pdf', extracted_text: 'RESPUESTA-UNICA-B-15-noviembre.' };
    const { context } = buildChatContext({
      workspace: ws,
      documents: [bigA, smallB],
      analyses: {},
      question: Q,
      selectedDocumentId: 'doc-B',
    });
    expect(context).toContain('DOCUMENTO SELECCIONADO: B.pdf');
    expect(context).toContain('RESPUESTA-UNICA-B-15-noviembre');
    expect(context.indexOf('RESPUESTA-UNICA-B-15-noviembre')).toBeLessThan(
      context.indexOf('OTRO DOCUMENTO DEL CASO')
    );
    expect(context.length).toBeLessThanOrEqual(CHAT_LIMITS.MAX_CHAT_CONTEXT_CHARS);
  });

  it('análisis del seleccionado va adyacente con prioridad; otros como secundarios', () => {
    const { context } = buildChatContext({
      workspace: ws,
      documents: [docA, docB],
      analyses: {
        'doc-A': { summary: 'Análisis del arriendo.' },
        'doc-B': { summary: 'Análisis del recurso.' },
      },
      question: Q,
      selectedDocumentId: 'doc-B',
    });
    const selIdx = context.indexOf('DOCUMENTO SELECCIONADO');
    expect(context.indexOf('Análisis del recurso.', selIdx)).toBeGreaterThan(selIdx);
    // El análisis del otro documento no precede al bloque seleccionado.
    expect(context.indexOf('Análisis del arriendo.')).toBeGreaterThan(
      context.indexOf('OTRO DOCUMENTO DEL CASO')
    );
  });

  it('modo caso (sin seleccionado): sin bloque de autoridad, contexto amplio intacto', () => {
    const { context } = buildChatContext({
      workspace: ws,
      documents: [docA, docB],
      analyses: {},
      question: Q,
    });
    expect(context).not.toContain('DOCUMENTO SELECCIONADO');
    expect(context).not.toContain('OTRO DOCUMENTO DEL CASO');
    expect(context).toContain('DOCUMENTO: Contrato de Arriendo.pdf');
    expect(context).toContain('DOCUMENTO: Recurso_Reposicion.pdf');
    expect(context).toContain('30 de junio');
    expect(context).toContain('15 de noviembre');
  });

  it('instrucción de autoridad en system prompt solo en modo documento', () => {
    const doc = buildChatSystemPrompt({ mode: 'document' });
    expect(doc).toContain('DOCUMENTO SELECCIONADO');
    expect(doc).toContain('autoridad primaria');
    expect(doc).toContain('dilo claramente');
    const def = buildChatSystemPrompt();
    expect(def).not.toContain('DOCUMENTO SELECCIONADO');
    expect(buildChatSystemPrompt({ mode: 'case' })).not.toContain('DOCUMENTO SELECCIONADO');
  });

  it('§27 historial: el builder acepta historial vacío (estrategia Document Chat)', () => {
    // La exclusión del historial workspace-wide vive en la ruta; aquí se
    // verifica que el prompt resultante no arrastre turnos de otro documento.
    const { context } = buildChatContext({
      workspace: ws,
      documents: [docB],
      analyses: {},
      question: Q,
      selectedDocumentId: 'doc-B',
    });
    const prompt = buildChatUserPrompt({ question: Q, context, history: [] });
    expect(prompt).not.toContain('HISTORIAL RECIENTE');
    expect(prompt).toContain('DOCUMENTO SELECCIONADO');
    expect(prompt).toContain(`PREGUNTA DEL ABOGADO:\n${Q}`);
  });
});
