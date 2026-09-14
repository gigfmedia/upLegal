import { useMemo } from 'react';
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
/** Items de actividad del caso (fuente única para vista completa y preview). */
export function useCaseActivityItems(
  caseData: LawyerCase,
  workspaceId: string | null,
  bookings: CaseBookingLike[] | undefined,
) {
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

  return {
    items,
    loading: documentsQuery.isLoading || workflowQuery.isLoading || timelineQuery.isLoading,
    timelineById: (() => {
      const map = new Map<string, { id: string; description: string | null }>();
      for (const e of timelineQuery.data ?? []) map.set(`note-${e.id}`, { id: e.id, description: e.description });
      return map;
    })(),
  };
}
