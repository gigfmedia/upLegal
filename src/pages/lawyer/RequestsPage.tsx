import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useRequests, type RequestItem } from '@/hooks/useRequests';
import { useLawyerClients } from '@/hooks/useLawyerClients';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Search, Loader2, User, Mail, Phone, Calendar, DollarSign, FileText, ArrowRight } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

function statusColor(status: string) {
  if (['pending', 'quote_pending'].includes(status)) return 'bg-yellow-100 text-yellow-800';
  if (['quoted', 'quote_sent'].includes(status)) return 'bg-blue-100 text-blue-800';
  if (['paid', 'confirmed'].includes(status)) return 'bg-green-100 text-green-800';
  if (status === 'cancelled') return 'bg-red-100 text-red-800';
  return 'bg-gray-100 text-gray-800';
}

export default function RequestsPage() {
  const navigate = useNavigate();
  const { requests, loading, error, refetch } = useRequests();
  const { findOrCreateClient } = useLawyerClients();
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const filtered = requests.filter(
    (r) =>
      r.clientName.toLowerCase().includes(search.toLowerCase()) ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      (r.clientEmail || '').toLowerCase().includes(search.toLowerCase())
  );

  const isPending = (s: string) => ['pending', 'pending_payment', 'quote_pending'].includes(s);
  const pendingRequests = filtered.filter((r) => isPending(r.status));
  const processedRequests = filtered.filter((r) => !isPending(r.status));
  const [showProcessed, setShowProcessed] = useState(false);

  const handleProcess = async (req: RequestItem) => {
    if (!user?.id) return;
    setProcessingId(req.id);
    try {
      // 1. find or create client
      const client = await findOrCreateClient({
        name: req.clientName,
        email: req.clientEmail,
        phone: req.clientPhone,
        source: req.source || 'LEGALUP_MARKETPLACE',
        first_booking_id: req.kind === 'booking' ? req.rawId : null,
      });

      // 2. link booking -> client_id if booking
      if (req.kind === 'booking') {
        await supabase.from('bookings').update({ client_id: client.id }).eq('id', req.rawId).eq('lawyer_id', user.id);
        // mark pending as confirmed to indicate processed (safe, existing enum)
        if (req.status === 'pending') {
          await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', req.rawId).eq('lawyer_id', user.id).eq('status', 'pending');
        }
      }

      // 3. create case (or reuse if exists for same booking/quote)
      const casePayload: Record<string, unknown> = {
        lawyer_id: user.id,
        client_id: client.id,
        title: req.title,
        description: req.description,
        source: req.source || 'LEGALUP_MARKETPLACE',
        status: req.kind === 'quote' && req.status === 'pending' ? 'new' : req.status === 'paid' || req.status === 'confirmed' ? 'paid' : 'new',
        price_clp: req.price,
      };
      if (req.kind === 'booking') casePayload.booking_id = req.rawId;
      else casePayload.quote_request_id = req.rawId;

      let { data: existing } = await supabase
        .from('lawyer_cases')
        .select('id')
        .eq('lawyer_id', user.id)
        .eq(req.kind === 'booking' ? 'booking_id' : 'quote_request_id', req.rawId)
        .maybeSingle();

      let caseId: string | null = (existing as any)?.id || null;
      if (!caseId) {
        const { data, error } = await supabase.from('lawyer_cases').insert(casePayload).select('id').single();
        if (error) {
          // unique violation -> fetch existing
          if (error.code === '23505') {
            const { data: dup } = await supabase
              .from('lawyer_cases')
              .select('id')
              .eq('lawyer_id', user.id)
              .eq(req.kind === 'booking' ? 'booking_id' : 'quote_request_id', req.rawId)
              .maybeSingle();
            caseId = (dup as any)?.id || null;
          } else throw error;
        } else {
          caseId = (data as any).id;
        }
      }

      toast({ title: 'Solicitud procesada', description: `${client.name} → caso creado` });
      if (caseId) navigate(`/lawyer/cases/${caseId}`);
      else refetch();
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'No se pudo procesar', variant: 'destructive' });
    } finally {
      setProcessingId(null);
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Solicitudes</h1>
        <p className="text-muted-foreground">Solicitudes entrantes del Marketplace y directas</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por cliente o servicio..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
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
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay solicitudes</h3>
            <p className="mt-1 text-sm text-gray-500">Cuando un cliente reserve por el Marketplace aparecerá aquí.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Pendientes */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">Pendientes por procesar ({pendingRequests.length})</h3>
            {pendingRequests.length === 0 ? (
              <Card><CardContent className="p-4 text-sm text-gray-500 text-center">No hay solicitudes pendientes.</CardContent></Card>
            ) : (
              <div className="grid gap-4">
                {pendingRequests.map((req) => (
                  <Card key={req.id} className="hover:shadow-md transition-shadow border-l-4 border-l-yellow-400">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold truncate">{req.title}</h3>
                            <Badge className={`${statusColor(req.status)} border-0 text-xs`}>{req.status}</Badge>
                            <Badge variant="outline" className="text-xs">{req.kind === 'booking' ? 'Reserva' : 'Presupuesto'}</Badge>
                            {req.source && <Badge variant="outline" className="text-xs">{req.source}</Badge>}
                          </div>
                          <div className="mt-2 space-y-1 text-sm text-gray-600">
                            <div className="flex items-center gap-2"><User className="h-4 w-4 text-gray-400" /><span>{req.clientName}</span>{req.clientEmail && <><Mail className="h-4 w-4 text-gray-400 ml-2" /><span className="truncate">{req.clientEmail}</span></>}</div>
                            {req.clientPhone && <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-gray-400" /><span>{req.clientPhone}</span></div>}
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDistanceToNow(parseISO(req.createdAt), { addSuffix: true, locale: es })}</span>
                              {req.price && <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />${req.price.toLocaleString('es-CL')}</span>}
                              {req.scheduledDate && <span>{req.scheduledDate} {req.scheduledTime}</span>}
                            </div>
                            {req.description && <p className="text-sm bg-gray-50 p-2 rounded mt-2 line-clamp-2">{req.description}</p>}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 shrink-0">
                          <Button size="sm" onClick={() => handleProcess(req)} disabled={processingId === req.id} className="bg-gray-900 hover:bg-green-900">
                            {processingId === req.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <ArrowRight className="h-4 w-4 mr-1" />} Procesar solicitud
                          </Button>
                          {req.kind === 'quote' && <Button variant="outline" size="sm" onClick={() => navigate(`/lawyer/quotes/${req.rawId}`)}>Ver presupuesto</Button>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Procesadas */}
          {processedRequests.length > 0 && (
            <div className="space-y-4">
              <button onClick={() => setShowProcessed(!showProcessed)} className="text-sm font-medium text-gray-600 hover:text-gray-900">
                {showProcessed ? 'Ocultar' : 'Ver'} procesadas ({processedRequests.length}) {showProcessed ? '▲' : '▼'}
              </button>
              {showProcessed && (
                <div className="grid gap-4 opacity-75">
                  {processedRequests.map((req) => (
                    <Card key={req.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold truncate">{req.title}</h3>
                              <Badge className={`${statusColor(req.status)} border-0 text-xs`}>{req.status}</Badge>
                              <Badge variant="outline" className="text-xs">{req.kind === 'booking' ? 'Reserva' : 'Presupuesto'}</Badge>
                            </div>
                            <div className="mt-2 space-y-1 text-sm text-gray-600">
                              <div className="flex items-center gap-2"><User className="h-4 w-4 text-gray-400" /><span>{req.clientName}</span></div>
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDistanceToNow(parseISO(req.createdAt), { addSuffix: true, locale: es })}</span>
                              </div>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">Procesada</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
