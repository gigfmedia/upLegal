import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useLawyerClients } from '@/hooks/useLawyerClients';
import { useToast } from '@/hooks/use-toast';
import { Search, Loader2, User, Mail, Phone, Plus, Eye } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ClientsPage() {
  const { clients, loading, error, createClient } = useLawyerClients();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(
    () =>
      clients.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
          (c.phone || '').includes(search)
      ),
    [clients, search]
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: 'Nombre requerido', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await createClient({ name, email: email || null, phone: phone || null, source: 'LAWYER_DIRECT' });
      toast({ title: 'Cliente creado' });
      setName('');
      setEmail('');
      setPhone('');
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
          <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">Clientes del estudio — aislados por abogado</p>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-gray-900 hover:bg-green-900">
          <Plus className="h-4 w-4 mr-1" /> Nuevo cliente
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nombre, email o teléfono..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-sm text-red-800">{error}</CardContent>
        </Card>
      )}

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <User className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay clientes</h3>
            <p className="mt-1 text-sm text-gray-500">Crea tu primer cliente o procesa una solicitud.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((c) => (
            <Card key={c.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{c.name}</h3>
                    <div className="mt-2 space-y-1 text-sm text-gray-600">
                      {c.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span className="truncate">{c.email}</span>
                        </div>
                      )}
                      {c.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span>{c.phone}</span>
                        </div>
                      )}
                      <div className="text-xs text-gray-500">
                        Creado {formatDistanceToNow(parseISO(c.created_at), { addSuffix: true, locale: es })}
                        {c.source && c.source !== 'UNKNOWN' && ` · ${c.source === 'LAWYER_DIRECT' ? 'Directo' : c.source === 'LEGALUP_MARKETPLACE' ? 'Marketplace' : c.source}`}
                      </div>
                    </div>
                  </div>
                  <Link to={`/lawyer/clients/${c.id}`}>
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
            <DialogTitle>Nuevo cliente</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Juan Pérez" required />
            </div>
            <div className="space-y-2">
              <Label>Email (opcional)</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="juan@email.com" type="email" />
              <p className="text-xs text-gray-500">Si el email ya existe para tu estudio, se reutilizará el cliente.</p>
            </div>
            <div className="space-y-2">
              <Label>Teléfono (opcional)</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+569..." />
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
