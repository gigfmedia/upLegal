import { GoogleCalendarConnect } from '@/components/dashboard/GoogleCalendarConnect';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams, useNavigate } from 'react-router-dom';

import { useEffect, useState, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Calendar, Briefcase, MessageSquare, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { ProfileCompletion } from '@/components/dashboard/ProfileCompletion';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/lib/supabaseClient';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export default function LawyerDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, services, completionPercentage } = useProfile(user?.id);
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  interface DashboardCounters {
    todayAppointments: number;
    activeServices: number;
    newConsultations: number;
    lastUpdated: Date;
  }

  const [counters, setCounters] = useState<DashboardCounters>({
    todayAppointments: 0,
    activeServices: 0,
    newConsultations: 0,
    lastUpdated: new Date()
  });
  const [activities, setActivities] = useState<Array<{
    id: string;
    type: 'appointment' | 'service' | 'message' | 'consultation' | 'payment';
    title: string;
    description: string;
    createdAt: string;
    read: boolean;
    meta?: Record<string, any>;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get('google_auth') === 'success') {
      toast({
        title: "Conexión Exitosa",
        description: "Tu Google Calendar se ha conectado correctamente.",
        className: "bg-green-50 border-green-200 text-green-900",
      });
      // Clean up the URL
      navigate('/lawyer/dashboard', { replace: true });
    }
  }, [searchParams, toast, navigate]);

  const fetchActivities = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setActivitiesLoading(true);
      
      // Fetch recent activities from different sources
      const [
        { data: appointments },
        { data: messages },
        { data: consultations },
        { data: services },
        { data: payments }
      ] = await Promise.all([
        // Recent appointments
        supabase
          .from('appointments')
          .select('id, scheduled_time, status, client:profiles!appointments_client_id_fkey(first_name, last_name)')
          .eq('lawyer_id', user.id)
          .order('scheduled_time', { ascending: false })
          .limit(5),
          
        // Recent messages
        supabase
          .from('messages')
          .select('id, content, created_at, read, sender:profiles!messages_sender_id_fkey(first_name, last_name)')
          .or(`receiver_id.eq.${user.id},sender_id.eq.${user.id}`)
          .order('created_at', { ascending: false })
          .limit(5),
          
        // Recent consultations
        supabase
          .from('consultations')
          .select('id, created_at, status, client:profiles!consultations_client_id_fkey(first_name, last_name), service:services!inner(title)')
          .eq('lawyer_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5),
          
        // Recent service updates
        supabase
          .from('services')
          .select('id, title, updated_at, is_active')
          .eq('lawyer_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(5),
          
        // Recent payments
        supabase
          .from('payments')
          .select('id, amount, status, created_at, appointment:appointments!inner(client:profiles!appointments_client_id_fkey(first_name, last_name))')
          .eq('appointment.lawyer_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5)
      ]);
      
      // Transform data into a unified activity format
      const activities = [];
      
      // Add appointments to activities
      appointments?.forEach(appointment => {
        activities.push({
          id: `appt_${appointment.id}`,
          type: 'appointment',
          title: `Cita ${appointment.status === 'confirmed' ? 'confirmada' : 'pendiente'}`,
          description: `Con ${appointment.client?.first_name || 'el cliente'} para el ${format(parseISO(appointment.scheduled_time), "d 'de' MMMM 'a las' HH:mm", { locale: es })}`,
          createdAt: appointment.scheduled_time,
          read: true,
          meta: { id: appointment.id, type: 'appointment' }
        });
      });
      
      // Add messages to activities
      messages?.forEach(message => {
        activities.push({
          id: `msg_${message.id}`,
          type: 'message',
          title: `Nuevo mensaje de ${message.sender?.first_name || 'un usuario'}`,
          description: message.content.length > 50 ? `${message.content.substring(0, 50)}...` : message.content,
          createdAt: message.created_at,
          read: message.read,
          meta: { id: message.id, type: 'message' }
        });
      });
      
      // Add consultations to activities
      consultations?.forEach(consultation => {
        activities.push({
          id: `cons_${consultation.id}`,
          type: 'consultation',
          title: `Nueva consulta de ${consultation.client?.first_name || 'un cliente'}`,
          description: `Sobre ${consultation.service?.title || 'servicio'}`,
          createdAt: consultation.created_at,
          read: consultation.status !== 'new',
          meta: { id: consultation.id, type: 'consultation' }
        });
      });
      
      // Add service updates to activities
      services?.forEach(service => {
        activities.push({
          id: `srv_${service.id}`,
          type: 'service',
          title: service.is_active ? 'Servicio actualizado' : 'Servicio desactivado',
          description: service.title,
          createdAt: service.updated_at,
          read: true,
          meta: { id: service.id, type: 'service' }
        });
      });
      
      // Add payments to activities
      payments?.forEach(payment => {
        activities.push({
          id: `pay_${payment.id}`,
          type: 'payment',
          title: `Pago ${payment.status === 'completed' ? 'completado' : 'pendiente'}`,
          description: `De ${payment.appointment?.client?.first_name || 'cliente'} por $${payment.amount.toLocaleString()}`,
          createdAt: payment.created_at,
          read: payment.status !== 'pending',
          meta: { id: payment.id, type: 'payment' }
        });
      });
      
      // Sort all activities by date (newest first) and take top 5
      const sortedActivities = activities
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);
      
      setActivities(sortedActivities);
      
    } catch (err) {
      console.error('Error fetching activities:', err);
      // Don't show error to user for activities, as it's not critical
    } finally {
      setActivitiesLoading(false);
    }
  }, [user?.id]);
  
  useEffect(() => {
    const fetchCounters = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        
        // Get today's date range
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
        
        // Fetch today's appointments
        const { count: appointmentsCount } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('lawyer_id', user.id)
          .gte('scheduled_time', startOfDay.toISOString())
          .lt('scheduled_time', endOfDay.toISOString())
          .eq('status', 'confirmed');
        
        // Fetch active services
        const { count: servicesCount } = await supabase
          .from('services')
          .select('*', { count: 'exact', head: true })
          .eq('lawyer_id', user.id)
          .eq('is_active', true);
        
        // Fetch new consultations (last 7 days)
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        
        const { count: consultationsCount } = await supabase
          .from('consultations')
          .select('*', { count: 'exact', head: true })
          .eq('lawyer_id', user.id)
          .gte('created_at', weekAgo.toISOString())
          .eq('status', 'new');
        
        setCounters({
          todayAppointments: appointmentsCount || 0,
          activeServices: servicesCount || 0,
          newConsultations: consultationsCount || 0,
          lastUpdated: new Date()
        });
        
      } catch (err) {
        console.error('Error fetching dashboard counters:', err);
        setError('Error al cargar los contadores. Por favor, intente recargar la página.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCounters();
    fetchActivities();
    
    // Refresh data every 5 minutes
    const interval = setInterval(() => {
      fetchCounters();
      fetchActivities();
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [user?.id, fetchActivities]);

  const handleNavigateToTab = (tab: string) => {
    if (tab === 'profile') {
      navigate('/lawyer/profile');
    } else if (tab === 'services') {
      navigate('/lawyer/services');
    } else if (tab === 'billing') {
      navigate('/lawyer/billing');
    } else if (tab === 'appointments') {
      navigate('/lawyer/appointments');
    } else if (tab === 'messages') {
      navigate('/lawyer/messages');
    }
  };

  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-8 py-6">
      {/* ... existing header and counters ... */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Panel de Abogado</h2>
          <p className="text-muted-foreground">
            Gestiona tu perfil, servicios y consultas legales en un solo lugar.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* ... existing counter cards ... */}
          <Card 
            className="hover:bg-accent/50 transition-colors cursor-pointer" 
            onClick={() => handleNavigateToTab('appointments')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Citas del Día</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-8 flex items-center">
                  <div className="animate-pulse h-4 w-8 bg-muted rounded"></div>
                </div>
              ) : (
                <div className="text-2xl font-bold">{counters.todayAppointments}</div>
              )}
              <p className="text-xs text-muted-foreground">
                {format(counters.lastUpdated, 'HH:mm', { locale: es })} hrs
              </p>
            </CardContent>
          </Card>
          
          <Card 
            className="hover:bg-accent/50 transition-colors cursor-pointer" 
            onClick={() => handleNavigateToTab('services')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Servicios Activos</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-8 flex items-center">
                  <div className="animate-pulse h-4 w-8 bg-muted rounded"></div>
                </div>
              ) : (
                <div className="text-2xl font-bold">{counters.activeServices}</div>
              )}
              <p className="text-xs text-muted-foreground">
                {format(counters.lastUpdated, 'HH:mm', { locale: es })} hrs
              </p>
            </CardContent>
          </Card>
          
          <Card 
            className="hover:bg-accent/50 transition-colors cursor-pointer" 
            onClick={() => handleNavigateToTab('messages')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Consultas Nuevas</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-8 flex items-center">
                  <div className="animate-pulse h-4 w-8 bg-muted rounded"></div>
                </div>
              ) : (
                <div className="text-2xl font-bold">{counters.newConsultations}</div>
              )}
              <p className="text-xs text-muted-foreground">Últimos 7 días</p>
            </CardContent>
          </Card>
          
          <Card 
            className="hover:bg-accent/50 transition-colors cursor-pointer" 
            onClick={() => handleNavigateToTab('profile')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Perfil</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completionPercentage}%</div>
              <p className="text-xs text-muted-foreground">Completado</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Actividad Reciente</CardTitle>
                <CardDescription>Últimas acciones en tu cuenta</CardDescription>
              </CardHeader>
              <CardContent>
                {activitiesLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-start space-x-4">
                        <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
                        <div className="space-y-2 flex-1">
                          <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                          <div className="h-3 w-full bg-muted rounded animate-pulse" />
                          <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : activities.length > 0 ? (
                  <div className="space-y-4">
                    {activities.map((activity) => {
                      // Determine icon and colors based on activity type
                      let icon = null;
                      let iconBg = 'bg-primary/10';
                      let iconColor = 'text-primary';
                      
                      switch (activity.type) {
                        case 'appointment':
                          icon = <Calendar className="h-5 w-5" />;
                          iconBg = 'bg-purple-100';
                          iconColor = 'text-purple-600';
                          break;
                        case 'message':
                          icon = <MessageSquare className="h-5 w-5" />;
                          iconBg = 'bg-blue-100';
                          iconColor = 'text-blue-600';
                          break;
                        case 'consultation':
                          icon = <AlertCircle className="h-5 w-5" />;
                          iconBg = 'bg-amber-100';
                          iconColor = 'text-amber-600';
                          break;
                        case 'service':
                          icon = <Briefcase className="h-5 w-5" />;
                          iconBg = 'bg-green-100';
                          iconColor = 'text-green-600';
                          break;
                        case 'payment':
                          icon = <CheckCircle className="h-5 w-5" />;
                          iconBg = 'bg-emerald-100';
                          iconColor = 'text-emerald-600';
                          break;
                        default:
                          icon = <Clock className="h-5 w-5" />;
                      }
                      
                      return (
                        <div 
                          key={activity.id} 
                          className={`flex items-start pb-4 last:pb-0 border-b last:border-b-0 ${!activity.read ? 'opacity-100' : 'opacity-80'}`}
                          onClick={() => {
                            // Handle click on activity (e.g., navigate to relevant page)
                            if (activity.meta) {
                              if (activity.meta.type === 'appointment') {
                                navigate(`/lawyer/appointments/${activity.meta.id}`);
                              } else if (activity.meta.type === 'message') {
                                navigate(`/lawyer/messages?messageId=${activity.meta.id}`);
                              } else if (activity.meta.type === 'consultation') {
                                navigate(`/lawyer/consultations/${activity.meta.id}`);
                              } else if (activity.meta.type === 'service') {
                                navigate(`/lawyer/services/${activity.meta.id}/edit`);
                              } else if (activity.meta.type === 'payment') {
                                navigate(`/lawyer/payments/${activity.meta.id}`);
                              }
                              
                              // Mark as read if needed
                              if (!activity.read) {
                                // Here you would typically make an API call to mark the activity as read
                                // For now, we'll just update the local state
                                setActivities(prev => 
                                  prev.map(a => 
                                    a.id === activity.id ? { ...a, read: true } : a
                                  )
                                );
                              }
                            }
                          }}
                        >
                          <div className={`flex-shrink-0 h-10 w-10 rounded-full ${iconBg} flex items-center justify-center ${iconColor}`}>
                            {icon}
                          </div>
                          <div className="ml-4 space-y-1 cursor-pointer">
                            <p className={`text-sm font-medium leading-none ${!activity.read ? 'font-semibold' : ''}`}>
                              {activity.title}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {activity.description}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(parseISO(activity.createdAt), { 
                                addSuffix: true, 
                                locale: es 
                              }).replace('hace', 'Hace')}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-sm text-muted-foreground">No hay actividad reciente para mostrar</p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Google Calendar Integration */}
            <GoogleCalendarConnect />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Completar Perfil</CardTitle>
              <CardDescription>Mejora tu perfil para aumentar tu visibilidad</CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileCompletion 
                onNavigateToTab={handleNavigateToTab} 
                completionPercentage={completionPercentage}
                services={services}
              />
            </CardContent>
          </Card>
        </div>
      </div>
      <Outlet />
    </div>
  );
}
