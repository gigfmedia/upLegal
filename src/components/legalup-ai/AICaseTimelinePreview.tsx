import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { EVENT_META } from './timelineMeta';
import { useRecentAICaseTimeline } from '@/hooks/useAICaseTimeline';

type AICaseTimelinePreviewProps = {
  workspaceId: string;
  onOpen: () => void;
};

/**
 * Mini-timeline dentro de cada tarjeta de "Mis casos": muestra los 2 eventos
 * más recientes del caso (ícono + título + hace cuánto) para que el abogado
 * sepa qué pasó sin entrar al detalle.
 */
export function AICaseTimelinePreview({ workspaceId, onOpen }: AICaseTimelinePreviewProps) {
  // Query única de actividad reciente de todos los casos del abogado.
  const { data: recent = [] } = useRecentAICaseTimeline(50);

  const events = recent
    .filter((event) => event.workspace_id === workspaceId)
    .slice(0, 2);

  if (events.length === 0) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
        Sin actividad aún
      </p>
    );
  }

  return (
    <div className="mt-auto">
      <p className="mb-1.5 text-xs font-medium text-gray-500">
        Actividad reciente
      </p>
      <ul className="space-y-1.5">
        {events.map((event) => {
          const meta = EVENT_META[event.event_type];
          const Icon = meta.icon;
          return (
            <li key={event.id} className="flex items-center gap-2">
              <span
                className={cn(
                  'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
                  meta.className,
                )}
                aria-hidden="true"
              >
                <Icon className="h-3 w-3" />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm">{event.title}</span>
            </li>
          );
        })}
      </ul>
      <p className="mt-1.5 text-xs text-muted-foreground">
        {formatDistanceToNow(new Date(events[0].event_date), {
          addSuffix: true,
          locale: es,
        })}
      </p>
      <Button
        type="button"
        variant="link"
        className="mt-1 h-auto p-0 text-xs font-medium text-green-700 hover:text-green-800"
        onClick={onOpen}
      >
        Ver timeline completo
      </Button>
    </div>
  );
}