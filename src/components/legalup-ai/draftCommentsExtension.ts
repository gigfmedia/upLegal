import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node as PMNode } from '@tiptap/pm/model';
import type { DraftComment } from '@/hooks/useDraftComments';
import { collectDraftCommentTextblocks, resolveDraftCommentAnchor } from './draftCommentAnchor';

// UA-5.2 — resaltado inline de comentarios.
//
// Las decoraciones son SOLO presentación: no son nodos del documento, no
// entran en `getHTML()`, no pasan por autosave/OCC, no contaminan undo y no
// aparecen en previews, copia, impresión ni PDF. Este extension se configura
// únicamente en el editor principal (nunca en `StaticDraftDoc`).

type DraftCommentsState = {
  comments: DraftComment[];
  decorations: DecorationSet;
};

export const draftCommentsPluginKey = new PluginKey<DraftCommentsState>('draftComments');

const HIGHLIGHT_STYLE = [
  'background-color: rgba(250, 204, 21, 0.20)',
  'border-bottom: 2px solid rgba(202, 138, 4, 0.55)',
  'border-radius: 2px',
].join(';');

function hasOpenComments(comments: DraftComment[]): boolean {
  return comments.some((comment) => comment.status === 'open');
}

function buildDecorations(doc: PMNode, comments: DraftComment[]): DecorationSet {
  // Sin comentarios abiertos no hay nada que decorar: no recorremos el
  // documento ni en la inicialización ni en cada tecla.
  if (!hasOpenComments(comments)) return DecorationSet.empty;

  const decorations: Decoration[] = [];
  const textblocks = collectDraftCommentTextblocks(doc);
  for (const comment of comments) {
    if (comment.status !== 'open') continue;
    const resolved = resolveDraftCommentAnchor(doc, comment.anchor, textblocks);
    if (resolved.status !== 'anchored') continue;
    decorations.push(
      Decoration.inline(resolved.from, resolved.to, {
        class: 'draft-comment-highlight',
        'data-draft-comment-id': comment.id,
        title: comment.body,
        style: HIGHLIGHT_STYLE,
      }),
    );
  }
  return DecorationSet.create(doc, decorations);
}

export const DraftComments = Extension.create({
  name: 'draftComments',

  addProseMirrorPlugins() {
    return [
      new Plugin<DraftCommentsState>({
        key: draftCommentsPluginKey,
        state: {
          init: (_config, state) => ({
            comments: [],
            decorations: buildDecorations(state.doc, []),
          }),
          apply(tr, previous) {
            const nextComments = tr.getMeta(draftCommentsPluginKey) as DraftComment[] | undefined;
            if (nextComments) {
              return {
                comments: nextComments,
                decorations: buildDecorations(tr.doc, nextComments),
              };
            }
            if (!tr.docChanged || !hasOpenComments(previous.comments)) return previous;
            return {
              comments: previous.comments,
              decorations: buildDecorations(tr.doc, previous.comments),
            };
          },
        },
        props: {
          decorations(state) {
            return draftCommentsPluginKey.getState(state)?.decorations ?? null;
          },
        },
      }),
    ];
  },
});
