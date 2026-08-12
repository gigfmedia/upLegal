import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2, Search, Download, Eye, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type RangeFilter = 'all' | 'today' | '7d' | '30d' | '90d';

const RANGES: Array<{ value: RangeFilter; label: string }> = [
  { value: 'all', label: 'Todo el período' },
  { value: 'today', label: 'Hoy' },
  { value: '7d', label: 'Últimos 7 días' },
  { value: '30d', label: 'Últimos 30 días' },
  { value: '90d', label: 'Últimos 90 días' },
];

const STATUSES: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'started', label: 'Iniciado' },
  { value: 'checkout', label: 'Checkout' },
  { value: 'paid', label: 'Pagado' },
  { value: 'abandoned', label: 'Abandonado' },
];

const SOURCES: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'Todos los orígenes' },
  { value: 'widget', label: 'Widget / Chat' },
  { value: 'site', label: 'Directo (web)' },
];

const STATUS_STYLE: Record<string, string> = {
  started: 'bg-blue-50 text-blue-700 ring-blue-700/10',
  checkout: 'bg-amber-50 text-amber-700 ring-amber-700/10',
  paid: 'bg-emerald-50 text-emerald-700 ring-emerald-700/10',
  abandoned: 'bg-red-50 text-red-700 ring-red-700/10',
};

const STATUS_LABEL: Record<string, string> = {
  started: 'Iniciado',
  checkout: 'Checkout',
  paid: 'Pagado',
  abandoned: 'Abandonado',
};

const SOURCE_LABEL: Record<string, string> = {
  widget: 'Widget / Chat',
  site: 'Directo (web)',
};

interface ChatLead {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string | null;
  service_title: string | null;
  booking_type: string | null;
  booking_id: string | null;
  lawyer_id: string | null;
  lawyer_name: string | null;
  status: string;
  source: string | null;
  price: number | null;
  selected_date: string | null;
  selected_time: string | null;
  duration: number | null;
}

interface ChatLeadsPayload {
  leads: ChatLead[];
  total: number;
  page: number;
  pageSize: number;
}

const clp = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

export default function ChatLeadsTab() {
  const [range, setRange] = useState<RangeFilter>('30d');
  const [status, setStatus] = useState('all');
  const [source, setSource] = useState('all');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ChatLead | null>(null);

  const from = useMemo(() => {
    if (range === 'all') return '';
    if (range === 'today') return startOfDay(new Date()).toISOString();
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    return subDays(new Date(), days).toISOString();
  }, [range]);

  const { data, isLoading, isError, isFetching, refetch } = useQuery<ChatLeadsPayload>({
    queryKey: ['chat-leads', from, status, source, query, page],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (from) params.set('from', from);
      if (status && status !== 'all') params.set('status', status);
      if (source && source !== 'all') params.set('source', source);
      if (query) params.set('q', query);
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${apiBase}/api/admin/chat-leads?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'No pudimos cargar los leads del chat.');
      }
      return res.json();
    },
    staleTime: 30_000,
  });

  const applySearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(search.trim());
    setPage(1);
  };

  const changeRange = (v: RangeFilter) => {
    setRange(v);
    setPage(1);
  };

  const handleExport = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      const params = new URLSearchParams({ export: '1', pageSize: '1000' });
      if (from) params.set('from', from);
      if (status && status !== 'all') params.set('status', status);
      if (source && source !== 'all') params.set('source', source);
      if (query) params.set('q', query);
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${apiBase}/api/admin/chat-leads?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Error al exportar');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Exportación CSV descargada.');
    } catch (err) {
      console.error('Export Chat leads failed:', err);
      toast.error('No pudimos exportar los leads.');
    }
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const fromRow = data ? (data.page - 1) * data.pageSize + 1 : 0;
  const toRow = data ? Math.min(data.total, data.page * data.pageSize) : 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Leads del Chat</CardTitle>
              <CardDescription>
                Reservas y consultas generadas por el chat. El contenido de las conversaciones no se
                almacena.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
                <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport} disabled={isFetching}>
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Select value={range} onValueChange={changeRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RANGES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={source} onValueChange={(v) => { setSource(v); setPage(1); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <form onSubmit={applySearch} className="flex flex-1 min-w-[220px] gap-2">
              <Input
                placeholder="Buscar por nombre, email, teléfono o servicio..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" variant="secondary">
                <Search className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Servicio / Área</TableHead>
                  <TableHead>Abogado</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Origen</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : isError ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <AlertCircle className="h-6 w-6 text-destructive" />
                        <p className="text-sm text-muted-foreground">
                          No pudimos cargar los leads.
                        </p>
                        <Button variant="outline" size="sm" onClick={() => refetch()}>
                          Reintentar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : !data || data.leads.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-10 text-sm text-muted-foreground"
                    >
                      No hay leads del chat con los filtros seleccionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.leads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {format(new Date(lead.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                      </TableCell>
                      <TableCell className="font-medium">{lead.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        <div>{lead.email}</div>
                        {lead.phone ? <div>{lead.phone}</div> : null}
                      </TableCell>
                      <TableCell>
                        {lead.service_title || lead.booking_type || '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {lead.lawyer_name ?? (lead.lawyer_id ? 'Asignación manual' : '—')}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${STATUS_STYLE[lead.status] ?? 'bg-gray-50 text-gray-700 ring-gray-700/10'}`}
                        >
                          {STATUS_LABEL[lead.status] ?? lead.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {SOURCE_LABEL[lead.source ?? ''] ?? lead.source ?? '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelected(lead)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {data && data.total > 0 ? (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Mostrando {fromRow}–{toRow} de {data.total} leads
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || isFetching}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Anterior
                </Button>
                <span className="text-sm text-muted-foreground">
                  Página {page} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages || isFetching}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Lead del Chat</DialogTitle>
            <DialogDescription>
              Información de la reserva/consulta generada por el chat.
            </DialogDescription>
          </DialogHeader>

          {selected ? (
            <div className="grid gap-4 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${STATUS_STYLE[selected.status] ?? 'bg-gray-50 text-gray-700 ring-gray-700/10'}`}
                >
                  {STATUS_LABEL[selected.status] ?? selected.status}
                </span>
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                  {SOURCE_LABEL[selected.source ?? ''] ?? selected.source ?? 'Sin origen'}
                </span>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Nombre</p>
                  <p className="text-sm">{selected.name}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Fecha de creación</p>
                  <p className="text-sm">
                    {format(new Date(selected.created_at), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Email</p>
                  <p className="text-sm break-all">{selected.email}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Teléfono</p>
                  <p className="text-sm">{selected.phone || '—'}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium text-muted-foreground">Servicio</p>
                  <p className="text-sm">{selected.service_title || selected.booking_type || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Abogado</p>
                  <p className="text-sm">{selected.lawyer_name ?? (selected.lawyer_id ? 'Asignación manual' : '—')}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Booking ID</p>
                  <p className="text-sm font-mono">{selected.booking_id || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Cita</p>
                  <p className="text-sm">
                    {selected.selected_date
                      ? `${format(new Date(selected.selected_date), 'dd/MM/yyyy')}${selected.selected_time ? ` · ${selected.selected_time}` : ''}`
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Duración</p>
                  <p className="text-sm">
                    {selected.duration ? `${selected.duration} min` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Monto</p>
                  <p className="text-sm">{selected.price != null ? clp.format(selected.price) : '—'}</p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Nota: por privacidad, el contenido de la conversación del chat no se almacena; solo
                los datos de la reserva.
              </p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}