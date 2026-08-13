import { describe, it, expect } from 'vitest';
import {
  selectSourcesForContext,
  orderSourceFragments,
  rankSourcesForContext,
  CONTEXT_SELECTION,
  buildJurisprudenceContext,
  JURISPRUDENCE_LIMITS,
} from './jurisprudencePrompt.mjs';
import { buildJurisprudenceOutcome } from './jurisprudencePipeline.mjs';
import { classifyLegalQuery } from './jurisprudenceSources.mjs';

// ---------------------------------------------------------------------------
// Fase 4.2.5 — Context Budget + Evidence-Aware Source Selection.
// Selecciona, ANTES de armar el contexto, las mejores fuentes/fragmentos para
// reducir los casos de CONTEXT_TOO_LARGE sin sacrificar las garantías de
// evidencia (los gates de 4.1.x-4.2.4 quedan intactos aguas abajo).
// ---------------------------------------------------------------------------

const ley21719 = ({ hasta = 5, extra = [] } = {}) => {
  const base = [
    { id: 'frag:1209272:1', article: 'Artículo 1', text: 'La presente ley regula el tratamiento de datos personales y la protección de la información personal.' },
    { id: 'frag:1209272:2', article: 'Artículo 3', text: 'Se aplica a los tratamientos de datos personales efectuados en Chile.' },
    { id: 'frag:1209272:3', article: 'Artículo 4', text: 'El titular de datos personales tiene derecho a acceso, rectificación, supresión, oposición, portabilidad y bloqueo de sus datos personales.' },
    { id: 'frag:1209272:4', article: 'Artículo 5', text: 'El tratamiento de datos personales requiere el consentimiento del titular, salvo excepciones legales.' },
    { id: 'frag:1209272:5', article: 'Artículo 6', text: 'Los responsables del tratamiento deben adoptar medidas de seguridad para proteger los datos personales.' },
    { id: 'frag:1209272:99', article: 'Artículo 99', text: 'Disposición ficticia sobre materia no relacionada con datos personales.' },
  ].slice(0, hasta);
  return {
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
      evidence_quality: 'substantive',
      fragments: [...base, ...extra],
    },
  };
};

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
  excerpt: 'Regula la protección de los datos personales y el tratamiento de información personal.',
  metadata: {
    leychileCode: '90001',
    evidence_quality: 'substantive',
    fragments: [
      { id: 'frag:21713:1', article: 'Artículo 1', text: 'La presente ley regula la protección de datos personales y el tratamiento de información personal.' },
    ],
  },
});

const metadataOnlyLaw = (id = 'bcn-99999', number = '99.999') => ({
  id,
  kind: 'normativa',
  source_type: 'normativa',
  legal_authority: 'vinculante',
  vigency: 'desconocida',
  norm_type: 'ley',
  norm_number: number,
  citation: `Ley ${number}`,
  title: `Ley N° ${number}`,
  excerpt: 'Título y fecha de publicación sin texto de disposiciones.',
  metadata: { leychileCode: '1', evidence_quality: 'metadata_only' },
});

const tc = (rol, text = '') => ({
  id: `tc-${rol}`,
  kind: 'jurisprudencia',
  source_type: 'jurisprudencia',
  legal_authority: 'persuasiva',
  vigency: 'no_aplica',
  rol,
  citation: `Tribunal Constitucional — Rol ${rol}`,
  url: `https://www.tribunalconstitucional.cl/expedientes?rol=${rol}`,
  date: '2020-01-01',
  excerpt: `En el rol ${rol} el Tribunal Constitucional sostuvo que la protección de los datos personales se vincula a la autodeterminación informativa. ${text}`,
});

const doctrina = (id, abstract) => ({
  id,
  kind: 'doctrina',
  source_type: 'doctrina',
  legal_authority: 'doctrinal',
  vigency: 'no_aplica',
  citation: id,
  title: id,
  excerpt: abstract,
  metadata: { authors: ['Autor Académico'] },
});

const bigExcerpt = (seed) =>
  `Materia del caso ${seed}: la protección de los datos personales se vincula de manera directa con la autodeterminación informativa y con el derecho a la vida privada. `.repeat(30);

describe('Fase 4.2.5 · selección evidence-aware de contexto', () => {
  it('C1: article-first preserva el fragmento del artículo citado', () => {
    const query = '¿Qué establece el artículo 4 de la Ley 21.719?';
    const { sources } = selectSourcesForContext({
      sources: [ley21719()],
      query,
      intentClass: classifyLegalQuery(query).intent,
    });

    expect(sources.length).toBe(1);
    expect(sources[0].id).toBe('bcn-1209272');
    // El artículo citado queda PRIMERO en el orden de fragmentos.
    expect(sources[0].metadata.fragments[0].article).toMatch(/Art[ií]culo 4\b/);
    expect(sources[0].metadata.fragments[0].id).toBe('frag:1209272:3');
  });

  it('C2: 11 fuentes / contexto excesivo → reduce el contexto', () => {
    const query = '¿Qué criterios ha desarrollado el Tribunal Constitucional sobre autodeterminación informativa?';
    const sources = [9666, 9511, 9557, 16622, 17051, 17466, 17800, 18100, 18500, 19000, 19500].map((r) =>
      tc(r, bigExcerpt(r)),
    );
    const intentClass = classifyLegalQuery(query).intent;
    expect(intentClass).toBe('JURISPRUDENCE_LOOKUP');

    const before = buildJurisprudenceContext(sources);
    expect(before.tooLarge).toBe(true);

    const result = selectSourcesForContext({ sources, query, intentClass });
    expect(result.tooLarge).toBe(false);
    expect(result.sources.length).toBeLessThan(sources.length);
    expect(result.context.length).toBeLessThan(JURISPRUDENCE_LIMITS.MAX_CONTEXT_CHARS);
    expect(result.stats.context_chars_before).toBeGreaterThan(result.stats.context_chars_after);
    expect(result.stats.sources_after).toBeLessThan(result.stats.sources_before);
  });

  it('C3: relacional norma + TC → ambos polos representados', () => {
    const query =
      '¿Qué relación existe entre el artículo 4 de la Ley 21.719 y la autodeterminación informativa según el Tribunal Constitucional?';
    const intentClass = classifyLegalQuery(query).intent;
    expect(intentClass).toBe('RELATIONAL_LEGAL_QUERY');

    const normativas = [
      ley21719(),
      ley21713(),
      { ...ley21719(), id: 'bcn-1', norm_number: '1.111', citation: 'Ley 1.111', title: 'Ley N° 1.111', metadata: { ...ley21719().metadata, fragments: [ley21719().metadata.fragments[0]] } },
      { ...ley21719(), id: 'bcn-2', norm_number: '2.222', citation: 'Ley 2.222', title: 'Ley N° 2.222', metadata: { ...ley21719().metadata, fragments: [ley21719().metadata.fragments[1]] } },
    ];
    const jurisprudencia = [9666, 9511, 9557, 16622].map((r) => tc(r, bigExcerpt(r)));
    const sources = [...normativas, ...jurisprudencia];

    const result = selectSourcesForContext({ sources, query, intentClass });
    const kinds = new Set(result.sources.map((s) => s.kind));
    expect(kinds.has('normativa')).toBe(true);
    expect(kinds.has('jurisprudencia')).toBe(true);
    expect(result.stats.poles_preserved).toBe(true);
    expect(result.tooLarge).toBe(false);
  });

  it('C4: mixed norma + jurisprudencia → la norma no es desplazada por 8 sentencias', () => {
    const query =
      '¿Qué establece la Ley 21.719 y qué ha dicho el Tribunal Constitucional sobre la autodeterminación informativa?';
    const intentClass = classifyLegalQuery(query).intent;
    expect(intentClass).toBe('MIXED_NORM_JURISPRUDENCE');

    const sources = [
      ley21719(),
      ...[9666, 9511, 9557, 16622, 17051, 17466, 17800, 18100].map((r) => tc(r, bigExcerpt(r))),
    ];
    const result = selectSourcesForContext({ sources, query, intentClass });
    const kinds = new Set(result.sources.map((s) => s.kind));
    expect(kinds.has('normativa')).toBe(true);
    expect(kinds.has('jurisprudencia')).toBe(true);
    expect(result.stats.poles_preserved).toBe(true);
  });

  it('C5: jurisprudence lookup prioriza TC relevante (tc-9666/9511/9557)', () => {
    const query =
      '¿Qué criterios ha desarrollado el Tribunal Constitucional sobre autodeterminación informativa?';
    const intentClass = classifyLegalQuery(query).intent;
    const sources = [
      ley21719(),
      tc(9666),
      tc(9511),
      tc(9557),
      doctrina('doctrina-1', 'La autodeterminación informativa como derecho fundamental en la doctrina chilena.'),
    ];
    const result = selectSourcesForContext({ sources, query, intentClass });
    const ids = result.sources.map((s) => s.id);
    // Los tres roles TC canónicos se conservan cuando están recuperados.
    for (const rol of ['tc-9666', 'tc-9511', 'tc-9557']) {
      expect(ids).toContain(rol);
    }
    // La prioridad TC queda al frente de la selección.
    expect(result.sources[0].kind).toBe('jurisprudencia');
    expect(result.stats.poles_preserved).toBe(true);
  });

  it('C6: doctrine lookup prioriza doctrina', () => {
    const query = '¿Qué doctrina existe sobre la autodeterminación informativa?';
    const intentClass = classifyLegalQuery(query).intent;
    expect(intentClass).toBe('DOCTRINE_LOOKUP');
    const sources = [
      tc(9666),
      ley21719(),
      doctrina('doctrina-1', 'La autodeterminación informativa como derecho fundamental en la doctrina chilena.'),
      doctrina('doctrina-2', 'Estudio académico sobre los datos personales y su protección en Chile.'),
    ];
    const result = selectSourcesForContext({ sources, query, intentClass });
    expect(result.sources.some((s) => s.kind === 'doctrina')).toBe(true);
    expect(result.sources[0].kind).toBe('doctrina');
  });

  it('C7: metadata-only no desplaza evidencia sustantiva', () => {
    const query = '¿Qué establece la Ley 21.719 sobre la protección de datos personales?';
    const sources = [metadataOnlyLaw('bcn-99999', '99.999'), ley21719(), metadataOnlyLaw('bcn-88888', '88.888')];
    const result = selectSourcesForContext({ sources, query, intentClass: 'ARTICLE_LOOKUP' });
    const ids = result.sources.map((s) => s.id);
    expect(ids).toContain('bcn-1209272');
    expect(ids).not.toContain('bcn-99999');
    expect(ids).not.toContain('bcn-88888');
  });

  it('C8: article mismatch no sustituye la disposición citada (NO_EVIDENCE)', () => {
    const query = '¿Qué establece el artículo 99 de la Ley 21.719?';
    // La ley recuperada solo expone los artículos 1-6 (SIN artículo 99): la
    // consulta pide una disposición que la fuente no contiene.
    const sources = [ley21719({ hasta: 5 }), ley21713()];
    const result = selectSourcesForContext({ sources, query, intentClass: 'ARTICLE_LOOKUP' });
    // La ley citada por número se conserva y lidera la selección; la otra ley
    // solo puede entrar como apoyo (nunca como sustituta de la disposición).
    expect(result.sources[0].id).toBe('bcn-1209272');

    // El gate de mismatch (pipeline, Fase 4.2.2) sigue protegiendo el resultado:
    // no se promueve la norma anclada a otra disposición.
    const outcome = buildJurisprudenceOutcome({
      data: { resumen: '', normativa: [], jurisprudencia: [], doctrina: [], advertencias: [] },
      sources: result.sources,
      intent: 'normativa',
      query,
    });
    expect(outcome.status).toBe('ok');
    expect(outcome.outcome).toBe('NO_EVIDENCE');
    expect(outcome.researchWarnings.some((w) => /art[ií]culo 99/i.test(w))).toBe(true);
  });

  it('C9: muchos fragments de una misma fuente → se reduce el renderizado sin perder ids', () => {
    const query = '¿Qué establece el artículo 4 de la Ley 21.719?';
    const fragments = Array.from({ length: 24 }, (_, i) => ({
      id: `frag:1209272:${i + 1}`,
      article: `Artículo ${i + 1}`,
      text: `Texto del artículo ${i + 1} sobre datos personales y su tratamiento en Chile.`,
    }));
    fragments[3] = {
      id: 'frag:1209272:4',
      article: 'Artículo 4',
      text: 'El titular de datos personales tiene derecho a acceso, rectificación, supresión, oposición, portabilidad y bloqueo.',
    };
    const source = { ...ley21719(), metadata: { ...ley21719().metadata, fragments } };
    const result = selectSourcesForContext({
      sources: [source],
      query,
      intentClass: 'ARTICLE_LOOKUP',
    });
    expect(result.stats.fragments_before).toBe(24);
    // El formateador solo muestra hasta 3 fragmentos por fuente.
    expect(result.stats.fragments_after).toBeLessThanOrEqual(3);
    // El orden conserva el artículo citado primero y TODOS los ids intactos.
    const ordered = orderSourceFragments(source, query);
    expect(ordered.metadata.fragments.length).toBe(24);
    expect(ordered.metadata.fragments[0].article).toMatch(/Art[ií]culo 4\b/);
    expect(result.tooLarge).toBe(false);
  });

  it('C10: sin evidencia → no inventa selección', () => {
    const query = '¿Qué establece la Ley 21.719?';
    const result = selectSourcesForContext({
      sources: [metadataOnlyLaw()],
      query,
      intentClass: 'BARE_NORM_CITATION',
    });
    expect(result.sources).toEqual([]);
    expect(result.tooLarge).toBe(false);
    expect(result.stats.sources_after).toBe(0);
  });

  it('C11: contexto todavía demasiado grande → conserva CONTEXT_TOO_LARGE (fail-safe)', () => {
    const query =
      '¿Qué relación existe entre el artículo 4 de la Ley 21.719 y la autodeterminación informativa según el Tribunal Constitucional?';
    const sources = [
      { ...ley21719(), excerpt: 'X'.repeat(1200) },
      tc(9666, bigExcerpt(9666)),
    ];
    const result = selectSourcesForContext({
      sources,
      query,
      intentClass: 'RELATIONAL_LEGAL_QUERY',
      maxContextChars: 2000,
    });
    // Ni el núcleo mínimo (ambos polos) cabe: se reporta tooLarge en vez de
    // eliminar evidencia crítica o inventar. La ruta lo traduce a 422.
    expect(result.tooLarge).toBe(true);
    expect(result.sources.length).toBeGreaterThanOrEqual(1);
  });

  it('C12: relacional con polo faltante → no fabrica el segundo polo', () => {
    const query =
      '¿Qué relación existe entre el artículo 4 de la Ley 21.719 y la autodeterminación informativa según el Tribunal Constitucional?';
    const sources = [ley21719(), ley21713()];
    const result = selectSourcesForContext({ sources, query, intentClass: 'RELATIONAL_LEGAL_QUERY' });
    expect(result.sources.every((s) => s.kind === 'normativa')).toBe(true);
    expect(result.sources.some((s) => s.kind === 'jurisprudencia')).toBe(false);
    expect(result.stats.poles_preserved).toBe(true);
  });

  it('C13: intent general → comportamiento conservador dentro del presupuesto', () => {
    const query = '¿Qué dice la ley chilena sobre la protección de datos personales?';
    const sources = [
      ley21719(),
      tc(9666, bigExcerpt(9666)),
      tc(9511, bigExcerpt(9511)),
      doctrina('doctrina-1', 'La autodeterminación informativa como derecho fundamental en la doctrina chilena.'),
    ];
    const result = selectSourcesForContext({ sources, query, intentClass: 'GENERAL_LEGAL_QUERY' });
    expect(result.tooLarge).toBe(false);
    expect(result.context.length).toBeLessThan(JURISPRUDENCE_LIMITS.MAX_CONTEXT_CHARS);
    // Conservador: se conserva al menos la fuente mejor rankeada y el conjunto
    // equilibra tipos sin descartar todo.
    expect(result.sources.length).toBeGreaterThan(0);
    expect(result.stats.sources_after).toBeLessThanOrEqual(result.stats.sources_before);
  });

  it('C14: determinismo — misma entrada → misma selección', () => {
    const query =
      '¿Qué relación existe entre el artículo 4 de la Ley 21.719 y la autodeterminación informativa según el Tribunal Constitucional?';
    const sources = [ley21719(), tc(9666, bigExcerpt(9666)), tc(9511, bigExcerpt(9511))];
    const a = selectSourcesForContext({ sources, query, intentClass: 'RELATIONAL_LEGAL_QUERY' });
    const b = selectSourcesForContext({ sources, query, intentClass: 'RELATIONAL_LEGAL_QUERY' });
    expect(a.sources.map((s) => s.id)).toEqual(b.sources.map((s) => s.id));
    expect(a.context).toBe(b.context);
    expect(a.stats).toEqual(b.stats);
  });

  it('C15: trazabilidad — los claims siguen apuntando a source/fragment ids válidos', () => {
    const query = '¿Qué establece el artículo 4 de la Ley 21.719?';
    const source = ley21719();
    const result = selectSourcesForContext({ sources: [source], query, intentClass: 'ARTICLE_LOOKUP' });

    const outcome = buildJurisprudenceOutcome({
      data: {
        resumen: 'La ley regula los datos personales.',
        normativa: [
          {
            fuente_id: 'bcn-1209272',
            fragment_id: 'frag:1209272:3',
            afirmacion:
              'El titular de datos personales tiene derecho a acceso, rectificación, supresión, oposición, portabilidad y bloqueo.',
            fragmento: 'acceso, rectificación, supresión, oposición, portabilidad y bloqueo',
          },
        ],
        jurisprudencia: [],
        doctrina: [],
        advertencias: [],
      },
      sources: result.sources,
      intent: 'normativa',
      query,
    });

    expect(outcome.outcome).toBe('SUCCESS');
    expect(outcome.allVerifiedClaims[0].source_id).toBe('bcn-1209272');
    expect(outcome.allVerifiedClaims[0].fragment_id).toBe('frag:1209272:3');
    // El fragmento anclado existe en la fuente seleccionada.
    expect(
      result.sources[0].metadata.fragments.some((f) => f.id === 'frag:1209272:3'),
    ).toBe(true);
  });
});

describe('Fase 4.2.5 · helpers de selección', () => {
  it('rankSourcesForContext ordena por evidencia y artículo citado', () => {
    const ranked = rankSourcesForContext([ley21713(), ley21719()], {
      query: '¿Qué establece el artículo 4 de la Ley 21.719?',
      intentClass: 'ARTICLE_LOOKUP',
    });
    expect(ranked[0].source.id).toBe('bcn-1209272');
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
  });

  it('CONTEXT_SELECTION define presupuesto explícito con margen', () => {
    expect(CONTEXT_SELECTION.HEADROOM_RATIO).toBeGreaterThan(0);
    expect(CONTEXT_SELECTION.HEADROOM_RATIO).toBeLessThan(1);
  });
});
