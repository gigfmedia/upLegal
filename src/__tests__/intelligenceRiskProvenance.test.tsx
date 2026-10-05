import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  groupRisksByDocument,
  normalizeIntelligenceRisks,
  riskText,
  stripRiskFallback,
  UNKNOWN_SOURCE_LABEL,
} from '@/lib/intelligenceRisks';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf-8');

describe('4.61H lib frontend: normalizar, limpiar y agrupar', () => {
  it('37. legacy string[] no rompe (grupo compatibilidad)', () => {
    const groups = groupRisksByDocument(normalizeIntelligenceRisks(['HECHO: algo']));
    expect(groups).toHaveLength(1);
    expect(groups[0].filename).toBeNull();
  });
  it('38. estructurado agrupa por fuente preservando orden', () => {
    const groups = groupRisksByDocument(
      normalizeIntelligenceRisks([
        { text: 'r1', document_id: 'd1', filename: 'Contrato.pdf' },
        { text: 'r2', document_id: 'd2', filename: 'Otro.pdf' },
        { text: 'r3', document_id: 'd1', filename: 'Contrato.pdf' },
      ])
    );
    expect(groups.map((g) => g.filename)).toEqual(['Contrato.pdf', 'Otro.pdf']);
    expect(groups[0].items).toHaveLength(2);
  });
  it('34/35. fallback exacto se oculta; consecuencia real se conserva', () => {
    expect(stripRiskFallback('HECHO: debe pagar. Consecuencia no determinada en el documento.')).toBe(
      'HECHO: debe pagar.'
    );
    expect(stripRiskFallback('HECHO: debe pagar. Consecuencia No Determinada En El Documento')).toBe(
      'HECHO: debe pagar.'
    );
    expect(stripRiskFallback('Riesgo de multa de 10 UTM por incumplimiento.')).toContain('10 UTM');
    expect(stripRiskFallback('Solo un hecho sin consecuencia.')).toContain('Solo un hecho');
  });
  it('riskText y etiqueta desconocida', () => {
    expect(riskText('a')).toBe('a');
    expect(riskText({ text: 'b', document_id: null, filename: null })).toBe('b');
    expect(UNKNOWN_SOURCE_LABEL).toBe('Documento no identificado');
  });
});

describe('4.61H UI: grupos por documento y empty honesto (estático)', () => {
  it('AICaseIntelligence agrupa y muestra empty honesto', () => {
    const src = read('src/components/legalup-ai/AICaseIntelligence.tsx');
    expect(src).toContain('groupRisksByDocument');
    expect(src).toContain('No se identificaron riesgos claros en los documentos analizados.');
    expect(src).not.toMatch(/\{r\}\./);
  });
  it('downstream usa texto normalizado (sin [object Object])', () => {
    expect(read('src/components/legalup-ai/AICaseWorkflowActionDrawer.tsx')).toContain('normalizeIntelligenceRisks');
    expect(read('src/components/legalup-ai/AICaseFreeSnapshot.tsx')).toContain('normalizeIntelligenceRisks');
    expect(read('server/ai/caseBrief.mjs')).toContain('typeof raw');
  });
});
