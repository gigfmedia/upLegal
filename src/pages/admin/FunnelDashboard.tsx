import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Users, MessageSquare, Calendar, DollarSign, TrendingUp, ArrowRight, CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';

type TimeRange = 'today' | '7d' | '30d' | '90d' | 'custom';

interface FunnelStage {
  name: string;
  count: number;
  percentage: number;
  previousPercentage: number;
  dropoff: number;
}

interface LawyerConversion {
  lawyer_id: string;
  lawyer_name: string;
  bookings: number;
  payments: number;
  revenue: number;
  conversion: number;
}

interface SpecialtyConversion {
  specialty: string;
  bookings: number;
  payments: number;
  conversion: number;
}

interface DailyMetrics {
  date: string;
  visitors: number;
  leads: number;
  bookings: number;
  payments: number;
  revenue: number;
}

export default function FunnelDashboard() {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Get date range based on selection
  const getDateRange = () => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    switch (timeRange) {
      case 'today':
        return { start: todayStart, end: todayEnd };
      case '7d':
        return { start: startOfDay(subDays(now, 7)), end: todayEnd };
      case '30d':
        return { start: startOfDay(subDays(now, 30)), end: todayEnd };
      case '90d':
        return { start: startOfDay(subDays(now, 90)), end: todayEnd };
      case 'custom':
        return {
          start: customStartDate ? startOfDay(new Date(customStartDate)) : startOfDay(subDays(now, 30)),
          end: customEndDate ? endOfDay(new Date(customEndDate)) : todayEnd
        };
      default:
        return { start: startOfDay(subDays(now, 30)), end: todayEnd };
    }
  };

  const { start, end } = getDateRange();

  // Fetch all funnel data
  const { data: funnelData, isLoading } = useQuery({
    queryKey: ['funnel-data', timeRange, customStartDate, customEndDate],
    queryFn: async () => {
      // Fetch page views (visitors) - exclude admin, lawyer, test-analytics pages and localhost referrer
      const { data: pageViews } = await supabase
        .from('page_views')
        .select('visitor_id, user_id, page_path, referrer')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .not('page_path', 'ilike', '%/admin%')
        .not('page_path', 'ilike', '%/lawyer%')
        .not('page_path', 'ilike', '%/test-analytics%')
        .not('page_path', 'ilike', '%localhost%')
        .not('page_path', 'ilike', '%127.0.0.1%')
        .not('referrer', 'ilike', '%localhost%')
        .not('referrer', 'ilike', '%127.0.0.1%');

      // Count unique visitors using visitor_id (tracks anonymous users)
      const uniqueVisitorIds = new Set(pageViews?.map(pv => pv.visitor_id).filter(Boolean) || []);
      const visitorsCount = uniqueVisitorIds.size;

      // Fetch commercial intent visitors - only pages that can lead to paid consultation
      const commercialPaths = [
        '/',
        '/search',
        '/abogado',
        '/consulta',
        '/asesoria-legal-online',
        '/contacto',
        '/como-funciona'
      ];

      const commercialPageViews = pageViews?.filter(pv =>
        commercialPaths.some(path => pv.page_path.startsWith(path))
      ) || [];

      const commercialVisitorIds = new Set(commercialPageViews.map(pv => pv.visitor_id).filter(Boolean));
      const commercialVisitorsCount = commercialVisitorIds.size;

      // Fetch booking leads via server endpoint (service role key bypasses RLS on auth.users FK)
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const leadsRes = await fetch(
        `${apiBase}/api/admin/booking-leads-count?start=${start.toISOString()}&end=${end.toISOString()}`
      );
      const leadsJson = leadsRes.ok ? await leadsRes.json() : { count: 0, daily: [] };
      const leadsCount = leadsJson.count ?? 0;
      const dailyLeadTimestamps: string[] = leadsJson.daily ?? [];

      // Fetch bookings
      const { data: bookings, count: bookingsCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      // Fetch bookings by status
      const [
        { count: pendingPayments },
        { count: confirmedBookings },
        { count: completedBookings }
      ] = await Promise.all([
        supabase.from('bookings').select('*', { count: 'exact', head: true }).gte('created_at', start.toISOString()).lte('created_at', end.toISOString()).eq('payment_status', 'pending'),
        supabase.from('bookings').select('*', { count: 'exact', head: true }).gte('created_at', start.toISOString()).lte('created_at', end.toISOString()).eq('status', 'confirmed'),
        supabase.from('bookings').select('*', { count: 'exact', head: true }).gte('created_at', start.toISOString()).lte('created_at', end.toISOString()).eq('status', 'completed')
      ]);

      // Fetch payments
      const { data: payments, count: paymentsCount } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .eq('status', 'approved');

      // Calculate total revenue
      const totalRevenue = payments?.reduce((sum, p) => sum + (p.total_amount || 0), 0) || 0;

      // Fetch lawyer conversions
      const { data: lawyerData } = await supabase
        .from('bookings')
        .select('lawyer_id, profiles!inner(first_name, last_name, specialties)')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      // Fetch payments for lawyer conversions
      const { data: lawyerPayments } = await supabase
        .from('payments')
        .select('lawyer_user_id, total_amount')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .eq('status', 'approved');

      // Calculate lawyer conversions
      const lawyerMap = new Map<string, LawyerConversion>();
      lawyerData?.forEach((booking: any) => {
        const lawyerId = booking.lawyer_id;
        if (!lawyerMap.has(lawyerId)) {
          lawyerMap.set(lawyerId, {
            lawyer_id: lawyerId,
            lawyer_name: `${booking.profiles.first_name} ${booking.profiles.last_name}`,
            bookings: 0,
            payments: 0,
            revenue: 0,
            conversion: 0
          });
        }
        lawyerMap.get(lawyerId)!.bookings++;
      });

      lawyerPayments?.forEach((payment: any) => {
        const lawyerId = payment.lawyer_user_id;
        if (lawyerMap.has(lawyerId)) {
          lawyerMap.get(lawyerId)!.payments++;
          lawyerMap.get(lawyerId)!.revenue += payment.total_amount || 0;
        }
      });

      // Calculate conversion rates
      lawyerMap.forEach((lawyer) => {
        lawyer.conversion = lawyer.bookings > 0 ? (lawyer.payments / lawyer.bookings) * 100 : 0;
      });

      const lawyerConversions = Array.from(lawyerMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 20);

      // Calculate specialty conversions
      const specialtyMap = new Map<string, SpecialtyConversion>();
      lawyerData?.forEach((booking: any) => {
        const specialties = booking.profiles.specialties || [];
        specialties.forEach((specialty: string) => {
          if (!specialtyMap.has(specialty)) {
            specialtyMap.set(specialty, {
              specialty,
              bookings: 0,
              payments: 0,
              conversion: 0
            });
          }
          specialtyMap.get(specialty)!.bookings++;
        });
      });

      lawyerPayments?.forEach((payment: any) => {
        // Find bookings for this lawyer to get specialties
        const lawyerBookings = lawyerData?.filter((b: any) => b.lawyer_id === payment.lawyer_user_id) || [];
        lawyerBookings.forEach((booking: any) => {
          const specialties = booking.profiles.specialties || [];
          specialties.forEach((specialty: string) => {
            if (specialtyMap.has(specialty)) {
              specialtyMap.get(specialty)!.payments++;
            }
          });
        });
      });

      specialtyMap.forEach((spec) => {
        spec.conversion = spec.bookings > 0 ? (spec.payments / spec.bookings) * 100 : 0;
      });

      const specialtyConversions = Array.from(specialtyMap.values())
        .sort((a, b) => b.bookings - a.bookings);

      // Sanity checks for funnel consistency
      const sanityChecks = {
        leadsGTEBookings: leadsCount >= bookingsCount,
        bookingsGTEPayments: bookingsCount >= paymentsCount,
        revenueConsistent: totalRevenue > 0 && paymentsCount > 0
      };

      // Log warnings if sanity checks fail
      if (!sanityChecks.leadsGTEBookings) {
        console.warn('[Funnel] Sanity check: leads < bookings (can happen if bookings were created without going through lead flow)', { leadsCount, bookingsCount });
      }
      if (!sanityChecks.bookingsGTEPayments) {
        console.warn('[Funnel] Sanity check failed: bookings < payments', { bookingsCount, paymentsCount });
      }

      // Fetch daily metrics for evolution chart
      const { data: dailyPageViews } = await supabase
        .from('page_views')
        .select('created_at')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .not('page_path', 'ilike', '%localhost%')
        .not('page_path', 'ilike', '%127.0.0.1%');

      // dailyLeads timestamps already fetched above via server endpoint
      const dailyLeads = dailyLeadTimestamps.map(ts => ({ created_at: ts }));

      const { data: dailyBookings } = await supabase
        .from('bookings')
        .select('created_at, price')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      const { data: dailyPayments } = await supabase
        .from('payments')
        .select('created_at, total_amount')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .eq('status', 'approved');

      // Aggregate by day
      const dailyMetricsMap = new Map<string, DailyMetrics>();
      const currentDate = new Date(start);
      while (currentDate <= end) {
        const dateKey = format(currentDate, 'yyyy-MM-dd');
        dailyMetricsMap.set(dateKey, {
          date: dateKey,
          visitors: 0,
          leads: 0,
          bookings: 0,
          payments: 0,
          revenue: 0
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }

      dailyPageViews?.forEach((pv: any) => {
        const dateKey = format(new Date(pv.created_at), 'yyyy-MM-dd');
        const metrics = dailyMetricsMap.get(dateKey);
        if (metrics) metrics.visitors++;
      });

      dailyLeads?.forEach((lead: any) => {
        const dateKey = format(new Date(lead.created_at), 'yyyy-MM-dd');
        const metrics = dailyMetricsMap.get(dateKey);
        if (metrics) metrics.leads++;
      });

      dailyBookings?.forEach((booking: any) => {
        const dateKey = format(new Date(booking.created_at), 'yyyy-MM-dd');
        const metrics = dailyMetricsMap.get(dateKey);
        if (metrics) metrics.bookings++;
      });

      dailyPayments?.forEach((payment: any) => {
        const dateKey = format(new Date(payment.created_at), 'yyyy-MM-dd');
        const metrics = dailyMetricsMap.get(dateKey);
        if (metrics) {
          metrics.payments++;
          metrics.revenue += payment.total_amount || 0;
        }
      });

      const dailyMetrics = Array.from(dailyMetricsMap.values());

      return {
        visitors: visitorsCount || 0,
        commercialVisitors: commercialVisitorsCount || 0,
        leads: leadsCount || 0,
        bookings: bookingsCount || 0,
        pendingPayments: pendingPayments || 0,
        confirmedBookings: confirmedBookings || 0,
        completedBookings: completedBookings || 0,
        payments: paymentsCount || 0,
        totalRevenue,
        lawyerConversions,
        specialtyConversions,
        dailyMetrics
      };
    },
    enabled: !!start && !!end
  });

  // Calculate acquisition funnel - using commercial intent visitors as base
  const acquisitionFunnel: FunnelStage[] = funnelData ? [
    {
      name: 'Visitantes con intención comercial',
      count: funnelData.commercialVisitors,
      percentage: 100,
      previousPercentage: 100,
      dropoff: 0
    },
    {
      name: 'Lead creado',
      count: funnelData.leads,
      percentage: funnelData.commercialVisitors > 0 ? (funnelData.leads / funnelData.commercialVisitors) * 100 : 0,
      previousPercentage: funnelData.commercialVisitors > 0 ? (funnelData.leads / funnelData.commercialVisitors) * 100 : 0,
      dropoff: funnelData.commercialVisitors - funnelData.leads
    },
    {
      name: 'Booking creado',
      count: funnelData.bookings,
      percentage: funnelData.commercialVisitors > 0 ? (funnelData.bookings / funnelData.commercialVisitors) * 100 : 0,
      previousPercentage: funnelData.leads > 0 ? (funnelData.bookings / funnelData.leads) * 100 : 0,
      dropoff: funnelData.leads - funnelData.bookings
    },
    {
      name: 'Pago aprobado',
      count: funnelData.payments,
      percentage: funnelData.commercialVisitors > 0 ? (funnelData.payments / funnelData.commercialVisitors) * 100 : 0,
      previousPercentage: funnelData.bookings > 0 ? (funnelData.payments / funnelData.bookings) * 100 : 0,
      dropoff: funnelData.bookings - funnelData.payments
    },
    {
      name: 'Consulta completada',
      count: funnelData.completedBookings,
      percentage: funnelData.commercialVisitors > 0 ? (funnelData.completedBookings / funnelData.commercialVisitors) * 100 : 0,
      previousPercentage: funnelData.payments > 0 ? (funnelData.completedBookings / funnelData.payments) * 100 : 0,
      dropoff: funnelData.payments - funnelData.completedBookings
    }
  ] : [];

  // Calculate commercial funnel
  const commercialFunnel: FunnelStage[] = funnelData ? [
    {
      name: 'Booking creado',
      count: funnelData.bookings,
      percentage: 100,
      previousPercentage: 100,
      dropoff: 0
    },
    {
      name: 'Pago pendiente',
      count: funnelData.pendingPayments,
      percentage: funnelData.bookings > 0 ? (funnelData.pendingPayments / funnelData.bookings) * 100 : 0,
      previousPercentage: funnelData.bookings > 0 ? (funnelData.pendingPayments / funnelData.bookings) * 100 : 0,
      dropoff: funnelData.bookings - funnelData.pendingPayments
    },
    {
      name: 'Pago aprobado',
      count: funnelData.payments,
      percentage: funnelData.bookings > 0 ? (funnelData.payments / funnelData.bookings) * 100 : 0,
      previousPercentage: funnelData.pendingPayments > 0 ? (funnelData.payments / funnelData.pendingPayments) * 100 : 0,
      dropoff: funnelData.pendingPayments - funnelData.payments
    },
    {
      name: 'Consulta confirmada',
      count: funnelData.confirmedBookings,
      percentage: funnelData.bookings > 0 ? (funnelData.confirmedBookings / funnelData.bookings) * 100 : 0,
      previousPercentage: funnelData.payments > 0 ? (funnelData.confirmedBookings / funnelData.payments) * 100 : 0,
      dropoff: funnelData.payments - funnelData.confirmedBookings
    },
    {
      name: 'Consulta completada',
      count: funnelData.completedBookings,
      percentage: funnelData.bookings > 0 ? (funnelData.completedBookings / funnelData.bookings) * 100 : 0,
      previousPercentage: funnelData.confirmedBookings > 0 ? (funnelData.completedBookings / funnelData.confirmedBookings) * 100 : 0,
      dropoff: funnelData.confirmedBookings - funnelData.completedBookings
    }
  ] : [];

  // Calculate key metrics
  const visitorToPaymentRate = funnelData?.visitors > 0 ? (funnelData.payments / funnelData.visitors) * 100 : 0;
  const bookingToPaymentRate = funnelData?.bookings > 0 ? (funnelData.payments / funnelData.bookings) * 100 : 0;
  const averageTicket = funnelData?.payments > 0 ? funnelData.totalRevenue / funnelData.payments : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-900" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Funnel de Conversión</h2>
          <p className="text-muted-foreground">Análisis del flujo de conversión de LegalUp</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={(value: TimeRange) => setTimeRange(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoy</SelectItem>
              <SelectItem value="7d">Últimos 7 días</SelectItem>
              <SelectItem value="30d">Últimos 30 días</SelectItem>
              <SelectItem value="90d">Últimos 90 días</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
          {timeRange === 'custom' && (
            <>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="border rounded px-3 py-2 text-sm"
              />
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="border rounded px-3 py-2 text-sm"
              />
            </>
          )}
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Visitantes (total)"
          value={funnelData?.visitors || 0}
          icon={Users}
          trend={null}
        />
        <MetricCard
          title="Visitantes con intención comercial"
          value={funnelData?.commercialVisitors || 0}
          icon={Users}
          trend={null}
        />
        <MetricCard
          title="Leads creados"
          value={funnelData?.leads || 0}
          icon={MessageSquare}
          trend={null}
        />
        <MetricCard
          title="Bookings creados"
          value={funnelData?.bookings || 0}
          icon={Calendar}
          trend={null}
        />
        <MetricCard
          title="Pagos aprobados"
          value={funnelData?.payments || 0}
          icon={DollarSign}
          trend={null}
        />
        <MetricCard
          title="Revenue total"
          value={`$${(funnelData?.totalRevenue || 0).toLocaleString('es-CL')}`}
          icon={TrendingUp}
          trend={null}
        />
        <MetricCard
          title="Ticket promedio"
          value={`$${Math.round(averageTicket).toLocaleString('es-CL')}`}
          icon={DollarSign}
          trend={null}
        />
        <MetricCard
          title="Conversión intención → pago"
          value={funnelData?.commercialVisitors > 0 ? `${((funnelData.payments / funnelData.commercialVisitors) * 100).toFixed(1)}%` : '0%'}
          icon={TrendingUp}
          trend={null}
        />
      </div>

      {/* Funnels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Acquisition Funnel */}
        <Card>
          <CardHeader>
            <CardTitle>Funnel de Adquisición</CardTitle>
            <CardDescription>Desde visitante hasta consulta completada</CardDescription>
          </CardHeader>
          <CardContent>
            <FunnelChart stages={acquisitionFunnel} />
          </CardContent>
        </Card>

        {/* Commercial Funnel */}
        <Card>
          <CardHeader>
            <CardTitle>Funnel Comercial</CardTitle>
            <CardDescription>Desde booking hasta consulta completada</CardDescription>
          </CardHeader>
          <CardContent>
            <FunnelChart stages={commercialFunnel} />
          </CardContent>
        </Card>
      </div>

      {/* Daily Evolution Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Evolución Diaria</CardTitle>
          <CardDescription>Visitas, leads, bookings, pagos y revenue por día</CardDescription>
        </CardHeader>
        <CardContent>
          <DailyEvolutionChart data={funnelData?.dailyMetrics || []} />
        </CardContent>
      </Card>

      {/* Specialty Conversions */}
      <Card>
        <CardHeader>
          <CardTitle>Conversión por Especialidad</CardTitle>
          <CardDescription>
            Agrupado por especialidades de abogados.
            <span className="text-xs text-muted-foreground block mt-1">
              Nota: Si un abogado tiene múltiples especialidades, su revenue se cuenta en cada categoría.
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SpecialtyTable data={funnelData?.specialtyConversions || []} />
        </CardContent>
      </Card>

      {/* Lawyer Conversions */}
      <Card>
        <CardHeader>
          <CardTitle>Conversión por Abogado</CardTitle>
          <CardDescription>Top 20 abogados por revenue</CardDescription>
        </CardHeader>
        <CardContent>
          <LawyerTable data={funnelData?.lawyerConversions || []} />
        </CardContent>
      </Card>
    </div>
  );
}

// Helper Components
function MetricCard({ title, value, icon: Icon, trend }: any) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="h-4 w-4 text-muted-foreground">
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function FunnelChart({ stages }: { stages: FunnelStage[] }) {
  const maxCount = Math.max(...stages.map(s => s.count), 1);

  return (
    <div className="space-y-3">
      {stages.map((stage, index) => (
        <div key={index} className="space-y-1">
          <div className="flex justify-between items-center text-sm">
            <span className="font-medium">{stage.name}</span>
            <div className="flex items-center gap-2">
              <span className="font-bold">{stage.count}</span>
              <Badge variant="outline" className="text-xs">
                {stage.percentage.toFixed(1)}%
              </Badge>
              {index > 0 && (
                <span className="text-xs text-muted-foreground">
                  ({stage.previousPercentage.toFixed(1)}% etapa anterior)
                </span>
              )}
            </div>
          </div>
          <div className="relative h-8 bg-gray-100 rounded overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
              style={{ width: `${(stage.count / maxCount) * 100}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-medium">
              {stage.dropoff > 0 && index > 0 && (
                <span className="bg-red-500/80 px-2 py-0.5 rounded">
                  -{stage.dropoff} ({((stage.dropoff / stages[index - 1].count) * 100).toFixed(1)}%)
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function DailyEvolutionChart({ data }: { data: DailyMetrics[] }) {
  const maxValue = Math.max(
    ...data.map(d => Math.max(d.visitors, d.leads, d.bookings, d.payments)),
    1
  );

  return (
    <div className="space-y-4">
      <div className="h-64">
        <svg className="w-full h-full" viewBox={`0 0 ${data.length * 40} 200`} preserveAspectRatio="none">
          {/* Visitors line */}
          <polyline
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            points={data.map((d, i) => `${i * 40 + 20},${200 - (d.visitors / maxValue) * 180}`).join(' ')}
          />
          {/* Leads line */}
          <polyline
            fill="none"
            stroke="#10b981"
            strokeWidth="2"
            points={data.map((d, i) => `${i * 40 + 20},${200 - (d.leads / maxValue) * 180}`).join(' ')}
          />
          {/* Bookings line */}
          <polyline
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2"
            points={data.map((d, i) => `${i * 40 + 20},${200 - (d.bookings / maxValue) * 180}`).join(' ')}
          />
          {/* Payments line */}
          <polyline
            fill="none"
            stroke="#ef4444"
            strokeWidth="2"
            points={data.map((d, i) => `${i * 40 + 20},${200 - (d.payments / maxValue) * 180}`).join(' ')}
          />
        </svg>
      </div>
      <div className="flex gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-500 rounded" />
          <span>Visitantes</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-500 rounded" />
          <span>Leads</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-yellow-500 rounded" />
          <span>Bookings</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-500 rounded" />
          <span>Pagos</span>
        </div>
      </div>
      <div className="max-h-48 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white">
            <tr>
              <th className="text-left p-2">Fecha</th>
              <th className="text-right p-2">Visitantes</th>
              <th className="text-right p-2">Leads</th>
              <th className="text-right p-2">Bookings</th>
              <th className="text-right p-2">Pagos</th>
              <th className="text-right p-2">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d, i) => (
              <tr key={i} className="border-t">
                <td className="p-2">{format(new Date(d.date), 'dd/MM', { locale: es })}</td>
                <td className="text-right p-2">{d.visitors}</td>
                <td className="text-right p-2">{d.leads}</td>
                <td className="text-right p-2">{d.bookings}</td>
                <td className="text-right p-2">{d.payments}</td>
                <td className="text-right p-2">${d.revenue.toLocaleString('es-CL')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SpecialtyTable({ data }: { data: SpecialtyConversion[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="text-left p-3">Especialidad</th>
            <th className="text-right p-3">Bookings</th>
            <th className="text-right p-3">Pagos</th>
            <th className="text-right p-3">Conversión</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, i) => (
            <tr key={i} className="border-t">
              <td className="p-3 font-medium">{item.specialty}</td>
              <td className="text-right p-3">{item.bookings}</td>
              <td className="text-right p-3">{item.payments}</td>
              <td className="text-right p-3">
                <Badge variant={item.conversion > 50 ? 'default' : 'secondary'}>
                  {item.conversion.toFixed(1)}%
                </Badge>
              </td>
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={4} className="text-center p-8 text-muted-foreground">
                No hay datos de especialidades disponibles
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function LawyerTable({ data }: { data: LawyerConversion[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="text-left p-3">Abogado</th>
            <th className="text-right p-3">Bookings</th>
            <th className="text-right p-3">Pagos</th>
            <th className="text-right p-3">Revenue</th>
            <th className="text-right p-3">Conversión</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, i) => (
            <tr key={i} className="border-t">
              <td className="p-3 font-medium">{item.lawyer_name}</td>
              <td className="text-right p-3">{item.bookings}</td>
              <td className="text-right p-3">{item.payments}</td>
              <td className="text-right p-3">${item.revenue.toLocaleString('es-CL')}</td>
              <td className="text-right p-3">
                <Badge variant={item.conversion > 50 ? 'default' : 'secondary'}>
                  {item.conversion.toFixed(1)}%
                </Badge>
              </td>
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={5} className="text-center p-8 text-muted-foreground">
                No hay datos de abogados disponibles
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
