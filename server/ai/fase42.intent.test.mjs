import { describe, it, expect } from 'vitest';
import { classifyLegalQuery } from './jurisprudenceSources.mjs';
import { buildJurisprudenceUserPrompt } from './jurisprudencePrompt.mjs';

const INTENTS = {
  BARE_NORM_CITATION: 'BARE_NORM_CITATION',
  ARTICLE_LOOKUP: 'ARTICLE_LOOKUP',
  NORMATIVE_APPLICATION: 'NORMATIVE_APPLICATION',
  JURISPRUDENCE_LOOKUP: 'JURISPRUDENCE_LOOKUP',
  RELATIONAL_LEGAL_QUERY: 'RELATIONAL_LEGAL_QUERY',
  MIXED_NORM_JURISPRUDENCE: 'MIXED_NORM_JURISPRUDENCE',
  GENERAL_LEGAL_QUERY: 'GENERAL_LEGAL_QUERY',
};

describe('classifyLegalQuery · Fase 4.2.1 · matriz de intención', () => {
  const matrix = [
    // BARE_NORM_CITATION
    ['BARE_NORM_CITATION', 'Ley 21.719'],
    ['BARE_NORM_CITATION', '¿Qué dice la Ley 21.719?'],
    ['BARE_NORM_CITATION', '¿Qué establece la Ley 21.719?'],
    ['BARE_NORM_CITATION', 'Código Civil'],
    ['BARE_NORM_CITATION', 'Artículo 4 de la Ley 21.719'],
    // ARTICLE_LOOKUP
    ['ARTICLE_LOOKUP', '¿Qué establece el artículo 4 de la Ley 21.719?'],
    ['ARTICLE_LOOKUP', '¿Qué derechos reconoce el artículo 4?'],
    ['ARTICLE_LOOKUP', '¿Qué dice el artículo quinto?'],
    ['ARTICLE_LOOKUP', '¿Qué dispone el artículo 30 bis?'],
    ['ARTICLE_LOOKUP', 'Explícame el artículo 19 de la Ley 19.496'],
    // NORMATIVE_APPLICATION
    ['NORMATIVE_APPLICATION', '¿Puedo divorciarme según la Ley 21.719?'],
    ['NORMATIVE_APPLICATION', '¿Puede una empresa tratar mis datos sin consentimiento?'],
    ['NORMATIVE_APPLICATION', '¿Puedo terminar el contrato por incumplimiento?'],
    ['NORMATIVE_APPLICATION', '¿La Ley 21.719 se aplica a una clínica que almacena datos de pacientes?'],
    ['NORMATIVE_APPLICATION', '¿La Ley 21.719 reconoce el derecho a divorciarse?'],
    // JURISPRUDENCE_LOOKUP
    ['JURISPRUDENCE_LOOKUP', '¿Qué ha señalado el Tribunal Constitucional sobre autodeterminación informativa?'],
    ['JURISPRUDENCE_LOOKUP', '¿Qué ha resuelto la Corte Suprema sobre despido injustificado?'],
    ['JURISPRUDENCE_LOOKUP', '¿Qué jurisprudencia existe sobre protección de datos?'],
    ['JURISPRUDENCE_LOOKUP', 'Rol 9666 del Tribunal Constitucional'],
    // RELATIONAL_LEGAL_QUERY
    ['RELATIONAL_LEGAL_QUERY', '¿Qué relación existe entre el artículo 4 de la Ley 21.719 y la autodeterminación informativa?'],
    ['RELATIONAL_LEGAL_QUERY', '¿Cómo se relacionan la privacidad y los datos personales?'],
    ['RELATIONAL_LEGAL_QUERY', '¿Qué vínculo existe entre la Ley 21.719 y el criterio del TC?'],
    // MIXED_NORM_JURISPRUDENCE
    ['MIXED_NORM_JURISPRUDENCE', '¿Qué establece la Ley 21.719 y qué ha dicho el Tribunal Constitucional?'],
    ['MIXED_NORM_JURISPRUDENCE', '¿Qué dice el artículo 4 y qué jurisprudencia existe sobre esos derechos?'],
    // GENERAL_LEGAL_QUERY
    ['GENERAL_LEGAL_QUERY', 'Mi arrendador no me devuelve la garantía, ¿qué puedo hacer?'],
    ['GENERAL_LEGAL_QUERY', 'Mi empleador no me paga las horas extra.'],
    ['GENERAL_LEGAL_QUERY', '¿Qué puedo hacer si me demandaron?'],
    ['GENERAL_LEGAL_QUERY', '¿Qué opciones legales tengo?'],
  ];

  it.each(matrix)('clasifica como %s: %s', (expected, query) => {
    expect(classifyLegalQuery(query).intent).toBe(expected);
  });

  it('regresión §20 Caso 1: divorcio según ley → NORMATIVE_APPLICATION', () => {
    expect(classifyLegalQuery('¿Puedo divorciarme según la Ley 21.719?').intent).toBe(
      INTENTS.NORMATIVE_APPLICATION,
    );
  });

  it('regresión §20 Caso 8: Tribunal Constitucional → JURISPRUDENCE_LOOKUP', () => {
    expect(
      classifyLegalQuery('¿Qué ha señalado el Tribunal Constitucional sobre autodeterminación informativa?')
        .intent,
    ).toBe(INTENTS.JURISPRUDENCE_LOOKUP);
  });

  it('trata acentos precompuestos y descompuestos de forma equivalente', () => {
    const pre = '¿Qué establece el artículo 4 de la Ley 21.719?';
    const decomp = pre.normalize('NFD');
    expect(classifyLegalQuery(pre).intent).toBe(classifyLegalQuery(decomp).intent);
    expect(classifyLegalQuery(pre).intent).toBe(INTENTS.ARTICLE_LOOKUP);
  });

  it('entrada vacía devuelve GENERAL_LEGAL_QUERY sin lanzar', () => {
    const r = classifyLegalQuery('   ');
    expect(r.intent).toBe(INTENTS.GENERAL_LEGAL_QUERY);
    expect(r.normCitations).toEqual([]);
    expect(r.poles).toEqual({ normative: [], jurisprudence: [] });
  });
});

describe('classifyLegalQuery · extracción de señales', () => {
  it('extrae normCitations, articleCitations y pole normativa', () => {
    const r = classifyLegalQuery('¿Qué establece el artículo 4 de la Ley 21.719?');
    expect(r.normCitations).toContain('21719');
    expect(r.articleCitations).toContain('4');
    expect(r.poles.normative).toContain('21719');
    expect(r.poles.normative).toContain('art. 4');
  });

  it('extrae señales de jurisprudencia y pole jurisprudencial', () => {
    const r = classifyLegalQuery(
      '¿Qué ha señalado el Tribunal Constitucional sobre autodeterminación informativa?',
    );
    expect(r.jurisprudenceSignals.length).toBeGreaterThan(0);
    expect(r.poles.jurisprudence).toContain('Tribunal Constitucional');
  });

  it('extrae señales relacionales en consultas relacionales', () => {
    const r = classifyLegalQuery('¿Qué vínculo existe entre la Ley 21.719 y el criterio del TC?');
    expect(r.relationalSignals.length).toBeGreaterThan(0);
    expect(r.intent).toBe(INTENTS.RELATIONAL_LEGAL_QUERY);
  });

  it('extrae términos sustantivos como array', () => {
    const r = classifyLegalQuery('¿Puedo terminar el contrato por incumplimiento?');
    expect(Array.isArray(r.substantiveTerms)).toBe(true);
  });
});

describe('buildJurisprudenceUserPrompt · guía de intención (Fase 4.2.1)', () => {
  it('renderiza la guía de ensamblaje cuando se entrega intentClass', () => {
    const prompt = buildJurisprudenceUserPrompt({
      question: '¿Qué establece el artículo 4 de la Ley 21.719?',
      context: 'CONTEXTO DE FUENTES',
      caseContext: 'Nombre: caso X',
      intent: 'ARTICLE_LOOKUP',
    });
    expect(prompt).toContain('INTENCIÓN DE LA CONSULTA');
    expect(prompt).toContain('Explica el artículo citado');
  });

  it('no altera el output cuando no se entrega intent (retrocompatible)', () => {
    const prompt = buildJurisprudenceUserPrompt({
      question: 'Q',
      context: 'C',
      caseContext: 'X',
    });
    expect(prompt).toContain('PREGUNTA DEL ABOGADO');
    expect(prompt).not.toContain('INTENCIÓN DE LA CONSULTA');
  });
});
