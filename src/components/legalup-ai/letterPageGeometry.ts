// UA-4 FASE 1 — geometría de página carta y cálculo de cortes de página.
// Módulo puro, sin DOM: la extensión de TipTap solo mide los bloques y aplica
// el resultado como decoraciones de presentación. El documento persistido
// (getHTML) nunca cambia: no se crean nodos de página, pies ni atributos.

/** 96 dpi: unidad de layout del navegador para CSS px. */
export const CM_TO_PX = 96 / 2.54;

/** Carta = 8,5 × 11 in a 96 dpi → 816 × 1056 px. */
export const LETTER_PAGE_WIDTH = 816;
export const LETTER_PAGE_HEIGHT = 1056;

/** Márgenes iniciales de 2,5 cm (configurables en una fase posterior). */
export const DEFAULT_MARGINS_CM = { top: 2.5, right: 2.5, bottom: 2.5, left: 2.5 };

/** Separación visual entre páginas: no pertenece a ninguna página. */
export const PAGE_GAP = 24;

/** Distancia del borde inferior de la página a la línea base del número. */
export const FOOTER_INSET = 24;

/** Tolerancia de subpíxel al decidir si un bloque cabe. */
export const PAGE_EPSILON = 0.5;

export type PageMarginsCm = { top: number; right: number; bottom: number; left: number };
export type PageMargins = { top: number; right: number; bottom: number; left: number };

export type PageLayout = {
  pageWidth: number;
  pageHeight: number;
  gap: number;
  footerInset: number;
  margins: PageMargins;
  contentWidth: number;
  contentHeight: number;
};

export function cmToPx(cm: number): number {
  return cm * CM_TO_PX;
}

export function marginsToPx(margins: PageMarginsCm = DEFAULT_MARGINS_CM): PageMargins {
  return {
    top: Math.round(cmToPx(margins.top)),
    right: Math.round(cmToPx(margins.right)),
    bottom: Math.round(cmToPx(margins.bottom)),
    left: Math.round(cmToPx(margins.left)),
  };
}

export function createPageLayout(marginsCm: PageMarginsCm = DEFAULT_MARGINS_CM): PageLayout {
  const margins = marginsToPx(marginsCm);
  return {
    pageWidth: LETTER_PAGE_WIDTH,
    pageHeight: LETTER_PAGE_HEIGHT,
    gap: PAGE_GAP,
    footerInset: FOOTER_INSET,
    margins,
    contentWidth: LETTER_PAGE_WIDTH - margins.left - margins.right,
    contentHeight: LETTER_PAGE_HEIGHT - margins.top - margins.bottom,
  };
}

/** Top del borde superior de la página `index` dentro del stack. */
export function pageTop(layout: PageLayout, index: number): number {
  return index * (layout.pageHeight + layout.gap);
}

/** Top del área de contenido (después del margen superior) en píxeles locales. */
export function contentTop(layout: PageLayout, index: number): number {
  return pageTop(layout, index) + layout.margins.top;
}

/** Bottom del área de contenido (antes del margen inferior) en píxeles locales. */
export function contentBottom(layout: PageLayout, index: number): number {
  return contentTop(layout, index) + layout.contentHeight;
}

/** Alto total del stack de páginas (incluye los huecos entre páginas). */
export function stackHeight(layout: PageLayout, pageCount: number): number {
  const count = Math.max(1, Math.floor(pageCount));
  return count * layout.pageHeight + (count - 1) * layout.gap;
}

/** Métricas de un bloque de nivel superior, medidas en el DOM. */
export type BlockMetrics = {
  /** Posición ProseMirror del bloque: ancla de la decoración de salto. */
  pos: number;
  /** Alto de la caja (sin márgenes), en píxeles locales. */
  height: number;
  /** Margen superior computado natural, en píxeles. */
  marginTop: number;
  /** Margen inferior computado natural, en píxeles. */
  marginBottom: number;
};

export type PageBreak = {
  /** Posición del bloque que inicia la página siguiente. */
  pos: number;
  /** Página (0-based) donde cae el bloque. */
  page: number;
  /** Alto del espaciador que empuja el bloque al inicio de su página. */
  spacerHeight: number;
};

export type PaginationResult = {
  /** Páginas necesarias, mínimo 1 (documento vacío también tiene página). */
  pageCount: number;
  /** Saltos que la vista debe insertar como decoraciones. */
  breaks: PageBreak[];
  /** Índices de bloques más altos que el área de contenido (Fase 2). */
  overflowBlocks: number[];
};

const round2 = (value: number): number => Math.round(value * 100) / 100;

/**
 * Calcula en qué página cae cada bloque de nivel superior y el alto del
 * espaciador necesario para empujarlo al inicio de la página siguiente.
 *
 * Modelo: un único flujo continuo. Un salto es un espaciador de altura H
 * insertado entre dos bloques; con `margin: 0` impide el colapso de márgenes,
 * de modo que la posición resultante es:
 *   bottom(previo) + marginBottom(previo) + H + marginTop(bloque)
 * y se elige H para que ese resultado sea exactamente el top del contenido de
 * la página siguiente. Los cortes no alteran la posición natural de los
 * bloques anteriores, así que un solo recorrido basta.
 *
 * Bloques más altos que una página (Fase 2): se colocan al inicio de su
 * página y se permite que desborden; `overflowBlocks` los identifica y el
 * conteo de páginas reserva las que ocupan.
 */
export function computePagination(blocks: BlockMetrics[], layout: PageLayout): PaginationResult {
  const breaks: PageBreak[] = [];
  const overflowBlocks: number[] = [];
  if (blocks.length === 0) return { pageCount: 1, breaks, overflowBlocks };

  let page = 0;
  let prevBottom: number | null = null;
  let prevMarginBottom = 0;

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    const height = Math.max(0, block.height);
    const marginTop = Math.max(0, block.marginTop);
    const marginBottom = Math.max(0, block.marginBottom);

    let top: number;
    if (prevBottom === null) {
      top = contentTop(layout, 0) + marginTop;
    } else {
      // Flujo normal: los márgenes adyacentes colapsan al mayor de los dos.
      top = prevBottom + Math.max(prevMarginBottom, marginTop);
      if (top + height > contentBottom(layout, page) + PAGE_EPSILON) {
        const target = contentTop(layout, page + 1);
        const spacerHeight = target - prevBottom - prevMarginBottom - marginTop;
        // El espaciador solo tiene sentido si la página siguiente está libre.
        // Si un bloque anterior desbordó y ya la ocupa, se deja fluir.
        if (spacerHeight > 0) {
          page += 1;
          top = target;
          breaks.push({ pos: block.pos, page, spacerHeight: round2(spacerHeight) });
        }
      }
    }

    const bottom = top + height;
    if (height > layout.contentHeight + PAGE_EPSILON) overflowBlocks.push(index);

    // Un bloque que desborda ocupa páginas completas adicionales: las
    // siguientes deben empezar después, no encima del texto desbordado.
    const overflow = bottom - contentBottom(layout, page) - PAGE_EPSILON;
    if (overflow > 0) {
      page += Math.ceil(overflow / (layout.pageHeight + layout.gap));
    }

    prevBottom = bottom;
    prevMarginBottom = marginBottom;
  }

  return { pageCount: Math.max(1, page + 1), breaks, overflowBlocks };
}

/** Etiquetas de pie: 1..N, siempre empezando en 1. */
export function footerLabels(pageCount: number): number[] {
  return Array.from({ length: Math.max(1, Math.floor(pageCount)) }, (_, i) => i + 1);
}
