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
