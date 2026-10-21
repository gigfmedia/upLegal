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
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view';
import {
  computePagination,
  type BlockMetrics,
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

/** Mide los bloques de nivel superior en píxeles de LAYOUT (sin zoom). */
function measureBlocks(view: EditorView): BlockMetrics[] {
  const scale = currentScale(view);
  const blocks: BlockMetrics[] = [];
  view.state.doc.forEach((_node, offset) => {
    const dom = view.nodeDOM(offset);
    if (!(dom instanceof HTMLElement)) return;
    const visualHeight = dom.getBoundingClientRect().height;
    const height = visualHeight > 0 ? visualHeight / scale : dom.offsetHeight;
    const style = window.getComputedStyle(dom);
    blocks.push({
      pos: offset,
      height,
      marginTop: parsePx(style.marginTop),
      marginBottom: parsePx(style.marginBottom),
    });
  });
  return blocks;
}

function createSpacer(height: number): HTMLElement {
  const el = document.createElement('div');
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
          let destroyed = false;
          let signature = '';
          let lastPageCount = 0;

          const measure = () => {
            if (destroyed || editorView.isDestroyed) return;
            const blocks = measureBlocks(editorView);
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
              Decoration.widget(br.pos, () => createSpacer(br.spacerHeight), {
                side: -1,
                key: `letter-page-break-${br.pos}-${Math.round(br.spacerHeight)}`,
                ignoreSelection: true,
                stopEvent: () => true,
              }),
            );
            const transaction = editorView.state.tr
              .setMeta(letterPaginationKey, {
                decorations: DecorationSet.create(editorView.state.doc, decorations),
                pageCount: result.pageCount,
              })
              .setMeta('addToHistory', false);
            editorView.dispatch(transaction);
          };

          const schedule = () => {
            if (frame) return;
            frame = raf(() => {
              frame = 0;
              measure();
            });
          };

          const resizeObserver =
            typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
          resizeObserver?.observe(editorView.dom);

          const onFontsLoaded = () => schedule();
          if (typeof document !== 'undefined' && document.fonts) {
            document.fonts.addEventListener?.('loadingdone', onFontsLoaded);
            void document.fonts.ready?.then(onFontsLoaded).catch(() => {});
          }

          schedule();

          return {
            update(view, previousState) {
              if (!previousState.doc.eq(view.state.doc)) schedule();
            },
            destroy() {
              destroyed = true;
              if (frame) caf(frame);
              frame = 0;
              resizeObserver?.disconnect();
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
