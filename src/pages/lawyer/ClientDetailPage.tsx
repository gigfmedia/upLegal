import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabaseClient';
import { useLawyerClient, useLawyerClients } from '@/hooks/useLawyerClients';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Save, Trash2 } from 'lucide-react';

const statusLabels: Record<string, string> = {
  new: 'Nuevo',
  quoted: 'Cotizado',
  paid: 'Pagado',
  in_progress: 'En progreso',
  delivered: 'Entregado',
  closed: 'Cerrado',
  cancelled: 'Cancelado',
  pending: 'Pendiente',
  pending_payment: 'Pendiente de pago',
  confirmed: 'Confirmada',
  completed: 'Completado',
};

export default function ClientDetailPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const { client, loading, error } = useLawyerClient(clientId);
  const { updateClient, deleteClient } = useLawyerClients();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [cases, setCases] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (client) {
      setName(client.name);
      setEmail(client.email || '');
      setPhone(client.phone || '');
      setNotes(client.notes || '');
    }
  }, [client]);

  useEffect(() => {
    if (!clientId || !user?.id) return;
    supabase.from('lawyer_cases').select('id,title,status,created_at').eq('client_id', clientId).eq('lawyer_id', user.id).order('created_at', { ascending: false }).then(({ data }) => setCases(data || []));
    supabase.from('bookings').select('id,user_name,service_title,status,price,created_at').eq('client_id', clientId).eq('lawyer_id', user.id).order('created_at', { ascending: false }).limit(20).then(({ data }) => setBookings(data || []));
  }, [clientId, user?.id]);

  const handleSave = async () => {
    if (!clientId) return;
    setSaving(true);
    try {
      await updateClient(clientId, { name, email: email || null, phone: phone || null, notes: notes || null });
      toast({ title: 'Cliente actualizado' });
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'No se pudo actualizar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!clientId || !confirm('¿Eliminar cliente? Los casos asociados quedarán sin cliente.')) return;
    try {
      await deleteClient(clientId);
      toast({ title: 'Cliente eliminado' });
      navigate('/lawyer/clients');
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'No se pudo eliminar', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-8 py-6">
        <Loader2 className="h-8 w-8 animate-spin text-gray-900" />
      </div>
    );
  }
  if (error || !client) {
    return (
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Button variant="ghost" onClick={() => navigate('/lawyer/clients')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver
        </Button>
        <p className="text-center text-gray-600 mt-8">{error || 'Cliente no encontrado'}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <Button variant="ghost" onClick={() => navigate('/lawyer/clients')}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Volver
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Ficha de cliente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Opcional" />
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Fuente</Label>
              <Input value={client.source} disabled />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Notas internas" />
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

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Casos ({cases.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {cases.length === 0 ? (
              <p className="text-sm text-gray-500">Sin casos asociados.</p>
            ) : (
              cases.map((c) => (
                <Link key={c.id} to={`/lawyer/cases/${c.id}`} className="block border rounded-lg p-3 hover:bg-gray-50">
                  <div className="font-medium text-sm">{c.title}</div>
                  <div className="text-xs text-gray-500">
                    {statusLabels[c.status] || c.status} · {new Date(c.created_at).toLocaleDateString('es-CL')}
                  </div>
                </Link>
              ))
            )}
            <Link to="/lawyer/cases">
              <Button variant="outline" size="sm" className="mt-2">
                Ver todos los casos
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reservas / Citas ({bookings.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {bookings.length === 0 ? (
              <p className="text-sm text-gray-500">Sin reservas vinculadas.</p>
            ) : (
              bookings.map((b) => (
                <div key={b.id} className="border rounded-lg p-3">
                  <div className="font-medium text-sm">{b.service_title || 'Reserva'}</div>
                  <div className="text-xs text-gray-500">
                    {statusLabels[b.status] || b.status} {b.price ? `· $${b.price.toLocaleString('es-CL')}` : ''} · {new Date(b.created_at).toLocaleDateString('es-CL')}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
