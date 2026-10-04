import {
  AlertTriangle,
  Archive,
  CalendarClock,
  CheckCircle2,
  FileText,
  FolderPlus,
  ListChecks,
  MessageSquarePlus,
  Sparkles,
} from 'lucide-react';
import type { AITimelineEvent } from '@/hooks/useAICaseTimeline';

export const EVENT_META: Record<
  AITimelineEvent['event_type'],
  { label: string; icon: typeof FolderPlus; className: string }
> = {
  case_created: {
    label: 'Caso creado',
    icon: FolderPlus,
    className: 'bg-green-100 text-green-700',
  },
  document_uploaded: {
    label: 'Documento',
    icon: FileText,
    className: 'bg-blue-100 text-blue-700',
  },
  document_analyzed: {
    label: 'Análisis',
    icon: Sparkles,
    className: 'bg-purple-100 text-purple-700',
  },
  risk_identified: {
    label: 'Riesgo',
    icon: AlertTriangle,
    className: 'bg-red-100 text-red-700',
  },
  deadline_detected: {
    label: 'Vencimiento',
    icon: CalendarClock,
    className: 'bg-amber-100 text-amber-700',
  },
  note: {
    label: 'Nota',
    icon: MessageSquarePlus,
    className: 'bg-gray-100 text-gray-700',
  },
  // FASE 4.60C — eventos operativos del sistema (solo lectura en UI).
  task_completed: {
    label: 'Pendiente completado',
    icon: CheckCircle2,
    className: 'bg-green-100 text-green-700',
  },
  next_action_completed: {
    label: 'Próxima gestión completada',
    icon: ListChecks,
    className: 'bg-emerald-100 text-emerald-700',
  },
  case_closed: {
    label: 'Caso cerrado',
    icon: Archive,
    className: 'bg-slate-200 text-slate-700',
  },
};

/** Fallback neutro: un tipo desconocido jamás debe romper el Timeline. */
export const UNKNOWN_EVENT_META = {
  label: 'Evento',
  icon: FileText,
  className: 'bg-gray-100 text-gray-700',
};