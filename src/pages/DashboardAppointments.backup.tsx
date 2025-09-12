import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Calendar, 
  Search, 
  Clock, 
  MapPin,
  User,
  Video,
  Phone,
  Plus,
  Eye,
  Edit,
  X,
  Filter,
  Trash2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface Appointment {
  id: string;
  title: string;
  description: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'rescheduled';
  type: 'video' | 'phone' | 'in-person';
  lawyerName: string;
  lawyerSpecialty: string;
  date: string;
  time: string;
  duration: number; // en minutos
  location?: string;
  meetingLink?: string;
  price: number;
  notes?: string;
  createdAt: string;
}

// Mock data para citas
const mockAppointments: Appointment[] = [
  {
    id: '1',
    title: 'Consulta Inicial - Contrato Laboral',
    description: 'Revisión de contrato de trabajo y análisis de cláusulas específicas.',
    status: 'confirmed',
    type: 'video',
    lawyerName: 'María González',
    lawyerSpecialty: 'Derecho Laboral',
    date: '2024-01-22',
    time: '10:00',
    duration: 60,
    meetingLink: 'https://zoom.us/j/123456789',
    price: 45000,
    notes: 'Traer copia del contrato firmado',
    createdAt: '2024-01-15'
  },
  {
    id: '2',
    title: 'Seguimiento Proceso Divorcio',
    description: 'Revisión del estado del proceso y próximos pasos a seguir.',
    status: 'scheduled',
    type: 'in-person',
    lawyerName: 'Carlos Rodríguez',
    lawyerSpecialty: 'Derecho Familiar',
    date: '2024-01-25',
    time: '15:30',
    duration: 45,
    location: 'Oficina Legal - Av. Providencia 1234, Santiago',
    price: 60000,
    notes: 'Traer documentos de bienes matrimoniales',
    createdAt: '2024-01-10'
  },
  {
    id: '3',
    title: 'Constitución de Sociedad',
    description: 'Firma de escritura pública y trámites finales para constitución de sociedad.',
    status: 'completed',
    type: 'in-person',
    lawyerName: 'Ana Martínez',
    lawyerSpecialty: 'Derecho Comercial',
    date: '2024-01-18',
    time: '11:00',
    duration: 90,
    location: 'Notaría Pérez - Las Condes',
    price: 120000,
    createdAt: '2023-12-20'
  },
  {
    id: '4',
    title: 'Consulta Telefónica - Accidente',
    description: 'Evaluación inicial del caso y estrategia legal a seguir.',
    status: 'rescheduled',
    type: 'phone',
    lawyerName: 'Pedro Silva',
    lawyerSpecialty: 'Derecho Civil',
    date: '2024-01-24',
    time: '09:00',
    duration: 30,
    price: 25000,
    notes: 'Reagendada desde el 20/01 por enfermedad del abogado',
    createdAt: '2024-01-12'
  },
  {
    id: '5',
    title: 'Asesoría Herencia',
    description: 'Análisis de documentos de herencia y planificación de trámites.',
    status: 'cancelled',
    type: 'video',
    lawyerName: 'Laura Fernández',
    lawyerSpecialty: 'Derecho Sucesorio',
    date: '2024-01-20',
    time: '14:00',
    duration: 60,
    price: 50000,
    notes: 'Cancelada por el cliente - motivos personales',
    createdAt: '2024-01-08'
  },
  {
    id: '6',
    title: 'Revisión Contrato Arriendo',
    description: 'Análisis de contrato de arriendo comercial y negociación de términos.',
    status: 'scheduled',
    type: 'video',
    lawyerName: 'Roberto Morales',
    lawyerSpecialty: 'Derecho Inmobiliario',
    date: '2024-01-26',
    time: '16:00',
    duration: 45,
    meetingLink: 'https://meet.google.com/abc-defg-hij',
    price: 40000,
    createdAt: '2024-01-16'
  }
];

export default function DashboardAppointments() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>(mockAppointments);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Modal states
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isNewAppointmentModalOpen, setIsNewAppointmentModalOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleNotes, setRescheduleNotes] = useState('');
  
  // New appointment form states
  const [newAppointment, setNewAppointment] = useState({
    title: '',
    description: '',
    type: 'video' as 'video' | 'phone' | 'in-person',
    date: '',
    time: '',
    lawyerName: '',
    lawyerSpecialty: '',
    notes: ''
  });

  const handleJoinMeeting = (appointment: Appointment) => {
    if (appointment.meetingLink) {
      toast({
        title: "Abriendo reunión",
        description: `Conectando a la videollamada con ${appointment.lawyerName}...`,
      });
      // Abrir enlace en nueva pestaña
      setTimeout(() => {
        window.open(appointment.meetingLink, '_blank');
      }, 1000);
    }
  };

  const handleReschedule = (appointmentId: string) => {
    const appointment = appointments.find(a => a.id === appointmentId);
    if (appointment) {
      setSelectedAppointment(appointment);
      setRescheduleDate('');
      setRescheduleTime('');
      setRescheduleNotes('');
      setIsRescheduleModalOpen(true);
    }
  };

  const handleViewDetails = (appointmentId: string) => {
    const appointment = appointments.find(a => a.id === appointmentId);
    if (appointment) {
      setSelectedAppointment(appointment);
      setIsViewModalOpen(true);
    }
  };

  const handleCancelAppointment = (appointmentId: string) => {
    const appointment = appointments.find(a => a.id === appointmentId);
    if (appointment) {
      setSelectedAppointment(appointment);
      setIsCancelModalOpen(true);
    }
  };

  const handleConfirmReschedule = () => {
    if (rescheduleDate && rescheduleTime && selectedAppointment) {
      setAppointments(prev => 
        prev.map(apt => 
          apt.id === selectedAppointment.id 
            ? { 
                ...apt, 
                date: rescheduleDate,
                time: rescheduleTime,
                status: 'rescheduled' as const,
                notes: rescheduleNotes || apt.notes
              }
            : apt
        )
      );
      toast({
        title: "Cita reagendada",
        description: `Tu cita ha sido reagendada para el ${rescheduleDate} a las ${rescheduleTime}.`,
      });
      setIsRescheduleModalOpen(false);
    }
  };

  const handleConfirmCancel = () => {
    if (selectedAppointment) {
      setAppointments(prev => 
        prev.map(apt => 
          apt.id === selectedAppointment.id 
            ? { ...apt, status: 'cancelled' as const }
            : apt
        )
      );
      toast({
        title: "Cita cancelada",
        description: "La cita ha sido cancelada exitosamente.",
        variant: "destructive",
      });
      setIsCancelModalOpen(false);
    }
  };

  const handleNewAppointment = () => {
    setNewAppointment({
      title: '',
      description: '',
      type: 'video',
      date: '',
      time: '',
      lawyerName: '',
      lawyerSpecialty: '',
      notes: ''
    });
    setIsNewAppointmentModalOpen(true);
  };

  const handleCreateAppointment = () => {
    if (newAppointment.title && newAppointment.description && newAppointment.date && 
        newAppointment.time && newAppointment.lawyerName && newAppointment.lawyerSpecialty) {
      
      const appointmentId = `apt-${Date.now()}`;
      const newApt: Appointment = {
        id: appointmentId,
        title: newAppointment.title,
        description: newAppointment.description,
        status: 'scheduled',
        type: newAppointment.type,
        date: newAppointment.date,
        time: newAppointment.time,
        duration: 60,
        lawyerName: newAppointment.lawyerName,
        lawyerSpecialty: newAppointment.lawyerSpecialty,
        price: 50000, // Precio por defecto
        createdAt: new Date().toISOString().split('T')[0],
        notes: newAppointment.notes,
        meetingLink: newAppointment.type === 'video' ? `https://meet.google.com/${appointmentId}` : undefined,
        location: newAppointment.type === 'in-person' ? 'Oficina Central - Santiago Centro' : undefined
      };

      setAppointments(prev => [newApt, ...prev]);
      toast({
        title: "Cita agendada",
        description: `Tu cita con ${newAppointment.lawyerName} ha sido agendada para el ${newAppointment.date}.`,
      });
      setIsNewAppointmentModalOpen(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'rescheduled': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmada';
      case 'scheduled': return 'Programada';
      case 'completed': return 'Completada';
      case 'cancelled': return 'Cancelada';
      case 'rescheduled': return 'Reagendada';
      default: return status;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="h-4 w-4" />;
      case 'phone': return <Phone className="h-4 w-4" />;
      case 'in-person': return <MapPin className="h-4 w-4" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'video': return 'Videollamada';
      case 'phone': return 'Teléfono';
      case 'in-person': return 'Presencial';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'video': return 'bg-blue-100 text-blue-800';
      case 'phone': return 'bg-green-100 text-green-800';
      case 'in-person': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredAppointments = appointments.filter(appointment => {
    const matchesSearch = appointment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         appointment.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         appointment.lawyerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || appointment.status === statusFilter;
    const matchesType = typeFilter === 'all' || appointment.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (time: string) => {
    return time;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  const isUpcoming = (date: string, time: string) => {
    const appointmentDateTime = new Date(`${date}T${time}`);
    return appointmentDateTime > new Date();
  };

  const sortedAppointments = filteredAppointments.sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.time}`);
    const dateB = new Date(`${b.date}T${b.time}`);
    return dateA.getTime() - dateB.getTime();
  });

  const handleViewAppointment = (appointmentId: string) => {
    const appointment = appointments.find(a => a.id === appointmentId);
    if (appointment) {
      setSelectedAppointment(appointment);
      setIsViewModalOpen(true);
    }
  };

  const handleRescheduleAppointment = (appointmentId: string) => {
    const appointment = appointments.find(a => a.id === appointmentId);
    if (appointment) {
      setSelectedAppointment(appointment);
      setIsRescheduleModalOpen(true);
    }
  };

  const confirmCancelAppointment = () => {
    if (selectedAppointment) {
      // In a real app, you would make an API call here
      console.log('Cancelling appointment:', selectedAppointment.id);
      setIsCancelModalOpen(false);
      // Show success message
      toast({
        title: 'Cita cancelada',
        description: 'La cita ha sido cancelada exitosamente.',
      });
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mis Citas</h1>
          <p className="text-muted-foreground">
            Gestiona tus citas programadas y consultas
          </p>
        </div>
        <Button onClick={handleNewAppointment}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Cita
        </Button>
      </div>

        {/* Filtros y búsqueda */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar citas..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="scheduled">Programadas</SelectItem>
                <SelectItem value="confirmed">Confirmadas</SelectItem>
                <SelectItem value="completed">Completadas</SelectItem>
                <SelectItem value="cancelled">Canceladas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="video">Videollamada</SelectItem>
                <SelectItem value="phone">Llamada telefónica</SelectItem>
                <SelectItem value="in-person">Presencial</SelectItem>
              </SelectContent>
            </Select>
          </div>
      </div>

        {/* Lista de citas */}
        <div className="space-y-6">
          {sortedAppointments.map((appointment) => (
            <Card 
              key={appointment.id} 
              className={`hover:shadow-md transition-shadow ${
                isUpcoming(appointment.date, appointment.time) && appointment.status === 'confirmed' 
                  ? 'border-l-4 border-l-blue-500' 
                  : ''
              }`}
            >
              <CardContent className="p-6">
                <div className="flex flex-col space-y-4">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {appointment.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {appointment.lawyerName} • {appointment.lawyerSpecialty}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className={getTypeColor(appointment.type)}>
                        <span className="flex items-center">
                          {getTypeIcon(appointment.type)}
                          <span className="ml-1">{getTypeText(appointment.type)}</span>
                        </span>
                      </Badge>
                      <Badge className={getStatusColor(appointment.status)}>
                        {getStatusText(appointment.status)}
                      </Badge>
                    </div>
                  </div>

                  {/* Detalles principales */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-5 w-5 text-gray-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Fecha</p>
                        <p className="text-sm">{formatDate(appointment.date)}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-5 w-5 text-gray-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Hora</p>
                        <p className="text-sm">{formatTime(appointment.time)}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-5 w-5 text-gray-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Duración</p>
                        <p className="text-sm">{appointment.duration} minutos</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="h-5 w-5 flex items-center justify-center text-gray-500">$</span>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Precio</p>
                        <p className="text-sm">{formatPrice(appointment.price)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Descripción */}
                  <div className="pt-2">
                    <p className="text-gray-600 text-sm">
                      {appointment.description}
                    </p>
                  </div>

                  {/* Detalles adicionales */}
                  {(appointment.location || appointment.meetingLink || appointment.notes) && (
                    <div className="pt-2 space-y-3">
                      {appointment.location && (
                        <div className="flex items-start space-x-2">
                          <MapPin className="h-5 w-5 text-gray-500 flex-shrink-0 mt-0.5" />
                          <p className="text-sm">{appointment.location}</p>
                        </div>
                      )}
                      {appointment.meetingLink && (
                        <div className="flex items-center space-x-2">
                          <Video className="h-5 w-5 text-gray-500 flex-shrink-0" />
                          <a 
                            href={appointment.meetingLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline"
                          >
                            Unirse a la videollamada
                          </a>
                        </div>
                      )}
                      {appointment.notes && (
                        <div className="bg-yellow-50 p-3 rounded-md">
                          <p className="text-xs font-medium text-yellow-800 mb-1">Notas:</p>
                          <p className="text-sm text-yellow-700">{appointment.notes}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Acciones */}
                  <div className="border-t mt-4 pt-4">
                    <div className="flex flex-col items-end space-y-2 sm:flex-row sm:justify-end sm:space-x-2 sm:space-y-0 w-full">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full sm:w-auto"
                        onClick={() => handleViewDetails(appointment.id)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver detalles
                      </Button>
                      {appointment.status === 'scheduled' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full sm:w-auto"
                          onClick={() => handleReschedule(appointment.id)}
                        >
                          <Calendar className="h-4 w-4 mr-1" />
                          Reagendar
                        </Button>
                      )}
                      {(appointment.status === 'scheduled' || appointment.status === 'confirmed') && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50 sm:w-auto"
                          onClick={() => {
                            const appointment = appointments.find(a => a.id === appointment.id);
                            if (appointment) {
                              setSelectedAppointment(appointment);
                              setIsCancelModalOpen(true);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Cancelar
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {sortedAppointments.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No se encontraron citas
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'Aún no tienes citas agendadas. ¡Agenda tu primera cita!'
              }
            </p>
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleNewAppointment}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Agendar
            </Button>
          </div>
        )}
      </div>

      {/* Modal para ver detalles */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-gray-700">Detalles de la cita</DialogTitle>
            <DialogDescription className="text-gray-500">
              Información detallada de la cita seleccionada.
            </DialogDescription>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-500">Título</Label>
                <Input 
                  value={selectedAppointment.title} 
                  readOnly 
                  className="bg-gray-50"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-500">Abogado</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 bg-gray-50"
                    disabled
                    value={selectedAppointment.lawyerName}
                  >
                    <option value={selectedAppointment.lawyerName}>
                      {selectedAppointment.lawyerName}
                    </option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-500">Especialidad</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 bg-gray-50"
                    disabled
                    value={selectedAppointment.lawyerSpecialty}
                  >
                    <option value={selectedAppointment.lawyerSpecialty}>
                      {selectedAppointment.lawyerSpecialty}
                    </option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-500">Fecha</Label>
                  <Input 
                    type="date" 
                    value={selectedAppointment.date} 
                    readOnly 
                    className="bg-gray-50"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-500">Hora</Label>
                  <Input 
                    type="time" 
                    value={selectedAppointment.time} 
                    readOnly 
                    className="bg-gray-50"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-500">Tipo de cita</Label>
                  <select 
                    className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${getTypeColor(selectedAppointment.type)}`}
                    disabled
                    value={selectedAppointment.type}
                  >
                    <option value={selectedAppointment.type}>
                      {getTypeText(selectedAppointment.type)}
                    </option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-500">Estado</Label>
                  <select 
                    className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${getStatusColor(selectedAppointment.status)}`}
                    disabled
                    value={selectedAppointment.status}
                  >
                    <option value={selectedAppointment.status}>
                      {getStatusText(selectedAppointment.status)}
                    </option>
                  </select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-500">Precio</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                  <Input 
                    value={selectedAppointment.price} 
                    readOnly 
                    className="pl-8 bg-gray-50 font-semibold"
                  />
                </div>
              </div>
              {selectedAppointment.meetingLink && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Enlace de reunión</Label>
                  <p className="text-blue-600 text-sm break-all">{selectedAppointment.meetingLink}</p>
                </div>
              )}
              {selectedAppointment.location && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Ubicación</Label>
                  <p className="text-gray-700">{selectedAppointment.location}</p>
                </div>
              )}
              {selectedAppointment.notes && (
                <div>
                  <Label className="text-sm font-medium">Notas</Label>
                  <p className="text-gray-700">{selectedAppointment.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex flex-col items-end space-y-2 sm:flex-row sm:justify-end sm:space-y-0 w-full">
            <Button 
              variant="outline" 
              onClick={() => setIsViewModalOpen(false)}
              className="w-full sm:w-auto"
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para reagendar */}
      <Dialog open={isRescheduleModalOpen} onOpenChange={setIsRescheduleModalOpen}>
        <DialogContent className="w-full max-w-4xl h-full sm:h-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-700">Reagendar Cita</DialogTitle>
            <DialogDescription className="text-gray-500">
              Selecciona una nueva fecha y hora para tu cita con {selectedAppointment?.lawyerName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reschedule-date">Nueva fecha</Label>
              <Input
                id="reschedule-date"
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <Label htmlFor="reschedule-time">Nueva hora</Label>
              <Select 
                value={rescheduleTime} 
                onValueChange={(value) => setRescheduleTime(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una hora" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="08:00">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span>08:00</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="09:00">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span>09:00</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="10:00">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span>10:00</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="11:00">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span>11:00</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="12:00">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span>12:00</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="13:00">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span>13:00</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="14:00">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span>14:00</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="15:00">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span>15:00</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="16:00">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span>16:00</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="17:00">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span>17:00</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="18:00">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span>18:00</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="reschedule-notes">Notas adicionales (opcional)</Label>
              <Textarea
                id="reschedule-notes"
                placeholder="Motivo del reagendamiento o notas adicionales..."
                value={rescheduleNotes}
                onChange={(e) => setRescheduleNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="flex flex-col items-end space-y-2 sm:flex-row sm:justify-end sm:space-y-0 sm:space-x-2 w-full">
            <Button 
              variant="outline" 
              onClick={() => setIsRescheduleModalOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmReschedule} 
              disabled={!rescheduleDate || !rescheduleTime}
              className="w-full sm:w-auto"
            >
              Confirmar Reagendamiento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para confirmar cancelación */}
      <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
        <DialogContent className="w-full max-w-4xl h-full sm:h-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-700">¿Cancelar cita?</DialogTitle>
            <DialogDescription className="text-gray-500">
              ¿Estás seguro de que deseas cancelar esta cita? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          {selectedAppointment && (
            <div className="py-4">
              <p className="text-sm text-gray-600">
                <strong>Cita:</strong> {selectedAppointment.title}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Abogado:</strong> {selectedAppointment.lawyerName}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Fecha:</strong> {selectedAppointment.date} a las {selectedAppointment.time}
              </p>
            </div>
          )}
          <DialogFooter className="flex flex-col items-end space-y-2 sm:flex-row sm:justify-end sm:space-y-0 sm:space-x-2 w-full">
            <Button 
              variant="outline" 
              onClick={() => setIsCancelModalOpen(false)}
              className="w-full sm:w-auto"
            >
              No, mantener cita
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmCancel}
              className="w-full sm:w-auto"
            >
              Sí, cancelar cita
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para agendar nueva cita */}
      <Dialog open={isNewAppointmentModalOpen} onOpenChange={setIsNewAppointmentModalOpen}>
        <DialogContent className="w-full max-w-4xl h-full sm:h-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-700">Agendar Nueva Cita</DialogTitle>
            <DialogDescription className="text-gray-500">
              Completa la información para agendar una cita con un abogado
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="new-lawyer" className="pb-2">Nombre del abogado</Label>
                <Select 
                  value={newAppointment.lawyerName} 
                  onValueChange={(value) => {
                    const lawyers = {
                      'María González': 'Derecho Laboral',
                      'Carlos Rodríguez': 'Derecho Civil',
                      'Ana Martínez': 'Derecho Penal',
                      'Luis Fernández': 'Derecho Comercial',
                      'Patricia Silva': 'Derecho Familiar'
                    };
                    setNewAppointment(prev => ({ 
                      ...prev, 
                      lawyerName: value,
                      lawyerSpecialty: lawyers[value as keyof typeof lawyers] || ''
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un abogado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="María González">María González</SelectItem>
                    <SelectItem value="Carlos Rodríguez">Carlos Rodríguez</SelectItem>
                    <SelectItem value="Ana Martínez">Ana Martínez</SelectItem>
                    <SelectItem value="Luis Fernández">Luis Fernández</SelectItem>
                    <SelectItem value="Patricia Silva">Patricia Silva</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="new-specialty">Especialidad</Label>
                <Input
                  id="new-specialty"
                  value={newAppointment.lawyerSpecialty}
                  readOnly
                  placeholder="Se completa automáticamente"
                  className="bg-gray-50"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="new-notes" className="pb-2">Notas adicionales (opcional)</Label>
              <Textarea
                id="new-notes"
                value={newAppointment.notes}
                onChange={(e) => setNewAppointment(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Información adicional o preparación necesaria..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="new-date" className="pb-2">Fecha preferida</Label>
                <Input
                  id="new-date"
                  type="date"
                  value={newAppointment.date}
                  onChange={(e) => setNewAppointment(prev => ({ ...prev, date: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                  placeholder="dd-mm-yyyy"
                />
              </div>
              <div>
                <Label htmlFor="new-time" className="pb-2">Hora preferida</Label>
                <Select 
                  value={newAppointment.time} 
                  onValueChange={(value) => setNewAppointment(prev => ({ ...prev, time: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona la hora" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="08:00">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4" />
                        <span>08:00</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="09:00">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4" />
                        <span>09:00</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="10:00">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4" />
                        <span>10:00</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="11:00">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4" />
                        <span>11:00</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="12:00">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4" />
                        <span>12:00</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="13:00">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4" />
                        <span>13:00</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="14:00">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4" />
                        <span>14:00</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="15:00">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4" />
                        <span>15:00</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="16:00">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4" />
                        <span>16:00</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="17:00">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4" />
                        <span>17:00</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="18:00">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4" />
                        <span>18:00</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="new-duration" className="pb-2">Duración (minutos)</Label>
                <Select 
                  value="60" 
                  onValueChange={() => {}}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutos</SelectItem>
                    <SelectItem value="60">1 hora</SelectItem>
                    <SelectItem value="90">1.5 horas</SelectItem>
                    <SelectItem value="120">2 horas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="new-type" className="pb-2">Tipo de consulta</Label>
                <Select 
                  value={newAppointment.type} 
                  onValueChange={(value: 'video' | 'phone' | 'in-person') => 
                    setNewAppointment(prev => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video">Videollamada</SelectItem>
                    <SelectItem value="phone">Teléfono</SelectItem>
                    <SelectItem value="in-person">Presencial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="new-description" className="pb-2">Descripción del caso</Label>
              <Textarea
                id="new-description"
                value={newAppointment.description}
                onChange={(e) => setNewAppointment(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe brevemente tu caso o consulta..."
                rows={3}
              />
            </div>

            {/* Costo estimado */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">Costo estimado:</span>
                <span className="text-xl font-bold text-green-600">$1.000</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                60 min × $285/hora
              </p>
              <p className="text-xs text-yellow-600 mt-1">
                Se aplica monto mínimo de $1.000 CLP para pagos con tarjeta.
              </p>
            </div>
          </div>
          <DialogFooter className="flex flex-col items-end space-y-2 sm:flex-row sm:justify-end sm:space-y-0 sm:space-x-2 w-full">
            <Button 
              variant="outline" 
              onClick={() => setIsNewAppointmentModalOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateAppointment} 
              disabled={!newAppointment.description || !newAppointment.date || !newAppointment.time || !newAppointment.lawyerName || !newAppointment.lawyerSpecialty}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
            >
              Pagar $1.000
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
