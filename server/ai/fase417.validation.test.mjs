// ---------------------------------------------------------------------------
// Fase 4.1.17 — VALIDACIÓN FINAL.
//
// Batería de 12 casos de regresión sobre el riesgo central de la fase:
// "una cita expresa de un artículo puede servir como ancla normativa de una
// INFERENCIA relacional, pero NUNCA debe ser suficiente para afirmar un hecho
// normativo sustantivo" (ni sustituir una disposición inexistente).
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import { buildJurisprudenceOutcome } from './jurisprudencePipeline.mjs';
import { verifyJurisprudenceClaims } from './jurisprudencePrompt.mjs';
import { verifyAndBuildSynthesis } from './synthesisVerifier.mjs';
import {
  extractLawNumber,
  extractArticleNumbers,
  selectNormativeFragments,
  splitLawArticles,
  fragmentSupportsClaim,
  isBcnNormaRelevantToQuery,
  isSourceRelevantToQuery,
  hasSubstantiveNormativeEvidence,
  resolveClaimFragment,
} from './jurisprudenceSources.mjs';

// ----------------------------- Fixtures -----------------------------------

const LEY_CHILE_TEXT = [
  'Artículo 1.- Objeto y ámbito: regular la protección de los datos personales y el tratamiento de los datos de carácter personal.',
  'Artículo 4.- Derechos del titular: toda persona tiene derecho a acceso, rectificación, supresión, oposición, portabilidad y bloqueo de sus datos personales.',
  'Artículo 5.- El responsable deberá informar al titular sobre el tratamiento de sus datos personales.',
  'Artículo 14.- El tratamiento efectuado por organismos públicos se sujetará a las normas de esta ley.',
].join('\n');

const LEY_FRAGMENTS = splitLawArticles(LEY_CHILE_TEXT).map((f, i) => ({
  id: `frag:art:${i}`,
  article: f.article,
  text: f.text,
}));

const LEY = () => ({
  id: 'bcn-21719',
  kind: 'normativa',
  source_type: 'normativa',
  legal_authority: 'vinculante',
  vigency: 'desconocida',
  norm_type: 'ley',
  norm_number: '21.719',
  citation: 'Ley 21.719',
  title: 'Ley N° 21.719',
  excerpt: LEY_CHILE_TEXT,
  metadata: { leychileCode: '1209272', fragments: LEY_FRAGMENTS },
});

const LEY_METADATA_ONLY = () => ({
  id: 'bcn-21719',
  kind: 'normativa',
  source_type: 'normativa',
  legal_authority: 'vinculante',
  vigency: 'desconocida',
  norm_type: 'ley',
  norm_number: '21.719',
  citation: 'Ley 21.719',
  title: 'Ley N° 21.719',
  excerpt: '',
  metadata: { leychileCode: '1209272' },
});

const TC9666 = () => ({
  id: 'tc-9666',
  kind: 'jurisprudencia',
  source_type: 'jurisprudencia',
  legal_authority: 'persuasiva',
  vigency: 'no_aplica',
  citation: 'Tribunal Constitucional — Rol 9666',
  excerpt: 'La protección de los datos personales se vincula a la autodeterminación informativa.',
});

const DERECHOS_CLAIM = {
  fuente_id: 'bcn-21719',
  afirmacion:
    'La ley reconoce a los titulares el derecho de acceso, rectificación, supresión, oposición, portabilidad y bloqueo.',
  fragmento:
    'toda persona tiene derecho a acceso, rectificación, supresión, oposición, portabilidad y bloqueo de sus datos personales',
};

const AUTODETERMINACION_CLAIM = {
  fuente_id: 'tc-9666',
  afirmacion:
    'El tribunal vinculó la protección de datos personales a la autodeterminación informativa.',
  fragmento: 'La protección de los datos personales se vincula a la autodeterminación informativa.',
};

const emptyData = (conclusion = '') => ({
  resumen: '',
  normativa: [],
  jurisprudencia: [],
  doctrina: [],
  advertencias: [],
  conclusion,
});

const baseData = (conclusion = '') => ({
  resumen: 'La ley y el Tribunal Constitucional tratan la protección de datos personales.',
  normativa: [DERECHOS_CLAIM],
  jurisprudencia: [AUTODETERMINACION_CLAIM],
  doctrina: [],
  advertencias: [],
  conclusion,
});

// ---------------------------------------------------------------------------
describe('4.1.17 · CASO 1 — Hecho normativo directo (art. 4)', () => {
  it('extrae el artículo y recupera el fragmento del Art. 4 con contenido sustantivo', () => {
    const query = '¿Qué establece el artículo 4 de la Ley N° 21.719?';
    expect(extractArticleNumbers(query)).toEqual(['4']);
    const selected = selectNormativeFragments(query, LEY_FRAGMENTS, { limit: 6 });
    const art4 = selected.find((f) => extractArticleNumbers(f.article).includes('4'));
    expect(art4).toBeTruthy();
    // Evidencia sustantiva, no un mero "Ley N° 21.719".
    expect(art4.text).toContain('portabilidad');
    expect(art4.text.length).toBeGreaterThan(40);
  });

  it('el pipeline devuelve evidencia normativa sustantiva (no solo el título)', () => {
    const r = buildJurisprudenceOutcome({
      data: { ...emptyData(), normativa: [DERECHOS_CLAIM] },
      sources: [LEY()],
      intent: 'normativa',
      query: '¿Qué establece el artículo 4 de la Ley N° 21.719?',
    });
    expect(r.outcome).toBe('SUCCESS');
    expect(r.allVerifiedClaims[0].fragmento).toContain('acceso');
    expect(r.allVerifiedClaims[0].fragmento).toContain('portabilidad');
    expect(r.allVerifiedClaims[0].fragmento.length).toBeGreaterThan(40);
    expect(r.answer).toContain('portabilidad');
  });
});

// ---------------------------------------------------------------------------
describe('4.1.17 · CASO 2 — Artículo incorrecto (no sustituir art. 4 por art. 99)', () => {
  const query = '¿Qué establece el artículo 99 de la Ley N° 21.719 sobre el derecho de acceso?';

  it('extrae el artículo 99 y su fragmento no existe en la fuente', () => {
    expect(extractArticleNumbers(query)).toEqual(['99']);
    const selected = selectNormativeFragments(query, LEY_FRAGMENTS, { limit: 6 });
    expect(extractArticleNumbers(selected.map((f) => f.article).join(' '))).not.toContain('99');
  });

  it('el verifier NO ancla una afirmación "artículo 99" al texto del Art. 4', () => {
    const { kept } = verifyJurisprudenceClaims(
      [
        {
          fuente_id: 'bcn-21719',
          afirmacion: 'El artículo 99 de la Ley N° 21.719 reconoce el derecho de acceso.',
          fragmento: 'toda persona tiene derecho a acceso',
        },
      ],
      new Map([['bcn-21719', LEY()]]),
      'normativa',
    );
    expect(kept).toHaveLength(0);
  });

  it('el pipeline NO presenta el artículo 4 como sustituto del artículo 99', () => {
    for (const intent of ['general', 'normativa']) {
      const r = buildJurisprudenceOutcome({
        data: {
          ...emptyData(),
          normativa: [
            {
              fuente_id: 'bcn-21719',
              afirmacion: 'El artículo 99 de la Ley N° 21.719 reconoce el derecho de acceso.',
              fragmento: 'toda persona tiene derecho a acceso',
            },
          ],
        },
        sources: [LEY()],
        intent,
        query,
      });
      // Ningún claim afirma contenido del "artículo 99".
      expect(r.allVerifiedClaims.every((c) => !/art[ií]culo\s*99/i.test(c.afirmacion))).toBe(true);
      expect(r.answer).not.toContain('El artículo 99');
    }
  });
});

// ---------------------------------------------------------------------------
describe('4.1.17 · CASO 3 — Relación válida: se conserva como INFERENCIA', () => {
  const query =
    '¿Qué relación puede establecerse entre los derechos reconocidos en el artículo 4 de la Ley N° 21.719 y la autodeterminación informativa reconocida por el Tribunal Constitucional?';
  const conclusion =
    'Los derechos reconocidos en el artículo 4 de la Ley 21.719 pueden analizarse en relación con la autodeterminación informativa desarrollada por el Tribunal Constitucional.';

  it('ambos polos anclados → inferencia del sistema, NO hecho de una fuente', () => {
    const r = buildJurisprudenceOutcome({
      data: baseData(conclusion),
      sources: [TC9666(), LEY()],
      intent: 'general',
      query,
    });
    expect(r.outcome).toBe('SUCCESS');
    expect(r.síntesisText).toContain('Sobre la base de las fuentes, puede inferirse');
    expect(r.síntesisText).toContain('Inferencia del sistema');
    expect(r.síntesisText).toContain('autodeterminación informativa');
    // No se presenta como "La Ley establece…" ni como aserción textual.
    expect(r.síntesisText).not.toMatch(/La norma establece:[\s\S]*relación con la autodeterminación/);
    // No como hecho categórico.
    expect(r.síntesisText).not.toContain('demostrada');
  });
});

// ---------------------------------------------------------------------------
describe('4.1.17 · CASO 4 — Relación sin segundo polo (no inventar)', () => {
  const conclusion =
    'El artículo 4 de la Ley N° 21.719 establece una relación con la autodeterminación informativa.';

  it('sin jurisprudencia el polo B no existe → la relación se elimina', () => {
    const r = buildJurisprudenceOutcome({
      data: { ...emptyData(), normativa: [DERECHOS_CLAIM], conclusion },
      sources: [LEY()],
      intent: 'general',
      query:
        '¿Qué relación establece el artículo 4 de la Ley N° 21.719 con la autodeterminación informativa?',
    });
    expect(r.outcome).toBe('SUCCESS'); // el claim normativo sí se verifica
    expect(r.síntesisText).not.toContain('autodeterminación informativa');
    expect(r.síntesisText).not.toContain('relación');
    // Aviso de oración eliminada por falta de respaldo.
    expect(r.advertenciasFinales.some((w) => w.includes('sin respaldo verificable'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
describe('4.1.17 · CASO 5 — Premisa falsa ("el art. 4 crea el derecho")', () => {
  const conclusion =
    'El artículo 4 de la Ley N° 21.719 crea el derecho a la autodeterminación informativa.';

  it('no convierte la premisa falsa en conclusión; separa ambas fuentes', () => {
    const r = buildJurisprudenceOutcome({
      data: baseData(conclusion),
      sources: [TC9666(), LEY()],
      intent: 'general',
      query:
        '¿Cómo demuestra el Tribunal Constitucional que el artículo 4 de la Ley N° 21.719 crea el derecho a la autodeterminación informativa?',
    });
    expect(r.outcome).toBe('SUCCESS');
    // La premisa "crea el derecho" no entra a la síntesis.
    expect(r.síntesisText).not.toContain('crea el derecho a la autodeterminación');
    // Las dos dimensiones verificadas se conservan por separado.
    expect(r.allVerifiedClaims.map((c) => c.category).sort()).toEqual([
      'jurisprudencia',
      'normativa',
    ]);
  });

  it('la oración de la premisa falsa se elimina en el verifier', () => {
    const { sentences } = verifyAndBuildSynthesis(conclusion, [
      { source_id: 'bcn-21719', afirmacion: DERECHOS_CLAIM.afirmacion, fragmento: DERECHOS_CLAIM.fragmento, source: { kind: 'normativa' } },
      { source_id: 'tc-9666', afirmacion: AUTODETERMINACION_CLAIM.afirmacion, fragmento: AUTODETERMINACION_CLAIM.fragmento, source: { kind: 'jurisprudencia' } },
    ]);
    expect(sentences).toHaveLength(1);
    expect(sentences[0].dropped).toBe(true);
  });
});

// ---------------------------------------------------------------------------
describe('4.1.17 · CASO 6 — Número de ley irrelevante (Fase 4.1.15)', () => {
  const query = '¿Puedo divorciarme según la Ley N° 21.719?';

  it('la cita del número NO releva la incompatibilidad de materia', () => {
    expect(isBcnNormaRelevantToQuery(query, LEY())).toBe(false);
  });

  it('NO_EVIDENCE: la Ley 21.719 no se promueve por el divorcio', () => {
    const r = buildJurisprudenceOutcome({
      data: emptyData(),
      sources: [LEY()],
      intent: 'normativa',
      query,
    });
    expect(r.outcome).toBe('NO_EVIDENCE');
    expect(r.answer).not.toContain('21.719');
  });
});

// ---------------------------------------------------------------------------
describe('4.1.17 · CASO 7 — Ley inexistente (no inventar Ley 99.999)', () => {
  const query = '¿Qué derechos reconoce la Ley N° 99.999 sobre protección de datos personales?';

  it('metadata-only NO se promueve: no hay evidencia sustantiva', () => {
    expect(hasSubstantiveNormativeEvidence(LEY_METADATA_ONLY())).toBe(false);
  });

  it('NO_EVIDENCE: no se presenta otra ley como Ley 99.999', () => {
    const r = buildJurisprudenceOutcome({
      data: emptyData(),
      sources: [LEY_METADATA_ONLY()],
      intent: 'normativa',
      query,
    });
    expect(r.outcome).toBe('NO_EVIDENCE');
    expect(r.answer).not.toContain('99.999');
    expect(r.allVerifiedClaims).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
describe('4.1.17 · CASO 8 — Jurisprudencia independiente (sin Ley 21.719)', () => {
  const query = '¿Qué ha señalado el Tribunal Constitucional sobre autodeterminación informativa?';
  const conclusion =
    'El Tribunal Constitucional ha señalado que la protección de datos personales se vincula a la autodeterminación informativa.';

  it('responde desde jurisprudencia aunque no aparezca la ley', () => {
    const r = buildJurisprudenceOutcome({
      data: { ...emptyData(conclusion), jurisprudencia: [AUTODETERMINACION_CLAIM] },
      sources: [TC9666()],
      intent: 'general',
      query,
    });
    expect(r.outcome).toBe('SUCCESS');
    expect(r.allVerifiedClaims.every((c) => c.category === 'jurisprudencia')).toBe(true);
    expect(r.síntesisText).toContain('autodeterminación informativa');
    expect(r.answer).toContain('Jurisprudencia relevante');
  });
});

// ---------------------------------------------------------------------------
describe('4.1.17 · CASO 9 — Relación con dos fuentes (estructura 1-4)', () => {
  const conclusion = [
    'La Ley 21.719 reconoce a los titulares el derecho de acceso, rectificación, supresión, oposición, portabilidad y bloqueo.',
    'El Tribunal Constitucional ha desarrollado la autodeterminación informativa.',
    'Sobre esa base, puede establecerse una relación conceptual entre los derechos del artículo 4 de la Ley 21.719 y la autodeterminación informativa.',
  ].join(' ');

  it('hechos por separado + relación final como inferencia', () => {
    const r = buildJurisprudenceOutcome({
      data: baseData(conclusion),
      sources: [TC9666(), LEY()],
      intent: 'general',
      query:
        '¿Qué relación existe entre la protección de datos personales reconocida por el Tribunal Constitucional y los derechos del titular establecidos en el artículo 4 de la Ley N° 21.719?',
    });
    expect(r.outcome).toBe('SUCCESS');
    // 1) Hecho normativo.
    const normPos = r.síntesisText.indexOf('La norma establece: La Ley 21.719 reconoce');
    expect(normPos).toBeGreaterThanOrEqual(0);
    // 2) Hecho jurisprudencial.
    expect(r.síntesisText).toContain('El Tribunal resolvió en el caso citado');
    // 3) Relación conceptual como inferencia.
    expect(r.síntesisText).toContain('Sobre la base de las fuentes, puede inferirse');
    expect(r.síntesisText).toContain('Inferencia del sistema');
    // 4) La relación NO se presenta bajo el marco normativo.
    const relationText = r.síntesisText.slice(normPos);
    expect(relationText).toMatch(/puede inferirse[\s\S]*relación conceptual/);
    const normLine = r.síntesisText.split('\n').find((l) => l.startsWith('La norma establece:'));
    expect(normLine || '').not.toContain('relación conceptual');
  });
});

// ---------------------------------------------------------------------------
describe('4.1.17 · CASO 10 — Contaminación de evidencia ("toda persona" ≠ divorcio)', () => {
  const conclusion = 'La Ley N° 21.719 establece que toda persona tiene derecho al divorcio.';

  it('el fragmento del art. 4 no respalda el divorcio', () => {
    const art4 = LEY_FRAGMENTS.find((f) => extractArticleNumbers(f.article).includes('4'));
    expect(fragmentSupportsClaim(art4, 'La Ley establece que toda persona tiene derecho al divorcio')).toBe(false);
  });

  it('el pipeline no contamina la síntesis con el divorcio', () => {
    const r = buildJurisprudenceOutcome({
      data: { ...emptyData(), normativa: [DERECHOS_CLAIM], conclusion },
      sources: [LEY()],
      intent: 'general',
      query: '¿La Ley N° 21.719 establece que toda persona tiene derecho al divorcio?',
    });
    expect(r.outcome).toBe('SUCCESS');
    expect(r.síntesisText).not.toContain('divorcio');
    expect(r.answer).not.toContain('tiene derecho al divorcio');
  });
});

// ---------------------------------------------------------------------------
describe('4.1.17 · CASO 11 — Tipos de claim (directa / relacional / inferencia)', () => {
  const conclusion =
    'Los derechos reconocidos en el artículo 4 de la Ley 21.719 pueden analizarse en relación con la autodeterminación informativa desarrollada por el Tribunal Constitucional.';

  it('hechos con evidencia de su dimensión; la relación solo existe como inferencia, no se persiste como claim', () => {
    const { sentences } = verifyAndBuildSynthesis(conclusion, [
      { source_id: 'bcn-21719', fragment_id: 'frag:art:1', afirmacion: DERECHOS_CLAIM.afirmacion, fragmento: DERECHOS_CLAIM.fragmento, source: { kind: 'normativa' } },
      { source_id: 'tc-9666', afirmacion: AUTODETERMINACION_CLAIM.afirmacion, fragmento: AUTODETERMINACION_CLAIM.fragmento, source: { kind: 'jurisprudencia' } },
    ]);
    // La única oración conservada es la relación, etiquetada como INFERENCIA.
    expect(sentences).toHaveLength(1);
    expect(sentences[0].category).toBe('inferencia');
    expect(sentences[0].inference).toBe(true);
    expect(sentences[0].source_ids.sort()).toEqual(['bcn-21719', 'tc-9666']);

    const r = buildJurisprudenceOutcome({
      data: baseData(conclusion),
      sources: [TC9666(), LEY()],
      intent: 'general',
      query:
        '¿Qué relación puede establecerse entre los derechos reconocidos en el artículo 4 de la Ley N° 21.719 y la autodeterminación informativa reconocida por el Tribunal Constitucional?',
    });
    // Los claims persistidos son SOLO de la dimensión real de cada fuente;
    // la inferencia relacional no se convierte en DIRECT_CLAIM.
    const persisted = r.persistedSources.flatMap((s) => s.claims || []);
    expect(persisted.length).toBe(2);
    expect(persisted.every((c) => ['normativa', 'jurisprudencia'].includes(c.category))).toBe(true);
    expect(persisted.some((c) => c.category === 'inferencia')).toBe(false);
    expect(persisted.some((c) => (c.afirmacion || '').includes('relación'))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
describe('4.1.17 · CASO 12 — Flujo completo con evidencia preservada', () => {
  const query =
    '¿Qué relación puede establecerse entre los derechos reconocidos en el artículo 4 de la Ley N° 21.719 y la autodeterminación informativa reconocida por el Tribunal Constitucional?';
  const conclusion =
    'Los derechos reconocidos en el artículo 4 de la Ley 21.719 pueden analizarse en relación con la autodeterminación informativa desarrollada por el Tribunal Constitucional.';

  it('cada etapa conserva la evidencia necesaria hasta la respuesta final', () => {
    // 1) QUERY → número de ley y artículo.
    expect(extractLawNumber(query)).toContain('21719');
    expect(extractArticleNumbers(query)).toContain('4');

    // 2-3) RETRIEVAL → ARTICLE EXTRACTION → frgamento del Art. 4.
    const selected = selectNormativeFragments(query, LEY_FRAGMENTS, { limit: 6 });
    const art4 = selected.find((f) => extractArticleNumbers(f.article).includes('4'));
    expect(art4).toBeTruthy();

    // 4-5) EVIDENCIA NORMATIVA Y JURISPRUDENCIAL → claims verificados.
    const sourcesById = new Map([
      ['bcn-21719', LEY()],
      ['tc-9666', TC9666()],
    ]);
    const verified = {
      kept: [
        ...verifyJurisprudenceClaims([DERECHOS_CLAIM], sourcesById, 'normativa').kept,
        ...verifyJurisprudenceClaims([AUTODETERMINACION_CLAIM], sourcesById, 'jurisprudencia').kept,
      ],
    };
    expect(verified.kept.map((c) => c.category).sort()).toEqual(['jurisprudencia', 'normativa']);
    expect(verified.kept.find((c) => c.category === 'normativa').fragmento).toContain('portabilidad');

    // 6-9) PIPELINE → CLAIMS → RELACIONAL → LLM CONTEXT → SÍNTESIS VERIFICADA.
    const r = buildJurisprudenceOutcome({
      data: baseData(conclusion),
      sources: [TC9666(), LEY()],
      intent: 'general',
      query,
    });
    expect(r.outcome).toBe('SUCCESS');
    // La evidencia del Art. 4 sobrevive en los claims verificados.
    expect(r.allVerifiedClaims.find((c) => c.category === 'normativa').fragmento).toContain('acceso');

    // 10-12) SÍNTESIS → VERIFIER → RESPUESTA FINAL: inferencia anclada.
    expect(r.síntesisText).toContain('Sobre la base de las fuentes, puede inferirse');
    expect(r.síntesisText).toContain('Inferencia del sistema');
    expect(r.síntesisText).toContain('autodeterminación informativa');
  });
});

// ---------------------------------------------------------------------------
describe('4.1.17 · CASO 13 — autoNormativa: el artículo citado es el ancla (TEST 1/5/6)', () => {
  it('NO promueve la Ley anclada al Art. 4 cuando la consulta cita un art. 99 inexistente', () => {
    const r = buildJurisprudenceOutcome({
      data: emptyData(),
      sources: [LEY()],
      intent: 'normativa',
      query:
        '¿Qué establece el artículo 99 de la Ley N° 21.719 sobre el derecho de acceso a los datos personales?',
    });
    expect(r.outcome).toBe('NO_EVIDENCE');
    expect(r.allVerifiedClaims).toHaveLength(0);
    expect(r.answer).not.toContain('Artículo 4');
    expect(
      r.advertenciasFinales.some((w) => w.includes('no se promueve la norma en su lugar')),
    ).toBe(true);
  });

  it('SÍ promueve la Ley anclada al Art. 4 citado', () => {
    const r = buildJurisprudenceOutcome({
      data: emptyData(),
      sources: [LEY()],
      intent: 'normativa',
      query:
        '¿Qué derechos reconoce el artículo 4 de la Ley N° 21.719 a los titulares de datos personales?',
    });
    expect(r.outcome).toBe('SUCCESS');
    expect(r.allVerifiedClaims[0].fragmento).toContain('Artículo 4');
    expect(r.answer).toContain('Artículo 4');
  });
});

// ---------------------------------------------------------------------------
describe('4.1.17 · CASO 14 — claims descartados NO reaparecen en Avisos (leak)', () => {
  it('el claim descartado por falta de respaldo no se reproduce en la respuesta', () => {
    const r = buildJurisprudenceOutcome({
      data: {
        ...emptyData(),
        normativa: [
          {
            fuente_id: 'bcn-21719',
            afirmacion: 'La Ley 21.719 regula el divorcio y la disolución del matrimonio.',
            fragmento: 'el divorcio se rige por esta ley',
          },
        ],
      },
      sources: [LEY()],
      intent: 'normativa',
      query: '¿Qué establece la Ley N° 21.719 sobre el divorcio y la disolución del matrimonio?',
    });
    expect(r.outcome).toBe('NO_EVIDENCE');
    expect(r.allVerifiedClaims).toHaveLength(0);
    expect(r.answer).not.toContain('divorcio');
  });

  it('el claim sin fuente válida no reproduce el texto en Avisos', () => {
    const ley545MetadataOnly = {
      id: 'bcn-1190123',
      kind: 'normativa',
      source_type: 'normativa',
      legal_authority: 'vinculante',
      vigency: 'desconocida',
      norm_type: 'ley',
      norm_number: '21.545',
      citation: 'Ley 21.545',
      title: 'Ley N° 21.545',
      excerpt: '',
      metadata: {},
    };
    const r = buildJurisprudenceOutcome({
      data: {
        ...emptyData(),
        normativa: [
          {
            fuente_id: 'bcn-1190123',
            afirmacion: 'La Ley 21.545 reconoce el derecho de acceso.',
            fragmento: 'reconoce el derecho de acceso',
          },
        ],
      },
      sources: [ley545MetadataOnly],
      intent: 'normativa',
      query: '¿Qué derechos reconoce la Ley N° 99.999 sobre protección de datos personales?',
    });
    expect(r.outcome).toBe('NO_EVIDENCE');
    expect(r.allVerifiedClaims).toHaveLength(0);
    expect(r.answer).not.toContain('21.545');
    expect(r.answer).not.toContain('derecho de acceso');
  });
});

// ---------------------------------------------------------------------------
describe('4.1.17 · CASO 15 — síntesis: artículo citado inexistente no ancla HECHO normativo', () => {
  const claims = [
    { source_id: 'bcn-21719', article: ['4'], afirmacion: DERECHOS_CLAIM.afirmacion, fragmento: DERECHOS_CLAIM.fragmento, source: { kind: 'normativa' } },
    { source_id: 'tc-9666', article: [], afirmacion: AUTODETERMINACION_CLAIM.afirmacion, fragmento: AUTODETERMINACION_CLAIM.fragmento, source: { kind: 'jurisprudencia' } },
  ];

  it('"El artículo 99 … reconoce el derecho de acceso" se elimina (no sustituye al Art. 4)', () => {
    const { sentences, síntesis } = verifyAndBuildSynthesis(
      'El artículo 99 de la Ley 21.719 reconoce el derecho de acceso.',
      claims,
    );
    expect(síntesis).toBe('');
    expect(sentences[0].dropped).toBe(true);
  });

  it('"El artículo 4 … reconoce el derecho de acceso…" se conserva como hecho normativo', () => {
    const { sentences } = verifyAndBuildSynthesis(
      'El artículo 4 de la Ley 21.719 reconoce el derecho de acceso, rectificación, supresión, oposición, portabilidad y bloqueo.',
      claims,
    );
    expect(sentences[0].dropped).toBe(false);
    expect(sentences[0].category).toBe('normativa');
  });
});

// ---------------------------------------------------------------------------
describe('4.1.17 · CASO 16 — jurisprudencia incidental/falsa no produce respuesta (TEST 15)', () => {
  it('una fuente recuperada sin relación temática real no respalda una afirmación inventada', () => {
    const tcPatente = {
      id: 'tc-2365',
      kind: 'jurisprudencia',
      source_type: 'jurisprudencia',
      legal_authority: 'persuasiva',
      vigency: 'no_aplica',
      citation: 'Tribunal Constitucional — Rol 2365',
      excerpt:
        'El monopolio que se protege sobre los inventos, marcas y procesos tecnológicos constituye un incentivo al desarrollo técnico e industrial.',
    };
    const r = buildJurisprudenceOutcome({
      data: {
        ...emptyData(),
        jurisprudencia: [
          {
            fuente_id: 'tc-2365',
            afirmacion: 'El Tribunal Constitucional ha permitido la teletransportación de personas.',
            fragmento: 'permite la teletransportación de personas',
          },
        ],
      },
      sources: [tcPatente],
      intent: 'normativa',
      query:
        '¿Existe en Chile jurisprudencia que permita la teletransportación de personas y qué ley la regula?',
    });
    expect(r.outcome).toBe('NO_EVIDENCE');
    expect(r.allVerifiedClaims).toHaveLength(0);
    expect(r.answer).not.toContain('teletransportación');
  });
});

// ---------------------------------------------------------------------------
describe('4.1.17 · CASO 17 — coincidencia léxica débil no crea relevancia (TEST 15)', () => {
  it('una fuente que solo comparte un verbo genérico ("permita") NO es relevante', () => {
    const tcPatente = {
      id: 'tc-2365',
      kind: 'jurisprudencia',
      source_type: 'jurisprudencia',
      legal_authority: 'persuasiva',
      vigency: 'no_aplica',
      citation: 'Tribunal Constitucional — Rol 2365',
      excerpt:
        'El monopolio que se protege sobre los inventos, marcas y procesos tecnológicos; la ley permita el monopolio temporal sobre inventos.',
    };
    expect(
      isSourceRelevantToQuery(
        '¿Existe en Chile jurisprudencia que permita la teletransportación de personas y qué ley la regula?',
        tcPatente,
      ),
    ).toBe(false);
  });
});