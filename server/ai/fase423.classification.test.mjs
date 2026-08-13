import { describe, it, expect } from 'vitest';
import { classifyLegalQuery, getRetrievalStrategy } from './jurisprudenceSources.mjs';

// ---------------------------------------------------------------------------
// Fase 4.2.3 — priorización del intent jurisprudencial/doctrinal.
// Una consulta sobre tribunal, sentencia, fallo, causa, jurisprudencia, doctrina
// o precedente debe priorizar intención jurisprudencial/doctrinal sobre una
// clasificación normativa genérica, salvo que exista una citación normativa
// concreta que justifique otra intención.
// ---------------------------------------------------------------------------

const INTENTS = {
  ARTICLE_LOOKUP: 'ARTICLE_LOOKUP',
  NORMATIVE_APPLICATION: 'NORMATIVE_APPLICATION',
  JURISPRUDENCE_LOOKUP: 'JURISPRUDENCE_LOOKUP',
  DOCTRINE_LOOKUP: 'DOCTRINE_LOOKUP',
  RELATIONAL_LEGAL_QUERY: 'RELATIONAL_LEGAL_QUERY',
  MIXED_NORM_JURISPRUDENCE: 'MIXED_NORM_JURISPRUDENCE',
  GENERAL_LEGAL_QUERY: 'GENERAL_LEGAL_QUERY',
};

describe('Fase 4.2.3 · prioridad jurisprudencial/doctrinal · matriz', () => {
  const matrix = [
    // Caso 1 — jurisprudencia TC
    ['JURISPRUDENCE_LOOKUP', '¿Qué ha dicho el Tribunal Constitucional sobre la autodeterminación informativa?'],
    // Caso 2 — TC abreviado
    ['JURISPRUDENCE_LOOKUP', '¿Qué ha dicho el TC sobre autodeterminación informativa?'],
    // Caso 3 — jurisprudencia por sentencia
    ['JURISPRUDENCE_LOOKUP', 'Busca jurisprudencia sobre autodeterminación informativa.'],
    // Caso 4 — rol
    ['JURISPRUDENCE_LOOKUP', '¿Qué ha resuelto el TC en los roles relacionados con autodeterminación informativa?'],
    // Caso 5 — norma concreta → ARTICLE_LOOKUP
    ['ARTICLE_LOOKUP', '¿Qué dice el artículo 4 de la Ley 21.719?'],
    // Caso 6 — aplicación normativa
    ['NORMATIVE_APPLICATION', '¿Se aplica la Ley 21.719 a este caso?'],
    // Caso 7 — relación norma + TC
    ['RELATIONAL_LEGAL_QUERY', '¿Cómo se relaciona el artículo 4 de la Ley 21.719 con la jurisprudencia del TC sobre autodeterminación informativa?'],
    // Caso 8 — jurisprudencia + palabra ley genérica (sin citación concreta)
    ['JURISPRUDENCE_LOOKUP', '¿Qué ha dicho el TC sobre los derechos que protege la ley respecto de los datos personales?'],
    // Caso 9 — doctrina
    ['DOCTRINE_LOOKUP', '¿Qué sostiene la doctrina sobre la autodeterminación informativa?'],
    // Caso 10 — norma concreta + aplicación → ARTICLE_LOOKUP (no jurisprudencia)
    ['ARTICLE_LOOKUP', '¿Qué establece el artículo 4 de la Ley 21.719 y cómo se aplica?'],
  ];

  it.each(matrix)('clasifica como %s: %s', (expected, query) => {
    expect(classifyLegalQuery(query).intent).toBe(expected);
  });
});

describe('Fase 4.2.3 · regresión directa del bug (harness I1, I2, I3, E2)', () => {
  const cases = {
    // I1 del harness real: era NORMATIVE_APPLICATION (por "podrían"); ahora jurisprudencia.
    I1: '¿Qué criterios ha desarrollado el Tribunal Constitucional sobre autodeterminación informativa que podrían ser relevantes para analizar una sentencia que permite tratar datos personales sin consentimiento?',
    // I2: "criterios jurisprudenciales" + "podrían".
    I2: '¿Qué criterios jurisprudenciales podrían ser relevantes para cuestionar una decisión que permite tratar datos personales sin autorización del titular?',
    // I3: "jurisprudencia del TC" + "podría ser útil".
    I3: '¿Qué jurisprudencia del Tribunal Constitucional podría ser útil para analizar una controversia sobre protección de datos personales y vida privada?',
    // E2: "respecto de" no debe secuestrar la intención jurisprudencial.
    E2: '¿Qué ha señalado el Tribunal Constitucional sobre el control de las personas respecto de sus datos personales?',
  };

  it.each(Object.entries(cases))('%s → JURISPRUDENCE_LOOKUP', (id, query) => {
    expect(classifyLegalQuery(query).intent).toBe(INTENTS.JURISPRUDENCE_LOOKUP);
  });
});

describe('Fase 4.2.3 · señales fuertes', () => {
  it('"TC" abreviatura del Tribunal Constitucional genera señal jurisprudencial', () => {
    const r = classifyLegalQuery('¿Qué ha dicho el TC sobre autodeterminación informativa?');
    expect(r.jurisprudenceSignals.length).toBeGreaterThan(0);
  });

  it('"jurisprudenciales" es señal jurisprudencial (I2)', () => {
    const r = classifyLegalQuery(
      '¿Qué criterios jurisprudenciales podrían ser relevantes para cuestionar una decisión sobre datos personales?',
    );
    expect(r.jurisprudenceSignals.length).toBeGreaterThan(0);
    expect(r.intent).toBe(INTENTS.JURISPRUDENCE_LOOKUP);
  });

  it('"roles" es señal jurisprudencial (T4)', () => {
    const r = classifyLegalQuery('¿Qué ha resuelto el TC en los roles relacionados con autodeterminación informativa?');
    expect(r.jurisprudenceSignals.length).toBeGreaterThan(0);
  });

  it('"respecto de" ya no genera señal relacional (E2)', () => {
    const r = classifyLegalQuery(
      '¿Qué ha señalado el Tribunal Constitucional sobre el control de las personas respecto de sus datos personales?',
    );
    expect(r.relationalSignals).toHaveLength(0);
  });
});

describe('Fase 4.2.3 · estrategia de retrieval coherente con el intent', () => {
  it('JURISPRUDENCE_LOOKUP → primary jurisprudencia, prioridad TC, expansión disponible', () => {
    const q = '¿Qué ha dicho el TC sobre la autodeterminación informativa?';
    const s = getRetrievalStrategy(q, classifyLegalQuery(q), { limit: 8 });
    expect(s.primary).toBe('jurisprudencia');
    expect(s.tcPriority).toBe(true);
    expect(s.tasks.some((t) => t.provider === 'tc')).toBe(true);
  });

  it('DOCTRINE_LOOKUP → primary doctrina, consulta a OpenAlex primero', () => {
    const q = '¿Qué sostiene la doctrina sobre la autodeterminación informativa?';
    const s = getRetrievalStrategy(q, classifyLegalQuery(q), { limit: 8 });
    expect(s.primary).toBe('doctrina');
    expect(s.modes).toContain('doctrine');
    expect(s.tasks[0].provider).toBe('doctrina');
  });

  it('consulta mixta sigue siendo relacional/mixta, no se degrada a jurisprudencia', () => {
    const rel = '¿Cómo se relaciona el artículo 4 de la Ley 21.719 con la jurisprudencia del TC sobre autodeterminación informativa?';
    const mixed = '¿Qué establece la Ley 21.719 y qué ha señalado el Tribunal Constitucional sobre autodeterminación informativa?';
    expect(classifyLegalQuery(rel).intent).toBe(INTENTS.RELATIONAL_LEGAL_QUERY);
    expect(classifyLegalQuery(mixed).intent).toBe(INTENTS.MIXED_NORM_JURISPRUDENCE);
  });
});
