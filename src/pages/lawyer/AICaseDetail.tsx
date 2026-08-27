import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import posthog from 'posthog-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  FolderOpen,
  Loader2,
  FileText,
  Lock,
} from 'lucide-react';
import { useAIWorkspace } from '@/hooks/useAIWorkspaces';
import {
  useAIDocuments,
  useAIDocumentAnalysis,
  useProcessAIDocument,
  useAnalyzeAIDocument,
  type AIDocument,
} from '@/hooks/useAIDocuments';
import { useAIFeatureAccess } from '@/hooks/useAISubscription';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';
import {
  useAICaseTimeline,
  syncAICaseTimelineEvents,
  AI_TIMELINE_QUERY_KEY,
} from '@/hooks/useAICaseTimeline';
import { AIPricingModal } from '@/components/legalup-ai/AIPricingModal';
import { DEFAULT_AI_MODEL } from '@/lib/aiModels';
import { AIDocumentUpload } from '@/components/legalup-ai/AIDocumentUpload';
import { AIDocumentList } from '@/components/legalup-ai/AIDocumentList';
import { AIAnalysisView } from '@/components/legalup-ai/AIAnalysisView';
import { AIChat } from '@/components/legalup-ai/AIChat';
import { AIResearchPanel } from '@/components/legalup-ai/AIResearchPanel';
import { AICaseTimeline } from '@/components/legalup-ai/AICaseTimeline';
import { AICaseIntelligence } from '@/components/legalup-ai/AICaseIntelligence';
import { AICaseChatDrawer } from '@/components/legalup-ai/AICaseChatDrawer';
import { AICaseBrief } from '@/components/legalup-ai/AICaseBrief';

function formatDate(value: string): string {
  try {
    return format(parseISO(value), "d 'de' MMMM yyyy", { locale: es });
  } catch {
    return value;
  }
}

export default function AICaseDetail() {
  const { caseId } = useParams<{ caseId: string }>();
  const [searchParams] = useSearchParams();
  const { data: workspace, isLoading, isError, error, refetch } = useAIWorkspace(caseId);
  const documentsQuery = useAIDocuments(caseId);
  const { canUse, isLoading: accessLoading } = useAIFeatureAccess();
  const canAnalyze = canUse('document_analysis');
  const canChat = canUse('case_chat');
  const canResearch = canUse('jurisprudence');

  const defaultTab = searchParams.get('tab') || 'documents';

  const processMutation = useProcessAIDocument();
  const analyzeMutation = useAnalyzeAIDocument();

  const { user } = useAuth();
  const lawyerId = user?.id ?? null;
  const queryClient = useQueryClient();
  const { data: timelineEvents } = useAICaseTimeline(caseId);
  const syncTimelineInFlight = useRef(false);

  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [model, setModel] = useState(DEFAULT_AI_MODEL);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('documents');
  const [chatQuestion, setChatQuestion] = useState<string | null>(null);
  const [chatPanelOpen, setChatPanelOpen] = useState(false);
  const [briefWorkflowActionId, setBriefWorkflowActionId] = useState<string | null>(null);

  const documents = useMemo(() => documentsQuery.data ?? [], [documentsQuery.data]);
  const selectedDoc =
    documents.find((doc) => doc.id === selectedDocId) ?? documents[0] ?? null;

  useEffect(() => {
    if (selectedDocId && !documents.some((doc) => doc.id === selectedDocId)) {
      setSelectedDocId(null);
    }
  }, [documents, selectedDocId]);

  // Sincroniza eventos automáticos del timeline (case_created, document_uploaded,
  // document_analyzed). Idempotente: verifica existencia en BD antes de insertar,
  // así un reintento o re-ejecución de React Query nunca genera duplicados.
  useEffect(() => {
    if (!caseId || !lawyerId || !workspace || documentsQuery.isLoading || !timelineEvents) return;
    if (syncTimelineInFlight.current) return;
    syncTimelineInFlight.current = true;
    syncAICaseTimelineEvents({
      workspaceId: caseId,
      lawyerId,
      workspaceCreatedAt: workspace.created_at,
      documents,
      events: timelineEvents,
    })
      .then(() => {
        queryClient.invalidateQueries({
          queryKey: [...AI_TIMELINE_QUERY_KEY, caseId],
        });
        queryClient.invalidateQueries({ queryKey: [...AI_TIMELINE_QUERY_KEY, 'recent'] });
      })
      .catch((err) => {
        console.error('[AICaseTimeline] Error sincronizando eventos:', err);
      })
      .finally(() => {
        syncTimelineInFlight.current = false;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId, lawyerId, workspace, documents, documentsQuery.isLoading, timelineEvents]);

  const analysisQuery = useAIDocumentAnalysis(
    selectedDoc?.id,
    selectedDoc?.analysis_status === 'ready'
  );

  const handleProcess = (id: string) => {
    posthog.capture('ai_document_processing_started');
    processMutation.mutate(id, {
      onSuccess: () => posthog.capture('ai_document_processing_completed'),
      onError: () => posthog.capture('ai_document_processing_failed'),
    });
  };

  useEffect(() => {
    const pending = documents.find((doc) => doc.status === 'pending');
    if (pending && !processMutation.isPending) {
      handleProcess(pending.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documents, processMutation.isPending]);

  const handleUploaded = (doc: AIDocument) => {
    setSelectedDocId(doc.id);
    handleProcess(doc.id);
  };

  const handleAnalyze = () => {
    if (!selectedDoc) return;
    posthog.capture('ai_document_analysis_started', { model });
    analyzeMutation.mutate(
      { documentId: selectedDoc.id, model },
      {
        onSuccess: () => posthog.capture('ai_document_analysis_completed', { model }),
        onError: () => posthog.capture('ai_document_analysis_failed', { model }),
      }
    );
  };

  return (
    <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div>
        <Button
          asChild
          variant="ghost"
          className="-ml-3 mb-4 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        >
          <Link to="/lawyer/ai">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver a LegalUp AI
          </Link>
        </Button>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-9 w-2/3 max-w-lg" />
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-32 w-full max-w-3xl" />
          </div>
        ) : isError ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
              <AlertTriangle className="h-10 w-10 text-amber-500" aria-hidden="true" />
              <p className="font-medium text-gray-900">No pudimos cargar el caso</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                {error instanceof Error ? error.message : 'Ocurrió un error inesperado.'}
              </p>
              <Button type="button" variant="outline" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Reintentar
              </Button>
            </CardContent>
          </Card>
        ) : !workspace ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-700">
                <FolderOpen className="h-7 w-7" aria-hidden="true" />
              </span>
              <p className="text-lg font-medium text-gray-900">Caso no encontrado</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Este caso no existe o no tienes acceso a él.
              </p>
              <Button asChild className="mt-2 bg-green-900 text-white hover:bg-green-800">
                <Link to="/lawyer/ai">Ir a Mis casos</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <header className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                {workspace.name}
              </h1>
              {workspace.practice_area ? (
                <Badge variant="secondary" className="bg-green-50 text-green-800">
                  {workspace.practice_area}
                </Badge>
              ) : (
                <span className="text-sm text-muted-foreground">Sin área jurídica</span>
              )}
            </header>

            <div className="my-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                Creado: {formatDate(workspace.created_at)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4" aria-hidden="true" />
                Actualizado: {formatDate(workspace.updated_at)}
              </span>
            </div>

            {workspace.description ? (
              <Card className="mb-4">
                <CardContent className="p-5">
                  <h2 className="text-sm font-semibold text-gray-900">Descripción</h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                    {workspace.description}
                  </p>
                </CardContent>
              </Card>
            ) : null}

            <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue={defaultTab} className="mb-6">
              <TabsList className="sticky top-16 z-10 mb-4 flex h-auto w-full flex-wrap justify-start gap-0 border border-gray-200 bg-white shadow-sm p-0">
                <TabsTrigger
                  value="documents"
                  className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground data-[state=active]:border-green-900 data-[state=active]:bg-transparent data-[state=active]:text-green-900 data-[state=active]:shadow-none hover:text-gray-900"
                >
                  Documentos y análisis
                </TabsTrigger>
                <TabsTrigger
                  value="research"
                  className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground data-[state=active]:border-green-900 data-[state=active]:bg-transparent data-[state=active]:text-green-900 data-[state=active]:shadow-none hover:text-gray-900"
                >
                  Investigar jurisprudencia
                </TabsTrigger>
                <TabsTrigger
                  value="intelligence"
                  className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground data-[state=active]:border-green-900 data-[state=active]:bg-transparent data-[state=active]:text-green-900 data-[state=active]:shadow-none hover:text-gray-900"
                >
                  Inteligencia del caso
                </TabsTrigger>
                <TabsTrigger
                  value="timeline"
                  className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground data-[state=active]:border-green-900 data-[state=active]:bg-transparent data-[state=active]:text-green-900 data-[state=active]:shadow-none hover:text-gray-900"
                >
                  Timeline del caso
                </TabsTrigger>
              </TabsList>

              <TabsContent value="documents" className="mt-4">
            {accessLoading ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <Skeleton className="h-5 w-56" />
                  <Skeleton className="h-4 w-80 max-w-full" />
                  <p className="text-sm text-muted-foreground">
                    Cargando tu acceso a LegalUp AI…
                  </p>
                </CardContent>
              </Card>
            ) : !canAnalyze ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                    <Lock className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-medium text-gray-900">
                      Análisis de documentos no disponible
                    </p>
                    <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                      Tu plan actual no incluye el análisis de documentos de LegalUp AI.
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={() => setPricingOpen(true)}
                    className="bg-gray-900 text-white hover:bg-green-900"
                  >
                    Ver planes
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:min-w-0">
                <section className="min-w-0 space-y-4">
                  <Card id="ai-documents-section">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <FileText className="h-4 w-4 text-green-700" aria-hidden="true" />
                        Documentos del caso
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Sube y gestiona los documentos de tu caso para analizarlos con IA
                        y generar inteligencia jurídica estructurada.
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 gap-4 lg:grid-cols-1">
                        <AIDocumentUpload
                          workspaceId={workspace.id}
                          onUploaded={handleUploaded}
                        />

                        {documentsQuery.isLoading ? (
                          <div className="space-y-2">
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                          </div>
                        ) : documentsQuery.isError ? (
                          <p className="text-sm text-destructive">
                            {documentsQuery.error instanceof Error
                              ? documentsQuery.error.message
                              : 'No se pudieron cargar los documentos.'}
                          </p>
                        ) : (
                          <AIDocumentList
                            documents={documents}
                            selectedId={selectedDoc?.id ?? null}
                            onSelect={(id) => setSelectedDocId(id)}
                          />
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <section className="lg:sticky lg:top-[calc(4rem+2.75rem)]">
                    {!canChat ? (
                      <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                            <Lock className="h-6 w-6" aria-hidden="true" />
                          </span>
                          <div>
                            <p className="font-medium text-gray-900">
                              Chat del caso no disponible
                            </p>
                            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                              Tu plan actual no incluye el chat contextual de LegalUp AI.
                            </p>
                          </div>
                          <Button
                            type="button"
                            onClick={() => setPricingOpen(true)}
                            className="bg-gray-900 text-white hover:bg-green-900"
                          >
                            Ver planes
                          </Button>
                        </CardContent>
                      </Card>
                    ) : (
                      <AIChat
                        workspaceId={workspace.id}
                        documents={documents}
                        onUploadClick={() =>
                          document
                            .getElementById('ai-documents-section')
                            ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                        }
                        externalQuestion={chatQuestion}
                        onExternalQuestionHandled={() => setChatQuestion(null)}
                      />
                    )}
                  </section>
                </section>

                <section className="min-w-0 space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Sparkles className="h-4 w-4 text-green-700" aria-hidden="true" />
                        Análisis con IA
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {!selectedDoc ? (
                        <div className="flex flex-col items-center gap-2 py-10 text-center">
                          <p className="text-sm text-muted-foreground">
                            Selecciona un documento para analizarlo con LegalUp AI.
                          </p>
                        </div>
                      ) : selectedDoc.analysis_status === 'processing' ? (
                        <div className="flex flex-col items-center gap-3 py-10 text-center">
                          <Loader2 className="h-8 w-8 animate-spin text-green-700" aria-hidden="true" />
                          <p className="text-sm font-medium text-gray-900">
                            Generando análisis…
                          </p>
                          <p className="max-w-sm text-xs text-muted-foreground">
                            LegalUp AI está revisando el documento. Esto puede tomar
                            un momento.
                          </p>
                        </div>
                      ) : selectedDoc.analysis_status === 'failed' ? (
                        <div className="flex flex-col items-center gap-3 py-10 text-center">
                          <AlertTriangle className="h-8 w-8 text-amber-500" aria-hidden="true" />
                          <p className="text-sm font-medium text-gray-900">
                            El análisis falló
                          </p>
                          <p className="max-w-sm text-sm text-muted-foreground">
                            {selectedDoc.analysis_error ||
                              'Ocurrió un error inesperado al analizar el documento.'}
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleAnalyze}
                            disabled={analyzeMutation.isPending}
                          >
                            {analyzeMutation.isPending ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                            ) : (
                              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
                            )}
                            {analyzeMutation.isPending ? 'Reintentando…' : 'Reintentar análisis'}
                          </Button>
                        </div>
                      ) : (
                        <AIAnalysisView
                          analysis={selectedDoc.analysis_status === 'ready' ? analysisQuery.data ?? null : null}
                          model={model}
                          analyzing={analyzeMutation.isPending}
                          onModelChange={setModel}
                          onAnalyze={handleAnalyze}
                        />
                      )}
                    </CardContent>
                  </Card>
                </section>
              </div>
            )}
              </TabsContent>

              {/* forceMount: mantiene el panel montado entre pestañas para que
              el error + "Reintentar" (lastQuery) no se borren al cambiar a
              Documentos/Análisis o Timeline. Se oculta vía data-state. */}
              <TabsContent
                value="research"
                forceMount
                className="mt-4 data-[state=inactive]:hidden"
              >
            {accessLoading ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <Skeleton className="h-5 w-56" />
                  <Skeleton className="h-4 w-80 max-w-full" />
                  <p className="text-sm text-muted-foreground">
                    Cargando tu acceso a LegalUp AI…
                  </p>
                </CardContent>
              </Card>
            ) : !canResearch ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                    <Lock className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-medium text-gray-900">
                      Investigación de jurisprudencia no disponible
                    </p>
                    <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                      Tu plan actual no incluye la investigación de jurisprudencia
                      de LegalUp AI.
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={() => setPricingOpen(true)}
                    className="bg-gray-900 text-white hover:bg-green-900"
                  >
                    Ver planes
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <AIResearchPanel workspaceId={workspace.id} />
            )}
              </TabsContent>

              <TabsContent value="intelligence" className="mt-4 space-y-4">
                <AICaseBrief
                  workspaceId={workspace.id}
                  onOpenWorkflowAction={(actionId) => setBriefWorkflowActionId(actionId)}
                  onViewDocuments={() => {
                    setActiveTab('documents');
                    setTimeout(() => document.getElementById('ai-documents-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
                  }}
                  onAskQuestion={(q) => {
                    setChatQuestion(q);
                    setChatPanelOpen(true);
                    posthog.capture('ai_case_chat_panel_opened', { source: 'case_brief' });
                  }}
                />
                <AICaseIntelligence
                  workspaceId={workspace.id}
                  externalWorkflowActionId={briefWorkflowActionId}
                  onExternalWorkflowActionHandled={() => setBriefWorkflowActionId(null)}
                  onQuestionClick={(q) => {
                    setChatQuestion(q);
                    setChatPanelOpen(true);
                    posthog.capture('ai_case_chat_panel_opened', { source: 'case_intelligence' });
                  }}
                  onOpenChat={() => {
                    setChatPanelOpen(true);
                    posthog.capture('ai_case_chat_panel_opened', { source: 'intelligence_button' });
                  }}
                  onNavigateToDocuments={() => {
                    setActiveTab('documents');
                    setTimeout(() => {
                      document.getElementById('ai-documents-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 100);
                  }}
                />
              </TabsContent>

              <TabsContent value="timeline" className="mt-4">
                <AICaseTimeline workspaceId={workspace.id} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>

      <AICaseChatDrawer
        open={chatPanelOpen}
        onOpenChange={setChatPanelOpen}
        workspaceId={workspace?.id ?? caseId ?? ''}
        workspaceName={workspace?.name ?? null}
        documents={documents}
        externalQuestion={chatQuestion}
        onExternalQuestionHandled={() => setChatQuestion(null)}
      />

      <AIPricingModal open={pricingOpen} onOpenChange={setPricingOpen} />
    </div>
  );
}
