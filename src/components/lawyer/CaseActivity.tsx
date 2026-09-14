import { useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  FolderPlus,
  FileText,
  Sparkles,
  CheckCircle2,
  Calendar,
  MessageSquarePlus,
  Pencil,
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
import { TimelinePanel, type TimelinePanelItem } from '@/components/legalup-ai/TimelinePanel';
import { timelineEventTime, timelineGroupLabel } from '@/components/legalup-ai/timelineDates';
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
  const { items, loading, loadError, refetch, timelineById } = useCaseActivityItems(caseData, workspaceId, bookings);

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

  // 4.34O: canonical view reuses the shared legacy timeline grammar
  // (vertical line, nodes, cards, badges) fed by the Pro superset source.
  const groups = useMemo(() => {
    const map = new Map<string, TimelinePanelItem[]>();
    const removeNote = (activityId: string) => {
      const target = timelineById.get(activityId);
      if (!target) return;
      if (!window.confirm('¿Eliminar esta nota? Esta acción no se puede deshacer.')) return;
      setNoteError(null);
      deleteNote.mutate(target.id, {
        onError: (e) => setNoteError(e instanceof Error ? e.message : 'No se pudo eliminar la nota.'),
      });
    };
    for (const item of items) {
      const meta = TYPE_META[item.type];
      const panelItem: TimelinePanelItem = {
        id: item.id,
        icon: meta.icon,
        iconClassName: meta.className,
        title: item.title,
        badge: meta.label,
        description: item.description ?? null,
        timeText: timelineEventTime(item.occurredAt),
        onSelect: item.documentId ? onOpenDocuments : null,
        selectLabel: item.documentId ? `${item.title} — ver en Documentos` : undefined,
        actions: item.type === 'note' && editingNoteId !== item.id ? (
          <>
            <Button
              type="button" variant="ghost" size="icon" className="h-7 w-7"
              title="Editar"
              aria-label={`Editar nota: ${item.title}`}
              onClick={() => { setEditingNoteId(item.id); setEditDraft(timelineById.get(item.id)?.description ?? ''); setNoteError(null); }}
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only">Editar</span>
            </Button>
            <Button
              type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
              title="Eliminar"
              aria-label={`Eliminar nota: ${item.title}`}
              disabled={deleteNote.isPending}
              onClick={() => removeNote(item.id)}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only">Eliminar</span>
            </Button>
          </>
        ) : null,
      };
      const key = timelineGroupLabel(item.occurredAt);
      const list = map.get(key);
      if (list) list.push(panelItem);
      else map.set(key, [panelItem]);
    }
    return Array.from(map.entries(), ([key, items]) => ({ key, items }));
  }, [items, editingNoteId, timelineById, deleteNote, onOpenDocuments, setNoteError]);

  return (
    <div className="space-y-4">
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
      {editingNoteId && (
        <Card>
          <CardContent className="space-y-2 p-3">
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
              <Button type="button" size="sm" onClick={() => handleUpdateNote(editingNoteId)} disabled={updateNote.isPending || !editDraft.trim()}>
                Guardar
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => { setEditingNoteId(null); setNoteError(null); }}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      <TimelinePanel
        groups={groups}
        loading={loading && items.length <= 1}
        error={loadError ? 'No se pudo cargar la actividad del caso.' : null}
        onRetry={() => refetch()}
        showAdd={!!workspaceId}
        onAdd={() => { setShowNoteForm(true); setNoteError(null); }}
      />
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
                      <span className="block text-xs text-gray-400">{meta.label} · {relativeTime(item.occurredAt)}</span>
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
