import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAIDocuments, useAIDocumentAnalysis, useAnalyzeAIDocument, useProcessAIDocument } from '@/hooks/useAIDocuments';
import { AIDocumentUpload } from '@/components/legalup-ai/AIDocumentUpload';
import { AIDocumentList } from '@/components/legalup-ai/AIDocumentList';
import { AIAnalysisView } from '@/components/legalup-ai/AIAnalysisView';
import { AICaseChatDrawer } from '@/components/legalup-ai/AICaseChatDrawer';
import { DEFAULT_AI_MODEL } from '@/lib/aiModels';
import { toast } from 'sonner';
import posthog from 'posthog-js';

type Props = {
  workspaceId: string | null;
  ensureWorkspace: () => Promise<string>;
  canAnalyze: boolean;
  accessLoading: boolean;
  onUpgrade: () => void;
  onOpenAI: () => void;
};

export function CaseDocuments({ workspaceId, ensureWorkspace, canAnalyze, accessLoading, onUpgrade, onOpenAI }: Props) {
  const documents = useAIDocuments(workspaceId || undefined);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [model, setModel] = useState(DEFAULT_AI_MODEL);
  const analyze = useAnalyzeAIDocument();
  const processMutation = useProcessAIDocument();
  const busy = useRef(false);
  const selected = documents.data?.find(doc => doc.id === selectedId);
  const analysis = useAIDocumentAnalysis(selected?.id, canAnalyze && selected?.analysis_status === 'ready');
  // Chat drawer local: misma conversación del caso (get-or-create en backend),
  // con documento seleccionado priorizado. Cerrar vuelve al mismo documento.
  const [chatOpen, setChatOpen] = useState(false);
  const [chatDocumentId, setChatDocumentId] = useState<string | null>(null);
  const [chatQuestion, setChatQuestion] = useState<string | null>(null);
  // Paridad de extracción con standalone (4.34C, cero LLM): procesa pendientes automáticamente.
  useEffect(() => {
    const pending = documents.data?.find((doc) => doc.status === 'pending');
    if (pending && !processMutation.isPending) {
      posthog.capture('ai_document_processing_started', { source: 'case_documents' });
      processMutation.mutate(pending.id, {
        onSuccess: () => posthog.capture('ai_document_processing_completed', { source: 'case_documents' }),
        onError: () => posthog.capture('ai_document_processing_failed', { source: 'case_documents' }),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documents.data, processMutation.isPending]);
  const handleAnalyze = () => {
    if (!canAnalyze || accessLoading || !selected || busy.current || selected.analysis_status === 'processing') return;
    busy.current = true;
    analyze.mutate({ documentId: selected.id, model }, {
      onError: error => toast.error('No se pudo analizar el documento.', { description: error.message }),
      onSettled: () => { busy.current = false; },
    });
  };
  return <div className="space-y-4">
    {!documents.data?.length && <div>
      <p className="text-sm">Agrega documentos a este caso</p>
      <p className="text-sm text-muted-foreground">Sube contratos, escritos, resoluciones u otros antecedentes para mantenerlos asociados al caso y analizarlos cuando lo necesites.</p>
    </div>}
    {/* Keep this mounted when provisioning changes the document query's loading state. */}
    <AIDocumentUpload workspaceId={workspaceId || undefined} ensureWorkspace={ensureWorkspace} onUploaded={doc => setSelectedId(doc.id)} />
    {documents.isLoading ? <Skeleton className="h-20 w-full" /> : documents.isError ? <div role="alert">
      No se pudieron cargar los documentos. <Button variant="outline" onClick={() => documents.refetch()}>Reintentar</Button>
    </div> : <AIDocumentList documents={documents.data ?? []} selectedId={selectedId} onSelect={setSelectedId} />}
    {selected && <section className="space-y-3" aria-label="Análisis del documento">
      {accessLoading ? <Skeleton className="h-12 w-full" /> : !canAnalyze ? <div className="rounded-lg border p-4 space-y-2">
        <p>Las herramientas de IA están incluidas en LegalUp Pro.</p>
        <Button onClick={onUpgrade}>Ver LegalUp Pro</Button>
      </div> : <>
        {selected.analysis_error && <p role="alert" className="text-sm text-destructive">{selected.analysis_error}</p>}
        <AIAnalysisView analysis={analysis.data ?? null} model={model} analyzing={analyze.isPending || selected.analysis_status === 'processing'} onModelChange={setModel} onAnalyze={handleAnalyze} />
        {selected.analysis_status === 'ready' && <Button variant="outline" onClick={onOpenAI}>Trabajar el caso con IA</Button>}
        {selected.analysis_status === 'ready' && workspaceId && <Button
          variant="outline"
          onClick={() => {
            setChatDocumentId(selected.id);
            setChatQuestion('¿Qué aspectos relevantes debería revisar en este documento?');
            setChatOpen(true);
            posthog.capture('ai_document_chat_clicked', { source: 'case_documents' });
          }}
        >Preguntar sobre este documento</Button>}
      </>}
    </section>}
    {workspaceId && <AICaseChatDrawer
      open={chatOpen}
      onOpenChange={(open) => {
        setChatOpen(open);
        if (!open) { setChatDocumentId(null); setChatQuestion(null); }
      }}
      workspaceId={workspaceId}
      documents={documents.data ?? []}
      documentId={chatDocumentId}
      externalQuestion={chatQuestion}
      onExternalQuestionHandled={() => setChatQuestion(null)}
    />}
  </div>;
}
