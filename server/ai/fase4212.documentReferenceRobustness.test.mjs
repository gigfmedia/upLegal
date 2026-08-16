import { describe, it, expect } from 'vitest';
import {
  detectDocumentMode,
  verifyDocumentClaims,
  checkDocumentClaimFacts,
  shouldAllowDocumentOnlyFallback,
  chunkDocumentText,
  DOCUMENT_FRAGMENT_PREFIX,
} from './documentGrounding.mjs';
import { classifyLegalQuery, hasCaseContentReference } from './jurisprudenceSources.mjs';

// ---------------------------------------------------------------------------
// Fase 4.2.12 — Robustez de referencias documentales (H3/H4/H5).
// Corrige tres hallazgos de la auditoría 4.2.11:
//   H3: consultas naturales sobre contenido del caso ("¿Qué riesgos tiene el
//       contrato?", "¿Se permite subarrendar?") caían a mode 'none'.
//   H4: la verificación literal de claims (Nivel 1) descartaba paráfrasis
//       válidas de hechos (no-determinismo D4/M1) y aceptaba cifras/roles no
//       respaldados por solape parcial.
//   H5: retrieval público vacío + documento suficiente → 422 NO_SOURCES_FOUND
//       pese a tener evidencia documental para responder.
// Todo determinístico, sin LLM ni embeddings.
// ---------------------------------------------------------------------------

const MINI_CONTRATO = `CONTRATO DE ARRENDAMIENTO DE INMUEBLE
Entre don Juan Pérez, en adelante "el arrendador", y don Jorge Pérez, en adelante "el arrendatario".
PRIMERA: El arrendador da en arriendo al arrendatario el inmueble ubicado en calle Los Silos 456, comuna de Providencia.
SEGUNDA: El plazo del contrato es de doce meses, contados desde el primer día del mes siguiente a la firma.
TERCERA: El arrendatario deberá pagar al arrendador un canon de arrendamiento mensual de 500.000 pesos, dentro de los primeros cinco días hábiles de cada mes.
CUARTA: El arrendatario no podrá subarrendar el inmueble sin autorización escrita del arrendador.
QUINTA: El arrendador podrá terminar anticipadamente el contrato si el arrendatario no paga el canon por dos meses consecutivos, previa carta de aviso.`;

const contratoDoc = (overrides = {}) => ({
  id: 'doc-4212-1111-aaaa-4bbb-8ccc-000000000001',
  original_filename: 'contrato-arriendo-4212.pdf',
  status: 'ready',
  extracted_text: MINI_CONTRATO,
  ...overrides,
});

const SEGUNDA_FRAG =
  'El plazo del contrato es de doce meses, contados desde el primer día del mes siguiente a la firma.';
const CANON_FRAG =
  'El arrendatario deberá pagar al arrendador un canon de arrendamiento mensual de 500.000 pesos, dentro de los primeros cinco días hábiles de cada mes.';

const docClaim = (overrides = {}) => ({
  document_id: contratoDoc().id,
  fragment_id: null,
  fragmento: '',
  ...overrides,
});

describe('H3 · señal de contenido factual del caso (hasCaseContentReference)', () => {
  it('positivos del spec: contenido del contrato → referencia documental', () => {
    const positives = [
      '¿Qué riesgos asume el arrendatario en este contrato?',
      '¿Cuál es el plazo del contrato?',
      '¿Qué renta se pactó en el contrato?',
      '¿Se permite subarrendar el inmueble?',
      '¿Qué hechos se describen en el documento?',
      '¿Cuáles son las obligaciones de las partes?',
      '¿Qué dice el contrato sobre la garantía?',
    ];
    for (const q of positives) {
      expect(hasCaseContentReference(q)).toBe(true);
    }
  });

  it('negativos del spec: consultas públicas NO son referencia documental', () => {
    const negatives = [
      '¿Qué derechos reconoce la Ley 21.719 sobre protección de datos personales?',
      '¿Cuál es la regulación del teletrabajo en Chile?',
      '¿Qué ha dicho el Tribunal Constitucional sobre las cláusulas de término anticipado?',
      '¿Se permite cobrar comisiones en Chile?',
      '¿Qué normativa regula el plazo de los contratos de trabajo?',
      '¿Se permite terminar la relación laboral sin aviso previo?',
      '¿Qué plazo establece el reglamento para la notificación?',
      '¿Cuál es el plazo de prescripción de las acciones?',
    ];
    for (const q of negatives) {
      expect(hasCaseContentReference(q)).toBe(false);
    }
  });

  it('se bloquea ante señal de jurisprudencia y ante marco de fuentes públicas', () => {
    expect(hasCaseContentReference('¿Qué ha dicho el TC sobre la prisión preventiva?', { hasJurisprudence: true })).toBe(false);
    expect(hasCaseContentReference('¿Qué riesgos asume el contrato según la ley?')).toBe(false);
    expect(hasCaseContentReference('¿Qué plazo establece el artículo 1545?')).toBe(false);
  });

  it('detectDocumentMode pasa a document para las consultas de contenido (P1-P7)', () => {
    const positives = [
      '¿Qué riesgos asume el arrendatario en este contrato?',
      '¿Cuál es el plazo del contrato?',
      '¿Qué renta se pactó en el contrato?',
      '¿Se permite subarrendar el inmueble?',
      '¿Qué hechos se describen en el documento?',
      '¿Cuáles son las obligaciones de las partes?',
      '¿Qué dice el contrato sobre la garantía?',
    ];
    for (const q of positives) {
      const cls = classifyLegalQuery(q);
      const r = detectDocumentMode(q, [contratoDoc()], cls);
      expect(r.mode).toBe('document');
    }
  });

  it('detectDocumentMode mantiene none para consultas públicas (N1-N5 + guards)', () => {
    const negatives = [
      '¿Qué derechos reconoce la Ley 21.719 sobre protección de datos personales?',
      '¿Cuál es la regulación del teletrabajo en Chile?',
      '¿Qué ha dicho el Tribunal Constitucional sobre las cláusulas de término anticipado?',
      '¿Se permite cobrar comisiones en Chile?',
      '¿Qué normativa regula el plazo de los contratos de trabajo?',
      '¿Se permite terminar la relación laboral sin aviso previo?',
      '¿Qué plazo establece el reglamento para la notificación?',
    ];
    for (const q of negatives) {
      const cls = classifyLegalQuery(q);
      const r = detectDocumentMode(q, [contratoDoc()], cls);
      expect(r.mode).toBe('none');
    }
  });

  it('invariantes: mixto para doc+ley/tribunal y none para aplicación pura', () => {
    const q1 = '¿Qué jurisprudencia existe sobre este contrato?';
    const r1 = detectDocumentMode(q1, [contratoDoc()], classifyLegalQuery(q1));
    expect(r1.mode).toBe('mixed');

    const q2 = '¿Esta cláusula es compatible con el artículo 1545 del Código Civil?';
    const r2 = detectDocumentMode(q2, [contratoDoc()], classifyLegalQuery(q2));
    expect(r2.mode).toBe('mixed');

    // Invariante 4.2.6: "puedo terminar el contrato" sigue siendo aplicación
    // normativa (mode none), no secuestrada por H3.
    const q3 = '¿Puedo terminar el contrato por incumplimiento?';
    const r3 = detectDocumentMode(q3, [contratoDoc()], classifyLegalQuery(q3));
    expect(r3.mode).toBe('none');

    // E2 (fase 4.2.9 G): "según la normativa aplicable" mantiene mixed vía
    // fallback estructural, sin regresión por H3.
    const q4 = '¿Cuál es el riesgo de la cláusula según la normativa aplicable?';
    const r4 = detectDocumentMode(q4, [contratoDoc()], classifyLegalQuery(q4));
    expect(r4.mode).toBe('mixed');
    expect(r4.fallbackSignal).toBe(true);
  });

  it('la señal de contenido exige hasDocs: sin documentos NO activa modo document', () => {
    const q = '¿Qué riesgos tiene el contrato?';
    const cls = classifyLegalQuery(q);
    const withDocs = detectDocumentMode(q, [contratoDoc()], cls);
    const withoutDocs = detectDocumentMode(q, [], cls);
    expect(withDocs.contentSignal).toBe(true);
    expect(withoutDocs.contentSignal).toBe(false);
    expect(withoutDocs.mode).toBe('none');
  });

  it('contentSignal aporta señal propia (fallback 4.2.9 no la cubre)', () => {
    const q = '¿Qué riesgos tiene el contrato?';
    const r = detectDocumentMode(q, [contratoDoc()], classifyLegalQuery(q));
    expect(r.fallbackSignal).toBe(false);
    expect(r.contentSignal).toBe(true);
  });
});

describe('H4 · verificación de hechos verificables (checkDocumentClaimFacts)', () => {
  it('accept: paráfrasis de hecho con número respaldado y ancla sustantiva', () => {
    expect(checkDocumentClaimFacts('La duración de la vigencia contractual es de 12 meses', SEGUNDA_FRAG)).toBe('accept');
    expect(checkDocumentClaimFacts('El arrendatario se obliga a pagar una renta mensual de 500.000 pesos', CANON_FRAG)).toBe('accept');
  });

  it('reject: monto contradicho por el fragmento', () => {
    expect(checkDocumentClaimFacts('El arrendatario debe pagar una renta mensual de 700.000 pesos', CANON_FRAG)).toBe('reject');
  });

  it('reject: rol asignado distinto al respaldado por el fragmento', () => {
    expect(checkDocumentClaimFacts('La propietaria deberá pagar un canon de arrendamiento mensual de 500.000 pesos', CANON_FRAG)).toBe('reject');
  });

  it('reject: cifra inexistente en el documento', () => {
    expect(checkDocumentClaimFacts('El arrendatario posee tres propiedades en la costa', CANON_FRAG)).toBe('reject');
  });

  it('neutral: sin hechos verificables decide el Nivel 1', () => {
    expect(checkDocumentClaimFacts('La cláusula es exigible', CANON_FRAG)).toBe('neutral');
  });

  it('no acepta un número de cláusula como hecho: número y ancla deben co-ocurrir en la misma oración', () => {
    const mixed =
      'CLÁUSULA ADICIONAL 3: Las partes declaran que su contenido es meramente informativo.\nEntre don Juan Pérez, en adelante el arrendatario, y doña María, la arrendadora.';
    expect(checkDocumentClaimFacts('El arrendatario posee tres propiedades en la costa', mixed)).toBe('neutral');
  });

  it('accept: número y ancla fuerte en la misma oración (terminación por dos meses)', () => {
    const quinta =
      'El arrendador podrá terminar anticipadamente el contrato si el arrendatario no paga el canon por dos meses consecutivos, previa carta de aviso.';
    expect(checkDocumentClaimFacts('El arrendador puede terminar el contrato por dos meses de impago', quinta)).toBe('accept');
  });

  it('no distingue por género del rol: arrendataria y arrendatario son el mismo rol', () => {
    const femFrag = 'La arrendataria deberá pagar al arrendador un canon de arrendamiento mensual de 500.000 pesos.';
    expect(checkDocumentClaimFacts('El arrendatario debe pagar una renta mensual de 500.000 pesos', femFrag)).toBe('accept');
  });
});

describe('H4 · integración en verifyDocumentClaims (mini documento, un chunk)', () => {
  const docsById = new Map([[contratoDoc().id, contratoDoc()]]);
  const chunks = chunkDocumentText(MINI_CONTRATO, { documentId: contratoDoc().id });
  expect(chunks.length).toBe(1);
  const chunkId = chunks[0].id;

  it('RESCATA paráfrasis de hecho que el Nivel 1 (solape léxico) no ve', () => {
    const { kept } = verifyDocumentClaims(
      [docClaim({ afirmacion: 'La duración de la vigencia contractual es de 12 meses' })],
      docsById,
    );
    expect(kept).toHaveLength(1);
    expect(kept[0].fragmento).toContain('doce meses');
    expect(kept[0].fragment_id).toMatch(new RegExp(`^${DOCUMENT_FRAGMENT_PREFIX}::`));
  });

  it('mantiene paráfrasis válida con número y rol respaldados (L1+L2)', () => {
    const { kept } = verifyDocumentClaims(
      [docClaim({ afirmacion: 'El arrendatario se obliga a pagar una renta mensual de 500.000 pesos' })],
      docsById,
    );
    expect(kept).toHaveLength(1);
    expect(kept[0].fragmento).toContain('500.000');
  });

  it('descarta claim con monto contradicho (700.000 vs 500.000) aunque el Nivel 1 lo acepte', () => {
    const { kept, warnings } = verifyDocumentClaims(
      [docClaim({ afirmacion: 'El arrendatario debe pagar una renta mensual de 700.000 pesos', fragment_id: chunkId })],
      docsById,
    );
    expect(kept).toHaveLength(0);
    expect(warnings.length).toBeGreaterThan(0);
  });

  it('descarta claim con rol ajeno (propietaria ≠ arrendador/arrendatario)', () => {
    const { kept, warnings } = verifyDocumentClaims(
      [docClaim({ afirmacion: 'La propietaria deberá pagar un canon de arrendamiento mensual de 500.000 pesos' })],
      docsById,
    );
    expect(kept).toHaveLength(0);
    expect(warnings.length).toBeGreaterThan(0);
  });

  it('descarta hecho fabricado (cifra inexistente) — regresión D4', () => {
    const { kept, warnings } = verifyDocumentClaims(
      [docClaim({ afirmacion: 'El arrendatario posee tres propiedades en la costa' })],
      docsById,
    );
    expect(kept).toHaveLength(0);
    expect(warnings.length).toBeGreaterThan(0);
  });

  it('descarta hecho fabricado con ancla genérica "contrato" + número espurio (fase 4.2.12)', () => {
    const { kept, warnings } = verifyDocumentClaims(
      [docClaim({ afirmacion: 'El contrato garantiza tres inmuebles adicionales' })],
      docsById,
    );
    expect(kept).toHaveLength(0);
    expect(warnings.length).toBeGreaterThan(0);
  });
});

describe('H5 · fallback solo-documental ante retrieval público vacío', () => {
  it('permite responder solo con el documento para intents documental-compatibles', () => {
    expect(shouldAllowDocumentOnlyFallback({ documentMode: 'mixed', intent: 'GENERAL_LEGAL_QUERY', hasDocs: true })).toBe(true);
    expect(shouldAllowDocumentOnlyFallback({ documentMode: 'mixed', intent: 'DOCUMENT_ANALYSIS', hasDocs: true })).toBe(true);
  });

  it('mantiene NO_SOURCES_FOUND cuando la consulta exige fuentes públicas', () => {
    expect(shouldAllowDocumentOnlyFallback({ documentMode: 'mixed', intent: 'JURISPRUDENCE_LOOKUP', hasDocs: true })).toBe(false);
    expect(shouldAllowDocumentOnlyFallback({ documentMode: 'mixed', intent: 'ARTICLE_LOOKUP', hasDocs: true })).toBe(false);
    expect(shouldAllowDocumentOnlyFallback({ documentMode: 'mixed', intent: 'BARE_NORM_CITATION', hasDocs: true })).toBe(false);
    expect(shouldAllowDocumentOnlyFallback({ documentMode: 'mixed', intent: 'NORMATIVE_APPLICATION', hasDocs: true })).toBe(false);
    expect(shouldAllowDocumentOnlyFallback({ documentMode: 'mixed', intent: 'DOCTRINE_LOOKUP', hasDocs: true })).toBe(false);
  });

  it('rechaza sin documentos o en modo none, y respeta el intent en modo document', () => {
    expect(shouldAllowDocumentOnlyFallback({ documentMode: 'none', intent: 'GENERAL_LEGAL_QUERY', hasDocs: true })).toBe(false);
    expect(shouldAllowDocumentOnlyFallback({ documentMode: 'mixed', intent: 'GENERAL_LEGAL_QUERY', hasDocs: false })).toBe(false);
    // Modo document ES solo-documento por definición: se permite para intents
    // generales, pero una consulta que exige fuentes públicas sigue bloqueada.
    expect(shouldAllowDocumentOnlyFallback({ documentMode: 'document', intent: 'GENERAL_LEGAL_QUERY', hasDocs: true })).toBe(true);
    expect(shouldAllowDocumentOnlyFallback({ documentMode: 'document', intent: 'JURISPRUDENCE_LOOKUP', hasDocs: true })).toBe(false);
  });

  it('el intent real del clasificador rige la decisión en el endpoint', () => {
    // E2: "según la normativa aplicable" → GENERAL_LEGAL_QUERY → rescatable.
    const e2 = classifyLegalQuery('¿Cuál es el riesgo de la cláusula según la normativa aplicable?');
    expect(e2.intent).toBe('GENERAL_LEGAL_QUERY');
    expect(shouldAllowDocumentOnlyFallback({ documentMode: 'mixed', intent: e2.intent, hasDocs: true })).toBe(true);

    // Consulta de jurisprudencia pura → NO rescatable (no se fabrica
    // jurisprudencia desde el documento).
    const tc = classifyLegalQuery('¿Qué ha dicho el TC sobre las cláusulas de término anticipado?');
    expect(tc.intent).toBe('JURISPRUDENCE_LOOKUP');
    expect(shouldAllowDocumentOnlyFallback({ documentMode: 'mixed', intent: tc.intent, hasDocs: true })).toBe(false);
  });
});