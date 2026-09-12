import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { AICaseCommandCenter } from '@/components/legalup-ai/AICaseCommandCenter';
import { AICaseIntelligence } from '@/components/legalup-ai/AICaseIntelligence';
import { AICaseTimeline } from '@/components/legalup-ai/AICaseTimeline';
import { AIResearchPanel } from '@/components/legalup-ai/AIResearchPanel';
import { AICaseChatDrawer } from '@/components/legalup-ai/AICaseChatDrawer';
import { useAIDocuments } from '@/hooks/useAIDocuments';

export type AICaseWorkspaceMode = 'embedded-case' | 'standalone';

export type AICaseWorkspaceContentProps = {
  workspaceId: string;
  workspaceName: string | null;
  embedded?: boolean;
  /** 4.30C: flattened UX inside lawyer cases vs full legacy tabs. Defaults: embedded → 'embedded-case', otherwise 'standalone'. */
  mode?: AICaseWorkspaceMode;
  onOpenDocuments?: () => void;
};

function useChatState() {
  const [chatQuestion, setChatQuestion] = useState<string | null>(null);
  const [chatPanelOpen, setChatPanelOpen] = useState(false);
  const [chatOrigin, setChatOrigin] = useState<string | null>(null);
  const [pendingWorkflowActionId, setPendingWorkflowActionId] = useState<string | null>(null);
  const [briefWorkflowActionId, setBriefWorkflowActionId] = useState<string | null>(null);
  const [chatDocumentId, setChatDocumentId] = useState<string | null>(null);

  const handleChatOpenChange = (open: boolean) => {
    setChatPanelOpen(open);
    if (!open && chatOrigin === 'workflow' && pendingWorkflowActionId) {
      setBriefWorkflowActionId(pendingWorkflowActionId);
      setChatOrigin(null);
      setPendingWorkflowActionId(null);
      setChatDocumentId(null);
    } else if (!open) {
      setChatOrigin(null);
      setPendingWorkflowActionId(null);
      setChatDocumentId(null);
    }
  };

  return {
    chatQuestion, setChatQuestion,
    chatPanelOpen, setChatPanelOpen,
    chatOrigin, setChatOrigin,
    pendingWorkflowActionId, setPendingWorkflowActionId,
    briefWorkflowActionId, setBriefWorkflowActionId,
    chatDocumentId, setChatDocumentId,
    handleChatOpenChange,
  };
}

export function AICaseWorkspaceContent({ workspaceId, workspaceName, embedded = false, mode, onOpenDocuments }: AICaseWorkspaceContentProps) {
  const isEmbedded = mode ? mode === 'embedded-case' : embedded;
  const documentsQuery = useAIDocuments(workspaceId);
  const documents = documentsQuery.data ?? [];
  const chat = useChatState();
  const [showIntelligence, setShowIntelligence] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const chatDrawer = (
    <AICaseChatDrawer
      open={chat.chatPanelOpen}
      onOpenChange={chat.handleChatOpenChange}
      workspaceId={workspaceId}
      workspaceName={workspaceName}
      documents={documents}
      documentId={chat.chatDocumentId}
      externalQuestion={chat.chatQuestion}
      onExternalQuestionHandled={() => chat.setChatQuestion(null)}
    />
  );

  // 4.30C: embedded lawyer-case experience — flattened, no nested tab bar.
  // Command Center is the default surface; deep intelligence is a local
  // subview ("Ver análisis completo"). No inner Documents tab (outer Case
  // Documents is canonical), no Research surface (Pro does not include it;
  // legacy keeps it in standalone route).
  if (isEmbedded) {
    return (
      <div className="space-y-6">
        <AICaseCommandCenter
          workspaceId={workspaceId}
          workspaceName={workspaceName || ''}
          onOpenWorkflowAction={(id) => chat.setBriefWorkflowActionId(id)}
          onViewDocuments={() => onOpenDocuments?.()}
          onViewIntelligence={() => setShowIntelligence(true)}
          onAskQuestion={(q) => { chat.setChatOrigin('command_center'); chat.setPendingWorkflowActionId(null); chat.setChatDocumentId(null); chat.setChatQuestion(q); chat.setChatPanelOpen(true); }}
          onWorkflowAsk={(q, actionId) => { chat.setChatOrigin('workflow'); chat.setPendingWorkflowActionId(actionId); chat.setChatDocumentId(null); chat.setChatQuestion(q); chat.setChatPanelOpen(true); }}
        />

        {!showIntelligence ? (
          <div>
            <Button type="button" variant="outline" className="w-full" onClick={() => setShowIntelligence(true)}>
              Ver análisis completo
            </Button>
          </div>
        ) : (
          <section aria-label="Análisis completo del caso">
            <Button type="button" variant="ghost" className="-ml-2 mb-2" onClick={() => setShowIntelligence(false)}>
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Volver al resumen
            </Button>
            <AICaseIntelligence
              workspaceId={workspaceId}
              externalWorkflowActionId={chat.briefWorkflowActionId}
              onExternalWorkflowActionHandled={() => chat.setBriefWorkflowActionId(null)}
              onQuestionClick={(q) => { chat.setChatOrigin('intelligence'); chat.setPendingWorkflowActionId(null); chat.setChatDocumentId(null); chat.setChatQuestion(q); chat.setChatPanelOpen(true); }}
              onWorkflowAsk={(q, actionId) => { chat.setChatOrigin('workflow'); chat.setPendingWorkflowActionId(actionId); chat.setChatDocumentId(null); chat.setChatQuestion(q); chat.setChatPanelOpen(true); }}
              onOpenChat={() => { chat.setChatOrigin('intelligence'); chat.setPendingWorkflowActionId(null); chat.setChatDocumentId(null); chat.setChatPanelOpen(true); }}
              onNavigateToDocuments={() => onOpenDocuments?.()}
            />
          </section>
        )}

        {chatDrawer}
      </div>
    );
  }

  // Standalone legacy route — preserve full tabs (documents, research, timeline).
  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="sticky top-16 z-10 mb-4 flex h-auto w-full flex-wrap justify-start gap-0 border border-gray-200 bg-white shadow-sm p-0">
          <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground data-[state=active]:border-green-900 data-[state=active]:bg-transparent data-[state=active]:text-green-900">Resumen</TabsTrigger>
          <TabsTrigger value="documents" className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground data-[state=active]:border-green-900 data-[state=active]:bg-transparent data-[state=active]:text-green-900">Documentos</TabsTrigger>
          <TabsTrigger value="research" className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground data-[state=active]:border-green-900 data-[state=active]:bg-transparent data-[state=active]:text-green-900">Investigar</TabsTrigger>
          <TabsTrigger value="intelligence" className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground data-[state=active]:border-green-900 data-[state=active]:bg-transparent data-[state=active]:text-green-900">Inteligencia</TabsTrigger>
          <TabsTrigger value="timeline" className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground data-[state=active]:border-green-900 data-[state=active]:bg-transparent data-[state=active]:text-green-900">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <AICaseCommandCenter
            workspaceId={workspaceId}
            workspaceName={workspaceName || ''}
            onOpenWorkflowAction={(id) => chat.setBriefWorkflowActionId(id)}
            onViewDocuments={() => onOpenDocuments ? onOpenDocuments() : setActiveTab('documents')}
            onViewIntelligence={() => setActiveTab('intelligence')}
            onAskQuestion={(q) => { chat.setChatOrigin('command_center'); chat.setPendingWorkflowActionId(null); chat.setChatDocumentId(null); chat.setChatQuestion(q); chat.setChatPanelOpen(true); }}
            onWorkflowAsk={(q, actionId) => { chat.setChatOrigin('workflow'); chat.setPendingWorkflowActionId(actionId); chat.setChatDocumentId(null); chat.setChatQuestion(q); chat.setChatPanelOpen(true); }}
          />
        </TabsContent>
        <TabsContent value="documents" className="mt-4">
          <div className="text-sm text-muted-foreground">Los documentos de este caso se gestionan con LegalUp AI. Usa la pestaña Documentos del caso Pro si necesitas ver el listado unificado.</div>
        </TabsContent>
        <TabsContent value="research" forceMount className="mt-4 data-[state=inactive]:hidden">
          <AIResearchPanel workspaceId={workspaceId} />
        </TabsContent>
        <TabsContent value="intelligence" className="mt-4">
          <AICaseIntelligence
            workspaceId={workspaceId}
            externalWorkflowActionId={chat.briefWorkflowActionId}
            onExternalWorkflowActionHandled={() => chat.setBriefWorkflowActionId(null)}
            onQuestionClick={(q) => { chat.setChatOrigin('intelligence'); chat.setPendingWorkflowActionId(null); chat.setChatDocumentId(null); chat.setChatQuestion(q); chat.setChatPanelOpen(true); }}
            onWorkflowAsk={(q, actionId) => { chat.setChatOrigin('workflow'); chat.setPendingWorkflowActionId(actionId); chat.setChatDocumentId(null); chat.setChatQuestion(q); chat.setChatPanelOpen(true); }}
            onOpenChat={() => { chat.setChatOrigin('intelligence'); chat.setPendingWorkflowActionId(null); chat.setChatDocumentId(null); chat.setChatPanelOpen(true); }}
            onNavigateToDocuments={() => onOpenDocuments ? onOpenDocuments() : setActiveTab('documents')}
          />
        </TabsContent>
        <TabsContent value="timeline" className="mt-4">
          <AICaseTimeline workspaceId={workspaceId} />
        </TabsContent>
      </Tabs>

      {chatDrawer}
    </div>
  );
}
