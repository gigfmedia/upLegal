import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AICaseCommandCenter } from '@/components/legalup-ai/AICaseCommandCenter';
import { AICaseIntelligence } from '@/components/legalup-ai/AICaseIntelligence';
import { AICaseTimeline } from '@/components/legalup-ai/AICaseTimeline';
import { AIResearchPanel } from '@/components/legalup-ai/AIResearchPanel';
import { AICaseChatDrawer } from '@/components/legalup-ai/AICaseChatDrawer';
import { useAIDocuments } from '@/hooks/useAIDocuments';

export type AICaseWorkspaceContentProps = {
  workspaceId: string;
  workspaceName: string | null;
  embedded?: boolean;
  onOpenDocuments?: () => void;
};

export function AICaseWorkspaceContent({ workspaceId, workspaceName, embedded = false, onOpenDocuments }: AICaseWorkspaceContentProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [chatQuestion, setChatQuestion] = useState<string | null>(null);
  const [chatPanelOpen, setChatPanelOpen] = useState(false);
  const [chatOrigin, setChatOrigin] = useState<string | null>(null);
  const [pendingWorkflowActionId, setPendingWorkflowActionId] = useState<string | null>(null);
  const [briefWorkflowActionId, setBriefWorkflowActionId] = useState<string | null>(null);
  const [chatDocumentId, setChatDocumentId] = useState<string | null>(null);
  const documentsQuery = useAIDocuments(workspaceId);
  const documents = documentsQuery.data ?? [];

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

  return (
    <div className={embedded ? '' : 'space-y-4'}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className={embedded ? '' : 'mb-6'}>
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
            onOpenWorkflowAction={(id) => setBriefWorkflowActionId(id)}
            onViewDocuments={() => onOpenDocuments ? onOpenDocuments() : setActiveTab('documents')}
            onViewIntelligence={() => setActiveTab('intelligence')}
            onAskQuestion={(q) => { setChatOrigin('command_center'); setPendingWorkflowActionId(null); setChatDocumentId(null); setChatQuestion(q); setChatPanelOpen(true); }}
            onWorkflowAsk={(q, actionId) => { setChatOrigin('workflow'); setPendingWorkflowActionId(actionId); setChatDocumentId(null); setChatQuestion(q); setChatPanelOpen(true); }}
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
            externalWorkflowActionId={briefWorkflowActionId}
            onExternalWorkflowActionHandled={() => setBriefWorkflowActionId(null)}
            onQuestionClick={(q) => { setChatOrigin('intelligence'); setPendingWorkflowActionId(null); setChatDocumentId(null); setChatQuestion(q); setChatPanelOpen(true); }}
            onWorkflowAsk={(q, actionId) => { setChatOrigin('workflow'); setPendingWorkflowActionId(actionId); setChatDocumentId(null); setChatQuestion(q); setChatPanelOpen(true); }}
            onOpenChat={() => { setChatOrigin('intelligence'); setPendingWorkflowActionId(null); setChatDocumentId(null); setChatPanelOpen(true); }}
            onNavigateToDocuments={() => onOpenDocuments ? onOpenDocuments() : setActiveTab('documents')}
          />
        </TabsContent>
        <TabsContent value="timeline" className="mt-4">
          <AICaseTimeline workspaceId={workspaceId} />
        </TabsContent>
      </Tabs>

      <AICaseChatDrawer
        open={chatPanelOpen}
        onOpenChange={handleChatOpenChange}
        workspaceId={workspaceId}
        workspaceName={workspaceName}
        documents={documents}
        documentId={chatDocumentId}
        externalQuestion={chatQuestion}
        onExternalQuestionHandled={() => setChatQuestion(null)}
      />
    </div>
  );
}
