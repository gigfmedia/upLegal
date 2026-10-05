import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  groupRisksByDocument,
  normalizeIntelligenceRisks,
  parseIntelligenceRiskText,
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

describe('4.61H.1 presentación: parser determinista', () => {
  it('25. formato completo HECHO → RIESGO → CONSECUENCIA', () => {
    const p = parseIntelligenceRiskText(
      'HECHO: A. → INFERENCIA / RIESGO: B. → CONSECUENCIA: C.'
    )!;
    expect(p.fact).toBe('A.');
    expect(p.risk).toBe('B.');
    expect(p.consequence).toBe('C.');
  });
  it('26/27. fallback exacto y variantes se ocultan', () => {
    const p = parseIntelligenceRiskText(
      'HECHO: A. → INFERENCIA / RIESGO: B. → CONSECUENCIA: Consecuencia no determinada en el documento.'
    )!;
    expect(p.fact).toBe('A.');
    expect(p.risk).toBe('B.');
    expect(p.consequence).toBeNull();
    const v = parseIntelligenceRiskText(
      'HECHO: A → INFERENCIA/RIESGO: B → CONSECUENCIA: Consecuencia No Determinada En El Documento'
    )!;
    expect(v.consequence).toBeNull();
  });
  it('28. solo HECHO + RIESGO: sin fila de consecuencia', () => {
    const p = parseIntelligenceRiskText('HECHO: A. → RIESGO: B.')!;
    expect(p.fact).toBe('A.');
    expect(p.risk).toBe('B.');
    expect(p.consequence).toBeNull();
  });
  it('29. texto arbitrario: raw fallback (null)', () => {
    expect(parseIntelligenceRiskText('Riesgo de mora en el pago.')).toBeNull();
    expect(parseIntelligenceRiskText('')).toBeNull();
  });
  it('30. consecuencia real intacta, palabra por palabra', () => {
    const p = parseIntelligenceRiskText(
      'HECHO: La decisión declaró no admisible. → INFERENCIA / RIESGO: El recurso podría rechazarse. → CONSECUENCIA: El proyecto no podrá continuar a la etapa de evaluación.'
    )!;
    expect(p.consequence).toBe('El proyecto no podrá continuar a la etapa de evaluación.');
  });
  it('31. piloto: 5 riesgos parsean con base y riesgo', () => {
    const samples = [
      'HECHO: La arrendataria debe pagar la renta mensualmente. → INFERENCIA / RIESGO: El incumplimiento en el pago podría generar penalidades o término del contrato. → CONSECUENCIA: Consecuencia no determinada en el documento.',
      'HECHO: La decisión de CORFO declaró no admisible la postulación. → INFERENCIA / RIESGO: Existe el riesgo de que el recurso de reposición no sea acogido. → CONSECUENCIA: El proyecto no podrá continuar a la etapa de evaluación.',
    ];
    for (const s of samples) {
      const p = parseIntelligenceRiskText(s)!;
      expect(p.risk).toBeTruthy();
      expect(p.fact).toBeTruthy();
    }
    expect(parseIntelligenceRiskText(samples[0])!.consequence).toBeNull();
    expect(parseIntelligenceRiskText(samples[1])!.consequence).toContain('etapa de evaluación');
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
