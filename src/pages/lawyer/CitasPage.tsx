import { useState, useEffect } from 'react';
import { format, isToday, isTomorrow, addDays, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Search, X, Clock, Video, Phone, MapPin, MoreHorizontal, Badge, Eye, Edit, Trash } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AppointmentForm } from '@/components/appointments/AppointmentForm';
export default function CitasPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [showNewAppointmentForm, setShowNewAppointmentForm] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [viewingAppointment, setViewingAppointment] = useState<Appointment | null>(null);
  const [appointmentToDelete, setAppointmentToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

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

  const handleDeleteAppointment = (appointmentId: string) => {
    setAppointmentToDelete(appointmentId);
  };

  const confirmDeleteAppointment = async () => {
    if (!appointmentToDelete) return;
    
    try {
      // Aquí iría la llamada a la API para eliminar la cita
      setAppointments(appointments.filter(appt => appt.id !== appointmentToDelete));
      toast({
        title: 'Cita cancelada',
        description: 'La cita ha sido cancelada correctamente.',
      });
    } catch (error) {
      console.error('Error al cancelar la cita:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cancelar la cita. Inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setAppointmentToDelete(null);
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

  // Handle new appointment
  const handleNewAppointment = async (data: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // First, find or create the client
      let clientId: string;
      
      // Check if client exists by email
      const { data: existingClient } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', data.clientEmail)
        .single();

      if (existingClient) {
        clientId = existingClient.id;
      } else {
        // Create new client profile
        const { data: newClient, error: clientError } = await supabase
          .from('profiles')
          .insert({
            first_name: data.clientName.split(' ')[0],
            last_name: data.clientName.split(' ').slice(1).join(' '),
            email: data.clientEmail,
            phone: data.clientPhone,
            role: 'client'
          })
          .select('id')
          .single();

        if (clientError) throw clientError;
        clientId = newClient.id;
      }

      // Create the appointment
      const { error } = await supabase
        .from('appointments')
        .insert({
          client_id: clientId,
          lawyer_id: session.user.id,
          date: new Date(`${data.date}T${data.time}`).toISOString(),
          duration: parseInt(data.duration, 10),
          status: 'pending',
          type: data.type,
          service_type: data.service,
          notes: data.notes
        });

      if (error) throw error;

      // Refresh appointments
      await fetchAppointments();
      
      toast({
        title: 'Cita creada',
        description: 'La cita ha sido agendada correctamente.',
      });
      
      setShowNewAppointmentForm(false);
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear la cita. Por favor, inténtalo de nuevo.',
        variant: 'destructive',
      });
    }
  };

  // Fetch appointments from database
  const fetchAppointments = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Get lawyer's appointments
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          id,
          date,
          duration,
          status,
          type,
          notes,
          service_type,
          client:profiles!appointments_client_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .eq('lawyer_id', session.user.id)
        .order('date', { ascending: true });

      if (error) throw error;

      // Transform data to match the expected format
      const formattedAppointments = appointments.map(appt => ({
        id: appt.id,
        clientName: `${appt.client?.first_name || ''} ${appt.client?.last_name || ''}`.trim() || 'Cliente',
        clientEmail: appt.client?.email || '',
        clientPhone: appt.client?.phone || '',
        service: appt.service_type || 'Consulta',
        date: new Date(appt.date),
        duration: appt.duration || 30, // Default to 30 minutes if not specified
        status: appt.status || 'pending',
        type: appt.type || 'video',
        notes: appt.notes || ''
      }));

      setAppointments(formattedAppointments);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las citas. Por favor, inténtalo de nuevo.',
        variant: 'destructive',
      });
    }
  };

  // Fetch appointments on component mount
  useEffect(() => {
    fetchAppointments();
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
                      className="h-9 flex items-center gap-2 px-4 text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-700"
                      onClick={() => handleDeleteAppointment(appointment.id)}
                    >
                      <X className="h-4 w-4" />
                      Cancelar
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* View Appointment Dialog */}
      <Dialog open={!!viewingAppointment} onOpenChange={(open) => !open && setViewingAppointment(null)}>
        <DialogContent 
          className="sm:max-w-2xl fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Detalles de la Cita</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <h4 className="font-medium">Cliente</h4>
              <p className="text-muted-foreground">{viewingAppointment?.clientName}</p>
            </div>
            <div>
              <h4 className="font-medium">Servicio</h4>
              <p className="text-muted-foreground">{viewingAppointment?.service}</p>
            </div>
            <div>
              <h4 className="font-medium">Fecha y Hora</h4>
              <p className="text-muted-foreground">
                {viewingAppointment && format(viewingAppointment.date, 'PPP', { locale: es })} a las{' '}
                {viewingAppointment && format(viewingAppointment.date, 'p', { locale: es })}
              </p>
            </div>
            <div>
              <h4 className="font-medium">Duración</h4>
              <p className="text-muted-foreground">{viewingAppointment?.duration} minutos</p>
            </div>
            <div>
              <h4 className="font-medium">Tipo</h4>
              <p className="text-muted-foreground capitalize">
                {viewingAppointment?.type === 'video' 
                  ? 'Videollamada' 
                  : viewingAppointment?.type === 'phone' 
                    ? 'Llamada telefónica' 
                    : 'Reunión presencial'}
              </p>
            </div>
            {viewingAppointment?.notes && (
              <div>
                <h4 className="font-medium">Notas</h4>
                <p className="text-muted-foreground whitespace-pre-line">{viewingAppointment.notes}</p>
              </div>
            )}
          </div>
          
          <DialogFooter className="mt-4">
            <Button 
              variant="outline" 
              className="mr-2"
              onClick={() => {
                if (viewingAppointment) {
                  setViewingAppointment(null);
                  handleEditAppointment(viewingAppointment);
                }
              }}
            >
              Editar
            </Button>
            <Button onClick={() => setViewingAppointment(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New/Edit Appointment Dialog */}
      <Dialog open={showNewAppointmentForm} onOpenChange={(open) => !open && setShowNewAppointmentForm(false)}>
        <DialogContent 
          className="sm:max-w-2xl max-h-[90vh] overflow-y-auto fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" 
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              {editingAppointment ? 'Editar Cita' : 'Nueva Cita'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">

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
                    setAppointments(prev => [...prev, newAppointment]);
                    setShowNewAppointmentForm(false);
                  }
                }}
                onCancel={() => {
                  setShowNewAppointmentForm(false);
                  setEditingAppointment(null);
                }}
                isEditing={!!editingAppointment}
            />
          </div>
        </DialogContent>
      </Dialog>
      {/* Confirmation Dialog for Appointment Cancellation */}
      <Dialog open={!!appointmentToDelete} onOpenChange={(open) => !open && setAppointmentToDelete(null)}>
        <DialogContent 
          className="sm:max-w-[425px] fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" 
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">¿Cancelar cita?</DialogTitle>
            <DialogDescription className="mt-2">
              ¿Estás seguro de que deseas cancelar esta cita? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button 
              variant="outline" 
              onClick={() => setAppointmentToDelete(null)}
              className="mr-2"
            >
              Volver
            </Button>
            <Button 
              variant="destructive"
              onClick={confirmDeleteAppointment}
              className="bg-red-600 hover:bg-red-700"
            >
              Sí, cancelar cita
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
