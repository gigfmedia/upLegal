import { useState } from 'react';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  FolderPlus,
  FileText,
  Sparkles,
  CheckCircle2,
  Calendar,
  MessageSquarePlus,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  useCaseActivityItems,
  type CaseActivityItemType,
  type CaseBookingLike,
  type LawyerCase,
} from '@/hooks/useCaseActivityItems';
import {
  useCreateAITimelineNote,
  useUpdateAITimelineNote,
  useDeleteAITimelineNote,
} from '@/hooks/useAICaseTimeline';

type Props = {
  caseData: LawyerCase;
  workspaceId: string | null;
  bookings: CaseBookingLike[];
  onOpenDocuments: () => void;
};

const TYPE_META: Record<CaseActivityItemType, { label: string; icon: typeof FolderPlus; className: string }> = {
  case_created: { label: 'Caso', icon: FolderPlus, className: 'bg-green-100 text-green-700' },
  document_uploaded: { label: 'Documento', icon: FileText, className: 'bg-blue-100 text-blue-700' },
  document_analyzed: { label: 'Análisis', icon: Sparkles, className: 'bg-purple-100 text-purple-700' },
  workflow_completed: { label: 'Acción', icon: CheckCircle2, className: 'bg-emerald-100 text-emerald-700' },
  appointment: { label: 'Cita', icon: Calendar, className: 'bg-amber-100 text-amber-700' },
  note: { label: 'Nota', icon: MessageSquarePlus, className: 'bg-gray-100 text-gray-700' },
};

function groupLabel(iso: string): string {
  const d = new Date(iso);
  if (isToday(d)) return 'Hoy';
  if (isYesterday(d)) return 'Ayer';
  return format(d, "d 'de' MMM yyyy", { locale: es });
}

/**
 * 4.30F — Operational activity feed, frontend aggregation only.
 *
 * Authority per event type (dedup strategy):
 * - case_created: lawyer_cases.created_at (timeline case_created ignored)
 * - document_uploaded: ai_documents.created_at (timeline document_uploaded ignored)
 * - document_analyzed: ai_documents updated_at when analysis_status === 'ready'
 *   (current-only; reanalysis overwrites, never claimed as full history)
 * - workflow_completed: ai_case_workflow_items.completed_at only
 * - appointment: bookings.case_id + scheduled_date
 * - note: ai_case_timeline_events event_type === 'note' (only timeline contribution)
 *
 * Read-only: opening Activity performs 0 provider calls and 0 DB writes.
 * No AI entitlement required; works without workspace (case + bookings).
 */
export function CaseActivity({ caseData, workspaceId, bookings, onOpenDocuments }: Props) {
  const { items, loading, timelineById } = useCaseActivityItems(caseData, workspaceId, bookings);

  // 4.34J: note CRUD parity with legacy Timeline, reusing the same
  // ai_case_timeline_events model/hooks (RLS owner-scoped, 0 provider calls).
  const createNote = useCreateAITimelineNote(workspaceId || undefined);
  const updateNote = useUpdateAITimelineNote();
  const deleteNote = useDeleteAITimelineNote();
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [noteError, setNoteError] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');

  const handleCreateNote = () => {
    setNoteError(null);
    createNote.mutate(noteDraft, {
      onSuccess: () => { setNoteDraft(''); setShowNoteForm(false); },
      onError: (e) => setNoteError(e instanceof Error ? e.message : 'No se pudo guardar la nota.'),
    });
  };
  const handleUpdateNote = (activityId: string) => {
    const target = timelineById.get(activityId);
    if (!target) return;
    setNoteError(null);
    updateNote.mutate({ id: target.id, description: editDraft }, {
      onSuccess: () => setEditingNoteId(null),
      onError: (e) => setNoteError(e instanceof Error ? e.message : 'No se pudo actualizar la nota.'),
    });
  };
  const handleDeleteNote = (activityId: string) => {
    const target = timelineById.get(activityId);
    if (!target) return;
    if (!window.confirm('¿Eliminar esta nota? Esta acción no se puede deshacer.')) return;
    setNoteError(null);
    deleteNote.mutate(target.id, {
      onError: (e) => setNoteError(e instanceof Error ? e.message : 'No se pudo eliminar la nota.'),
    });
  };

  if (loading && items.length <= 1) {
    return (
      <div className="space-y-2" aria-label="Cargando actividad">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Los movimientos del caso aparecerán aquí.
        </CardContent>
      </Card>
    );
  }

  let lastGroup: string | null = null;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Timeline del caso</h2>
          <p className="text-sm text-muted-foreground">Actividad y actualizaciones del caso en orden cronológico.</p>
        </div>
        {workspaceId && !showNoteForm && (
          <Button type="button" variant="outline" size="sm" onClick={() => { setShowNoteForm(true); setNoteError(null); }}>
            <Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> Añadir nota
          </Button>
        )}
      </div>
      {showNoteForm && (
        <Card>
          <CardContent className="space-y-2 p-3">
            <Textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="Escribe una actualización del caso…"
              aria-label="Contenido de la nota"
              rows={3}
              className="resize-none"
              disabled={createNote.isPending}
            />
            {noteError && <p role="alert" className="text-xs text-destructive">{noteError}</p>}
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={handleCreateNote} disabled={createNote.isPending || !noteDraft.trim()}>
                Guardar nota
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => { setShowNoteForm(false); setNoteDraft(''); setNoteError(null); }}>
                <X className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      <ol className="space-y-2">
        {items.map((item) => {
          const group = groupLabel(item.occurredAt);
          const showGroup = group !== lastGroup;
          lastGroup = group;
          const meta = TYPE_META[item.type];
          const Icon = meta.icon;
          const clickable = !!item.documentId;
          const body = (
            <>
              <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${meta.className}`}>
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-gray-900">{item.title}</span>
                {item.description ? (
                  <span className="block truncate text-xs text-muted-foreground">{item.description}</span>
                ) : null}
                <span className="block text-xs text-gray-400">
                  {format(new Date(item.occurredAt), 'HH:mm', { locale: es })}
                </span>
              </span>
            </>
          );
          return (
            <li key={item.id}>
              {showGroup ? (
                <p className="mb-1 mt-3 text-xs font-semibold uppercase tracking-wider text-gray-400 first:mt-0">
                  {group}
                </p>
              ) : null}
              <Card>
                <CardContent className="p-3">
                  {clickable ? (
                    <button
                      type="button"
                      onClick={onOpenDocuments}
                      className="flex w-full items-center gap-3 text-left"
                      aria-label={`${item.title} — ver en Documentos`}
                    >
                      {body}
                    </button>
                  ) : (
                    <div className="flex items-center gap-3">{body}</div>
                  )}
                  {item.type === 'note' && editingNoteId !== item.id && (
                    <div className="mt-2 flex gap-1 pl-12">
                      <Button
                        type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs"
                        aria-label={`Editar nota: ${item.title}`}
                        onClick={() => { setEditingNoteId(item.id); setEditDraft(timelineById.get(item.id)?.description ?? ''); setNoteError(null); }}
                      >
                        <Pencil className="mr-1 h-3 w-3" aria-hidden="true" /> Editar
                      </Button>
                      <Button
                        type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                        aria-label={`Eliminar nota: ${item.title}`}
                        disabled={deleteNote.isPending}
                        onClick={() => handleDeleteNote(item.id)}
                      >
                        <Trash2 className="mr-1 h-3 w-3" aria-hidden="true" /> Eliminar
                      </Button>
                    </div>
                  )}
                  {item.type === 'note' && editingNoteId === item.id && (
                    <div className="mt-2 space-y-2 pl-12">
                      <Textarea
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        aria-label="Editar contenido de la nota"
                        rows={3}
                        className="resize-none"
                        disabled={updateNote.isPending}
                      />
                      {noteError && <p role="alert" className="text-xs text-destructive">{noteError}</p>}
                      <div className="flex gap-2">
                        <Button type="button" size="sm" onClick={() => handleUpdateNote(item.id)} disabled={updateNote.isPending || !editDraft.trim()}>
                          Guardar
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => { setEditingNoteId(null); setNoteError(null); }}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function relativeTime(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { locale: es, addSuffix: true });
  } catch {
    return '';
  }
}

/**
 * 4.34N — Actividad reciente para Resumen. Reutiliza la misma fuente
 * (useCaseActivityItems): máximo 3 eventos, sin controles de edición
 * (las notas se editan en la vista completa), 0 provider calls.
 */
export function CaseActivityPreview({
  caseData,
  workspaceId,
  bookings,
  onOpenTimeline,
}: Props & { onOpenTimeline: () => void }) {
  const { items, loading } = useCaseActivityItems(caseData, workspaceId, bookings);
  const latest = items.slice(0, 3);

  return (
    <section aria-label="Actividad reciente">
      <h3 className="mb-2 text-sm font-semibold text-gray-900">Actividad reciente</h3>
      {loading && latest.length === 0 ? (
        <Skeleton className="h-12 w-full" />
      ) : latest.length === 0 ? null : (
        <ul className="space-y-2">
          {latest.map((item) => {
            const meta = TYPE_META[item.type];
            const Icon = meta.icon;
            return (
              <li key={item.id}>
                <Card>
                  <CardContent className="flex items-center gap-3 p-3">
                    <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${meta.className}`}>
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-gray-900">{item.title}</span>
                      <span className="block text-xs text-gray-400">{relativeTime(item.occurredAt)}</span>
                    </span>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
      <Button type="button" variant="outline" size="sm" className="mt-2" onClick={onOpenTimeline}>
        Ver timeline completo
      </Button>
    </section>
  );
}
