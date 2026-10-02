import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Briefcase, ArrowRight, Loader2, Inbox, DollarSign, Users } from 'lucide-react';
import { useProSubscription } from '@/hooks/useProSubscription';
import { useCaseEntitlement } from '@/hooks/useCaseEntitlement';

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
import { loadDemoData } from '@/lib/demoData';
import { takeProPendingAction } from '@/lib/proPurchaseIntent';
import { trackOnboardingViewed, trackBookingCreated } from '@/lib/activationAnalytics';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AppointmentForm } from '@/components/appointments/AppointmentForm';
import { useLawyerClients } from '@/hooks/useLawyerClients';
import { ProPricingModal } from '@/components/legalup-pro/ProPricingModal';
import { ActionCenter } from '@/components/lawyer/ActionCenter';
import { CaseManagementDrawer } from '@/components/lawyer/CaseManagementDrawer';
import { useLawyerCases } from '@/hooks/useLawyerCases';
import { useAllCaseTasks } from '@/hooks/useCaseTasks';
import { formatStaleLabel } from '@/lib/actionCenter';
import { isBookingDeniedError } from '@/lib/appointmentEntitlement';
import posthog from 'posthog-js';

export default function LawyerDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({ pendingRequests: 0, todayCount: 0, activeCases: 0, revenueMonth: 0 });
  const [nextAppointments, setNextAppointments] = useState<any[]>([]);
  const [stats, setStats] = useState({ clients: 0, cases: 0 });
  const [showNewAppointment, setShowNewAppointment] = useState(false);
  const { findOrCreateClient } = useLawyerClients();
  // FASE 5.2 — Action Center: 1 query de casos (hook existente) + 1 query
  // de tareas. Sin gates: el caso gratuito participa igual.
  const { cases: actionCases, loading: actionCasesLoading, applyPatch: applyActionPatch } = useLawyerCases();
  const { tasks: actionTasks, loading: actionTasksLoading, refetch: refetchActionTasks, completeTask: completeActionTask } = useAllCaseTasks();
  const [manageCaseId, setManageCaseId] = useState<string | null>(null);
  const manageCase = manageCaseId ? actionCases.find((c) => c.id === manageCaseId) ?? null : null;

  useEffect(() => {
    if (searchParams.get('google_auth') === 'success') {
      toast({ title: 'Conexión Exitosa', description: 'Tu Google Calendar se ha conectado correctamente.', className: 'bg-green-50 border-green-200 text-green-900' });
      navigate('/lawyer/dashboard', { replace: true });
    }
  }, [searchParams, toast, navigate]);

  const { hasProAccess, refetch: refetchPro, isFetching: isFetchingPro, status: proStatus } = useProSubscription();
  // 4.36B — lifetime free-case authority (survives case deletion).
  const { entitlement: caseEntitlement, loading: entitlementLoading } = useCaseEntitlement();
  const hasProAccessCheck = hasProAccess;
  const [proPaywallOpen, setProPaywallOpen] = useState(false);
  // 4.57D: Plus checkout intent preserves its target through signup.
  const [dashboardPaywallTarget, setDashboardPaywallTarget] = useState<'pro' | 'plus'>('pro');
  // 4.37B — dedicated paywall for manual appointment creation
  // (triggerAction must stay create_appointment, distinct from dashboard_get_started).
  const [apptPaywallOpen, setApptPaywallOpen] = useState(false);
  const [proVerificationState, setProVerificationState] = useState<'idle' | 'verifying' | 'timeout'>('idle');
  const [proVerificationAttempts, setProVerificationAttempts] = useState(0);

  const isProReturn = searchParams.get('pro_subscription_success') === 'true';

  // PRO.2.3: retomar intención de checkout pendiente tras signup/onboarding
  // (el modal reconcilia preapprovals existentes, no duplica suscripciones).
  // Solo abogados autenticados sin Pro; un solo consumo por intención.
  // 4.57D: la intención Plus retoma el modal en modo Plus.
  const proIntentResumedRef = useRef(false);
  useEffect(() => {
    if (!user || hasProAccessCheck || proIntentResumedRef.current) return;
    proIntentResumedRef.current = true;
    const pending = takeProPendingAction();
    if (pending === 'checkout') setProPaywallOpen(true);
    else if (pending === 'checkout_plus') {
      setDashboardPaywallTarget('plus');
      setProPaywallOpen(true);
    }
  }, [user, hasProAccessCheck]);

  useEffect(() => {
    if (!isProReturn) return;
    // Si ya tiene Pro, éxito inmediato
    if (hasProAccessCheck) {
      try { posthog.capture('pro_checkout_returned', { status: 'success' }); } catch {}
      try { posthog.capture('pro_access_confirmed', { attempts: 0, elapsed_ms: 0 }); } catch {}
      toast({ title: '¡LegalUp Pro activado!', description: 'Ya puedes gestionar clientes, casos, solicitudes, citas y usar LegalUp AI en tus casos.' });
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('pro_subscription_success');
      navigate(`/lawyer/dashboard${newParams.toString() ? `?${newParams.toString()}` : ''}`, { replace: true });
      setProVerificationState('idle');
      return;
    }

    // No tiene Pro aún → iniciar verificación con polling acotado
    let cancelled = false;
    const start = Date.now();
    const run = async () => {
      try { posthog.capture('pro_checkout_returned', { status: 'success' }); } catch {}
      setProVerificationState('verifying');
      for (let i = 0; i < 5; i++) {
        if (cancelled) return;
        setProVerificationAttempts(i + 1);
        const result: any = await refetchPro();
        const sub = result.data as any;
        const periodEndMs = sub?.current_period_end ? Date.parse(sub.current_period_end) : 0;
        const isActiveNow = sub && (sub.status === 'active' || sub.status === 'cancelled') && periodEndMs > Date.now();
        // También considerar hasProAccess actualizado del hook en siguiente render, pero usamos result
        if (isActiveNow) {
          if (cancelled) return;
          try { posthog.capture('pro_access_confirmed', { attempts: i + 1, elapsed_ms: Date.now() - start }); } catch {}
          toast({ title: '¡LegalUp Pro activado!', description: 'Ya puedes gestionar clientes, casos, solicitudes, citas y usar LegalUp AI en tus casos.' });
          const newParams = new URLSearchParams(searchParams);
          newParams.delete('pro_subscription_success');
          navigate(`/lawyer/dashboard${newParams.toString() ? `?${newParams.toString()}` : ''}`, { replace: true });
          setProVerificationState('idle');
          return;
        }
        if (i < 4) await new Promise((r) => setTimeout(r, 1500));
      }
      if (!cancelled) {
        setProVerificationState('timeout');
        try { posthog.capture('pro_access_verification_timeout', { attempts: 5 }); } catch {}
      }
    };
    run();
    return () => { cancelled = true; };
  }, [isProReturn, hasProAccessCheck, refetchPro, searchParams, toast, navigate]);

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

        // 5.2C — solo lo que el layout usa: conteos para KPIs/alerta,
        // próximas 3 citas e ingresos del mes. Sin queries de secciones eliminadas.
        const [pendingRes, todayRes, casesRes, paymentsRes, clientsRes, nextRes] = await Promise.all([
          supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('lawyer_id', user.id).in('status', ['pending', 'pending_payment']),
          supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('lawyer_id', user.id).eq('booking_type', 'appointment').eq('scheduled_date', todayStr).neq('status', 'cancelled'),
          supabase.from('lawyer_cases').select('id', { count: 'exact', head: true }).eq('lawyer_id', user.id).not('status', 'in', '("closed","cancelled")'),
          supabase.from('payments').select('lawyer_amount').eq('lawyer_id', user.id).gte('created_at', startOfMonth.toISOString()),
          supabase.from('lawyer_clients').select('id', { count: 'exact', head: true }).eq('lawyer_id', user.id),
          supabase.from('bookings').select('id, user_name, service_title, scheduled_date, scheduled_time, status').eq('lawyer_id', user.id).eq('booking_type', 'appointment').neq('status', 'cancelled').gte('scheduled_date', todayStr).order('scheduled_date', { ascending: true }).order('scheduled_time', { ascending: true }).limit(3),
        ]);

        const pendingRequests = pendingRes.count ?? 0;
        const todayCount = (todayRes as any).count ?? 0;
        const activeCases = casesRes.count ?? 0;
        const revenueMonth = (paymentsRes.data || []).reduce((s: number, p: any) => s + (p.lawyer_amount ?? 0), 0);

        setKpis({ pendingRequests, todayCount, activeCases, revenueMonth });
        setNextAppointments(nextRes.data || []);
        setStats({ clients: clientsRes.count ?? 0, cases: activeCases });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [user?.id]);

  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Inicio</h1>
        <p className="text-muted-foreground">Gestiona lo que requiere tu atención y mantén tus asuntos al día.</p>
      </div>

      <OnboardingCard />

      {!loading && !entitlementLoading && stats.clients === 0 && stats.cases === 0 && !hasProAccess && !caseEntitlement.freeCaseConsumed && (
        <Card className="border-dashed">
          <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="font-medium text-sm">Crea tu primer caso</div>
              <div className="text-xs text-gray-500">Organiza tu primer cliente y caso sin costo. Tu primer caso directo no requiere Pro.</div>
            </div>
            <Button
              size="sm"
              className="bg-gray-900 hover:bg-green-900 shrink-0"
              onClick={() => navigate('/lawyer/cases')}
            >
              Crear mi primer caso
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && !entitlementLoading && stats.clients === 0 && stats.cases === 0 && !hasProAccess && caseEntitlement.freeCaseConsumed && (
        <Card className="border-dashed">
          <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="font-medium text-sm">Empieza a organizar tu práctica con LegalUp Pro</div>
              <div className="text-xs text-gray-500">Gestiona clientes, casos, solicitudes y citas desde un solo lugar.</div>
            </div>
            <Button
              size="sm"
              className="bg-gray-900 hover:bg-green-900 shrink-0"
              onClick={() => {
                try { posthog.capture('pro_paywall_opened', { action: 'dashboard_get_started' }); } catch {}
                setProPaywallOpen(true);
              }}
            >
              Activar LegalUp Pro
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && stats.clients === 0 && stats.cases === 0 && hasProAccess && (
        <Card className="border-dashed">
          <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="font-medium text-sm">¿Quieres ver cómo funciona con datos de ejemplo?</div>
              <div className="text-xs text-gray-500">Agrega datos de ejemplo para conocer el flujo de LegalUp Pro. Son datos reales de ejemplo (2 clientes, 2 casos, 4 citas) que puedes eliminar después manualmente.</div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={async () => {
                if (!user?.id) return;
                try { posthog.capture('pro_demo_data_clicked', { source: 'dashboard' }); } catch {}
                try {
                  const res = await loadDemoData(user.id);
                  try { posthog.capture('pro_demo_data_loaded', { created: (res as any).created ?? 6 }); } catch {}
                  toast({ title: res.message });
                  setTimeout(() => window.location.reload(), 500);
                } catch (e) {
                  try { posthog.capture('pro_demo_data_failed', { error: e instanceof Error ? e.message : 'unknown' }); } catch {}
                  toast({ title: 'Error', description: e instanceof Error ? e.message : 'No se pudo cargar datos de ejemplo', variant: 'destructive' });
                }
              }}
            >
              Cargar datos de ejemplo
            </Button>
          </CardContent>
        </Card>
      )}

      {isProReturn && proVerificationState === 'verifying' && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-amber-600 shrink-0" />
            <div>
              <div className="font-medium text-sm text-amber-900">Estamos verificando tu pago</div>
              <div className="text-xs text-amber-700">Esto puede tardar unos segundos. Intento {proVerificationAttempts}/5{isFetchingPro ? ' · verificando…' : ''}</div>
            </div>
          </CardContent>
        </Card>
      )}

      {isProReturn && proVerificationState === 'timeout' && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="font-medium text-sm text-amber-900">Tu pago está siendo procesado</div>
              <div className="text-xs text-amber-700">Si Mercado Pago aprobó la suscripción, el acceso se activará automáticamente. Puedes actualizar en unos segundos.</div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0"
              disabled={isFetchingPro}
              onClick={async () => {
                setProVerificationState('verifying');
                setProVerificationAttempts(0);
                const result: any = await refetchPro();
                const sub = result.data as any;
                const periodEndMs = sub?.current_period_end ? Date.parse(sub.current_period_end) : 0;
                const isActiveNow = sub && (sub.status === 'active' || sub.status === 'cancelled') && periodEndMs > Date.now();
                if (isActiveNow) {
                  try { posthog.capture('pro_access_confirmed', { attempts: 1, elapsed_ms: 0 }); } catch {}
                  toast({ title: '¡LegalUp Pro activado!', description: 'Ya puedes gestionar clientes, casos, solicitudes, citas y usar LegalUp AI en tus casos.' });
                  const newParams = new URLSearchParams(searchParams);
                  newParams.delete('pro_subscription_success');
                  navigate(`/lawyer/dashboard${newParams.toString() ? `?${newParams.toString()}` : ''}`, { replace: true });
                  setProVerificationState('idle');
                } else {
                  setProVerificationState('timeout');
                  try { posthog.capture('pro_access_verification_timeout', { attempts: 1 }); } catch {}
                }
              }}
            >
              {isFetchingPro ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Verificando…</> : 'Verificar nuevamente'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* FASE 5.2 — Action Center primero: lo accionable antes que las métricas. */}
      <ActionCenter
        cases={actionCases}
        tasks={actionTasks}
        loading={actionCasesLoading || actionTasksLoading}
        onOpenCase={setManageCaseId}
        onCompleteTask={completeActionTask}
      />

      {/* 5.2C — KPIs compactos: una superficie, 4 métricas, click navega. */}
      <Card className="overflow-hidden">
        <CardContent className="grid grid-cols-2 gap-px bg-gray-100 p-0 lg:grid-cols-4">
          <Link to="/lawyer/clients" className="flex items-center gap-3 bg-white p-4 hover:bg-gray-50">
            <Users className="h-5 w-5 shrink-0 text-gray-400" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block text-xl font-bold leading-none">{loading ? '…' : stats.clients}</span>
              <span className="mt-1 block text-xs text-muted-foreground">Clientes</span>
            </span>
          </Link>
          <Link to="/lawyer/cases" className="flex items-center gap-3 bg-white p-4 hover:bg-gray-50">
            <Briefcase className="h-5 w-5 shrink-0 text-gray-400" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block text-xl font-bold leading-none">{loading ? '…' : kpis.activeCases}</span>
              <span className="mt-1 block text-xs text-muted-foreground">Casos activos</span>
            </span>
          </Link>
          <Link to="/lawyer/citas" className="flex items-center gap-3 bg-white p-4 hover:bg-gray-50">
            <Calendar className="h-5 w-5 shrink-0 text-gray-400" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block text-xl font-bold leading-none">{loading ? '…' : kpis.todayCount}</span>
              <span className="mt-1 block text-xs text-muted-foreground">Citas hoy</span>
            </span>
          </Link>
          <Link to="/lawyer/earnings" className="flex items-center gap-3 bg-white p-4 hover:bg-gray-50">
            <DollarSign className="h-5 w-5 shrink-0 text-gray-400" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block truncate text-xl font-bold leading-none">{loading ? '…' : `$${kpis.revenueMonth.toLocaleString('es-CL')}`}</span>
              <span className="mt-1 block text-xs text-muted-foreground">Ingresos mes</span>
            </span>
          </Link>
        </CardContent>
      </Card>

      {/* 5.2C — solicitudes: solo aviso compacto si hay pendientes. */}
      {!loading && kpis.pendingRequests > 0 && (
        <Link
          to="/lawyer/requests"
          className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm hover:bg-amber-100/60"
        >
          <span className="inline-flex min-w-0 items-center gap-2 font-medium text-amber-900">
            <Inbox className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{kpis.pendingRequests} solicitud{kpis.pendingRequests === 1 ? '' : 'es'} nueva{kpis.pendingRequests === 1 ? '' : 's'}</span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-amber-800">
            Ver solicitudes <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </span>
        </Link>
      )}

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
              <div className="flex flex-col gap-2 py-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">No tienes citas próximas.</p>
                <Button variant="outline" size="sm" className="shrink-0 self-start sm:self-auto" onClick={() => {
                  // 4.37B — manual creation requires active Pro; never open a
                  // dead form for non-Pro (RLS would reject with a generic error).
                  if (!hasProAccess) {
                    try { posthog.capture('pro_paywall_opened', { action: 'create_appointment' }); } catch { /* analytics best-effort; never blocks UX */ }
                    setApptPaywallOpen(true);
                    return;
                  }
                  setShowNewAppointment(true);
                }}>
                  Crear una cita
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

      {/* 5.2C — Actividad reciente: solo casos actualizados (datos ya
          cargados por el Action Center). Sin tabla/event bus nuevos. */}
      {!actionCasesLoading && actionCases.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold tracking-widest text-gray-500 uppercase mb-3">Actividad reciente</h2>
          <ul className="space-y-0.5">
            {[...actionCases]
              .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
              .slice(0, 4)
              .map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setManageCaseId(c.id)}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-gray-900">{c.title}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {formatStaleLabel(c.updated_at)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
          </ul>
        </div>
      )}

      <Dialog open={showNewAppointment} onOpenChange={setShowNewAppointment}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Cita</DialogTitle>
          </DialogHeader>
          <AppointmentForm
            initialData={{ date: format(new Date(), 'yyyy-MM-dd'), time: '10:00', duration: '60', type: 'video', service: '', clientName: '', clientEmail: '', clientPhone: '', notes: '' }}
            onSubmit={async (data: any) => {
              try {
                let clientId: string | null = null;
                try {
                  const client = await findOrCreateClient({ name: data.clientName, email: data.clientEmail || null, phone: data.clientPhone || null, source: 'LAWYER_DIRECT' });
                  clientId = client.id;
                } catch {}
                const { error } = await supabase.from('bookings').insert({
                  lawyer_id: user!.id,
                  user_name: data.clientName,
                  user_email: data.clientEmail || `no-email-${Date.now()}@placeholder.invalid`,
                  user_phone: data.clientPhone || null,
                  scheduled_date: data.date,
                  scheduled_time: data.time,
                  duration: parseInt(data.duration, 10) || 60,
                  price: 0,
                  status: 'confirmed',
                  booking_type: 'appointment',
                  service_title: data.service || 'Cita',
                  source: 'LAWYER_DIRECT',
                  client_id: clientId,
                  requires_meeting: data.type === 'video',
                } as any);
                if (error) throw error;
                try { if (user?.id) await trackBookingCreated(user.id, 'LAWYER_DIRECT', false); } catch { /* analytics best-effort; never blocks UX */ }
                toast({ title: 'Cita creada', description: 'La cita ha sido agendada correctamente.' });
                setShowNewAppointment(false);
                window.location.reload();
              } catch (e) {
                console.error(e);
                // 4.37B — stale entitlement: confirm with fresh authority read
                // before paywalling; unknown errors keep the generic toast.
                if (isBookingDeniedError(e)) {
                  try {
                    const result = await refetchPro();
                    const fresh = (result as { data?: unknown }).data as {
                      status?: string;
                      current_period_end?: string;
                    } | null | undefined;
                    const periodEndMs = fresh?.current_period_end ? Date.parse(fresh.current_period_end) : 0;
                    const stillPro =
                      !!fresh && (fresh.status === 'active' || fresh.status === 'cancelled') && periodEndMs > Date.now();
                    if (!stillPro) {
                      try { posthog.capture('pro_paywall_opened', { action: 'create_appointment', reason: 'entitlement_rejected' }); } catch { /* analytics best-effort; never blocks UX */ }
                      setShowNewAppointment(false);
                      setApptPaywallOpen(true);
                      return;
                    }
                  } catch {
                    // Fresh read unavailable — fall through to generic error.
                  }
                }
                toast({ title: 'Error', description: 'No se pudo crear la cita.', variant: 'destructive' });
              }
            }}
            onCancel={() => setShowNewAppointment(false)}
          />
        </DialogContent>
      </Dialog>
      <ProPricingModal open={proPaywallOpen} onOpenChange={setProPaywallOpen} triggerAction="dashboard_get_started" targetPlan={dashboardPaywallTarget} />
      {/* FASE 5.2 — drawer reusable: click en un item abre la gestión sin navegar. */}
      {manageCase && (
        <CaseManagementDrawer
          caseData={manageCase}
          open={manageCaseId !== null}
          onOpenChange={(o) => {
            if (!o) {
              setManageCaseId(null);
              void refetchActionTasks();
            }
          }}
          onCaseUpdated={(patch) => {
            if (manageCaseId) applyActionPatch(manageCaseId, patch);
          }}
        />
      )}
      <ProPricingModal open={apptPaywallOpen} onOpenChange={setApptPaywallOpen} triggerAction="create_appointment" />
    </div>
  );
}
