import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ListTodo,
  Plus,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { LawyerCase } from '@/hooks/useLawyerCases';
import type { CaseTask } from '@/hooks/useCaseTasks';
import {
  buildActionCenter,
  formatActionDate,
  formatStaleLabel,
  type ActionItem,
} from '@/lib/actionCenter';

type Props = {
  cases: LawyerCase[];
  tasks: CaseTask[];
  loading: boolean;
  onOpenCase: (caseId: string) => void;
  onCompleteTask: (taskId: string) => Promise<unknown>;
  /** Solo tests: fija "hoy". Producción usa Date.now(). */
  nowMs?: number;
};

const VISIBLE_LIMIT = 4;

function ItemRow({
  item,
  onOpenCase,
  onCompleteTask,
}: {
  item: ActionItem;
  onOpenCase: (caseId: string) => void;
  onCompleteTask: (taskId: string) => Promise<unknown>;
}) {
  const [busy, setBusy] = useState(false);
  const complete = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onCompleteTask((item as { taskId: string }).taskId);
    } finally {
      setBusy(false);
    }
  };
  const overdue = /Venció/.test(formatActionDate(item.dueAt));
  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        onClick={() => onOpenCase(item.caseId)}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenCase(item.caseId); }
        }}
        className="flex w-full cursor-pointer items-start gap-3 rounded-xl bg-white/80 px-3 py-2.5 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
      >
        {item.kind === 'task' ? (
          <span className="mt-0.5 shrink-0">
            <Checkbox
              checked={false}
              disabled={busy}
              onCheckedChange={() => void complete()}
              onClick={(e) => e.stopPropagation()}
              aria-label={`Completar ${item.title}`}
            />
          </span>
        ) : null}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-xs font-medium text-gray-500">{item.caseTitle}</span>
            <span className="shrink-0 rounded-full bg-gray-100 px-1.5 py-px text-[10px] font-medium text-gray-500">
              {item.kind === 'task' ? 'Pendiente' : 'Próxima gestión'}
            </span>
          </span>
          <span className="mt-0.5 block truncate text-sm font-medium text-gray-900">{item.title}</span>
          <span className={cn('mt-0.5 block text-xs', overdue ? 'font-semibold text-red-600' : 'text-gray-400')}>
            {formatActionDate(item.dueAt)}
          </span>
        </span>
      </div>
    </li>
  );
}

function SectionCard({
  title,
  microcopy,
  icon,
  count,
  tone,
  empty,
  emptyIcon,
  items,
  renderItem,
}: {
  title: string;
  microcopy: string;
  icon: React.ReactNode;
  count: number;
  tone: string;
  empty: string;
  emptyIcon: React.ReactNode;
  items: { key: string }[];
  renderItem: (key: string) => React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, VISIBLE_LIMIT);
  return (
    <div className={cn('flex flex-col rounded-lg border p-5 shadow-sm transition-shadow hover:shadow', tone)}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex min-w-0 items-center gap-2 text-sm font-semibold text-gray-900">
          {icon}
          <span className="truncate">{title}</span>
        </h3>
        <Badge className="shrink-0 rounded-full bg-white/90 px-2.5 py-0.5 text-sm font-bold text-gray-900 shadow-sm">
          {count}
        </Badge>
      </div>
      <p className="mt-0.5 text-xs text-gray-500">{microcopy}</p>
      {count === 0 ? (
        <div className="mt-3 flex flex-1 items-center gap-2 rounded-xl bg-white/60 px-3 py-3 text-sm text-gray-500">
          {emptyIcon}
          <span>{empty}</span>
        </div>
      ) : (
        <>
          <ul className="mt-3 space-y-2">{visible.map((i) => renderItem(i.key))}</ul>
          {items.length > VISIBLE_LIMIT && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-2 inline-flex items-center gap-1 self-start rounded-md px-1 py-1 text-xs font-medium text-gray-600 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            >
              {expanded ? (
                <>Ver menos <ChevronDown className="h-3.5 w-3.5 rotate-180" aria-hidden="true" /></>
              ) : (
                <>Ver todo ({items.length}) <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" /></>
              )}
            </button>
          )}
        </>
      )}
    </div>
  );
}

/**
 * FASE 5.2B — mismo Action Center 5.2 (lógica intacta), presentación de
 * centro de acción moderno: contenedor blanco + 4 cards semánticas.
 */
export function ActionCenter({ cases, tasks, loading, onOpenCase, onCompleteTask, nowMs }: Props) {
  const data = useMemo(() => buildActionCenter(cases, tasks, nowMs ?? Date.now()), [cases, tasks, nowMs]);
  const [showAllIdle, setShowAllIdle] = useState(false);
  // Skeleton solo en la primera carga: en refetch (ej: al cerrar el drawer)
  // se conserva el contenido para no parpadear.
  const firstLoad = loading && cases.length === 0 && tasks.length === 0;
  const row = (item: ActionItem) => (
    <ItemRow key={item.key} item={item} onOpenCase={onOpenCase} onCompleteTask={onCompleteTask} />
  );

  return (
    <section aria-label="Hoy" className="rounded-lg border bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4">
        <h2 className="text-lg font-bold tracking-tight text-gray-900">Hoy</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Lo que necesita tu atención ahora, esta semana y lo que no tiene próximo paso.
        </p>
      </div>
      {firstLoad ? (
        <p className="text-sm text-muted-foreground">Cargando tu día…</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
          <SectionCard
            title="Vencidos"
            microcopy={data.overdue.length > 0 ? 'Requieren acción inmediata' : 'Nada pendiente de días anteriores'}
            icon={<AlertTriangle className="h-4 w-4 text-red-500" aria-hidden="true" />}
            count={data.overdue.length}
            tone="border-red-200 bg-red-50"
            empty="Todo al día."
            emptyIcon={<CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" aria-hidden="true" />}
            items={data.overdue}
            renderItem={(k) => row(data.overdue.find((i) => i.key === k)!)}
          />
          <SectionCard
            title="Para hoy"
            microcopy="Gestiones del día"
            icon={<CalendarClock className="h-4 w-4 text-amber-600" aria-hidden="true" />}
            count={data.today.length}
            tone="border-amber-200 bg-amber-50"
            empty="No tienes gestiones para hoy."
            emptyIcon={<CalendarClock className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />}
            items={data.today}
            renderItem={(k) => row(data.today.find((i) => i.key === k)!)}
          />
          <SectionCard
            title="Próximos 7 días"
            microcopy="Lo que viene esta semana"
            icon={<CalendarDays className="h-4 w-4 text-blue-500" aria-hidden="true" />}
            count={data.next7.length}
            tone="border-blue-200 bg-blue-50"
            empty="No hay gestiones próximas."
            emptyIcon={<CalendarDays className="h-4 w-4 shrink-0 text-blue-400" aria-hidden="true" />}
            items={data.next7}
            renderItem={(k) => row(data.next7.find((i) => i.key === k)!)}
          />
          <div className="flex flex-col rounded-lg border border-slate-200 bg-slate-50 p-5 shadow-sm transition-shadow hover:shadow">
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex min-w-0 items-center gap-2 text-sm font-semibold text-gray-900">
                <ListTodo className="h-4 w-4 text-slate-500" aria-hidden="true" />
                <span className="truncate">Sin próxima gestión</span>
              </h3>
              <Badge className="shrink-0 rounded-full bg-white/90 px-2.5 py-0.5 text-sm font-bold text-gray-900 shadow-sm">
                {data.noNextAction.length}
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-gray-500">Casos que pueden quedar olvidados</p>
            {data.noNextAction.length === 0 ? (
              <div className="mt-3 flex flex-1 items-center gap-2 rounded-xl bg-white/60 px-3 py-3 text-sm text-gray-500">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" aria-hidden="true" />
                <span>Todos tus casos activos tienen un próximo paso definido.</span>
              </div>
            ) : (
              <>
                <ul className="mt-3 space-y-2">
                  {(showAllIdle ? data.noNextAction : data.noNextAction.slice(0, VISIBLE_LIMIT)).map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => onOpenCase(c.id)}
                        className="flex w-full cursor-pointer items-center gap-3 rounded-xl bg-white/80 px-3 py-2.5 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-gray-900">{c.title}</span>
                          <span className="mt-0.5 block text-xs text-gray-400">
                            {formatStaleLabel(c.updatedAt, nowMs ?? Date.now())}
                          </span>
                        </span>
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-green-900 px-2.5 py-1 text-xs font-medium text-white">
                          <Plus className="h-3 w-3" aria-hidden="true" /> Definir
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                {data.noNextAction.length > VISIBLE_LIMIT && (
                  <button
                    type="button"
                    onClick={() => setShowAllIdle((v) => !v)}
                    className="mt-2 inline-flex items-center gap-1 self-start rounded-md px-1 py-1 text-xs font-medium text-gray-600 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                  >
                    {showAllIdle ? (
                      <>Ver menos <ChevronDown className="h-3.5 w-3.5 rotate-180" aria-hidden="true" /></>
                    ) : (
                      <>Ver todo ({data.noNextAction.length}) <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" /></>
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
