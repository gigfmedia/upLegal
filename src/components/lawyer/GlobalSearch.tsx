import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';
import { Search, User, Briefcase, Calendar } from 'lucide-react';

type Result = { type: 'client' | 'case' | 'booking'; id: string; title: string; subtitle: string; href: string };

export function GlobalSearch() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      return;
    }
    if (!user?.id) return;
    const q = query.trim().toLowerCase();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const [clientsRes, casesRes, bookingsRes] = await Promise.all([
          supabase.from('lawyer_clients').select('id, name, email').eq('lawyer_id', user.id).ilike('name', `%${q}%`).limit(5),
          supabase.from('lawyer_cases').select('id, title').eq('lawyer_id', user.id).ilike('title', `%${q}%`).limit(5),
          supabase.from('bookings').select('id, user_name, service_title').eq('lawyer_id', user.id).ilike('user_name', `%${q}%`).limit(5),
        ]);
        const res: Result[] = [];
        (clientsRes.data || []).forEach((c: any) => res.push({ type: 'client', id: c.id, title: c.name, subtitle: c.email || '', href: `/lawyer/clients/${c.id}` }));
        (casesRes.data || []).forEach((c: any) => res.push({ type: 'case', id: c.id, title: c.title, subtitle: 'Caso', href: `/lawyer/cases/${c.id}` }));
        (bookingsRes.data || []).forEach((b: any) => res.push({ type: 'booking', id: b.id, title: b.user_name || 'Cita', subtitle: b.service_title || '', href: `/lawyer/citas` }));
        // also search clients by email
        if (q.includes('@')) {
          const { data: emailClients } = await supabase.from('lawyer_clients').select('id, name, email').eq('lawyer_id', user.id).ilike('email', `%${q}%`).limit(3);
          (emailClients || []).forEach((c: any) => {
            if (!res.find(r => r.id === c.id)) res.push({ type: 'client', id: c.id, title: c.name, subtitle: c.email, href: `/lawyer/clients/${c.id}` });
          });
        }
        setResults(res.slice(0, 8));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, user?.id]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input placeholder="Buscar clientes, casos, citas..." className="pl-9" value={query} onChange={e => setQuery(e.target.value)} />
      </div>
      {(query.length >= 2) && (
        <Card className="absolute z-10 mt-2 w-full shadow-lg max-h-80 overflow-auto">
          <CardContent className="p-2">
            {loading ? (
              <div className="p-3 text-sm text-gray-500">Buscando...</div>
            ) : results.length === 0 ? (
              <div className="p-3 text-sm text-gray-500">Sin resultados para "{query}"</div>
            ) : (
              <div className="space-y-1">
                {results.map(r => (
                  <Link key={`${r.type}-${r.id}`} to={r.href} onClick={() => setQuery('')} className="flex items-center gap-3 p-2 rounded hover:bg-gray-50">
                    {r.type === 'client' ? <User className="h-4 w-4 text-gray-400" /> : r.type === 'case' ? <Briefcase className="h-4 w-4 text-gray-400" /> : <Calendar className="h-4 w-4 text-gray-400" />}
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{r.title}</div>
                      <div className="text-xs text-gray-500 truncate">{r.subtitle}</div>
                    </div>
                    <span className="ml-auto text-xs text-gray-400 capitalize">{r.type === 'client' ? 'Cliente' : r.type === 'case' ? 'Caso' : 'Cita'}</span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
