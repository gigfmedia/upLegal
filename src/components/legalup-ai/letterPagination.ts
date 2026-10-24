// UA-4 FASE 1 — extensión de paginación visual.
//
// Estrategia: UNA sola instancia de TipTap y UN solo documento. La extensión
// mide bloques de nivel superior y publica los cortes como
// `Decoration.widget` (espaciadores de presentación). Las decoraciones no
// forman parte del documento: no entran en `getHTML()`, no viajan al backend,
// no pasan por el autosave/OCC y no contaminan el historial de undo.
//
// Por qué no nodos de página ni múltiples editores: partir el documento
// rompería selección, pegado, undo/redo y el HTML persistido. Un flujo único
// con espaciadores conserva todo eso y solo cambia la presentación.
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view';
import {
  computePagination,
  type BlockMetrics,
  type LineBox,
  type ListItemMetrics,
  type PageLayout,
} from './letterPageGeometry';

type PaginationState = {
  decorations: DecorationSet;
  pageCount: number;
};

export type LetterPaginationOptions = {
  layout: PageLayout;
  /** Notifica el número de páginas calculado (para el overlay de React). */
  onPageCount?: (pageCount: number) => void;
};

export const letterPaginationKey = new PluginKey<PaginationState>('letterPagination');

const raf = (fn: () => void): number => {
  if (typeof requestAnimationFrame === 'function') return requestAnimationFrame(fn);
  return window.setTimeout(fn, 16);
};

const caf = (id: number): void => {
  if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(id);
  else window.clearTimeout(id);
};

/** Escala visual aplicada por el zoom (transform) sobre píxeles de layout. */
function currentScale(view: EditorView): number {
  const dom = view.dom as HTMLElement;
  const layoutWidth = dom.offsetWidth;
  if (!layoutWidth) return 1;
  const visualWidth = dom.getBoundingClientRect().width;
  if (!visualWidth) return 1;
  const scale = visualWidth / layoutWidth;
  return Number.isFinite(scale) && scale > 0 ? scale : 1;
}

function parsePx(value: string | null | undefined): number {
  const parsed = Number.parseFloat(value ?? '');
  return Number.isFinite(parsed) ? parsed : 0;
}

const INLINE_BREAK_SELECTOR = '.letter-page-break[data-letter-break]';

function isInlineBreak(el: Element): boolean {
  return el.classList.contains('letter-page-break') && el.hasAttribute('data-letter-break');
}

/** Suma visual de los espaciadores inline existentes dentro de `root`. */
function inlineBreakHeight(root: Element): number {
  let total = 0;
  for (const el of Array.from(root.querySelectorAll(INLINE_BREAK_SELECTOR))) {
    total += el.getBoundingClientRect().height;
  }
  return total;
}

/**
 * Posición ProseMirror del inicio de una línea visual **visible**.
 *
 * `caretRangeFromPoint` es mucho más rápido que `posAtCoords` y funciona para
 * cualquier línea que esté dentro del viewport. Las líneas fuera del viewport
 * no son hit-testeables: `linePosAt` devuelve -1 y la posición se resuelve
 * perezosamente solo si esa línea termina siendo un corte (ver `LineBox`).
 */
function linePosAt(
  view: EditorView,
  left: number,
  top: number,
  bounds: { start: number; end: number } | undefined,
): number {
  const doc = typeof document !== 'undefined' ? document : null;
  const caretRange = doc?.caretRangeFromPoint?.(left, top);
  if (caretRange && caretRange.startContainer.nodeType === 3) {
    try {
      const pos = view.posAtDOM(caretRange.startContainer, caretRange.startOffset);
      if (!bounds || (pos >= bounds.start && pos <= bounds.end)) return pos;
    } catch {
      // fuera del documento editable
    }
  }
  const caretPosition = (
    doc as
      | (Document & {
          caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
        })
      | null
  )?.caretPositionFromPoint?.(left, top);
  if (caretPosition && caretPosition.offsetNode.nodeType === 3) {
    try {
      const pos = view.posAtDOM(caretPosition.offsetNode, caretPosition.offset);
      if (!bounds || (pos >= bounds.start && pos <= bounds.end)) return pos;
    } catch {
      // fuera del documento editable
    }
  }
  return -1;
}

/** Top del rect de un carácter en `offset`, o null si es invisible. */
function charTopAt(node: Text, offset: number): number | null {
  if (offset >= node.length) return null;
  const range = document.createRange();
  range.setStart(node, offset);
  range.setEnd(node, Math.min(node.length, offset + 1));
  const rect = range.getBoundingClientRect();
  return rect.height > 0 ? rect.top : null;
}

/**
 * Posición del inicio de una línea en un nodo de texto, sin hit-testing.
 *
 * Para líneas fuera del viewport, busca por bisección el primer carácter cuya
 * caja superior coincide con el top de la línea. Es O(log n) por línea y no
 * depende del scroll, a diferencia de `posAtCoords` (que en párrafos de miles
 * de líneas es muy lento).
 */
function textOffsetPosAt(
  view: EditorView,
  node: Text,
  targetTop: number,
  startOf: (node: Text) => number,
  bounds?: { start: number; end: number },
): number {
  const base = startOf(node);
  if (base < 0 || node.length === 0) return -1;
  let lo = 0;
  let hi = node.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    const top = charTopAt(node, mid);
    if (top !== null && top >= targetTop - 1.5) hi = mid;
    else lo = mid + 1;
  }
  if (lo >= node.length) return -1;
  const pos = base + lo;
  return bounds && (pos < bounds.start || pos > bounds.end) ? -1 : pos;
}

/** Respaldo para líneas fuera del viewport: solo se usa para cortes. */
function offscreenPosAt(
  view: EditorView,
  left: number,
  top: number,
  bounds: { start: number; end: number } | undefined,
): number {
  const at = view.posAtCoords({ left, top });
  const pos = at?.pos ?? -1;
  return bounds && (pos < bounds.start || pos > bounds.end) ? -1 : pos;
}

type RawLine = {
  top: number;
  bottom: number;
  left: number;
  node: Text;
  /** Coordenadas visuales reales (incluyen espaciadores), para hit-testing. */
  rawTop: number;
  rawBottom: number;
};

type CollectedLines = { lines: LineBox[]; unresolved: number };

/**
 * Recolecta las líneas visuales de un textblock (o de los textblocks propios
 * de un ítem) y las convierte a píxeles de LAYOUT relativos a `originRect`.
 *
 * Los espaciadores inline ya insertados desplazan el contenido; se restan
 * de cada rect para obtener la geometría NATURAL y que el cálculo sea estable
 * (no acumula cortes sobre cortes). Su alto se mide con `getBoundingClientRect`
 * (visual) y los tops se normalizan con la misma escala del zoom.
 *
 * Las posiciones ProseMirror solo se resuelven para las líneas visibles. Una
 * línea fuera del viewport deja `unresolved` y expone `pos` como getter: el
 * motor la resuelve únicamente si la elige como corte, evitando medir cientos
 * de líneas con `posAtCoords` (que es lento en párrafos muy largos).
 */
function collectLines(
  container: Element,
  originRect: DOMRect,
  view: EditorView,
  scale: number,
  bounds?: { start: number; end: number },
): CollectedLines {
  const raw: RawLine[] = [];
  const nodeStarts = new WeakMap<Text, number>();
  const startOf = (node: Text): number => {
    const cached = nodeStarts.get(node);
    if (cached !== undefined) return cached;
    let value = -1;
    try {
      value = view.posAtDOM(node, 0);
    } catch {
      value = -1;
    }
    nodeStarts.set(node, value);
    return value;
  };
  let shift = 0;

  const walk = (parent: Element) => {
    for (const child of Array.from(parent.childNodes)) {
      if (child.nodeType === 1) {
        const el = child as HTMLElement;
        if (isInlineBreak(el)) {
          shift += el.getBoundingClientRect().height;
          continue;
        }
        const tag = el.tagName;
        if (tag === 'UL' || tag === 'OL') continue; // listas anidadas: viajan con el ítem
        if (tag === 'BR') continue; // las líneas vacías no tienen texto: no son candidatas
        walk(el);
        continue;
      }
      if (child.nodeType !== 3) continue;
      const text = child as Text;
      if (!text.nodeValue) continue;
      const range = document.createRange();
      range.selectNodeContents(text);
      for (const rect of range.getClientRects()) {
        if (rect.height <= 0 || rect.width <= 0) continue;
        raw.push({
          top: rect.top - shift,
          bottom: rect.bottom - shift,
          left: rect.left,
          node: text,
          rawTop: rect.top,
          rawBottom: rect.bottom,
        });
      }
    }
  };
  walk(container);
  if (!raw.length) return { lines: [], unresolved: 0 };

  raw.sort((a, b) => a.top - b.top || a.left - b.left);
  const groups: RawLine[] = [];
  for (const rect of raw) {
    const last = groups[groups.length - 1];
    if (last && Math.abs(rect.top - last.top) <= 1.5) {
      if (rect.left < last.left) {
        last.left = rect.left;
        last.node = rect.node;
      }
      last.bottom = Math.max(last.bottom, rect.bottom);
      last.rawBottom = Math.max(last.rawBottom, rect.rawBottom);
    } else {
      groups.push({ ...rect });
    }
  }

  const lines: LineBox[] = [];
  let unresolved = 0;
  let previousPos = -1;
  for (const group of groups) {
    const midY = (group.rawTop + group.rawBottom) / 2;
    const pos = linePosAt(view, group.left + 0.5, midY, bounds);
    const top = (group.top - originRect.top) / scale;
    const bottom = (group.bottom - originRect.top) / scale;
    if (pos >= 0) {
      if (pos <= previousPos) continue;
      previousPos = pos;
      lines.push({ pos, top, bottom });
      continue;
    }

    // Fuera del viewport: se resuelve SOLO si el motor elige esta línea como
    // corte, primero por bisección de offsets (sin scroll) y luego por
    // `posAtCoords` como último recurso.
    unresolved += 1;
    let resolved = -1;
    const line: LineBox = {
      get pos() {
        if (resolved < 0) {
          resolved = textOffsetPosAt(view, group.node, group.rawTop, startOf, bounds);
          if (resolved < 0) resolved = offscreenPosAt(view, group.left + 0.5, midY, bounds);
        }
        return resolved;
      },
      top,
      bottom,
    };
    lines.push(line);
  }
  return { lines, unresolved };
}

function measureItems(
  list: HTMLElement,
  blockRect: DOMRect,
  view: EditorView,
  scale: number,
  blockPos: number,
): ListItemMetrics[] {
  const listNode = view.state.doc.nodeAt(blockPos);
  if (!listNode) return [];
  const items: ListItemMetrics[] = [];
  const lis = Array.from(list.children).filter((el) => el.tagName === 'LI') as HTMLElement[];
  let shiftBefore = 0;

  listNode.forEach((child, offset) => {
    const index = items.length;
    const li = lis[index];
    if (!li) return;
    const liRect = li.getBoundingClientRect();
    const internal = inlineBreakHeight(li);
    const start = blockPos + 1 + offset;
    const end = start + child.content.size;
    const collected = collectLines(li, liRect, view, scale, { start, end });
    items.push({
      pos: start,
      endPos: end,
      top: (liRect.top - blockRect.top - shiftBefore) / scale,
      height: (liRect.height - internal) / scale,
      lines: collected.lines,
      unresolvedLines: collected.unresolved,
    });
    shiftBefore += internal;
  });
  return items;
}

/** Desplaza las posiciones de un bloque cacheado a su offset actual. */
function shiftMetrics(block: BlockMetrics, offset: number): BlockMetrics {
  const delta = offset - block.pos;
  if (delta === 0) return block;
  return {
    ...block,
    pos: offset,
    lines: block.lines?.map((line) => ({ ...line, pos: line.pos + delta })),
    items: block.items?.map((item) => ({
      ...item,
      pos: item.pos + delta,
      endPos: item.endPos + delta,
      lines: item.lines.map((line) => ({ ...line, pos: line.pos + delta })),
    })),
  };
}

/**
 * Mide los bloques de nivel superior en píxeles de LAYOUT (sin zoom).
 *
 * Cache por identidad de nodo: Tiptap/ProseMirror reutiliza los nodos que no
 * cambiaron en una transacción. Así, al escribir solo se vuelve a medir el
 * bloque modificado; el resto reutiliza su geometría natural (los
 * espaciadores ya se descuentan en la medición) y solo se desplazan sus
 * posiciones. Sin este cache, cada tecla medía todo el documento.
 */
function measureBlocks(
  view: EditorView,
  cache: WeakMap<ProseMirrorNode, BlockMetrics>,
): BlockMetrics[] {
  const scale = currentScale(view);
  const blocks: BlockMetrics[] = [];
  view.state.doc.forEach((node, offset) => {
    const cached = cache.get(node);
    if (cached) {
      blocks.push(shiftMetrics(cached, offset));
      return;
    }
    const dom = view.nodeDOM(offset);
    if (!(dom instanceof HTMLElement)) return;
    const rect = dom.getBoundingClientRect();
    const internal = inlineBreakHeight(dom);
    const naturalHeight = rect.height - internal;
    const height = naturalHeight > 0 ? naturalHeight / scale : dom.offsetHeight;
    const style = window.getComputedStyle(dom);
    const block: BlockMetrics = {
      pos: offset,
      height,
      marginTop: parsePx(style.marginTop),
      marginBottom: parsePx(style.marginBottom),
    };

    if (node.type.name === 'bulletList' || node.type.name === 'orderedList') {
      block.items = measureItems(dom, rect, view, scale, offset);
    } else if (node.isTextblock) {
      const start = offset + 1;
      const end = offset + node.nodeSize - 1;
      const collected = collectLines(dom, rect, view, scale, { start, end });
      block.lines = collected.lines;
      block.unresolvedLines = collected.unresolved;
    }
    if (block.items) {
      block.unresolvedLines = block.items.reduce((sum, item) => sum + (item.unresolvedLines ?? 0), 0);
    }
    // Solo se cachean bloques con posiciones ya resueltas: un getter perezoso
    // capturó coordenadas del layout actual y quedaría obsoleto al reutilizarlo.
    if (!block.unresolvedLines) cache.set(node, block);
    blocks.push(block);
  });
  return blocks;
}

function baseSpacer(height: number): HTMLElement {
  const el = document.createElement('span');
  el.className = 'letter-page-break';
  el.style.height = `${height}px`;
  el.setAttribute('contenteditable', 'false');
  el.setAttribute('aria-hidden', 'true');
  el.style.margin = '0';
  el.style.padding = '0';
  el.style.border = '0';
  el.style.userSelect = 'none';
  el.style.pointerEvents = 'none';
  return el;
}

function createSpacer(height: number): HTMLElement {
  const el = baseSpacer(height);
  el.setAttribute('role', 'presentation');
  return el;
}

function createInlineSpacer(height: number): HTMLElement {
  const el = baseSpacer(height);
  el.setAttribute('data-letter-break', '1');
  return el;
}

export const LetterPagination = Extension.create<LetterPaginationOptions>({
  name: 'letterPagination',

  addProseMirrorPlugins() {
    const { layout, onPageCount } = this.options;

    return [
      new Plugin<PaginationState>({
        key: letterPaginationKey,

        state: {
          init: () => ({ decorations: DecorationSet.empty, pageCount: 1 }),
          apply(tr, value) {
            const meta = tr.getMeta(letterPaginationKey) as PaginationState | undefined;
            if (meta) return meta;
            return {
              pageCount: value.pageCount,
              decorations: value.decorations.map(tr.mapping, tr.doc),
            };
          },
        },

        props: {
          decorations(state) {
            return letterPaginationKey.getState(state)?.decorations ?? null;
          },
        },

        view(editorView) {
          let frame = 0;
          let timer = 0;
          let destroyed = false;
          let signature = '';
          let lastPageCount = 0;
          let cache = new WeakMap<ProseMirrorNode, BlockMetrics>();
          let lastWidth = editorView.dom.offsetWidth;

          const canMeasure = () => {
            if (destroyed || editorView.isDestroyed) return false;
            if (typeof document !== 'undefined' && document.hidden) return false;
            if (editorView.composing) return false;
            const dom = editorView.dom as HTMLElement;
            if (!dom.isConnected || dom.getClientRects().length === 0) return false;
            const rect = dom.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          };

          const measure = () => {
            if (!canMeasure()) return;
            const blocks = measureBlocks(editorView, cache);
            const result = computePagination(blocks, layout);
            const nextSignature = `${result.pageCount}|${result.breaks
              .map((b) => `${b.pos}:${b.spacerHeight}`)
              .join(',')}`;

            if (result.pageCount !== lastPageCount) {
              lastPageCount = result.pageCount;
              onPageCount?.(result.pageCount);
            }
            if (nextSignature === signature) return;
            signature = nextSignature;

            const decorations = result.breaks.map((br) =>
              Decoration.widget(
                br.pos,
                () =>
                  br.anchor === 'inline'
                    ? createInlineSpacer(br.spacerHeight)
                    : createSpacer(br.spacerHeight),
                {
                  side: -1,
                  key: `letter-page-break-${br.anchor}-${br.pos}-${Math.round(br.spacerHeight)}`,
                  ignoreSelection: true,
                  stopEvent: () => true,
                },
              ),
            );
            const transaction = editorView.state.tr
              .setMeta(letterPaginationKey, {
                decorations: DecorationSet.create(editorView.state.doc, decorations),
                pageCount: result.pageCount,
              })
              .setMeta('addToHistory', false);
            editorView.dispatch(transaction);
          };

          const scheduleNow = () => {
            if (frame) return;
            frame = raf(() => {
              frame = 0;
              measure();
            });
          };

          // Al escribir, esperar a que el usuario haga una pausa breve antes de
          // volver a medir: evita bloquear cada tecla en documentos largos.
          const schedule = () => {
            if (timer) window.clearTimeout(timer);
            timer = window.setTimeout(() => {
              timer = 0;
              scheduleNow();
            }, 100);
          };

          // Solo un cambio de ANCHO invalida la geometría medida. Un cambio de
          // alto (al escribir) no obliga a volver a medir bloques: el cache por
          // nodo reutiliza todo lo que no cambió.
          const onResize = () => {
            const width = editorView.dom.offsetWidth;
            if (width !== lastWidth) {
              lastWidth = width;
              cache = new WeakMap();
            }
            schedule();
          };

          const resizeObserver =
            typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null;
          resizeObserver?.observe(editorView.dom);

          const onFontsLoaded = () => {
            cache = new WeakMap();
            scheduleNow();
          };
          if (typeof document !== 'undefined' && document.fonts) {
            document.fonts.addEventListener?.('loadingdone', onFontsLoaded);
            void document.fonts.ready?.then(onFontsLoaded).catch(() => {});
          }

          // El editor puede estar en una pestaña/panel oculto: al volver a ser
          // visible hay que remedir (mientras está oculto no hay geometría).
          const onVisibility = () => {
            if (typeof document !== 'undefined' && !document.hidden) scheduleNow();
          };
          if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', onVisibility);
          }

          // Durante una composición IME el DOM aún no refleja el texto final;
          // se espera a `compositionend` para volver a medir.
          const onCompositionEnd = () => schedule();
          editorView.dom.addEventListener('compositionend', onCompositionEnd);

          scheduleNow();

          return {
            update(view, previousState) {
              if (!previousState.doc.eq(view.state.doc)) schedule();
            },
            destroy() {
              destroyed = true;
              if (frame) caf(frame);
              if (timer) window.clearTimeout(timer);
              frame = 0;
              timer = 0;
              resizeObserver?.disconnect();
              editorView.dom.removeEventListener('compositionend', onCompositionEnd);
              if (typeof document !== 'undefined') {
                document.removeEventListener('visibilitychange', onVisibility);
              }
              if (typeof document !== 'undefined' && document.fonts) {
                document.fonts.removeEventListener?.('loadingdone', onFontsLoaded);
              }
            },
          };
        },
      }),
    ];
  },
});
