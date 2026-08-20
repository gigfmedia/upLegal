import { describe, it, expect } from 'vitest';
import { isSourceResponsiveToQuery } from './jurisprudenceSources.mjs';
import { buildJurisprudenceOutcome, applyRelevanceGate } from './jurisprudencePipeline.mjs';

// ---------------------------------------------------------------------------
// Fase 4.2.19 — Relevancia semántica frente a la PREGUNTA EQUIVOCADA.
//
// Hallazgo auditado (read-only): el gate de relevancia post-retrieval
// (Fase 4.2.14, jurisprudencePipeline.mjs:331) solo filtra las fuentes públicas
// cuando NINGÚN claim documental sobrevivió la verificación:
//
//   const gateShouldFilter = documentMode !== 'none' && verifiedDocumentos.kept.length === 0;
//
// Consecuencia: en modo 'mixed' con claims documentales VÁLIDOS, una fuente
// pública VERIFICABLE pero IRRELEVANTE a la pregunta ("VERIFICABLE=true,
// RELEVANTE=false") sobrevive y se exhibe en claims, fuentes y Markdown. El
// documento responde la pregunta, pero el sistema igual presenta jurisprudencia
// de otra materia como respaldo de la misma pregunta factual.
//
// Regla exigida (Fase 4.2.19): una fuente no responsive a la intención de la
// pregunta NO debe aparecer ni en claims ni en fuentes ni en el Markdown final,
// aun cuando existan claims documentales verificados. Relevancia ≠ ausencia de
// evidencia: si el documento responde, el resultado es SUCCESS con la evidencia
// documental y la fuente pública irrelevante descartada (jamás NO_EVIDENCE).
// Todo determinístico, sin LLM.
// ---------------------------------------------------------------------------

const contratoDoc = (overrides = {}) => ({
  id: 'doc-4219-1111-aaaa-4bbb-8ccc-000000000001',
  original_filename: 'contrato-arriendo-4219.pdf',
  status: 'ready',
  extracted_text:
    'PRIMERA: El canon de arrendamiento mensual es de 500.000 pesos. SEGUNDA: El plazo del contrato es de doce meses.',
  ...overrides,
});

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

describe('isSourceResponsiveToQuery · 4.2.19', () => {
  it('fuente verificable de otra materia NO responde la pregunta factual del documento', () => {
    expect(
      isSourceResponsiveToQuery({
        query: '¿Cuál es la renta mensual?',
        source: jurisDatos,
        claims: [{ afirmacion: 'La protección de datos es un derecho fundamental.', fragmento: 'derecho fundamental' }],
      }),
    ).toBe(false);
  });

  it('fuente de la misma materia responde la pregunta factual', () => {
    expect(
      isSourceResponsiveToQuery({
        query: '¿Cuál es la renta mensual?',
        source: jurisRenta,
        claims: [{ afirmacion: 'El tribunal reconoce el canon de arrendamiento como renta.', fragmento: 'canon de arrendamiento y la renta' }],
      }),
    ).toBe(true);
  });
});

describe('applyRelevanceGate · 4.2.19', () => {
  it('descarta la fuente verificable pero irrelevante aunque exista otra relevante', () => {
    const claims = [
      { source: jurisRenta, source_id: 'j-arriendo', afirmacion: 'El canon es renta.', fragmento: 'canon de arrendamiento' },
      { source: jurisDatos, source_id: 'j-datos', afirmacion: 'La protección de datos es un derecho fundamental.', fragmento: 'derecho fundamental' },
    ];
    const r = applyRelevanceGate(claims, { query: '¿Cuál es la renta mensual?' });
    expect(r.kept.map((c) => c.source_id)).toEqual(['j-arriendo']);
    expect(r.droppedCount).toBe(1);
  });
});

describe('buildJurisprudenceOutcome · modo mixto CON claims documentales verificados · 4.2.19', () => {
  it('DEMOSTRACIÓN: la fuente pública irrelevante se descarta aunque el claim documental sobreviva', () => {
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
    expect(result.status).toBe('ok');
    expect(result.outcome).toBe('SUCCESS');
    expect(result.relevanceDroppedSources).toBe(1);
    expect(result.allVerifiedClaims.some((c) => c.category === 'document')).toBe(true);
    expect(result.allVerifiedClaims.some((c) => c.source_id === 'j-datos')).toBe(false);
    expect(result.persistedSources.map((s) => s.id)).toEqual([doc.id]);
    const jurSection = (result.answer.split('**Jurisprudencia relevante**')[1] || '').split(/\n\*\*/)[0];
    expect(jurSection).not.toContain('5174');
  });

  it('conserva la fuente pública RELEVANTE junto al claim documental (relevancia ≠ ausencia de evidencia)', () => {
    const doc = contratoDoc();
    const result = buildJurisprudenceOutcome({
      data: {
        resumen: 'El canon mensual es de 500.000 pesos.',
        normativa: [],
        jurisprudencia: [
          { fuente_id: 'j-arriendo', afirmacion: 'El tribunal reconoce el canon de arrendamiento como renta.', fragmento: 'canon de arrendamiento y la renta' },
        ],
        doctrina: [],
        documento: [documentClaim(doc)],
        conclusion: '',
      },
      sources: [jurisRenta],
      intent: 'general',
      query: '¿Cuál es la renta mensual?',
      documents: [doc],
      documentMode: 'mixed',
    });
    expect(result.status).toBe('ok');
    expect(result.outcome).toBe('SUCCESS');
    expect(result.relevanceDroppedSources).toBe(0);
    expect(result.allVerifiedClaims.some((c) => c.source_id === 'j-arriendo')).toBe(true);
    expect(result.allVerifiedClaims.some((c) => c.category === 'document')).toBe(true);
    expect(result.persistedSources.map((s) => s.id).sort()).toEqual([doc.id, 'j-arriendo'].sort());
  });

  it('todas las fuentes públicas irrelevantes + claim documental vivo → SUCCESS documental (NO_EVIDENCE solo si nada responde)', () => {
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
    expect(result.resumenFinal).not.toContain('No se encontró evidencia suficiente');
  });

  it('modo none: el gate NO se aplica (lookups públicos intactos)', () => {
    const result = buildJurisprudenceOutcome({
      data: {
        resumen: 'La protección de datos es un derecho fundamental.',
        normativa: [],
        jurisprudencia: [
          { fuente_id: 'j-datos', afirmacion: 'La protección de datos es un derecho fundamental.', fragmento: 'derecho fundamental' },
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
    expect(result.outcome).toBe('SUCCESS');
    expect(result.relevanceDroppedSources).toBe(0);
    expect(result.persistedSources.map((s) => s.id)).toEqual(['j-datos']);
  });
});