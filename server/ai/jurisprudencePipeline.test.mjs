import { describe, it, expect } from 'vitest';
import { buildJurisprudenceOutcome, AIResearchResponseSchema } from './jurisprudencePipeline.mjs';

// Fase 4.1.11 — Estados canónicos del pipeline de investigación jurídica.
// La lógica post-LLM (schema → verifier → síntesis → jerarquía →
// contradicciones → SUCCESS/NO_EVIDENCE/INVALID_RESPONSE) es 100% pura y se
// testea sin servidor, sin supabase y sin llamadas de red.

const normativaSource = (id = 'bcn-21719', extra = {}) => ({
  id,
  kind: 'normativa',
  source_type: 'normativa',
  legal_authority: 'vinculante',
  vigency: 'desconocida',
  citation: 'Ley 21.719',
  title: 'Ley 21.719',
  norm_type: 'ley',
  norm_number: '21.719',
  excerpt:
    'Derechos de los titulares: toda persona tiene derecho a acceso, rectificación, supresión, oposición, portabilidad y bloqueo de sus datos personales.',
  ...extra,
});

const tcSource = (id = 'tc-5174') => ({
  id,
  kind: 'jurisprudencia',
  source_type: 'jurisprudencia',
  legal_authority: 'persuasiva',
  vigency: 'no_aplica',
  citation: 'Tribunal Constitucional — Rol 5174',
  excerpt:
    'Establece que el derecho a la protección de datos se reconoce como derecho fundamental.',
});

const doctrinaSource = (id = 'doc-1') => ({
  id,
  kind: 'doctrina',
  source_type: 'doctrina',
  legal_authority: 'doctrinal',
  vigency: 'no_aplica',
  citation: 'Autor. (2020). Artículo sobre datos personales.',
  excerpt: 'La doctrina sostiene que el consentimiento debe ser informado.',
});

describe('buildJurisprudenceOutcome · INVALID_RESPONSE', () => {
  it('data null → status invalid_response (el modelo no devolvió JSON)', () => {
    const result = buildJurisprudenceOutcome({ data: null, sources: [normativaSource()], intent: 'general', query: 'x' });
    expect(result.status).toBe('invalid_response');
  });

  it('data no parseable (string) → invalid_response', () => {
    const result = buildJurisprudenceOutcome({ data: 'no es un objeto', sources: [], intent: 'general', query: 'x' });
    expect(result.status).toBe('invalid_response');
  });

  it('data con schema inválido (fuente_id vacío / string en normativa) → invalid_response', () => {
    const result = buildJurisprudenceOutcome({
      data: {
        resumen: 'x',
        normativa: [{ fuente_id: '', afirmacion: 'y' }],
        jurisprudencia: [{ fuente_id: 123, afirmacion: 456 }],
      },
      sources: [normativaSource()],
      intent: 'normativa',
      query: '¿qué dice la ley?',
    });
    expect(result.status).toBe('invalid_response');
  });

  it('AIResearchResponseSchema rechaza claves extra (strict)', () => {
    const parsed = AIResearchResponseSchema.safeParse({
      resumen: 'x',
      claves_inventadas: true,
    });
    expect(parsed.success).toBe(false);
  });
});

describe('buildJurisprudenceOutcome · SUCCESS', () => {
  it('conserva los claims verificados y devuelve outcome SUCCESS', () => {
    const sources = [tcSource(), normativaSource()];
    const result = buildJurisprudenceOutcome({
      data: {
        resumen: 'El TC reconoce la protección de datos como derecho fundamental.',
        normativa: [
          {
            fuente_id: 'bcn-21719',
            afirmacion: 'La ley reconoce el derecho de acceso, rectificación y supresión a los titulares.',
            fragmento: 'toda persona tiene derecho a acceso, rectificación',
          },
        ],
        jurisprudencia: [
          {
            fuente_id: 'tc-5174',
            afirmacion: 'El tribunal sostuvo en este caso que la protección de datos es un derecho fundamental.',
            fragmento: 'se reconoce como derecho fundamental',
          },
        ],
        doctrina: [],
        conclusion: 'Las fuentes coinciden en reconocer el derecho.',
      },
      sources,
      intent: 'general',
      query: '¿qué dice la jurisprudencia sobre la protección de datos?',
    });

    expect(result.status).toBe('ok');
    expect(result.outcome).toBe('SUCCESS');
    expect(result.allVerifiedClaims.length).toBe(2);
    expect(result.persistedSources.map((s) => s.id).sort()).toEqual(['bcn-21719', 'tc-5174']);
    expect(result.answer).toContain('Respuesta breve');
    expect(result.answer).toContain('Normativa relevante');
    expect(result.answer).toContain('Jurisprudencia relevante');
    expect(result.resumenFinal).toContain('derecho fundamental');
  });

  it('persiste claims estructurados (JSONB) solo de fuentes verificadas', () => {
    const sources = [normativaSource()];
    const result = buildJurisprudenceOutcome({
      data: {
        resumen: 'La ley 21.719 regula los derechos de los titulares.',
        normativa: [
          {
            fuente_id: 'bcn-21719',
            afirmacion: 'La ley reconoce el derecho de supresión y portabilidad.',
            fragmento: 'supresión, oposición, portabilidad',
          },
        ],
      },
      sources,
      intent: 'general',
      query: '¿qué derechos reconoce la ley?',
    });

    const bcn = result.persistedSources.find((s) => s.id === 'bcn-21719');
    expect(bcn.claims).toHaveLength(1);
    expect(bcn.claims[0]).toMatchObject({
      source_id: 'bcn-21719',
      category: 'normativa',
      verified: true,
      afirmacion: expect.stringContaining('supresión y portabilidad'),
      evidencia: expect.stringContaining('portabilidad'),
    });
  });
});

describe('buildJurisprudenceOutcome · NO_EVIDENCE', () => {
  it('ningún claim verificado → outcome NO_EVIDENCE, resumen de ausencia y sin secciones inventadas', () => {
    const sources = [normativaSource()];
    const result = buildJurisprudenceOutcome({
      data: {
        resumen: 'El modelo inventa una afirmación que las fuentes no respaldan.',
        normativa: [
          {
            fuente_id: 'bcn-21719',
            afirmacion: 'La ley establece una indemnización por daños.',
            fragmento: 'indemnización por daños no aparece en el extracto',
          },
        ],
        conclusion: 'Conclusión no respaldada del modelo.',
      },
      sources,
      intent: 'general',
      query: '¿qué indemnización establece la ley?',
    });

    expect(result.status).toBe('ok');
    expect(result.outcome).toBe('NO_EVIDENCE');
    // El resumen no verificado del modelo NUNCA se exhibe como afirmación jurídica.
    expect(result.resumenFinal).toContain('No se encontró evidencia suficiente');
    expect(result.resumenFinal).not.toContain('indemnización');
    // Sin claims verificados: nada que persistir ni mostrar como sección.
    expect(result.allVerifiedClaims.length).toBe(0);
    expect(result.persistedSources).toEqual([]);
    expect(result.answer).not.toContain('Normativa relevante');
    // NO_EVIDENCE no es un error técnico: mantiene advertencias útiles.
    expect(result.researchWarnings.length).toBeGreaterThan(0);
  });

  it('NO_EVIDENCE no lanza y su resumen no repite afirmaciones no respaldadas', () => {
    const sources = [tcSource()];
    const result = buildJurisprudenceOutcome({
      data: {
        resumen: 'La Corte ordenó pagar una multa de millones.',
        jurisprudencia: [
          {
            fuente_id: 'tc-5174',
            afirmacion: 'La Corte ordenó una multa.',
            fragmento: 'multa de millones no respaldada',
          },
        ],
      },
      sources,
      intent: 'jurisprudencia',
      query: '¿hubo multas?',
    });
    expect(result.status).toBe('ok');
    expect(result.outcome).toBe('NO_EVIDENCE');
    expect(result.resumenFinal).toContain('No se encontró evidencia suficiente');
  });
});

describe('buildJurisprudenceOutcome · autoNormativa (intent normativa sin cita del modelo)', () => {
  it('promueve la ley más relevante con afirmación derivada del título oficial', () => {
    const sources = [normativaSource()];
    const result = buildJurisprudenceOutcome({
      data: {
        resumen: 'No se encontró normativa específica.',
        normativa: [],
        jurisprudencia: [],
        doctrina: [],
        advertencias: ['No se encontró normativa que regule la materia.'],
      },
      sources,
      intent: 'normativa',
      query: '¿qué ley regula la protección de datos personales?',
    });

    expect(result.outcome).toBe('SUCCESS');
    const claim = result.allVerifiedClaims[0];
    expect(claim.source_id).toBe('bcn-21719');
    expect(claim.afirmacion).toContain('Ley');
    expect(claim.afirmacion).toContain('21.719');
    expect(claim.afirmacion).toContain('regula la materia consultada');
    // La afirmación deriva del título oficial, sin inventar texto legal.
    expect(claim.afirmacion).not.toContain('indemnización');
    // El aviso del modelo sobre "no se encontró normativa" se descarta (contradice la norma promovida).
    expect(result.answer).not.toContain('No se encontró normativa que regule');
    // El resumen apunta a la normativa identificada.
    expect(result.resumenFinal).toContain('Se identificó la normativa aplicable');
  });
});

describe('buildJurisprudenceOutcome · gate de evidencia sustantiva (Fase 4.1.16)', () => {
  const metadataOnly = (id = 'bcn-19628') =>
    normativaSource(id, {
      citation: 'Ley 19.628',
      title: 'Ley 19.628',
      norm_number: '19.628',
      excerpt:
        'Ley 19.628, publicada el 10-ene-2024, norma vigente sobre la protección de la vida privada.',
    });

  it('NO promueve una norma identificada solo por título/número sin evidencia sustantiva', () => {
    const result = buildJurisprudenceOutcome({
      data: {
        resumen: 'No se encontró normativa específica.',
        normativa: [],
        jurisprudencia: [],
        doctrina: [],
        advertencias: ['No se encontró normativa que regule la materia.'],
      },
      sources: [metadataOnly()],
      intent: 'normativa',
      query: '¿qué dice la Ley 19.628 sobre protección de la vida privada?',
    });

    expect(result.outcome).toBe('NO_EVIDENCE');
    expect(result.allVerifiedClaims.length).toBe(0);
    expect(result.answer).not.toContain('Ley 19.628');
    expect(result.answer).not.toContain('Normativa relevante');
  });

  it('descarta el claim del modelo que cite una norma sin evidencia sustantiva', () => {
    const result = buildJurisprudenceOutcome({
      data: {
        resumen: 'La Ley 19.628 regula la protección de la vida privada.',
        normativa: [
          {
            fuente_id: 'bcn-19628',
            afirmacion: 'La Ley 19.628 regula la protección de datos de la vida privada.',
            fragmento: 'protección de la vida privada',
          },
        ],
        jurisprudencia: [],
        doctrina: [],
      },
      sources: [metadataOnly()],
      intent: 'general',
      query: '¿qué dice la Ley 19.628 sobre protección de la vida privada?',
    });

    expect(result.outcome).toBe('NO_EVIDENCE');
    expect(result.allVerifiedClaims.length).toBe(0);
  });
});

describe('buildJurisprudenceOutcome · combinado (Ley 21.719 + TC + doctrina)', () => {
  it('verifica normativa, jurisprudencia y doctrina en una consulta mixta', () => {
    const sources = [normativaSource(), tcSource(), doctrinaSource()];
    const result = buildJurisprudenceOutcome({
      data: {
        resumen: 'Normativa, jurisprudencia y doctrina convergen en los derechos de los titulares.',
        normativa: [
          {
            fuente_id: 'bcn-21719',
            afirmacion: 'La ley reconoce el derecho de acceso, rectificación, supresión, oposición, portabilidad y bloqueo.',
            fragmento: 'derecho a acceso, rectificación, supresión, oposición, portabilidad y bloqueo',
          },
        ],
        jurisprudencia: [
          {
            fuente_id: 'tc-5174',
            afirmacion: 'El tribunal sostuvo en este caso que la protección de datos es un derecho fundamental.',
            fragmento: 'se reconoce como derecho fundamental',
          },
        ],
        doctrina: [
          {
            fuente_id: 'doc-1',
            afirmacion: 'La doctrina sostiene que el consentimiento debe ser informado.',
            fragmento: 'sostiene que el consentimiento debe ser informado',
          },
        ],
      },
      sources,
      intent: 'general',
      query: 'protección de datos personales',
    });

    expect(result.status).toBe('ok');
    expect(result.outcome).toBe('SUCCESS');
    expect(result.allVerifiedClaims.length).toBe(3);
    expect(result.persistedSources.map((s) => s.id).sort()).toEqual(['bcn-21719', 'doc-1', 'tc-5174']);
    expect(result.answer).toContain('Normativa relevante');
    expect(result.answer).toContain('Jurisprudencia relevante');
    expect(result.answer).toContain('Doctrina (no vinculante)');
  });
});

// ---------------------------------------------------------------------------
// Fase 4.1.12 — Gate de relevancia en la promoción automática (autoNormativas)
// ---------------------------------------------------------------------------

const irrelevantBcn21569 = () => ({
  id: 'bcn-21569',
  kind: 'normativa',
  source_type: 'normativa',
  legal_authority: 'vinculante',
  vigency: 'desconocida',
  norm_type: 'ley',
  norm_number: '21.569',
  citation: 'Ley 21.569',
  title:
    'PERMITE EL USO DE CÉDULAS DE IDENTIDAD Y PASAPORTES PARA EFECTOS DE IDENTIFICAR A LOS ELECTORES EN LAS ELECCIONES Y PLEBISCITOS QUE INDICA',
  excerpt: 'Cédulas de identidad y pasaportes para identificar a los electores en las elecciones.',
});

describe('buildJurisprudenceOutcome · autoNormativa gate de relevancia (Fase 4.1.12)', () => {
  it('NO promueve una ley irrelevante (teletransportación → Ley 21.569) y deriva en NO_EVIDENCE', () => {
    const query =
      '¿Qué efectos jurídicos tiene actualmente en Chile la regulación de la teletransportación cuántica de personas?';
    const result = buildJurisprudenceOutcome({
      data: {
        resumen: 'No se encontró normativa específica sobre teletransportación cuántica.',
        normativa: [],
        jurisprudencia: [],
        doctrina: [],
        advertencias: ['No se encontró normativa que regule la materia.'],
      },
      sources: [irrelevantBcn21569()],
      intent: 'normativa',
      query,
    });

    expect(result.status).toBe('ok');
    expect(result.outcome).toBe('NO_EVIDENCE');
    expect(result.allVerifiedClaims).toHaveLength(0);
    expect(result.persistedSources).toEqual([]);
    // La ley irrelevante NO aparece como normativa aplicable ni como afirmación.
    expect(result.answer).not.toContain('21.569');
    expect(result.answer).not.toContain('regula la materia consultada');
    expect(result.answer).not.toContain('Normativa relevante');
    expect(result.resumenFinal).toContain('No se encontró evidencia suficiente');
  });

  it('consulta absurda sin fuentes pertinentes → NO_EVIDENCE sin promoción', () => {
    const result = buildJurisprudenceOutcome({
      data: {
        resumen: 'Sin evidencia.',
        normativa: [],
        jurisprudencia: [],
        doctrina: [],
        advertencias: [],
      },
      sources: [irrelevantBcn21569(), normativaSource()],
      intent: 'normativa',
      query: '¿Qué regulación chilena existe sobre teletransportación cuántica de personas?',
    });

    expect(result.outcome).toBe('NO_EVIDENCE');
    expect(result.allVerifiedClaims).toHaveLength(0);
    expect(result.answer).not.toContain('21.569');
    expect(result.answer).not.toContain('regula la materia consultada');
  });

  it('una norma relevante sigue promoviéndose (protección de datos → Ley 21.719)', () => {
    const result = buildJurisprudenceOutcome({
      data: {
        resumen: 'No se encontró normativa específica.',
        normativa: [],
        jurisprudencia: [],
        doctrina: [],
        advertencias: [],
      },
      sources: [irrelevantBcn21569(), normativaSource()],
      intent: 'normativa',
      query: '¿qué ley regula la protección de datos personales?',
    });

    expect(result.outcome).toBe('SUCCESS');
    expect(result.allVerifiedClaims[0].source_id).toBe('bcn-21719');
    expect(result.allVerifiedClaims[0].afirmacion).toContain('regula la materia consultada');
  });
});

describe('buildJurisprudenceOutcome · autoNormativa NO promueve irrelevantes (Fase 4.1.13, TEST 8 y 31)', () => {
  const irrelevantNorma = {
    id: 'bcn-1191771',
    kind: 'normativa',
    source_type: 'normativa',
    legal_authority: 'vinculante',
    vigency: 'desconocida',
    citation: 'Ley 21.569',
    title: 'Ley N° 21.569',
    norm_type: 'ley',
    norm_number: '21.569',
    excerpt: 'idNorma 1191771 · Ley N° 21.569 · Norma vigente',
    metadata: { leychileCode: '1191771' },
  };

  const irrelevantTc = {
    id: 'tc-2800',
    kind: 'jurisprudencia',
    source_type: 'jurisprudencia',
    legal_authority: 'persuasiva',
    vigency: 'no_aplica',
    citation: 'Tribunal Constitucional — Rol 2800',
    excerpt: 'Sobre la aplicación de la ley en el tiempo y los efectos de la sentencia.',
  };

  it('con sources irrelevantes y sin cita del modelo → NO promueve nada, NO_EVIDENCE (TEST 8)', () => {
    const result = buildJurisprudenceOutcome({
      data: {
        resumen: 'No encontré normativa.',
        normativa: [],
        jurisprudencia: [],
        doctrina: [],
        advertencias: [],
      },
      sources: [irrelevantNorma, irrelevantTc],
      intent: 'normativa',
      query: '¿Qué efectos jurídicos tiene la regulación de la teletransportación cuántica de personas?',
    });

    expect(result.outcome).toBe('NO_EVIDENCE');
    expect(result.allVerifiedClaims).toHaveLength(0);
    // Ni la primera norma encontrada ni la jurisprudencia irrelevante se promueven.
    expect(result.persistedSources).toEqual([]);
    expect(result.answer).not.toContain('21.569');
    expect(result.answer).not.toContain('Rol 2800');
    expect(result.answer).not.toContain('regula la materia consultada');
    expect(result.resumenFinal).toContain('No se encontró evidencia suficiente');
  });

  it('candidato recuperado por un término genérico → el gate no lo promueve (TEST 31)', () => {
    // La norma "coincidió" por la palabra genérica "normativa"; sin señal
    // sustantiva ni número explícito, el gate la descarta y NO se promueve.
    const result = buildJurisprudenceOutcome({
      data: {
        resumen: 'Sin normativa específica.',
        normativa: [],
        jurisprudencia: [],
        doctrina: [],
        advertencias: [],
      },
      sources: [irrelevantNorma],
      intent: 'normativa',
      query: '¿Qué regula la normativa?',
    });

    expect(result.outcome).toBe('NO_EVIDENCE');
    expect(result.allVerifiedClaims).toHaveLength(0);
    expect(result.answer).not.toContain('21.569');
    expect(result.answer).not.toContain('regula la materia consultada');
  });
});

// ---------------------------------------------------------------------------
// Fase 4.1.14 — Entidad explícita: Ley 21.719 no debe ser desplazada por una
// ley distinta (Ley 21.713) que coincida solo por contenido compartido.
// ---------------------------------------------------------------------------

describe('buildJurisprudenceOutcome · entidad explícita por número (Fase 4.1.14)', () => {
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
    metadata: { leychileCode: '90001' },
  });
  const ley21719 = () => ({
    id: 'bcn-21719',
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
    metadata: { leychileCode: '1209272' },
  });

  it('Ley 21.713 (primera en el listado y relevante por contenido) NO gana a la Ley 21.719 citada por número', () => {
    const result = buildJurisprudenceOutcome({
      data: {
        resumen: 'Sin normativa citada.',
        normativa: [],
        jurisprudencia: [],
        doctrina: [],
        advertencias: [],
      },
      sources: [ley21713(), ley21719()],
      intent: 'normativa',
      query: '¿Qué establece la Ley 21.719 sobre la protección de datos personales?',
    });

    expect(result.outcome).toBe('SUCCESS');
    expect(result.allVerifiedClaims[0].source_id).toBe('bcn-21719');
    expect(result.allVerifiedClaims[0].afirmacion).toContain('21.719');
    expect(result.answer).not.toContain('21.713');
  });

  it('sin número citado conserva la preferencia por ley del orden dado', () => {
    const result = buildJurisprudenceOutcome({
      data: {
        resumen: 'Sin normativa citada.',
        normativa: [],
        jurisprudencia: [],
        doctrina: [],
        advertencias: [],
      },
      sources: [ley21719(), ley21713()],
      intent: 'normativa',
      query: '¿Qué ley regula la protección de datos personales?',
    });
    expect(result.allVerifiedClaims[0].source_id).toBe('bcn-21719');
  });
});

// ---------------------------------------------------------------------------
// Fase 4.1.14 — Relación no demostrada: el pipeline NO presenta como hallazgo
// verificado una relación entre la ley y la autodeterminación informativa que
// ninguna fuente establece (CASO D).
// ---------------------------------------------------------------------------

describe('buildJurisprudenceOutcome · relación no demostrada (Fase 4.1.14, CASO D)', () => {
  const tc9666 = () => ({
    id: 'tc-9666',
    kind: 'jurisprudencia',
    source_type: 'jurisprudencia',
    legal_authority: 'persuasiva',
    vigency: 'no_aplica',
    citation: 'Tribunal Constitucional — Rol 9666',
    excerpt:
      'La protección de los datos personales se vincula a la autodeterminación informativa.',
  });
  const ley21719 = () => ({
    id: 'bcn-21719',
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
    metadata: { leychileCode: '1209272' },
  });

  it('la síntesis NO incluye una relación causal no demostrada entre la ley y la autodeterminación informativa', () => {
    const result = buildJurisprudenceOutcome({
      data: {
        resumen: 'La ley y el Tribunal Constitucional tratan la protección de datos personales.',
        normativa: [
          {
            fuente_id: 'bcn-21719',
            afirmacion:
              'La ley reconoce a los titulares el derecho de acceso, rectificación, supresión, oposición, portabilidad y bloqueo.',
            fragmento:
              'derecho a acceso, rectificación, supresión, oposición, portabilidad y bloqueo',
          },
        ],
        jurisprudencia: [
          {
            fuente_id: 'tc-9666',
            afirmacion:
              'El tribunal vinculó la protección de datos personales a la autodeterminación informativa.',
            fragmento: 'autodeterminación informativa',
          },
        ],
        doctrina: [],
        conclusion:
          'La relación entre la ley y la autodeterminación informativa está demostrada.',
      },
      sources: [tc9666(), ley21719()],
      intent: 'general',
      query:
        '¿Qué derechos reconoce la Ley N° 21.719 a los titulares de datos personales y qué relación existe con el derecho a la autodeterminación informativa reconocido por el Tribunal Constitucional?',
    });

    expect(result.outcome).toBe('SUCCESS');
    // La oración de relación no demostrada se ELIMINA de la síntesis.
    expect(result.síntesisText).not.toContain('relación entre la ley');
    expect(result.síntesisText).not.toContain('demostrada');
    // No se atribuye al tribunal una afirmación que su evidencia no contiene.
    expect(result.answer).not.toContain(
      'El Tribunal resolvió en el caso citado: La relación entre la ley y la autodeterminación informativa está demostrada.',
    );
    // Las afirmaciones verificadas de ambas dimensiones se conservan.
    expect(result.allVerifiedClaims.map((c) => c.category).sort()).toEqual([
      'jurisprudencia',
      'normativa',
    ]);
  });
});
