import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, FileText, Loader2, Lock, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import posthog from 'posthog-js';
import {
  useAIDocuments,
  useAIDocumentAnalysis,
  useAnalyzeAIDocument,
  useProcessAIDocument,
  type AIDocument,
} from '@/hooks/useAIDocuments';
import { AIDocumentUpload } from '@/components/legalup-ai/AIDocumentUpload';
import { AIDocumentList } from '@/components/legalup-ai/AIDocumentList';
import { AIAnalysisView } from '@/components/legalup-ai/AIAnalysisView';
import { AIChat } from '@/components/legalup-ai/AIChat';
import { resolveSelectableAIModel } from '@/lib/aiModels';
import { AIAnalysisModelSelect } from './AIAnalysisModelSelect';

export type AICaseDocumentsWorkspaceProps = {
  workspaceId: string | null | undefined;
  /** Canonical lazy provisioning. Legacy passes a resolved id instead. */
  ensureWorkspace?: () => Promise<string>;
  canAnalyze: boolean;
  canChat: boolean;
  accessLoading: boolean;
  /**
   * Legacy gates the whole grid (upload included) behind analysis entitlement.
   * Canonical keeps upload/list always visible (4.30B: upload allowed, backend
   * gates processing/analysis) and locks only the analysis column.
   */
  gateUploadOnAnalyze?: boolean;
  /** Paywall CTA label: legacy "Ver planes", canonical "Ver LegalUp Pro". */
  upgradeCtaLabel: string;
  onUpgrade: () => void;
  /** Owner opens its chat drawer with the document pre-selected. */
  onAskDocument: (documentId: string) => void;
  /** PostHog {source} for document events. */
  analyticsSource: string;
};

/**
 * 4.34P — shared Documents & Analysis workspace presentation.
 * Exact legacy AI Case layout (two columns: list+chat / analysis), fed by the
 * same hooks/backend in legacy and canonical surfaces. Owners differ only in
 * paywall CTA, chat-drawer wiring and provisioning.
 */
export function AICaseDocumentsWorkspace({
  workspaceId,
  ensureWorkspace,
  canAnalyze,
  canChat,
  accessLoading,
  gateUploadOnAnalyze = false,
  upgradeCtaLabel,
  onUpgrade,
  onAskDocument,
  analyticsSource,
}: AICaseDocumentsWorkspaceProps) {
  const documentsQuery = useAIDocuments(workspaceId || undefined);
  const documents = useMemo(() => documentsQuery.data ?? [], [documentsQuery.data]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [documentModels, setDocumentModels] = useState<Record<string, string>>({});
  const processMutation = useProcessAIDocument();
  const analyzeMutation = useAnalyzeAIDocument();
  const busy = useRef(false);

  const selectedDoc =
    documents.find((doc) => doc.id === selectedDocId) ?? documents[0] ?? null;
  const modelKey = `${workspaceId}/${selectedDoc?.id ?? ''}`;
  const model = resolveSelectableAIModel(documentModels[modelKey] ?? selectedDoc?.model);
  const setModel = (value: string) => {
    setDocumentModels(current => ({ ...current, [modelKey]: resolveSelectableAIModel(value) }));
  };

  useEffect(() => {
    if (selectedDocId && !documents.some((doc) => doc.id === selectedDocId)) {
      setSelectedDocId(null);
    }
  }, [documents, selectedDocId]);

  const analysisQuery = useAIDocumentAnalysis(
    selectedDoc?.id,
    selectedDoc?.analysis_status === 'ready',
  );

  const handleProcess = (id: string) => {
    posthog.capture('ai_document_processing_started', { source: analyticsSource });
    processMutation.mutate(id, {
      onSuccess: () => posthog.capture('ai_document_processing_completed', { source: analyticsSource }),
      onError: () => posthog.capture('ai_document_processing_failed', { source: analyticsSource }),
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
    if (!selectedDoc || !canAnalyze || accessLoading || analyzeMutation.isPending || selectedDoc.analysis_status === 'processing' || busy.current) return;
    busy.current = true;
    posthog.capture('ai_document_analysis_started', { model, source: analyticsSource });
    analyzeMutation.mutate(
      { documentId: selectedDoc.id, model },
      {
        onSuccess: () => posthog.capture('ai_document_analysis_completed', { model, source: analyticsSource }),
        onError: (err: Error & { code?: string }) => {
          posthog.capture('ai_document_analysis_failed', { model, source: analyticsSource, error_code: err?.code });
          // 4.38C: commercial limit analytics (safe props only, never content).
          if (err?.code === 'AI_ANALYSIS_LIMIT_REACHED') {
            posthog.capture('ai_usage_limit_reached', { capability: 'analysis', code: err.code, source: analyticsSource });
          }
        },
        onSettled: () => {
          busy.current = false;
        },
      },
    );
  };

  const handleAskDocument = (doc: AIDocument) => {
    onAskDocument(doc.id);
    posthog.capture('ai_document_chat_clicked', { source: analyticsSource });
  };

  if (accessLoading) {
    return (
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
    );
  }

  if (!canAnalyze && gateUploadOnAnalyze) {
    return (
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
              Tu plan actual no incluye el análisis de documentos.
            </p>
          </div>
          <Button
            type="button"
            onClick={onUpgrade}
            className="bg-gray-900 text-white hover:bg-green-900"
          >
            {upgradeCtaLabel}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const analysisColumn = !canAnalyze ? (
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
            Tu plan actual no incluye el análisis de documentos.
          </p>
        </div>
        <Button
          type="button"
          onClick={onUpgrade}
          className="bg-gray-900 text-white hover:bg-green-900"
        >
          {upgradeCtaLabel}
        </Button>
      </CardContent>
    </Card>
  ) : null;

  return (
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
                workspaceId={workspaceId || ensureWorkspace}
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
                    Tu plan actual no incluye el chat contextual.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={onUpgrade}
                  className="bg-gray-900 text-white hover:bg-green-900"
                >
                  {upgradeCtaLabel}
                </Button>
              </CardContent>
            </Card>
          ) : workspaceId ? (
            <AIChat
              workspaceId={workspaceId}
              documents={documents}
              onUploadClick={() =>
                document
                  .getElementById('ai-documents-section')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
            />
          ) : null}
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
            {/* 4.38C: commercial limit banner (mutation-level, any analysis state). */}
            {(analyzeMutation.error as Error & { code?: string } | null)?.code === 'AI_ANALYSIS_LIMIT_REACHED' && (
              <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Alcanzaste los 40 análisis de documentos incluidos este mes. Se renovarán el próximo mes.
              </p>
            )}
            {analysisColumn ?? (!selectedDoc ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <p className="text-sm text-muted-foreground">
                  Selecciona un documento para analizarlo.
                </p>
              </div>
            ) : selectedDoc.analysis_status === 'processing' ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-green-700" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900">
                  Generando análisis…
                </p>
                <p className="max-w-sm text-xs text-muted-foreground">
                  Estamos revisando el documento. Esto puede tomar
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
                <div className="w-full max-w-md space-y-2 text-left">
                  <p className="text-sm font-medium">Modelo para reintentar</p>
                  <AIAnalysisModelSelect model={model} onModelChange={setModel} disabled={analyzeMutation.isPending} />
                </div>
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
            ))}
            {canAnalyze && selectedDoc && selectedDoc.analysis_status === 'ready' && (
              <div className="mt-4 flex justify-end border-t pt-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAskDocument(selectedDoc)}
                >
                  Preguntar sobre este documento
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
