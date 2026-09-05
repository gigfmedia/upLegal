import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';
import { Search, User, Briefcase, Calendar, Loader2 } from 'lucide-react';

type Result = { type: 'client' | 'case' | 'booking'; id: string; title: string; subtitle: string; href: string };

export function GlobalSearch() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    if (!user?.id) {
      setLoading(false);
      return;
    }
    const q = trimmed.toLowerCase();
    setLoading(true);
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const [clientsRes, casesRes, bookingsRes] = await Promise.all([
          supabase.from('lawyer_clients').select('id, name, email').eq('lawyer_id', user.id).ilike('name', `%${q}%`).limit(5),
          supabase.from('lawyer_cases').select('id, title').eq('lawyer_id', user.id).ilike('title', `%${q}%`).limit(5),
          supabase.from('bookings').select('id, user_name, service_title').eq('lawyer_id', user.id).ilike('user_name', `%${q}%`).limit(5),
        ]);
        if (cancelled) return;
        const res: Result[] = [];
        (clientsRes.data || []).forEach((c: any) => res.push({ type: 'client', id: c.id, title: c.name, subtitle: c.email || '', href: `/lawyer/clients/${c.id}` }));
        (casesRes.data || []).forEach((c: any) => res.push({ type: 'case', id: c.id, title: c.title, subtitle: 'Caso', href: `/lawyer/cases/${c.id}` }));
        (bookingsRes.data || []).forEach((b: any) => res.push({ type: 'booking', id: b.id, title: b.user_name || 'Cita', subtitle: b.service_title || '', href: `/lawyer/citas` }));
        if (q.includes('@')) {
          const { data: emailClients } = await supabase.from('lawyer_clients').select('id, name, email').eq('lawyer_id', user.id).ilike('email', `%${q}%`).limit(3);
          if (!cancelled) {
            (emailClients || []).forEach((c: any) => {
              if (!res.find(r => r.id === c.id)) res.push({ type: 'client', id: c.id, title: c.name, subtitle: c.email, href: `/lawyer/clients/${c.id}` });
            });
          }
        }
        if (!cancelled) setResults(res.slice(0, 8));
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, user?.id]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user?.id) return null;

  const showResults = isFocused && query.length >= 2;

  return (
    <div className="fixed top-[7px] left-1/2 -translate-x-1/2 z-[60] hidden md:flex flex-col items-center">
      <div ref={wrapperRef} className="relative w-[400px] min-w-[400px] max-w-[calc(100vw-32px)]">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
          <Input
            placeholder="Buscar clientes, casos, citas…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            className="h-[50px] w-full rounded-full border border-gray-200 bg-white pl-12 pr-12 text-sm shadow-sm placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-green-400 transition-colors"
          />
          {loading && (
            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
          )}
        </div>

        {showResults && (
          <Card className="absolute top-full mt-3 w-full rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 max-h-[380px] overflow-auto">
            <CardContent className="p-2">
              {loading ? (
                <div className="p-4 text-sm text-gray-500 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Buscando…
                </div>
              ) : results.length === 0 ? (
                <div className="p-4 text-sm text-gray-500">Sin resultados para "{query}"</div>
              ) : (
                <div className="space-y-1">
                  {results.map(r => (
                    <Link
                      key={`${r.type}-${r.id}`}
                      to={r.href}
                      onClick={() => { setQuery(''); setIsFocused(false); }}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                        {r.type === 'client' ? <User className="h-4 w-4 text-gray-500" /> : r.type === 'case' ? <Briefcase className="h-4 w-4 text-gray-500" /> : <Calendar className="h-4 w-4 text-gray-500" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{r.title}</div>
                        <div className="text-xs text-gray-500 truncate">{r.subtitle}</div>
                      </div>
                      <span className="ml-auto text-[11px] font-medium tracking-wide text-gray-400 uppercase shrink-0">
                        {r.type === 'client' ? 'Cliente' : r.type === 'case' ? 'Caso' : 'Cita'}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
