import { describe, it, expect } from 'vitest';
import {
  buildJurisprudenceContext,
  buildJurisprudenceSystemPrompt,
  buildJurisprudenceUserPrompt,
  buildJurisprudenceCaseContext,
  buildJurisprudenceAnswer,
  verifyJurisprudenceClaims,
  detectExcessiveConclusions,
  JURISPRUDENCE_LIMITS,
} from './jurisprudencePrompt.mjs';
import {
  detectQueryIntent,
  prioritizeSources,
  classifySourceKind,
  classifyNormType,
  detectNormVigency,
  extractNormNumber,
} from './jurisprudenceSources.mjs';

const sources = [
  {
    id: 'tc-123',
    kind: 'jurisprudencia',
    citation: 'Tribunal Constitucional — Rol 7845-2019',
    publisher: 'Tribunal Constitucional',
    url: 'https://buscador.tcchile.cl/#/ficha/7845-2019',
    excerpt: 'Establece que el derecho a la salud es un derecho fundamental.',
  },
  {
    id: 'bcn-19628',
    kind: 'normativa',
    citation: 'Norma N° 19628 (2020)',
    publisher: 'Biblioteca del Congreso Nacional / LeyChile',
    url: 'https://www.bcn.cl/leychile/navegar?idNorma=19628',
    excerpt: 'Normas sobre protección de la vida privada.',
  },
];

describe('buildJurisprudenceContext', () => {
  it('incluye todas las fuentes con su id y cita', () => {
    const { context } = buildJurisprudenceContext(sources);
    expect(context).toContain('id: tc-123');
    expect(context).toContain('tc-123');
    expect(context).toContain('bcn-19628');
    expect(context).toContain('Tribunal Constitucional');
    expect(context).toContain('LeyChile');
  });

  it('no supera el límite global de contexto', () => {
    const big = Array.from({ length: 50 }, (_, i) => ({
      id: `s-${i}`,
      kind: 'doctrina',
      citation: 'Doctrina ',
      excerpt: 'x '.repeat(6000),
    }));
    const { context, tooLarge } = buildJurisprudenceContext(big);
    expect(context.length).toBeLessThanOrEqual(JURISPRUDENCE_LIMITS.MAX_CONTEXT_CHARS);
    expect(tooLarge).toBe(true);
  });

  it('devuelve contexto vacío sin fuentes', () => {
    const { context } = buildJurisprudenceContext([]);
    expect(context).toContain('0 fuentes');
  });
});

describe('buildJurisprudenceSystemPrompt', () => {
  it('obliga a responder solo con fuentes del contexto (no inventar)', () => {
    const prompt = buildJurisprudenceSystemPrompt();
    expect(prompt).toContain('Usa exclusivamente las fuentes');
    expect(prompt).toContain('No inventes leyes');
    expect(prompt).toContain('"resumen"');
    expect(prompt).toContain('"normativa"');
    expect(prompt).toContain('"jurisprudencia"');
    expect(prompt).toContain('"doctrina"');
    expect(prompt).toContain('"fuente_id"');
    expect(prompt).toContain('fragmento');
    expect(prompt).toContain('NO uses conclusiones jurídicas absolutas');
  });

  it('exige cita afirmación → fuente → fragmento literal', () => {
    const prompt = buildJurisprudenceSystemPrompt();
    expect(prompt).toContain('fragmento textual');
    expect(prompt).toContain('No atribuyas a una fuente afirmaciones');
  });
});

describe('buildJurisprudenceUserPrompt', () => {
  it('incluye pregunta, contexto de fuentes y contexto del caso', () => {
    const context = buildJurisprudenceContext(sources).context;
    const prompt = buildJurisprudenceUserPrompt({
      question: '¿Qué dice la jurisprudencia sobre el derecho a la salud?',
      context,
      caseContext: 'Nombre: caso X',
    });
    expect(prompt).toContain('PREGUNTA DEL ABOGADO');
    expect(prompt).toContain('derecho a la salud');
    expect(prompt).toContain('CONTEXTO DE FUENTES');
    expect(prompt).toContain('Nombre: caso X');
  });
});

describe('buildJurisprudenceCaseContext', () => {
  it('incluye nombre, área y descripción', () => {
    const ctx = buildJurisprudenceCaseContext({
      name: 'Demanda laboral',
      practice_area: 'Laboral',
      description: 'Despido injustificado',
    });
    expect(ctx).toContain('Demanda laboral');
    expect(ctx).toContain('Laboral');
    expect(ctx).toContain('Despido injustificado');
  });
});

describe('detectQueryIntent', () => {
  it('detecta normativa en "¿Qué dice la ley sobre X?"', () => {
    expect(detectQueryIntent('¿Qué dice la ley sobre la protección de datos personales?')).toBe(
      'normativa',
    );
  });

  it('detecta jurisprudencia en consultas de fallos', () => {
    expect(detectQueryIntent('¿Qué ha dicho la Corte Suprema sobre el despido?')).toBe(
      'jurisprudencia',
    );
  });

  it('detecta doctrina', () => {
    expect(detectQueryIntent('¿Qué sostiene la doctrina sobre este punto?')).toBe('doctrina');
  });

  it('devuelve general sin coincidencias', () => {
    expect(detectQueryIntent('consulta amplia').length).toBeGreaterThan(0);
  });
});

describe('prioritizeSources', () => {
  const norm = { id: 'bcn-1', kind: 'normativa' };
  const jur = { id: 'tc-1', kind: 'jurisprudencia' };
  const doc = { id: 'doc-1', kind: 'doctrina' };

  it('ordena normativa → jurisprudencia → doctrina por defecto', () => {
    const ordered = prioritizeSources([doc, jur, norm], 'general');
    expect(ordered.map((s) => s.kind)).toEqual(['normativa', 'jurisprudencia', 'doctrina']);
  });

  it('prioriza jurisprudencia cuando la consulta pide fallos', () => {
    const ordered = prioritizeSources([{ id: 'bcn-9', kind: 'normativa' }, doc, jur], 'jurisprudencia');
    expect(ordered[0].kind).toBe('jurisprudencia');
  });

  it('prioriza doctrina cuando la consulta pide doctrina', () => {
    const ordered = prioritizeSources([jur, norm, doc], 'doctrina');
    expect(ordered[0].kind).toBe('doctrina');
  });
});

describe('verifyJurisprudenceClaims', () => {
  const sources = {
    'tc-5174': {
      id: 'tc-5174',
      kind: 'jurisprudencia',
      citation: 'Tribunal Constitucional — Rol 5174',
      excerpt: 'Establece que el derecho a la protección de datos se reconoce como derecho fundamental.',
    },
    'bcn-19628': {
      id: 'bcn-19628',
      kind: 'normativa',
      citation: 'Ley 19.628',
      excerpt: 'Normas sobre el tratamiento de datos personales y la protección de la vida privada.',
    },
  };
  const byId = new Map(Object.entries(sources));

  it('mantiene afirmaciones cuyo fragmento aparece en el extracto', () => {
    const { kept, warnings } = verifyJurisprudenceClaims(
      [
        {
          fuente_id: 'tc-5174',
          afirmacion: 'El TC reconoce el derecho fundamental a la protección de datos.',
          fragmento: 'se reconoce como derecho fundamental',
        },
      ],
      byId,
      'jurisprudencia',
    );
    expect(kept.length).toBe(1);
    expect(warnings.length).toBe(0);
  });

  it('descarta afirmaciones cuyo fragmento no aparece en la fuente', () => {
    const { kept, warnings } = verifyJurisprudenceClaims(
      [
        {
          fuente_id: 'tc-5174',
          afirmacion: 'Habla de indemnización laboral.',
          fragmento: 'indemnización por daño laboral no existe en el extracto',
        },
      ],
      byId,
      'jurisprudencia',
    );
    expect(kept.length).toBe(0);
    expect(warnings.length).toBe(1);
  });

  it('descarta afirmaciones con fuente inválida', () => {
    const { kept, warnings } = verifyJurisprudenceClaims(
      [{ fuente_id: 'no-existe', afirmacion: 'Algo.' }],
      byId,
      'jurisprudencia',
    );
    expect(kept.length).toBe(0);
    expect(warnings.length).toBe(1);
  });
});

describe('buildJurisprudenceAnswer', () => {
  it('arma el markdown con secciones, conclusión y avisos', () => {
    const md = buildJurisprudenceAnswer({
      resumen: 'La protección de datos es un derecho reconocido.',
      normativa: [
        {
          source: { citation: 'Ley 19.628' },
          afirmacion: 'Regula el tratamiento de datos.',
          fragmento: 'un fragmento',
        },
      ],
      jurisprudencia: [],
      doctrina: [],
      conclusion: 'Las fuentes muestran matices.',
      advertencias: ['Doctrina no vinculante.'],
    });
    expect(md).toContain('Respuesta breve');
    expect(md).toContain('Normativa relevante');
    expect(md).toContain('Conclusión');
    expect(md).toContain('Avisos');
    expect(md).toContain('Ley 19.628');
  });
});

// ---------------------------------------------------------------------------
// Fase 4.0.2 — Clasificación y jerarquía jurídica de fuentes
// ---------------------------------------------------------------------------

describe('Fase 4.0.2 · clasificación de fuentes', () => {
  it('A: clasifica normativa como fuente vinculante', () => {
    const meta = classifySourceKind('normativa');
    expect(meta.source_type).toBe('normativa');
    expect(meta.legal_authority).toBe('vinculante');
  });

  it('A: prioriza normativa primero cuando la consulta pide ley', () => {
    const intent = detectQueryIntent('¿Qué dice la ley sobre protección de datos personales?');
    expect(intent).toBe('normativa');
    const ordered = prioritizeSources(
      [
        { id: 'doc-1', kind: 'doctrina' },
        { id: 'tc-1', kind: 'jurisprudencia' },
        { id: 'bcn-19628', kind: 'normativa' },
      ],
      intent,
    );
    expect(ordered[0].kind).toBe('normativa');
  });

  it('E: clasifica doctrina con autoridad doctrinal', () => {
    const meta = classifySourceKind('doctrina');
    expect(meta.source_type).toBe('doctrina');
    expect(meta.legal_authority).toBe('doctrinal');
  });

  it('clasifica jurisprudencia como persuasiva (no precedente automático)', () => {
    const meta = classifySourceKind('jurisprudencia');
    expect(meta.source_type).toBe('jurisprudencia');
    expect(meta.legal_authority).toBe('persuasiva');
  });

  it('detecta tipo y número de una ley en el título', () => {
    expect(classifyNormType('Ley 19.628')).toBe('ley');
    expect(classifyNormType('Decreto Supremo 40')).toBe('decreto');
    expect(classifyNormType('Código del Trabajo')).toBe('codigo');
    expect(classifyNormType('Decreto Ley 211')).toBe('decreto_ley');
    expect(extractNormNumber('Ley 19.628')).toBe('19.628');
  });

  it('H: detecta norma derogada por el título y no la presenta como vigente', () => {
    expect(detectNormVigency('Ley 20.000 (Derogada)')).toBe('derogada');
    expect(detectNormVigency('Decreto 30 (Derogado)')).toBe('derogada');
  });

  it('mantiene "desconocida" salvo evidencia explícita de vigencia', () => {
    expect(detectNormVigency('Ley 21.719')).toBe('desconocida');
    expect(detectNormVigency('Texto Refundido Decreto 4')).toBe('vigente');
  });
});

describe('Fase 4.0.2 · verificación por categoría y vigencia', () => {
  const doctrinaSource = {
    id: 'doc-1',
    kind: 'doctrina',
    source_type: 'doctrina',
    legal_authority: 'doctrinal',
    vigency: 'no_aplica',
    citation: 'Autor. (2020). Artículo.',
    excerpt: 'La doctrina sostiene que el consentimiento debe ser informado.',
  };
  const tcSource = {
    id: 'tc-5174',
    kind: 'jurisprudencia',
    source_type: 'jurisprudencia',
    legal_authority: 'persuasiva',
    vigency: 'no_aplica',
    citation: 'Tribunal Constitucional — Rol 5174',
    excerpt: 'Establece que el derecho a la protección de datos se reconoce como derecho fundamental.',
  };
  const bcnSource = {
    id: 'bcn-19628',
    kind: 'normativa',
    source_type: 'normativa',
    legal_authority: 'vinculante',
    vigency: 'desconocida',
    citation: 'Ley 19.628',
    excerpt: 'Normas sobre el tratamiento de datos personales y la protección de la vida privada.',
  };
  const bcnDerogada = {
    id: 'bcn-derogada',
    kind: 'normativa',
    source_type: 'normativa',
    legal_authority: 'vinculante',
    vigency: 'derogada',
    citation: 'Ley 20.000 (Derogada)',
    excerpt: 'Texto antiguo sobre la materia, ya derogado.',
  };
  const byId = new Map(
    Object.entries({
      'doc-1': doctrinaSource,
      'tc-5174': tcSource,
      'bcn-19628': bcnSource,
      'bcn-derogada': bcnDerogada,
    }),
  );

  it('B: acepta afirmaciones de sentencias del TC en su sección con fragmento', () => {
    const { kept, warnings } = verifyJurisprudenceClaims(
      [
        {
          fuente_id: 'tc-5174',
          afirmacion: 'El TC sostuvo en este caso que la protección de datos es un derecho fundamental.',
          fragmento: 'se reconoce como derecho fundamental',
        },
      ],
      byId,
      'jurisprudencia',
    );
    expect(kept.length).toBe(1);
    expect(warnings.length).toBe(0);
  });

  it('C: descarta doctrina citada en la sección de normativa', () => {
    const { kept, warnings } = verifyJurisprudenceClaims(
      [
        {
          fuente_id: 'doc-1',
          afirmacion: 'La doctrina establece que el consentimiento debe ser informado.',
          fragmento: 'sostiene que el consentimiento',
        },
      ],
      byId,
      'normativa',
    );
    expect(kept.length).toBe(0);
    expect(warnings.some((w) => w.includes('no corresponde a esa sección'))).toBe(true);
  });

  it('D: descarta sentencia del TC citada como normativa vigente', () => {
    const { kept } = verifyJurisprudenceClaims(
      [
        {
          fuente_id: 'tc-5174',
          afirmacion: 'La norma vigente establece que la protección de datos es un derecho.',
          fragmento: 'se reconoce como derecho fundamental',
        },
      ],
      byId,
      'normativa',
    );
    expect(kept.length).toBe(0);
  });

  it('H: descarta afirmación que presenta como vigente una norma derogada', () => {
    const { kept, warnings } = verifyJurisprudenceClaims(
      [
        {
          fuente_id: 'bcn-derogada',
          afirmacion: 'Esta ley está vigente y regula la materia.',
          fragmento: 'ya derogado',
        },
      ],
      byId,
      'normativa',
    );
    expect(kept.length).toBe(0);
    expect(warnings.some((w) => w.includes('derogada'))).toBe(true);
  });

  it('I: avisa cuando la vigencia de la norma no está determinada', () => {
    const { kept, warnings } = verifyJurisprudenceClaims(
      [
        {
          fuente_id: 'bcn-19628',
          afirmacion: 'La ley regula el tratamiento de datos.',
          fragmento: 'tratamiento de datos personales',
        },
      ],
      byId,
      'normativa',
    );
    expect(kept.length).toBe(1);
    expect(warnings.some((w) => w.includes('Vigencia'))).toBe(true);
  });

  it('avisa cuando una doctrina usa lenguaje normativo categórico', () => {
    const { kept, warnings } = verifyJurisprudenceClaims(
      [
        {
          fuente_id: 'doc-1',
          afirmacion: 'La ley prohíbe todo tratamiento sin consentimiento.',
          fragmento: 'el consentimiento debe ser informado',
        },
      ],
      byId,
      'doctrina',
    );
    expect(kept.length).toBe(1);
    expect(warnings.some((w) => w.includes('no es fuente normativa'))).toBe(true);
  });
});

describe('Fase 4.0.2 · contexto y respuesta con jerarquía', () => {
  it('incluye Autoridad y Vigencia en el contexto del modelo', () => {
    const { context } = buildJurisprudenceContext([
      {
        id: 'bcn-19628',
        kind: 'normativa',
        legal_authority: 'vinculante',
        vigency: 'desconocida',
        citation: 'Ley 19.628',
        publisher: 'LeyChile',
        url: 'https://x',
        excerpt: 'Normas sobre el tratamiento de datos.',
      },
    ]);
    expect(context).toContain('Autoridad:');
    expect(context).toContain('Vigencia:');
  });

  it('J: genera secciones separadas por categoría con doctrina no vinculante', () => {
    const md = buildJurisprudenceAnswer({
      resumen: 'Síntesis.',
      normativa: [
        { source: { citation: 'Ley 19.628', legal_authority: 'vinculante' }, afirmacion: 'a' },
      ],
      jurisprudencia: [
        { source: { citation: 'TC Rol 1', legal_authority: 'persuasiva' }, afirmacion: 'b' },
      ],
      doctrina: [
        { source: { citation: 'Autor', legal_authority: 'doctrinal' }, afirmacion: 'c' },
      ],
      conclusion: 'c',
      advertencias: [],
    });
    expect(md).toContain('Normativa relevante');
    expect(md).toContain('Jurisprudencia relevante');
    expect(md).toContain('Doctrina (no vinculante)');
    expect(md).toContain('Norma vinculante');
    expect(md).toContain('No vinculante');
  });

  it('G: no advierte sobre redacción "el TC sostuvo en este caso" (permitida)', () => {
    const { warnings } = detectExcessiveConclusions({
      resumen: 'El TC sostuvo en este caso que la protección de datos es un derecho fundamental.',
      conclusion: 'El TC sostuvo en este caso que corresponde ponderar el derecho.',
      normativa: [],
      jurisprudencia: [{ fuente_id: 'tc-1' }],
    });
    expect(warnings.length).toBe(0);
  });

  it('F: suaviza y advierte "la ley establece…" sin fuente normativa', () => {
    const { resumen, conclusion, warnings } = detectExcessiveConclusions({
      resumen: 'La ley establece que todo tratamiento exige consentimiento.',
      conclusion: 'La ley establece este principio y es obligatorio.',
      normativa: [],
      jurisprudencia: [],
    });
    expect(warnings.length).toBeGreaterThan(0);
    expect(conclusion).not.toContain('La ley establece');
    expect(resumen).not.toContain('La ley establece');
  });

  it('no advierte conclusiones categóricas si la categoría quedó respaldada', () => {
    const { warnings } = detectExcessiveConclusions({
      resumen: 'La ley establece el principio de finalidad.',
      conclusion: 'La ley establece este principio.',
      normativa: [{ fuente_id: 'bcn-19628' }],
      jurisprudencia: [],
    });
    expect(warnings.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Fase 4.0.4 — Alineación exacta afirmación ↔ fragmento en la verificación
// ---------------------------------------------------------------------------

describe('Fase 4.0.4 · claim·fragment alignment en verifyJurisprudenceClaims', () => {
const artSource = (id, vigency = 'diferida', excerpt, fragments) => ({
    id,
    kind: 'normativa',
    source_type: 'normativa',
    legal_authority: 'vinculante',
    vigency,
    citation: 'Ley 21.719',
    excerpt,
    metadata: { fragments },
  });

  const fragments = [
    { id: 'frag:1209272:f1', article: 'Artículo 2', text: 'Derechos de los titulares: toda persona tiene derecho a acceso, rectificación, supresión, oposición, portabilidad y bloqueo de sus datos personales.' },
    { id: 'frag:1209272:f2', article: 'Artículo 14', text: 'El tratamiento de datos personales efectuado por organismos públicos se sujetará a las normas de esta ley.' },
  ];
  const excerpt = fragments.map((f) => f.text).join('\n');

  it('re-ancla el claim al fragmento que respalda la afirmación y conserva fragment_id', () => {
    const byId = new Map([
      [
        'bcn-21719',
        artSource('bcn-21719', 'diferida', excerpt, fragments),
      ],
    ]);
    const { kept, warnings } = verifyJurisprudenceClaims(
      [
        {
          fuente_id: 'bcn-21719',
          afirmacion: 'La ley reconoce el derecho de acceso, rectificación, supresión, oposición, portabilidad y bloqueo a los titulares',
          fragmento: 'fragmento equivocado sobre organismos públicos',
        },
      ],
      byId,
      'normativa',
    );
    expect(kept.length).toBe(1);
    expect(kept[0].fragment_id).toBe('frag:1209272:f1');
    expect(kept[0].fragmento).toContain('portabilidad');
    expect(kept[0].fragmento).toContain('supresión');
    expect(kept[0].source_id).toBe('bcn-21719');
    expect(warnings.length).toBe(0);
  });

  it('descarta una afirmación que ningún fragmento respalda (organismos ≠ derechos)', () => {
    const byId = new Map([
      ['bcn-21719', artSource('bcn-21719', 'diferida', excerpt, fragments)],
    ]);
    const { kept, warnings } = verifyJurisprudenceClaims(
      [
        {
          fuente_id: 'bcn-21719',
          afirmacion: 'La ley reconoce el derecho de acceso, rectificación, supresión, oposición, portabilidad y bloqueo a los titulares.',
          fragment: 'artículo 14 sobre organismos públicos',
        },
      ],
      byId,
      'normativa',
    );
    // La afirmación SI está respaldada por el Art. 2, así que se re-ancla y NO se descarta.
    expect(kept.length).toBe(1);
    expect(kept[0].fragment_id).toBe('frag:1209272:f1');
    expect(kept[0].fragmento).toMatch(/Art[.]?culo 2|Derechos de los titulares/);
  });

  it('elimina la afirmación cuando ninguna fragura contiene sus conceptos', () => {
    const byId = new Map([
      ['bcn-21719', artSource('bcn-21719', 'diferida', excerpt, fragments)],
    ]);
    const { kept, warnings } = verifyJurisprudenceClaims(
      [
        {
          fuente_id: 'bcn-21719',
          afirmacion: 'indemnización por despido injustificado del trabajador y pago de cotizaciones',
          fragment: 'organismos públicos',
        },
      ],
      byId,
      'normativa',
    );
    expect(kept.length).toBe(0);
    expect(warnings.length).toBe(1);
  });

  it('vigencia diferida: mantiene la afirmación respaldada sin aviso de vigencia incierta', () => {
    const byId = new Map([
      ['bcn-21719', artSource('bcn-21719', 'diferida', excerpt, fragments)],
    ]);
    const { kept, warnings } = verifyJurisprudenceClaims(
      [
        {
          fuente_id: 'bcn-21719',
          afirmacion: 'Los titulares pueden solicitar la supresión de sus datos personales.',
          fragment: 'cualquier fragmento',
        },
      ],
      byId,
      'normativa',
    );
    expect(kept.length).toBe(1);
    expect(kept[0].fragment_id).toBe('frag:1209272:f1');
    expect(warnings.some((w) => w.includes('Vigencia'))).toBe(false);
  });

it('usa texto no fabricado: la fragmento mostrado es el real (supresión + portabilidad)', () => {
    const byId = new Map([
      ['bcn-21719', artSource('bcn-21719', 'diferida', excerpt, fragments)],
    ]);
    const { kept } = verifyJurisprudenceClaims(
      [
        {
          fuente_id: 'bcn-21719',
          afirmacion: 'El titular goza del derecho de supresión y portabilidad de sus datos personales.',
          // El modelo cita mal (art 14); la verificación deve re-anclar al Art. 2.
          fragment: 'organismos públicos se de a las normas',
        },
      ],
      byId,
      'normativa',
    );
    expect(kept.length).toBe(1);
    expect(kept[0].fragmento).toContain('supresión');
    expect(kept[0].fragmento).toContain('portabilidad');
  });
});

// ---------------------------------------------------------------------------
// Fase 4.1 — Trazabilidad (Etapa 1), vigencia por afirmación (Etapa 5) y
// consulta mixta (test obligatorio D).
// ---------------------------------------------------------------------------

describe('Fase 4.1 · trazabilidad de fragment_id en verifyJurisprudenceClaims', () => {
  const artSource = (id, vigency = 'diferida', excerpt, fragments) => ({
    id,
    kind: 'normativa',
    source_type: 'normativa',
    legal_authority: 'vinculante',
    vigency,
    citation: 'Ley 21.719',
    excerpt,
    metadata: { fragments },
  });
  const fragments = [
    { id: 'frag:1209272:1', article: 'Artículo 2', text: 'Derechos de los titulares: toda persona tiene derecho a acceso, rectificación, supresión, oposición, portabilidad y bloqueo de sus datos personales.' },
    { id: 'frag:1209272:2', article: 'Artículo 14', text: 'El tratamiento de datos personales efectuado por organismos públicos se sujetará a las normas de esta ley.' },
  ];
  const excerpt = fragments.map((f) => f.text).join('\n');

  it('G: fragment_id inexistente → se re-ancla al fragmento real que respalda', () => {
    const byId = new Map([
      ['bcn-21719', artSource('bcn-21719', 'diferida', excerpt, fragments)],
    ]);
    const { kept } = verifyJurisprudenceClaims(
      [
        {
          fuente_id: 'bcn-21719',
          fragment_id: 'frag:999999:9',
          afirmacion: 'La ley reconoce a los titulares los derechos de acceso, rectificación y supresión.',
          fragmento: 'cualquier texto',
        },
      ],
      byId,
      'normativa',
    );
    expect(kept.length).toBe(1);
    expect(kept[0].fragment_id).toBe('frag:1209272:1');
  });

  it('H: fragment_id que no respalda la afirmación → se re-ancla', () => {
    const byId = new Map([
      ['bcn-21719', artSource('bcn-21719', 'diferida', excerpt, fragments)],
    ]);
    const { kept } = verifyJurisprudenceClaims(
      [
        {
          fuente_id: 'bcn-21719',
          fragment_id: 'frag:1209272:2', // Art. 14 (organismos públicos) NO respalda la lista de derechos.
          afirmacion: 'La ley reconoce los derechos de acceso, rectificación y supresión.',
          fragmento: 'cualquier texto',
        },
      ],
      byId,
      'normativa',
    );
    expect(kept.length).toBe(1);
    expect(kept[0].fragment_id).toBe('frag:1209272:1');
  });

  it('D: consulta mixta — verifica normativa, jurisprudencia y doctrina conservando fragment_id', () => {
    const byId = new Map([
      ['bcn-21719', artSource('bcn-21719', 'diferida', excerpt, fragments)],
      ['tc-1', { id: 'tc-1', kind: 'jurisprudencia', source_type: 'jurisprudencia', legal_authority: 'persuasiva', vigency: 'no_aplica', citation: 'TC', excerpt: 'se reconoce como derecho fundamental' }],
      ['doc-1', { id: 'doc-1', kind: 'doctrina', source_type: 'doctrina', legal_authority: 'doctrinal', vigency: 'no_aplica', citation: 'Autor', excerpt: 'sostiene que el equilibrio es importante en datos personales' }],
    ]);
    const norm = verifyJurisprudenceClaims(
      [
        { fuente_id: 'bcn-21719', fragment_id: 'frag:1209272:1', afirmacion: 'La ley reconoce los derechos de acceso, rectificación, supresión, oposición, portabilidad y bloqueo.', fragmento: 'x' },
      ],
      byId,
      'normativa',
    );
    const jur = verifyJurisprudenceClaims(
      [{ fuente_id: 'tc-1', afirmacion: 'El tribunal sostuvo en este caso que la protección es un derecho.', fragmento: 'se reconoce como derecho fundamental' }],
      byId,
      'jurisprudencia',
    );
    const doc = verifyJurisprudenceClaims(
      [{ fuente_id: 'doc-1', afirmacion: 'La doctrina sostiene que existe un equilibrio en los datos personales.', fragmento: 'sostiene que el equilibrio es importante en datos personales' }],
      byId,
      'doctrina',
    );
    expect(norm.kept.length).toBe(1);
    expect(norm.kept[0].fragment_id).toBe('frag:1209272:1');
    expect(jur.kept.length).toBe(1);
    expect(doc.kept.length).toBe(1);
  });

  it('E: norma con vigencia diferida no se presenta como vigente (afirmación marcada)', () => {
    const byId = new Map([
      ['bcn-21719', artSource('bcn-21719', 'diferida', excerpt, fragments)],
    ]);
    const { kept, warnings } = verifyJurisprudenceClaims(
      [
        {
          fuente_id: 'bcn-21719',
          fragment_id: 'frag:1209272:1',
          afirmacion: 'La ley está vigente y regula los derechos de los titulares.',
          fragmento: 'x',
        },
      ],
      byId,
      'normativa',
    );
    expect(kept.length).toBe(1);
    expect(kept[0].vigencia_nota).toContain('diferida');
    expect(kept[0].vigencia).toBe('diferida');
    expect(warnings.some((w) => w.includes('NO es derecho vigente'))).toBe(true);
  });

  it('K: norma derogada presentada como vigente → se descarta', () => {
    const byId = new Map([
      ['bcn-derog', { id: 'bcn-derog', kind: 'normativa', legal_authority: 'vinculante', vigency: 'derogada', citation: 'Ley (Derogada)', excerpt, metadata: { fragments } }],
    ]);
    const { kept, warnings } = verifyJurisprudenceClaims(
      [
        {
          fuente_id: 'bcn-derog',
          fragment_id: 'frag:1209272:1',
          afirmacion: 'Esta ley está vigente y regula los derechos de acceso, rectificación y supresión de los titulares.',
          fragmento: 'cualquier texto',
        },
      ],
      byId,
      'normativa',
    );
    expect(kept.length).toBe(0);
    expect(warnings.some((w) => w.includes('derogada'))).toBe(true);
  });

  it('J: doctrina presentada como normativa → se descarta', () => {
    const byId = new Map([
      ['doc-1', { id: 'doc-1', kind: 'doctrina', source_type: 'doctrina', legal_authority: 'doctrinal', vigency: 'no_aplica', citation: 'Autor', excerpt: 'sostiene que X es la regla general' }],
    ]);
    const { kept, warnings } = verifyJurisprudenceClaims(
      [{ fuente_id: 'doc-1', afirmacion: 'La doctrina establece una norma obligatoria.', fragmento: 'X es la regla general' }],
      byId,
      'normativa',
    );
    expect(kept.length).toBe(0);
    expect(warnings.some((w) => w.includes('no corresponde a esa sección'))).toBe(true);
  });
});