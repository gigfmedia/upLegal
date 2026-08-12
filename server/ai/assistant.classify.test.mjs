import { describe, it, expect } from 'vitest';
import { classifyProblem, detectProcessIntent, detectLawyerServicesIntent } from './assistant.mjs';

const failingProvider = async () => {
  throw new Error('proveedor caído');
};

const llmClassification = (overrides = {}) => ({
  reply: 'Entiendo, cuéntame un poco más.',
  category: 'arriendo',
  subcategory: 'devolucion_garantia',
  summary: 'Problema de garantía',
  urgency: 'medium',
  commercialIntent: 'high',
  readyToRecommend: false,
  question: '¿Ya entregaste el departamento?',
  options: ['Sí, ya lo entregué', 'Todavía no', 'No estoy seguro'],
  ...overrides,
});

const chatCompletionReturning = (data) => async () => ({
  data,
  usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15, estimated_cost_usd: 0.0001 },
});

describe('Classify · opciones contextuales (quick replies)', () => {
  it('normaliza options del LLM y las pasa cuando readyToRecommend es false', async () => {
    const { classification } = await classifyProblem({
      history: [{ role: 'user', content: 'No me devuelven la garantía' }],
      chatCompletion: chatCompletionReturning(llmClassification()),
    });
    expect(classification.readyToRecommend).toBe(false);
    expect(classification.options).toEqual([
      'Sí, ya lo entregué',
      'Todavía no',
      'No estoy seguro',
    ]);
  });

  it('fuerza options a [] cuando readyToRecommend es true', async () => {
    const { classification } = await classifyProblem({
      history: [{ role: 'user', content: 'Problema completo con contexto suficiente' }],
      chatCompletion: chatCompletionReturning(
        llmClassification({ readyToRecommend: true, question: null, options: ['Sí', 'No'] })
      ),
    });
    expect(classification.readyToRecommend).toBe(true);
    expect(classification.options).toEqual([]);
  });

  it('deduplica, recorta y limita a 4 opciones', async () => {
    const { classification } = await classifyProblem({
      history: [{ role: 'user', content: 'Hola' }],
      chatCompletion: chatCompletionReturning(
        llmClassification({
          options: [
            'A',
            'A',
            'B',
            'B',
            'C',
            'D',
            'E',
            '   ',
            'X'.repeat(200),
          ],
        })
      ),
    });
    expect(classification.options).toEqual(['A', 'B', 'C', 'D']);
  });

  it('el fallback por keywords entrega opciones por defecto al hacer una pregunta', async () => {
    const { classification, usedAI } = await classifyProblem({
      history: [{ role: 'user', content: 'No me devuelven la garantía' }],
      chatCompletion: failingProvider,
    });
    expect(usedAI).toBe(false);
    expect(classification.readyToRecommend).toBe(false);
    expect(classification.options.length).toBeGreaterThanOrEqual(3);
    expect(classification.options[0]).toContain('Sí');
  });

  it('el fallback entrega options vacío cuando ya puede recomendar', async () => {
    const { classification } = await classifyProblem({
      history: [
        {
          role: 'user',
          content:
            'Soy arrendatario, entregué el departamento hace 2 meses y no me devuelven la garantía. Ya tengo el contrato y todos los antecedentes, quiero demandar.',
        },
      ],
      chatCompletion: failingProvider,
    });
    expect(classification.readyToRecommend).toBe(true);
    expect(classification.options).toEqual([]);
  });

  it('responde cómo funciona el matching cuando el usuario lo pregunta', async () => {
    const { classification, usedAI } = await classifyProblem({
      history: [
        {
          role: 'user',
          content:
            'Mi pareja y yo nos separamos y tenemos dos hijos en común. Quiero saber cómo quedará la pensión y el cuidado del niño.',
        },
        {
          role: 'assistant',
          content:
            'Entiendo. Por lo que me cuentas, tu caso está relacionado con derecho de familia. Un abogado de familia puede orientarte sobre las opciones que existen en tu situación.',
        },
        { role: 'user', content: 'cómo sabes el mejor que coincide?' },
      ],
      chatCompletion: failingProvider,
    });
    expect(usedAI).toBe(false);
    expect(classification.reply).toContain('especialidad');
    expect(classification.reply).not.toContain('Entiendo. Por lo que me cuentas');
    expect(classification.options).toEqual([]);
  });

  it('no repite la misma plantilla del fallback si ya se dijo antes', async () => {
    const template =
      'Entiendo. Por lo que me cuentas, tu caso está relacionado con derecho de familia. Un abogado de familia puede orientarte sobre las opciones que existen en tu situación.';
    const { classification } = await classifyProblem({
      history: [
        {
          role: 'user',
          content:
            'Mi pareja y yo nos separamos y tenemos dos hijos en común. Quiero saber cómo quedará la pensión y el cuidado del niño.',
        },
        { role: 'assistant', content: template },
        { role: 'user', content: 'sí' },
      ],
      chatCompletion: failingProvider,
    });
    expect(classification.readyToRecommend).toBe(true);
    expect(classification.reply).not.toBe(template);
    expect(classification.reply).not.toContain('Entiendo. Por lo que me cuentas');
  });

  it('usa el seguimiento de pregunta en vez de repetir cuando aún no puede recomendar', async () => {
    const template =
      'Entiendo. Por lo que me cuentas, tu caso está relacionado con derecho de familia. Un abogado de familia puede orientarte sobre las opciones que existen en tu situación.';
    const { classification } = await classifyProblem({
      history: [
        { role: 'user', content: 'tengo un problema de familia' },
        { role: 'assistant', content: template },
        { role: 'user', content: 'claro' },
      ],
      chatCompletion: failingProvider,
    });
    expect(classification.readyToRecommend).toBe(false);
    expect(classification.reply).not.toBe(template);
    expect(classification.reply).toContain('parte desde cero');
    expect(classification.question).toContain('parte desde cero');
  });
});

describe('Classify · preguntas de proceso (cómo reservar/pagar/funciona)', () => {
  it('detecta "cómo reservo" como how_to_book', () => {
    const intent = detectProcessIntent([{ role: 'user', content: 'cómo reservo?' }]);
    expect(intent).not.toBeNull();
    expect(intent.type).toBe('how_to_book');
    expect(intent.reply).toContain('Reservar consulta');
  });

  it('detecta "cuánto cuesta" como pricing', () => {
    const intent = detectProcessIntent([{ role: 'user', content: 'cuánto cuesta una consulta?' }]);
    expect(intent).not.toBeNull();
    expect(intent.type).toBe('pricing');
  });

  it('detecta "cómo funciona la plataforma"', () => {
    const intent = detectProcessIntent([{ role: 'user', content: 'cómo funciona la plataforma?' }]);
    expect(intent).not.toBeNull();
    expect(intent.type).toBe('how_platform');
  });

  it('usa la última pregunta del usuario aunque haya contexto previo', () => {
    const intent = detectProcessIntent([
      { role: 'user', content: 'Me despidieron sin justificación y no me pagaron el finiquito.' },
      { role: 'assistant', content: 'Entiendo, ¿ya firmaste el finiquito?' },
      { role: 'user', content: 'No. ¿cómo reservo una consulta?' },
    ]);
    expect(intent).not.toBeNull();
    expect(intent.type).toBe('how_to_book');
  });

  it('no interfiere con descripciones de problemas legales', () => {
    const intent = detectProcessIntent([
      { role: 'user', content: 'Me despidieron hace un mes y no me han pagado el finiquito ni mis sueldos. Quiero recuperar mi indemnización y no sé qué documentos necesito para demandar.' },
    ]);
    expect(intent).toBeNull();
  });
});

describe('Classify · consulta de servicios de un abogado por nombre', () => {
  it('detecta "servicios de <nombre>"', () => {
    const intent = detectLawyerServicesIntent([
      { role: 'user', content: '¿Qué servicios ofrece el abogado María Fernanda?' },
    ]);
    expect(intent).not.toBeNull();
    expect(intent.candidates[0]).toContain('María Fernanda');
  });

  it('detecta "servicios del abogado <nombre>" con apellido compuesto', () => {
    const intent = detectLawyerServicesIntent([
      { role: 'user', content: 'dime los servicios del abogado Astrid Echenique' },
    ]);
    expect(intent).not.toBeNull();
    expect(intent.candidates[0].toLowerCase()).toContain('astrid');
  });

  it('detecta la forma "abogado <nombre> ... servicios"', () => {
    const intent = detectLawyerServicesIntent([
      { role: 'user', content: 'el abogado Hans, ¿qué servicios tiene?' },
    ]);
    expect(intent).not.toBeNull();
    expect(intent.candidates.some((c) => c.toLowerCase().includes('hans'))).toBe(true);
  });

  it('no detecta problemas legales genéricos aunque mencionen "servicios"', () => {
    const intent = detectLawyerServicesIntent([
      { role: 'user', content: 'Tengo un problema con los servicios de una empresa de telefonía que me cobra de más.' },
    ]);
    expect(intent).toBeNull();
  });

  it('usa la última consulta del usuario aunque haya contexto previo', () => {
    const intent = detectLawyerServicesIntent([
      { role: 'user', content: 'Tengo un problema con mi arriendo.' },
      { role: 'assistant', content: 'Entiendo.' },
      { role: 'user', content: '¿cuáles son los servicios del abogado Diego?' },
    ]);
    expect(intent).not.toBeNull();
    expect(intent.candidates[0].toLowerCase()).toContain('diego');
  });
});
