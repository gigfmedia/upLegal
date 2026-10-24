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

/** Caja de una línea visual dentro de un textblock (px de layout). */
export type LineBox = {
  /** Posición ProseMirror del inicio de la línea (ancla del corte). */
  pos: number;
  /** Borde superior de la línea, relativo al border-box del bloque. */
  top: number;
  /** Borde inferior de la línea, relativo al border-box del bloque. */
  bottom: number;
};

/** Un <li> medido: se mueve completo salvo que supere una página. */
export type ListItemMetrics = {
  /** Posición ProseMirror del inicio del ítem. */
  pos: number;
  /** Posición del final del último textblock del ítem (ancla para el
   *  siguiente ítem: el espaciador se inserta dentro de este ítem). */
  endPos: number;
  /** Borde superior, relativo al border-box del bloque de lista. */
  top: number;
  /** Alto total del ítem (incluye listas anidadas). */
  height: number;
  /** Líneas de los textblocks propios del ítem (sin las listas anidadas). */
  lines: LineBox[];
  /** Líneas fuera del viewport sin posición resuelta (interno). */
  unresolvedLines?: number;
};

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
  /** Líneas del textblock (párrafos y títulos divisibles). */
  lines?: LineBox[];
  /** Ítems de una lista (corte preferente entre ítems). */
  items?: ListItemMetrics[];
  /** Líneas fuera del viewport cuya posición aún no se resolvió (interno). */
  unresolvedLines?: number;
};

/**
 * `block`: el espaciador va entre bloques (Fase 1, `div`).
 * `inline`: el espaciador va dentro de un textblock, en el inicio de una
 * línea (Fase 2, `span display:block`).
 */
export type BreakAnchor = 'block' | 'inline';

export type PageBreak = {
  /** Posición donde se inserta el espaciador (bloque o inicio de línea). */
  pos: number;
  /** Página (0-based) donde cae el contenido desplazado. */
  page: number;
  /** Alto del espaciador que empuja el contenido al inicio de su página. */
  spacerHeight: number;
  /** Tipo de ancla: entre bloques o dentro de un textblock. */
  anchor: BreakAnchor;
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
 * Unidades divisibles: líneas de un textblock (párrafo/título) o ítems de una
 * lista. Las líneas se miden con `Range.getClientRects()` y su `top`/`bottom`
 * son relativos al border-box del bloque; la posición es la del inicio de la
 * línea en el documento. El motor puro no toca el DOM: solo decide dónde van
 * los espaciadores y de qué alto.
 */
type PaginationOutcome =
  | { kind: 'ok'; breaks: PageBreak[]; page: number; addedHeight: number }
  | { kind: 'move' }
  | { kind: 'none' };

const hasFragments = (block: BlockMetrics): boolean =>
  Boolean(block.lines?.length || block.items?.length);

function countFittingLines(
  lines: LineBox[],
  baseTop: number,
  page: number,
  layout: PageLayout,
): number {
  const limit = contentBottom(layout, page) + PAGE_EPSILON;
  let count = 0;
  while (count < lines.length && baseTop + lines[count].bottom <= limit) count += 1;
  return count;
}

/**
 * Coloca líneas consecutivas a partir de `baseTop` (absoluto). Devuelve los
 * cortes necesarios, la página final y el alto total añadido.
 *
 * Control de viudas/huérfanas: no parte un párrafo dejando una sola línea al
 * final de la página ni una sola al principio de la siguiente. Si ambas cosas
 * no se pueden cumplir a la vez, devuelve `none` y el llamador aplica el
 * fallback seguro (mover el bloque completo o permitir el desborde).
 */
function paginateLines(
  lines: LineBox[],
  baseTop: number,
  page: number,
  layout: PageLayout,
): PaginationOutcome {
  const breaks: PageBreak[] = [];
  let shift = 0;
  let currentPage = page;
  let index = 0;

  while (index < lines.length) {
    const limit = contentBottom(layout, currentPage) + PAGE_EPSILON;
    let next = index;
    while (next < lines.length && baseTop + shift + lines[next].bottom <= limit) next += 1;
    if (next >= lines.length) break;
    if (next === 0) return { kind: 'none' };

    let splitAt = next;
    const remaining = lines.length - splitAt;
    if (remaining === 1) {
      // Dejar dos líneas en la página siguiente; si no hay dos disponibles en
      // esta página, no se puede cumplir la regla: fallback.
      if (splitAt - 1 >= 2) splitAt -= 1;
      else return { kind: 'none' };
    }
    if (splitAt < 2) return { kind: 'none' };

    const breakPos = lines[splitAt].pos;
    if (breakPos < 0) return { kind: 'none' };
    const lineTop = baseTop + shift + lines[splitAt].top;
    const spacerHeight = contentTop(layout, currentPage + 1) - lineTop;
    if (!(spacerHeight > 0)) return { kind: 'none' };

    breaks.push({
      pos: breakPos,
      page: currentPage + 1,
      spacerHeight: round2(spacerHeight),
      anchor: 'inline',
    });
    shift += spacerHeight;
    currentPage += 1;
    index = splitAt;
  }

  return { kind: 'ok', breaks, page: currentPage, addedHeight: shift };
}

function paginateParagraph(
  block: BlockMetrics,
  top: number,
  page: number,
  layout: PageLayout,
  allowMoveWhole: boolean,
): PaginationOutcome {
  const lines = block.lines;
  if (!lines?.length) return { kind: 'none' };

  const fit = countFittingLines(lines, top, page, layout);
  if (fit === lines.length) return { kind: 'ok', breaks: [], page, addedHeight: 0 };
  if (allowMoveWhole && (fit < 2 || lines.length <= 3)) return { kind: 'move' };

  const result = paginateLines(lines, top, page, layout);
  if (result.kind === 'none' && allowMoveWhole) return { kind: 'move' };
  return result;
}

/**
 * Listas: el ítem es la unidad natural. Los ítems que caben en una página se
 * mueven completos (nunca se parte un ítem corto); los que superan una página
 * se parten por las líneas de sus propios textblocks. Las listas anidadas
 * viajan con su ítem; no se parte dentro de ellas.
 */
function paginateList(
  block: BlockMetrics,
  top: number,
  page: number,
  layout: PageLayout,
  allowMoveWhole: boolean,
): PaginationOutcome {
  const items = block.items;
  if (!items?.length) return { kind: 'none' };

  const breaks: PageBreak[] = [];
  let shift = 0;
  let currentPage = page;
  let index = 0;

  while (index < items.length) {
    const item = items[index];
    const itemTop = top + item.top + shift;
    const limit = contentBottom(layout, currentPage) + PAGE_EPSILON;
    if (itemTop + item.height <= limit) {
      index += 1;
      continue;
    }

    if (item.height <= layout.contentHeight + PAGE_EPSILON) {
      // Ítem corto: se mueve completo a la página siguiente.
      if (index === 0) {
        if (allowMoveWhole) return { kind: 'move' };
        return { kind: 'none' };
      }
      const spacerHeight = contentTop(layout, currentPage + 1) - itemTop;
      if (!(spacerHeight > 0)) return { kind: 'none' };
      breaks.push({
        pos: items[index - 1].endPos,
        page: currentPage + 1,
        spacerHeight: round2(spacerHeight),
        anchor: 'inline',
      });
      shift += spacerHeight;
      currentPage += 1;
      continue;
    }

    // Ítem más alto que una página: se parte por líneas.
    if (!item.lines.length) return { kind: 'none' };
    const fit = countFittingLines(item.lines, itemTop, currentPage, layout);
    if (index === 0 && allowMoveWhole && fit < 2) return { kind: 'move' };
    if (index > 0 && fit < 2) {
      const spacerHeight = contentTop(layout, currentPage + 1) - itemTop;
      if (!(spacerHeight > 0)) return { kind: 'none' };
      breaks.push({
        pos: items[index - 1].endPos,
        page: currentPage + 1,
        spacerHeight: round2(spacerHeight),
        anchor: 'inline',
      });
      shift += spacerHeight;
      currentPage += 1;
      continue;
    }

    const result = paginateLines(item.lines, itemTop, currentPage, layout);
    if (result.kind === 'none') return { kind: 'none' };
    breaks.push(...result.breaks);
    shift += result.addedHeight;
    currentPage = result.page;
    index += 1;
  }

  return { kind: 'ok', breaks, page: currentPage, addedHeight: shift };
}

function paginateBlock(
  block: BlockMetrics,
  top: number,
  page: number,
  layout: PageLayout,
  allowMoveWhole: boolean,
): PaginationOutcome {
  if (block.items?.length) return paginateList(block, top, page, layout, allowMoveWhole);
  if (block.lines?.length) return paginateParagraph(block, top, page, layout, allowMoveWhole);
  return { kind: 'none' };
}

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
 * FASE 2: si el bloque trae líneas o ítems medidos, los cortes pueden caer
 * DENTRO del bloque. El espaciador se ancla al inicio de la línea (o al final
 * del ítem anterior) y el alto se calcula con las posiciones naturales
 * medidas. El contenido posterior se desplaza exactamente H (linealidad
 * verificada en navegador), de modo que el cálculo sigue siendo puro.
 *
 * Bloques más altos que una página sin fragmentos (o sin un corte válido): se
 * colocan al inicio de su página y se permite que desborden; `overflowBlocks`
 * los identifica y el conteo de páginas reserva las que ocupan. Nunca se
 * oculta ni se pierde contenido.
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
    }

    if (top + height > contentBottom(layout, page) + PAGE_EPSILON) {
      const beforeOverflow = breaks.length;
      if (hasFragments(block)) {
        const allowMoveWhole =
          prevBottom !== null && top > contentTop(layout, page) + PAGE_EPSILON;
        let result = paginateBlock(block, top, page, layout, allowMoveWhole);

        if (result.kind === 'move' && prevBottom !== null) {
          const target = contentTop(layout, page + 1);
          const spacerHeight = target - prevBottom - prevMarginBottom - marginTop;
          if (spacerHeight > 0) {
            page += 1;
            top = target;
            breaks.push({
              pos: block.pos,
              page,
              spacerHeight: round2(spacerHeight),
              anchor: 'block',
            });
            result = paginateBlock(block, top, page, layout, false);
          }
        }

        if (result.kind === 'ok') {
          breaks.push(...result.breaks);
          page = result.page;
          const bottom = top + height + result.addedHeight;
          if (result.breaks.length === 0 && height > layout.contentHeight + PAGE_EPSILON) {
            overflowBlocks.push(index);
          }
          const overflow = bottom - contentBottom(layout, page) - PAGE_EPSILON;
          if (overflow > 0) {
            page += Math.ceil(overflow / (layout.pageHeight + layout.gap));
          }
          prevBottom = bottom;
          prevMarginBottom = marginBottom;
          continue;
        }
        // Sin corte válido: se descarta lo calculado y se usa el fallback.
        breaks.length = beforeOverflow;
      }

      if (prevBottom !== null) {
        const target = contentTop(layout, page + 1);
        const spacerHeight = target - prevBottom - prevMarginBottom - marginTop;
        // El espaciador solo tiene sentido si la página siguiente está libre.
        // Si un bloque anterior desbordó y ya la ocupa, se deja fluir.
        if (spacerHeight > 0) {
          page += 1;
          top = target;
          breaks.push({
            pos: block.pos,
            page,
            spacerHeight: round2(spacerHeight),
            anchor: 'block',
          });
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
