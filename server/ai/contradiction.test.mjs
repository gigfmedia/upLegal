import { describe, it, expect } from 'vitest';
import { detectContradictions } from './contradiction.mjs';

const claim = (id, kind, afirmacion, source = {}) => ({
  source_id: id,
  afirmacion,
  source: { kind, ...source },
});

describe('Fase 4.1 · contradicciones y matices', () => {
  it('detecta norma vs reglamento sobre la misma materia sin resolver', () => {
    const { contradicciones, warnings } = detectContradictions({
      normativa: [
        claim('bcn-ley', 'normativa', 'La ley regula el tratamiento de datos personales', { norm_type: 'ley' }),
        claim('bcn-reg', 'normativa', 'El reglamento regula el tratamiento de datos personales', { norm_type: 'reglamento' }),
      ],
      jurisprudencia: [],
    });
    expect(contradicciones.some((c) => c.tipo === 'norma_vs_reglamento')).toBe(true);
    expect(warnings.length).toBeGreaterThan(0);
    // No resuelve automáticamente.
    expect(contradicciones[0].nota).toContain('no se resuelve');
  });

  it('detecta jurisprudencia vs jurisprudencia (roles distintos) con sentidos opuestos', () => {
    const { contradicciones } = detectContradictions({
      normativa: [],
      jurisprudencia: [
        claim('tc-1', 'jurisprudencia', 'El TC declara constitucional la norma sobre datos personales', { rol: '1111' }),
        claim('tc-2', 'jurisprudencia', 'El TC declara inconstitucional la norma sobre datos personales', { rol: '2222' }),
      ],
    });
    expect(contradicciones.some((c) => c.tipo === 'jurisprudencia_vs_jurisprudencia')).toBe(true);
  });

  it('detecta norma vs jurisprudencia sobre la misma materia', () => {
    const { contradicciones } = detectContradictions({
      normativa: [
        claim('bcn-1', 'normativa', 'La ley regula el consentimiento del titular de datos', { norm_type: 'ley' }),
      ],
      jurisprudencia: [
        claim('tc-1', 'jurisprudencia', 'El TC resolvió sobre el consentimiento del titular de datos'),
      ],
    });
    expect(contradicciones.some((c) => c.tipo === 'norma_vs_jurisprudencia')).toBe(true);
  });

  it('no declara contradicción sin solape temático (materias distintas)', () => {
    const { contradicciones } = detectContradictions({
      normativa: [
        claim('bcn-1', 'normativa', 'La ley regula el tratamiento de datos personales', { norm_type: 'ley' }),
      ],
      jurisprudencia: [
        claim('tc-1', 'jurisprudencia', 'El TC resolvió sobre la indemnización laboral por despido'),
      ],
    });
    expect(contradicciones).toEqual([]);
  });

  it('no detecta contradicción entre la misma sentencia citada dos veces', () => {
    const { contradicciones } = detectContradictions({
      normativa: [],
      jurisprudencia: [
        claim('tc-1', 'jurisprudencia', 'El TC declaró constitucional la norma sobre datos'),
        claim('tc-1', 'jurisprudencia', 'El TC declaró constitucional la norma sobre datos'),
      ],
    });
    expect(contradicciones).toEqual([]);
  });

  it('conserva ambas fuentes al detectar contradicción (no descarta ninguna)', () => {
    const a = claim('tc-1', 'jurisprudencia', 'El TC declara constitucional la norma sobre datos');
    const b = claim('tc-2', 'jurisprudencia', 'El TC declara inconstitucional la norma sobre datos');
    const { contradicciones } = detectContradictions({ normativa: [], jurisprudencia: [a, b] });
    expect(contradicciones[0].claims.length).toBe(2);
    expect(contradicciones[0].fuente_ids).toEqual(['tc-1', 'tc-2']);
  });
});