import { describe, it, expect } from 'vitest';
import { explainRecommendation, ASSISTANT_LIMITS } from './assistant.mjs';

const lawyer = (id, name = 'Abogado Test') => ({
  id,
  name,
  specialties: ['Derecho Laboral'],
  experience_years: 8,
  location: 'Santiago, Chile',
  bestService: { title: 'Consulta Inicial', price_clp: 50000 },
  matchScore: 80,
});

const chatCompletionOk = (reasons) => async () => ({
  data: { reasons },
  usage: { input_tokens: 100, output_tokens: 40, total_tokens: 140, estimated_cost_usd: 0.001 },
});

describe('Cerebro 3 · explainRecommendation (data-grounded)', () => {
  it('normaliza razones y descarta ids que no existen en la lista real', async () => {
    const result = await explainRecommendation({
      problem: 'Me despidieron sin finiquito',
      lawyers: [lawyer('a1'), lawyer('b2')],
      chatCompletion: chatCompletionOk([
        { id: 'a1', reason: ' Especialista laboral con 8 años de experiencia. ' },
        { id: 'b2', reason: 'Trabaja consultas de finiquito.' },
        { id: 'id-inventado', reason: 'Este id no debería pasar la validación.' },
        { id: 'a1', reason: '' },
      ]),
    });

    expect(result.usedAI).toBe(true);
    expect(Object.keys(result.reasons).sort()).toEqual(['a1', 'b2']);
    expect(result.reasons.a1).toBe('Especialista laboral con 8 años de experiencia.');
    expect(result.reasons['id-inventado']).toBeUndefined();
  });

  it('devuelve reasons vacío si el modelo responde sin lista de reasons', async () => {
    const result = await explainRecommendation({
      problem: 'Problema',
      lawyers: [lawyer('a1')],
      chatCompletion: chatCompletionOk(null),
    });
    expect(result.usedAI).toBe(true);
    expect(result.reasons).toEqual({});
  });

  it('cae a determinístico sin lanzar si el proveedor falla', async () => {
    const failing = async () => {
      throw new Error('proveedor caído');
    };
    const result = await explainRecommendation({
      problem: 'Problema',
      lawyers: [lawyer('a1')],
      chatCompletion: failing,
    });
    expect(result.usedAI).toBe(false);
    expect(result.reasons).toEqual({});
    expect(result.usage).toBeNull();
  });

  it('devuelve reasons vacío sin llamar IA si no hay abogados', async () => {
    const spy = { called: false };
    const result = await explainRecommendation({
      problem: 'Problema',
      lawyers: [],
      chatCompletion: () => {
        spy.called = true;
      },
    });
    expect(spy.called).toBe(false);
    expect(result.usedAI).toBe(false);
    expect(result.reasons).toEqual({});
  });

  it('acota la longitud de cada razón a 120 caracteres', async () => {
    const long = 'x'.repeat(500);
    const result = await explainRecommendation({
      problem: 'Problema',
      lawyers: [lawyer('a1')],
      chatCompletion: chatCompletionOk([{ id: 'a1', reason: long }]),
    });
    expect(result.reasons.a1.length).toBe(120);
  });

  it('expone el límite de razones explicadas', () => {
    expect(ASSISTANT_LIMITS.MAX_EXPLANATION_REASONS).toBe(4);
  });
});
