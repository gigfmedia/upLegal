import { describe, it, expect } from 'vitest';
import {
  normTypeRank,
  hierarchyLabel,
  compareNormHierarchy,
  orderNormativaByHierarchy,
  detectHierarchyMatices,
} from './hierarchy.mjs';

describe('Fase 4.1 · jerarquía normativa', () => {
  it('ranquea Constitución > Ley > DFL/DL > Decreto > Reglamento', () => {
    expect(normTypeRank('constitucion')).toBeLessThan(normTypeRank('ley'));
    expect(normTypeRank('ley')).toBeLessThan(normTypeRank('dfl'));
    expect(normTypeRank('dfl')).toBe(normTypeRank('decreto_ley'));
    expect(normTypeRank('dfl')).toBeLessThan(normTypeRank('decreto'));
    expect(normTypeRank('decreto')).toBeLessThan(normTypeRank('reglamento'));
    expect(normTypeRank('desconocido')).toBe(normTypeRank('otra'));
  });

  it('compareNormHierarchy devuelve higher/lower/equal/unknown', () => {
    expect(compareNormHierarchy('ley', 'reglamento')).toBe('higher');
    expect(compareNormHierarchy('reglamento', 'ley')).toBe('lower');
    expect(compareNormHierarchy('ley', 'ley')).toBe('equal');
    expect(compareNormHierarchy('otra', 'otra')).toBe('unknown');
  });

  it('ordena normas por jerarquía para presentación', () => {
    const normativas = [
      { id: 'r', norm_type: 'reglamento', citation: 'Reglamento' },
      { id: 'l', norm_type: 'ley', citation: 'Ley 21.719' },
      { id: 'c', norm_type: 'constitucion', citation: 'Constitución' },
    ];
    const ordered = orderNormativaByHierarchy(normativas);
    expect(ordered.map((n) => n.id)).toEqual(['c', 'l', 'r']);
  });

  it('emite matiz cuando dos normas del mismo rango son relevantes (no resuelve)', () => {
    const { matices } = detectHierarchyMatices([
      { id: 'l1', norm_type: 'ley', citation: 'Ley A' },
      { id: 'l2', norm_type: 'ley', citation: 'Ley B' },
    ]);
    expect(matices.some((m) => m.tipo === 'rango_igual')).toBe(true);
    expect(matices[0].observada).toBe(false);
  });

  it('emite nota de norma derivada (ley + reglamento) sin declarar ganador absoluto', () => {
    const { matices } = detectHierarchyMatices([
      { id: 'l1', norm_type: 'ley', citation: 'Ley 21.719' },
      { id: 'r1', norm_type: 'reglamento', citation: 'Reglamento de la ley' },
    ]);
    expect(matices.some((m) => m.tipo === 'norma_derivada')).toBe(true);
    expect(matices[0].notas).toContain('prevalece');
  });

  it('sin al menos dos normas no hay matices', () => {
    expect(detectHierarchyMatices([{ id: 'l1', norm_type: 'ley', citation: 'Ley A' }]).matices).toEqual([]);
    expect(detectHierarchyMatices([]).matices).toEqual([]);
  });

  it('hierarchyLabel devuelve etiqueta legible', () => {
    expect(hierarchyLabel(3)).toBe('Ley');
    expect(hierarchyLabel(6)).toBe('Reglamento');
  });
});