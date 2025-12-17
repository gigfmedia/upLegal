import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Users, Calendar, Eye, BarChart2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
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

// Main Component
export default function AnalyticsDashboard() {
  // Fetch page views
  const { data: pageViews = [], isLoading: isLoadingViews } = useQuery({
    queryKey: ['page-views'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('page_views')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data as PageView[];
    }
  });

  // Fetch appointment stats
  const { data: appointmentStats, isLoading: isLoadingAppointments } = useQuery({
    queryKey: ['appointment-stats'],
    queryFn: async () => {
      const { data: stats } = await supabase.rpc('get_appointment_stats');
      const { data: recent } = await supabase
        .from('appointments')
        .select(`
          id,
          created_at,
          status,
          users!appointments_user_id_fkey(name, email),
          lawyer:lawyers!appointments_lawyer_id_fkey(id, user_id, users!lawyers_user_id_fkey(name, email)),
          services!appointments_service_id_fkey(title)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      return {
        ...stats,
        recent: recent?.map(a => ({
          id: a.id,
          created_at: a.created_at,
          status: a.status,
          user_name: a.users?.name || 'Usuario',
          lawyer_name: a.lawyer?.users?.name || 'Abogado',
          service_title: a.services?.title || 'Servicio',
        })) || [],
      } as AppointmentStats;
    }
  });

  // Calculate unique visitors
  const uniqueVisitors = new Set(pageViews.map(view => view.user_id)).size;
  
  // Group page views by path
  const pageStats = pageViews.reduce((acc, view) => {
    const path = view.page_path;
    if (!acc[path]) {
      acc[path] = { path, count: 0, title: view.page_title };
    }
    acc[path].count += 1;
    return acc;
  }, {});

  const isLoading = isLoadingViews || isLoadingAppointments;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Panel de Análisis</h2>
        <p className="text-muted-foreground">
          Estadísticas de visitas y citas en tiempo real
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Visitas Totales"
          value={pageViews.length}
          icon={Eye}
          trend={12.5}
          trendText="respecto al mes pasado"
        />
        <StatCard
          title="Visitantes Únicos"
          value={uniqueVisitors}
          icon={Users}
          trend={8.2}
          trendText="respecto al mes pasado"
        />
        <StatCard
          title="Citas Totales"
          value={appointmentStats?.total || 0}
          icon={Calendar}
          trend={5.3}
          trendText="respecto al mes pasado"
        />
        <StatCard
          title="Tasa de Conversión"
          value={`${((appointmentStats?.total / pageViews.length) * 100 || 0).toFixed(1)}%`}
          icon={BarChart2}
          trend={2.1}
          trendText="respecto al mes pasado"
        />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="pages">Páginas</TabsTrigger>
          <TabsTrigger value="appointments">Citas</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
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
                <CardTitle>Últimas Citas</CardTitle>
                <CardDescription>Recientes reservas de citas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {appointmentStats?.recent?.map((appointment) => (
                  <RecentActivityItem 
                    key={appointment.id} 
                    item={appointment} 
                    type="appointment" 
                  />
                )) || <p className="text-sm text-muted-foreground">No hay citas recientes</p>}
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
                    {appointmentStats?.completed || 0} Completadas
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                    {appointmentStats?.pending || 0} Pendientes
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                    {appointmentStats?.cancelled || 0} Canceladas
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Tasa de Conversión</h3>
                  <div className="text-3xl font-bold">
                    {((appointmentStats?.total / pageViews.length) * 100 || 0).toFixed(1)}%
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {appointmentStats?.total} citas de {pageViews.length} visitas
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Tiempo Promedio</h3>
                  <div className="text-3xl font-bold">12.5 min</div>
                  <p className="text-sm text-muted-foreground">
                    Duración promedio de las citas
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Horario Pico</h3>
                  <div className="text-3xl font-bold">3:00 PM - 5:00 PM</div>
                  <p className="text-sm text-muted-foreground">
                    Horas con más citas programadas
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
