import { useEffect, useMemo, useRef, useState } from 'react';
import posthog from 'posthog-js';
import {
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';
import { TimelinePanel, type TimelinePanelItem } from './TimelinePanel';
import { timelineEventTime, timelineGroupLabel } from './timelineDates';
import { EVENT_META } from './timelineMeta';
import {
  useAICaseTimeline,
  useCreateAITimelineNote,
  useUpdateAITimelineNote,
  useDeleteAITimelineNote,
  type AITimelineEvent,
} from '@/hooks/useAICaseTimeline';

type AICaseTimelineProps = {
  workspaceId: string;
};

function NoteDialog({
  open,
  onOpenChange,
  initial,
  onSave,
  isSaving,
  mode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: string;
  onSave: (content: string) => void;
  isSaving: boolean;
  mode: 'create' | 'edit';
}) {
  const [content, setContent] = useState(initial ?? '');

  useEffect(() => {
    if (open) setContent(initial ?? '');
  }, [open, initial]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Nueva actualización' : 'Editar actualización'}
          </DialogTitle>
          <DialogDescription>
            Registra un avance, decisión o detalle relevante en el timeline del caso.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Ej.: Se presentó la demanda ante el juzgado correspondiente…"
          rows={5}
          maxLength={1000}
          aria-label="Contenido de la actualización"
        />
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button
            onClick={() => onSave(content)}
            disabled={isSaving || content.trim().length === 0}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Guardando…
              </>
            ) : mode === 'create' ? (
              'Agregar actualización'
            ) : (
              'Guardar cambios'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AICaseTimeline({ workspaceId }: AICaseTimelineProps) {
  const { data: events = [], isLoading, isError, refetch } = useAICaseTimeline(workspaceId);
  const createMutation = useCreateAITimelineNote(workspaceId);
  const updateMutation = useUpdateAITimelineNote();
  const deleteMutation = useDeleteAITimelineNote();

  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<AITimelineEvent | null>(null);
  const [deletingNote, setDeletingNote] = useState<AITimelineEvent | null>(null);

  const trackedView = useRef(false);
  useEffect(() => {
    if (!trackedView.current && !isLoading && !isError) {
      trackedView.current = true;
      posthog.capture('ai_case_timeline_viewed', { source: 'ai_case' });
    }
  }, [isLoading, isError]);

  const groups = useMemo(() => {
    const map = new Map<string, TimelinePanelItem[]>();
    for (const event of events) {
      const meta = EVENT_META[event.event_type];
      const isNote = event.event_type === 'note';
      const item: TimelinePanelItem = {
        id: event.id,
        icon: meta.icon,
        iconClassName: meta.className,
        title: event.title,
        badge: meta.label,
        description: event.description ?? null,
        documentName:
          (event.metadata as { document_name?: string } | null)?.document_name ?? null,
        timeText: timelineEventTime(event.event_date),
        author: (event.metadata as { author?: string } | null)?.author ?? null,
        actions: isNote ? (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="Editar"
              onClick={() => {
                setEditingNote(event);
                setNoteDialogOpen(true);
              }}
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only">Editar</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              title="Eliminar"
              onClick={() => setDeletingNote(event)}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only">Eliminar</span>
            </Button>
          </>
        ) : null,
      };
      const key = timelineGroupLabel(event.event_date);
      const list = map.get(key);
      if (list) list.push(item);
      else map.set(key, [item]);
    }
    return Array.from(map.entries(), ([key, items]) => ({ key, items }));
  }, [events]);

  const handleSaveNote = (content: string) => {
    if (editingNote) {
      updateMutation.mutate(
        { id: editingNote.id, description: content },
        {
          onSuccess: () => {
            toast.success('Actualización editada');
            setEditingNote(null);
          },
          onError: (error) =>
            toast.error(error.message || 'No se pudo editar la actualización.'),
        },
      );
    } else {
      createMutation.mutate(content, {
        onSuccess: () => {
          toast.success('Actualización agregada al timeline');
          setNoteDialogOpen(false);
        },
        onError: (error) => toast.error(error.message || 'No se pudo agregar la actualización.'),
      });
    }
  };

  const handleDeleteNote = () => {
    if (!deletingNote) return;
    deleteMutation.mutate(deletingNote.id, {
      onSuccess: () => {
        toast.success('Actualización eliminada');
        setDeletingNote(null);
      },
      onError: (error) => toast.error(error.message || 'No se pudo eliminar la actualización.'),
    });
  };

  const isDeleting = deleteMutation.isPending;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <TimelinePanel
        groups={groups}
        loading={isLoading}
        error={isError ? 'No se pudo cargar el timeline del caso.' : null}
        onRetry={() => refetch()}
        showAdd
        onAdd={() => {
          setEditingNote(null);
          setNoteDialogOpen(true);
        }}
      />

      <NoteDialog
        open={noteDialogOpen}
        onOpenChange={(open) => {
          setNoteDialogOpen(open);
          if (!open) setEditingNote(null);
        }}
        initial={editingNote?.description}
        onSave={handleSaveNote}
        isSaving={isSaving}
        mode={editingNote ? 'edit' : 'create'}
      />

      <ConfirmDialog
        open={deletingNote !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingNote(null);
        }}
        onConfirm={handleDeleteNote}
        title="¿Eliminar actualización?"
        description="Esta actualización se eliminará del timeline del caso. Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        isDeleting={isDeleting}
      />
    </>
  );
}

export default AICaseTimeline;
