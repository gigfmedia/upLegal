import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import posthog from 'posthog-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useLawyerCase, useLawyerCases, type CaseStatus, type LawyerCase } from '@/hooks/useLawyerCases';
import { useLawyerClients } from '@/hooks/useLawyerClients';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Calendar, CalendarDays, Clock, ListChecks, Plus, Sparkles, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AICaseCommandCenter } from '@/components/legalup-ai/AICaseCommandCenter';
import { AICaseFreeSnapshot } from '@/components/legalup-ai/AICaseFreeSnapshot';
import { AICaseLatestAnalysis } from '@/components/legalup-ai/AICaseLatestAnalysis';
import { AICaseIntelligence } from '@/components/legalup-ai/AICaseIntelligence';
import { AICaseDrafts } from '@/components/legalup-ai/AICaseDrafts';
import { AIResearchPanel } from '@/components/legalup-ai/AIResearchPanel';
import { AICaseChatDrawer } from '@/components/legalup-ai/AICaseChatDrawer';
import { CaseActivity } from '@/components/lawyer/CaseActivity';
import { useAIDocuments } from '@/hooks/useAIDocuments';
import { useAIFeatureAccess } from '@/hooks/useAISubscription';
import { useProSubscription } from '@/hooks/useProSubscription';
import { useCaseDocumentWorkspace } from '@/hooks/useCaseDocumentWorkspace';
import { ProPricingModal } from '@/components/legalup-pro/ProPricingModal';
import { CaseDocuments } from '@/components/lawyer/CaseDocuments';
import { CaseEditDialog } from '@/components/lawyer/CaseEditDialog';
import { CaseDescriptionCard } from '@/components/legalup-ai/CaseDescriptionCard';
import { CaseManagementDrawer } from '@/components/lawyer/CaseManagementDrawer';
import { useCaseControlSummary } from '@/hooks/useCaseTasks';
import { CASE_STATUS_COLORS } from '@/lib/caseStatus';
import { BOOKING_STATUS_LABELS as bookingStatusLabels, CASE_SOURCE_LABELS as sourceLabels, CASE_STATUS_LABELS as statusLabels } from '@/lib/caseLabels';

export default function CaseDetailPage() {
  const { caseId } = useParams();
  const { user } = useAuth();
  return <CaseDetailContent key={`${user?.id}:${caseId}`} />;
}

function CaseDetailContent() {
  const { caseId } = useParams<{ caseId: string }>();
  const { caseData, loading, error } = useLawyerCase(caseId);
  const { clients } = useLawyerClients();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [caseBookings, setCaseBookings] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [patched, setPatched] = useState<Partial<LawyerCase> | null>(null);
  // 4.34L: administrative editing lives in the Edit modal. The merged view
  // reflects saves without reload (useLawyerCase fetches once per case).
  useEffect(() => { setPatched(null); }, [caseId]);
  const viewCase = useMemo(() => caseData ? { ...caseData, ...patched } : null, [caseData, patched]);
  // 5.1B — resumen liviano para el trigger "Gestionar caso" (sin detalle inline).
  const controlSummary = useCaseControlSummary(
    viewCase?.id,
    viewCase ? { next_action_due_at: viewCase.next_action_due_at ?? null, next_action_completed_at: viewCase.next_action_completed_at ?? null } : null
  );
  const [manageOpen, setManageOpen] = useState(false);
  // Al cerrar el drawer, el resumen del trigger se refresca (ej: 4→3 pendientes).
  const manageOpenRef = useRef(manageOpen);
  useEffect(() => {
    if (manageOpenRef.current && !manageOpen) controlSummary.refetch();
    manageOpenRef.current = manageOpen;
  }, [manageOpen]);
  const manageLabel = controlSummary.overdueCount > 0
    ? `Gestionar caso · ${controlSummary.overdueCount} vencido${controlSummary.overdueCount === 1 ? '' : 's'}`
    : controlSummary.pendingCount > 0
      ? `Gestionar caso · ${controlSummary.pendingCount} pendiente${controlSummary.pendingCount === 1 ? '' : 's'}`
      : 'Gestionar caso';
  const manageAlert = controlSummary.overdueCount > 0;
  const [searchParams, setSearchParams] = useSearchParams();
  // 4.34K: direct capability tabs. Backward compat: legacy ?tab=ai[&view=]
  // maps to the equivalent direct tab (4.34J deep links keep working).
  const CASE_TABS = ['overview', 'documents', 'research', 'intelligence', 'drafts', 'activity'] as const;
  const rawTab = (searchParams.get('tab') as string) || 'overview';
  const rawView = searchParams.get('view');
  const activeTab: string = rawTab === 'ai'
    ? (rawView === 'intelligence' ? 'intelligence' : rawView === 'research' ? 'research' : 'overview')
    : (CASE_TABS as readonly string[]).includes(rawTab) ? rawTab : 'overview';
  const setActiveTab = (v: string) => setSearchParams(prev => { const p = new URLSearchParams(prev); p.set('tab', v); return p; }, { replace: true });
  const { workspaceId: effectiveWorkspaceId, ensureWorkspace } = useCaseDocumentWorkspace(caseId, caseData?.id === caseId ? caseData.ai_workspace_id : null);
  const { canUse, isLoading: accessLoading, plan: aiPlan } = useAIFeatureAccess();
  const [proOpen, setProOpen] = useState(false);
  // 4.37D — manual appointment creation requires active Pro (same gate as
  // /lawyer/citas). Dedicated modal instance: triggerAction must stay
  // create_appointment, distinct from the case_ai instance below.
  const { hasProAccess } = useProSubscription();
  const [apptPaywallOpen, setApptPaywallOpen] = useState(false);
  // 4.34K: case-level chat (shared conversation, same as embedded IA drawer).
  const chatDocumentsQuery = useAIDocuments(effectiveWorkspaceId || undefined);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatQuestion, setChatQuestion] = useState<string | null>(null);
  const [chatDocumentId, setChatDocumentId] = useState<string | null>(null);
  // 4.46B — Overview "Ver documento" selects the analyzed document in the
  // Documents tab (controlled selection; absent = legacy internal state).
  const [overviewDocId, setOverviewDocId] = useState<string | null>(null);
  const [briefWorkflowActionId, setBriefWorkflowActionId] = useState<string | null>(null);
  // 4.34T: workflow origin tracking (legacy parity: close restores same action).
  const [chatOrigin, setChatOrigin] = useState<string | null>(null);
  const [pendingWorkflowActionId, setPendingWorkflowActionId] = useState<string | null>(null);
  const chatOpenRef = useRef(false);
  const openCaseChat = (
    question: string | null,
    documentId: string | null = null,
    origin: string | null = null,
    workflowActionId: string | null = null,
  ) => {
    // 4.34T: one analytics event per actual open (legacy ai_case_chat_panel_opened).
    if (!chatOpenRef.current) posthog.capture('ai_case_chat_panel_opened', { source: origin ?? 'case' });
    chatOpenRef.current = true;
    setChatQuestion(question);
    setChatDocumentId(documentId);
    setChatOrigin(origin);
    setPendingWorkflowActionId(workflowActionId);
    setChatOpen(true);
  };
  const handleChatOpenChange = (open: boolean) => {
    setChatOpen(open);
    chatOpenRef.current = open;
    if (!open) {
      // 4.34T: workflow origin restores the same action immediately; other
      // origins never touch workflow state. Pending state always cleared.
      if (chatOrigin === 'workflow' && pendingWorkflowActionId) {
        setBriefWorkflowActionId(pendingWorkflowActionId);
      }
      setChatOrigin(null);
      setPendingWorkflowActionId(null);
      setChatQuestion(null);
      setChatDocumentId(null);
    }
  };
  const researchLocked = !accessLoading && !canUse('jurisprudence');

  useEffect(() => {
    if (!caseId || !user?.id) return;
    setLoadingBookings(true);
    supabase
      .from('bookings')
      .select('id, user_name, service_title, scheduled_date, scheduled_time, duration, status, price, created_at')
      .eq('case_id', caseId)
      .eq('lawyer_id', user.id)
      .order('scheduled_date', { ascending: true })
      .order('scheduled_time', { ascending: true })
      .then(({ data, error }) => {
        if (!error) setCaseBookings(data || []);
        setLoadingBookings(false);
      });
  }, [caseId, user?.id]);

  const handleNewAppointmentForCase = () => {
    // 4.37D — entitlement first: no form, no client lookup, no mutation
    // before the paywall. Active Pro falls through to the case-scoped flow.
    if (!hasProAccess) {
      posthog.capture('pro_paywall_opened', { action: 'create_appointment' });
      setApptPaywallOpen(true);
      return;
    }
    if (!caseData?.client_id) {
      toast({ title: 'Asocia un cliente', description: 'Este caso no tiene cliente. Asocia un cliente antes de crear una cita.', variant: 'destructive' });
      return;
    }
    navigate(`/lawyer/citas?caseId=${caseId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-8 py-6">
        <Loader2 className="h-8 w-8 animate-spin text-gray-900" />
      </div>
    );
  }
  if (error || !caseData || !viewCase) {
    return (
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Button variant="ghost" onClick={() => navigate('/lawyer/cases')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver
        </Button>
        <p className="text-center text-gray-600 mt-8">{error || 'Caso no encontrado'}</p>
      </div>
    );
  }


  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <Button variant="ghost" onClick={() => navigate('/lawyer/cases')}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Volver
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">{viewCase.title}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge className={`${CASE_STATUS_COLORS[viewCase.status] || 'bg-gray-100 text-gray-800'} border-0`}>{statusLabels[viewCase.status] || viewCase.status}</Badge>
            {viewCase.client && (
              <Link to={`/lawyer/clients/${viewCase.client_id}`} className="font-medium text-gray-900 hover:underline">
                {viewCase.client.name}
              </Link>
            )}
            {viewCase.practice_area && <Badge variant="secondary">{viewCase.practice_area}</Badge>}
            {viewCase.stage && <Badge variant="outline">Etapa: {viewCase.stage}</Badge>}
            {caseBookings.some((b) => b.status === 'confirmed') && (
              <Link to="/lawyer/citas" className="hover:underline">Reserva confirmada</Link>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" onClick={() => setManageOpen(true)} aria-label="Gestionar caso">
            {manageAlert
              ? <AlertTriangle className="h-4 w-4 mr-1" aria-hidden="true" />
              : <ListChecks className="h-4 w-4 mr-1" aria-hidden="true" />} {manageLabel}
          </Button>
          <Button type="button" variant="outline" onClick={() => setEditOpen(true)}>
            Editar caso
          </Button>
        </div>
      </div>
      {caseData && (
        <CaseEditDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          caseData={viewCase}
          clients={clients}
          onSaved={(row) => setPatched(row)}
        />
      )}

      {/* 4.34Q: persistent Case context above tabs (legacy hierarchy).
          5.1C: origen + monto como metadata secundaria read-only (solo con
          valor; la edición vive en "Editar caso", nunca en el drawer). */}
      <div className="my-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
          Creado: {format(new Date(viewCase.created_at), "d 'de' MMMM yyyy", { locale: es })}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-4 w-4" aria-hidden="true" />
          Actualizado: {format(new Date(viewCase.updated_at), "d 'de' MMMM yyyy", { locale: es })}
        </span>
        {viewCase.source && viewCase.source !== 'UNKNOWN' && (
          <span className="inline-flex items-center gap-1.5">
            Origen: {sourceLabels[viewCase.source] || viewCase.source}
          </span>
        )}
        {viewCase.price_clp != null && (
          <span className="inline-flex items-center gap-1.5">
            Monto: ${Number(viewCase.price_clp).toLocaleString('es-CL')}
          </span>
        )}
      </div>

      <CaseDescriptionCard description={viewCase.description} />

      {/* 5.1B — gestión operativa en drawer (detalle limpio, sin banda inline). */}
      {viewCase && (
        <CaseManagementDrawer
          caseData={viewCase}
          open={manageOpen}
          onOpenChange={setManageOpen}
          onCaseUpdated={(row) => setPatched(row)}
        />
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="scrollbar-hide sticky top-16 z-10 mb-4 flex h-auto w-full flex-nowrap justify-start gap-0 overflow-x-auto border border-gray-200 bg-white shadow-sm p-0">
          <TabsTrigger value="overview" className="shrink-0 whitespace-nowrap rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground data-[state=active]:border-green-900 data-[state=active]:bg-transparent data-[state=active]:text-green-900 data-[state=active]:shadow-none hover:text-gray-900">Resumen</TabsTrigger>
          <TabsTrigger value="documents" className="shrink-0 whitespace-nowrap rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground data-[state=active]:border-green-900 data-[state=active]:bg-transparent data-[state=active]:text-green-900 data-[state=active]:shadow-none hover:text-gray-900">Documentos y análisis</TabsTrigger>
          <TabsTrigger value="research" className="shrink-0 whitespace-nowrap rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground data-[state=active]:border-green-900 data-[state=active]:bg-transparent data-[state=active]:text-green-900 data-[state=active]:shadow-none hover:text-gray-900">Investigar jurisprudencia</TabsTrigger>
          <TabsTrigger value="intelligence" className="shrink-0 whitespace-nowrap rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground data-[state=active]:border-green-900 data-[state=active]:bg-transparent data-[state=active]:text-green-900 data-[state=active]:shadow-none hover:text-gray-900">Inteligencia del caso</TabsTrigger>
          <TabsTrigger value="drafts" className="shrink-0 whitespace-nowrap rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground data-[state=active]:border-green-900 data-[state=active]:bg-transparent data-[state=active]:text-green-900 data-[state=active]:shadow-none hover:text-gray-900">Redacción asistida</TabsTrigger>
          <TabsTrigger value="activity" className="shrink-0 whitespace-nowrap rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground data-[state=active]:border-green-900 data-[state=active]:bg-transparent data-[state=active]:text-green-900 data-[state=active]:shadow-none hover:text-gray-900">Timeline del caso</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          {/* 5.1B: el drawer lateral es la ficha operativa; el tab
              Resumen solo muestra insight documental, inteligencia y citas. */}
          {/* 4.48B: compact deterministic snapshot for free_case only.
              Separate limited layer (never the full Command Center, no
              case_analysis change). Read-only: 0 provider, 0 quota. */}
          {aiPlan === 'free_case' && effectiveWorkspaceId && !accessLoading && (
            <AICaseFreeSnapshot
              workspaceId={effectiveWorkspaceId}
              onUpgrade={() => setProOpen(true)}
            />
          )}
          {/* 4.46B (OPTION B): persisted latest document summary. Complements
              (never duplicates) the Command Center below: it renders only
              when the Center is absent, reusing the same path for every
              plan. Read-only: 0 provider, 0 quota. */}
          {!(canUse('case_analysis') && effectiveWorkspaceId) && effectiveWorkspaceId && !accessLoading && (
            <AICaseLatestAnalysis
              workspaceId={effectiveWorkspaceId}
              onViewDocument={(documentId) => {
                setOverviewDocId(documentId);
                setActiveTab('documents');
              }}
            />
          )}
          {/* 4.34L: Resumen = workspace legal primero. Command Center es el
              contenido primario; la edición administrativa vive en el modal. */}
          {!accessLoading && canUse('case_analysis') && effectiveWorkspaceId && (
            <AICaseCommandCenter
              workspaceId={effectiveWorkspaceId}
              workspaceName={viewCase.title}
              onOpenWorkflowAction={(id) => setBriefWorkflowActionId(id)}
              onViewDocuments={() => setActiveTab('documents')}
              onViewIntelligence={() => setActiveTab('intelligence')}
              onAskQuestion={(q) => openCaseChat(q, null, 'command_center')}
              onWorkflowAsk={(q, actionId) => openCaseChat(q, null, 'workflow', actionId)}
              onInvestigate={() => setActiveTab('research')}
            />
          )}
      {/* Citas del caso — 1:N */}
      <Card className="mt-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Citas del caso
              <Badge variant="outline">{caseBookings.length}</Badge>
            </CardTitle>
            <Button size="sm" onClick={handleNewAppointmentForCase} className="bg-gray-900 hover:bg-green-900">
              <Plus className="h-4 w-4 mr-1" /> Nueva cita para este caso
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingBookings ? (
            <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Cargando citas...</div>
          ) : caseBookings.length === 0 ? (
            <div className="text-center py-6">
              <Calendar className="mx-auto h-8 w-8 text-gray-300" />
              <p className="text-sm font-medium mt-2">Sin citas para este caso</p>
              <p className="text-xs text-gray-500">Las citas creadas para este caso aparecerán aquí.</p>
            </div>
          ) : (
            <div className="divide-y">
              {caseBookings.map((b: any) => (
                <div key={b.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div>
                    <div className="font-medium text-sm">
                      {b.scheduled_date ? format(new Date(b.scheduled_date), 'dd-MM-yyyy') : format(new Date(b.created_at), 'dd-MM-yyyy')} {b.scheduled_time?.slice(0,5) ? `· ${b.scheduled_time.slice(0,5)}` : ''} · {b.service_title || 'Cita agendada'}
                    </div>
                    <div className="text-xs text-gray-500">{bookingStatusLabels[b.status] || statusLabels[b.status as CaseStatus] || b.status} {b.price ? `· $${b.price.toLocaleString('es-CL')}` : ''}</div>
                  </div>
                  <Link to={`/lawyer/citas`} className="text-xs text-green-600 hover:underline">Ver agenda</Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <CaseDocuments key={caseId} workspaceId={effectiveWorkspaceId} ensureWorkspace={ensureWorkspace}
                canAnalyze={canUse('document_analysis')} canChat={canUse('case_chat')} accessLoading={accessLoading}
                selectedDocId={overviewDocId} onSelectDocument={setOverviewDocId}
                onUpgrade={() => setProOpen(true)} />
        </TabsContent>

        <TabsContent value="intelligence" className="mt-4">
          {accessLoading ? <Skeleton className="h-24 w-full" /> : !canUse('case_analysis') ? (
            <Card><CardContent className="py-10 text-center space-y-4">
              <p>Las herramientas de IA están incluidas en LegalUp Pro.</p>
              <Button onClick={() => setProOpen(true)}>Ver LegalUp Pro</Button>
            </CardContent></Card>
          ) : !effectiveWorkspaceId ? (
            <Card><CardContent className="py-10 text-center space-y-4">
              <p className="font-medium">Aún no hay documentos analizados.</p>
              <p className="text-sm text-muted-foreground">Agrega un documento en la pestaña Documentos para comenzar a trabajar este caso con IA.</p>
              <Button onClick={() => setActiveTab('documents')}>Ir a Documentos</Button>
            </CardContent></Card>
          ) : (
            <AICaseIntelligence
              workspaceId={effectiveWorkspaceId}
              caseId={caseId}
              externalWorkflowActionId={briefWorkflowActionId}
              onExternalWorkflowActionHandled={() => setBriefWorkflowActionId(null)}
              onQuestionClick={(q) => openCaseChat(q, null, 'case_intelligence')}
              onWorkflowAsk={(q, actionId) => openCaseChat(q, null, 'workflow', actionId)}
              onOpenChat={() => openCaseChat(null, null, 'intelligence_button')}
              onNavigateToDocuments={() => setActiveTab('documents')}
            />
          )}
        </TabsContent>

        {/* 4.34T: forceMount preserves draft/error/retry state across tabs
            (legacy parity). display:none keeps it non-interactive; no auto-run. */}
        <TabsContent value="research" forceMount className="mt-4 data-[state=inactive]:hidden">
          {effectiveWorkspaceId ? (
            <AIResearchPanel
              workspaceId={effectiveWorkspaceId}
              locked={researchLocked}
              analyticsSurface="case"
              initialQuery={viewCase.title ? `¿Qué normativa y jurisprudencia aplican al caso "${viewCase.title}"?` : undefined}
            />
          ) : (
            <Card><CardContent className="py-10 text-center space-y-4">
              <p className="font-medium">Aún no hay caso inteligente.</p>
              <p className="text-sm text-muted-foreground">Agrega un documento en la pestaña Documentos para habilitar la investigación de este caso.</p>
              <Button onClick={() => setActiveTab('documents')}>Ir a Documentos</Button>
            </CardContent></Card>
          )}
        </TabsContent>

        {/* 4.59D.1: Borradores — trabajo jurídico generado desde el contexto.
            Sin workspace aún: mismo patrón que intelligence (ir a Documentos). */}
        <TabsContent value="drafts" className="mt-4">
          {!effectiveWorkspaceId ? (
            <Card><CardContent className="py-10 text-center space-y-4">
              <p className="font-medium">Aún no hay caso inteligente.</p>
              <p className="text-sm text-muted-foreground">Agrega un documento en la pestaña Documentos para habilitar la redacción de este caso.</p>
              <Button onClick={() => setActiveTab('documents')}>Ir a Documentos</Button>
            </CardContent></Card>
          ) : (
            <AICaseDrafts workspaceId={effectiveWorkspaceId} />
          )}
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <CaseActivity
            caseData={caseData}
            workspaceId={effectiveWorkspaceId}
            bookings={caseBookings}
            onOpenDocuments={() => setActiveTab('documents')}
          />
        </TabsContent>
      </Tabs>
      {effectiveWorkspaceId && (
        <AICaseChatDrawer
          open={chatOpen}
          onOpenChange={handleChatOpenChange}
          workspaceId={effectiveWorkspaceId}
          workspaceName={viewCase.title}
          documents={chatDocumentsQuery.data ?? []}
          documentId={chatDocumentId}
          externalQuestion={chatQuestion}
          onExternalQuestionHandled={() => setChatQuestion(null)}
        />
      )}
      <ProPricingModal open={proOpen} onOpenChange={setProOpen} triggerAction="case_ai" />
      <ProPricingModal open={apptPaywallOpen} onOpenChange={setApptPaywallOpen} triggerAction="create_appointment" />
    </div>
  );
}
