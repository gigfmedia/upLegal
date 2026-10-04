import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf-8');
const landing = () => read('src/pages/LegalUpAI.tsx');

describe('FASE 4.59C.4 — comparativa sigue al producto', () => {
  it('Redacción jurídica disponible (flag prod ON): check + copy de valor', () => {
    const src = landing();
    const idx = src.indexOf('"Redacción jurídica"');
    expect(idx).toBeGreaterThan(-1);
    const rowBlock = src.slice(idx, idx + 300);
    expect(rowBlock).toContain('Depende del contexto que le entregues');
    expect(rowBlock).toContain('Borradores basados en el caso, sus documentos e investigación');
    expect(rowBlock).not.toContain('aiSoon');
  });
  it('card Redacción Asistida disponible', () => {
    const src = landing();
    const idx = src.indexOf('"Redacción Asistida"');
    expect(idx).toBeGreaterThan(-1);
    expect(src.slice(idx, idx + 400)).toContain('available: true');
  });
  it('sin pretensiones ni PJUD inventados en la comparativa', () => {
    const src = landing();
    const table = src.slice(src.indexOf('VS_GENERAL_ROWS'), src.indexOf('function VSCheckIcon'));
    expect(table).not.toMatch(/pretension/i);
    expect(table).not.toMatch(/PJUD/i);
    expect(landing()).not.toMatch(/toda la jurisprudencia|base de datos oficial|cobertura completa/i);
  });
  it('contexto chileno acotado (orientado, no totalizante)', () => {
    const src = landing();
    expect(src).toContain('Orientado al contexto jurídico chileno');
    expect(src).not.toMatch(/todo el derecho chileno|toda la jurisprudencia chilena/i);
  });
  it('columna general calificada, sin absolutos falsos', () => {
    const src = landing();
    const table = src.slice(src.indexOf('VS_GENERAL_ROWS'), src.indexOf('function VSCheckIcon'));
    expect(table).toContain('Depende de');
    expect(src).toContain('ChatGPT / Claude');
  });
});
