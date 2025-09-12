import { Suspense } from 'react';
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
  MessageSquare,
  Search
} from 'lucide-react';

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
    {
      title: "Consultas",
      value: "18",
      change: "+12% desde el mes pasado",
      icon: MessageSquare,
      iconColor: "text-purple-500",
    },
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
          <MessageSquare className="mr-2 h-4 w-4" />
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
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Consultas Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentConsultations.length > 0 ? (
                recentConsultations.map((consultation, index) => (
                  <div key={index} className="flex items-start justify-between p-3 rounded-lg hover:bg-gray-50">
                    <div className="flex items-start space-x-4">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {consultation.client.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium leading-none">
                          {consultation.client}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {consultation.type}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <p className="text-xs text-muted-foreground">{consultation.time}</p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                        consultation.status === 'completado' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {consultation.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="mx-auto h-8 w-8 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No hay consultas recientes</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Comienza una nueva consulta para verla aquí.
                  </p>
                  <div className="mt-6">
                    <Button
                      onClick={() => navigate('/dashboard/consultations/new')}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <MessageSquare className="-ml-1 mr-2 h-4 w-4" />
                      Nueva Consulta
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

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
  const { user } = useAuth();
  const navigate = useNavigate();

  const stats = [
    {
      title: "Casos Activos",
      value: "3",
      change: "2 en progreso",
      icon: FileText,
      iconColor: "text-blue-500",
    },
    {
      title: "Consultas",
      value: "8",
      change: "Este mes",
      icon: MessageSquare,
      iconColor: "text-purple-500",
    },
    {
      title: "Total Gastado",
      value: "$2.340.000",
      change: "Histórico",
      icon: DollarSign,
      iconColor: "text-green-500",
    },
    {
      title: "Próxima Cita",
      value: "Mañana",
      change: "10:00 AM",
      icon: Clock,
      iconColor: "text-yellow-500",
    },
  ];

  const myConsultations = [
    {
      id: '1',
      title: 'Revisión de contrato de arriendo',
      status: 'En revisión',
      date: 'Hace 2 días',
      lawyer: 'María González',
    },
    {
      id: '2',
      title: 'Consulta sobre herencia',
      status: 'Completado',
      date: '15 de Mayo, 2023',
      lawyer: 'Carlos Rodríguez',
    },
  ];

  const upcomingAppointments = [
    {
      id: '1',
      title: 'Consulta Inicial',
      date: 'Mañana',
      time: '10:00 AM',
      lawyer: 'María González',
    },
  ];

  const handleFindLawyer = () => {
    navigate('/search');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between space-y-4 sm:flex-row sm:items-center sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hola, {user?.name}</h1>
          <p className="text-muted-foreground">
            Aquí puedes ver el estado de tus casos y consultas.
          </p>
        </div>
        <Button onClick={handleFindLawyer}>
          <Search className="mr-2 h-4 w-4" />
          Buscar Abogado
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
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Mis Consultas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {myConsultations.length > 0 ? (
                myConsultations.map((consultation) => (
                  <div
                    key={consultation.id}
                    className="flex items-start justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/dashboard/consultations/${consultation.id}`)}
                  >
                    <div className="flex items-start space-x-4">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {consultation.lawyer.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium leading-none">
                          {consultation.title}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {consultation.lawyer}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <p className="text-xs text-muted-foreground">{consultation.date}</p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                        consultation.status === 'Completado'
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {consultation.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="mx-auto h-8 w-8 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No tienes consultas</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Comienza una nueva consulta para verla aquí.
                  </p>
                  <div className="mt-6">
                    <Button
                      onClick={() => navigate('/dashboard/consultations/new')}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <MessageSquare className="-ml-1 mr-2 h-4 w-4" />
                      Nueva Consulta
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Próximas Citas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingAppointments.length > 0 ? (
                upcomingAppointments.map((appointment) => (
                  <div 
                    key={appointment.id}
                    className="flex items-start p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/dashboard/appointments/${appointment.id}`)}
                  >
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-100 text-blue-600 mr-3">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {appointment.title}
                      </p>
                      <p className="text-sm text-gray-500">
                        {appointment.lawyer}
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
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      onClick={handleFindLawyer}
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
      <div className="p-6">
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="p-6">
      <Suspense fallback={<DashboardSkeleton />}>
          {user?.role === 'lawyer' ? (
            <LawyerDashboardContent />
          ) : (
            <ClientDashboardContent />
          )}
      </Suspense>
    </div>
  );
}
