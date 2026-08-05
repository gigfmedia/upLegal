import { describe, it, expect } from 'vitest';
import { buildChatContext, CHAT_LIMITS } from './legalChatPrompt.mjs';

const longDoc = () =>
  'INTRO\n' + 'a '.repeat(500) + '\n6.3. APORTES DE LOS PARTICIPANTES\n' + 'cofinancimiento aporte 25% nuevo pecuniario\n' + 'b '.repeat(12000) + '\nFINAL';

describe('buildChatContext (chunking + recuperación)', () => {
  it('recupera la sección intermedia relevante a la pregunta en documentos extensos', () => {
    const { context, tooLarge } = buildChatContext({
      workspace: { name: 'caso' },
      documents: [{ id: '1', original_filename: 'doc.pdf', extracted_text: longDoc() }],
      analyses: {},
      question: '¿Qué dice el punto 6.3 de aportes de los participantes?',
    });
    expect(tooLarge).toBe(false);
    expect(context).toContain('APORTES DE LOS PARTICIPANTES');
  });

  it('no supera el límite global de contexto', () => {
    const { context } = buildChatContext({
      workspace: { name: 'caso' },
      documents: [{ id: '1', original_filename: 'doc.pdf', extracted_text: longDoc() }],
      analyses: {},
      question: 'cofinanciamiento',
    });
    expect(context.length).toBeLessThanOrEqual(CHAT_LIMITS.MAX_CHAT_CONTEXT_CHARS);
  });

  it('nunca marca el contexto como demasiado grande (recuperación acota)', () => {
    const { tooLarge } = buildChatContext({
      workspace: { name: 'caso' },
      documents: [{ id: '1', original_filename: 'doc.pdf', extracted_text: longDoc() }],
      analyses: { 1: { summary: 'análisis '.repeat(800) } },
      question: '¿Qué dice el punto 6.3?',
    });
    expect(tooLarge).toBe(false);
  });

  it('mantiene el inicio del documento cuando no hay pregunta', () => {
    const { context } = buildChatContext({
      workspace: { name: 'caso' },
      documents: [{ id: '1', original_filename: 'doc.pdf', extracted_text: longDoc() }],
      analyses: {},
    });
    expect(context).toContain('INTRO');
  });
});
