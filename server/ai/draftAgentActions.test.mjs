import { describe, it, expect } from 'vitest';
import {
  COMPARISON_TABLE_LIMITS,
  buildComparisonTableSystemPrompt,
  parseComparisonTableResponse,
} from './draftAgentActions.mjs';

const valid = () => ({
  answer: 'Comparación preliminar.',
  sources: [],
  table: {
    title: 'Comparación de cláusulas',
    columns: ['Criterio', 'Cláusula 5', 'Cláusula 6'],
    rows: [['Plazo', '30 días', '60 días']],
  },
});

describe('UA-5.1 contrato de tabla comparativa', () => {
  it('acepta una respuesta estructurada válida', () => {
    const parsed = parseComparisonTableResponse(valid());
    expect(parsed?.table.title).toBe('Comparación de cláusulas');
    expect(parsed?.table.rows[0]).toEqual(['Plazo', '30 días', '60 días']);
  });

  it('rechaza HTML dentro de la estructura solo si rompe tipos, no por texto', () => {
    const payload = valid();
    payload.table.rows[0][0] = '<script>alert(1)</script>';
    expect(parseComparisonTableResponse(payload)?.table.rows[0][0]).toContain('<script>');
  });

  it('rechaza columnas fuera de rango, filas desparejas y exceso de filas', () => {
    const oneColumn = valid();
    oneColumn.table.columns = ['A'];
    oneColumn.table.rows = [['1']];
    expect(parseComparisonTableResponse(oneColumn)).toBeNull();

    const uneven = valid();
    uneven.table.rows = [['solo una']];
    expect(parseComparisonTableResponse(uneven)).toBeNull();

    const manyRows = valid();
    manyRows.table.rows = Array.from(
      { length: COMPARISON_TABLE_LIMITS.maxRows + 1 },
      () => ['x', 'y', 'z']
    );
    expect(parseComparisonTableResponse(manyRows)).toBeNull();
  });

  it('rechaza celdas demasiado largas y títulos vacíos', () => {
    const longCell = valid();
    longCell.table.rows[0][0] = 'x'.repeat(COMPARISON_TABLE_LIMITS.maxCellChars + 1);
    expect(parseComparisonTableResponse(longCell)).toBeNull();

    const noTitle = valid();
    noTitle.table.title = '   ';
    expect(parseComparisonTableResponse(noTitle)).toBeNull();
  });

  it('el prompt exige JSON, límites y texto plano sin HTML', () => {
    const prompt = buildComparisonTableSystemPrompt();
    expect(prompt).toContain('IGNORA el contrato JSON anterior');
    expect(prompt).toContain('"table"');
    expect(prompt).toContain('No uses HTML, Markdown');
    expect(prompt).toContain(String(COMPARISON_TABLE_LIMITS.maxColumns));
    expect(prompt).toContain('[POR COMPLETAR:');
  });
});
