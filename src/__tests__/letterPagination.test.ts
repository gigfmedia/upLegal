// @vitest-environment node
// UA-4 FASE 1 — geometría carta y cortes de página (puro, sin DOM).
// El cálculo no toca el documento: solo decide decoraciones de presentación.
import { describe, it, expect } from 'vitest';
import {
  CM_TO_PX,
  DEFAULT_MARGINS_CM,
  FOOTER_INSET,
  LETTER_PAGE_HEIGHT,
  LETTER_PAGE_WIDTH,
  PAGE_GAP,
  cmToPx,
  computePagination,
  contentBottom,
  contentTop,
  createPageLayout,
  footerLabels,
  marginsToPx,
  pageTop,
  stackHeight,
  type BlockMetrics,
  type LineBox,
} from '@/components/legalup-ai/letterPageGeometry';

const block = (pos: number, height: number, marginTop = 20, marginBottom = 20): BlockMetrics => ({
  pos,
  height,
  marginTop,
  marginBottom,
});

describe('UA-4 geometría de página carta', () => {
  it('carta a 96 dpi mide 816 × 1056 px', () => {
    expect(LETTER_PAGE_WIDTH).toBe(816);
    expect(LETTER_PAGE_HEIGHT).toBe(1056);
    expect(CM_TO_PX).toBeCloseTo(37.7952755906, 8);
  });

  it('márgenes iniciales de 2,5 cm = 94 px y área de contenido 628 × 868', () => {
    expect(DEFAULT_MARGINS_CM).toEqual({ top: 2.5, right: 2.5, bottom: 2.5, left: 2.5 });
    expect(cmToPx(2.5)).toBeCloseTo(94.488, 3);
    expect(marginsToPx()).toEqual({ top: 94, right: 94, bottom: 94, left: 94 });
    const layout = createPageLayout();
    expect(layout.contentWidth).toBe(816 - 94 * 2);
    expect(layout.contentHeight).toBe(1056 - 94 * 2);
    expect(layout.gap).toBe(PAGE_GAP);
    expect(layout.footerInset).toBe(FOOTER_INSET);
  });

  it('posiciones de página y stack incluyen la separación visual', () => {
    const layout = createPageLayout();
    expect(pageTop(layout, 0)).toBe(0);
    expect(pageTop(layout, 1)).toBe(1080);
    expect(contentTop(layout, 1)).toBe(1174);
    expect(contentBottom(layout, 0)).toBe(962);
    expect(stackHeight(layout, 1)).toBe(1056);
    expect(stackHeight(layout, 3)).toBe(3 * 1056 + 2 * 24);
  });

  it('los pies se numeran 1..N y el documento vacío igual tiene página 1', () => {
    expect(footerLabels(1)).toEqual([1]);
    expect(footerLabels(3)).toEqual([1, 2, 3]);
    expect(footerLabels(0)).toEqual([1]);
    const layout = createPageLayout();
    expect(computePagination([], layout)).toEqual({ pageCount: 1, breaks: [], overflowBlocks: [] });
  });
});

describe('UA-4 cortes por bloque', () => {
  const layout = createPageLayout();

  it('un documento corto ocupa una sola página y no inserta saltos', () => {
    const result = computePagination([block(0, 26), block(28, 100), block(150, 240)], layout);
    expect(result.pageCount).toBe(1);
    expect(result.breaks).toEqual([]);
    expect(result.overflowBlocks).toEqual([]);
  });

  it('el primer bloque respeta su margen superior dentro del área de contenido', () => {
    // 94 (margen) + 200 (top margin) + 600 se mantiene dentro de 962.
    const result = computePagination([block(0, 600, 200, 20)], layout);
    expect(result.pageCount).toBe(1);
    expect(result.breaks).toEqual([]);
  });

  it('el bloque que no cabe empieza la página siguiente con el espaciador exacto', () => {
    // Página 0: bloque 0 ocupa 94+20 .. 214; el bloque 1 acaba en 1054 > 962.
    const blocks = [block(0, 100), block(120, 100), block(240, 100)];
    const result = computePagination(
      [block(0, 700), block(720, 300), block(1040, 100)],
      layout,
    );
    expect(result.pageCount).toBe(2);
    expect(result.breaks).toHaveLength(1);
    const br = result.breaks[0];
    expect(br.pos).toBe(720);
    expect(br.page).toBe(1);
    // 1174 = 814 (bottom previo) + 20 (mb) + H + 20 (mt) → H = 320.
    expect(br.spacerHeight).toBe(320);
    // Un bloque que sí cabe en página 0 no genera salto.
    expect(blocks.map((b) => b.pos)).not.toContain(br.pos - 1);
  });

  it('varias páginas: saltos ordenados y numeración consecutiva', () => {
    const blocks = Array.from({ length: 40 }, (_, i) => block(i * 10, 100));
    const result = computePagination(blocks, layout);
    // 7 bloques por página (114 → 934); el 8.º abre la página 2.
    expect(result.pageCount).toBe(6);
    expect(result.breaks.map((b) => b.pos)).toEqual([70, 140, 210, 280, 350]);
    expect(result.breaks.map((b) => b.page)).toEqual([1, 2, 3, 4, 5]);
    for (const br of result.breaks) expect(br.spacerHeight).toBeGreaterThan(0);
    expect(footerLabels(result.pageCount)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(result.overflowBlocks).toEqual([]);
  });

  it('añadir contenido nunca reduce el número de páginas', () => {
    const base = Array.from({ length: 12 }, (_, i) => block(i * 10, 120));
    let previous = 0;
    for (let n = 1; n <= base.length; n += 1) {
      const pages = computePagination(base.slice(0, n), layout).pageCount;
      expect(pages).toBeGreaterThanOrEqual(previous);
      previous = pages;
    }
  });

  it('un bloque más alto que la página se marca y reserva las páginas que ocupa', () => {
    const result = computePagination([block(0, 1200)], layout);
    expect(result.overflowBlocks).toEqual([0]);
    // 94 + 1200 = 1294; desborda 332 px → segunda página.
    expect(result.pageCount).toBe(2);
    expect(result.breaks).toEqual([]);
  });

  it('el cálculo es puro: no muta las métricas de entrada', () => {
    const blocks = [block(0, 700), block(720, 300)];
    const snapshot = JSON.parse(JSON.stringify(blocks));
    computePagination(blocks, layout);
    expect(blocks).toEqual(snapshot);
  });
});

// UA-4 FASE 2 — cortes dentro de párrafos y listas.
const line = (pos: number, index: number, height = 24): LineBox => ({
  pos,
  top: index * height,
  bottom: (index + 1) * height,
});

const paragraph = (
  pos: number,
  count: number,
  options: { marginTop?: number; marginBottom?: number; start?: number } = {},
): BlockMetrics => ({
  pos,
  height: count * 24,
  marginTop: options.marginTop ?? 0,
  marginBottom: options.marginBottom ?? 0,
  lines: Array.from({ length: count }, (_, i) => line(options.start ?? 1000 + i, i)),
});

describe('UA-4 Fase 2 — párrafos de varias páginas', () => {
  const layout = createPageLayout();

  it('un párrafo de 40 líneas se corta tras la línea 36 con el espaciador exacto', () => {
    const result = computePagination([paragraph(0, 40)], layout);
    expect(result.pageCount).toBe(2);
    expect(result.breaks).toHaveLength(1);
    const br = result.breaks[0];
    expect(br.anchor).toBe('inline');
    expect(br.page).toBe(1);
    // 36 líneas caben (36*24 = 864; 94 + 864 = 958 ≤ 962).
    expect(br.pos).toBe(1036);
    expect(br.spacerHeight).toBe(216); // 1174 − 958
    expect(result.overflowBlocks).toEqual([]);
  });

  it('un párrafo de 120 líneas ocupa 4 páginas con saltos consecutivos', () => {
    const result = computePagination([paragraph(0, 120)], layout);
    expect(result.pageCount).toBe(4);
    expect(result.breaks.map((b) => b.pos)).toEqual([1036, 1072, 1108]);
    expect(result.breaks.map((b) => b.page)).toEqual([1, 2, 3]);
    expect(result.breaks.map((b) => b.anchor)).toEqual(['inline', 'inline', 'inline']);
    for (const br of result.breaks) expect(br.spacerHeight).toBe(216);
  });

  it('evita dejar una sola línea al principio de la página siguiente (viuda)', () => {
    const result = computePagination([paragraph(0, 37)], layout);
    expect(result.pageCount).toBe(2);
    const br = result.breaks[0];
    // Se parte una línea antes: 35 abajo y 2 arriba.
    expect(br.pos).toBe(1035);
    expect(br.spacerHeight).toBe(240); // 1174 − (94 + 35*24)
  });

  it('un párrafo corto que deja menos de 2 líneas abajo se mueve completo', () => {
    const blocks: BlockMetrics[] = [
      { pos: 0, height: 800, marginTop: 20, marginBottom: 20 },
      { ...paragraph(900, 3), marginTop: 20, marginBottom: 20, pos: 900 },
    ];
    const result = computePagination(blocks, layout);
    expect(result.pageCount).toBe(2);
    expect(result.breaks).toHaveLength(1);
    const br = result.breaks[0];
    expect(br.anchor).toBe('block');
    expect(br.pos).toBe(900);
    // 1174 − 874 (bottom) − 20 (mb) − 20 (mt) = 260? bottom = 114+800=914.
    expect(br.spacerHeight).toBe(220);
    expect(result.overflowBlocks).toEqual([]);
  });

  it('no muta las métricas de línea ni los ítems al paginar', () => {
    const blocks = [paragraph(0, 120)];
    const snapshot = JSON.parse(JSON.stringify(blocks));
    computePagination(blocks, layout);
    expect(blocks).toEqual(snapshot);
  });

  it('es determinista: dos ejecuciones producen el mismo resultado', () => {
    const blocks = [paragraph(0, 80), paragraph(2000, 40)];
    expect(computePagination(blocks, layout)).toEqual(computePagination(blocks, layout));
  });
});

describe('UA-4 Fase 2 — listas e ítems largos', () => {
  const layout = createPageLayout();

  const item = (pos: number, top: number, height: number, lines = 0) => ({
    pos,
    endPos: pos + 500,
    top,
    height,
    lines: Array.from({ length: lines }, (_, i) => line(pos + 1000 + i, i)),
  });

  it('una lista corta se mueve completa si el primer ítem no cabe', () => {
    const blocks: BlockMetrics[] = [
      { pos: 0, height: 800, marginTop: 20, marginBottom: 20 },
      {
        pos: 900,
        height: 100,
        marginTop: 20,
        marginBottom: 20,
        items: [item(900, 0, 50), item(950, 50, 50)],
      },
    ];
    const result = computePagination(blocks, layout);
    expect(result.pageCount).toBe(2);
    expect(result.breaks).toHaveLength(1);
    expect(result.breaks[0].anchor).toBe('block');
    expect(result.breaks[0].pos).toBe(900);
    expect(result.breaks[0].spacerHeight).toBe(220);
  });

  it('corta entre ítems sin partir un ítem corto', () => {
    const items = Array.from({ length: 20 }, (_, i) => item(1000 + i * 10, i * 50, 50));
    const blocks: BlockMetrics[] = [{ pos: 0, height: 1000, marginTop: 0, marginBottom: 0, items }];
    const result = computePagination(blocks, layout);
    expect(result.pageCount).toBe(2);
    expect(result.breaks).toHaveLength(1);
    const br = result.breaks[0];
    // 17 ítems caben (94 + 17*50 = 944); el 18.º empieza en 944.
    expect(br.pos).toBe(items[16].endPos);
    expect(br.anchor).toBe('inline');
    expect(br.spacerHeight).toBe(230); // 1174 − 944
    expect(br.page).toBe(1);
  });

  it('un ítem más alto que la página se parte por sus líneas', () => {
    const items = [item(900, 0, 50), item(950, 50, 1200, 50)];
    const blocks: BlockMetrics[] = [{ pos: 0, height: 1250, marginTop: 0, marginBottom: 0, items }];
    const result = computePagination(blocks, layout);
    expect(result.pageCount).toBe(2);
    expect(result.breaks).toHaveLength(1);
    const br = result.breaks[0];
    expect(br.anchor).toBe('inline');
    expect(br.pos).toBe(items[1].lines[34].pos);
    // 144 + 34*24 = 960 → 1174 − 960 = 214.
    expect(br.spacerHeight).toBe(214);
  });

  it('una lista sin líneas medibles mantiene el fallback de Fase 1', () => {
    const blocks: BlockMetrics[] = [
      { pos: 0, height: 800, marginTop: 20, marginBottom: 20 },
      { pos: 900, height: 300, marginTop: 20, marginBottom: 20, items: [item(900, 0, 300)] },
    ];
    const result = computePagination(blocks, layout);
    expect(result.pageCount).toBe(2);
    expect(result.breaks[0].anchor).toBe('block');
    expect(result.overflowBlocks).toEqual([]);
  });
});

describe('UA-4 Fase 2 — posiciones diferidas y fallback seguro', () => {
  const layout = createPageLayout();

  it('solo resuelve la posición de las líneas elegidas como corte', () => {
    const reads: number[] = [];
    const lines: LineBox[] = Array.from({ length: 80 }, (_, i) => ({
      get pos() {
        reads.push(i);
        return 1000 + i;
      },
      top: i * 24,
      bottom: (i + 1) * 24,
    }));
    const result = computePagination(
      [{ pos: 0, height: 80 * 24, marginTop: 0, marginBottom: 0, lines }],
      layout,
    );
    expect(result.pageCount).toBeGreaterThan(1);
    expect(reads).toEqual([36, 72]);
  });

  it('si una línea no puede resolverse, no inventa un corte negativo', () => {
    const lines: LineBox[] = Array.from({ length: 80 }, (_, i) => ({
      pos: i === 36 ? -1 : 1000 + i,
      top: i * 24,
      bottom: (i + 1) * 24,
    }));
    const result = computePagination(
      [{ pos: 0, height: 80 * 24, marginTop: 0, marginBottom: 0, lines }],
      layout,
    );
    expect(result.breaks.every((b) => b.pos >= 0)).toBe(true);
    expect(result.overflowBlocks.length + result.breaks.length).toBeGreaterThan(0);
  });

  it('unresolvedLines no altera la geometría ni el conteo', () => {
    const plain = [paragraph(0, 60)];
    const lazy = [{ ...paragraph(0, 60), unresolvedLines: 30 }];
    expect(computePagination(lazy, layout)).toEqual(computePagination(plain, layout));
  });
});
