import { describe, it, expect } from 'vitest';
import {
  classifyLegalQuery,
  DOCUMENT_SIGNAL_RE,
  GENERIC_LEGAL_SIGNAL_RE,
  hasCaseReferenceSignal,
} from './jurisprudenceSources.mjs';
import {
  detectDocumentMode,
  selectDocumentEvidence,
  verifyDocumentClaims,
} from './documentGrounding.mjs';

// ---------------------------------------------------------------------------
// Fase 4.2.9 — Detección de señal documental (corrección de falsos negativos).
// Causa raíz P1 de la auditoría 4.2.8: DOCUMENT_SIGNAL_RE exigía deíctico o
// verbo lector + sustantivo, así que "el contrato", "las partes del contrato"
// o "hechos del documento" → mode 'none' → el documento del caso se descartaba
// en silencio (respuestas FALSAS D2/D4/G3). Esta fase amplía la señal (6
// familias), añade un fallback documental cuando hay estructura de expediente
// y una señal jurídica genérica (P2). Sin tocar intent ni evidencias.
// ---------------------------------------------------------------------------

// Texto NFD (mismo preprocesado que classifyLegalQuery/detectDocumentMode):
// las regex de señales van en base ASCII y corren sobre texto sin diacríticos.
const nfd = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const CONTRATO_TEXT = (() => {
  const header = `CONTRATO DE ARRENDAMIENTO DE INMUEBLE
Entre doña María López, RUT 15.555.555-5, en adelante "la arrendadora", y don Jorge Pérez, RUT 16.666.666-6, en adelante "el arrendatario".
PRIMERA: La arrendadora da en arriendo al arrendatario el inmueble ubicado en Avenida Providencia 1234, departamento 501, comuna de Providencia, Región Metropolitana.
SEGUNDA: El plazo del contrato es de doce meses, contados desde el primer día del mes siguiente a la firma.
TERCERA: El arrendatario deberá destinar el inmueble exclusivamente a uso habitacional y no podrá subarrendarlo sin autorización escrita de la arrendadora.
CUARTA: El arrendatario deberá mantener el inmueble en buen estado y realizar los arreglos menores que su uso requiera.
`;
  const filler = Array.from(
    { length: 22 },
    (_, i) =>
      `CLÁUSULA ADICIONAL ${i + 1}: Las partes declaran que esta cláusula complementaria ${i + 1} no modifica las disposiciones anteriores del presente contrato y que su contenido es meramente informativo para el correcto entendimiento de los derechos y obligaciones de las partes contratantes.\n`,
  ).join('');
  const canon = `
QUINTA: La arrendadora podrá terminar anticipadamente el contrato si el arrendatario no paga el canon de arrendamiento por dos meses consecutivos, previa carta de aviso.
SEXTA: El arrendatario deberá pagar a la arrendadora un canon de arrendamiento mensual de 500.000 pesos, dentro de los primeros cinco días hábiles de cada mes, mediante transferencia electrónica a la cuenta que la arrendadora indique.
`;
  return header + filler + canon;
})();

const contratoDoc = (overrides = {}) => ({
  id: 'doc-22222222-bbbb-4ccc-8ddd-000000000002',
  workspace_id: 'ws-1',
  lawyer_id: 'lawyer-1',
  original_filename: 'contrato-arriendo.pdf',
  status: 'ready',
  extracted_text: CONTRATO_TEXT,
  ...overrides,
});

const EXPEDIENTE_TEXT = `EXPEDIENTE PENAL — ROL 12.345-2026
Antecedentes del caso: el 3 de marzo de 2026 se produjo la detención del imputado Carlos Fuentes, RUT 20.000.000-1, en la comuna de Maipú.
OFICIO N° 1: la fiscalía remitió a la defensa el oficio que contiene los antecedentes de la audiencia de formalización celebrada el 5 de marzo de 2026.
RESOLUCION: el tribunal decretó la prisión preventiva del imputado por estimar que existe un peligro para la seguridad de la sociedad.
La defensa presentó ante la Corte de Apelaciones una solicitud de cautela de garantías, la que fue acompañada con los antecedentes que obran en el expediente.
`;
const expedienteDoc = (overrides = {}) => ({
  id: 'doc-33333333-cccc-4ddd-8eee-000000000003',
  workspace_id: 'ws-1',
  lawyer_id: 'lawyer-1',
  original_filename: 'expediente-penal.pdf',
  status: 'ready',
  extracted_text: EXPEDIENTE_TEXT,
  ...overrides,
});

const OWNERSHIP = { workspaceId: 'ws-1', lawyerId: 'lawyer-1' };

// ---------------------------------------------------------------------------
// A · Señal primaria ampliada (DOCUMENT_SIGNAL_RE, 6 familias).
// ---------------------------------------------------------------------------
describe('A · DOCUMENT_SIGNAL_RE ampliado (P1)', () => {
  it('matchea "partes del contrato" (familia "X del contrato")', () => {
    expect(DOCUMENT_SIGNAL_RE.test(nfd('¿Quiénes son las partes del contrato?'))).toBe(true);
  });

  it('matchea "cláusula del contrato"', () => {
    expect(DOCUMENT_SIGNAL_RE.test(nfd('¿La cláusula del contrato es válida?'))).toBe(true);
  });

  it('matchea "hechos relevantes del caso" (familia "X del caso")', () => {
    expect(DOCUMENT_SIGNAL_RE.test(nfd('¿Cuáles son los hechos relevantes del caso?'))).toBe(true);
  });

  it('matchea eventos procesales ("se presentaron", "lo solicitado")', () => {
    expect(DOCUMENT_SIGNAL_RE.test(nfd('¿Se presentaron los oficios de la audiencia?'))).toBe(true);
    expect(DOCUMENT_SIGNAL_RE.test(nfd('¿Qué contiene lo solicitado por la defensa?'))).toBe(true);
  });

  it('matchea fecha/tiempo de detención o prisión preventiva', () => {
    expect(DOCUMENT_SIGNAL_RE.test(nfd('¿Cuál es la fecha de detención de mi cliente?'))).toBe(true);
    expect(DOCUMENT_SIGNAL_RE.test(nfd('¿Cuánto tiempo lleva en prisión preventiva?'))).toBe(true);
    expect(DOCUMENT_SIGNAL_RE.test(nfd('¿Cuántos meses lleva mi cliente en prisión preventiva?'))).toBe(true);
  });

  it('sigue matcheando deíctico y verbo lector (regresión 4.2.6)', () => {
    expect(DOCUMENT_SIGNAL_RE.test(nfd('¿Qué dice el contrato?'))).toBe(true);
    expect(DOCUMENT_SIGNAL_RE.test(nfd('¿Cuál es el riesgo de esta cláusula?'))).toBe(true);
    expect(DOCUMENT_SIGNAL_RE.test(nfd('¿Qué establece la escritura de compraventa?'))).toBe(true);
  });

  it('NO matchea [artículo definido + contrato] suelto (invariante 4.2.6)', () => {
    expect(DOCUMENT_SIGNAL_RE.test(nfd('¿Puedo terminar el contrato por incumplimiento?'))).toBe(false);
    expect(DOCUMENT_SIGNAL_RE.test(nfd('¿Es válida la terminación unilateral del contrato?'))).toBe(false);
  });

  it('NO matchea "prisión preventiva" suelta como materia jurídica', () => {
    expect(DOCUMENT_SIGNAL_RE.test(nfd('¿Qué ha dicho el TC sobre la prisión preventiva?'))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// B · Señal jurídica genérica (GENERIC_LEGAL_SIGNAL_RE, P2).
// ---------------------------------------------------------------------------
describe('B · GENERIC_LEGAL_SIGNAL_RE (P2)', () => {
  it('detecta frases legales sin cita concreta', () => {
    expect(GENERIC_LEGAL_SIGNAL_RE.test(nfd('¿Qué riesgo tiene según la normativa aplicable?'))).toBe(true);
    expect(GENERIC_LEGAL_SIGNAL_RE.test(nfd('¿Qué fuentes jurídicas respaldan esto?'))).toBe(true);
    expect(GENERIC_LEGAL_SIGNAL_RE.test(nfd('¿Qué normas o fallos podrían ser aplicables?'))).toBe(true);
  });

  it('NO confunde una consulta puramente documental', () => {
    expect(GENERIC_LEGAL_SIGNAL_RE.test(nfd('¿Qué hechos del caso son relevantes?'))).toBe(false);
    expect(GENERIC_LEGAL_SIGNAL_RE.test(nfd('¿Qué dice el contrato sobre el canon?'))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// C · Fallback documental (hasCaseReferenceSignal).
// ---------------------------------------------------------------------------
describe('C · fallback documental hasCaseReferenceSignal', () => {
  it('detecta estructura de expediente con determinante ("la cláusula")', () => {
    expect(hasCaseReferenceSignal(nfd('¿La cláusula de término anticipado permite terminar el contrato?'))).toBe(true);
  });

  it('detecta "las cautelas de garantías"', () => {
    expect(hasCaseReferenceSignal(nfd('¿Se pueden caer las cautelas de garantías?'))).toBe(true);
  });

  it('detecta sustantivo estructural + del caso', () => {
    expect(hasCaseReferenceSignal(nfd('¿Qué oficios del caso se deben adjuntar?'))).toBe(true);
  });

  it('NO detecta "contrato" suelto (invariante 4.2.6)', () => {
    expect(hasCaseReferenceSignal(nfd('¿Puedo terminar el contrato por incumplimiento?'))).toBe(false);
  });

  it('se BLOQUEA ante jurisprudencia sobre tópico abstracto', () => {
    expect(hasCaseReferenceSignal(nfd('¿Qué ha dicho el TC sobre la prisión preventiva?'), { hasJurisprudence: true })).toBe(false);
    expect(hasCaseReferenceSignal(nfd('¿Qué ha dicho el TC sobre las cláusulas de término anticipado?'), { hasJurisprudence: true })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// D · TESTS CRÍTICOS 4.2.9: D2, D4, G3 (FAIL críticos de la auditoría 4.2.8).
// ---------------------------------------------------------------------------
describe('D · casos críticos D2 / D4 / G3', () => {
  it('D2: "¿La cláusula de término anticipado permite terminar el contrato?" → document + evidencia', () => {
    const query = '¿La cláusula de término anticipado permite terminar el contrato?';
    const cls = classifyLegalQuery(query);
    expect(cls.intent).toBe('NORMATIVE_APPLICATION');
    const r = detectDocumentMode(query, [contratoDoc()], cls);
    expect(r.mode).toBe('document');
    expect(r.fallbackSignal).toBe(true);
    expect(r.noEvidence).toBe(false);

    const { selected, stats, docsById } = selectDocumentEvidence({
      documents: [contratoDoc()],
      query,
      ...OWNERSHIP,
    });
    expect(stats.documents_used).toBe(1);
    expect(stats.fragments_selected).toBeGreaterThan(0);
    expect(selected.some((f) => f.text.includes('terminar anticipadamente'))).toBe(true);

    const frag = selected.find((f) => f.text.includes('terminar anticipadamente'));
    const { kept } = verifyDocumentClaims(
      [
        {
          document_id: contratoDoc().id,
          fragment_id: frag.id,
          afirmacion: 'La arrendadora podrá terminar anticipadamente el contrato si el arrendatario no paga el canon por dos meses consecutivos',
          fragmento: frag.text,
        },
      ],
      docsById,
      'ws-1',
      'lawyer-1',
    );
    expect(kept).toHaveLength(1);
  });

  it('D4: "¿Quiénes son las partes del contrato?" → document + DOCUMENT_ANALYSIS + partes', () => {
    const query = '¿Quiénes son las partes del contrato?';
    const cls = classifyLegalQuery(query);
    expect(cls.intent).toBe('DOCUMENT_ANALYSIS');
    const r = detectDocumentMode(query, [contratoDoc()], cls);
    expect(r.mode).toBe('document');
    expect(r.documentSignal).toBe(true);
    expect(r.fallbackSignal).toBe(false);

    const { selected, stats, docsById } = selectDocumentEvidence({
      documents: [contratoDoc()],
      query,
      ...OWNERSHIP,
    });
    expect(stats.documents_used).toBe(1);
    expect(selected.some((f) => f.text.includes('María López'))).toBe(true);
    expect(selected.some((f) => f.text.includes('Jorge Pérez'))).toBe(true);

    const frag = selected.find((f) => f.text.includes('María López'));
    const { kept } = verifyDocumentClaims(
      [
        {
          document_id: contratoDoc().id,
          fragment_id: frag.id,
          afirmacion: 'Las partes del contrato son María López y Jorge Pérez',
          fragmento: frag.text,
        },
      ],
      docsById,
      'ws-1',
      'lawyer-1',
    );
    expect(kept).toHaveLength(1);
  });

  it('G3: "…hechos relevantes del caso y qué normas o fallos podrían ser aplicables?" → mixed + documento + fuentes', () => {
    const query = '¿Cuáles son los hechos relevantes del caso y qué normas o fallos podrían ser aplicables?';
    const cls = classifyLegalQuery(query);
    const r = detectDocumentMode(query, [contratoDoc()], cls);
    expect(r.mode).toBe('mixed');
    expect(r.documentSignal).toBe(true);
    expect(r.hasLegal).toBe(true);
    expect(r.noEvidence).toBe(false);

    const { selected, stats } = selectDocumentEvidence({
      documents: [contratoDoc()],
      query,
      ...OWNERSHIP,
    });
    expect(stats.documents_used).toBe(1);
    expect(stats.fragments_selected).toBeGreaterThan(0);
    expect(selected.some((f) => f.text.includes('terminar anticipadamente'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// E · Casos de expediente penal (señal 4.2.9, uso detectado en QA/Reddit).
// ---------------------------------------------------------------------------
describe('E · consultas sobre expediente penal', () => {
  const docs = [expedienteDoc()];

  it('fecha de detención → document', () => {
    const q = '¿Cuál es la fecha de detención de mi cliente?';
    const cls = classifyLegalQuery(q);
    const r = detectDocumentMode(q, docs, cls);
    expect(r.mode).toBe('document');
    const { context } = selectDocumentEvidence({ documents: docs, query: q, ...OWNERSHIP });
    expect(context).toContain('detención');
  });

  it('tiempo en prisión preventiva → document', () => {
    const q = '¿Cuánto tiempo lleva en prisión preventiva?';
    const cls = classifyLegalQuery(q);
    const r = detectDocumentMode(q, docs, cls);
    expect(r.mode).toBe('document');
    const { context } = selectDocumentEvidence({ documents: docs, query: q, ...OWNERSHIP });
    expect(context).toContain('prisión preventiva');
  });

  it('cautela de garantías → document (vía fallback)', () => {
    const q = '¿Se pueden caer las cautelas de garantías?';
    const cls = classifyLegalQuery(q);
    const r = detectDocumentMode(q, docs, cls);
    expect(r.mode).toBe('document');
    expect(r.fallbackSignal).toBe(true);
    const { context } = selectDocumentEvidence({ documents: docs, query: q, ...OWNERSHIP });
    expect(context).toContain('cautela');
  });

  it('oficios de la audiencia → document', () => {
    const q = '¿Se presentaron los oficios de la audiencia?';
    const cls = classifyLegalQuery(q);
    const r = detectDocumentMode(q, docs, cls);
    expect(r.mode).toBe('document');
    const { context } = selectDocumentEvidence({ documents: docs, query: q, ...OWNERSHIP });
    expect(context).toContain('oficio');
  });

  it('antecedentes para la audiencia → document', () => {
    const q = '¿Qué antecedentes se presentaron para la audiencia?';
    const cls = classifyLegalQuery(q);
    const r = detectDocumentMode(q, docs, cls);
    expect(r.mode).toBe('document');
    const { context } = selectDocumentEvidence({ documents: docs, query: q, ...OWNERSHIP });
    expect(context).toContain('antecedentes');
  });
});

// ---------------------------------------------------------------------------
// F · Negativos (sin falso positivo hacia modo documento).
// ---------------------------------------------------------------------------
describe('F · negativos: consultas jurídicas puras permanecen none', () => {
  it('artículo 1545 sin estructura de expediente → none', () => {
    const q = '¿Qué establece el artículo 1545 del Código Civil sobre la terminación del contrato?';
    const cls = classifyLegalQuery(q);
    expect(cls.articleCitations).toContain('1545');
    const r = detectDocumentMode(q, [contratoDoc()], cls);
    expect(r.mode).toBe('none');
    expect(r.documentSignal).toBe(false);
    expect(r.fallbackSignal).toBe(false);
  });

  it('jurisprudencia sobre término anticipado de los contratos → none', () => {
    const q = '¿Qué ha dicho el Tribunal Constitucional sobre la terminación anticipada de los contratos?';
    const cls = classifyLegalQuery(q);
    expect(cls.intent).toBe('JURISPRUDENCE_LOOKUP');
    const r = detectDocumentMode(q, [contratoDoc()], cls);
    expect(r.mode).toBe('none');
  });

  it('jurisprudencia TC sobre prisión preventiva → none', () => {
    const q = '¿Qué ha dicho el Tribunal Constitucional sobre la prisión preventiva?';
    const cls = classifyLegalQuery(q);
    expect(cls.intent).toBe('JURISPRUDENCE_LOOKUP');
    const r = detectDocumentMode(q, [expedienteDoc()], cls);
    expect(r.mode).toBe('none');
    expect(r.fallbackSignal).toBe(false);
  });

  it('el fallback requiere documentos (sin docs nunca dispara señal)', () => {
    const q = '¿La cláusula de término anticipado permite terminar el contrato?';
    const cls = classifyLegalQuery(q);
    const r = detectDocumentMode(q, [], cls);
    expect(r.mode).toBe('none');
    expect(r.fallbackSignal).toBe(false);
    expect(r.noEvidence).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// G · Modo mixto (§10) + invariante de la Fase 4.2.6.
// ---------------------------------------------------------------------------
describe('G · mixto y regresión 4.2.6', () => {
  it('estructura del contrato + artículo 1545 → mixed (no DOCUMENT_ANALYSIS)', () => {
    const q = '¿La cláusula del contrato es compatible con el artículo 1545?';
    const cls = classifyLegalQuery(q);
    expect(cls.intent).not.toBe('DOCUMENT_ANALYSIS');
    const r = detectDocumentMode(q, [contratoDoc()], cls);
    expect(r.mode).toBe('mixed');
    expect(r.hasLegal).toBe(true);
  });

  it('E2: cláusula según la normativa aplicable → mixed (señal genérica + fallback)', () => {
    const q = '¿Cuál es el riesgo de la cláusula según la normativa aplicable?';
    const cls = classifyLegalQuery(q);
    const r = detectDocumentMode(q, [contratoDoc()], cls);
    expect(r.mode).toBe('mixed');
    expect(r.fallbackSignal).toBe(true);
    expect(r.hasLegal).toBe(true);
  });

  it('invariante 4.2.6: aplicación normativa sin señal documental → none', () => {
    const q = '¿Puedo terminar el contrato por incumplimiento?';
    const cls = classifyLegalQuery(q);
    expect(cls.intent).toBe('NORMATIVE_APPLICATION');
    const r = detectDocumentMode(q, [contratoDoc()], cls);
    expect(r.mode).toBe('none');
    expect(r.documentSignal).toBe(false);
  });

  it('consulta documental sin documentos → noEvidence true (gate intacto)', () => {
    const q = '¿Qué dice el contrato sobre el canon?';
    const cls = classifyLegalQuery(q);
    const r = detectDocumentMode(q, [], cls);
    expect(r.noEvidence).toBe(true);
    expect(r.mode).toBe('document');
  });
});