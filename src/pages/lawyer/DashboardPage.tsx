import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { User, Calendar, Briefcase, FileText, Clock, Sparkles, ArrowRight, Loader2, Inbox, DollarSign, Users } from 'lucide-react';
import { ProfileCompletion } from '@/components/dashboard/ProfileCompletion';
import { useAISubscription } from '@/hooks/useAISubscription';
import { GoogleCalendarConnect } from '@/components/dashboard/GoogleCalendarConnect';

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  pending_payment: 'Pendiente de pago',
  confirmed: 'Confirmada',
  new: 'Nuevo',
  quoted: 'Cotizado',
  paid: 'Pagado',
  in_progress: 'En progreso',
  delivered: 'Entregado',
  closed: 'Cerrado',
  cancelled: 'Cancelada',
};
import { OnboardingCard } from '@/components/lawyer/OnboardingCard';
import { GlobalSearch } from '@/components/lawyer/GlobalSearch';
import { loadDemoData } from '@/lib/demoData';
import { trackOnboardingViewed } from '@/lib/activationAnalytics';

export default function LawyerDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, services, completionPercentage } = useProfile(user?.id);
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const aiSub = useAISubscription();

  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({ pendingRequests: 0, todayCount: 0, activeCases: 0, revenueMonth: 0 });
  const [nextAppointments, setNextAppointments] = useState<any[]>([]);
  const [attention, setAttention] = useState<{ title: string; desc: string; cta: string; href: string } | null>(null);
  const [stats, setStats] = useState({ clients: 0, cases: 0, services: 0 });

  useEffect(() => {
    if (searchParams.get('google_auth') === 'success') {
      toast({ title: 'Conexión Exitosa', description: 'Tu Google Calendar se ha conectado correctamente.', className: 'bg-green-50 border-green-200 text-green-900' });
      navigate('/lawyer/dashboard', { replace: true });
    }
  }, [searchParams, toast, navigate]);

  useEffect(() => {
    if (user?.id) trackOnboardingViewed(user.id);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const fetch = async () => {
      try {
        setLoading(true);
        const todayStr = new Date().toISOString().slice(0, 10);
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const [pendingRes, todayRes, casesRes, paymentsRes, clientsRes, servicesRes, nextRes, bookingsForAttention] = await Promise.all([
          supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('lawyer_id', user.id).in('status', ['pending', 'pending_payment']),
          supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('lawyer_id', user.id).eq('booking_type', 'appointment').eq('scheduled_date', todayStr).neq('status', 'cancelled'),
          supabase.from('lawyer_cases').select('id', { count: 'exact', head: true }).eq('lawyer_id', user.id).not('status', 'in', '("delivered","closed","cancelled")'),
          supabase.from('payments').select('lawyer_amount').eq('lawyer_id', user.id).gte('created_at', startOfMonth.toISOString()),
          supabase.from('lawyer_clients').select('id', { count: 'exact', head: true }).eq('lawyer_id', user.id),
          supabase.from('lawyer_services').select('id', { count: 'exact', head: true }).eq('lawyer_user_id', user.id),
          supabase.from('bookings').select('id, user_name, service_title, scheduled_date, scheduled_time, status').eq('lawyer_id', user.id).eq('booking_type', 'appointment').neq('status', 'cancelled').gte('scheduled_date', todayStr).order('scheduled_date', { ascending: true }).order('scheduled_time', { ascending: true }).limit(3),
          supabase.from('bookings').select('id, user_name, service_title, created_at').eq('lawyer_id', user.id).in('status', ['pending', 'pending_payment']).order('created_at', { ascending: false }).limit(1),
        ]);

        const pendingRequests = pendingRes.count ?? 0;
        const todayCount = (todayRes as any).count ?? 0;
        const activeCases = casesRes.count ?? 0;
        const revenueMonth = (paymentsRes.data || []).reduce((s: number, p: any) => s + (p.lawyer_amount ?? 0), 0);

        setKpis({ pendingRequests, todayCount, activeCases, revenueMonth });
        setNextAppointments(nextRes.data || []);
        setStats({ clients: clientsRes.count ?? 0, cases: activeCases, services: servicesRes.count ?? 0 });

        // REQUIERE TU ATENCIÓN logic: pending request > next appointment > active case
        if (pendingRequests > 0 && bookingsForAttention.data && bookingsForAttention.data.length > 0) {
          const r: any = bookingsForAttention.data[0];
          setAttention({ title: 'Nueva solicitud', desc: `${r.user_name || 'Cliente'} solicita ${r.service_title || 'asesoría'}`, cta: 'Revisar solicitud', href: '/lawyer/requests' });
        } else if ((nextRes.data || []).length > 0) {
          const n: any = nextRes.data![0];
          setAttention({ title: 'Próxima cita', desc: `${n.scheduled_time?.slice(0,5) || ''} · ${n.user_name || 'Cliente'} · ${n.service_title || 'Cita'}`, cta: 'Ver cita', href: '/lawyer/citas' });
        } else if (activeCases > 0) {
          setAttention({ title: 'Caso sin gestionar', desc: `Tienes ${activeCases} caso${activeCases>1?'s':''} activo${activeCases>1?'s':''} pendiente${activeCases>1?'s':''} de revisión.`, cta: 'Ver caso', href: '/lawyer/cases' });
        } else {
          setAttention(null);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [user?.id]);

  const handleLegalUpAIClick = () => {
    navigate('/lawyer/ai');
  };

  let aiBadgeText = 'IA diseñada para abogados. Analiza documentos, resume causas y redacta más rápido.';
  let aiCtaText = 'Conocer más';
  if (aiSub.status === 'none') {
    aiBadgeText = 'Prueba LegalUp AI gratis durante 5 días. Sin tarjeta.';
    aiCtaText = 'Empezar prueba gratis';
  } else if ((aiSub as any).isTrialing) {
    aiBadgeText = `Tu prueba de LegalUp AI termina pronto. Suscríbete por $49.900/mes para no perder el acceso.`;
    aiCtaText = 'Suscribirme';
  } else if ((aiSub as any).isActive) {
    aiBadgeText = 'Tu plan LegalUp AI está activo. Sigue trabajando tus casos con IA.';
    aiCtaText = 'Ir a LegalUp AI';
  } else if (aiSub.status === 'expired' || (aiSub as any).status === 'past_due' || aiSub.status === 'cancelled') {
    aiBadgeText = 'Reanuda tu acceso a LegalUp AI para seguir usando tus herramientas.';
    aiCtaText = 'Reanudar suscripción';
  }

  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Inicio</h1>
        <p className="text-muted-foreground">Gestiona tus clientes, casos, citas y oportunidades desde un solo lugar.</p>
      </div>

      <OnboardingCard />

      <GlobalSearch />

      {!loading && stats.clients === 0 && stats.cases === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="font-medium text-sm">¿Quieres ver cómo se ve con datos?</div>
              <div className="text-xs text-gray-500">Carga datos de demostración (2 clientes, 2 casos, 4 citas) solo para este abogado.</div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                if (!user?.id) return;
                try {
                  const res = await loadDemoData(user.id);
                  toast({ title: res.message });
                  setTimeout(() => window.location.reload(), 500);
                } catch (e) {
                  toast({ title: 'Error', description: e instanceof Error ? e.message : 'No se pudo cargar demo', variant: 'destructive' });
                }
              }}
            >
              Cargar demo
            </Button>
          </CardContent>
        </Card>
      )}

      {/* HOY */}
      <div>
        <h2 className="text-xs font-semibold tracking-widest text-gray-500 uppercase mb-3">Hoy</h2>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="hover:shadow-sm transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Solicitudes pendientes</span>
                <Inbox className="h-4 w-4 text-gray-400" />
              </div>
              {loading ? <div className="h-7 w-12 bg-gray-100 animate-pulse rounded" /> : <div className="text-2xl font-bold">{kpis.pendingRequests}</div>}
              <p className="text-xs text-gray-500 mt-1">{kpis.pendingRequests === 0 ? 'No tienes solicitudes nuevas.' : 'Por procesar'}</p>
              <Link to="/lawyer/requests" className="inline-flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-700 mt-3">Ver solicitudes <ArrowRight className="h-3 w-3" /></Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-sm transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Citas hoy</span>
                <Calendar className="h-4 w-4 text-gray-400" />
              </div>
              {loading ? <div className="h-7 w-12 bg-gray-100 animate-pulse rounded" /> : <div className="text-2xl font-bold">{kpis.todayCount}</div>}
              <p className="text-xs text-gray-500 mt-1">{kpis.todayCount === 0 ? 'Tu agenda está libre hoy.' : 'En tu agenda'}</p>
              <Link to="/lawyer/citas" className="inline-flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-700 mt-3">Ver agenda <ArrowRight className="h-3 w-3" /></Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-sm transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Casos activos</span>
                <Briefcase className="h-4 w-4 text-gray-400" />
              </div>
              {loading ? <div className="h-7 w-12 bg-gray-100 animate-pulse rounded" /> : <div className="text-2xl font-bold">{kpis.activeCases}</div>}
              <p className="text-xs text-gray-500 mt-1">{kpis.activeCases === 0 ? 'Cuando proceses una solicitud, podrás gestionarla como caso.' : 'En gestión'}</p>
              <Link to="/lawyer/cases" className="inline-flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-700 mt-3">Ver casos <ArrowRight className="h-3 w-3" /></Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-sm transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Ingresos del mes</span>
                <DollarSign className="h-4 w-4 text-gray-400" />
              </div>
              {loading ? <div className="h-7 w-20 bg-gray-100 animate-pulse rounded" /> : <div className="text-2xl font-bold">${kpis.revenueMonth.toLocaleString('es-CL')}</div>}
              <p className="text-xs text-gray-500 mt-1">{kpis.revenueMonth === 0 ? 'Aún no tienes ingresos registrados este mes.' : 'Este mes'}</p>
              <Link to="/lawyer/earnings" className="inline-flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-700 mt-3">Ver ingresos <ArrowRight className="h-3 w-3" /></Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* REQUIERE TU ATENCIÓN */}
      <div>
        <h2 className="text-xs font-semibold tracking-widest text-gray-500 uppercase mb-3">Requiere tu atención</h2>
        <Card>
          <CardContent className="p-5">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Cargando...</div>
            ) : attention ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="font-medium">{attention.title}</div>
                  <div className="text-sm text-gray-600">{attention.desc}</div>
                </div>
                <Button asChild className="bg-gray-900 hover:bg-green-900 shrink-0">
                  <Link to={attention.href}>{attention.cta} <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
              </div>
            ) : (
              <div className="text-center py-2">
                <div className="font-medium">Todo al día</div>
                <div className="text-sm text-gray-500">No tienes tareas pendientes por ahora.</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* PRÓXIMAS CITAS */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold tracking-widest text-gray-500 uppercase">Próximas citas</h2>
          <Link to="/lawyer/citas" className="text-xs font-medium text-green-600 hover:text-green-700">Ver agenda <ArrowRight className="h-3 w-3 inline" /></Link>
        </div>
        <Card>
          <CardContent className="p-4">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Cargando...</div>
            ) : nextAppointments.length === 0 ? (
              <div className="text-center py-6">
                <Calendar className="mx-auto h-8 w-8 text-gray-300" />
                <p className="text-sm font-medium mt-2">No tienes citas próximas.</p>
                <p className="text-xs text-gray-500">Cuando agendes una cita aparecerá aquí.</p>
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <Link to="/lawyer/citas">Crear una cita</Link>
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {nextAppointments.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <div>
                      <div className="font-medium text-sm">{a.scheduled_time?.slice(0,5) || ''} · {a.user_name || 'Cliente'}</div>
                      <div className="text-xs text-gray-500">{a.service_title || 'Cita'} · {statusLabels[a.status] || a.status}</div>
                    </div>
                    <div className="text-xs text-gray-400">{a.scheduled_date ? format(new Date(a.scheduled_date), 'dd-MM-yyyy') : ''}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* RESUMEN */}
      <div>
        <h2 className="text-xs font-semibold tracking-widest text-gray-500 uppercase mb-3">Resumen</h2>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Clientes</span>
                <Users className="h-4 w-4 text-gray-400" />
              </div>
              <div className="text-xl font-bold mt-1">{stats.clients}</div>
              <Link to="/lawyer/clients" className="text-xs text-green-600 hover:underline">Ver clientes</Link>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Casos</span>
                <Briefcase className="h-4 w-4 text-gray-400" />
              </div>
              <div className="text-xl font-bold mt-1">{stats.cases}</div>
              <Link to="/lawyer/cases" className="text-xs text-green-600 hover:underline">Ver casos</Link>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Servicios publicados</span>
                <FileText className="h-4 w-4 text-gray-400" />
              </div>
              <div className="text-xl font-bold mt-1">{stats.services}</div>
              <Link to="/lawyer/services" className="text-xs text-green-600 hover:underline">Administrar servicios</Link>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Tu perfil</span>
                <User className="h-4 w-4 text-gray-400" />
              </div>
              <div className="text-xl font-bold mt-1">{completionPercentage}%</div>
              <div className="text-xs text-gray-500">completo</div>
              <Link to="/lawyer/profile" className="text-xs text-green-600 hover:underline">Completar perfil</Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* LegalUp AI + Google Calendar — 2 col, misma altura */}
      <div className="grid gap-6 md:grid-cols-2 items-stretch">
        <div
          onClick={handleLegalUpAIClick}
          className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-white p-6 cursor-pointer hover:shadow-lg hover:shadow-green-500/20 transition-all duration-300 group h-full flex flex-col justify-center"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Nuevo</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  <span className="inline-flex items-center gap-1.5">
                    LegalUp
                    <span className="inline-flex h-[18.4px] items-center rounded-[5px] border border-emerald-400/40 bg-emerald-50 px-1.5 py-px text-[0.6rem] font-semibold leading-none tracking-[0.14em] text-emerald-700 transition-colors group-hover:bg-emerald-100">
                      AI
                    </span>
                  </span>
                </h3>
                <p className="text-gray-600 text-sm">{aiBadgeText}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-gray-900 rounded-lg px-4 py-2 text-white group-hover:bg-green-900 transition-colors">
              <span className="text-white font-medium text-sm">{aiCtaText}</span>
              <ArrowRight className="h-4 w-4 text-white group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>

        <div className="h-full">
          <GoogleCalendarConnect />
        </div>
      </div>
    </div>
  );
}
