import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useLatestCaseAnalysis } from '@/hooks/useLatestCaseAnalysis';

function formatAnalysisDate(value: string): string {
  try {
    return format(parseISO(value), "d 'de' MMMM yyyy", { locale: es });
  } catch {
    return value;
  }
}

type Props = {
  workspaceId: string | null | undefined;
  /** "Ver documento" → Documents tab with the analyzed document selected. */
  onViewDocument?: (documentId: string) => void;
};

/**
 * 4.46B — "Último análisis del caso" (OPTION B).
 * A DOCUMENT summary shown in the Case Overview; explicitly NOT a persisted
 * Case summary. Same path for every plan (no plan branches): visibility is
 * decided by the owner. Read-only: 0 provider calls, 0 operations, 0 quota.
 * Loading shows a skeleton (never an error flash); fetch failure hides the
 * card and leaves the rest of Overview usable.
 */
export function AICaseLatestAnalysis({ workspaceId, onViewDocument }: Props) {
  const { data: latest, isLoading, isError } = useLatestCaseAnalysis(workspaceId);

  if (isLoading) {
    return (
      <Card aria-label="Cargando último análisis">
        <CardContent className="space-y-2 py-5">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !latest) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Último análisis del caso</CardTitle>
        <p className="text-sm text-muted-foreground">
          Resumen del documento analizado más reciente.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="flex items-center gap-2 text-sm font-medium text-gray-900">
          <FileText className="h-4 w-4 shrink-0 text-green-700" aria-hidden="true" />
          <span className="truncate">{latest.documentFilename}</span>
        </p>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
          {(latest.summary || '').trim()}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            Analizado el {formatAnalysisDate(latest.updated_at)}
          </span>
          {onViewDocument && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onViewDocument(latest.document_id)}
            >
              Ver documento
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
