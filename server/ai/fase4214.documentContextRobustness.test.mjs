import { describe, it, expect } from 'vitest';
import {
  detectDocumentMode,
  shouldAllowDocumentOnlyFallback,
} from './documentGrounding.mjs';
import {
  classifyLegalQuery,
  hasImplicitDocumentContext,
  isSourceResponsiveToQuery,
} from './jurisprudenceSources.mjs';
import { buildJurisprudenceOutcome, applyRelevanceGate } from './jurisprudencePipeline.mjs';

// ---------------------------------------------------------------------------
// Fase 4.2.14 — Robustez contextual documental.
// Corrige los hallazgos críticos de la auditoría 4.2.13 (A1/A3/B5/C3/D4):
// consultas factuales naturales SIN ancla ("¿Cuál es la renta mensual?",
// "¿Cuándo termina?", "¿Cuánto pagó Jorge?", "¿Se puede subarrendar?") caían a
// mode 'none' y, con un UNICO documento disponible, se descartaba el documento
// y se respondía con fuentes públicas irrelevantes.
//
// Estrategia (sin debilitar la anti-alucinación):
//   1) hasImplicitDocumentContext → consultas factuales con 1 documento activan
//      mode document/mixed (matriz §13), con bloques públicos/procedimentales.
//   2) IMPLICIT_LEGAL_POLE_RE (en detectDocumentMode) → consultas de VALIDEZ
//      del documento ("¿La cláusula … es válida?") pasan a mode mixed.
//   3) isSourceResponsiveToQuery + gate en buildJurisprudenceOutcome → en modo
//      documental sin claims documentales, las fuentes públicas irrelevantes se
//      DESCARTAN; si nada responde la consulta factual, el resultado es
//      NO_EVIDENCE honesto, jamás una fuente pública sustituta.
// Todo determinístico, sin LLM.
// ---------------------------------------------------------------------------

const contratoDoc = (overrides = {}) => ({
  id: 'doc-4214-1111-aaaa-4bbb-8ccc-000000000001',
  original_filename: 'contrato-arriendo-4214.pdf',
  status: 'ready',
  extracted_text:
    'PRIMERA: El canon de arrendamiento mensual es de 500.000 pesos. SEGUNDA: El plazo del contrato es de doce meses.',
  ...overrides,
});

// -------------------------------
// 1) hasImplicitDocumentContext
// -------------------------------
describe('hasImplicitDocumentContext · positivos (matriz 4.2.14 §13)', () => {
  const base = { hasDocs: true, documentCount: 1, intent: 'GENERAL_LEGAL_QUERY' };

  it('sustantivo factual + pregunta → true (los 5 críticos de la auditoría)', () => {
    const queries = [
      '¿Cuál es la renta mensual?',
      '¿Cuánto se paga de arriendo?',
      '¿Cuál es la multa?',
      '¿Cuál es el domicilio?',
      '¿Quién paga los gastos comunes?',
      '¿Qué obligaciones tiene el arrendatario?',
      '¿Cuáles son las partes?',
      '¿Cuál es la duración del contrato?',
      '¿Cuál es el plazo?',
      '¿Cuál es la garantía?',
    ];
    for (const q of queries) {
      expect(hasImplicitDocumentContext({ ...base, query: q })).toBe(true);
    }
  });

  it('verbo fuerte + pregunta corta → true', () => {
    const queries = [
      '¿Se puede subarrendar?',
      '¿Cuándo vence?',
      '¿Se renueva el contrato?',
      '¿Se puede ceder el arriendo?',
    ];
    for (const q of queries) {
      expect(hasImplicitDocumentContext({ ...base, query: q })).toBe(true);
    }
  });

  it('verbo genérico + palabra interrogativa + pregunta corta → true', () => {
    const queries = [
      '¿Cuándo termina?',
      '¿Cuándo comenzó el contrato?',
      '¿Cuánto pagó Jorge?',
    ];
    for (const q of queries) {
      expect(hasImplicitDocumentContext({ ...base, query: q })).toBe(true);
    }
  });

  it('negativos: afirmaciones (no pregunta) NO activan', () => {
    const statements = [
      'El contrato establece la renta mensual',
      'El arrendatario paga la garantía',
      'El plazo vence en marzo',
    ];
    for (const q of statements) {
      expect(hasImplicitDocumentContext({ ...base, query: q })).toBe(false);
    }
  });
});

describe('hasImplicitDocumentContext · guards', () => {
  it('exige exactamente un documento', () => {
    expect(
      hasImplicitDocumentContext({ query: '¿Cuál es la renta mensual?', hasDocs: true, documentCount: 2, intent: 'GENERAL_LEGAL_QUERY' }),
    ).toBe(false);
    expect(
      hasImplicitDocumentContext({ query: '¿Cuál es la renta mensual?', hasDocs: false, documentCount: 0, intent: 'GENERAL_LEGAL_QUERY' }),
    ).toBe(false);
  });

  it('se anula si otro signal ya clasificó', () => {
    expect(
      hasImplicitDocumentContext({
        query: '¿Cuál es la renta mensual?',
        hasDocs: true,
        documentCount: 1,
        intent: 'GENERAL_LEGAL_QUERY',
        existingSignals: { documentSignal: true, fallbackSignal: false, contentSignal: false },
      }),
    ).toBe(false);
  });

  it('se anula en intenciones públicas excluidas', () => {
    expect(
      hasImplicitDocumentContext({ query: '¿Qué ha dicho el tribunal sobre el subarriendo?', hasDocs: true, documentCount: 1, intent: 'JURISPRUDENCE_LOOKUP' }),
    ).toBe(false);
    expect(
      hasImplicitDocumentContext({ query: '¿Qué dice el artículo 1545?', hasDocs: true, documentCount: 1, intent: 'ARTICLE_LOOKUP' }),
    ).toBe(false);
  });

  it('bloquea marco de fuentes públicas', () => {
    const publics = [
      '¿Qué dice la ley sobre la renta?',
      '¿Cuál es la regulación del arriendo en Chile?',
      '¿Qué dice la normativa sobre el contrato?',
      '¿Qué dice la jurisprudencia sobre el arrendamiento?',
      '¿Qué dispone el artículo 1545?',
      '¿Qué ha dicho la Corte sobre las cláusulas de término anticipado?',
      '¿La renta del contrato cumple con la normativa?',
    ];
    for (const q of publics) {
      expect(hasImplicitDocumentContext({ query: q, hasDocs: true, documentCount: 1, intent: 'GENERAL_LEGAL_QUERY' })).toBe(false);
    }
  });

  it('bloquea materia de procedimiento, laboral, tributaria y familiar', () => {
    const blocked = [
      '¿Cuál es el plazo de prescripción de las acciones?',
      '¿Qué dice el contrato sobre la notificación?',
      '¿Cuánto es la indemnización por despido?',
      '¿Se permite terminar la relación laboral sin aviso previo?',
      '¿Cuál es la renta base mensual?',
      '¿Cuál es el impuesto del contrato?',
      '¿Qué dice el contrato sobre la custodia?',
      '¿Cuál es la remuneración del contrato?',
      '¿Cuál es el estado del mercado inmobiliario?',
    ];
    for (const q of blocked) {
      expect(hasImplicitDocumentContext({ query: q, hasDocs: true, documentCount: 1, intent: 'GENERAL_LEGAL_QUERY' })).toBe(false);
    }
  });
});

// -------------------------------
// 2) detectDocumentMode
// -------------------------------
describe('detectDocumentMode · críticos 4.2.13 con UN documento', () => {
  it('los 5 críticos + QA factuales → mode document', () => {
    const criticals = [
      '¿Cuál es la renta mensual?',
      '¿Cuánto se paga de arriendo?',
      '¿Cuál es el plazo del contrato?',
      '¿Cuándo termina?',
      '¿Cuánto pagó Jorge?',
      '¿Se puede subarrendar?',
      '¿Cuándo comenzó el contrato?',
      '¿Cuál es la multa?',
      '¿Cuál es el domicilio?',
      '¿Quién paga los gastos comunes?',
      '¿Qué obligaciones tiene el arrendatario?',
      '¿Cuáles son las partes?',
      '¿Cuál es la duración del contrato?',
    ];
    for (const q of criticals) {
      const cls = classifyLegalQuery(q);
      const r = detectDocumentMode(q, [contratoDoc()], cls);
      expect(r.mode, q).toBe('document');
      expect(r.noEvidence, q).toBe(false);
      expect(r.documentSignal, q).toBe(true);
    }
  });

  it('sin documentos (pero singleton de caso sin doc) el implicit no produce noEvidence', () => {
    const cls = classifyLegalQuery('¿Cuál es la renta mensual?');
    const r = detectDocumentMode('¿Cuál es la renta mensual?', [], cls);
    expect(r.mode).toBe('none');
    expect(r.noEvidence).toBe(false);
  });

  it('invariantes: consultas públicas y laborales siguen en mode none', () => {
    const invariants = [
      '¿Puedo terminar el contrato por incumplimiento?',
      '¿Qué derechos reconoce la Ley 21.719 sobre protección de datos personales?',
      '¿Cuál es la regulación del teletrabajo en Chile?',
      '¿Qué ha dicho el Tribunal Constitucional sobre las cláusulas de término anticipado?',
      '¿Se permite cobrar comisiones en Chile?',
      '¿Qué normativa regula el plazo de los contratos de trabajo?',
      '¿Se permite terminar la relación laboral sin aviso previo?',
      '¿Qué plazo establece el reglamento para la notificación?',
      '¿Cuál es el plazo de prescripción de las acciones?',
      '¿Cuál es la renta base mensual?',
      '¿La renta del contrato cumple con la normativa?',
      '¿Qué dice la jurisprudencia sobre el subarriendo?',
      '¿Cuál es el estado del mercado inmobiliario?',
    ];
    for (const q of invariants) {
      const cls = classifyLegalQuery(q);
      const r = detectDocumentMode(q, [contratoDoc()], cls);
      expect(r.mode, q).toBe('none');
      expect(r.implicitContext, q).toBe(false);
    }
  });

  it('consulta con 2 documentos → none (el implicit exige singleton)', () => {
    const cls = classifyLegalQuery('¿Cuál es la renta mensual?');
    const r = detectDocumentMode(
      '¿Cuál es la renta mensual?',
      [contratoDoc(), contratoDoc({ id: 'doc-4214-segundo' })],
      cls,
    );
    expect(r.mode).toBe('none');
  });

  it('validez del documento (matriz §13 columna C) → mode mixed', () => {
    const queries = [
      '¿La cláusula de término anticipado es válida?',
      '¿La cláusula de término anticipado es exigible?',
      '¿La cláusula del contrato es compatible con el artículo 1545?',
    ];
    for (const q of queries) {
      const cls = classifyLegalQuery(q);
      const r = detectDocumentMode(q, [contratoDoc()], cls);
      expect(r.mode, q).toBe('mixed');
      expect(r.hasLegal, q).toBe(true);
    }
  });

  it('regresión D2 (fase429): "permite terminar el contrato" NO es polo de validez → document', () => {
    const cls = classifyLegalQuery('¿La cláusula de término anticipado permite terminar el contrato?');
    const r = detectDocumentMode('¿La cláusula de término anticipado permite terminar el contrato?', [contratoDoc()], cls);
    expect(r.mode).toBe('document');
    expect(r.hasLegal).toBe(false);
  });
});

// -------------------------------
// 3) shouldAllowDocumentOnlyFallback (defensa en profundidad §10)
// -------------------------------
describe('shouldAllowDocumentOnlyFallback · implicitDocumentContext', () => {
  it('permite doc-only con contexto implícito aunque el modo sea none (defensa en profundidad)', () => {
    expect(
      shouldAllowDocumentOnlyFallback({
        documentMode: 'none',
        intent: 'GENERAL_LEGAL_QUERY',
        hasDocs: true,
        implicitDocumentContext: true,
      }),
    ).toBe(true);
  });

  it('sin contexto implícito conserva el comportamiento previo (none → false)', () => {
    expect(
      shouldAllowDocumentOnlyFallback({
        documentMode: 'none',
        intent: 'GENERAL_LEGAL_QUERY',
        hasDocs: true,
        implicitDocumentContext: false,
      }),
    ).toBe(false);
    expect(
      shouldAllowDocumentOnlyFallback({
        documentMode: 'mixed',
        intent: 'GENERAL_LEGAL_QUERY',
        hasDocs: true,
      }),
    ).toBe(true);
  });
});

// -------------------------------
// 4) isSourceResponsiveToQuery + applyRelevanceGate
// -------------------------------
describe('isSourceResponsiveToQuery · gate de relevancia 4.2.14', () => {
  const leyDatos = {
    id: 'bcn-21719',
    kind: 'normativa',
    citation: 'Ley 21.719',
    title: 'Ley 21.719 sobre protección de datos personales',
    norm_number: '21.719',
    excerpt: 'Derechos de los titulares sobre sus datos personales.',
  };
  const jurisRenta = {
    id: 'j-arriendo',
    kind: 'jurisprudencia',
    citation: 'Corte Suprema — Rol 1111',
    title: 'Arriendo de inmueble',
    excerpt: 'Sobre el canon de arrendamiento y la renta.',
  };

  it('sin solape de término sustantivo → false (no sustituye al documento)', () => {
    expect(isSourceResponsiveToQuery({ query: '¿Cuál es la renta mensual?', source: leyDatos, claims: [] })).toBe(false);
  });

  it('solape sustantivo con título/cita/afirmación de la fuente → true', () => {
    expect(
      isSourceResponsiveToQuery({
        query: '¿Cuál es la renta mensual?',
        source: jurisRenta,
        claims: [{ afirmacion: 'El tribunal reconoce el canon de arrendamiento como renta.', fragmento: 'canon de arrendamiento y la renta' }],
      }),
    ).toBe(true);
  });

  it('coincidencia de número de ley citado → true', () => {
    expect(isSourceResponsiveToQuery({ query: '¿Qué dice la Ley 21.719 sobre mis datos?', source: leyDatos, claims: [] })).toBe(true);
  });

  it('coincidencia de artículo citado vs articulado de la fuente → true; ausencia → false', () => {
    const cc1545 = { id: 'cc', kind: 'normativa', title: 'Código Civil', norm_number: '1', article: ['Artículo 1545'] };
    expect(isSourceResponsiveToQuery({ query: '¿Qué dice el artículo 1545?', source: cc1545, claims: [] })).toBe(true);
    expect(isSourceResponsiveToQuery({ query: '¿Qué dice el artículo 1990?', source: cc1545, claims: [] })).toBe(false);
  });

  it('query vacía o fuente nula → false', () => {
    expect(isSourceResponsiveToQuery({ query: '', source: jurisRenta, claims: [] })).toBe(false);
    expect(isSourceResponsiveToQuery({ query: '¿Cuál es la renta mensual?', source: null, claims: [] })).toBe(false);
  });
});

describe('applyRelevanceGate · gate post-retrieval', () => {
  const jurisRenta = {
    id: 'j-arriendo',
    kind: 'jurisprudencia',
    citation: 'Corte Suprema — Rol 1111',
    title: 'Arriendo de inmueble',
    excerpt: 'Sobre el canon de arrendamiento y la renta.',
  };
  const jurisDatos = {
    id: 'j-datos',
    kind: 'jurisprudencia',
    citation: 'Corte Suprema — Rol 5174',
    title: 'Protección de datos personales',
    excerpt: 'Derecho fundamental a la protección de datos personales.',
  };

  it('conserva la fuente relevante y descarta la irrelevante con warning', () => {
    const claims = [
      { source: jurisRenta, source_id: 'j-arriendo', afirmacion: 'El canon es renta.', fragmento: 'canon de arrendamiento' },
      { source: jurisDatos, source_id: 'j-datos', afirmacion: 'Derecho fundamental de datos.', fragmento: 'protección de datos' },
    ];
    const r = applyRelevanceGate(claims, { query: '¿Cuál es la renta mensual?' });
    expect(r.kept.map((c) => c.source_id)).toEqual(['j-arriendo']);
    expect(r.droppedCount).toBe(1);
    expect(r.warnings.length).toBe(1);
    expect(r.warnings[0]).toContain('5174');
  });
});

// -------------------------------
// 5) Integración en el pipeline
// -------------------------------
describe('buildJurisprudenceOutcome · gate 4.2.14', () => {
  const jurisDatos = {
    id: 'j-datos',
    kind: 'jurisprudencia',
    source_type: 'jurisprudencia',
    legal_authority: 'persuasiva',
    vigency: 'no_aplica',
    citation: 'Corte Suprema — Rol 5174',
    title: 'Protección de datos personales',
    excerpt: 'Derecho fundamental a la protección de datos personales.',
  };
  const jurisRenta = {
    id: 'j-arriendo',
    kind: 'jurisprudencia',
    source_type: 'jurisprudencia',
    legal_authority: 'persuasiva',
    vigency: 'no_aplica',
    citation: 'Corte Suprema — Rol 1111',
    title: 'Arriendo de inmueble',
    excerpt: 'Sobre el canon de arrendamiento y la renta.',
  };

  it('modo documental sin claims documentales: descarta fuente pública irrelevante → NO_EVIDENCE honesto', () => {
    const result = buildJurisprudenceOutcome({
      data: {
        resumen: 'La renta mensual es una materia de arrendamiento.',
        normativa: [],
        jurisprudencia: [
          { fuente_id: 'j-datos', afirmacion: 'El tribunal reconoce la protección de datos como derecho fundamental.', fragmento: 'derecho fundamental' },
        ],
        doctrina: [],
        documento: [],
        conclusion: '',
      },
      sources: [jurisDatos],
      intent: 'general',
      query: '¿Cuál es la renta mensual?',
      documents: [],
      documentMode: 'mixed',
    });
    expect(result.status).toBe('ok');
    expect(result.outcome).toBe('NO_EVIDENCE');
    expect(result.relevanceDroppedSources).toBe(1);
    expect(result.persistedSources).toEqual([]);
    expect(result.resumenFinal).toContain('No se encontró evidencia suficiente');
  });

  it('modo documental sin claims documentales: conserva fuente pública RELEVANTE → SUCCESS', () => {
    const result = buildJurisprudenceOutcome({
      data: {
        resumen: 'El canon de arrendamiento se considera renta.',
        normativa: [],
        jurisprudencia: [
          { fuente_id: 'j-arriendo', afirmacion: 'El tribunal reconoce el canon de arrendamiento como renta.', fragmento: 'canon de arrendamiento y la renta' },
        ],
        doctrina: [],
        documento: [],
        conclusion: '',
      },
      sources: [jurisRenta],
      intent: 'general',
      query: '¿Cuál es la renta mensual?',
      documents: [],
      documentMode: 'mixed',
    });
    expect(result.status).toBe('ok');
    expect(result.outcome).toBe('SUCCESS');
    expect(result.relevanceDroppedSources).toBe(0);
    expect(result.persistedSources.map((s) => s.id)).toEqual(['j-arriendo']);
  });

  it('modo none: el gate NO se aplica (comportamiento previo intacto)', () => {
    const result = buildJurisprudenceOutcome({
      data: {
        resumen: 'La protección de datos es un derecho fundamental.',
        normativa: [],
        jurisprudencia: [
          { fuente_id: 'j-datos', afirmacion: 'El tribunal reconoce la protección de datos como derecho fundamental.', fragmento: 'derecho fundamental' },
        ],
        doctrina: [],
        documento: [],
        conclusion: '',
      },
      sources: [jurisDatos],
      intent: 'general',
      query: '¿Qué ha dicho la jurisprudencia sobre la protección de datos personales?',
      documents: [],
      documentMode: 'none',
    });
    expect(result.status).toBe('ok');
    expect(result.outcome).toBe('SUCCESS');
    expect(result.relevanceDroppedSources).toBe(0);
  });

  it('modo mixto CON claims documentales verificados: el gate SÍ filtra las fuentes públicas irrelevantes (4.2.19)', () => {
    const doc = contratoDoc();
    const result = buildJurisprudenceOutcome({
      data: {
        resumen: 'El canon mensual es de 500.000 pesos y el plazo es de doce meses.',
        normativa: [],
        jurisprudencia: [
          { fuente_id: 'j-datos', afirmacion: 'El tribunal reconoce la protección de datos como derecho fundamental.', fragmento: 'derecho fundamental' },
        ],
        doctrina: [],
        documento: [
          { document_id: doc.id, afirmacion: 'El canon de arrendamiento mensual es de 500.000 pesos.', fragmento: 'El canon de arrendamiento mensual es de 500.000 pesos' },
        ],
        conclusion: '',
      },
      sources: [jurisDatos],
      intent: 'general',
      query: '¿Cuál es la renta mensual?',
      documents: [doc],
      documentMode: 'mixed',
    });
    expect(result.status).toBe('ok');
    expect(result.outcome).toBe('SUCCESS');
    expect(result.relevanceDroppedSources).toBe(1);
    expect(result.allVerifiedClaims.some((c) => c.category === 'document')).toBe(true);
    expect(result.allVerifiedClaims.some((c) => c.source_id === 'j-datos')).toBe(false);
  });

  it('4.2.15: la fuente pública descartada por el gate NO aparece en el Markdown de la respuesta', () => {
    const result = buildJurisprudenceOutcome({
      data: {
        resumen: 'El canon de arrendamiento se considera renta.',
        normativa: [],
        jurisprudencia: [
          { fuente_id: 'j-arriendo', afirmacion: 'El tribunal reconoce el canon de arrendamiento como renta.', fragmento: 'canon de arrendamiento y la renta' },
          { fuente_id: 'j-datos', afirmacion: 'El tribunal reconoce la protección de datos como derecho fundamental.', fragmento: 'derecho fundamental' },
        ],
        doctrina: [],
        documento: [],
        conclusion: '',
      },
      sources: [jurisRenta, jurisDatos],
      intent: 'general',
      query: '¿Cuál es la renta mensual?',
      documents: [],
      documentMode: 'mixed',
    });
    expect(result.status).toBe('ok');
    expect(result.outcome).toBe('SUCCESS');
    expect(result.relevanceDroppedSources).toBe(1);
    expect(result.allVerifiedClaims.map((c) => c.source_id)).toEqual(['j-arriendo']);
    expect(result.referencedIds.map((s) => s.id)).toEqual(['j-arriendo']);
    const jurSection = (result.answer.split('**Jurisprudencia relevante**')[1] || '').split(/\n\*\*/)[0];
    expect(jurSection).toContain('Corte Suprema — Rol 1111');
    expect(jurSection).not.toContain('5174');
    expect(result.answer).toContain('Se descartó la fuente pública "Corte Suprema — Rol 5174"');
  });
});