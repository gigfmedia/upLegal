import { describe, it, expect } from 'vitest';
import {
  buildJurisprudenceOutcome,
  computeAttributionCoverage,
  AIResearchResponseSchema,
} from './jurisprudencePipeline.mjs';

// ---------------------------------------------------------------------------
// Fase 4.2.20 — Trazabilidad y atribución de evidencia en la respuesta final.
//
// Hallazgo auditado (read-only): la "Respuesta breve" (resumenFinal) era el
// texto libre del modelo, solo suavizado por detectExcessiveConclusions, SIN
// pasar por el verifier de síntesis que SÍ se aplica a la "Síntesis". Consecuencia:
// la breve podía hacer afirmaciones más fuertes que la evidencia verificada
// (oraciones sin respaldo en claims, presentadas como hecho/ley).
//
// Fix mínimo (reusando verifyAndBuildSynthesis, sin reabrir arquitectura):
// el resumen se verifica contra los claims verificados; cada oración debe tener
// respaldo o etiquetarse como inferencia; las oraciones sin respaldo se eliminan.
// La procedencia (hecho/ley/jurisprudencia/doctrina/inferencia) queda explícita.
//
// También se expone attribution_coverage (Fase 4.2.20 §22) e integridad §17:
// todo claim persistido verified===true y con referencia de evidencia válida.
// ---------------------------------------------------------------------------

const contratoDoc = () => ({
  id: 'doc-4220-1111-aaaa-4bbb-8ccc-000000000001',
  original_filename: 'contrato-arriendo-4220.pdf',
  status: 'ready',
  extracted_text:
    'PRIMERA: El canon de arrendamiento mensual es de 500.000 pesos. SEGUNDA: El plazo del contrato es de doce meses.',
});

const normativaSource = (extra = {}) => ({
  id: 'bcn-21719',
  kind: 'normativa',
  source_type: 'normativa',
  legal_authority: 'vinculante',
  vigency: 'desconocida',
  citation: 'Ley 21.719',
  title: 'Ley 21.719',
  norm_type: 'ley',
  norm_number: '21.719',
  url: 'https://www.bcn.cl/leychile/navegar?idNorma=21719',
  excerpt:
    'Derechos de los titulares: toda persona tiene derecho a acceso, rectificación, supresión, oposición, portabilidad y bloqueo de sus datos personales.',
  ...extra,
});

const tcSource = (extra = {}) => ({
  id: 'tc-5174',
  kind: 'jurisprudencia',
  source_type: 'jurisprudencia',
  legal_authority: 'persuasiva',
  vigency: 'no_aplica',
  citation: 'Tribunal Constitucional — Rol 5174',
  excerpt:
    'Establece que el derecho a la protección de datos se reconoce como derecho fundamental.',
  ...extra,
});

const doctrinaSource = (extra = {}) => ({
  id: 'doc-1',
  kind: 'doctrina',
  source_type: 'doctrina',
  legal_authority: 'doctrinal',
  vigency: 'no_aplica',
  citation: 'Autor. (2020). Artículo sobre datos personales.',
  excerpt: 'La doctrina sostiene que el consentimiento debe ser informado.',
  ...extra,
});

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

const documentClaim = (doc) => ({
  document_id: doc.id,
  afirmacion: 'El canon de arrendamiento mensual es de 500.000 pesos.',
  fragmento: 'El canon de arrendamiento mensual es de 500.000 pesos',
});

// ---------------------------------------------------------------------------
// §11 — La Respuesta breve no puede hacer afirmaciones más fuertes que la evidencia.
// ---------------------------------------------------------------------------
describe('4.2.20 · Respuesta breve verificada', () => {
  it('DEMOSTRACIÓN: una oración del resumen sin respaldo en claims se elimina de la breve', () => {
    const result = buildJurisprudenceOutcome({
      data: {
        resumen:
          'El canon mensual es de 500.000 pesos. El contrato además indemniza daños punitivos por un monto indeterminado.',
        normativa: [],
        jurisprudencia: [],
        doctrina: [],
        documento: [documentClaim(contratoDoc())],
        conclusion: '',
      },
      sources: [],
      intent: 'general',
      query: '¿Cuál es la renta mensual?',
      documents: [contratoDoc()],
      documentMode: 'document',
    });
    expect(result.status).toBe('ok');
    expect(result.outcome).toBe('SUCCESS');
    // La oración respaldada se conserva; la no respaldada (daños punitivos) se elimina.
    expect(result.resumenFinal).toContain('500.000');
    expect(result.resumenFinal).not.toContain('daños punitivos');
    expect(result.resumenFinal).not.toContain('indeterminado');
  });

  it('una inferencia legítima se conserva etiquetada, no como hecho literal', () => {
    const result = buildJurisprudenceOutcome({
      data: {
        resumen:
          'El canon mensual es de 500.000 pesos. Sobre la base de las fuentes, puede inferirse que el canon es reajustable.',
        normativa: [],
        jurisprudencia: [],
        doctrina: [],
        documento: [documentClaim(contratoDoc())],
        conclusion: '',
      },
      sources: [],
      intent: 'general',
      query: '¿Cuál es la renta mensual?',
      documents: [contratoDoc()],
      documentMode: 'document',
    });
    expect(result.outcome).toBe('SUCCESS');
    expect(result.resumenFinal).toContain('500.000');
  });
});

// ---------------------------------------------------------------------------
// §17 — Integridad: todo claim persistido verified===true y con evidencia válida.
// ---------------------------------------------------------------------------
describe('4.2.20 · integridad de claims persistidos (§17)', () => {
  it('todo claim persistido tiene verified=true, source_id y evidencia', () => {
    const doc = contratoDoc();
    const result = buildJurisprudenceOutcome({
      data: {
        resumen: 'La ley y el tribunal reconocen los derechos de los titulares.',
        normativa: [
          {
            fuente_id: 'bcn-21719',
            afirmacion: 'La ley reconoce el derecho de acceso y supresión a los titulares.',
            fragmento: 'derecho a acceso, rectificación, supresión',
          },
        ],
        jurisprudencia: [
          {
            fuente_id: 'tc-5174',
            afirmacion: 'El tribunal sostuvo que la protección de datos es un derecho fundamental.',
            fragmento: 'se reconoce como derecho fundamental',
          },
        ],
        doctrina: [],
        documento: [documentClaim(doc)],
        conclusion: '',
      },
      sources: [normativaSource(), tcSource()],
      intent: 'general',
      query: '¿qué dice la ley y la jurisprudencia sobre la protección de datos?',
      documents: [doc],
      documentMode: 'mixed',
    });
    expect(result.outcome).toBe('SUCCESS');
    const all = result.persistedSources.flatMap((s) => s.claims);
    expect(all.length).toBeGreaterThan(0);
    for (const claim of all) {
      expect(claim.verified).toBe(true);
      expect(typeof claim.source_id).toBe('string');
      expect(claim.source_id.length).toBeGreaterThan(0);
      expect(typeof claim.evidencia).toBe('string');
      expect(claim.evidencia.length).toBeGreaterThan(0);
    }
  });

  it('un claim con sourceId inexistente se descarta (no persiste) y el schema rechaza sourceId vacío', () => {
    const result = buildJurisprudenceOutcome({
      data: {
        resumen: 'Afirmaciones sin fuente.',
        normativa: [{ fuente_id: 'no-existe-999', afirmacion: 'La ley Z establece W.', fragmento: 'W' }],
        jurisprudencia: [],
        doctrina: [],
        documento: [],
        conclusion: '',
      },
      sources: [normativaSource()],
      intent: 'general',
      query: '¿qué establece la ley?',
    });
    expect(result.outcome).toBe('NO_EVIDENCE');
    expect(result.persistedSources).toEqual([]);
    expect(result.researchWarnings.some((w) => w.includes('sin fuente válida'))).toBe(true);
    // Integridad de entrada: el schema no admite un claim sin sourceId.
    expect(
      AIResearchResponseSchema.safeParse({
        resumen: 'x',
        normativa: [{ fuente_id: '', afirmacion: 'Y', fragmento: 'Z' }],
        jurisprudencia: [],
        doctrina: [],
        documento: [],
        conclusion: '',
      }).success,
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// §22 — Métrica de attribution coverage.
// ---------------------------------------------------------------------------
describe('4.2.20 · attribution_coverage (§22)', () => {
  it('100% cuando todos los claims verificados tienen evidencia válida', () => {
    const claims = [
      { source_id: 'a', fragment_id: 'f1', fragmento: 'texto' },
      { source_id: 'b', fragment_id: null, fragmento: 'otro texto' },
    ];
    expect(computeAttributionCoverage(claims)).toBe(1);
  });

  it('0 verified claims → 1 (nada que atribuir mal; semántica vacía correcta)', () => {
    expect(computeAttributionCoverage([])).toBe(1);
  });

  it('expone attributionCoverage en el outcome del pipeline', () => {
    const result = buildJurisprudenceOutcome({
      data: {
        resumen: 'La ley reconoce los derechos.',
        normativa: [
          {
            fuente_id: 'bcn-21719',
            afirmacion: 'La ley reconoce el derecho de acceso.',
            fragmento: 'derecho a acceso',
          },
        ],
        jurisprudencia: [],
        doctrina: [],
        documento: [],
        conclusion: '',
      },
      sources: [normativaSource()],
      intent: 'general',
      query: '¿qué reconoce la ley?',
    });
    expect(result.outcome).toBe('SUCCESS');
    expect(result.attributionCoverage).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// §16 — Negativas: norma inventada, rol inexistente, hecho no presente.
// ---------------------------------------------------------------------------
describe('4.2.20 · negativas (anti-alucinación intacta)', () => {
  it('norma inventada (Ley 99.999) no se promueve ni se atribuye', () => {
    const result = buildJurisprudenceOutcome({
      data: {
        resumen: 'La Ley 99.999 regula la materia.',
        normativa: [
          { fuente_id: 'bcn-21719', afirmacion: 'La Ley 99.999 regula la materia.', fragmento: 'regula la materia' },
        ],
        jurisprudencia: [],
        doctrina: [],
        documento: [],
        conclusion: '',
      },
      sources: [normativaSource()],
      intent: 'normativa',
      query: '¿qué dice la Ley 99.999?',
    });
    expect(result.outcome).toBe('NO_EVIDENCE');
    expect(result.persistedSources).toEqual([]);
  });

  it('rol jurisprudencial inexistente se descarta', () => {
    const result = buildJurisprudenceOutcome({
      data: {
        resumen: 'Un rol inexistente establece X.',
        normativa: [],
        jurisprudencia: [
          { fuente_id: 'rol-999999', afirmacion: 'El rol 999999 establece X.', fragmento: 'establece X' },
        ],
        doctrina: [],
        documento: [],
        conclusion: '',
      },
      sources: [tcSource()],
      intent: 'general',
      query: '¿qué dice el rol 999999?',
    });
    expect(result.outcome).toBe('NO_EVIDENCE');
    expect(result.persistedSources).toEqual([]);
  });

  it('hecho no presente en el documento se descarta (no se atribuye)', () => {
    const doc = contratoDoc();
    const result = buildJurisprudenceOutcome({
      data: {
        resumen: 'El contrato señala que hubo daños.',
        normativa: [],
        jurisprudencia: [],
        doctrina: [],
        documento: [
          { document_id: doc.id, afirmacion: 'El contrato señala que hubo daños por el arrendatario.', fragmento: 'daños causados por el arrendatario' },
        ],
        conclusion: '',
      },
      sources: [],
      intent: 'general',
      query: '¿El contrato señala que hubo daños?',
      documents: [doc],
      documentMode: 'document',
    });
    expect(result.outcome).toBe('NO_EVIDENCE');
    expect(result.persistedSources).toEqual([]);
    expect(result.resumenFinal).toContain('No se encontró evidencia suficiente');
  });
});

// ---------------------------------------------------------------------------
// §16 — Mixtas: procedencia separada documento + normativa + jurisprudencia.
// ---------------------------------------------------------------------------
describe('4.2.20 · mixtas (procedencia separada)', () => {
  it('modo mixto: hechos del documento y fuentes públicas quedan en secciones separadas', () => {
    const doc = contratoDoc();
    const result = buildJurisprudenceOutcome({
      data: {
        resumen: 'El contrato fija el canon y la ley reconoce los derechos.',
        normativa: [
          {
            fuente_id: 'bcn-21719',
            afirmacion: 'La ley reconoce el derecho de acceso y supresión.',
            fragmento: 'derecho a acceso, rectificación, supresión',
          },
        ],
        jurisprudencia: [],
        doctrina: [],
        documento: [documentClaim(doc)],
        conclusion: '',
      },
      sources: [normativaSource()],
      intent: 'general',
      query: '¿cuál es la renta mensual y qué derecho de acceso reconoce la ley a los titulares?',
      documents: [doc],
      documentMode: 'mixed',
    });
    expect(result.outcome).toBe('SUCCESS');
    expect(result.answer).toContain('Hechos del caso (documentos)');
    expect(result.answer).toContain('Normativa relevante');
    const docSection = result.answer.split('Hechos del caso (documentos)')[1].split('Normativa relevante')[0];
    expect(docSection).toContain('500.000');
    expect(docSection).not.toContain('Ley 21.719');
    const normSection = result.answer.split('Normativa relevante')[1];
    expect(normSection).toContain('Ley 21.719');
  });

  it('fuente pública irrelevante sigue descartada en mixto con claim documental vivo (4.2.19 intacto)', () => {
    const doc = contratoDoc();
    const result = buildJurisprudenceOutcome({
      data: {
        resumen: 'El canon mensual es de 500.000 pesos.',
        normativa: [],
        jurisprudencia: [
          { fuente_id: 'j-datos', afirmacion: 'La protección de datos es un derecho fundamental.', fragmento: 'derecho fundamental' },
        ],
        doctrina: [],
        documento: [documentClaim(doc)],
        conclusion: '',
      },
      sources: [jurisDatos],
      intent: 'general',
      query: '¿Cuál es la renta mensual?',
      documents: [doc],
      documentMode: 'mixed',
    });
    expect(result.outcome).toBe('SUCCESS');
    expect(result.relevanceDroppedSources).toBe(1);
    expect(result.persistedSources.map((s) => s.id)).toEqual([doc.id]);
    // La fuente irrelevante solo aparece en Avisos (mención de descarte), no en
    // las secciones de claims/referencias de la respuesta.
    expect(result.answer.split('**Avisos**')[0]).not.toContain('5174');
  });
});

// ---------------------------------------------------------------------------
// §16 — Jurídicas: categoría de la fuente se conserva en la atribución.
// ---------------------------------------------------------------------------
describe('4.2.20 · atribución por categoría', () => {
  it('claim legal → categoría normativa; jurisprudencial → jurisprudencia; doctrinal → doctrina', () => {
    const result = buildJurisprudenceOutcome({
      data: {
        resumen: 'Ley, tribunal y doctrina.',
        normativa: [
          { fuente_id: 'bcn-21719', afirmacion: 'La ley reconoce el derecho de acceso.', fragmento: 'derecho a acceso' },
        ],
        jurisprudencia: [
          { fuente_id: 'tc-5174', afirmacion: 'El tribunal sostuvo que es derecho fundamental.', fragmento: 'derecho fundamental' },
        ],
        doctrina: [
          { fuente_id: 'doc-1', afirmacion: 'La doctrina sostiene que el consentimiento debe ser informado.', fragmento: 'consentimiento informado' },
        ],
        documento: [],
        conclusion: '',
      },
      sources: [normativaSource(), tcSource(), doctrinaSource()],
      intent: 'general',
      query: 'protección de datos personales',
    });
    expect(result.outcome).toBe('SUCCESS');
    const byId = (id) => result.persistedSources.find((s) => s.id === id);
    expect(byId('bcn-21719').claims[0].category).toBe('normativa');
    expect(byId('tc-5174').claims[0].category).toBe('jurisprudencia');
    expect(byId('doc-1').claims[0].category).toBe('doctrina');
  });

  it('claim doctrinal categórico sigue descartado por DOCTRINAL_OVERREACH_RE', () => {
    const doctrinaProhibicion = {
      id: 'doc-2',
      kind: 'doctrina',
      source_type: 'doctrina',
      legal_authority: 'doctrinal',
      vigency: 'no_aplica',
      citation: 'Autor. (2021). Ensayo sobre tratamiento de datos.',
      excerpt: 'el tratamiento de datos personales está prohibido por la ley',
    };
    const result = buildJurisprudenceOutcome({
      data: {
        resumen: 'La doctrina prohíbe el tratamiento de datos.',
        normativa: [],
        jurisprudencia: [],
        doctrina: [
          {
            fuente_id: 'doc-2',
            afirmacion: 'La doctrina establece que el tratamiento de datos personales está prohibido por la ley.',
            fragmento: 'el tratamiento de datos personales está prohibido por la ley',
          },
        ],
        documento: [],
        conclusion: '',
      },
      sources: [doctrinaProhibicion],
      intent: 'general',
      query: '¿qué dice la doctrina sobre el tratamiento de datos?',
    });
    expect(result.outcome).toBe('NO_EVIDENCE');
    expect(result.persistedSources).toEqual([]);
    expect(result.researchWarnings.some((w) => w.includes('doctrina') && w.includes('fuente normativa'))).toBe(true);
  });
});