import { describe, it, expect } from 'vitest';
import {
  classifyLegalQuery,
  getRetrievalStrategy,
  detectRelationalPoles,
  expandLegalQueryTerms,
} from './jurisprudenceSources.mjs';
import { buildJurisprudenceOutcome } from './jurisprudencePipeline.mjs';

// ---------------------------------------------------------------------------
// Fase 4.2.2 (§33) — la intención fina controla el retrieval: fuentes, consultas,
// polos, article-first, prioridad TC y expansión. La consulta cita por NÚMERO
// identifica una ENTIDAD: nunca se sustituye por otra norma distinta, y un
// artículo inexistente en la norma recuperada no se ancla a otra disposición.
// ---------------------------------------------------------------------------

describe('Fase 4.2.2 · getRetrievalStrategy · article-first', () => {
  it('ARTICLE_LOOKUP con "artículo 4" consulta la norma del artículo citado (article-first)', () => {
    const q = '¿Qué establece el artículo 4 de la Ley 21.719?';
    const cls = classifyLegalQuery(q);
    const s = getRetrievalStrategy(q, cls, { limit: 8 });

    expect(s.primary).toBe('normativa');
    expect(s.articleFirst).toBe(true);
    expect(s.modes).toEqual(['normative']);
    const bcn = s.tasks.find((t) => t.provider === 'bcn');
    expect(bcn).toBeTruthy();
    expect(bcn.query).toContain('artículo 4');
    expect(bcn.limit).toBeGreaterThanOrEqual(6);
  });

  it('ARTICLE_LOOKUP con "artículo 99" consulta el artículo 99 (no lo suplanta por el 4)', () => {
    const q = '¿Qué establece el artículo 99 de la Ley 21.719?';
    const cls = classifyLegalQuery(q);
    const s = getRetrievalStrategy(q, cls, { limit: 8 });

    expect(s.primary).toBe('normativa');
    expect(s.articleFirst).toBe(true);
    const bcn = s.tasks.find((t) => t.provider === 'bcn');
    expect(bcn.query).toContain('artículo 99');
  });

  it('cita desnuda de ley sin artículo: article-first apagado', () => {
    const q = '¿Qué dice la Ley 21.719?';
    const cls = classifyLegalQuery(q);
    const s = getRetrievalStrategy(q, cls, { limit: 8 });

    expect(s.primary).toBe('normativa');
    expect(s.articleFirst).toBe(false);
  });
});

describe('Fase 4.2.2 · getRetrievalStrategy · jurisprudencia', () => {
  it('JURISPRUDENCE_LOOKUP prioriza TC y amplía léxicamente el concepto', () => {
    const q = '¿Qué ha señalado el Tribunal Constitucional sobre autodeterminación informativa?';
    const cls = classifyLegalQuery(q);
    const s = getRetrievalStrategy(q, cls, { limit: 8 });

    expect(cls.intent).toBe('JURISPRUDENCE_LOOKUP');
    expect(s.primary).toBe('jurisprudencia');
    expect(s.tcPriority).toBe(true);
    expect(s.expansion).toBe(true);
    expect(s.tasks.some((t) => t.expansion && t.query.includes('datos personales'))).toBe(true);
  });
});

describe('Fase 4.2.2 · getRetrievalStrategy · polos relacionales', () => {
  it('RELATIONAL_LEGAL_QUERY separa el polo normativo (artículo citado) del polo conceptual', () => {
    const q =
      '¿Qué relación existe entre el artículo 4 de la Ley 21.719 y la autodeterminación informativa?';
    const cls = classifyLegalQuery(q);
    const s = getRetrievalStrategy(q, cls, { limit: 8 });

    expect(cls.intent).toBe('RELATIONAL_LEGAL_QUERY');
    expect(s.poleCount).toBe(2);
    expect(s.modes).toContain('normative');
    expect(s.modes).toContain('general');

    const bcn = s.tasks.find((t) => t.pole === 'normative');
    expect(bcn.provider).toBe('bcn');
    expect(bcn.query).toBe('el artículo 4 de la Ley 21.719');

    const tcConcept = s.tasks.find((t) => t.pole === 'general' && !t.expansion);
    expect(tcConcept.query).toBe('la autodeterminación informativa');

    // El polo conceptual general amplía la búsqueda sin inventar evidencia.
    expect(s.expansion).toBe(true);
    expect(s.tasks.some((t) => t.expansion && t.query.includes('datos personales'))).toBe(true);

    // Búsqueda conjunta como complemento, nunca como única recuperación.
    expect(s.tasks.filter((t) => t.joint).length).toBeGreaterThanOrEqual(2);
  });

  it('RELATIONAL_LEGAL_QUERY con Rol de TC: polos normativo y jurisprudencial', () => {
    const q =
      '¿Qué relación existe entre el artículo 4 de la Ley 21.719 y el Rol 9666 del Tribunal Constitucional?';
    const cls = classifyLegalQuery(q);
    const s = getRetrievalStrategy(q, cls, { limit: 8 });

    expect(cls.intent).toBe('RELATIONAL_LEGAL_QUERY');
    expect(s.poleCount).toBe(2);
    expect(s.modes).toContain('normative');
    expect(s.modes).toContain('jurisprudence');
    const tcPole = s.tasks.find((t) => t.pole === 'jurisprudence');
    expect(tcPole.provider).toBe('tc');
    expect(tcPole.query).toContain('Rol 9666');
  });

  it('MIXED_NORM_JURISPRUDENCE: ley + Tribunal Constitucional en la misma consulta', () => {
    const q =
      '¿Qué dice la Ley 21.719 y qué ha señalado el Tribunal Constitucional sobre autodeterminación informativa?';
    const cls = classifyLegalQuery(q);
    const s = getRetrievalStrategy(q, cls, { limit: 8 });

    expect(cls.intent).toBe('MIXED_NORM_JURISPRUDENCE');
    expect(s.poleCount).toBe(2);
    expect(s.modes).toContain('normative');
    expect(s.modes).toContain('jurisprudence');
  });

  it('consulta de una sola materia: no inventa polos relacionales', () => {
    const q = '¿Qué derechos reconoce la Ley 21.719 a los titulares de datos personales?';
    const cls = classifyLegalQuery(q);
    const poles = detectRelationalPoles(q, cls);

    expect(poles.length).toBeLessThan(2);
  });
});

describe('Fase 4.2.2 · expandLegalQueryTerms', () => {
  it('expande "autodeterminación informativa" con su término de contenido', () => {
    expect(expandLegalQueryTerms('autodeterminación informativa')).toContain('datos personales');
  });
});

// ---------------------------------------------------------------------------
// §33 — la cita por número identifica la entidad normativa. El pipeline NO
// promueve una ley distinta cuando el número citado no corresponde a ninguna
// norma recuperada, ni siquiera por contenido compartido.
// ---------------------------------------------------------------------------

describe('Fase 4.2.2 · §33 · guard de mismatch de número de ley (autoNormativa)', () => {
  const ley21719 = () => ({
    id: 'bcn-1209272',
    kind: 'normativa',
    source_type: 'normativa',
    legal_authority: 'vinculante',
    vigency: 'desconocida',
    norm_type: 'ley',
    norm_number: '21.719',
    citation: 'Ley 21.719',
    title: 'Ley N° 21.719',
    excerpt:
      'Derechos del titular de datos personales: acceso, rectificación, supresión, oposición, portabilidad y bloqueo.',
    metadata: {
      leychileCode: '1209272',
      fragments: [
        {
          id: 'art-4',
          article: 'Artículo 4',
          text: 'El titular de datos personales tiene derecho a acceso, rectificación, supresión, oposición, portabilidad y bloqueo de sus datos personales.',
        },
      ],
    },
  });

  const ley21713 = () => ({
    id: 'bcn-21713',
    kind: 'normativa',
    source_type: 'normativa',
    legal_authority: 'vinculante',
    vigency: 'desconocida',
    norm_type: 'ley',
    norm_number: '21.713',
    citation: 'Ley 21.713',
    title: 'Ley N° 21.713',
    excerpt:
      'Regula la protección de los datos personales y el tratamiento de información personal.',
    metadata: {
      leychileCode: '90001',
      fragments: [
        {
          id: 'art-1',
          article: 'Artículo 1',
          text: 'La presente ley regula el tratamiento de datos personales y la protección de la información personal.',
        },
      ],
    },
  });

  const emptyData = {
    resumen: 'Sin normativa citada.',
    normativa: [],
    jurisprudencia: [],
    doctrina: [],
    advertencias: [],
  };

  it('control: número citado coincide con la norma recuperada → se promueve (SUCCESS)', () => {
    const result = buildJurisprudenceOutcome({
      data: emptyData,
      sources: [ley21719()],
      intent: 'normativa',
      query: '¿Qué establece la Ley 21.719 sobre la protección de datos personales?',
    });

    expect(result.outcome).toBe('SUCCESS');
    expect(result.allVerifiedClaims[0].source_id).toBe('bcn-1209272');
    expect(result.allVerifiedClaims[0].afirmacion).toContain('21.719');
  });

  it('número citado NO existe en ninguna fuente ("Ley 99.999"): no se promueve una ley distinta por contenido', () => {
    const result = buildJurisprudenceOutcome({
      data: emptyData,
      sources: [ley21719()],
      intent: 'normativa',
      query: '¿Qué derechos reconoce la Ley 99.999 sobre la protección de datos personales?',
    });

    expect(result.outcome).toBe('NO_EVIDENCE');
    expect(result.allVerifiedClaims).toHaveLength(0);
    expect(result.answer).not.toContain('21.719');
    expect(result.answer).not.toContain('regula la materia consultada');
  });

  it('consulta cita la Ley 21.719 pero solo se recuperó la 21.713: NO se sustituye la entidad', () => {
    const result = buildJurisprudenceOutcome({
      data: emptyData,
      sources: [ley21713()],
      intent: 'normativa',
      query: '¿Qué establece la Ley 21.719 sobre la protección de datos personales?',
    });

    expect(result.outcome).toBe('NO_EVIDENCE');
    expect(result.allVerifiedClaims).toHaveLength(0);
    expect(result.answer).not.toContain('21.713');
    expect(result.answer).not.toContain('regula la materia consultada');
  });

  it('artículo citado no existe en la norma recuperada ("artículo 99" vs Artículo 4): NO se ancla a otra disposición', () => {
    const result = buildJurisprudenceOutcome({
      data: emptyData,
      sources: [ley21719()],
      intent: 'normativa',
      query: '¿Qué establece el artículo 99 de la Ley 21.719 sobre autodeterminación informativa?',
    });

    expect(result.outcome).toBe('NO_EVIDENCE');
    expect(result.allVerifiedClaims).toHaveLength(0);
    expect(result.answer).not.toContain('Artículo 4');
    expect(result.answer).not.toContain('regula la materia consultada');
  });
});
