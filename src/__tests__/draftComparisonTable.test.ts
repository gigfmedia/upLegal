// @vitest-environment node
// UA-5.1 — datos estructurados de tabla comparativa: límites, escape y texto.
import { describe, it, expect } from 'vitest';
import {
  COMPARISON_TABLE_LIMITS,
  comparisonTableToHtml,
  comparisonTableToPlainText,
  normalizeComparisonTable,
} from '@/components/legalup-ai/draftComparisonTable';

const validTable = () => ({
  title: 'Comparación de cláusulas',
  columns: ['Criterio', 'Cláusula 5', 'Cláusula 6'],
  rows: [['Plazo', '30 días', '60 días']],
});

describe('UA-5.1 normalización de tabla comparativa', () => {
  it('acepta una tabla válida y normaliza espacios', () => {
    const table = normalizeComparisonTable({
      title: '  Comparación  ',
      columns: [' Criterio ', 'A', 'B'],
      rows: [['  Uno  ', ' Dos ', ' Tres ']],
    });
    expect(table).toEqual({
      title: 'Comparación',
      columns: ['Criterio', 'A', 'B'],
      rows: [['Uno', 'Dos', 'Tres']],
    });
  });

  it('usa un título por defecto si viene vacío', () => {
    expect(normalizeComparisonTable({ title: '', columns: ['A', 'B'], rows: [['1', '2']] })?.title)
      .toBe('Tabla comparativa');
  });

  it('rechaza menos de 2 o más de 6 columnas', () => {
    expect(normalizeComparisonTable({ title: 'X', columns: ['A'], rows: [['1']] })).toBeNull();
    expect(normalizeComparisonTable({
      title: 'X',
      columns: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
      rows: [['1', '2', '3', '4', '5', '6', '7']],
    })).toBeNull();
  });

  it('rechaza más de 8 filas, filas desparejas y celdas demasiado largas', () => {
    const rows = Array.from({ length: COMPARISON_TABLE_LIMITS.maxRows + 1 }, () => ['1', '2', '3']);
    expect(normalizeComparisonTable({ title: 'X', columns: ['A', 'B', 'C'], rows })).toBeNull();
    expect(normalizeComparisonTable({ title: 'X', columns: ['A', 'B'], rows: [['1']] })).toBeNull();
    expect(normalizeComparisonTable({
      title: 'X',
      columns: ['A', 'B'],
      rows: [['x'.repeat(COMPARISON_TABLE_LIMITS.maxCellChars + 1), '2']],
    })).toBeNull();
  });

  it('el HTML escapa cualquier contenido y no acepta atributos del modelo', () => {
    const html = comparisonTableToHtml({
      title: '<script>alert(1)</script>',
      columns: ['<img src=x onerror=alert(1)>', 'B'],
      rows: [['"uno" & dos', '<strong>no</strong>']],
    });
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;img');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;strong&gt;no&lt;/strong&gt;');
    expect(html).not.toContain('<strong>no</strong>');
  });

  it('texto plano conserva celdas separadas por tabulador', () => {
    const text = comparisonTableToPlainText(validTable());
    expect(text).toContain('Comparación de cláusulas');
    expect(text).toContain('Criterio\tCláusula 5\tCláusula 6');
    expect(text).toContain('Plazo\t30 días\t60 días');
  });
});
