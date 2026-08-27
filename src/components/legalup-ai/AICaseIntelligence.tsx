import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, FileText, Users, ListChecks, Scale, CalendarClock, ShieldAlert, Layers, ArrowRight, MessageSquare, Brain, Loader2, CheckCircle2, AlertCircle, Clock3 } from 'lucide-react';
import posthog from 'posthog-js';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAICaseIntelligence } from '@/hooks/useAIDocuments';
import { useAICaseWorkflow, useSyncAICaseWorkflow, useUpdateAICaseWorkflow } from '@/hooks/useAICaseWorkflow';
import { EvidenceNavigator, type EvidenceReference } from './EvidenceNavigator';
import { deriveCaseActions } from '@/lib/caseActions';

function getCaseStatus(data: { contradictions: unknown[]; risks: unknown[]; missingInformation: unknown[]; document_count: number }) {
  if (data.contradictions.length > 0) return { label: 'Con contradicciones', color: 'bg-red-100 text-red-800' };
  if (data.risks.length > 0) return { label: 'Con riesgos', color: 'bg-amber-100 text-amber-800' };
  if (data.missingInformation.length > 0) return { label: 'Información incompleta', color: 'bg-blue-100 text-blue-800' };
  if (data.document_count > 0) return { label: 'Listo para análisis', color: 'bg-green-100 text-green-800' };
  return { label: 'En revisión', color: 'bg-gray-100 text-gray-600' };
}

type CaseActionExecution = {
  actionId: string;
  status: 'idle' | 'running' | 'completed' | 'error';
};

export function AICaseIntelligence({ workspaceId, onQuestionClick, onNavigateToDocuments, onOpenChat }: { workspaceId: string; onQuestionClick?: (q: string) => void; onNavigateToDocuments?: () => void; onOpenChat?: () => void }) {
  const { data, isLoading, isError, error, refetch } = useAICaseIntelligence(workspaceId, true);
  const workflowQuery = useAICaseWorkflow(workspaceId);
  const syncWorkflow = useSyncAICaseWorkflow(workspaceId);
  const updateWorkflow = useUpdateAICaseWorkflow(workspaceId);
  const [evidenceRef, setEvidenceRef] = useState<EvidenceReference | null>(null);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [executions, setExecutions] = useState<Record<string, CaseActionExecution>>({});
  const [activeQuickQuestion, setActiveQuickQuestion] = useState<string | null>(null);

  useEffect(() => {
    if (data) posthog.capture('ai_case_intelligence_viewed', { case_id: workspaceId, documents_ready: data.document_count });
  }, [data, workspaceId]);

  useEffect(() => {
    if (workflowQuery.data?.items) {
      const items = workflowQuery.data.items;
      const pending = items.filter((i) => i.status === 'pending').length;
      const in_progress = items.filter((i) => i.status === 'in_progress').length;
      const completed = items.filter((i) => i.status === 'completed').length;
      posthog.capture('ai_case_workflow_viewed', { pending_count: pending, in_progress_count: in_progress, completed_count: completed });
    }
  }, [workflowQuery.data]);

  // Sync workflow once when intelligence ready and workflow empty
  useEffect(() => {
    if (!data || workflowQuery.isLoading || syncWorkflow.isPending) return;
    const items = workflowQuery.data?.items ?? [];
    if (items.length === 0) {
      // Only sync if there are persistable actions
      const derived = deriveCaseActions(data);
      const hasPersistable = derived.some((a) => a.type !== 'ask_case_question');
      if (hasPersistable) syncWorkflow.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.document_count, workflowQuery.data?.items?.length]);

  const handleActionClick = useCallback((a: { id: string; type: string; title: string; question?: string }) => {
    const cur = executions[a.id];
    if (cur?.status === 'running') return;
    setExecutions((prev) => ({ ...prev, [a.id]: { actionId: a.id, status: 'running' } }));
    try {
      posthog.capture('ai_case_intelligence_action_clicked', { action: a.type });
      if (a.type === 'review_missing_information' && a.question) {
        onQuestionClick?.(a.question);
      } else if (a.type === 'review_missing_information') {
        onQuestionClick?.('¿Qué información falta para completar el análisis de este caso?');
      } else if (a.question) {
        onQuestionClick?.(a.question);
      } else {
        document.getElementById(`intelligence-${a.type}`)?.scrollIntoView({ behavior: 'smooth' });
        onNavigateToDocuments?.();
      }
      setExecutions((prev) => ({ ...prev, [a.id]: { actionId: a.id, status: 'completed' } }));
      window.setTimeout(() => {
        setExecutions((prev) => {
          const next = { ...prev };
          delete next[a.id];
          return next;
        });
      }, 2200);
    } catch {
      setExecutions((prev) => ({ ...prev, [a.id]: { actionId: a.id, status: 'error' } }));
      window.setTimeout(() => {
        setExecutions((prev) => {
          const next = { ...prev };
          delete next[a.id];
          return next;
        });
      }, 2200);
    }
  }, [executions, onNavigateToDocuments, onQuestionClick]);

  const handleQuickQuestion = useCallback((q: string) => {
    if (activeQuickQuestion) return;
    setActiveQuickQuestion(q);
    posthog.capture('ai_case_intelligence_action_clicked', { action: 'open_chat', question: q.length });
    onQuestionClick?.(q);
    window.setTimeout(() => setActiveQuickQuestion(null), 1200);
  }, [activeQuickQuestion, onQuestionClick]);

  if (isLoading) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">Cargando inteligencia del caso…</p>
        </CardContent>
      </Card>
    );
  }
  if (isError) {
    return (
      <Card className="rounded-lg border p-4 border-amber-200 bg-amber-50/60">
        <CardContent className="py-6 text-center">
          <p className="text-sm text-amber-900">{error instanceof Error ? error.message : 'No se pudo cargar la inteligencia del caso.'}</p>
          <button type="button" onClick={() => refetch()} className="mt-2 text-xs text-amber-800 underline">Reintentar</button>
        </CardContent>
      </Card>
    );
  }
  if (!data || (data.document_count === 0 && data.pending_count === 0 && data.failed_count === 0)) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <Layers className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-2 text-sm font-medium text-gray-700">Sin documentos para inteligencia del caso</p>
          <p className="text-xs text-muted-foreground">Sube un documento para comenzar a construir la inteligencia del caso.</p>
        </CardContent>
      </Card>
    );
  }

  const status = getCaseStatus(data);
  const nextActions = deriveCaseActions(data);

  const quickQuestions = [
    '¿Cuál es el hecho principal del caso?',
    '¿Qué obligaciones aparecen en los documentos?',
    '¿Qué riesgos aparecen en el caso?',
    '¿Qué información contradictoria existe?',
    '¿Qué información falta para completar el análisis?',
  ];

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Brain className="h-4 w-4 text-green-700" aria-hidden="true" />
          Inteligencia del caso
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Análisis estructurado de tus documentos con IA para identificar hechos,
          obligaciones, riesgos y contradicciones del caso.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={status.color}>{status.label}</Badge>
          <span className="text-xs text-muted-foreground">{data.document_count} documento(s) listo(s){data.pending_count > 0 ? ` · ${data.pending_count} pendiente(s)` : ''}</span>
          {onOpenChat && (
            <Button
              size="sm"
              onClick={() => {
                posthog.capture('ai_case_chat_panel_opened', { source: 'intelligence_header' });
                onOpenChat();
              }}
              className="ml-auto gap-1.5 bg-green-900 text-white hover:bg-green-800"
              aria-label="Abrir chat del caso"
            >
              <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
              Chat del caso
            </Button>
          )}
        </div>

        {data.pending_count > 0 && (
          <Card className="border-blue-200 bg-blue-50/60">
            <CardContent className="py-3 text-sm text-blue-900">{data.pending_count} documento(s) todavía no están disponibles para el análisis del caso.</CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-base">Resumen del caso</CardTitle></CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{data.caseSummary}</CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50/60">
          <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><ArrowRight className="h-4 w-4" /> Siguiente paso</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {nextActions.map((a) => {
              const exec = executions[a.id];
              const isRunning = exec?.status === 'running';
              const isCompleted = exec?.status === 'completed';
              const isError = exec?.status === 'error';
              return (
                <Button
                  key={a.id}
                  variant={isCompleted ? 'default' : 'outline'}
                  size="sm"
                  disabled={isRunning}
                  aria-busy={isRunning}
                  onClick={() => handleActionClick(a)}
                  className={isCompleted ? 'bg-green-600 hover:bg-green-700 text-white' : isError ? 'border-red-300 text-red-700' : ''}
                >
                  {isRunning && <Loader2 className="mr-1 h-3 w-3 animate-spin" aria-hidden="true" />}
                  {isCompleted && <CheckCircle2 className="mr-1 h-3 w-3" aria-hidden="true" />}
                  {isError && <AlertCircle className="mr-1 h-3 w-3" aria-hidden="true" />}
                  {a.title}
                </Button>
              );
            })}
          </CardContent>
        </Card>

        {/* Fase 4.21: Workflow persistente */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm"><Clock3 className="h-4 w-4" /> Siguiente en tu caso</CardTitle>
            {workflowQuery.data?.items && workflowQuery.data.items.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                {(() => {
                  const items = workflowQuery.data.items;
                  const pending = items.filter((i) => i.status === 'pending').length;
                  const inprog = items.filter((i) => i.status === 'in_progress').length;
                  const completed = items.filter((i) => i.status === 'completed').length;
                  return `${pending} pendientes${inprog ? ` · ${inprog} en revisión` : ''}${completed ? ` · ${completed} completadas` : ''}`;
                })()}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Tu caso — acciones sugeridas por LegalUp AI</p>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {workflowQuery.isLoading ? (
              <p className="text-xs text-muted-foreground">Cargando workflow…</p>
            ) : workflowQuery.isError ? (
              <p className="text-xs text-destructive">No se pudo cargar el workflow.</p>
            ) : !workflowQuery.data?.items || workflowQuery.data.items.length === 0 ? (
              <div className="rounded border border-dashed p-3 text-center">
                <p className="text-sm font-medium text-gray-700">No hay acciones pendientes.</p>
                <p className="text-xs text-muted-foreground">LegalUp AI seguirá actualizando este espacio a medida que analices nuevos documentos.</p>
              </div>
            ) : (
              workflowQuery.data.items.slice(0, 6).map((item) => {
                const priorityLabel = item.priority === 'high' ? 'Alta' : item.priority === 'medium' ? 'Media' : 'Baja';
                const priorityColor = item.priority === 'high' ? 'bg-red-100 text-red-800' : item.priority === 'medium' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600';
                const statusLabel = item.status === 'pending' ? 'Pendiente' : item.status === 'in_progress' ? 'En revisión' : item.status === 'completed' ? 'Completado' : 'Descartado';
                const statusColor = item.status === 'pending' ? 'bg-blue-100 text-blue-800' : item.status === 'in_progress' ? 'bg-amber-100 text-amber-800' : item.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600';
                const isUpdating = updateWorkflow.isPending;
                const handleReview = async () => {
                  if (isUpdating) return;
                  try {
                    if (item.status === 'pending') {
                      await updateWorkflow.mutateAsync({ itemId: item.id, status: 'in_progress' });
                    }
                    if (item.action_id === 'review_documents') {
                      setActiveQuickQuestion(null);
                      document.getElementById('ai-documents-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      onNavigateToDocuments?.();
                    } else if (item.action_id === 'review_missing_information') {
                      onQuestionClick?.('¿Qué información falta para completar el análisis del caso?');
                    } else if (item.action_id === 'review_contradictions') {
                      onQuestionClick?.('¿Qué contradicciones existen entre los documentos del caso?');
                    } else if (item.action_id === 'review_risks') {
                      onQuestionClick?.('¿Qué riesgos aparecen en el caso y qué evidencia los respalda?');
                    } else {
                      onQuestionClick?.(item.title);
                    }
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : 'No se pudo actualizar.');
                  }
                };
                const handleComplete = async () => {
                  try { await updateWorkflow.mutateAsync({ itemId: item.id, status: 'completed' }); toast.success('Marcado como completado.'); } catch (e) { toast.error(e instanceof Error ? e.message : 'Error.'); }
                };
                const handleDismiss = async () => {
                  if (!window.confirm('¿Quieres descartar esta acción?\n\nPodrás reabrirla más adelante.')) return;
                  try { await updateWorkflow.mutateAsync({ itemId: item.id, status: 'dismissed' }); } catch (e) { toast.error(e instanceof Error ? e.message : 'Error.'); }
                };
                const handleReopen = async () => {
                  try { await updateWorkflow.mutateAsync({ itemId: item.id, status: 'pending' }); } catch (e) { toast.error(e instanceof Error ? e.message : 'Error.'); }
                };
                return (
                  <div key={item.id} className="rounded border bg-white p-3 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={priorityColor}>{priorityLabel}</Badge>
                      <Badge className={statusColor}>{statusLabel}</Badge>
                    </div>
                    <p className="text-sm font-medium text-gray-900">{item.title}</p>
                    {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {item.status === 'pending' && (
                        <>
                          <Button size="sm" variant="outline" disabled={isUpdating} aria-busy={isUpdating} onClick={handleReview}>Revisar</Button>
                          <Button size="sm" variant="secondary" disabled={isUpdating} onClick={handleComplete}>Marcar como completado</Button>
                          <Button size="sm" variant="ghost" disabled={isUpdating} onClick={handleDismiss}>Descartar</Button>
                        </>
                      )}
                      {item.status === 'in_progress' && (
                        <>
                          <Button size="sm" variant="outline" disabled={isUpdating} aria-busy={isUpdating} onClick={handleReview}>Continuar</Button>
                          <Button size="sm" variant="secondary" disabled={isUpdating} onClick={handleComplete}>Marcar como completado</Button>
                          <Button size="sm" variant="ghost" disabled={isUpdating} onClick={handleDismiss}>Descartar</Button>
                        </>
                      )}
                      {item.status === 'completed' && (
                        <>
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700"><CheckCircle2 className="h-3 w-3" /> Completado</span>
                          <Button size="sm" variant="ghost" disabled={isUpdating} onClick={handleReopen}>Reabrir</Button>
                        </>
                      )}
                      {item.status === 'dismissed' && (
                        <>
                          <span className="text-xs text-gray-500">Descartado</span>
                          <Button size="sm" variant="ghost" disabled={isUpdating} onClick={handleReopen}>Reabrir</Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            {workflowQuery.data?.items && workflowQuery.data.items.length > 3 && (
              <p className="text-[0.65rem] text-muted-foreground">Mostrando {Math.min(6, workflowQuery.data.items.length)} de {workflowQuery.data.items.length} acciones.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><MessageSquare className="h-4 w-4" /> Preguntas sugeridas</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {quickQuestions.map((q) => {
              const isActive = activeQuickQuestion === q;
              return (
                <Button key={q} variant="secondary" size="sm" disabled={!!activeQuickQuestion} aria-busy={isActive} onClick={() => handleQuickQuestion(q)}>
                  {isActive && <Loader2 className="mr-1 h-3 w-3 animate-spin" aria-hidden="true" />}
                  {q}
                </Button>
              );
            })}
          </CardContent>
        </Card>

        {data.facts.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><ListChecks className="h-4 w-4" /> Hechos consolidados ({data.facts.length})</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {data.facts.map((f, i) => (
                <div key={i} className="rounded border bg-gray-50/60 p-3">
                  <p className="text-sm text-gray-800">{f.text}</p>
                  <p className="mt-1 text-xs text-gray-500">Fuentes: {f.source_ids.join(', ')} {f.evidences[0]?.page_number ? `· Página ${f.evidences[0].page_number}` : ''}</p>
                  {f.evidences[0]?.evidence && (
                    <Button variant="ghost" size="sm" className="mt-1 h-7 px-2 text-xs" onClick={() => { setEvidenceRef({ sourceId: f.source_ids[0], documentId: f.source_ids[0], fragmentId: f.evidences[0].fragment_id || null, pageNumber: f.evidences[0].page_number, evidence: f.evidences[0].evidence, sourceType: 'document', documentFilename: f.evidences[0].document_filename }); setEvidenceOpen(true); }}>
                      Ver evidencia
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {data.parties.length > 0 && (
          <Card className="rounded-lg border border-gray-200 bg-gray-50/60">
            <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Users className="h-4 w-4 text-gray-500" /> Partes</CardTitle></CardHeader>
            <CardContent>
              <ul className="text-sm space-y-2">
                {data.parties.map((p,i) =>
                  <li key={i} className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-60" />{p}.
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>
        )}
        {data.obligations.length > 0 && (
          <Card className="rounded-lg border border-gray-200 bg-gray-50/60">
            <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Scale className="h-4 w-4 text-gray-500" /> Obligaciones</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {data.obligations.map((o,i) =>
                  <li key={i} className="flex gap-2 text-sm text-gray-700">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-60" />
                    <span className="flex-1">{o}.</span>
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>
        )}
        {data.deadlines.length > 0 && (
          <Card className="rounded-lg border border-blue-200 bg-blue-50/60">
            <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><CalendarClock className="h-4 w-4 text-blue-600" /> Fechas y plazos</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {data.deadlines.map((d,i) =>
                <li key={i} className="text-sm flex flex-wrap items-center gap-2 text-sm text-gray-700">{d.date && <Badge variant="secondary" className="mr-2 bg-blue-100 text-blue-800">{d.date}</Badge>}{d.description}.
                </li>
                )}
              </ul>
            </CardContent>
          </Card>
        )}
        {data.risks.length > 0 && (
          <Card className="border-amber-200 bg-amber-50/60">
            <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><ShieldAlert className="h-4 w-4 text-amber-600" /> Riesgos</CardTitle></CardHeader>
            <CardContent>
              <ul className="text-sm space-y-2">
                {data.risks.map((r,i) =>
                  <li key={i} className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-60" />{r}.
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>
        )}
        {data.contradictions.length > 0 && (
          <Card className="border-red-200 bg-red-50/60">
            <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><AlertTriangle className="h-4 w-4 text-red-600" /> Contradicciones detectadas</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {data.contradictions.map((c,i) =>
                <div key={i} className="rounded border bg-white p-2">
                  <p className="text-xs font-medium text-gray-700">Tema: {c.topic}</p>
                  {c.versions.map((v,j) =>
                  <div key={j} className="mt-1 text-xs">
                    <p>{v.text}</p>
                    <p className="text-[0.65rem] text-gray-500">{v.document_filename} — {v.source_id}</p>
                    <Button variant="ghost" size="sm" className="mt-1 h-6 px-2 text-[0.65rem]" onClick={() => { setEvidenceRef({ sourceId: v.source_id, documentId: v.source_id, evidence: v.evidence, pageNumber: null, sourceType: 'document', documentFilename: v.document_filename }); setEvidenceOpen(true); }}>Ver evidencia</Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
        {data.missingInformation.length > 0 && (
          <Card className="border-dashed">
            <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><FileText className="h-4 w-4" /> Información faltante</CardTitle></CardHeader>
            <CardContent>
              <ul className="text-sm space-y-2 text-gray-600">
                {data.missingInformation.map((m,i) =>
                  <li key={i} className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-60" />{m}
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>
        )}

        <EvidenceNavigator open={evidenceOpen} onOpenChange={setEvidenceOpen} reference={evidenceRef} surface="case_intelligence" />
        </CardContent>
      </Card>
  );
}
