import { describe, it, expect } from 'vitest';
import {
  COMPARISON_TABLE_LIMITS,
  DRAFT_COMMENT_LIMITS,
  DraftCommentAnchorSchema,
  DraftCommentCreateSchema,
  DraftCommentUpdateSchema,
  buildComparisonTableSystemPrompt,
  buildDraftCommentsSystemPrompt,
  parseComparisonTableResponse,
  parseDraftCommentsResponse,
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


describe('UA-5.2 contrato de comentarios anclados', () => {
  const validComments = () => ({
    answer: 'Revisé la selección.',
    sources: [],
    comments: [
      { quote: 'antes del día diez', comment: 'La fecha es ambigua: aclara si es día hábil.' },
      { quote: 'renta', comment: 'Define el monto y la moneda.' },
    ],
  });

  it('acepta comentarios estructurados válidos', () => {
    const parsed = parseDraftCommentsResponse(validComments());
    expect(parsed?.comments).toHaveLength(2);
    expect(parsed?.comments[0].quote).toBe('antes del día diez');
  });

  it('rechaza listas vacías, demasiados comentarios y campos faltantes', () => {
    expect(parseDraftCommentsResponse({ ...validComments(), comments: [] })).toBeNull();
    expect(parseDraftCommentsResponse({
      ...validComments(),
      comments: Array.from({ length: DRAFT_COMMENT_LIMITS.maxSuggestions + 1 }, () => ({
        quote: 'renta', comment: 'observación',
      })),
    })).toBeNull();
    expect(parseDraftCommentsResponse({
      ...validComments(),
      comments: [{ quote: 'renta' }],
    })).toBeNull();
  });

  it('rechaza quote/comment vacíos o demasiado largos', () => {
    expect(parseDraftCommentsResponse({
      ...validComments(),
      comments: [{ quote: '   ', comment: 'observación' }],
    })).toBeNull();
    expect(parseDraftCommentsResponse({
      ...validComments(),
      comments: [{ quote: 'renta', comment: 'x'.repeat(DRAFT_COMMENT_LIMITS.maxBodyChars + 1) }],
    })).toBeNull();
  });

  it('conserva literalmente los espacios iniciales y finales del quote', () => {
    for (const quote of ['renta ', ' renta', ' renta ']) {
      const anchorInput = { quote, prefix: '', suffix: '', start_hint: 1, end_hint: 7 };
      expect(DraftCommentAnchorSchema.parse(anchorInput).quote).toBe(quote);
      expect(DraftCommentCreateSchema.parse({ body: 'observación', anchor: anchorInput }).anchor.quote).toBe(quote);
      expect(DraftCommentUpdateSchema.parse({ anchor: anchorInput }).anchor.quote).toBe(quote);
    }
  });

  it('rechaza un quote compuesto solo por espacios sin recortar los válidos', () => {
    const anchorInput = { quote: '   ', prefix: '', suffix: '', start_hint: 1, end_hint: 4 };
    expect(DraftCommentAnchorSchema.safeParse(anchorInput).success).toBe(false);
    expect(DraftCommentCreateSchema.safeParse({ body: 'observación', anchor: anchorInput }).success).toBe(false);
    expect(DraftCommentUpdateSchema.safeParse({ anchor: anchorInput }).success).toBe(false);
  });

  it('el prompt exige JSON, quote literal y límites', () => {
    const prompt = buildDraftCommentsSystemPrompt();
    expect(prompt).toContain('IGNORA el contrato JSON anterior');
    expect(prompt).toContain('"comments"');
    expect(prompt).toContain('fragmento EXACTO, literal y contiguo');
    expect(prompt).toContain(String(DRAFT_COMMENT_LIMITS.maxSuggestions));
    expect(prompt).toContain('No reescribas el documento completo');
  });
});
