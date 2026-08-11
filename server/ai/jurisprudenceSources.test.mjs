import { describe, it, expect } from 'vitest';
import {
  extractLawNumber,
  extractArticleNumbers,
  htmlToPlainText,
  splitLawArticles,
  rankFragments,
  buildVigenciaDetail,
  formatChileanDate,
  detectNormVigency,
  formatNormNumber,
  fragmentSupportsClaim,
  resolveClaimFragment,
  isBcnNormaRelevantToQuery,
  selectNormativeFragments,
  validateResearchQuery,
  isSourceRelevantToQuery,
  isSubstantiveNormativeEvidence,
  hasSubstantiveNormativeEvidence,
} from './jurisprudenceSources.mjs';

describe('extractLawNumber', () => {
  it('detecta el número en "Ley 21.719"', () => {
    expect(extractLawNumber('¿Qué establece la Ley 21.719 sobre protección de datos personales?')).toContain('21719');
  });
  it('detecta "Ley N° 21.719"', () => {
    expect(extractLawNumber('Ley N° 21.719')).toContain('21719');
  });
  it('detecta "Ley Nº 21.719" (con ordinal femenino)', () => {
    expect(extractLawNumber('Ley Nº 21.719')).toContain('21719');
  });
  it('detecta "ley 21719" sin puntuación', () => {
    expect(extractLawNumber('ley 21719')).toContain('21719');
  });
  it('detecta preguntas con número de ley', () => {
    expect(extractLawNumber('¿Qué derechos reconoce la Ley 21.719?')).toContain('21719');
  });
  it('detecta otras leyes (Ley 19.628)', () => {
    expect(extractLawNumber('Ley 19.628')).toContain('19628');
  });
  it('devuelve vacío para una consulta general sin número de ley', () => {
    expect(extractLawNumber('consulta general sobre protección de datos sin número de ley')).toEqual([]);
  });
  it('devuelve vacío para frases sin numeración', () => {
    expect(extractLawNumber('La declaración de cumplimiento')).toEqual([]);
  });
});

describe('extractArticleNumbers', () => {
  it('detecta "artículo 4"', () => {
    expect(extractArticleNumbers('Los derechos reconocidos en el artículo 4 de la Ley 21.719')).toEqual(['4']);
  });
  it('detecta "art. 14" con abreviatura', () => {
    expect(extractArticleNumbers('Ver art. 14 de la ley.')).toEqual(['14']);
  });
  it('detecta "Artículo 30 bis" (número base)', () => {
    expect(extractArticleNumbers('Artículo 30 bis')).toEqual(['30']);
  });
  it('detecta "Artículo primero" (ordinal)', () => {
    expect(extractArticleNumbers('Artículo primero')).toEqual(['1']);
  });
  it('devuelve vacío sin cita de artículo', () => {
    expect(extractArticleNumbers('la relación entre la ley y la autodeterminación informativa')).toEqual([]);
  });
});

describe('detectNormVigency', () => {
  it('usa la vigencia diferida reportada por BCN', () => {
    expect(
      detectNormVigency('REGULA ...', {
        derogado: false,
        tipoVersionS: 'Con Vigencia Diferida por Fecha',
        inicioVigencia: '2026-12-01',
      }),
    ).toBe('diferida');
  });
  it('marca como derogada cuando BCN lo indica', () => {
    expect(detectNormVigency('Título', { derogado: true })).toBe('derogada');
  });
  it('no inventa vigente cuando BCN no aporta información', () => {
    expect(detectNormVigency('REGULA ALGO SIN INDICIOS')).toBe('desconocida');
  });
  it('sigue usando el título como pista de menor confianza', () => {
    expect(detectNormVigency('TEXTO REFUNDIDO Y ACTUALIZADO ...')).toBe('vigente');
  });
});

describe('formatNormNumber', () => {
  it('formatea números de ley en formato chileno (21719 → 21.719)', () => {
    expect(formatNormNumber('21719')).toBe('21.719');
    expect(formatNormNumber('19628')).toBe('19.628');
    expect(formatNormNumber('11207')).toBe('11.207');
  });
  it('conserva separadores ya presentes y números cortos', () => {
    expect(formatNormNumber('21.719')).toBe('21.719');
    expect(formatNormNumber('4')).toBe('4');
  });
});

describe('buildVigenciaDetail / formatChileanDate', () => {
  it('diferencia publicación de entrada en vigencia (01-DIC-2026)', () => {
    expect(
      buildVigenciaDetail({
        tipo_version_s: 'Con Vigencia Diferida por Fecha',
        fecha_publicacion: '2024-12-13',
        vigencia: { inicio_vigencia: '2026-12-01' },
      }),
    ).toBe('Con Vigencia Diferida por Fecha · entra en vigencia el 01-DIC-2026 · publicada el 2024-12-13');
  });
  it('da formato chileno a la fecha', () => {
    expect(formatChileanDate('2026-12-01')).toBe('01-DIC-2026');
  });
});

describe('htmlToPlainText', () => {
it('decodifica entidades y quita tags', () => {
    const out = htmlToPlainText('<div><p>Art&#xED;culo 1&#176;.- Protecci&oacute;n de datos</p></div>');
    expect(out).toContain('Artículo 1°');
    expect(out).toContain('Protección');
    expect(out).not.toContain('<p>');
    expect(out).not.toContain('&#xED;');
  });
});

describe('splitLawArticles', () => {
  it('separa artículos de número y ordinal conservando etiqueta y texto', () => {
    const frags = splitLawArticles(
      'Artículo primero.- Introduce modificaciones a la ley. Artículo 2°.- Establece el tratamiento. Art. 3.- Regula otra materia.',
    );
    expect(frags.length).toBe(3);
    expect(frags[0].article).toBe('Artículo primero');
    expect(frags[1].article).toMatch(/Artículo 2/);
    expect(frags[1].text).toContain('tratamiento');
  });
  it('devuelve un solo fragmento "Preámbulo" sin artículos', () => {
    const frags = splitLawArticles('Teniendo presente que el H. Congreso aprueba...');
    expect(frags).toHaveLength(1);
    expect(frags[0].article).toBe('Preámbulo');
  });
});

describe('rankFragments', () => {
  it('prioriza fragmentos con CONCEPTOS sustantivos sobre los que solo tienen términos genéricos', () => {
    const frags = [
      { article: 'Artículo 1', text: 'tratamiento de datos personales de los titulares, con plenas garantías.' },
      { article: 'Artículo 2', text: 'derechos de supresión y portabilidad de datos personales' },
      { article: 'Artículo 3', text: 'normas sobre consumo y publicidad' },
    ];
    const ranked = rankFragments('derecho de supresión y portabilidad sobre datos personales', frags, { limit: 3 });
    // El Art. 2 contiene los conceptos sustantivos (supresión, portabilidad) y
    // debe quedar primero, por encima del Art. 1 que solo menciona genéricos.
    expect(ranked[0].article).toBe('Artículo 2');
  });
});

// ---------------------------------------------------------------------------
// Fase 4.0.4 — Alineación exacta afirmación ↔ fragmento
// ---------------------------------------------------------------------------

const ley21719Fragments = [
  {
    id: 'frag:1209272:f1',
    article: 'Artículo 2',
    text: 'Derechos de los titulares: toda persona tiene derecho a acceso, rectificación, supresión, oposición, portabilidad y bloqueo de sus datos personales.',
  },
  {
    id: 'frag:1209272:f2',
    article: 'Artículo 14',
    text: 'El tratamiento de datos personales efectuado por organismos públicos se sujetará a las normas de esta ley.',
  },
  {
    id: 'frag:1209272:f3',
    article: 'Artículo 5',
    text: 'El responsable del tratamiento deberá informar de manera clara y verificable al titular de datos personales.',
  },
];

describe('fragmentSupportsClaim', () => {
  it('afirmación sobre derechos de titulares respaldada por el fragmento que los lista', () => {
    const af = 'La ley reconoce el derecho de acceso, rectificación, supresión, oposición, portabilidad y bloqueo a los titulares';
    expect(fragmentSupportsClaim(ley21719Fragments[0], af)).toBe(true);
  });
  it('un fragmento sobre organismos públicos NO respalda la lista de derechos', () => {
    const af = 'La ley reconoce el derecho de acceso, rectificación, supresión, oposición, portabilidad y bloqueo a los titulares';
    expect(fragmentSupportsClaim(ley21719Fragments[1], af)).toBe(false);
  });
  it('deber de información queda respaldado por el fragmento de información al titular', () => {
    const af = 'El responsable debe informar al titular de datos personales el tratamiento';
    expect(fragmentSupportsClaim(ley21719Fragments[2], af)).toBe(true);
  });
  it('no respalda con menos de dos términos significativos', () => {
    expect(fragmentSupportsClaim(ley21719Fragments[0], 'y pues')).toBe(false);
  });

  // Fase 4.0.4 fix — falso positivo de términos genéricos
  it('NO respalda una enumeración de derechos con un fragmento que solo habla de "derechos que se reconocen a los titulares"', () => {
    const claim =
      'La Ley 21.719 reconoce los derechos de acceso, rectificación, supresión, oposición, portabilidad y bloqueo.';
    const genericFragment =
      '...permitan el ejercicio de los derechos que se reconocen a los titulares...';
    expect(fragmentSupportsClaim(genericFragment, claim)).toBe(false);
  });
  it('respaldar la enumeración de derechos con el fragmento del artículo que enumera esos derechos', () => {
    const claim =
      'La Ley 21.719 reconoce los derechos de acceso, rectificación, supresión, oposición, portabilidad y bloqueo.';
    const articulo4 =
      'Artículo 4. Toda persona tiene derecho de acceso, rectificación, supresión, oposición, portabilidad y bloqueo de sus datos personales.';
    expect(fragmentSupportsClaim(articulo4, claim)).toBe(true);
  });
  it('no respalda un claim de 6 derechos con un fragmento que solo enumera 5 (falta uno)', () => {
    const claim =
      'La Ley 21.719 reconoce los derechos de acceso, rectificación, supresión, oposición, portabilidad y bloqueo.';
    const cincoDeSeis =
      'En esta ley se reconocen los derechos de acceso, rectificación, supresión, oposición y portabilidad de los datos personales.';
    expect(fragmentSupportsClaim(cincoDeSeis, claim)).toBe(false);
  });
  it('no respalda un claim específico con un fragmento que solo contiene términos genéricos', () => {
    const claim = 'El titular puede solicitar la portabilidad de sus datos personales.';
    const generic =
      'disposiciones sobre el tratamiento de datos de los titulares, incorporadas en la presente ley.';
    expect(fragmentSupportsClaim(generic, claim)).toBe(false);
    expect(fragmentSupportsClaim('el titular tiene derecho de portabilidad de sus datos personales', claim)).toBe(true);
  });
});

describe('resolveClaimFragment', () => {
  it('elige el fragmento de los derechos de los titulares (no el de organismos)', () => {
    const af = 'La ley reconoce el derecho de acceso, rectificación, supresión, oposición, portabilidad y bloqueo a los titulares';
    const resolved = resolveClaimFragment(af, ley21719Fragments);
    expect(resolved).not.toBeNull();
    expect(resolved.id).toBe('frag:1209272:f1');
    expect(resolved.article).toBe('Artículo 2');
  });
  it('objeto de la Ley: asocia al fragmento que regula el objeto de la materia', () => {
    const fragments = [
      { id: 'F1', article: 'Artículo 1', text: 'El objeto de esta ley es regular el tratamiento de datos personales en igualdad de condiciones.' },
      { id: 'F2', article: 'Artículo 14', text: 'Regulación sobre organismos públicos y su cumplimiento.' },
    ];
    const resolved = resolveClaimFragment('El objeto de la ley es regular el tratamiento de datos personales', fragments);
    expect(resolved?.id).toBe('F1');
  });
  it('supresión: elige el fragmento que menciona supresión de datos personales', () => {
    const fragments = [
      { id: 'F1', article: 'Artículo 2', text: 'derechos de acceso, rectificación, supresión y oposición de los datos personales' },
      { id: 'F2', article: 'Artículo 9', text: 'tratamiento de datos por fuerzas de orden y seguridad' },
    ];
    const resolved = resolveClaimFragment('El titular puede solicitar la supresión de sus datos personales', fragments);
    expect(resolved?.id).toBe('F1');
  });
  it('devuelve null cuando ningún fragmento respalda la afirmación', () => {
    const af = 'indemnización por despido injustificado del trabajador';
    expect(resolveClaimFragment(af, ley21719Fragments)).toBeNull();
  });
  it('con un fragmento genérico de "derechos que se reconocen" y el artículo 4, elige el artículo 4', () => {
    const fragments = [
      {
        id: 'frag:1209272:f5',
        article: 'Artículo 14 quinquies',
        text: 'permitan el ejercicio de los derechos que se reconocen a los titulares en la presente ley.',
      },
      {
        id: 'frag:1209272:f4',
        article: 'Artículo 4',
        text: 'Toda persona tiene derecho de acceso, rectificación, supresión, oposición, portabilidad y bloqueo de sus datos personales.',
      },
    ];
    const claim =
      'La Ley 21.719 reconoce los derechos de acceso, rectificación, supresión, oposición, portabilidad y bloqueo.';
    const resolved = resolveClaimFragment(claim, fragments);
    expect(resolved).not.toBeNull();
    expect(resolved.id).toBe('frag:1209272:f4');
    expect(resolved.article).toBe('Artículo 4');
  });
  it('obligación concreta: elige el fragmento que contiene la obligación sustantiva, no el genérico', () => {
    const fragments = [
      { id: 'F1', article: 'Artículo 14', text: 'El responsable, sin perjuicio de las demás disposiciones, tiene las siguientes obligaciones.' },
      { id: 'F2', article: 'Artículo 14 a)', text: 'Informar y poner a disposición del titular los antecedentes que acrediten la licitud del tratamiento de datos que realiza.' },
    ];
    const claim = 'El responsable debe informar al titular los antecedentes que acrediten la licitud del tratamiento.';
    const resolved = resolveClaimFragment(claim, fragments);
    expect(resolved).not.toBeNull();
    expect(resolved.id).toBe('F2');
  });
  it('excepción: un fragmento que solo enumera "excepciones" no respalda el contenido sustantivo de la excepción', () => {
    const fragments = [
      { id: 'F1', article: 'Artículo 5', text: 'En los casos que esta ley contempla se reconocen excepciones al tratamiento de datos de los titulares.' },
      { id: 'F2', article: 'Artículo 5 b)', text: 'No se requerirá el consentimiento del titular cuando el tratamiento tenga por objeto la prevención del fraude.' },
    ];
    const claim = 'No se requiere el consentimiento para el tratamiento cuyo objeto sea la prevención del fraude.';
    const resolved = resolveClaimFragment(claim, fragments);
    expect(resolved).not.toBeNull();
    expect(resolved.id).toBe('F2');
  });
});

// ---------------------------------------------------------------------------
// Fase 4.1.12 — Gate de relevancia para la promoción automática de normativa
// ---------------------------------------------------------------------------

describe('Fase 4.1.12 · isBcnNormaRelevantToQuery', () => {
  const ley21719 = {
    id: 'bcn-21719',
    kind: 'normativa',
    source_type: 'normativa',
    legal_authority: 'vinculante',
    norm_type: 'ley',
    norm_number: '21.719',
    title: 'Ley 21.719',
    excerpt:
      'Derechos de los titulares: toda persona tiene derecho a acceso, rectificación, supresión, oposición, portabilidad y bloqueo de sus datos personales.',
    metadata: { leychileCode: '1209272' },
  };
  const ley21569 = {
    id: 'bcn-21569',
    kind: 'normativa',
    source_type: 'normativa',
    legal_authority: 'vinculante',
    norm_type: 'ley',
    norm_number: '21.569',
    title:
      'PERMITE EL USO DE CÉDULAS DE IDENTIDAD Y PASAPORTES PARA EFECTOS DE IDENTIFICAR A LOS ELECTORES EN LAS ELECCIONES Y PLEBISCITOS QUE INDICA',
    excerpt:
      'Cédulas de identidad y pasaportes para identificar a los electores en las elecciones y plebiscitos.',
    metadata: { leychileCode: '1234567' },
  };

  it('Ley 21.569 NO es relevante para la consulta de teletransportación cuántica', () => {
    const query =
      '¿Qué efectos jurídicos tiene actualmente en Chile la regulación de la teletransportación cuántica de personas?';
    expect(isBcnNormaRelevantToQuery(query, ley21569)).toBe(false);
  });

  it('consulta absurda: ninguna ley es relevante', () => {
    const query = '¿Qué regulación chilena existe sobre teletransportación cuántica de personas?';
    expect(isBcnNormaRelevantToQuery(query, ley21569)).toBe(false);
    expect(isBcnNormaRelevantToQuery(query, ley21719)).toBe(false);
  });

  it('Ley 21.719 es relevante cuando la consulta cita su número oficial', () => {
    const query = '¿Qué derechos reconoce la Ley 21.719 a los titulares de datos personales?';
    expect(isBcnNormaRelevantToQuery(query, ley21719)).toBe(true);
  });

  it('Ley 21.719 es relevante por señal de contenido (protección de datos personales)', () => {
    expect(isBcnNormaRelevantToQuery('¿qué ley regula la protección de datos personales?', ley21719)).toBe(true);
    expect(isBcnNormaRelevantToQuery('¿qué ley regula la protección de datos personales?', ley21569)).toBe(false);
  });

  it('las palabras genéricas por sí solas NO hacen relevante una norma', () => {
    const leyGenerica = {
      kind: 'normativa',
      source_type: 'normativa',
      norm_type: 'ley',
      norm_number: '22.000',
      title: 'MODIFICA DISPOSICIONES SOBRE DERECHOS Y OBLIGACIONES',
      excerpt:
        'Establece los derechos y las obligaciones de los titulares en el marco de la regulación vigente en Chile.',
      metadata: { leychileCode: '999999' },
    };
    expect(
      isBcnNormaRelevantToQuery('¿qué normativa regula los derechos de los titulares en Chile?', leyGenerica),
    ).toBe(false);
  });

  it('rechaza fuentes que no son normativa', () => {
    expect(isBcnNormaRelevantToQuery('protección de datos personales', { kind: 'jurisprudencia' })).toBe(false);
    expect(isBcnNormaRelevantToQuery('', ley21719)).toBe(false);
  });

  // Fase 4.1.15 — el número oficial citado NO basta cuando el tema sustantivo
  // es incompatible con la materia de la norma.
  it('NO es relevante cuando el tema sustantivo contradice la norma aunque cite el número (divorcio ≠ datos personales)', () => {
    expect(isBcnNormaRelevantToQuery('¿puedo divorciarme según la Ley 21.719?', ley21719)).toBe(false);
    expect(isBcnNormaRelevantToQuery('¿qué dice la Ley 21.719 sobre divorcio y separación de bienes?', ley21719)).toBe(false);
    expect(isBcnNormaRelevantToQuery('¿divorcio? ¿aplica la Ley 21.719?', ley21719)).toBe(false);
  });

  it('una cita DESNUDA del número oficial sigue siendo señal suficiente', () => {
    expect(isBcnNormaRelevantToQuery('Ley 21.719', ley21719)).toBe(true);
    expect(isBcnNormaRelevantToQuery('¿qué dice la Ley 21.719?', ley21719)).toBe(true);
  });

  it('el número citado no cuenta como término de contenido para el gate global', () => {
    // El número "21.719" aparece en el título de la norma; de contarse como
    // señal de contenido, "divorcio + Ley 21.719" pasaría el gate.
    const tituloConNumero = {
      ...ley21719,
      title: 'Ley N° 21.719 REGULA LA PROTECCIÓN DE LOS DATOS PERSONALES',
    };
    expect(isBcnNormaRelevantToQuery('¿puedo divorciarme según la Ley 21.719?', tituloConNumero)).toBe(false);
    expect(isBcnNormaRelevantToQuery('¿qué derechos reconoce la Ley 21.719 a los titulares?', tituloConNumero)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Fase 4.1.12 — Preservación de fragmentos normativos
// ---------------------------------------------------------------------------

describe('Fase 4.1.12 · selectNormativeFragments (preservación)', () => {
  const fragments = [
    {
      id: 'frag:1209272:f1',
      article: 'Artículo 1',
      text: 'Objeto: regular el tratamiento de datos personales conforme a las disposiciones de esta ley.',
    },
    {
      id: 'frag:1209272:f2',
      article: 'Artículo 2',
      text: 'Definiciones: dato personal, titular, responsable, encargado y tratamiento de datos personales.',
    },
    {
      id: 'frag:1209272:f4',
      article: 'Artículo 4',
      text: 'Derechos del titular de datos personales: toda persona tiene derecho a acceso, rectificación, supresión, oposición, portabilidad y bloqueo de sus datos personales.',
    },
    {
      id: 'frag:1209272:f5',
      article: 'Artículo 5',
      text: 'El responsable deberá informar al titular de datos personales sobre el tratamiento de sus datos.',
    },
    {
      id: 'frag:1209272:f6',
      article: 'Artículo 6',
      text: 'Principios: licitud, finalidad, proporcionalidad, calidad y seguridad de los datos personales.',
    },
    {
      id: 'frag:1209272:f14',
      article: 'Artículo 14',
      text: 'El tratamiento efectuado por organismos públicos se sujetará a las normas de esta ley.',
    },
    // Artículo que cita al Tribunal Constitucional como referencia cruzada:
    // su texto NO debe desplazar el Artículo 4 cuando la consulta es sobre los
    // derechos de los titulares (Fase 4.1.12).
    {
      id: 'frag:1209272:f30bis',
      article: 'Artículo 30 bis',
      text: 'Funciones de la Agencia de Protección de Datos Personales y requerimientos ante el Tribunal Constitucional.',
    },
  ];

  it('consulta normativa pura: conserva el fragmento del Artículo 4 (derechos del titular)', () => {
    const selected = selectNormativeFragments('¿Qué derechos reconoce la Ley 21.719?', fragments, { limit: 6 });
    expect(selected.map((f) => f.id)).toContain('frag:1209272:f4');
  });

  it('consulta combinada (TC): el Artículo 4 se preserva y el verifier puede resolver claim → fragment_id', () => {
    const query =
      '¿Qué establece la Ley 21.719 sobre los derechos de los titulares de datos personales y qué jurisprudencia del Tribunal Constitucional de Chile existe sobre la protección de datos personales?';
    const selected = selectNormativeFragments(query, fragments, { limit: 6 });
    // El Art. 4 debe quedar dentro del top-3 visible al modelo (preservado al frente).
    expect(selected.map((f) => f.id).slice(0, 3)).toContain('frag:1209272:f4');
    const resolved = resolveClaimFragment(
      'La ley reconoce a los titulares el derecho de acceso, rectificación, supresión, oposición, portabilidad y bloqueo de sus datos personales',
      selected,
    );
    expect(resolved).not.toBeNull();
    expect(resolved.id).toBe('frag:1209272:f4');
  });

  it('preservación generalizable por contenido, no por ID específico', () => {
    const otras = [
      { id: 'frag:X1', article: 'Artículo 1', text: 'materia de la ley' },
      {
        id: 'frag:X4',
        article: 'Artículo 4',
        text: 'Derechos del titular de datos personales: acceso, rectificación, supresión y portabilidad de sus datos personales.',
      },
      { id: 'frag:X5', article: 'Artículo 5', text: 'deber de información al titular de datos personales' },
      { id: 'frag:X6', article: 'Artículo 6', text: 'principios de licitud, finalidad y calidad de los datos' },
    ];
    const selected = selectNormativeFragments('¿Qué derechos reconoce la Ley 21.719?', otras, { limit: 6 });
    expect(selected.map((f) => f.id)).toContain('frag:X4');
  });

  it('no enriquece cuando la consulta no coincide con la norma', () => {
    expect(selectNormativeFragments('indemnización por despido injustificado del trabajador', fragments, { limit: 6 })).toEqual([]);
    expect(selectNormativeFragments('', fragments, { limit: 6 })).toEqual([]);
  });

  it('consulta por cita expresa de ARTÍCULO conserva ese fragmento aunque la materia no coincida', () => {
    const query = 'Necesito analizar el artículo 4 frente a la autodeterminación informativa del Tribunal Constitucional.';
    const selected = selectNormativeFragments(query, fragments, { limit: 6 });
    expect(selected.map((f) => f.id)).toContain('frag:1209272:f4');
  });
});

describe('Fase 4.1.13 · validateResearchQuery (QUERY_TOO_VAGUE)', () => {
  const INVALID = { valid: false, code: 'QUERY_TOO_VAGUE' };
  const VALID = { valid: true };

  it('query vacía y solo espacios → QUERY_TOO_VAGUE', () => {
    expect(validateResearchQuery('')).toEqual(INVALID);
    expect(validateResearchQuery('   ')).toEqual(INVALID);
    expect(validateResearchQuery(null)).toEqual(INVALID);
    expect(validateResearchQuery(undefined)).toEqual(INVALID);
  });

  it('solo selección de fuentes → QUERY_TOO_VAGUE (TEST 1)', () => {
    expect(validateResearchQuery('Fuentes: Tribunal Constitucional · BCN/LeyChile · Doctrina académica.')).toEqual(INVALID);
  });

  it('solo etiquetas de fuente → QUERY_TOO_VAGUE (TEST 2 y TEST 4.D)', () => {
    expect(validateResearchQuery('BCN/LeyChile')).toEqual(INVALID);
    expect(validateResearchQuery('Tribunal Constitucional')).toEqual(INVALID);
    expect(validateResearchQuery('Doctrina académica')).toEqual(INVALID);
    expect(validateResearchQuery('Jurisprudencia')).toEqual(INVALID);
    expect(validateResearchQuery('Ley')).toEqual(INVALID);
    expect(validateResearchQuery('Fuentes: BCN/LeyChile.')).toEqual(INVALID);
  });

  it('texto excesivamente genérico → QUERY_TOO_VAGUE (TEST 4.E)', () => {
    expect(validateResearchQuery('Datos personales')).toEqual(INVALID);
    expect(validateResearchQuery('Protección de datos personales')).toEqual(INVALID);
  });

  it('pregunta jurídica válida → valid (TEST 3)', () => {
    expect(validateResearchQuery('¿Qué derechos reconoce la Ley N° 21.719 a los titulares de datos personales según su artículo 4°?')).toEqual(VALID);
    expect(validateResearchQuery('¿Qué dice el artículo 19 N° 4 de la Constitución?')).toEqual(VALID);
  });

  it('consulta que nombra una ley específica → valid aunque sea breve', () => {
    expect(validateResearchQuery('Ley 21.719')).toEqual(VALID);
    expect(validateResearchQuery('Ley N° 21.719')).toEqual(VALID);
  });

  it('pregunta combinada normativa + jurisprudencia → valid (TEST 6)', () => {
    expect(validateResearchQuery('¿Qué establece la Ley N° 21.719 sobre los derechos de los titulares de datos personales y qué ha señalado el Tribunal Constitucional sobre la protección de datos personales y la autodeterminación informativa?')).toEqual(VALID);
  });

  it('consulta absurda pero sintácticamente válida → valid (TEST 4.H / teletransportación)', () => {
    expect(validateResearchQuery('¿Qué efectos jurídicos tiene actualmente en Chile la regulación de la teletransportación cuántica de personas?')).toEqual(VALID);
  });

  it('pregunta genérica sin materia → pasa validación (la relevancia decide después)', () => {
    expect(validateResearchQuery('¿Qué regula la normativa?')).toEqual(VALID);
  });

  it('materia concreta sin pregunta ni número de ley → valid', () => {
    expect(validateResearchQuery('indemnización de perjuicios por violación de datos personales')).toEqual(VALID);
    expect(validateResearchQuery('obligaciones de las empresas que tratan datos personales de clientes')).toEqual(VALID);
  });
});

describe('Fase 4.1.13 · relevance gate (isSourceRelevantToQuery)', () => {
  const teleportQuery = '¿Qué efectos jurídicos tiene actualmente en Chile la regulación de la teletransportación cuántica de personas?';
  const ley21719Query = '¿Qué derechos reconoce la Ley N° 21.719 a los titulares de datos personales según su artículo 4°?';

  const bcnNorma = (extra = {}) => ({
    id: 'bcn-1191771',
    kind: 'normativa',
    source_type: 'normativa',
    norm_type: 'ley',
    norm_number: '21.569',
    title: 'Ley N° 21.569',
    excerpt: 'idNorma 1191771 · Ley N° 21.569 · Norma vigente',
    metadata: { leychileCode: '1191771' },
    ...extra,
  });

  it('teletransportación NO hace relevante a Ley 21.569 (TEST 4: nunca Ley 21.569)', () => {
    expect(isSourceRelevantToQuery(teleportQuery, bcnNorma())).toBe(false);
  });

  it('Ley 21.719 sí es relevante a su consulta (TEST 5)', () => {
    const ley21719 = {
      ...bcnNorma({
        id: 'bcn-1209272',
        norm_number: '21.719',
        title: 'Ley N° 21.719',
        excerpt:
          'Ley 21.719 — Derechos de los titulares: toda persona tiene derecho a acceso, rectificación, supresión, oposición, portabilidad y bloqueo de sus datos personales.',
        metadata: { leychileCode: '1209272' },
      }),
    };
    expect(isSourceRelevantToQuery(ley21719Query, ley21719)).toBe(true);
  });

  it('un único término genérico/incidental no hace relevante una fuente (TEST 9)', () => {
    // "efectos" aparece en la consulta y en la cita, pero es genérico: no basta.
    expect(isSourceRelevantToQuery(teleportQuery, bcnNorma())).toBe(false);
    expect(isSourceRelevantToQuery('¿Qué regula la normativa?', bcnNorma())).toBe(false);
  });

  it('norma relevante por términos de dominio en el título → relevante', () => {
    const leyDatos = bcnNorma({
      id: 'bcn-1209272',
      norm_number: '21.719',
      title: 'Ley N° 21.719 REGULA LA PROTECCIÓN DE LOS DATOS PERSONALES',
    });
    expect(isSourceRelevantToQuery('¿Qué regula la protección de datos personales en Chile?', leyDatos)).toBe(true);
  });

  it('jurisprudencia sin términos sustantivos de la consulta → no relevante', () => {
    const tc = {
      id: 'tc-2800',
      kind: 'jurisprudencia',
      source_type: 'jurisprudencia',
      title: 'Rol 2800',
      citation: 'Tribunal Constitucional — Rol 2800',
      excerpt: 'Sobre la aplicación de la ley en el tiempo y los efectos de la sentencia.',
    };
    expect(isSourceRelevantToQuery(teleportQuery, tc)).toBe(false);
  });

  it('jurisprudencia con el término sustantivo en el extracto → relevante', () => {
    const tcDatos = {
      id: 'tc-5174',
      kind: 'jurisprudencia',
      source_type: 'jurisprudencia',
      title: 'Rol 5174',
      citation: 'Tribunal Constitucional — Rol 5174',
      excerpt: 'Establece que la protección de los datos personales es un derecho fundamental.',
    };
    expect(isSourceRelevantToQuery('¿qué ha dicho la jurisprudencia sobre la protección de datos personales?', tcDatos)).toBe(true);
  });

  it('doctrina sin términos sustantivos → no relevante', () => {
    const doc = {
      id: 'doctrina-1',
      kind: 'doctrina',
      source_type: 'doctrina',
      title: 'La ejecución del acuerdo de mediación en asuntos civiles y comerciales.',
      citation: 'Autor. (2018). La ejecución del acuerdo de mediación.',
      excerpt: 'Doctrina (no vinculante) — análisis de la mediación civil.',
    };
    expect(isSourceRelevantToQuery('¿qué obligaciones tienen las empresas que tratan datos personales de clientes?', doc)).toBe(false);
  });

  it('doctrina con el término sustantivo → relevante', () => {
    const doc = {
      id: 'doctrina-2',
      kind: 'doctrina',
      source_type: 'doctrina',
      title: 'Interés legítimo y tratamiento de datos personales: antecedentes comparados.',
      citation: 'P. Contreras. (2019). Interés legítimo y tratamiento de datos personales.',
      excerpt: 'Doctrina (no vinculante) — el consentimiento en el tratamiento de datos personales.',
    };
    expect(isSourceRelevantToQuery('¿qué obligaciones tienen las empresas que tratan datos personales de clientes?', doc)).toBe(true);
  });

  it('sin query o sin fuente → no relevante', () => {
    expect(isSourceRelevantToQuery('', bcnNorma())).toBe(false);
    expect(isSourceRelevantToQuery('consulta de prueba', null)).toBe(false);
  });
});

describe('Fase 4.1.16 · evidencia sustantiva de normativa', () => {
  const substantive = {
    kind: 'normativa',
    excerpt:
      'Derechos de los titulares: toda persona tiene derecho a acceso, rectificación, supresión, oposición, portabilidad y bloqueo de sus datos personales.',
  };
  const metadataOnly = {
    kind: 'normativa',
    excerpt: 'idNorma 1191771 · Ley N° 21.569 · Publicada el 10-ene-2024 · Norma vigente',
  };
  const promulgation = { kind: 'normativa', excerpt: 'Teniendo presente que el H. Congreso Nacional ha dado su aprobación al siguiente proyecto de ley.' };

  it('isSubstantiveNormativeEvidence: disposición real → true', () => {
    expect(isSubstantiveNormativeEvidence({ article: 'Artículo 4°', text: substantive.excerpt })).toBe(true);
  });

  it('isSubstantiveNormativeEvidence: identificación/metadata y preámbulo → false', () => {
    expect(isSubstantiveNormativeEvidence(metadataOnly)).toBe(false);
    expect(isSubstantiveNormativeEvidence(promulgation)).toBe(false);
    expect(isSubstantiveNormativeEvidence({ article: 'Preámbulo', text: 'texto cualquiera' })).toBe(false);
    expect(isSubstantiveNormativeEvidence('')).toBe(false);
  });

  it('hasSubstantiveNormativeEvidence: true con fragmentos o extracto sustantivo', () => {
    expect(hasSubstantiveNormativeEvidence(substantive)).toBe(true);
    expect(hasSubstantiveNormativeEvidence({ kind: 'normativa', metadata: { fragments: [{ article: 'Art. 4', text: substantive.excerpt }] } })).toBe(true);
  });

  it('hasSubstantiveNormativeEvidence: false si solo metadata/identificación', () => {
    expect(hasSubstantiveNormativeEvidence(metadataOnly)).toBe(false);
    expect(hasSubstantiveNormativeEvidence({ kind: 'normativa', metadata: { fragments: [{ article: '', text: metadataOnly.excerpt }] } })).toBe(false);
    expect(hasSubstantiveNormativeEvidence({ kind: 'jurisprudencia', excerpt: 'cualquier texto largo de una sentencia' })).toBe(false);
  });
});