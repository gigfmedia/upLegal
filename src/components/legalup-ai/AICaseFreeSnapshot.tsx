import { AlertTriangle, FileText, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAICaseIntelligence } from '@/hooks/useAIDocuments';
import { normalizeIntelligenceRisks, stripRiskFallback } from '@/lib/intelligenceRisks';

type Props = {
  workspaceId: string | null | undefined;
  /** Subtle upgrade entry; rendered only after the free value. Optional. */
  onUpgrade?: () => void;
};

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded border bg-white p-3 text-center">
      <p className="text-lg font-semibold text-gray-900">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

/**
 * 4.48B — "Estado del caso": compact deterministic snapshot for free_case.
 * Reuses the existing intelligence endpoint output (facts/risks/
 * contradictions/missing counts + up to 2 short highlights). Separate,
 * limited presentation layer: never renders AICaseCommandCenter and never
 * touches the `case_analysis` entitlement. Read-only: 0 provider calls,
 * 0 operations, 0 quota. Same rendering for any caller; visibility is
 * decided by the owner (free_case only).
 */
export function AICaseFreeSnapshot({ workspaceId, onUpgrade }: Props) {
  const { data, isLoading, isError } = useAICaseIntelligence(workspaceId, true);

  if (isLoading) {
    return (
      <Card aria-label="Cargando estado del caso">
        <CardContent className="space-y-2 py-5">
          <Skeleton className="h-4 w-40" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError || !data) return null;

  if (data.document_count === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Estado del caso</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Agrega documentos para obtener más contexto sobre el caso.
          </p>
        </CardContent>
      </Card>
    );
  }

  const highlights: Array<{ icon: 'risk' | 'contradiction' | 'missing' | 'fact'; text: string }> = [];
  const firstRisk = normalizeIntelligenceRisks(data.risks)[0];
  if (firstRisk) highlights.push({ icon: 'risk', text: stripRiskFallback(firstRisk.text) });
  if (data.contradictions.length > 0 && highlights.length < 2) {
    const c = data.contradictions[0] as { topic?: unknown };
    if (typeof c?.topic === 'string' && c.topic.trim()) {
      highlights.push({ icon: 'contradiction', text: c.topic });
    }
  }
  if (data.missingInformation.length > 0 && highlights.length < 2) {
    highlights.push({ icon: 'missing', text: data.missingInformation[0] });
  }
  if (highlights.length === 0 && data.facts.length > 0) {
    const f = data.facts[0] as { text?: unknown };
    if (typeof f?.text === 'string' && f.text.trim()) {
      highlights.push({ icon: 'fact', text: f.text });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Estado del caso</CardTitle>
        <p className="text-sm text-muted-foreground">
          Resumen automático a partir de la información disponible en tu caso.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Metric value={data.document_count} label="Documentos" />
          <Metric value={data.facts.length} label="Hechos" />
          <Metric value={data.risks.length} label="Riesgos" />
          <Metric value={data.contradictions.length} label="Contradicciones" />
          <Metric value={data.missingInformation.length} label="Pendientes" />
        </div>
        {highlights.length > 0 && (
          <ul className="space-y-2">
            {highlights.map((h, i) => (
              <li
                key={i}
                className="flex items-start gap-2 rounded border bg-gray-50/60 p-3 text-sm text-gray-700"
              >
                {h.icon === 'risk' ? (
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
                ) : h.icon === 'contradiction' ? (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
                ) : (
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" aria-hidden="true" />
                )}
                <span className="line-clamp-3">{h.text}</span>
              </li>
            ))}
          </ul>
        )}
        {onUpgrade && (
          <div className="flex justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={onUpgrade}>
              Ver herramientas avanzadas de LegalUp Pro
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
