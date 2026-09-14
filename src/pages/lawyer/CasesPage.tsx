import { useState, useMemo } from 'react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { useProSubscription } from '@/hooks/useProSubscription';
import { ProPricingModal } from '@/components/legalup-pro/ProPricingModal';
import { SharedCaseCard } from '@/components/legalup-ai/SharedCaseCard';
import { CaseEditDialog } from '@/components/lawyer/CaseEditDialog';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import posthog from 'posthog-js';

function CaseCardSkeleton() {
  return (
    <Card><CardContent className="p-5 space-y-3"><Skeleton className="h-5 w-2/3" /><Skeleton className="h-4 w-1/3" /><Skeleton className="h-4 w-full" /><Skeleton className="h-9 w-28" /></CardContent></Card>
  );
}

export default function CasesPage() {
  const { cases, loading, error, createCase, deleteCase } = useLawyerCases();
  const { clients, loading: clientsLoading, error: clientsError, refetch: refetchClients } = useLawyerClients();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState<string>('none');
  const [saving, setSaving] = useState(false);
  const { hasProAccess } = useProSubscription();
  const [proPaywallOpen, setProPaywallOpen] = useState(false);
  const [editCase, setEditCase] = useState<(typeof cases)[number] | null>(null);
  const [caseToDelete, setCaseToDelete] = useState<(typeof cases)[number] | null>(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDeleteCase = async () => {
    if (!caseToDelete) return;
    setDeleting(true);
    try {
      await deleteCase(caseToDelete.id);
      toast({ title: 'Caso eliminado' });
      setCaseToDelete(null);
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'No se pudo eliminar', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  const filtered = useMemo(
    () =>
      cases.filter((c) => {
        const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase()) || (c.client?.name || '').toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [cases, search, statusFilter]
  );

  const qualifyingDirectCases = useMemo(() => cases.filter((c) => c.source === 'LAWYER_DIRECT'), [cases]);
  const canCreateCase = hasProAccess || qualifyingDirectCases.length === 0;

  // 4.31C: always fetch fresh clients when opening the modal, so the
  // dropdown never depends on having visited ClientsPage first.
  const openDialog = () => {
    setOpen(true);
    refetchClients();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreateCase) {
      posthog.capture('pro_paywall_opened', { action: 'create_case' });
      setProPaywallOpen(true);
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
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'No se pudo crear', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
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
        </div>
        <Button onClick={() => {
          if (!canCreateCase) {
            posthog.capture('pro_paywall_opened', { action: 'create_case' });
            setProPaywallOpen(true);
            return;
          }
          openDialog();
        }} className="bg-gray-900 hover:bg-green-900">
          <Plus className="h-4 w-4 mr-1" /> Nuevo caso
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por título o cliente..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="new">Nuevo</SelectItem>
            <SelectItem value="quoted">Cotizado</SelectItem>
            <SelectItem value="paid">Pagado</SelectItem>
            <SelectItem value="in_progress">En progreso</SelectItem>
            <SelectItem value="delivered">Entregado</SelectItem>
            <SelectItem value="closed">Cerrado</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

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

      {!error && filtered.length === 0 ? (        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-700"><FolderOpen className="h-7 w-7" /></span>
            <p className="text-lg font-medium text-gray-900">No hay casos</p>
            <p className="max-w-sm text-sm text-muted-foreground">Crea tu primer caso o procesa una solicitud. Tus expedientes aparecerán aquí con el mismo formato que LegalUp AI.</p>
            {canCreateCase && !hasProAccess && qualifyingDirectCases.length === 0 ? (
              <p className="max-w-sm text-xs text-muted-foreground">Crea tu primer caso sin suscripción. Podrás organizar al cliente y sus documentos; las funciones de IA están incluidas con LegalUp Pro.</p>
            ) : null}
            <Button onClick={() => {
              if (!canCreateCase) { posthog.capture('pro_paywall_opened', { action: 'create_case' }); setProPaywallOpen(true); return; }
              openDialog();
            }} className="mt-2 bg-green-900 text-white hover:bg-green-800"><Plus className="h-4 w-4 mr-1" /> Crear mi primer caso</Button>
          </CardContent>
        </Card>
      ) : !error && (
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
              onOpen={() => navigate(`/lawyer/cases/${c.id}`)}
              onTimeline={() => navigate(`/lawyer/cases/${c.id}?tab=activity`)}
              onEdit={() => setEditCase(c)}
              onDelete={() => setCaseToDelete(c)}
            />
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo caso</DialogTitle>
          </DialogHeader>
          {canCreateCase && !hasProAccess && qualifyingDirectCases.length === 0 ? (
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
      <ProPricingModal open={proPaywallOpen} onOpenChange={setProPaywallOpen} triggerAction="create_case" />
      {editCase && (
        <CaseEditDialog
          open={editCase !== null}
          onOpenChange={(open) => { if (!open) setEditCase(null); }}
          caseData={editCase}
          clients={clients}
          onSaved={() => setEditCase(null)}
        />
      )}
      <ConfirmDialog
        open={caseToDelete !== null}
        onOpenChange={(open) => { if (!open) setCaseToDelete(null); }}
        onConfirm={confirmDeleteCase}
        title="Eliminar caso"
        description={`¿Seguro que quieres eliminar "${caseToDelete?.title ?? ''}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        isDeleting={deleting}
      />
    </div>
  );
}
