import { useMemo, useState } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
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
import { useAIDocuments } from '@/hooks/useAIDocuments';
import { useAICaseWorkflow } from '@/hooks/useAICaseWorkflow';
import {
  useAICaseTimeline,
  useCreateAITimelineNote,
  useUpdateAITimelineNote,
  useDeleteAITimelineNote,
} from '@/hooks/useAICaseTimeline';
import type { LawyerCase } from '@/hooks/useLawyerCases';

export type CaseActivityItemType =
  | 'case_created'
  | 'document_uploaded'
  | 'document_analyzed'
  | 'workflow_completed'
  | 'appointment'
  | 'note';

/** Presentation-only model. No DB table, no migration. */
export type CaseActivityItem = {
  id: string;
  type: CaseActivityItemType;
  title: string;
  description?: string | null;
  occurredAt: string;
  documentId?: string;
};

export type CaseBookingLike = {
  id: string;
  service_title?: string | null;
  scheduled_date?: string | null;
  scheduled_time?: string | null;
  status?: string | null;
  created_at?: string | null;
};

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
  const documentsQuery = useAIDocuments(workspaceId || undefined);
  const workflowQuery = useAICaseWorkflow(workspaceId || undefined);
  const timelineQuery = useAICaseTimeline(workspaceId || undefined);

  const items = useMemo<CaseActivityItem[]>(() => {
    const list: CaseActivityItem[] = [];

    list.push({
      id: `case-${caseData.id}`,
      type: 'case_created',
      title: 'Caso creado',
      occurredAt: caseData.created_at,
    });

    for (const doc of documentsQuery.data ?? []) {
      list.push({
        id: `doc-${doc.id}`,
        type: 'document_uploaded',
        title: `${doc.original_filename} agregado`,
        occurredAt: doc.created_at,
        documentId: doc.id,
      });
      if (doc.analysis_status === 'ready') {
        list.push({
          id: `analysis-${doc.id}`,
          type: 'document_analyzed',
          title: `${doc.original_filename} analizado`,
          occurredAt: doc.updated_at,
          documentId: doc.id,
        });
      }
    }

    for (const item of workflowQuery.data?.items ?? []) {
      if (item.status === 'completed' && item.completed_at) {
        list.push({
          id: `workflow-${item.id}`,
          type: 'workflow_completed',
          title: 'Acción completada',
          description: item.title,
          occurredAt: item.completed_at,
        });
      }
    }

    for (const b of bookings ?? []) {
      const when = b.scheduled_date || b.created_at;
      if (!when) continue;
      list.push({
        id: `booking-${b.id}`,
        type: 'appointment',
        title: 'Cita agendada',
        description: b.service_title || null,
        occurredAt: b.scheduled_time ? `${when.slice(0, 10)}T${b.scheduled_time}` : when,
      });
    }

    for (const e of timelineQuery.data ?? []) {
      if (e.event_type !== 'note') continue;
      list.push({
        id: `note-${e.id}`,
        type: 'note',
        title: e.title,
        description: e.description,
        occurredAt: e.event_date,
      });
    }

    list.sort((a, b) => {
      const diff = Date.parse(b.occurredAt) - Date.parse(a.occurredAt);
      if (diff !== 0) return diff;
      return a.id.localeCompare(b.id);
    });
    return list;
  }, [caseData, documentsQuery.data, workflowQuery.data, timelineQuery.data, bookings]);

  const loading = documentsQuery.isLoading || workflowQuery.isLoading || timelineQuery.isLoading;

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
  const timelineById = useMemo(() => {
    const map = new Map<string, { id: string; description: string | null }>();
    for (const e of timelineQuery.data ?? []) map.set(`note-${e.id}`, { id: e.id, description: e.description });
    return map;
  }, [timelineQuery.data]);

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
          <h2 className="text-base font-semibold text-gray-900">Actividad del caso</h2>
          <p className="text-sm text-muted-foreground">Revisa los movimientos recientes asociados a este caso.</p>
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
