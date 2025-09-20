import { useState, useEffect } from 'react';
import { format, isToday, isTomorrow, addDays, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Search, X, Clock, Video, Phone, MapPin, MoreHorizontal, Badge, Eye, Edit, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AppointmentForm } from '@/components/appointments/AppointmentForm';

type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

interface Appointment {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  service: string;
  date: Date;
  duration: number;
  status: AppointmentStatus;
  type: 'video' | 'phone' | 'in_person';
  notes?: string;
}

export default function CitasPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [showNewAppointmentForm, setShowNewAppointmentForm] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [viewingAppointment, setViewingAppointment] = useState<Appointment | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Navegación de días
  const goToPreviousDay = () => setSelectedDate(prev => addDays(prev, -1));
  const goToNextDay = () => setSelectedDate(prev => addDays(prev, 1));
  const goToToday = () => setSelectedDate(new Date());

  // Formatear fecha para mostrar
  const formatDateDisplay = (date: Date) => {
    if (isToday(date)) return 'Hoy';
    if (isTomorrow(date)) return 'Mañana';
    return format(date, 'EEEE d', { locale: es });
  };

  // Manejar acciones de citas
  const handleViewAppointment = (appointment: Appointment) => {
    setViewingAppointment(appointment);
  };

  const handleEditAppointment = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setShowNewAppointmentForm(true);
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar esta cita?')) {
      try {
        // Aquí iría la llamada a la API para eliminar la cita
        setAppointments(appointments.filter(appt => appt.id !== appointmentId));
      } catch (error) {
        console.error('Error al eliminar la cita:', error);
        alert('No se pudo eliminar la cita. Por favor, inténtalo de nuevo.');
      }
    }
  };

  // Filtrar citas por fecha
  const getAppointmentsForDate = (date: Date) => {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(targetDate.getDate() + 1);
    return appointments.filter(appt => {
      const apptDate = new Date(appt.date);
      return apptDate >= targetDate && apptDate < nextDay;
    });
  };

  // Manejar nueva cita
  const handleNewAppointment = (data: any) => {
    const newAppointment: Appointment = {
      id: Date.now().toString(),
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      clientPhone: data.clientPhone,
      service: data.service,
      date: new Date(`${data.date}T${data.time}`),
      duration: parseInt(data.duration, 10),
      status: 'pending',
      type: data.type,
      notes: data.notes
    };
    setAppointments(prev => [...prev, newAppointment]);
    setShowNewAppointmentForm(false);
  };

  // Mock data inicial
  useEffect(() => {
    const now = new Date();
    const createDate = (baseDate: Date, hours: number, minutes: number) => {
      const date = new Date(baseDate);
      date.setHours(hours, minutes, 0, 0);
      return date;
    };
    setAppointments([
      {
        id: '1',
        clientName: 'María González',
        clientEmail: 'maria@example.com',
        clientPhone: '+56987654321',
        service: 'Asesoría Laboral',
        date: createDate(now, 10, 0),
        duration: 60,
        status: 'confirmed',
        type: 'video',
        notes: 'Consulta sobre despido injustificado.'
      },
      {
        id: '2',
        clientName: 'Roberto Sánchez',
        clientEmail: 'roberto@example.com',
        clientPhone: '+56912345678',
        service: 'Contrato de Arriendo',
        date: createDate(now, 15, 30),
        duration: 30,
        status: 'pending',
        type: 'in_person',
        notes: 'Revisión de cláusulas abusivas.'
      },
      {
        id: '3',
        clientName: 'Ana Torres',
        clientEmail: 'ana@example.com',
        clientPhone: '+56955555555',
        service: 'Divorcio Mutuo Acuerdo',
        date: createDate(addDays(now, 1), 11, 0),
        duration: 90,
        status: 'confirmed',
        type: 'phone',
        notes: 'Inicio de proceso de divorcio.'
      }
    ]);
  }, []);

  const dailyAppointments = getAppointmentsForDate(selectedDate);
  const filteredAppointments = searchQuery
    ? dailyAppointments.filter(appt =>
        appt.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        appt.service.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : dailyAppointments;

  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Citas</h1>
          <p className="text-muted-foreground">Gestiona tus citas programadas</p>
        </div>
        <div className="w-full md:w-auto">
          <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar citas..."
              className="w-full md:w-[300px] pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Calendario */}
        <div className="w-full md:w-1/3">
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">{format(selectedDate, 'MMMM yyyy', { locale: es })}</h3>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToPreviousDay}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToNextDay}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, i) => (
                  <div key={i} className="text-muted-foreground py-1">{day}</div>
                ))}
                
                {[...Array(7)].map((_, i) => {
                  const day = addDays(startOfWeek(selectedDate, { locale: es }), i);
                  const isSelected = day.toDateString() === selectedDate.toDateString();
                  const isCurrentMonth = day.getMonth() === selectedDate.getMonth();
                  
                  return (
                    <button
                      key={i}
                      className={`py-1.5 rounded-md flex items-center justify-center ${
                        isSelected 
                          ? 'bg-primary text-white' 
                          : isCurrentMonth 
                            ? 'hover:bg-muted' 
                            : 'text-muted-foreground/50 hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedDate(day)}
                    >
                      {format(day, 'd')}
                    </button>
                  );
                })}
              </div>
              
              <Button variant="outline" className="mt-4 w-full" size="sm" onClick={goToToday}>
                Hoy
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Lista de citas del día */}
        <div className="w-full md:w-2/3">
          {filteredAppointments.length === 0 ? (
            <div className="text-center text-muted-foreground">No hay citas para este día.</div>
          ) : (
            filteredAppointments.map(appointment => (
              <Card key={appointment.id} className="mb-3">
                <CardHeader className="flex flex-col">
                  <div className="flex items-center space-x-3 mb-2">
                    <Avatar>
                      <AvatarFallback>
                        {appointment.clientName
                          .split(' ')
                          .map(n => n[0])
                          .join('')
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-semibold">{appointment.clientName}</div>
                      <div className="text-sm text-muted-foreground">{appointment.service}</div>
                    </div>
                  </div>

                  <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center text-muted-foreground">
                      <Clock className="mr-2 h-4 w-4" />
                      {format(appointment.date, 'HH:mm')} - {format(new Date(appointment.date.getTime() + appointment.duration * 60000), 'HH:mm')}
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      {appointment.type === 'video' ? (
                        <Video className="mr-2 h-4 w-4" />
                      ) : appointment.type === 'phone' ? (
                        <Phone className="mr-2 h-4 w-4" />
                      ) : (
                        <MapPin className="mr-2 h-4 w-4" />
                      )}
                      {appointment.type === 'video'
                        ? 'Videollamada'
                        : appointment.type === 'phone'
                        ? 'Llamada telefónica'
                        : 'Reunión presencial'}
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      <Clock className="mr-2 h-4 w-4" />
                      {appointment.duration} minutos
                    </div>
                  </CardContent>

                  <div className="flex justify-end space-x-2 mt-4">
                    <Button 
                      variant="outline" 
                      size="default" 
                      className="h-9 flex items-center gap-2 px-4"
                      onClick={() => handleViewAppointment(appointment)}
                    >
                      <Eye className="h-4 w-4" />
                      Ver
                    </Button>
                    <Button 
                      variant="outline" 
                      size="default" 
                      className="h-9 flex items-center gap-2 px-4"
                      onClick={() => handleEditAppointment(appointment)}
                    >
                      <Edit className="h-4 w-4" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="default"
                      className="h-9 flex items-center gap-2 px-4 text-destructive border-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleDeleteAppointment(appointment.id)}
                    >
                      <Trash className="h-4 w-4" />
                      Eliminar
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Modal de Ver Cita */}
      {viewingAppointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-xl w-full max-w-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Detalles de la Cita</h3>
                <Button variant="ghost" size="icon" onClick={() => setViewingAppointment(null)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium">Cliente</h4>
                  <p className="text-muted-foreground">{viewingAppointment.clientName}</p>
                </div>
                <div>
                  <h4 className="font-medium">Servicio</h4>
                  <p className="text-muted-foreground">{viewingAppointment.service}</p>
                </div>
                <div>
                  <h4 className="font-medium">Fecha y Hora</h4>
                  <p className="text-muted-foreground">
                    {format(viewingAppointment.date, 'PPP', { locale: es })} a las{' '}
                    {format(viewingAppointment.date, 'p', { locale: es })}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium">Duración</h4>
                  <p className="text-muted-foreground">{viewingAppointment.duration} minutos</p>
                </div>
                <div>
                  <h4 className="font-medium">Tipo</h4>
                  <p className="text-muted-foreground capitalize">
                    {viewingAppointment.type === 'video' 
                      ? 'Videollamada' 
                      : viewingAppointment.type === 'phone' 
                        ? 'Llamada telefónica' 
                        : 'Reunión presencial'}
                  </p>
                </div>
                {viewingAppointment.notes && (
                  <div>
                    <h4 className="font-medium">Notas</h4>
                    <p className="text-muted-foreground whitespace-pre-line">{viewingAppointment.notes}</p>
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex justify-end space-x-2">
                <Button variant="outline" onClick={() => {
                  setViewingAppointment(null);
                  handleEditAppointment(viewingAppointment);
                }}>
                  Editar
                </Button>
                <Button onClick={() => setViewingAppointment(null)}>Cerrar</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Formulario para nueva/editar cita */}
      {showNewAppointmentForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">
                  {editingAppointment ? 'Editar Cita' : 'Nueva Cita'}
                </h3>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => {
                    setShowNewAppointmentForm(false);
                    setEditingAppointment(null);
                  }}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <AppointmentForm
                initialData={editingAppointment ? {
                  ...editingAppointment,
                  date: format(editingAppointment.date, 'yyyy-MM-dd'),
                  time: format(editingAppointment.date, 'HH:mm'),
                  duration: editingAppointment.duration.toString(),
                } : {
                  clientName: '',
                  clientEmail: '',
                  clientPhone: '',
                  service: '',
                  date: format(selectedDate, 'yyyy-MM-dd'),
                  time: '10:00',
                  duration: '30',
                  type: 'video',
                  notes: ''
                }}
                onSubmit={(data) => {
                  if (editingAppointment) {
                    // Actualizar cita existente
                    setAppointments(appointments.map(appt => 
                      appt.id === editingAppointment.id 
                        ? { ...appt, ...data, date: new Date(`${data.date}T${data.time}`) }
                        : appt
                    ));
                    setEditingAppointment(null);
                  } else {
                    // Crear nueva cita
                    const newAppointment: Appointment = {
                      id: Date.now().toString(),
                      ...data,
                      date: new Date(`${data.date}T${data.time}`),
                      status: 'confirmed',
                    };
                    setAppointments([...appointments, newAppointment]);
                  }
                  setShowNewAppointmentForm(false);
                }}
                onCancel={() => {
                  setShowNewAppointmentForm(false);
                  setEditingAppointment(null);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
