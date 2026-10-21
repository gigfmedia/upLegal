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
