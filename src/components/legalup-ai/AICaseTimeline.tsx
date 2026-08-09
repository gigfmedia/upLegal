import { useEffect, useMemo, useRef, useState } from 'react';
import posthog from 'posthog-js';
import {
  AlertTriangle,
  CalendarClock,
  Clock,
  FileText,
  Loader2,
  MessageSquarePlus,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
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

function formatEventDate(iso: string): string {
  const date = parseISO(iso);
  return format(date, 'd MMM, HH:mm', { locale: es });
}

function groupKey(iso: string): string {
  const date = parseISO(iso);
  if (isToday(date)) return 'Hoy';
  if (isYesterday(date)) return 'Ayer';
  return format(date, 'd MMMM yyyy', { locale: es });
}

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
    const map = new Map<string, AITimelineEvent[]>();
    for (const event of events) {
      const key = groupKey(event.event_date);
      const list = map.get(key);
      if (list) list.push(event);
      else map.set(key, [event]);
    }
    return Array.from(map.entries());
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
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          
          <CardTitle className="font-semibold tracking-tight flex items-center gap-2 text-base">
            <CalendarClock className="h-4 w-4 text-green-700" aria-hidden="true" />
            Timeline del caso</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Actividad y actualizaciones del caso en orden cronológico.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => {
            setEditingNote(null);
            setNoteDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Agregar actualización
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4" aria-label="Cargando timeline">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No se pudo cargar el timeline del caso.
            </p>
            <Button type="button" variant="outline" onClick={() => refetch()}>
              Reintentar
            </Button>
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-4 py-10 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <Clock className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
            </div>
            <div>
              <p className="font-medium">Aún no hay actividad en este caso</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                Los documentos, análisis y actualizaciones que agregues aparecerán aquí en
                orden cronológico.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => {
                setEditingNote(null);
                setNoteDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Agregar actualización
            </Button>
          </div>
        ) : (
          <ol className="space-y-6">
            {groups.map(([day, dayEvents]) => (
              <li key={day}>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {day}
                </p>
                <ul className="space-y-3 border-l-2 border-gray-100 pl-4">
                  {dayEvents.map((event) => {
                    const meta = EVENT_META[event.event_type];
                    const Icon = meta.icon;
                    const documentName =
                      (event.metadata as { document_name?: string } | null)?.document_name;
                    const author = (event.metadata as { author?: string } | null)?.author;
                    const isNote = event.event_type === 'note';
                    return (
                      <li key={event.id} className="relative">
                        <span
                          className={cn(
                            'absolute -left-[27px] top-2 inline-flex h-5 w-5 items-center justify-center rounded-full ring-4 ring-white',
                            meta.className,
                          )}
                          aria-hidden="true"
                        >
                          <Icon className="h-3 w-3" />
                        </span>
                        <div className="rounded-lg border bg-white p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-medium">{event.title}</span>
                                <Badge variant="outline" className="text-[10px]">
                                  {meta.label}
                                </Badge>
                              </div>
                              {event.description && (
                                <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                                  {event.description}
                                </p>
                              )}
                              {documentName && (
                                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                                  <FileText className="h-3 w-3" aria-hidden="true" />
                                  <span className="truncate">{documentName}</span>
                                </p>
                              )}
                              <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <span>{formatEventDate(event.event_date)}</span>
                                {author && <span>· {author}</span>}
                              </p>
                            </div>
                            {isNote && (
                              <div
                                className="flex shrink-0 gap-1"
                                role="group"
                                aria-label={`Acciones de la actualización`}
                              >
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
                              </div>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ol>
        )}
      </CardContent>

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
    </Card>
  );
}

export default AICaseTimeline;
