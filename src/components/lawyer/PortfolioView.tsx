import { FolderOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CASE_STATUS_COLORS, CASE_STATUS_LABELS } from '@/lib/caseStatus';
import { stageLabel, type StageGroup, type StatusGroup } from '@/lib/portfolio';

type Props = {
  activeCount: number;
  stageGroups: StageGroup[];
  statusGroups: StatusGroup[];
  maxStageCount: number;
  onSelectStage: (stage: string | null) => void;
};

/**
 * FASE 5.3 — vista Cartera: distribución por etapa (activos) + por estado.
 * Todo derivado de lawyer_cases ya cargados; click filtra la lista.
 */
export function PortfolioView({ activeCount, stageGroups, statusGroups, maxStageCount, onSelectStage }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-gray-900">Cartera</h2>
        <p className="text-sm text-muted-foreground">
          {activeCount} caso{activeCount === 1 ? '' : 's'} activo{activeCount === 1 ? '' : 's'}
        </p>
      </div>

      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-500">
          Distribución por etapa
        </h3>
        {stageGroups.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                <FolderOpen className="h-6 w-6" aria-hidden="true" />
              </span>
              <p className="text-sm font-medium text-gray-900">Sin casos activos</p>
              <p className="max-w-sm text-xs text-muted-foreground">
                Cuando tengas casos activos, su distribución por etapa aparecerá aquí.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stageGroups.map((g) => (
              <button
                key={g.stage ?? '__none__'}
                type="button"
                onClick={() => onSelectStage(g.stage)}
                title={`Ver casos en ${stageLabel(g.stage)}`}
                aria-label={`Ver ${g.count} casos en ${stageLabel(g.stage)}`}
                className="rounded-xl border bg-white p-4 text-left shadow-sm transition-shadow hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-gray-900">
                    {stageLabel(g.stage)}
                  </span>
                  <span className="text-2xl font-bold text-gray-900">{g.count}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100" aria-hidden="true">
                  <div
                    className={`h-full rounded-full ${g.stage === null ? 'bg-gray-300' : 'bg-green-300'}`}
                    style={{ width: `${maxStageCount > 0 ? Math.round((g.count / maxStageCount) * 100) : 0}%` }}
                  />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-500">
          Estado de la cartera
        </h3>
        <div className="flex flex-wrap gap-2">
          {statusGroups.map((g) => (
            <Badge
              key={g.status}
              className={`${CASE_STATUS_COLORS[g.status] || 'bg-gray-100 text-gray-800'} border-0 text-xs font-normal`}
            >
              {CASE_STATUS_LABELS[g.status] || g.status} · {g.count}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
