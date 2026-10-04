import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf-8');

describe('FASE 4.59C.3 — landing/product alignment sin faking', () => {
  it('landing NO vende "Próximos pasos" como capacidad de análisis', () => {
    const landing = read('src/pages/LegalUpAI.tsx');
    expect(landing).not.toContain('"Próximos pasos"');
    expect(landing).toContain('"Recomendaciones"');
  });
  it('producto NO inventa sección Pretensiones desde anclas de evidencia', () => {
    // claims = afirmaciones verificadas de parties/key_points/obligations
    // (server.mjs:9647), NO pretensiones jurídicas. Renderizarlas bajo
    // "Pretensiones" falsearía una capacidad que el análisis no tiene.
    const view = read('src/components/legalup-ai/AIAnalysisView.tsx');
    expect(view).not.toContain('Pretensiones');
    expect(view).not.toContain('pretensiones');
  });
  it('secciones reales intactas: resumen, partes, puntos, obligaciones, plazos, riesgos, recomendaciones', () => {
    const view = read('src/components/legalup-ai/AIAnalysisView.tsx');
    for (const title of [
      'Resumen ejecutivo',
      'Partes intervinientes',
      'Puntos clave',
      'Obligaciones',
      'Plazos y fechas clave',
      'Riesgos y alertas',
      'Recomendaciones',
    ]) {
      expect(view).toContain(title);
    }
  });
  it('claims siguen siendo anclas de evidencia (Ver evidencia preservado)', () => {
    const view = read('src/components/legalup-ai/AIAnalysisView.tsx');
    expect(view).toContain('Ver evidencia');
    expect(view).toContain('analysis.claims');
  });
});
