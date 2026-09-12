import { useMemo } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  FolderPlus,
  FileText,
  Sparkles,
  CheckCircle2,
  Calendar,
  MessageSquarePlus,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAIDocuments } from '@/hooks/useAIDocuments';
import { useAICaseWorkflow } from '@/hooks/useAICaseWorkflow';
import { useAICaseTimeline } from '@/hooks/useAICaseTimeline';
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
      <div>
        <h2 className="text-base font-semibold text-gray-900">Actividad del caso</h2>
        <p className="text-sm text-muted-foreground">Revisa los movimientos recientes asociados a este caso.</p>
      </div>
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
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
