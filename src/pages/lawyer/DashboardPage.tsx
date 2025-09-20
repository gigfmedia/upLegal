import { Outlet } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Calendar, Briefcase, MessageSquare } from 'lucide-react';
import { ProfileCompletion } from '@/components/dashboard/ProfileCompletion';
import { useNavigate } from 'react-router-dom';

export default function LawyerDashboardPage() {
  const navigate = useNavigate();

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
          <Card 
            className="hover:bg-accent/50 transition-colors cursor-pointer" 
            onClick={() => handleNavigateToTab('appointments')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Citas del Día</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
              <p className="text-xs text-muted-foreground">+2 desde ayer</p>
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
              <div className="text-2xl font-bold">5</div>
              <p className="text-xs text-muted-foreground">+1 este mes</p>
            </CardContent>
          </Card>
          
          <Card 
            className="hover:bg-accent/50 transition-colors cursor-pointer" 
            onClick={() => handleNavigateToTab('messages')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Mensajes Nuevos</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2</div>
              <p className="text-xs text-muted-foreground">Sin leer</p>
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
              <div className="text-2xl font-bold">85%</div>
              <p className="text-xs text-muted-foreground">Completado</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Actividad Reciente</CardTitle>
              <CardDescription>Últimas acciones en tu cuenta</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start pb-4 last:pb-0 border-b last:border-b-0">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">Nueva cita programada</p>
                    <p className="text-sm text-muted-foreground">Consulta inicial con Juan Pérez para el 25 de Octubre</p>
                    <p className="text-xs text-muted-foreground">Hace 2 horas</p>
                  </div>
                </div>
                <div className="flex items-start pb-4 last:pb-0 border-b last:border-b-0">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">Servicio actualizado</p>
                    <p className="text-sm text-muted-foreground">Has actualizado los detalles de tu servicio de Derecho Laboral</p>
                    <p className="text-xs text-muted-foreground">Ayer a las 14:30</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">Nuevo mensaje</p>
                    <p className="text-sm text-muted-foreground">Tienes un nuevo mensaje de María González</p>
                    <p className="text-xs text-muted-foreground">Ayer a las 10:15</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Completar Perfil</CardTitle>
              <CardDescription>Mejora tu perfil para aumentar tu visibilidad</CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileCompletion onNavigateToTab={handleNavigateToTab} />
            </CardContent>
          </Card>
        </div>
      </div>
      <Outlet />
    </div>
  );
}
