import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Archive, CalendarDays, Clock, FolderOpen, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { AICaseTimelinePreview } from '@/components/legalup-ai/AICaseTimelinePreview';
import { CaseCreatedPreview } from '@/components/legalup-ai/CaseCreatedPreview';

function formatDate(value: string): string {
  try {
    return format(parseISO(value), "d 'de' MMMM yyyy", { locale: es });
  } catch {
    return value;
  }
}

export type SharedCaseCardProps = {
  title: string;
  practiceArea?: string | null;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  /** Workspace for the AI activity preview. Null/undefined falls back to the zero-query created-event preview. */
  workspaceId?: string | null;
  /** Optional discreet status slot (Pro only; legacy omits it). */
  statusBadge?: ReactNode;
  onOpen: () => void;
  onTimeline: () => void;
  onEdit: () => void;
  /**
   * 4.36D — exceptional delete only. Optional: Pro case cards no longer pass
   * it (close/reopen below is the normal lifecycle); legacy AI history keeps
   * its workspace delete. When omitted, no destructive icon renders.
   */
  onDelete?: () => void;
  /**
   * 4.36D — normal lifecycle actions (Pro cards). Presence drives rendering:
   * pass onCloseCase for active cases, onReopenCase for historical ones.
   * Surfaces that pass neither (legacy) render no lifecycle row.
   */
  onCloseCase?: () => void;
  onReopenCase?: () => void;
};

/**
 * 4.34R — shared case card (legacy AI visual grammar).
 * Presentation shared by legacy AI history and canonical Pro cases.
 * Data/action adapters differ per surface; activity preview reuses the
 * single-query AICaseTimelinePreview when a workspace exists, and the
 * zero-query CaseCreatedPreview otherwise (no N+1, works pre-provisioning).
 */
export function SharedCaseCard({
  title,
  practiceArea,
  description,
  createdAt,
  updatedAt,
  workspaceId,
  statusBadge,
  onOpen,
  onTimeline,
  onEdit,
  onDelete,
  onCloseCase,
  onReopenCase,
}: SharedCaseCardProps) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="flex h-full flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-gray-900">
              {title}
            </h3>
            {practiceArea ? (
              <Badge
                variant="secondary"
                className="mt-1 bg-green-50 text-green-800"
              >
                {practiceArea}
              </Badge>
            ) : (
              <span className="mt-1 block text-xs text-muted-foreground">
                Sin área jurídica
              </span>
            )}
            {statusBadge ? <div className="mt-1.5">{statusBadge}</div> : null}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onEdit}
              className="rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
              aria-label={`Editar caso ${title}`}
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </button>
            {onDelete ? (
              <button
                type="button"
                onClick={onDelete}
                className="rounded-md p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                aria-label={`Eliminar caso ${title}`}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>
        </div>

        {description ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            Creado: {formatDate(createdAt)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            Actualizado: {formatDate(updatedAt)}
          </span>
        </div>

        {workspaceId ? (
          <AICaseTimelinePreview
            workspaceId={workspaceId}
            onOpen={onTimeline}
            fallbackCreatedAt={createdAt}
          />
        ) : (
          <CaseCreatedPreview createdAt={createdAt} onOpen={onTimeline} />
        )}

        {onCloseCase || onReopenCase ? (
          <div className="flex items-center gap-3">
            {onCloseCase ? (
              <button
                type="button"
                onClick={onCloseCase}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 underline-offset-2 hover:text-green-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded"
              >
                <Archive className="h-3.5 w-3.5" aria-hidden="true" />
                Cerrar caso
              </button>
            ) : null}
            {onReopenCase ? (
              <button
                type="button"
                onClick={onReopenCase}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 underline-offset-2 hover:text-green-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Reabrir caso
              </button>
            ) : null}
          </div>
        ) : null}

        <Button
          type="button"
          variant="outline"
          onClick={onOpen}
          className="mt-1 w-full border-gray-900 text-green-900 bg-green-300 hover:bg-green-400 hover:text-green-900"
        >
          <FolderOpen className="h-4 w-4" aria-hidden="true" />
          Abrir caso
        </Button>
      </CardContent>
    </Card>
  );
}
