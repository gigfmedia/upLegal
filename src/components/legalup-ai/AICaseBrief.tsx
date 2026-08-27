import { useEffect, useState } from 'react';
import posthog from 'posthog-js';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, ShieldAlert, AlertTriangle, Layers, ArrowRight, Eye } from 'lucide-react';
import { useAICaseIntelligence, useAIDocuments } from '@/hooks/useAIDocuments';
import { useAICaseWorkflow } from '@/hooks/useAICaseWorkflow';
import { deriveCaseBrief } from '@/lib/caseBrief';
import { EvidenceNavigator, type EvidenceReference } from './EvidenceNavigator';

type Props = {
  workspaceId: string;
  onOpenWorkflowAction?: (actionId: string) => void;
  onViewDocuments?: () => void;
  onAskQuestion?: (question: string) => void;
};

export function AICaseBrief({ workspaceId, onOpenWorkflowAction, onViewDocuments, onAskQuestion }: Props) {
  const intelligenceQuery = useAICaseIntelligence(workspaceId, true);
  const workflowQuery = useAICaseWorkflow(workspaceId);
  const documentsQuery = useAIDocuments(workspaceId);
  const [evidenceRef, setEvidenceRef] = useState<EvidenceReference | null>(null);
  const [evidenceOpen, setEvidenceOpen] = useState(false);

  const brief = deriveCaseBrief(intelligenceQuery.data ?? null, workflowQuery.data?.items, documentsQuery.data);

  useEffect(() => {
    if (brief) {
      posthog.capture('ai_case_brief_viewed', {
        document_count: brief.documentCount,
        risk_count: brief.riskCount,
        contradiction_count: brief.contradictionCount,
        missing_information_count: brief.missingInformationCount,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brief?.documentCount, brief?.riskCount, brief?.contradictionCount, brief?.missingInformationCount]);

  if (intelligenceQuery.isLoading || workflowQuery.isLoading) {
    return (
      <Card>
        <CardContent className="py-6 space-y-3">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (intelligenceQuery.isError) {
    return (
      <Card className="border-amber-200 bg-amber-50/60">
        <CardContent className="py-6 text-center">
          <p className="text-sm text-amber-900">No pudimos cargar el resumen del caso.</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => intelligenceQuery.refetch()}>Reintentar</Button>
        </CardContent>
      </Card>
    );
  }

  if (!intelligenceQuery.data || (brief && brief.documentCount === 0)) {
    return (
      <Card className="border-dashed">
        <CardHeader><CardTitle className="text-base">Resumen del caso</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-center py-4">
          <p className="text-sm text-muted-foreground">Aún no hay documentos suficientes para generar un resumen del caso.</p>
          <p className="text-xs text-muted-foreground">Agrega documentos para que LegalUp AI pueda identificar hechos, riesgos y otra información relevante.</p>
          {onViewDocuments && <Button size="sm" variant="outline" onClick={onViewDocuments}>Ver documentos</Button>}
        </CardContent>
      </Card>
    );
  }

  if (!brief) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Resumen del caso</CardTitle>
        <p className="text-sm text-muted-foreground">Una visión rápida de lo que LegalUp AI ha identificado en tus documentos.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Métricas */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
          <div className="rounded border bg-gray-50/60 p-3">
            <p className="text-lg font-semibold text-gray-900">{brief.documentCount}</p>
            <p className="text-xs text-muted-foreground">Documentos</p>
          </div>
          <div className="rounded border bg-gray-50/60 p-3">
            <p className="text-lg font-semibold text-gray-900">{brief.factCount}</p>
            <p className="text-xs text-muted-foreground">Hechos</p>
          </div>
          <div className="rounded border bg-gray-50/60 p-3">
            <p className="text-lg font-semibold text-gray-900">{brief.riskCount}</p>
            <p className="text-xs text-muted-foreground">Riesgos</p>
          </div>
          <div className="rounded border bg-gray-50/60 p-3">
            <p className="text-lg font-semibold text-gray-900">{brief.contradictionCount}</p>
            <p className="text-xs text-muted-foreground">Contradicciones</p>
          </div>
          <div className="rounded border bg-gray-50/60 p-3">
            <p className="text-lg font-semibold text-gray-900">{brief.missingInformationCount}</p>
            <p className="text-xs text-muted-foreground">Pendiente</p>
          </div>
        </div>

        {/* Estado */}
        <div className="flex items-center gap-2 rounded border p-3" style={{ borderColor: brief.status.color.includes('red') ? '#fecaca' : brief.status.color.includes('amber') ? '#fde68a' : '#bbf7d0' }}>
          <Badge className={brief.status.color}>{brief.status.label}</Badge>
          <span className="text-xs text-muted-foreground">{brief.status.description}</span>
        </div>

        {/* Lo más importante */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2"><Layers className="h-4 w-4" /> Lo más importante</h4>
          {brief.highlights.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No hay elementos críticos por ahora.</p>
          ) : (
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {brief.highlights.map((h) => (
                <div key={h.id} className="rounded border bg-white p-3 space-y-1">
                  <div className="flex items-center gap-1.5">
                    {h.category === 'risk' && <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />}
                    {h.category === 'contradiction' && <AlertTriangle className="h-3.5 w-3.5 text-red-600" />}
                    {h.category === 'missing' && <FileText className="h-3.5 w-3.5 text-blue-600" />}
                    {h.category === 'fact' && <Layers className="h-3.5 w-3.5 text-gray-600" />}
                    <Badge variant="secondary" className="text-[0.65rem]">{h.priority === 'high' ? 'Alta' : h.priority === 'medium' ? 'Media' : 'Baja'}</Badge>
                    <span className="text-[0.65rem] text-muted-foreground capitalize">{h.category}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 line-clamp-3">{h.title}</p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {h.evidence && (
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => { setEvidenceRef({ sourceId: h.evidence!.sourceId, documentId: h.evidence!.sourceId, fragmentId: h.evidence!.fragmentId, pageNumber: h.evidence!.pageNumber, evidence: h.evidence!.evidence, sourceType: 'document', documentFilename: h.evidence!.documentFilename }); setEvidenceOpen(true); posthog.capture('ai_case_brief_action_clicked', { action: h.actionId }); }}>
                        <Eye className="mr-1 h-3 w-3" /> Ver evidencia
                      </Button>
                    )}
                    {h.actionId && onOpenWorkflowAction && (
                      <Button variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={() => { posthog.capture('ai_case_brief_action_clicked', { action: h.actionId }); onOpenWorkflowAction(h.actionId); }}>
                        Revisar <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Qué hacer ahora */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900">Qué hacer ahora</h4>
          {workflowQuery.isError ? (
            <div className="mt-2 rounded border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs text-amber-900">No pudimos cargar las acciones pendientes.</p>
              <Button variant="outline" size="sm" className="mt-1 h-6 text-xs" onClick={() => workflowQuery.refetch()}>Reintentar</Button>
            </div>
          ) : brief.nextActions.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No hay acciones pendientes. Todo está al día.</p>
          ) : (
            <div className="mt-2 space-y-2">
              {brief.nextActions.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-2 rounded border bg-white p-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.description}</p>
                  </div>
                  {onOpenWorkflowAction && (
                    <Button size="sm" variant="outline" onClick={() => { posthog.capture('ai_case_brief_action_clicked', { action: a.action_id }); onOpenWorkflowAction(a.action_id); }}>
                      Revisar <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Documentos */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2"><FileText className="h-4 w-4" /> Documentos del caso</h4>
          {intelligenceQuery.data.documents.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Aún no hay documentos.</p>
          ) : (
            <div className="mt-2 space-y-1">
              <p className="text-xs text-muted-foreground">{intelligenceQuery.data.documents.length} documento(s)</p>
              {intelligenceQuery.data.documents.slice(0,3).map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-2 rounded border px-2 py-1.5">
                  <span className="truncate text-sm text-gray-800">{d.original_filename}</span>
                  {onViewDocuments && <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={onViewDocuments}>Ver</Button>}
                </div>
              ))}
              {onViewDocuments && <Button variant="outline" size="sm" className="mt-1" onClick={onViewDocuments}>Ver documentos</Button>}
            </div>
          )}
        </div>

        <EvidenceNavigator open={evidenceOpen} onOpenChange={setEvidenceOpen} reference={evidenceRef} surface="case_brief" />
      </CardContent>
    </Card>
  );
}
