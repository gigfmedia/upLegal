import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Users, Calendar, Eye, BarChart2, Clock, Landmark, AlertCircle, CheckCircle2, Timer, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { formatDistanceToNow } from 'date-fns';

// Types
type PageView = {
  id: string;
  page_path: string;
  page_title: string;
  user_id: string | null;
  created_at: string;
  user_agent: string;
  referrer: string | null;
};

type AppointmentStats = {
  total: number;
  completed: number;
  pending: number;
  cancelled: number;
  recent: Array<{
    id: string;
    created_at: string;
    status: string;
    user_name: string;
    lawyer_name: string;
    service_title: string;
  }>;
};

type PaymentEvent = {
  id: string;
  event_type: 'started' | 'success' | 'failure' | 'pending';
  created_at: string;
  amount: number | null;
  status: string | null;
  metadata: any;
};

type ErrorLog = {
  id: string;
  type: string;
  message: string;
  details?: any;
  user_id?: string;
  path?: string;
  created_at: string;
  is_database_error?: boolean;
};

import { useAuth } from '@/contexts/AuthContext';
// Helper Components
const StatCard = ({ title, value, icon: Icon, trend, trendText, className = '' }) => (
  <Card className={className}>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <div className="h-4 w-4 text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {trend && (
        <p className="text-xs text-muted-foreground">
          {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% {trendText}
        </p>
      )}
    </CardContent>
  </Card>
);

const RecentActivityItem = ({ item, type }) => {
  const getStatusBadge = (status: string) => {
    const statusMap = {
      completed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800',
      confirmed: 'bg-blue-100 text-blue-800',
    };
    
    return (
      <span className={`text-xs px-2 py-1 rounded-full ${statusMap[status] || 'bg-gray-100'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-colors">
      <div className="flex items-center space-x-3">
        <div className="p-2 rounded-full bg-slate-100">
          {type === 'appointment' ? (
            <Calendar className="h-4 w-4 text-slate-600" />
          ) : (
            <Eye className="h-4 w-4 text-slate-600" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium">
            {type === 'appointment' 
              ? `Nueva cita: ${item.service_title}`
              : item.page_title || item.page_path}
          </p>
          <p className="text-xs text-slate-500">
            {type === 'appointment' 
              ? `${item.user_name} con ${item.lawyer_name}`
              : item.page_path}
          </p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        {type === 'appointment' && getStatusBadge(item.status)}
        <span className="text-xs text-slate-400">
          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: es })}
        </span>
      </div>
    </div>
  );
};

const ErrorTable = ({ errors, isLoading }: { errors: ErrorLog[]; isLoading: boolean }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="text-xs uppercase bg-slate-50">
          <tr>
            <th className="px-4 py-2">Tipo</th>
            <th className="px-4 py-2">Mensaje</th>
            <th className="px-4 py-2">Fecha</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr><td colSpan={3} className="text-center py-4"><Loader2 className="animate-spin inline mr-2" /></td></tr>
          ) : errors.length === 0 ? (
            <tr><td colSpan={3} className="text-center py-4 text-muted-foreground">No hay errores</td></tr>
          ) : (
            errors.map(error => (
              <tr key={error.id} className="border-b">
                <td className="px-4 py-2">
                  <Badge variant={error.is_database_error ? "destructive" : "outline"}>{error.type}</Badge>
                </td>
                <td className="px-4 py-2 max-w-md truncate">{error.message}</td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {formatDistanceToNow(new Date(error.created_at), { addSuffix: true, locale: es })}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

// Main Component
export default function AnalyticsDashboard() {
  const { user } = useAuth();
  const [showDevData, setShowDevData] = useState(false);

  // Fetch payment events
  const { data: paymentEvents = [], isLoading: isLoadingPayments, error: paymentEventsError } = useQuery({
    queryKey: ['payment-events', user?.id],
    queryFn: async () => {
      // Use the user from auth context that we know is authenticated
      console.log('[Analytics] Current user from context:', user?.id, user?.email);
      
      if (!user) {
        console.warn('[Analytics] No user found in context, returning empty data');
        return []; 
      }
      
      // Check admin status
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      console.log('[Analytics] User role:', profile?.role);
      
      const { data, error, count } = await supabase
        .from('payment_events')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching payment events:', error);
        throw error;
      }
      
      console.log('[Analytics] Payment events fetched:', data?.length || 0, 'events (total in DB:', count, ')');
      return data as PaymentEvent[];
    },
    retry: 1
  });

  // Fetch page views
  const { data: pageViews = [], isLoading: isLoadingPageViews, error: pageViewsError } = useQuery({
    queryKey: ['page-views', user?.id, showDevData],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('page_views')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);
      
      if (error) {
        console.error('Error fetching page views:', error);
        throw error; // Let react-query handle the error state
      }

      // Filter logic
      const filtered = (data || []).filter((view: PageView) => {
        if (showDevData) return true; // Show everything if toggle is on

        const referrer = view.referrer?.toLowerCase() || '';
        const path = view.page_path?.toLowerCase() || '';
        
        // Exclude localhost URLs (any port from 3000-5174)
        const isLocalhost = 
          referrer.includes('localhost') ||
          referrer.includes('127.0.0.1') ||
          path.includes('localhost') ||
          path.includes('127.0.0.1');
        
        return !isLocalhost;
      }) as PageView[];
      
      console.log('[Analytics] Page views fetched:', filtered.length, 'views (total:', data?.length || 0, ')');
      
      return filtered;
    },
    retry: 1
  });

  // Fetch recent appointments for lists
  const { data: recentAppointments = [], error: appointmentsError } = useQuery({
    queryKey: ['recent-appointments-list'],
    queryFn: async () => {
      // Always check bookings first since that's where new appointments are created
      const { data: bookings, error: bookingsError, count: bookingsCount } = await supabase
        .from('bookings')
        .select('id, created_at, status, user_name, lawyer_id, scheduled_date, scheduled_time, price', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(50);
      
      console.log('[Analytics] Bookings query result:', {
        count: bookingsCount,
        found: bookings?.length || 0,
        error: bookingsError?.message,
        today: bookings?.filter((b: any) => {
          const created = new Date(b.created_at);
          const today = new Date();
          return created.toDateString() === today.toDateString();
        }).length || 0
      });
      
      // Also check appointments
      const { data: appts, error: apptsError, count: apptsCount } = await supabase
        .from('appointments')
        .select(`
          id,
          created_at,
          status,
          name,
          lawyer_id,
          consultation_type,
          type,
          appointment_date,
          appointment_time
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(50);
      
      console.log('[Analytics] Appointments query result:', {
        count: apptsCount,
        found: appts?.length || 0,
        error: apptsError?.message
      });
      
      // Combine both sources, prioritizing bookings (newer system)
      const allAppointments: any[] = [];
      
      // Add bookings first
      if (bookings && bookings.length > 0) {
        const lawyerIds = [...new Set(bookings.map((b: any) => b.lawyer_id).filter(Boolean))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, display_name')
          .in('id', lawyerIds);

        const profileMap = (profiles || []).reduce((acc: any, p) => {
          acc[p.id] = p.display_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Abogado';
          return acc;
        }, {});
        
        bookings.forEach((b: any) => {
          allAppointments.push({
            id: b.id,
            created_at: b.created_at,
            status: b.status || 'pending',
            user_name: b.user_name || 'Usuario',
            lawyer_name: profileMap[b.lawyer_id] || 'Abogado',
            service_title: 'Cita agendada',
            source: 'booking'
          });
        });
      }
      
      // Add appointments (avoid duplicates by checking ID)
      if (appts && appts.length > 0 && !apptsError) {
        const existingIds = new Set(allAppointments.map(a => a.id));
        const lawyerIds = [...new Set(appts.map((a: any) => a.lawyer_id).filter(Boolean))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, display_name')
          .in('id', lawyerIds);

        const profileMap = (profiles || []).reduce((acc: any, p) => {
          acc[p.id] = p.display_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Abogado';
          return acc;
        }, {});
        
        appts.forEach((a: any) => {
          if (!existingIds.has(a.id)) {
            allAppointments.push({
              id: a.id,
              created_at: a.created_at,
              status: a.status,
              user_name: a.name || 'Usuario',
              lawyer_name: profileMap[a.lawyer_id] || 'Abogado',
              service_title: a.consultation_type || a.type || 'Servicio',
              source: 'appointment'
            });
          }
        });
      }
      
      // Sort by created_at descending
      allAppointments.sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      
      console.log('[Analytics] Combined appointments:', {
        total: allAppointments.length,
        fromBookings: allAppointments.filter(a => a.source === 'booking').length,
        fromAppointments: allAppointments.filter(a => a.source === 'appointment').length
      });
      
      return allAppointments.slice(0, 50) as any[];

      // If no appointments, try bookings table
      if (!appts || appts.length === 0) {
        console.log('[Analytics] No appointments found, checking bookings table...');
        const { data: bookings, error: bookingsError, count: bookingsCount } = await supabase
          .from('bookings')
          .select('id, created_at, status, user_name, lawyer_id, scheduled_date, scheduled_time', { count: 'exact' })
          .order('created_at', { ascending: false })
          .limit(50);
        
        console.log('[Analytics] Bookings fallback query result:', {
          count: bookingsCount,
          found: bookings?.length || 0,
          error: bookingsError?.message
        });
        
        if (bookingsError) {
          console.error("[Analytics] Error fetching bookings:", bookingsError);
        return [];
      }

        if (!bookings || bookings.length === 0) {
          console.log('[Analytics] No bookings found either');
          return [];
        }
        
        console.log('[Analytics] Found', bookings.length, 'bookings');

      // Fetch lawyer names separately
        const lawyerIds = [...new Set(bookings.map((b: any) => b.lawyer_id).filter(Boolean))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, display_name')
          .in('id', lawyerIds);

        const profileMap = (profiles || []).reduce((acc: any, p) => {
          acc[p.id] = p.display_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Abogado';
          return acc;
        }, {});
        
        return bookings.map((b: any) => ({
          id: b.id,
          created_at: b.created_at,
          status: b.status || 'pending',
          user_name: b.user_name || 'Usuario',
          lawyer_name: profileMap[b.lawyer_id] || 'Abogado',
          service_title: 'Cita agendada',
        })) as any[];
      }

      console.log('[Analytics] Found', appts.length, 'appointments');

      // Fetch lawyer names separately
      const lawyerIds = [...new Set(appts.map((a: any) => a.lawyer_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, display_name')
        .in('id', lawyerIds);

      const profileMap = (profiles || []).reduce((acc: any, p) => {
        acc[p.id] = p.display_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Abogado';
        return acc;
      }, {});
      
      return appts.map((a: any) => ({
        id: a.id,
        created_at: a.created_at,
        status: a.status,
        user_name: a.name || 'Usuario',
        lawyer_name: profileMap[a.lawyer_id] || 'Abogado',
        service_title: a.consultation_type || a.type || 'Servicio',
      })) as any[];
    },
    retry: 1
  });



  // Fetch error logs
  const { data: errorLogs = [], isLoading: isLoadingErrors, error: errorLogsError } = useQuery({
    queryKey: ['admin-errors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('error_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);
      
      if (error) {
        console.error('Error fetching error logs:', error);
        throw error;
    }
      return (data || []) as ErrorLog[];
    },
    retry: 1
  });

  // Fetch comprehensive stats
  const { data: realStats, isLoading: isLoadingStats, error: statsError } = useQuery({
    queryKey: ['admin-real-stats', pageViews.length], // Depend on filtered pageViews
    queryFn: async () => {
      const now = new Date();
      
      // Calculate date ranges in Chile timezone (GMT-3)
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayEnd.getDate() + 1);
      todayEnd.setMilliseconds(todayEnd.getMilliseconds() - 1);

      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const sixtyDaysAgo = new Date(now);
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      
      console.log('[Analytics] Date ranges (Chile timezone):', {
        now: now.toISOString(),
        nowLocal: now.toLocaleString('es-CL', { timeZone: 'America/Santiago' }),
        todayStart: todayStart.toISOString(),
        todayEnd: todayEnd.toISOString()
      });

      // Total Counts - Check appointments and bookings (page views already filtered above)
      const [
        { count: totalAppts }, 
        { count: apptCurrentPeriod }, 
        { count: apptPreviousPeriod },
        { count: apptToday },
        { count: totalBookings },
        { count: bookingCurrentPeriod },
        { count: bookingPreviousPeriod },
        { count: bookingToday }
      ] = await Promise.all([
        supabase.from('appointments').select('*', { count: 'exact', head: true }),
        supabase.from('appointments').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo.toISOString()),
        supabase.from('appointments').select('*', { count: 'exact', head: true }).lt('created_at', thirtyDaysAgo.toISOString()).gte('created_at', sixtyDaysAgo.toISOString()),
        supabase.from('appointments').select('*', { count: 'exact', head: true }).gte('created_at', todayStart.toISOString()).lte('created_at', todayEnd.toISOString()),
        supabase.from('bookings').select('*', { count: 'exact', head: true }),
        supabase.from('bookings').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo.toISOString()),
        supabase.from('bookings').select('*', { count: 'exact', head: true }).lt('created_at', thirtyDaysAgo.toISOString()).gte('created_at', sixtyDaysAgo.toISOString()),
        supabase.from('bookings').select('*', { count: 'exact', head: true }).gte('created_at', todayStart.toISOString()).lte('created_at', todayEnd.toISOString()),
      ]);

      // Use bookings if appointments is empty
      const totalAppointments = (totalAppts || 0) + (totalBookings || 0);
      const currentAppointments = (apptCurrentPeriod || 0) + (bookingCurrentPeriod || 0);
      const prevAppointments = (apptPreviousPeriod || 0) + (bookingPreviousPeriod || 0);
      const todayAppointments = (apptToday || 0) + (bookingToday || 0);
      
      console.log('[Analytics] Appointment counts:', {
        appointments: totalAppts,
        bookings: totalBookings,
        total: totalAppointments,
        current: currentAppointments,
        prev: prevAppointments,
        today: todayAppointments
      });

      // Calculate unique visitors using filtered page views (excludes localhost)
      const filteredCurrentViews = pageViews.filter(v => {
        const created = new Date(v.created_at);
        return created >= thirtyDaysAgo;
      });
      
      const filteredPrevViews = pageViews.filter(v => {
        const created = new Date(v.created_at);
        return created < thirtyDaysAgo && created >= sixtyDaysAgo;
      });
      
      const currentUnique = new Set(filteredCurrentViews.map(v => v.user_id)).size;
      const prevUnique = new Set(filteredPrevViews.map(v => v.user_id)).size;
      
     // Use pageViews.length for total (already filtered to exclude localhost)
      const totalViews = pageViews.length;
      const currentViews = filteredCurrentViews.length;
      const prevViews = filteredPrevViews.length;

      // Peak Hours & Avg Duration - Check both appointments and bookings
      const { data: apptData } = await supabase.from('appointments').select('appointment_time, duration').limit(1000);
      const { data: bookingData } = await supabase.from('bookings').select('scheduled_time, duration').limit(1000);
      
      const hourCounts: Record<string, number> = {};
      
      // Process appointments
      (apptData || []).forEach((curr: any) => {
        if (curr.appointment_time) {
        const hour = curr.appointment_time.split(':')[0];
          hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        }
      });
      
      // Process bookings
      (bookingData || []).forEach((curr: any) => {
        if (curr.scheduled_time) {
          const hour = curr.scheduled_time.split(':')[0];
          hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        }
      });
      
      const peakHour = Object.entries(hourCounts).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || '--';
      
      // Calculate avg duration from both sources
      const allDurations = [
        ...(apptData || []).map((a: any) => a.duration || 0),
        ...(bookingData || []).map((b: any) => b.duration || 0)
      ].filter(d => d > 0);
      const avgDuration = allDurations.length > 0 
        ? (allDurations.reduce((acc, curr) => acc + curr, 0) / allDurations.length) 
        : 0;

      const calcTrend = (curr: number, prev: number) => {
        if (!prev) return (curr || 0) > 0 ? 100 : 0;
        return (( (curr || 0) - (prev || 0)) / prev) * 100;
      };

      // Status Counts - Check both appointments and bookings
      const [
        { count: apptCompleted }, 
        { count: apptPending }, 
        { count: apptCancelled },
        { count: bookingCompleted },
        { count: bookingPending },
        { count: bookingCancelled }
      ] = await Promise.all([
        supabase.from('appointments').select('*', { count: 'exact', head: true }).in('status', ['completed', 'confirmed']),
        supabase.from('appointments').select('*', { count: 'exact', head: true }).in('status', ['pending', 'pending_payment']),
        supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('status', 'cancelled'),
        supabase.from('bookings').select('*', { count: 'exact', head: true }).in('status', ['completed', 'confirmed']),
        supabase.from('bookings').select('*', { count: 'exact', head: true }).in('status', ['pending', 'pending_payment']),
        supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'cancelled'),
      ]);

      const completed = (apptCompleted || 0) + (bookingCompleted || 0);
      const pending = (apptPending || 0) + (bookingPending || 0);
      const cancelled = (apptCancelled || 0) + (bookingCancelled || 0);

      return {
        totalViews: totalViews || 0,
        totalAppts: totalAppointments,
        todayAppts: todayAppointments,
        completed: completed,
        pending: pending,
        cancelled: cancelled,
        uniqueVisitors: currentUnique,
        viewsTrend: calcTrend(currentViews, prevViews),
        uniqueTrend: calcTrend(currentUnique, prevUnique),
        apptsTrend: calcTrend(currentAppointments, prevAppointments),
        conversionTrend: calcTrend(
          (currentAppointments || 0) / (Math.max(currentViews || 0, 1)),
          (prevAppointments || 0) / (Math.max(prevViews || 0, 1))
        ),
        peakHour: peakHour !== '--' ? `${peakHour}:00` : '--',
        avgDuration: avgDuration.toFixed(1)
      };
    },
    retry: 1
  });

  // Calculate unique visitors
  const uniqueVisitors = realStats?.uniqueVisitors || 0;
  
  // Group page views by path
  const pageStats = pageViews.reduce((acc, view) => {
    // Normalize path by removing query parameters (e.g., ?fbclid=...)
    const path = view.page_path?.split('?')[0] || '/';
    if (!acc[path]) {
      acc[path] = { path, count: 0, title: view.page_title };
    }
    acc[path].count += 1;
    return acc;
  }, {});

  // Calculate payment funnel stats
  const startedPayments = paymentEvents.filter(e => e.event_type === 'started').length;
  const successfulPayments = paymentEvents.filter(e => e.event_type === 'success').length;
  const failedPayments = paymentEvents.filter(e => e.event_type === 'failure').length;
  const pendingPayments = paymentEvents.filter(e => e.event_type === 'pending').length;
  const successRate = startedPayments > 0 ? (successfulPayments / startedPayments) * 100 : 0;
  
  // Calculate today's payment stats using local timezone (Chile)
  const now2 = new Date();
  const todayStart2 = new Date(now2.getFullYear(), now2.getMonth(), now2.getDate(), 0, 0, 0, 0);
  const todayEnd2 = new Date(now2.getFullYear(), now2.getMonth(), now2.getDate(), 23, 59, 59, 999);
  
  const todayPaymentEvents = paymentEvents.filter(e => {
    const created = new Date(e.created_at);
    return created >= todayStart2 && created <= todayEnd2;
  });
  const todayPayments = todayPaymentEvents.filter(e => e.event_type === 'success').length;
  const todayStartedPayments = todayPaymentEvents.filter(e => e.event_type === 'started').length;
  
  // Debug: Log payment funnel stats
  console.log('[Analytics] Payment funnel stats:', {
    totalEvents: paymentEvents.length,
    started: startedPayments,
    successful: successfulPayments,
    failed: failedPayments,
    pending: pendingPayments,
    successRate: successRate.toFixed(1) + '%',
    todayPayments: todayPayments,
    todayStarted: todayStartedPayments,
    events: paymentEvents.slice(0, 3).map(e => ({ type: e.event_type, amount: e.amount, created: e.created_at }))
  });

  const isLoading = isLoadingStats || isLoadingPayments || isLoadingErrors;
  const hasError = pageViewsError || paymentEventsError || errorLogsError || statsError || appointmentsError;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }
  if (hasError) {
    const errorMessage = pageViewsError?.message || paymentEventsError?.message || errorLogsError?.message || statsError?.message || appointmentsError?.message || 'Error desconocido';
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-gold-400 to-gold-600 bg-clip-text text-transparent">
              Panel de Analytics
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Monitoreo en tiempo real del rendimiento del sitio
            </p>
          </div>
          
          <div className="flex items-center gap-4">
               <div className="flex items-center space-x-2 bg-black/40 px-3 py-2 rounded-lg border border-white/10">
                  <input 
                    type="checkbox" 
                    id="showDevDataError" 
                    checked={showDevData} 
                    onChange={(e) => setShowDevData(e.target.checked)}
                    className="rounded border-gray-600 bg-black/50 text-gold-500 focus:ring-gold-500/50"
                  />
                  <label htmlFor="showDevDataError" className="text-xs text-gray-300 cursor-pointer select-none">
                    Mostrar datos de prueba
                  </label>
              </div>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Error al cargar los datos</h3>
              <p className="text-sm text-muted-foreground mb-4">{errorMessage}</p>
              <p className="text-xs text-muted-foreground">
                Si las tablas de analytics no existen, ejecuta la migración: <code className="bg-slate-100 px-2 py-1 rounded">20250102000000_create_analytics_tables.sql</code>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Panel de Análisis</h2>
          <p className="text-muted-foreground">
            Estadísticas de visitas y citas en tiempo real
          </p>
        </div>
        
        <div className="flex items-center gap-4">
             <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded-lg border border-slate-200">
                <input 
                  type="checkbox" 
                  id="showDevDataMain" 
                  checked={showDevData} 
                  onChange={(e) => setShowDevData(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="showDevDataMain" className="text-xs text-slate-700 cursor-pointer select-none font-medium">
                  Mostrar datos de prueba (localhost)
                </label>
            </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Visitas Totales"
          value={realStats?.totalViews || 0}
          icon={Eye}
          trend={realStats?.viewsTrend || 0}
          trendText="respecto al mes pasado"
        />
        <StatCard
          title="Visitantes Únicos"
          value={realStats?.uniqueVisitors || 0}
          icon={Users}
          trend={realStats?.uniqueTrend || 0}
          trendText="respecto al mes pasado"
        />
        <StatCard
          title="Citas Totales"
          value={realStats?.totalAppts || 0}
          icon={Calendar}
          trend={realStats?.apptsTrend || 0}
          trendText="respecto al mes pasado"
        />
        <StatCard
          title="Citas Hoy"
          value={realStats?.todayAppts || 0}
          icon={Calendar}
          trend={0}
          trendText=""
        />
      </div>
      
      {/* Today's Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Pagos Exitosos Hoy"
          value={todayPayments}
          icon={CheckCircle2}
          trend={0}
          trendText=""
        />
        <StatCard
          title="Pagos Iniciados Hoy"
          value={todayStartedPayments}
          icon={Timer}
          trend={0}
          trendText=""
        />
        <StatCard
          title="Tasa de Conversión"
          value={`${realStats?.totalViews ? ((realStats.totalAppts / realStats.totalViews) * 100).toFixed(1) : '0.0'}%`}
          icon={BarChart2}
          trend={realStats?.conversionTrend || 0}
          trendText="respecto al mes pasado"
        />
        <StatCard
          title="Tasa de Éxito Pagos"
          value={`${successRate.toFixed(1)}%`}
          icon={BarChart2}
          trend={0}
          trendText=""
        />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="pages">Páginas</TabsTrigger>
          <TabsTrigger value="appointments">Citas</TabsTrigger>
          <TabsTrigger value="payments">Pagos (MP)</TabsTrigger>
          <TabsTrigger value="errors">Errores</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Embudo de Conversión de Pagos</CardTitle>
                <CardDescription>Resumen del proceso de pago actual</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 py-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">Conversión Total</span>
                    <span className="text-sm font-bold text-green-600">{successRate.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500" 
                      style={{ width: `${successRate}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2 text-center">
                    <div>
                      <div className="text-lg font-bold">{startedPayments}</div>
                      <div className="text-[10px] text-muted-foreground uppercase">Iniciados</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold">{successfulPayments}</div>
                      <div className="text-[10px] text-muted-foreground uppercase">Exitosos</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold">{startedPayments - successfulPayments}</div>
                      <div className="text-[10px] text-muted-foreground uppercase">Abandonos</div>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-2"
                    onClick={() => document.querySelector('[data-value="payments"]')?.click()}
                  >
                    Ver detalles del embudo
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Últimas Citas</CardTitle>
                <CardDescription>Recientes reservas de citas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {recentAppointments.map((appointment) => (
                  <RecentActivityItem 
                    key={appointment.id} 
                    item={appointment} 
                    type="appointment" 
                  />
                ))}
                {recentAppointments.length === 0 && <p className="text-sm text-muted-foreground">No hay citas recientes</p>}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Actividad Reciente</CardTitle>
                <CardDescription>Últimas visitas a la plataforma</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {pageViews.slice(0, 5).map((view) => (
                  <RecentActivityItem key={view.id} item={view} type="pageview" />
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Eventos de Pago</CardTitle>
                <CardDescription>Últimas interacciones con MercadoPago</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {paymentEvents.slice(0, 5).map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-md transition-colors text-sm">
                    <div className="flex items-center space-x-2">
                      {event.event_type === 'success' ? (
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                      ) : event.event_type === 'failure' ? (
                        <AlertCircle className="h-3 w-3 text-red-500" />
                      ) : (
                        <Landmark className="h-3 w-3 text-blue-500" />
                      )}
                      <span className="capitalize">{event.event_type === 'started' ? 'Iniciado' : event.event_type}</span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {formatDistanceToNow(new Date(event.created_at), { addSuffix: true, locale: es })}
                    </span>
                  </div>
                ))}
                {paymentEvents.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4 italic">Sin eventos de pago aún</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pages">
          <Card>
            <CardHeader>
              <CardTitle>Estadísticas de Páginas</CardTitle>
              <CardDescription>Vistas por página en los últimos 30 días</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.values(pageStats)
                  .sort((a, b) => b.count - a.count)
                  .map((page) => (
                    <div key={page.path} className="flex items-center justify-between">
                      <div className="w-1/3 truncate">
                        <p className="text-sm font-medium">{page.title || page.path}</p>
                        <p className="text-xs text-muted-foreground truncate">{page.path}</p>
                      </div>
                      <div className="w-1/3 px-4">
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500" 
                            style={{ width: `${(page.count / pageViews.length) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div className="w-1/6 text-right">
                        <span className="font-medium">{page.count}</span>
                        <span className="text-xs text-muted-foreground ml-1">
                          ({((page.count / pageViews.length) * 100).toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appointments">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Estadísticas de Citas</CardTitle>
                  <CardDescription>Resumen de citas y conversiones</CardDescription>
                </div>
                <div className="flex space-x-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    {realStats?.completed || 0} Completadas
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                    {realStats?.pending || 0} Pendientes
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                    {realStats?.cancelled || 0} Canceladas
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Tasa de Conversión</h3>
                  <div className="text-3xl font-bold">
                    {realStats?.totalViews ? ((realStats.totalAppts / realStats.totalViews) * 100).toFixed(1) : '0.0'}%
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {realStats?.totalAppts || 0} citas de {realStats?.totalViews || 0} visitas
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Tiempo Promedio</h3>
                  <div className="text-3xl font-bold">{realStats?.avgDuration || 0} min</div>
                  <p className="text-sm text-muted-foreground">
                    Duración promedio de las citas
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Horario Pico</h3>
                  <div className="text-3xl font-bold">{realStats?.peakHour || '--'}</div>
                  <p className="text-sm text-muted-foreground">
                    Hora con más citas programadas
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="payments">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Embudo de Conversión de Pagos</CardTitle>
                <CardDescription>Seguimiento desde el inicio hasta el éxito</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-8 py-4">
                  <div className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Landmark className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium">Pagos Iniciados</span>
                      </div>
                      <span className="text-sm font-bold">{startedPayments}</span>
                    </div>
                    <div className="h-4 bg-blue-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 w-full" />
                    </div>
                  </div>

                  <div className="relative pl-8 border-l-2 border-dashed border-slate-200 ml-2">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium">Pagos Exitosos</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold block">{successfulPayments}</span>
                        <span className="text-xs text-green-600 font-medium">{successRate.toFixed(1)}% conversión</span>
                      </div>
                    </div>
                    <div className="h-4 bg-green-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500" 
                        style={{ width: `${successRate}%` }}
                      />
                    </div>
                  </div>

                  <div className="relative pl-8 border-l-2 border-dashed border-slate-200 ml-2">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        <span className="text-sm font-medium">Pagos Fallidos / Abandonos</span>
                      </div>
                      <span className="text-sm font-bold">{startedPayments - successfulPayments}</span>
                    </div>
                    <div className="h-4 bg-red-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-red-500" 
                        style={{ width: `${100 - successRate}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Eventos de Pago Recientes</CardTitle>
                <CardDescription>Últimas interacciones con MercadoPago</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {paymentEvents.slice(0, 8).map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-md transition-colors border-b last:border-0 border-slate-100 pb-3">
                      <div className="flex items-center space-x-3">
                        {event.event_type === 'success' ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : event.event_type === 'failure' ? (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        ) : event.event_type === 'pending' ? (
                          <Timer className="h-4 w-4 text-yellow-500" />
                        ) : (
                          <Landmark className="h-4 w-4 text-blue-500" />
                        )}
                        <div>
                          <p className="text-sm font-medium capitalize">
                            {event.event_type === 'started' ? 'Pago Iniciado' : 
                             event.event_type === 'success' ? 'Pago Exitoso' : 
                             event.event_type === 'failure' ? 'Pago Fallido' : 'Pago Pendiente'}
                          </p>
                          <p className="text-xs text-slate-500">
                            {event.amount ? `$${event.amount.toLocaleString('es-CL')}` : 'Monto no disponible'}
                            {event.metadata?.source && ` • ${event.metadata.source}`}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-slate-400">
                        {formatDistanceToNow(new Date(event.created_at), { addSuffix: true, locale: es })}
                      </span>
                    </div>
                  ))}
                  {paymentEvents.length === 0 && (
                    <p className="text-sm text-center py-8 text-muted-foreground italic">
                      No se han registrado eventos de pago aún.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="errors">
          <Card>
            <CardHeader>
              <CardTitle>Registro de Errores</CardTitle>
              <CardDescription>Últimos errores detectados en el sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <ErrorTable errors={errorLogs} isLoading={isLoadingErrors} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
