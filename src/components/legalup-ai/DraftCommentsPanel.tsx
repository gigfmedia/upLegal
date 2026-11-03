import { AlertTriangle, Check, Link2, MessageSquare, RotateCcw, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ResolveDraftCommentAnchorResult } from './draftCommentAnchor';
import type { DraftComment } from '@/hooks/useDraftComments';

export type DraftCommentRow = {
  comment: DraftComment;
  resolution: ResolveDraftCommentAnchorResult;
};

type Props = {
  rows: DraftCommentRow[];
  isLoading: boolean;
  error: string | null;
  activeCommentId: string | null;
  reanchorTargetId: string | null;
  reanchorError: string | null;
  onNavigate: (comment: DraftComment) => void;
  onResolve: (comment: DraftComment) => void;
  onReopen: (comment: DraftComment) => void;
  onDismiss: (comment: DraftComment) => void;
  onDelete: (comment: DraftComment) => void;
  onStartReanchor: (comment: DraftComment) => void;
  onConfirmReanchor: () => void;
  onCancelReanchor: () => void;
};

const RESOLUTION_LABEL: Record<ResolveDraftCommentAnchorResult['status'], string> = {
  anchored: 'Anclado',
  orphaned: 'Huérfano',
  ambiguous: 'Ambiguo',
};

function CommentCard({
  row,
  active,
  reanchorTarget,
  reanchorError,
  onNavigate,
  onResolve,
  onReopen,
  onDismiss,
  onDelete,
  onStartReanchor,
  onConfirmReanchor,
  onCancelReanchor,
}: {
  row: DraftCommentRow;
  active: boolean;
  reanchorTarget: boolean;
  reanchorError: string | null;
} & Pick<Props, 'onNavigate' | 'onResolve' | 'onReopen' | 'onDismiss' | 'onDelete' | 'onStartReanchor' | 'onConfirmReanchor' | 'onCancelReanchor'>) {
  const { comment, resolution } = row;
  const anchored = resolution.status === 'anchored';
  const isResolved = comment.status === 'resolved';
  const isDismissed = comment.status === 'dismissed';

  return (
    <li
      className={`rounded-lg border p-2.5 text-sm ${active ? 'border-green-400 bg-green-50/50' : 'bg-card'}`}
      data-testid={`draft-comment-${comment.id}`}
      data-status={comment.status}
      data-anchor-status={resolution.status}
    >
      <div className="flex items-start justify-between gap-2">
        <blockquote className="line-clamp-2 border-l-2 border-amber-300 pl-2 text-xs italic text-muted-foreground">
          «{comment.anchor.quote}»
        </blockquote>
        <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
          anchored ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
        }`}>
          {RESOLUTION_LABEL[resolution.status]}
        </span>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm text-gray-900">{comment.body}</p>
      {reanchorTarget ? (
        <div className="mt-2 rounded border border-amber-200 bg-amber-50 p-2" role="status">
          <p className="text-xs text-amber-900">
            Selecciona en el editor el nuevo fragmento y confirma. No se moverá el comentario sin tu acción.
          </p>
          {reanchorError ? <p className="mt-1 text-xs text-red-600" role="alert">{reanchorError}</p> : null}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Button size="sm" className="h-7 text-xs" onClick={onConfirmReanchor} data-testid="draft-comment-reanchor-confirm">
              Confirmar reanclaje
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onCancelReanchor}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          disabled={!anchored}
          onClick={() => onNavigate(comment)}
          data-testid={`draft-comment-navigate-${comment.id}`}
        >
          <Link2 className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
          Ir al texto
        </Button>
        {!anchored && !reanchorTarget ? (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => onStartReanchor(comment)}
            data-testid={`draft-comment-reanchor-${comment.id}`}
          >
            Reanclar
          </Button>
        ) : null}
        {!isResolved && !isDismissed ? (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onResolve(comment)} data-testid={`draft-comment-resolve-${comment.id}`}>
            <Check className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            Resolver
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onReopen(comment)} data-testid={`draft-comment-reopen-${comment.id}`}>
            <RotateCcw className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            Reabrir
          </Button>
        )}
        {!isResolved && !isDismissed ? (
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onDismiss(comment)} data-testid={`draft-comment-dismiss-${comment.id}`}>
            <X className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            Descartar
          </Button>
        ) : null}
        <Button size="sm" variant="ghost" className="h-7 text-xs text-red-700" onClick={() => onDelete(comment)} data-testid={`draft-comment-delete-${comment.id}`}>
          <Trash2 className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
          Eliminar
        </Button>
      </div>
    </li>
  );
}

/** Panel lateral de comentarios (UA-5.2). No contiene lógica de anclaje: la
 *  resolución llega ya calculada desde el editor para que el estado huérfano/
 *  ambiguo sea observable y nunca se reancle en silencio. */
export function DraftCommentsPanel({
  rows,
  isLoading,
  error,
  activeCommentId,
  reanchorTargetId,
  reanchorError,
  onNavigate,
  onResolve,
  onReopen,
  onDismiss,
  onDelete,
  onStartReanchor,
  onConfirmReanchor,
  onCancelReanchor,
}: Props) {
  const open = rows.filter((row) => row.comment.status === 'open');
  const closed = rows.filter((row) => row.comment.status !== 'open');
  const anchored = open.filter((row) => row.resolution.status === 'anchored');
  const unresolved = open.filter((row) => row.resolution.status !== 'anchored');

  const renderRows = (list: DraftCommentRow[]) => (
    <ul className="space-y-2">
      {list.map((row) => (
        <CommentCard
          key={row.comment.id}
          row={row}
          active={row.comment.id === activeCommentId}
          reanchorTarget={row.comment.id === reanchorTargetId}
          reanchorError={reanchorError}
          onNavigate={onNavigate}
          onResolve={onResolve}
          onReopen={onReopen}
          onDismiss={onDismiss}
          onDelete={onDelete}
          onStartReanchor={onStartReanchor}
          onConfirmReanchor={onConfirmReanchor}
          onCancelReanchor={onCancelReanchor}
        />
      ))}
    </ul>
  );

  return (
    <section className="rounded-lg border bg-card" aria-label="Comentarios del borrador" data-testid="draft-comments-panel">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <MessageSquare className="h-4 w-4 text-amber-600" aria-hidden="true" />
          Comentarios
          {open.length > 0 ? <span className="text-xs text-muted-foreground">({open.length} abiertos)</span> : null}
        </p>
      </div>
      <div className="max-h-[360px] space-y-3 overflow-y-auto p-3">
        {isLoading ? <p className="text-xs text-muted-foreground">Cargando comentarios…</p> : null}
        {error ? <p className="text-xs text-red-600" role="alert">{error}</p> : null}
        {!isLoading && !error && rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Selecciona un fragmento del documento y usa «Comentar selección» en el Agent AI. Los comentarios no modifican el texto.
          </p>
        ) : null}
        {anchored.length > 0 ? (
          <div>
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Anclados</p>
            {renderRows(anchored)}
          </div>
        ) : null}
        {unresolved.length > 0 ? (
          <div>
            <p className="mb-1.5 flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-amber-700">
              <AlertTriangle className="h-3 w-3" aria-hidden="true" />
              Sin anclar
            </p>
            {renderRows(unresolved)}
          </div>
        ) : null}
        {closed.length > 0 ? (
          <details className="pt-1">
            <summary className="cursor-pointer text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Resueltos y descartados ({closed.length})
            </summary>
            <div className="mt-1.5">{renderRows(closed)}</div>
          </details>
        ) : null}
      </div>
    </section>
  );
}
