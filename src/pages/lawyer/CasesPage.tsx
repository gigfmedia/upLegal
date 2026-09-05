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
import { Search, Loader2, Plus, Eye, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
      <div className="flex items-center justify-center min-h-[60vh] px-8 py-6">
        <Loader2 className="h-8 w-8 animate-spin text-gray-900" />
      </div>
    );
  }

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Casos</h1>
          <p className="text-muted-foreground">Expedientes del estudio — vinculados a cliente y reserva</p>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-gray-900 hover:bg-green-900">
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
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-sm text-red-800">{error}</CardContent>
        </Card>
      )}

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay casos</h3>
            <p className="mt-1 text-sm text-gray-500">Crea tu primer caso o procesa una solicitud.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filtered.map((c) => (
            <Card key={c.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold truncate">{c.title}</h3>
                      <Badge className={`${statusColors[c.status] || 'bg-gray-100 text-gray-800'} border-0 text-xs`}>{statusLabels[c.status] || c.status}</Badge>
                      {c.source && c.source !== 'UNKNOWN' && (
                        <Badge variant="outline" className="text-xs">
                          {sourceLabels[c.source] || c.source}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-2 text-sm text-gray-600">
                      {c.client ? (
                        <span>
                          Cliente: <Link to={`/lawyer/clients/${c.client.id}`} className="text-green-500 hover:text-green-600 hover:underline">{c.client.name}</Link>
                        </span>
                      ) : (
                        <span className="text-gray-400">Sin cliente</span>
                      )}
                      {c.booking && <span className="ml-2">· Reserva: {c.booking.service_title || statusLabels[c.booking.status] || c.booking.status}</span>}
                    </div>
                    {c.description && <p className="text-sm text-gray-500 bg-gray-50 p-2 rounded mt-2 line-clamp-2">{c.description}</p>}
                    <div className="text-xs text-gray-400 mt-2">{new Date(c.created_at).toLocaleDateString('es-CL')} · {c.currency} {c.price_clp ? `$${c.price_clp.toLocaleString('es-CL')}` : ''}</div>
                  </div>
                  <Link to={`/lawyer/cases/${c.id}`}>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-1" /> Ver
                    </Button>
                  </Link>
                </div>
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
    </div>
  );
}
