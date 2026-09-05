import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useLawyerCase, useLawyerCases, type CaseStatus } from '@/hooks/useLawyerCases';
import { useLawyerClients } from '@/hooks/useLawyerClients';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Save, Trash2, Calendar, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const statuses: CaseStatus[] = ['new', 'quoted', 'paid', 'in_progress', 'delivered', 'closed', 'cancelled'];

const statusLabels: Record<CaseStatus, string> = {
  new: 'Nuevo',
  quoted: 'Cotizado',
  paid: 'Pagado',
  in_progress: 'En progreso',
  delivered: 'Entregado',
  closed: 'Cerrado',
  cancelled: 'Cancelado',
};

const bookingStatusLabels: Record<string, string> = {
  pending: 'Pendiente',
  pending_payment: 'Pendiente de pago',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  completed: 'Completada',
  paid: 'Pagado',
};

const sourceLabels: Record<string, string> = {
  LAWYER_DIRECT: 'Directo',
  LEGALUP_MARKETPLACE: 'Marketplace',
  UNKNOWN: 'Desconocido',
};

export default function CaseDetailPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const { caseData, loading, error } = useLawyerCase(caseId);
  const { updateCase, deleteCase } = useLawyerCases();
  const { clients } = useLawyerClients();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<CaseStatus>('new');
  const [clientId, setClientId] = useState<string>('none');
  const [saving, setSaving] = useState(false);
  const [caseBookings, setCaseBookings] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);

  // hydrate when case loads
  useState(() => {
    if (caseData) {
      setTitle(caseData.title);
      setDescription(caseData.description || '');
      setStatus(caseData.status);
      setClientId(caseData.client_id || 'none');
    }
  });

  // useEffect for initial load
  if (caseData && title === '' && caseData.title) {
    // initial sync (avoid flicker)
    setTitle(caseData.title);
    setDescription(caseData.description || '');
    setStatus(caseData.status);
    setClientId(caseData.client_id || 'none');
  }

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

  const handleSave = async () => {
    if (!caseId) return;
    setSaving(true);
    try {
      await updateCase(caseId, {
        title,
        description: description || null,
        status,
        client_id: clientId === 'none' ? null : clientId,
      });
      toast({ title: 'Caso actualizado' });
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'No se pudo actualizar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!caseId || !confirm('¿Eliminar caso?')) return;
    try {
      await deleteCase(caseId);
      toast({ title: 'Caso eliminado' });
      navigate('/lawyer/cases');
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'No se pudo eliminar', variant: 'destructive' });
    }
  };

  const handleNewAppointmentForCase = () => {
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
  if (error || !caseData) {
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {caseData.title}
            <Badge variant="outline">{sourceLabels[caseData.source] || caseData.source}</Badge>
            <Badge>{statusLabels[caseData.status] || caseData.status}</Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Creado {new Date(caseData.created_at).toLocaleString('es-CL')} · Actualizado {new Date(caseData.updated_at).toLocaleString('es-CL')}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as CaseStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s} value={s}>
                      {statusLabels[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin cliente</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.email ? `· ${c.email}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {caseData.client && (
                <Link to={`/lawyer/clients/${caseData.client_id}`} className="text-sm text-green-500 hover:text-green-600 hover:underline">
                  Ver ficha de {caseData.client.name}
                </Link>
              )}
            </div>
            <div className="space-y-2">
              <Label>Solicitud / cita de origen</Label>
              <div className="text-sm">
                {caseData.booking ? (
                  <div className="border rounded p-2">
                    <div className="font-medium">{caseData.booking.service_title || 'Reserva'}</div>
                    <div className="text-xs text-gray-500">
                      {bookingStatusLabels[caseData.booking.status] || statusLabels[caseData.booking.status as CaseStatus] || caseData.booking.status} · {caseData.booking.user_name}
                    </div>
                  </div>
                ) : (
                  <span className="text-gray-400">Sin reserva de origen</span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Descripción del caso" />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} className="bg-gray-900 hover:bg-green-900">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />} Guardar
            </Button>
            <Button variant="outline" onClick={handleDelete} className="text-red-600 border-red-200 hover:bg-red-50">
              <Trash2 className="h-4 w-4 mr-1" /> Eliminar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Citas del caso — 1:N */}
      <Card>
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

      {caseData.client_id && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cliente asociado</CardTitle>
          </CardHeader>
          <CardContent>
            <Link to={`/lawyer/clients/${caseData.client_id}`} className="text-green-500 hover:text-green-600 hover:underline">
              Ver cliente
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
