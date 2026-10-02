import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useLawyerCases } from '@/hooks/useLawyerCases';
import { useLawyerClients } from '@/hooks/useLawyerClients';
import { useToast } from '@/hooks/use-toast';
import { Search, Loader2, Plus, FolderOpen, AlertTriangle, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useCaseEntitlement,
  isFreeCaseEntitlementError,
  isActiveCapacityError,
} from '@/hooks/useCaseEntitlement';
import { useProSubscription } from '@/hooks/useProSubscription';
import { ProPricingModal } from '@/components/legalup-pro/ProPricingModal';
import { ActiveCapacityModal } from '@/components/legalup-pro/ActiveCapacityModal';
import { SharedCaseCard } from '@/components/legalup-ai/SharedCaseCard';
import { CASE_STATUS_COLORS, CASE_STATUS_LABELS, isActiveCaseStatus } from '@/lib/caseStatus';
import { decideCreateCaseAction } from '@/lib/caseCreateGate';
import { CaseEditDialog } from '@/components/lawyer/CaseEditDialog';
import { PortfolioView } from '@/components/lawyer/PortfolioView';
import { isNextActionOverdue } from '@/lib/caseControl';
import { activePortfolioCases, distinctStages, groupByStage, groupByStatus, normalizeStage, stageLabel } from '@/lib/portfolio';
import { supabase } from '@/lib/supabaseClient';
import posthog from 'posthog-js';

function CaseCardSkeleton() {
  return (
    <Card><CardContent className="p-5 space-y-3"><Skeleton className="h-5 w-2/3" /><Skeleton className="h-4 w-1/3" /><Skeleton className="h-4 w-full" /><Skeleton className="h-9 w-28" /></CardContent></Card>
  );
}

function isRowDeniedError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const code = (err as { code?: unknown }).code;
  const msg = err instanceof Error ? err.message : '';
  return code === '42501' || /row-level security/i.test(msg);
}

export default function CasesPage() {
  const { cases, loading, error, createCase, updateCase, refetch: refetchCases } = useLawyerCases();
  const { clients, loading: clientsLoading, error: clientsError, refetch: refetchClients } = useLawyerClients();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  // FASE 5.3 — vista Casos/Cartera + filtro por etapa (combinable).
  const [view, setView] = useState<'casos' | 'cartera'>('casos');
  const [stageFilter, setStageFilter] = useState('all');
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState<string>('none');
  const [saving, setSaving] = useState(false);
  const {
    entitlement,
    loading: entitlementLoading,
    error: entitlementError,
    refetch: refetchEntitlement,
    canCreateDirectCase,
  } = useCaseEntitlement();
  const hasProAccess = entitlement.hasProAccess;
  // 4.57D: Plus lawyers at capacity see no higher tier (close-a-case only);
  // Pro lawyers at capacity get the Plus upgrade path.
  const { isPlus } = useProSubscription();
  const [proPaywallOpen, setProPaywallOpen] = useState(false);
  const [capacityModalOpen, setCapacityModalOpen] = useState(false);
  // 4.57D: paywall target for paid-lawyers surfaces (Pro at capacity → Plus).
  const [paywallTarget, setPaywallTarget] = useState<'pro' | 'plus'>('pro');
  const [editCaseId, setEditCaseId] = useState<string | null>(null);
  const [editDialogKey, setEditDialogKey] = useState(0);
  const [actingCaseId, setActingCaseId] = useState<string | null>(null);
  // FASE 5.1 — conteo de pendientes por caso (1 query, sin N+1).
  // Sin useAuth directo: deriva el lawyer del hook (mockeable en tests).
  // RLS ya aísla por lawyer_id en el servidor.
  const [pendingByCase, setPendingByCase] = useState<Record<string, number>>({});
  const lawyerIdForTasks = cases.length > 0 ? cases[0].lawyer_id : null;
  useEffect(() => {
    if (cases.length === 0) return;
    const ids = cases.map((c) => c.id);
    let cancelled = false;
    supabase
      .from('lawyer_case_tasks')
      .select('case_id')
      .in('case_id', ids)
      .eq('completed', false)
      .then(({ data }) => {
        if (cancelled) return;
        const map: Record<string, number> = {};
        for (const row of (data || []) as { case_id: string }[]) {
          map[row.case_id] = (map[row.case_id] || 0) + 1;
        }
        setPendingByCase(map);
      });
    return () => { cancelled = true; };
  }, [cases.length, lawyerIdForTasks]);

  // 4.36D — capacity reached for an already-paying Pro lawyer (never the
  // subscription paywall). Fail-closed: unknown limit never reports full.
  const atActiveCapacity =
    hasProAccess &&
    entitlement.activeCaseLimit > 0 &&
    entitlement.activeCaseCount >= entitlement.activeCaseLimit;

  const refreshAll = () => {
    void refetchCases();
    void refetchEntitlement();
  };

  // 4.43A — route a blocked create/reopen attempt to the correct UX:
  // free without allowance → subscription modal; Pro at limit → capacity UX.
  // Loading/error NEVER open paywall (wait/retry instead).
  const openBlockedGate = (action: 'create_case' | 'reopen_case') => {
    if (hasProAccess && atActiveCapacity) {
      try {
        posthog.capture('case_capacity_reached', {
          action,
          active_case_count: entitlement.activeCaseCount,
        });
      } catch { /* analytics best-effort; never blocks UX */ }
      setCapacityModalOpen(true);
      return;
    }
    posthog.capture('pro_paywall_opened', { action });
    // 4.57D: free exhaustion always targets Pro (never Plus, never stale).
    setPaywallTarget('pro');
    setProPaywallOpen(true);
  };

  // 4.43A — single authority for create UX: RPC canCreate decides;
  // loading waits, read errors retry (never paywall).
  const handleCreateClick = () => {
    const action = decideCreateCaseAction({
      loading: entitlementLoading,
      error: entitlementError,
      canCreate: canCreateCase,
      isProAtCapacity: atActiveCapacity,
    });
    if (action === 'wait') return;
    if (action === 'retry') {
      toast({ title: 'No pudimos verificar tu acceso', description: 'Reintentando…' });
      void refetchEntitlement();
      return;
    }
    if (action === 'open-form') {
      openDialog();
      return;
    }
    openBlockedGate('create_case');
  };

  const filtered = useMemo(
    () =>
      cases.filter((c) => {
        const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase()) || (c.client?.name || '').toLowerCase().includes(search.toLowerCase());
        // 4.36D — lifecycle filters use the canonical status sets.
        const matchesStatus =
          statusFilter === 'all' ? true
          : statusFilter === 'active' ? isActiveCaseStatus(c.status)
          : statusFilter === 'history' ? !isActiveCaseStatus(c.status)
          : c.status === statusFilter;
        // 5.3 — etapa combinable con estado.
        const matchesStage =
          stageFilter === 'all' ? true
          : stageFilter === '__none__' ? !normalizeStage(c.stage)
          : normalizeStage(c.stage) === stageFilter;
        return matchesSearch && matchesStatus && matchesStage;
      }),
    [cases, search, statusFilter, stageFilter]
  );

  // 5.3 — cartera derivada de los mismos casos (1 query, sin N+1).
  const stages = useMemo(() => distinctStages(cases), [cases]);
  const activeCases = useMemo(() => activePortfolioCases(cases), [cases]);
  const stageGroups = useMemo(() => groupByStage(cases), [cases]);
  const statusGroups = useMemo(() => groupByStatus(cases), [cases]);
  const maxStageCount = stageGroups.length > 0 ? stageGroups[0].count : 0;

  const openStageInList = (stage: string | null) => {
    setStageFilter(stage === null ? '__none__' : stage);
    setView('casos');
  };

  // 4.36D — lifetime authority comes from the server (get_my_case_entitlement).
  // Never infer consumption from visible rows: deleted cases stay consumed.
  const canCreateCase = canCreateDirectCase;

  const handleCloseCase = async (id: string, previousStatus: string) => {
    if (actingCaseId) return;
    setActingCaseId(id);
    try {
      await updateCase(id, { status: 'closed' });
      try {
        posthog.capture('case_closed', { source: 'LAWYER_DIRECT', previous_status: previousStatus, new_status: 'closed' });
      } catch { /* analytics best-effort; never blocks UX */ }
      toast({ title: 'Caso cerrado', description: 'Se conserva con todo su historial y libera un cupo.' });
      refreshAll();
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'No se pudo cerrar', variant: 'destructive' });
    } finally {
      setActingCaseId(null);
    }
  };

  const handleReopenCase = async (id: string, previousStatus: string) => {
    if (actingCaseId) return;
    setActingCaseId(id);
    try {
      await updateCase(id, { status: 'in_progress' });
      try {
        posthog.capture('case_reopened', { source: 'LAWYER_DIRECT', previous_status: previousStatus, new_status: 'in_progress' });
      } catch { /* analytics best-effort; never blocks UX */ }
      toast({ title: 'Caso reabierto' });
      refreshAll();
    } catch (err) {
      // 4.36D — stale reopen at full capacity lands on the capacity UX.
      if (isActiveCapacityError(err)) {
        try {
          posthog.capture('case_capacity_reached', { action: 'reopen_case', active_case_count: entitlement.activeCaseCount });
        } catch { /* analytics best-effort; never blocks UX */ }
        setCapacityModalOpen(true);
        void refetchEntitlement();
      } else {
        toast({ title: 'Error', description: err instanceof Error ? err.message : 'No se pudo reabrir', variant: 'destructive' });
      }
    } finally {
      setActingCaseId(null);
    }
  };

  // 4.31C: always fetch fresh clients when opening the modal, so the
  // dropdown never depends on having visited ClientsPage first.
  const openDialog = () => {
    setOpen(true);
    refetchClients();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const action = decideCreateCaseAction({
      loading: entitlementLoading,
      error: entitlementError,
      canCreate: canCreateCase,
      isProAtCapacity: atActiveCapacity,
    });
    if (action === 'wait') return;
    if (action === 'retry') {
      toast({ title: 'No pudimos verificar tu acceso', description: 'Reintentando…' });
      void refetchEntitlement();
      return;
    }
    if (action !== 'open-form') {
      openBlockedGate('create_case');
      return;
    }
    posthog.capture('pro_paywall_action', { action: 'create_case' });
    if (!title.trim()) {
      toast({ title: 'Título requerido', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await createCase({
        title,
        description: description || null,
        client_id: clientId === 'none' ? null : clientId,
        source: 'LAWYER_DIRECT',
      });
      toast({ title: 'Caso creado' });
      setTitle('');
      setDescription('');
      setClientId('none');
      setOpen(false);
      void refetchEntitlement();
    } catch (err) {
      // 4.36B/4.36D — known commercial rejections route to their own UX:
      // free allowance → subscription modal; Pro capacity → capacity UX.
      // Unknown errors keep the normal error toast.
      if (isFreeCaseEntitlementError(err)) {
        posthog.capture('pro_paywall_opened', { action: 'create_case', reason: 'entitlement_rejected' });
        setPaywallTarget('pro');
        setProPaywallOpen(true);
        void refetchEntitlement();
      } else if (isActiveCapacityError(err)) {
        try {
          posthog.capture('case_capacity_reached', { action: 'create_case', active_case_count: entitlement.activeCaseCount });
        } catch { /* analytics best-effort; never blocks UX */ }
        setCapacityModalOpen(true);
        void refetchEntitlement();
      } else if (isRowDeniedError(err)) {
        const latest = await refetchEntitlement();
        if (!latest.hasProAccess && latest.freeCaseConsumed) {
          posthog.capture('pro_paywall_opened', { action: 'create_case', reason: 'entitlement_rejected' });
          setPaywallTarget('pro');
          setProPaywallOpen(true);
        } else if (latest.hasProAccess && latest.activeCaseLimit > 0 && latest.activeCaseCount >= latest.activeCaseLimit) {
          try {
            posthog.capture('case_capacity_reached', { action: 'create_case', active_case_count: latest.activeCaseCount });
          } catch { /* analytics best-effort; never blocks UX */ }
          setCapacityModalOpen(true);
        } else {
          toast({ title: 'Error', description: err instanceof Error ? err.message : 'No se pudo crear', variant: 'destructive' });
        }
      } else {
        toast({ title: 'Error', description: err instanceof Error ? err.message : 'No se pudo crear', variant: 'destructive' });
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading || entitlementLoading) {
    return (
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Casos</h1>
            <p className="text-muted-foreground">Expedientes del estudio — vinculados a cliente y reserva</p>
          </div>
          <Button disabled className="bg-gray-900"><Loader2 className="h-4 w-4 animate-spin mr-1" /> Cargando</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CaseCardSkeleton /><CaseCardSkeleton /><CaseCardSkeleton /><CaseCardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Casos</h1>
          <p className="text-muted-foreground">Expedientes del estudio — vinculados a cliente y reserva</p>
          {hasProAccess && entitlement.activeCaseLimit > 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {entitlement.activeCaseCount} de {entitlement.activeCaseLimit} casos activos
            </p>
          ) : null}
        </div>
        <Button onClick={() => {
          handleCreateClick();
        }} className="bg-gray-900 hover:bg-green-900">
          <Plus className="h-4 w-4 mr-1" /> Nuevo caso
        </Button>
      </div>

      {/* 5.3 — Casos / Cartera (misma fuente, sin queries extra). */}
      <div className="flex gap-1 rounded-lg border bg-white p-1 shadow-sm w-fit" role="tablist" aria-label="Vista de casos">
        {(['casos', 'cartera'] as const).map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={view === v}
            onClick={() => setView(v)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 ${view === v ? 'bg-gray-900 text-white' : 'text-muted-foreground hover:text-gray-900'}`}
          >
            {v === 'casos' ? 'Casos' : 'Cartera'}
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por título o cliente..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]" aria-label="Filtrar por estado">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="history">Cerrados / Historial</SelectItem>
            <SelectItem value="new">Nuevo</SelectItem>
            <SelectItem value="quoted">Cotizado</SelectItem>
            <SelectItem value="paid">Pagado</SelectItem>
            <SelectItem value="in_progress">En progreso</SelectItem>
            <SelectItem value="delivered">Entregado</SelectItem>
            <SelectItem value="closed">Cerrado</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-[180px]" aria-label="Filtrar por etapa">
            <SelectValue placeholder="Etapa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las etapas</SelectItem>
            {stages.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
            <SelectItem value="__none__">Sin etapa</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {view === 'cartera' && !error ? (
        <PortfolioView
          activeCount={activeCases.length}
          stageGroups={stageGroups}
          statusGroups={statusGroups}
          maxStageCount={maxStageCount}
          onSelectStage={openStageInList}
        />
      ) : null}

      {error && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <AlertTriangle className="h-10 w-10 text-amber-500" />
            <p className="font-medium text-gray-900">No pudimos cargar tus casos</p>
            <p className="max-w-sm text-sm text-muted-foreground">{error}</p>
            <Button type="button" variant="outline" onClick={() => window.location.reload()}><RefreshCw className="h-4 w-4 mr-1" /> Reintentar</Button>
          </CardContent>
        </Card>
      )}

      {!error && view === 'casos' && filtered.length === 0 ? (        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-700"><FolderOpen className="h-7 w-7" /></span>
            <p className="text-lg font-medium text-gray-900">No hay casos</p>
            <p className="max-w-sm text-sm text-muted-foreground">Crea tu primer caso o procesa una solicitud. Tus expedientes aparecerán aquí con el mismo formato que LegalUp AI.</p>
            {canCreateCase && !hasProAccess && !entitlement.freeCaseConsumed ? (
              <p className="max-w-sm text-xs text-muted-foreground">Crea tu primer caso sin suscripción. Podrás organizar al cliente y sus documentos; las funciones de IA están incluidas con LegalUp Pro.</p>
            ) : null}
            <Button onClick={() => {
              handleCreateClick();
            }} className="mt-2 bg-green-900 text-white hover:bg-green-800"><Plus className="h-4 w-4 mr-1" /> Crear mi primer caso</Button>
          </CardContent>
        </Card>
      ) : !error && view === 'casos' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((c) => (
            <SharedCaseCard
              key={c.id}
              title={c.title}
              practiceArea={c.practice_area}
              description={c.description}
              createdAt={c.created_at}
              updatedAt={c.updated_at}
              workspaceId={c.ai_workspace_id}
              statusBadge={
                <span className="flex flex-wrap items-center gap-1.5">
                  <Badge className={`${CASE_STATUS_COLORS[c.status] || 'bg-gray-100 text-gray-800'} border-0 text-xs`}>
                    {CASE_STATUS_LABELS[c.status] || c.status}
                  </Badge>
                  {normalizeStage(c.stage) ? (
                    <Badge variant="secondary" className="text-xs font-normal">
                      {normalizeStage(c.stage)}
                    </Badge>
                  ) : null}
                  {/* FASE 5.1 — próxima gestión escaneable */}
                  {c.next_action && !c.next_action_completed_at ? (
                    <Badge variant={isNextActionOverdue(c) ? 'destructive' : 'outline'} className="inline-flex items-center gap-1 text-xs font-normal">
                      {isNextActionOverdue(c) ? <AlertTriangle className="h-3 w-3" aria-hidden="true" /> : null}
                      {isNextActionOverdue(c) ? 'Vencida: ' : '→ '}
                      {c.next_action.length > 40 ? `${c.next_action.slice(0, 40)}…` : c.next_action}
                      {c.next_action_due_at ? ` · ${new Date(c.next_action_due_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}` : ''}
                    </Badge>
                  ) : null}
                  {(pendingByCase[c.id] || 0) > 0 ? (
                    <Badge variant="secondary" className="text-xs font-normal">
                      {pendingByCase[c.id]} pendiente{pendingByCase[c.id] === 1 ? '' : 's'}
                    </Badge>
                  ) : null}
                </span>
              }
              onOpen={() => navigate(`/lawyer/cases/${c.id}`)}
              onTimeline={() => navigate(`/lawyer/cases/${c.id}?tab=activity`)}
              onEdit={() => {
                setEditDialogKey((prev) => prev + 1);
                setEditCaseId(c.id);
              }}
              onCloseCase={isActiveCaseStatus(c.status) ? () => handleCloseCase(c.id, c.status) : undefined}
              onReopenCase={!isActiveCaseStatus(c.status) ? () => handleReopenCase(c.id, c.status) : undefined}
            />
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo caso</DialogTitle>
          </DialogHeader>
          {canCreateCase && !hasProAccess && !entitlement.freeCaseConsumed ? (
            <p className="text-xs text-muted-foreground">Tu primer caso no requiere suscripción a Pro. Las funciones de IA requieren LegalUp Pro.</p>
          ) : null}
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Divorcio Juan Pérez" required />
            </div>
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={clientId} onValueChange={setClientId} disabled={clientsLoading}>
                <SelectTrigger>
                  <SelectValue placeholder={clientsLoading ? "Cargando clientes…" : "Seleccionar cliente (opcional)"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin cliente</SelectItem>
                  {clientsLoading ? (
                    <SelectItem value="__loading" disabled>Cargando clientes…</SelectItem>
                  ) : (
                    clients.map((cl) => (
                      <SelectItem key={cl.id} value={cl.id}>
                        {cl.name} {cl.email ? `· ${cl.email}` : ''}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {clientsError ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>No se pudieron cargar los clientes.</span>
                  <Button type="button" variant="outline" size="sm" onClick={() => refetchClients()}>Reintentar</Button>
                </div>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalles del caso..." rows={3} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="bg-gray-900 hover:bg-green-900">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Crear
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ProPricingModal open={proPaywallOpen} onOpenChange={setProPaywallOpen} triggerAction="create_case" targetPlan={paywallTarget} />
      <ActiveCapacityModal
        open={capacityModalOpen}
        onOpenChange={setCapacityModalOpen}
        limit={entitlement.activeCaseLimit}
        onUpgradeClick={isPlus ? undefined : () => {
          try { posthog.capture('plus_limit_reached', { current_plan: 'pro', capability: 'active_cases', used: entitlement.activeCaseCount, limit: entitlement.activeCaseLimit, target_plan: 'plus' }); } catch { /* best-effort */ }
          setPaywallTarget('plus');
          setProPaywallOpen(true);
        }}
      />
      {editCaseId && (
        <CaseEditDialog
          key={editDialogKey}
          open={editCaseId !== null}
          onOpenChange={(open) => { if (!open) setEditCaseId(null); }}
          caseData={cases.find((c) => c.id === editCaseId)!}
          clients={clients}
          stageSuggestions={stages}
          onDeleted={() => {
            setEditCaseId(null);
            void refetchCases();
            void refetchEntitlement();
          }}
          onSaved={() => {
            setEditCaseId(null);
            void refetchCases();
          }}
        />
      )}
    </div>
  );
}
