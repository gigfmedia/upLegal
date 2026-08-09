import {
  AlertTriangle,
  CalendarClock,
  FileText,
  FolderPlus,
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
};