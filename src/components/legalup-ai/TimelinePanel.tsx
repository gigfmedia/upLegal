import type { ReactNode } from 'react';
import { CalendarClock, Clock, FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export type TimelinePanelItem = {
  id: string;
  /** Icon component rendered inside the timeline node. */
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
  iconClassName: string;
  title: ReactNode;
  badge?: string | null;
  description?: string | null;
  documentName?: string | null;
  /** Pre-formatted timestamp, e.g. "30 ago, 13:15". */
  timeText?: string | null;
  author?: string | null;
  /** Note-only actions (edit/delete). Automated events pass none. */
  actions?: ReactNode;
  /** Makes the whole card a button (e.g. document navigation). */
  onSelect?: (() => void) | null;
  selectLabel?: string;
};

export type TimelinePanelProps = {
  groups: Array<{ key: string; items: TimelinePanelItem[] }>;
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
  showAdd: boolean;
  onAdd: () => void;
};

/**
 * 4.34O — shared timeline presentation (legacy visual grammar).
 * Pure presentational: no data fetching, no provider calls. Fed by legacy AI
 * timeline events or canonical Pro activity items (superset).
 */
export function TimelinePanel({ groups, loading, error, onRetry, showAdd, onAdd }: TimelinePanelProps) {
  const isEmpty = !loading && !error && groups.every((g) => g.items.length === 0);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="font-semibold tracking-tight flex items-center gap-2 text-base">
            <CalendarClock className="h-4 w-4 text-green-700" aria-hidden="true" />
            Timeline del caso
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Actividad y actualizaciones del caso en orden cronológico.
          </p>
        </div>
        {showAdd && (
          <Button type="button" onClick={onAdd}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Agregar actualización
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
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
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
            {onRetry && (
              <Button type="button" variant="outline" onClick={onRetry}>
                Reintentar
              </Button>
            )}
          </div>
        ) : isEmpty ? (
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
            {showAdd && (
              <Button type="button" onClick={onAdd}>
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                Agregar actualización
              </Button>
            )}
          </div>
        ) : (
          <ol className="space-y-6">
            {groups.map((group) => (
              <li key={group.key}>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.key}
                </p>
                <ul className="space-y-3 border-l-2 border-gray-100 pl-4">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const card = (
                      <>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium">{item.title}</span>
                              {item.badge && (
                                <Badge variant="outline" className="text-[10px]">
                                  {item.badge}
                                </Badge>
                              )}
                            </div>
                            {item.description && (
                              <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                                {item.description}
                              </p>
                            )}
                            {item.documentName && (
                              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                                <FileText className="h-3 w-3" aria-hidden="true" />
                                <span className="truncate">{item.documentName}</span>
                              </p>
                            )}
                            {item.timeText && (
                              <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <span>{item.timeText}</span>
                                {item.author && <span>· {item.author}</span>}
                              </p>
                            )}
                          </div>
                          {item.actions && (
                            <div
                              className="flex shrink-0 gap-1"
                              role="group"
                              aria-label="Acciones de la actualización"
                            >
                              {item.actions}
                            </div>
                          )}
                        </div>
                      </>
                    );
                    return (
                      <li key={item.id} className="relative">
                        <span
                          className={cn(
                            'absolute -left-[27px] top-2 inline-flex h-5 w-5 items-center justify-center rounded-full ring-4 ring-white',
                            item.iconClassName,
                          )}
                          aria-hidden="true"
                        >
                          <Icon className="h-3 w-3" />
                        </span>
                        <div className="rounded-lg border bg-white p-3">
                          {item.onSelect ? (
                            <button
                              type="button"
                              onClick={item.onSelect}
                              className="block w-full text-left"
                              aria-label={item.selectLabel ?? (typeof item.title === 'string' ? item.title : undefined)}
                            >
                              {card}
                            </button>
                          ) : (
                            card
                          )}
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
    </Card>
  );
}
