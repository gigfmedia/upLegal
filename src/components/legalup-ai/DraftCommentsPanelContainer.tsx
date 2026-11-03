import { useCallback, useMemo, useSyncExternalStore, type ComponentProps } from 'react';
import type { Editor } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import {
  collectDraftCommentTextblocks,
  resolveDraftCommentAnchor,
} from '@/components/legalup-ai/draftCommentAnchor';
import {
  DraftCommentsPanel,
  type DraftCommentRow,
} from '@/components/legalup-ai/DraftCommentsPanel';
import type { DraftComment } from '@/hooks/useDraftComments';

type Props = Omit<ComponentProps<typeof DraftCommentsPanel>, 'rows'> & {
  editor: Editor | null;
  comments: DraftComment[];
};

/**
 * Aísla la resolución de comentarios del resto de AICaseDrafts. La lista de
 * comentarios y el documento cambian por caminos distintos: este contenedor
 * es el único que se suscribe a las transacciones del editor, de modo que
 * escribir no vuelve a renderizar todo el workspace documental.
 */
export function DraftCommentsPanelContainer({
  editor,
  comments,
  ...panelProps
}: Props) {
  // Sin comentarios no hace falta escuchar el documento: el panel vacío no
  // depende de sus posiciones. Al llegar el primer comentario la suscripción
  // se activa y el snapshot pasa del documento actual al panel.
  const enabled = comments.length > 0;

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!enabled || !editor || editor.isDestroyed || typeof editor.on !== 'function') {
        return () => {};
      }
      const onTransaction = ({ transaction }: { transaction: { docChanged: boolean } }) => {
        if (transaction.docChanged) onStoreChange();
      };
      editor.on('transaction', onTransaction);
      return () => {
        editor.off('transaction', onTransaction);
      };
    },
    [editor, enabled],
  );

  const getSnapshot = useCallback((): PMNode | null => {
    if (!enabled || !editor || editor.isDestroyed) return null;
    return editor.state?.doc ?? null;
  }, [editor, enabled]);

  const doc = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const rows = useMemo<DraftCommentRow[]>(() => {
    if (comments.length === 0) return [];
    if (!doc) {
      return comments.map((comment) => ({
        comment,
        resolution: { status: 'orphaned' as const },
      }));
    }
    const textblocks = collectDraftCommentTextblocks(doc);
    return comments.map((comment) => {
      try {
        return { comment, resolution: resolveDraftCommentAnchor(doc, comment.anchor, textblocks) };
      } catch {
        return { comment, resolution: { status: 'orphaned' as const } };
      }
    });
  }, [comments, doc]);

  return <DraftCommentsPanel rows={rows} {...panelProps} />;
}
