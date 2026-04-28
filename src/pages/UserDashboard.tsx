import { Suspense, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Calendar, 
  DollarSign, 
  Users, 
  FileText, 
  TrendingUp,
  Clock,
  Star,
  MessageCircle,
  Search
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow, isAfter, isToday, isTomorrow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

// Helper function to format dates in Spanish
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  
  if (isToday(date)) {
    return 'Hoy';
  }
  
  if (isTomorrow(date)) {
    return 'Mañana';
  }
  
  return format(date, 'd MMMM yyyy', { locale: es });
};

// Helper function to format time
const formatTime = (dateString: string) => {
  return format(new Date(dateString), 'h:mm a', { locale: es });
};

function DashboardSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="h-4 w-20 bg-gray-200 rounded"></div>
            <div className="h-4 w-4 bg-gray-200 rounded"></div>
          </CardHeader>
          <CardContent>
            <div className="h-8 w-16 bg-gray-200 rounded mb-2"></div>
            <div className="h-3 w-24 bg-gray-200 rounded"></div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function LawyerDashboardContent() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const stats = [
    {
      title: "Ingresos Totales",
      value: "$12.450.000",
      change: "+20.1% desde el mes pasado",
      icon: DollarSign,
      iconColor: "text-green-500",
    },
    {
      title: "Clientes Activos",
      value: "24",
      change: "+3 nuevos esta semana",
      icon: Users,
      iconColor: "text-blue-500",
    },
    // {
    //   title: "Consultas",
    //   value: "18",
    //   change: "+12% desde el mes pasado",
    //   icon: MessageCircle,
    //   iconColor: "text-purple-500",
    // },
    {
      title: "Calificación",
      value: "4.8",
      change: "Basado en 45 reseñas",
      icon: Star,
      iconColor: "text-yellow-500",
    },
  ];

  const recentConsultations = [
    { 
      client: "María Rodríguez", 
      type: "Revisión de Contrato", 
      time: "hace 2 horas", 
      status: "completado" 
    },
    { 
      client: "Juan Silva", 
      type: "Consulta Legal", 
      time: "hace 1 día", 
      status: "pendiente" 
    },
    { 
      client: "Ana García", 
      type: "Revisión de Documentos", 
      time: "hace 2 días", 
      status: "completado" 
    },
  ];

  const upcomingAppointments = [
    { 
      client: "Carlos Méndez", 
      time: "Hoy, 14:00", 
      type: "Consulta Inicial" 
    },
    { 
      client: "Sofía López", 
      time: "Mañana, 10:00", 
      type: "Seguimiento" 
    },
    { 
      client: "Diego Ruiz", 
      time: "Mié, 15:00", 
      type: "Revisión de Contrato" 
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between space-y-4 sm:flex-row sm:items-center sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hola, {user?.name}</h1>
          <p className="text-muted-foreground">
            Aquí tienes un resumen de tu actividad.
          </p>
        </div>
        <Button onClick={() => navigate('/dashboard/consultations/new')}>
          <MessageCircle className="mr-2 h-4 w-4" />
          Nueva Consulta
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-md ${stat.iconColor.replace('text-', 'bg-').replace('-500', '-100')}`}>
                <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Consultas Recientes removed */}

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Próximas Citas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingAppointments.length > 0 ? (
                upcomingAppointments.map((appointment, index) => (
                  <div key={index} className="flex items-start p-3 rounded-lg hover:bg-gray-50">
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-100 text-blue-600 mr-3">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {appointment.client}
                      </p>
                      <p className="text-sm text-gray-500">
                        {appointment.type}
                      </p>
                    </div>
                    <div className="text-sm text-gray-500 whitespace-nowrap ml-2">
                      {appointment.time}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Calendar className="mx-auto h-8 w-8 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No hay citas programadas</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    No tienes citas programadas para los próximos días.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ClientDashboardContent() {
  const { user, supabase } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [consultations, setConsultations] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState([
    { title: "Casos Activos", value: "0", change: "0 en progreso", icon: FileText, iconColor: "text-blue-500" },
    // { title: "Consultas", value: "0", change: "Este mes", icon: MessageCircle, iconColor: "text-purple-500" },
    { title: "Total Gastado", value: "$0", change: "Histórico", icon: DollarSign, iconColor: "text-green-500" },
    { title: "Próxima Cita", value: "Sin citas", change: "No programadas", icon: Clock, iconColor: "text-yellow-500" }
  ]);

  // Get the best available name from user object
  const displayName = user?.user_metadata?.full_name || 
                     user?.user_metadata?.name ||
                     user?.email?.split('@')[0] || 
                     'Usuario';

  // Compatibilidad entre esquemas de appointments:
  // - legacy: appointment_date + appointment_time
  // - alternativo: scheduled_time
  // - otros: date
  const getAppointmentDateTime = (appointment: any): string | null => {
    if (appointment?.scheduled_time) return appointment.scheduled_time;
    if (appointment?.date) return appointment.date;
    if (appointment?.appointment_date && appointment?.appointment_time) {
      return `${appointment.appointment_date}T${appointment.appointment_time}`;
    }
    return null;
  };

  // Fetch consultations and appointments data
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      
      setIsLoading(true);
      
      try {
        // Fetch consultations
        const { data: consultationsData, error: consultationsError } = await supabase
          .from('consultations')
          .select(`
            id,
            title,
            status,
            created_at,
            lawyer:lawyer_id (
              id,
              full_name,
              email
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (consultationsError) throw consultationsError;
        setConsultations(consultationsData || []);

        // Fetch appointments (compat multi-esquema)
        const { data: appointmentsData, error: appointmentsError } = await supabase
          .from('appointments')
          .select('*')
          .eq('user_id', user.id);

        if (appointmentsError) throw appointmentsError;
        const nowIso = new Date().toISOString();
        const normalizedUpcoming = (appointmentsData || [])
          .map((appointment: any) => ({
            ...appointment,
            appointment_time: getAppointmentDateTime(appointment)
          }))
          .filter((appointment: any) => appointment.appointment_time && appointment.appointment_time >= nowIso)
          .sort((a: any, b: any) => a.appointment_time.localeCompare(b.appointment_time));

        setAppointments(normalizedUpcoming);

        // Update stats
        const activeCases = consultationsData?.filter(c => c.status === 'active').length || 0;
        const thisMonthsConsultations = consultationsData?.filter(c => {
          const consultationDate = new Date(c.created_at);
          const now = new Date();
          return consultationDate.getMonth() === now.getMonth() && 
                 consultationDate.getFullYear() === now.getFullYear();
        }).length || 0;

        setStats([
          { 
            title: "Casos Activos", 
            value: activeCases.toString(), 
            change: `${activeCases} en progreso`, 
            icon: FileText, 
            iconColor: "text-blue-500" 
          },
          { 
            title: "Consultas", 
            value: thisMonthsConsultations.toString(), 
            change: "Este mes", 
            icon: MessageCircle, 
            iconColor: "text-purple-500" 
          },
          { 
            title: "Total Gastado", 
            value: "$" + (consultationsData?.length * 50 || 0), // Assuming $50 per consultation
            change: "Histórico", 
            icon: DollarSign, 
            iconColor: "text-green-500" 
          },
          { 
            title: "Próxima Cita", 
            value: normalizedUpcoming?.[0]?.title || normalizedUpcoming?.[0]?.service_type || normalizedUpcoming?.[0]?.name || "Sin citas", 
            change: normalizedUpcoming?.[0] 
              ? formatDate(normalizedUpcoming[0].appointment_time) + ' a las ' + formatTime(normalizedUpcoming[0].appointment_time)
              : "No programadas", 
            icon: Clock, 
            iconColor: "text-yellow-500" 
          }
        ]);

      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user?.id, supabase]);

  // Fetch real data from Supabase
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        
        // 1. Fetch active cases
        const { count: activeCases } = await supabase
          .from('cases')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user?.id)
          .eq('status', 'active');

        // 2. Fetch consultations this month (removed)
        /*
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        
        const { count: consultationsThisMonth } = await supabase
          .from('consultations')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user?.id)
          .gte('created_at', startOfMonth.toISOString());
        */

        // 3. Fetch total spent
        const { data: payments, error: paymentsError } = await supabase
          .from('payments')
          .select('amount')
          .eq('user_id', user?.id)
          .eq('status', 'succeeded');

        const totalSpent = payments?.reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0) || 0;

        // 4. Fetch next appointment (compat multi-esquema)
        const { data: nextAppointmentsRaw } = await supabase
          .from('appointments')
          .select('*')
          .eq('user_id', user?.id)
          .limit(200);

        const nowIso = new Date().toISOString();
        const nextAppointment = (nextAppointmentsRaw || [])
          .map((appointment: any) => getAppointmentDateTime(appointment))
          .filter((appointmentTime: string | null) => appointmentTime && appointmentTime >= nowIso)
          .sort((a: string, b: string) => a.localeCompare(b))[0];

        // Update stats with real data
        setStats([
          {
            title: "Casos Activos",
            value: activeCases?.toString() || "0",
            change: `${activeCases || 0} en progreso`,
            icon: FileText,
            iconColor: "text-blue-500"
          },
          /*
          {
            title: "Consultas",
            value: consultationsThisMonth?.toString() || "0",
            change: "Este mes",
            icon: MessageCircle,
            iconColor: "text-purple-500"
          },
          */
          {
            title: "Total Gastado",
            value: `$${totalSpent.toLocaleString()}`,
            change: "Histórico",
            icon: DollarSign,
            iconColor: "text-green-500"
          },
          {
            title: "Próxima Cita",
            value: nextAppointment 
              ? new Date(nextAppointment).toLocaleDateString() 
              : "Sin citas",
            change: nextAppointment 
              ? new Date(nextAppointment).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : "No programadas",
            icon: Clock,
            iconColor: "text-yellow-500"
          }
        ]);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user?.id) {
      fetchDashboardData();
    }
  }, [user?.id]);

  // Format consultations data for display
  const myConsultations = consultations.map(consultation => ({
    id: consultation.id,
    title: consultation.title,
    status: consultation.status,
    date: formatDistanceToNow(new Date(consultation.created_at), { 
      addSuffix: true, 
      locale: es 
    }),
    lawyer: consultation.lawyer?.full_name || 
             consultation.lawyer?.email?.split('@')[0] || 
             'Abogado',
  }));

  // Format upcoming appointments
  const upcomingAppointments = appointments.map(appointment => ({
    id: appointment.id,
    title: appointment.title || appointment.service_type || appointment.name || 'Cita legal',
    date: formatDate(appointment.appointment_time || getAppointmentDateTime(appointment) || new Date().toISOString()),
    time: formatTime(appointment.appointment_time || getAppointmentDateTime(appointment) || new Date().toISOString()),
    lawyer: appointment.lawyer?.full_name ||
            appointment.lawyer?.email?.split('@')[0] ||
            'Abogado',
  }));

  const handleFindLawyer = () => {
    navigate('/search');
  };

  return (
    <div className="container mx-auto px-8 py-6 space-y-6">
      <div className="flex flex-col justify-between space-y-4 sm:flex-row sm:items-center sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hola, {displayName}</h1>
          <p className="text-muted-foreground">
            Aquí puedes ver el estado de tus casos y consultas.
          </p>
        </div>
        <Button onClick={handleFindLawyer}
          className="bg-gray-900 text-white hover:bg-green-900">
          <Search className="mr-2 h-4 w-4" />
          Buscar Abogado
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-md ${stat.iconColor.replace('text-', 'bg-').replace('-500', '-100')}`}>
                <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-1">
        {/* Mis Consultas removed */}

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle>Próximas Citas</CardTitle>
              {upcomingAppointments.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-sm text-muted-foreground hover:bg-transparent hover:underline p-0 h-auto" 
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/dashboard/appointments');
                  }}
                >
                  Ver todas
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingAppointments.length > 0 ? (
                upcomingAppointments.map((appointment) => (
                  <div 
                    key={appointment.id}
                    className="flex items-start p-3 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/dashboard/appointments/${appointment.id}`)}
                  >
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-100 text-blue-600 mr-3">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {appointment.title}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {appointment.lawyer} • {appointment.date} a las {appointment.time}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Calendar className="mx-auto h-8 w-8 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No hay citas programadas</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    No tienes citas programadas para los próximos días.
                  </p>
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFindLawyer();
                      }}
                      className="inline-flex items-center"
                    >
                      <Search className="-ml-1 mr-2 h-4 w-4" />
                      Buscar Abogado
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function UserDashboard() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
        <DashboardSkeleton />
    );
  }

  return (
      <Suspense fallback={<DashboardSkeleton />}>
          {user?.role === 'lawyer' ? (
            <LawyerDashboardContent />
          ) : (
            <ClientDashboardContent />
          )}
      </Suspense>
  );
}
