import { useState } from 'react';
import { AICaseDocumentsWorkspace } from '@/components/legalup-ai/AICaseDocumentsWorkspace';
import { AICaseChatDrawer } from '@/components/legalup-ai/AICaseChatDrawer';
import { useAIDocuments } from '@/hooks/useAIDocuments';

type Props = {
  workspaceId: string | null;
  ensureWorkspace: () => Promise<string>;
  canAnalyze: boolean;
  canChat: boolean;
  accessLoading: boolean;
  onUpgrade: () => void;
};

export function CaseDocuments({ workspaceId, ensureWorkspace, canAnalyze, canChat, accessLoading, onUpgrade }: Props) {
  const documentsQuery = useAIDocuments(workspaceId || undefined);
  // Chat drawer local: misma conversación del caso (get-or-create en backend),
  // con documento seleccionado priorizado. Cerrar vuelve al mismo documento.
  const [chatOpen, setChatOpen] = useState(false);
  const [chatDocumentId, setChatDocumentId] = useState<string | null>(null);
  const [chatQuestion, setChatQuestion] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {!documentsQuery.data?.length && <div>
        <p className="text-sm">Agrega documentos a este caso</p>
        <p className="text-sm text-muted-foreground">Sube contratos, escritos, resoluciones u otros antecedentes para mantenerlos asociados al caso y analizarlos cuando lo necesites.</p>
      </div>}
      {/* Keep mounted when provisioning changes the document query's loading state. */}
      <AICaseDocumentsWorkspace
        workspaceId={workspaceId || undefined}
        ensureWorkspace={ensureWorkspace}
        canAnalyze={canAnalyze}
        canChat={canChat}
        accessLoading={accessLoading}
        upgradeCtaLabel="Ver LegalUp Pro"
        onUpgrade={onUpgrade}
        onAskDocument={(documentId) => {
          setChatDocumentId(documentId);
          setChatQuestion('¿Qué aspectos relevantes debería revisar en este documento?');
          setChatOpen(true);
        }}
        analyticsSource="case_documents"
      />
      {workspaceId && <AICaseChatDrawer
        open={chatOpen}
        onOpenChange={(open) => {
          setChatOpen(open);
          if (!open) { setChatDocumentId(null); setChatQuestion(null); }
        }}
        workspaceId={workspaceId}
        documents={documentsQuery.data ?? []}
        documentId={chatDocumentId}
        externalQuestion={chatQuestion}
        onExternalQuestionHandled={() => setChatQuestion(null)}
      />}
    </div>
  );
}
