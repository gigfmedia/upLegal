import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
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
import { Search, Loader2, Plus, Eye, FileText, FolderOpen, CalendarDays, Clock, AlertTriangle, RefreshCw, Trash2, Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useProSubscription } from '@/hooks/useProSubscription';
import { ProPricingModal } from '@/components/legalup-pro/ProPricingModal';
import posthog from 'posthog-js';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const statusColors: Record<string, string> = {
  new: 'bg-yellow-100 text-yellow-800',
  quoted: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  in_progress: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-teal-100 text-teal-800',
  closed: 'bg-gray-200 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
};

const statusLabels: Record<string, string> = {
  new: 'Nuevo',
  quoted: 'Cotizado',
  paid: 'Pagado',
  in_progress: 'En progreso',
  delivered: 'Entregado',
  closed: 'Cerrado',
  cancelled: 'Cancelado',
};

const sourceLabels: Record<string, string> = {
  LAWYER_DIRECT: 'Directo',
  LEGALUP_MARKETPLACE: 'Marketplace',
  UNKNOWN: 'Desconocido',
};

function formatDate(value: string): string {
  try { return format(parseISO(value), "d 'de' MMMM yyyy", { locale: es }); } catch { return value; }
}
function CaseCardSkeleton() {
  return (
    <Card><CardContent className="p-5 space-y-3"><Skeleton className="h-5 w-2/3" /><Skeleton className="h-4 w-1/3" /><Skeleton className="h-4 w-full" /><Skeleton className="h-9 w-28" /></CardContent></Card>
  );
}

export default function CasesPage() {
  const { cases, loading, error, createCase } = useLawyerCases();
  const { clients } = useLawyerClients();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState<string>('none');
  const [saving, setSaving] = useState(false);
  const { hasProAccess } = useProSubscription();
  const [proPaywallOpen, setProPaywallOpen] = useState(false);

  const filtered = useMemo(
    () =>
      cases.filter((c) => {
        const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase()) || (c.client?.name || '').toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [cases, search, statusFilter]
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasProAccess) {
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
          if (!hasProAccess) {
            posthog.capture('pro_paywall_opened', { action: 'create_case' });
            setProPaywallOpen(true);
            return;
          }
          setOpen(true);
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

      {!error && filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-700"><FolderOpen className="h-7 w-7" /></span>
            <p className="text-lg font-medium text-gray-900">No hay casos</p>
            <p className="max-w-sm text-sm text-muted-foreground">Crea tu primer caso o procesa una solicitud. Tus expedientes aparecerán aquí con el mismo formato que LegalUp AI.</p>
            <Button onClick={() => {
              if (!hasProAccess) { posthog.capture('pro_paywall_opened', { action: 'create_case' }); setProPaywallOpen(true); return; }
              setOpen(true);
            }} className="mt-2 bg-green-900 text-white hover:bg-green-800"><Plus className="h-4 w-4 mr-1" /> Crear mi primer caso</Button>
          </CardContent>
        </Card>
      ) : !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((c) => (
            <Card key={c.id} className="transition-shadow hover:shadow-md">
              <CardContent className="flex h-full flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-gray-900">{c.title}</h3>
                    {c.practice_area ? <Badge variant="secondary" className="mt-1 bg-green-50 text-green-800">{c.practice_area}</Badge> : <span className="mt-1 block text-xs text-muted-foreground">Sin área jurídica</span>}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge className={`${statusColors[c.status] || 'bg-gray-100 text-gray-800'} border-0 text-xs`}>{statusLabels[c.status] || c.status}</Badge>
                      {c.source && c.source !== 'UNKNOWN' && <Badge variant="outline" className="text-xs">{sourceLabels[c.source] || c.source}</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link to={`/lawyer/cases/${c.id}`} className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label={`Ver caso ${c.title}`}><Eye className="h-4 w-4" /></Link>
                  </div>
                </div>
                {c.description ? <p className="line-clamp-2 text-sm text-muted-foreground">{c.description}</p> : null}
                <div className="text-sm text-gray-600 truncate">
                  {c.client ? <span>Cliente: <Link to={`/lawyer/clients/${c.client.id}`} className="text-green-600 hover:underline">{c.client.name}</Link></span> : <span className="text-gray-400">Sin cliente</span>}
                </div>
                <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> Creado: {formatDate(c.created_at)}</span>
                  <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Actualizado: {formatDate(c.updated_at)}</span>
                </div>
                <Link to={`/lawyer/cases/${c.id}`} className="mt-1">
                  <Button variant="outline" className="w-full border-gray-900 text-green-900 bg-green-300 hover:bg-green-400 hover:text-green-900">
                    <FolderOpen className="h-4 w-4 mr-1" /> Abrir caso
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo caso</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Divorcio Juan Pérez" required />
            </div>
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cliente (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin cliente</SelectItem>
                  {clients.map((cl) => (
                    <SelectItem key={cl.id} value={cl.id}>
                      {cl.name} {cl.email ? `· ${cl.email}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
    </div>
  );
}
