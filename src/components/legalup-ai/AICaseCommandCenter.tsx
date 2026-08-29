import { useEffect, useState } from 'react';
import posthog from 'posthog-js';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, ShieldAlert, AlertTriangle, Layers, ArrowRight, Eye, Brain } from 'lucide-react';
import { toast } from 'sonner';
import { useAICaseIntelligence, useAIDocuments } from '@/hooks/useAIDocuments';
import { useAICaseWorkflow, useUpdateAICaseWorkflow } from '@/hooks/useAICaseWorkflow';
import { deriveCaseBrief } from '@/lib/caseBrief';
import { EvidenceNavigator, type EvidenceReference } from './EvidenceNavigator';
import { AICaseWorkflowActionDrawer } from './AICaseWorkflowActionDrawer';

type Props = {
  workspaceId: string;
  workspaceName?: string | null;
  onOpenWorkflowAction?: (actionId: string) => void;
  onViewDocuments?: () => void;
  onViewIntelligence?: () => void;
  onAskQuestion?: (question: string) => void;
  onWorkflowAsk?: (question: string, actionId: string) => void;
  externalWorkflowActionId?: string | null;
  onExternalWorkflowActionHandled?: () => void;
};

export function AICaseCommandCenter({ workspaceId, workspaceName, onOpenWorkflowAction, onViewDocuments, onViewIntelligence, onAskQuestion, onWorkflowAsk, externalWorkflowActionId, onExternalWorkflowActionHandled }: Props) {
  const intelligenceQuery = useAICaseIntelligence(workspaceId, true);
  const workflowQuery = useAICaseWorkflow(workspaceId);
  const documentsQuery = useAIDocuments(workspaceId);
  const updateWorkflow = useUpdateAICaseWorkflow(workspaceId);
  const [evidenceRef, setEvidenceRef] = useState<EvidenceReference | null>(null);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [selectedWorkflowItem, setSelectedWorkflowItem] = useState<import('@/hooks/useAICaseWorkflow').AICaseWorkflowItem | null>(null);
  const [workflowDrawerOpen, setWorkflowDrawerOpen] = useState(false);

  const brief = deriveCaseBrief(intelligenceQuery.data ?? null, workflowQuery.data?.items, documentsQuery.data);

  const openWorkflowByActionId = (actionId: string) => {
    const item = workflowQuery.data?.items.find((i) => i.action_id === actionId);
    if (item) {
      setSelectedWorkflowItem(item);
      setWorkflowDrawerOpen(true);
      posthog.capture('ai_case_command_center_action_clicked', { action: actionId });
    } else if (onOpenWorkflowAction) {
      onOpenWorkflowAction(actionId);
    }
  };

  useEffect(() => {
    if (externalWorkflowActionId && workflowQuery.data?.items) {
      const item = workflowQuery.data.items.find((i) => i.action_id === externalWorkflowActionId);
      if (item) {
        setSelectedWorkflowItem(item);
        setWorkflowDrawerOpen(true);
        onExternalWorkflowActionHandled?.();
      }
    }
  }, [externalWorkflowActionId, workflowQuery.data, onExternalWorkflowActionHandled]);

  useEffect(() => {
    if (brief) {
      posthog.capture('ai_case_command_center_viewed', {
        document_count: brief.documentCount,
        risk_count: brief.riskCount,
        contradiction_count: brief.contradictionCount,
        pending_count: brief.nextActions.length,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brief?.documentCount, brief?.riskCount, brief?.contradictionCount, brief?.nextActions.length]);

  if (intelligenceQuery.isLoading || workflowQuery.isLoading || documentsQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (intelligenceQuery.isError) {
    return (
      <Card className="border-amber-200 bg-amber-50/60">
        <CardContent className="py-6 text-center">
          <p className="text-sm text-amber-900">No pudimos cargar la inteligencia del caso.</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => intelligenceQuery.refetch()}>Reintentar</Button>
        </CardContent>
      </Card>
    );
  }

  if (workflowQuery.isError) {
    // No bloquea todo el command center, muestra error localizado
    return (
      <div className="space-y-4">
        {brief && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Brain className="h-4 w-4 text-green-700" /> {workspaceName ? `Caso: ${workspaceName}` : 'Resumen del caso'}</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-muted-foreground">No pudimos cargar las tareas pendientes.</p><Button variant="outline" size="sm" className="mt-2" onClick={() => workflowQuery.refetch()}>Reintentar</Button></CardContent>
          </Card>
        )}
      </div>
    );
  }

  if (!intelligenceQuery.data || !brief) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-6 text-center">
          <p className="text-sm text-muted-foreground">Todavía no hay información suficiente para generar el resumen.</p>
        </CardContent>
      </Card>
    );
  }

  if (brief.documentCount === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader><CardTitle className="text-base">Resumen del caso</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-center py-4">
          <Layers className="mx-auto h-8 w-8 text-gray-300" />
          <p className="text-sm font-medium text-gray-700">Este caso todavía no tiene documentos.</p>
          <p className="text-xs text-muted-foreground">Agrega documentos para que LegalUp AI pueda analizar el caso.</p>
          {onViewDocuments && <Button size="sm" onClick={onViewDocuments}>Agregar documento</Button>}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">{workspaceName ? `Caso: ${workspaceName}` : 'Resumen del caso'}</CardTitle>
          <p className="text-sm text-muted-foreground">Una visión rápida de lo que LegalUp AI ha identificado en tus documentos.</p>
        </CardHeader>
        <CardContent className="space-y-4">
        {/* Métricas */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="rounded border bg-white p-3 text-center"><p className="text-lg font-semibold">{brief.documentCount}</p><p className="text-xs text-muted-foreground">Documentos</p></div>
          <div className="rounded border bg-white p-3 text-center"><p className="text-lg font-semibold">{brief.factCount}</p><p className="text-xs text-muted-foreground">Hechos</p></div>
          <div className="rounded border bg-white p-3 text-center"><p className="text-lg font-semibold">{brief.riskCount}</p><p className="text-xs text-muted-foreground">Riesgos</p></div>
          <div className="rounded border bg-white p-3 text-center"><p className="text-lg font-semibold">{brief.contradictionCount}</p><p className="text-xs text-muted-foreground">Contradicciones</p></div>
          <div className="rounded border bg-white p-3 text-center"><p className="text-lg font-semibold">{brief.missingInformationCount}</p><p className="text-xs text-muted-foreground">Pendiente</p></div>
        </div>

        {/* Estado */}
        <div className="flex items-center gap-2 rounded border bg-gray-50 px-3 py-2">
          <span className={`h-2 w-2 rounded-full ${brief.status.color.includes('red') ? 'bg-red-500' : brief.status.color.includes('amber') ? 'bg-amber-500' : brief.status.color.includes('green') ? 'bg-green-500' : 'bg-gray-400'}`} />
          <span className="text-sm font-medium">{brief.status.label}</span>
          <span className="text-xs text-muted-foreground">— {brief.status.description}</span>
        </div>

        {/* Situación del caso */}
        <div className="rounded border bg-white p-3">
          <h4 className="text-sm font-semibold text-gray-900">Situación del caso</h4>
          <p className="mt-1 text-sm text-gray-700">{brief.situation}</p>
          {brief.pendingItems.length > 0 && brief.pendingItems[0].status === 'in_progress' && (
            <div className="mt-2 rounded border border-blue-200 bg-blue-50 p-2">
              <p className="text-xs font-medium text-blue-800">Continúa donde lo dejaste</p>
              <p className="text-xs text-blue-700">{brief.pendingItems[0].title} — En revisión</p>
              <Button size="sm" variant="outline" className="mt-1 h-6 text-xs" onClick={() => openWorkflowByActionId(brief.pendingItems[0].action_id)}>Continuar</Button>
            </div>
          )}
        </div>

      {/* Lo más importante */}
      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Layers className="h-4 w-4" /> Lo más importante</CardTitle></CardHeader>
        <CardContent>
          {brief.highlights.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay elementos críticos por ahora.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {brief.highlights.map((h) => (
                <div key={h.id} className="rounded border bg-white p-3 space-y-1">
                  <div className="flex items-center gap-1.5">
                    {h.category === 'risk' && <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />}
                    {h.category === 'contradiction' && <AlertTriangle className="h-3.5 w-3.5 text-red-600" />}
                    {h.category === 'missing' && <FileText className="h-3.5 w-3.5 text-blue-600" />}
                    {h.category === 'fact' && <Layers className="h-3.5 w-3.5 text-gray-600" />}
                    <Badge variant="secondary" className="text-[0.65rem]">{h.priority === 'high' ? 'Alta' : h.priority === 'medium' ? 'Media' : 'Baja'}</Badge>
                  </div>
                  <p className="text-sm font-medium line-clamp-3">{h.title}</p>
                  <div className="flex flex-wrap gap-1">
                    {h.evidence && (
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => { setEvidenceRef({ sourceId: h.evidence!.sourceId, documentId: h.evidence!.sourceId, fragmentId: h.evidence!.fragmentId, pageNumber: h.evidence!.pageNumber, evidence: h.evidence!.evidence, documentFilename: h.evidence!.documentFilename }); setEvidenceOpen(true); }}>
                        <Eye className="mr-1 h-3 w-3" /> Ver evidencia
                      </Button>
                    )}
                    {h.actionId && (
                      <Button variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={() => openWorkflowByActionId(h.actionId!)}>
                        Revisar <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Qué hacer ahora — CTA principal */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Qué hacer ahora</CardTitle></CardHeader>
        <CardContent>
          {brief.nextActions.length === 0 ? (
            <div className="rounded border border-green-200 bg-green-50 p-3">
              <p className="text-sm font-medium text-green-800">No hay acciones pendientes</p>
              <p className="text-xs text-green-700">LegalUp AI no ha identificado tareas prioritarias en este momento.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-green-700">Siguiente paso recomendado</p>
                <p className="mt-1 text-base font-semibold text-gray-900">{brief.nextActions[0].title}</p>
                <p className="mt-1 text-sm text-gray-600">{brief.nextActions[0].description}</p>
                <Button size="sm" className="mt-3 bg-green-900 text-white hover:bg-green-800" onClick={() => openWorkflowByActionId(brief.nextActions[0].action_id)}>
                  Revisar <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
              {brief.nextActions.slice(1).map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-2 rounded border bg-white p-3">
                  <div>
                    <p className="text-sm font-medium">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.description}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => openWorkflowByActionId(a.action_id)}>
                    Revisar <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pendientes del caso */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Pendientes del caso</CardTitle></CardHeader>
        <CardContent>
          {brief.pendingItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay pendientes.</p>
          ) : (
            <div className="space-y-2">
              {brief.pendingItems.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-2 rounded border bg-white p-3">
                  <div>
                    <p className="text-sm font-medium">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.description}</p>
                    <div className="mt-1 flex gap-1">
                      <Badge className={a.priority === 'high' ? 'bg-red-100 text-red-800' : a.priority === 'medium' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'}>{a.priority === 'high' ? 'Alta' : a.priority === 'medium' ? 'Media' : 'Baja'}</Badge>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-[0.65rem]">{a.status === 'in_progress' ? 'En revisión' : 'Pendiente'}</Badge>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => openWorkflowByActionId(a.action_id)}>Revisar</Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completados recientemente */}
      {brief.recentCompleted.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Completados recientemente</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {brief.recentCompleted.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-2 rounded border bg-green-50 p-3">
                <div>
                  <p className="text-sm font-medium">{a.title}</p>
                  <p className="text-xs text-muted-foreground">Completado el {new Date(a.completed_at!).toLocaleDateString('es-CL')}</p>
                </div>
                <Badge className="bg-green-100 text-green-800">Completado</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Documentos con problemas */}
      {brief.documentsWithIssuesCount > 0 && (
        <Card className="border-amber-200 bg-amber-50/60">
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" /> Documentos que requieren atención</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-amber-900">{brief.documentsWithIssuesCount} documento(s) no pudieron procesarse correctamente.</p>
            {onViewDocuments && <Button size="sm" variant="outline" className="mt-2" onClick={onViewDocuments}>Revisar documentos</Button>}
          </CardContent>
        </Card>
      )}

      {/* Documentos */}
      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" /> Documentos del caso</CardTitle></CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">{brief.documentCount} documento(s) en este caso</p>
          <div className="mt-2 space-y-1">
            {intelligenceQuery.data.documents.slice(0,3).map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-2 rounded border px-2 py-1.5">
                <span className="truncate text-sm">{d.original_filename}</span>
                <Badge variant="secondary" className="bg-green-50 text-green-800 text-[0.65rem]">{d.status}</Badge>
              </div>
            ))}
          </div>
          {onViewDocuments && <Button size="sm" variant="outline" className="mt-3" onClick={onViewDocuments}>Ver todos los documentos</Button>}
        </CardContent>
      </Card>

      {/* Acciones rápidas */}
      <Card className="border-dashed">
        <CardHeader><CardTitle className="text-sm">Acciones rápidas</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {onAskQuestion && <Button size="sm" onClick={() => onAskQuestion('¿Qué debería revisar ahora en este caso?')}>Preguntar a LegalUp AI</Button>}
          {onViewDocuments && <Button size="sm" variant="outline" onClick={onViewDocuments}>Ver documentos</Button>}
          {onViewIntelligence && <Button size="sm" variant="outline" onClick={onViewIntelligence}>Ver inteligencia completa</Button>}
        </CardContent>
      </Card>

        </CardContent>
      </Card>
      <AICaseWorkflowActionDrawer
        open={workflowDrawerOpen}
        onOpenChange={setWorkflowDrawerOpen}
        item={selectedWorkflowItem}
        intelligence={intelligenceQuery.data}
        isUpdating={updateWorkflow.isPending}
        onAsk={async (q) => {
          const actionId = selectedWorkflowItem?.action_id;
          if (selectedWorkflowItem && selectedWorkflowItem.status === 'pending') {
            try { await updateWorkflow.mutateAsync({ itemId: selectedWorkflowItem.id, status: 'in_progress' }); } catch { void 0; }
          }
          if (actionId && onWorkflowAsk) onWorkflowAsk(q, actionId);
          else onAskQuestion?.(q);
          setWorkflowDrawerOpen(false);
        }}
        onViewDocuments={() => { onViewDocuments?.(); setWorkflowDrawerOpen(false); }}
        onComplete={async () => { if (!selectedWorkflowItem) return; try { await updateWorkflow.mutateAsync({ itemId: selectedWorkflowItem.id, status: 'completed' }); toast.success('Marcado como completado.'); } catch (e) { toast.error(e instanceof Error ? e.message : 'Error.'); } }}
        onDismiss={async () => { if (!selectedWorkflowItem) return; if (!window.confirm('¿Quieres descartar esta acción?\n\nPodrás reabrirla más adelante.')) return; try { await updateWorkflow.mutateAsync({ itemId: selectedWorkflowItem.id, status: 'dismissed' }); } catch (e) { toast.error(e instanceof Error ? e.message : 'Error.'); } }}
        onReopen={async () => { if (!selectedWorkflowItem) return; try { await updateWorkflow.mutateAsync({ itemId: selectedWorkflowItem.id, status: 'pending' }); } catch (e) { toast.error(e instanceof Error ? e.message : 'Error.'); } }}
      />
      <EvidenceNavigator open={evidenceOpen} onOpenChange={setEvidenceOpen} reference={evidenceRef} surface="command_center" />
    </>
  );
}
