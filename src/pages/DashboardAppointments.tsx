import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
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
  duration: number;
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
  // ... other mock appointments ...
];

export default function DashboardAppointments() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>(mockAppointments);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isNewAppointmentModalOpen, setIsNewAppointmentModalOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleNotes, setRescheduleNotes] = useState('');
  
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
                status: 'rescheduled',
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
            ? { ...apt, status: 'cancelled' }
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
        price: 50000,
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

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 space-y-6">
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
        <div className="flex flex-col sm:flex-row gap-4">
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
        {sortedAppointments.length > 0 ? (
          sortedAppointments.map((appointment) => (
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
                      <Badge variant="outline" className={getStatusColor(appointment.status)}>
                        {getStatusText(appointment.status)}
                      </Badge>
                    </div>
                  </div>

                  {/* Detalles */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start space-x-3">
                      <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Fecha y hora</p>
                        <p className="text-sm font-medium">
                          {formatDate(appointment.date)} a las {formatTime(appointment.time)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Duración</p>
                        <p className="text-sm font-medium">{appointment.duration} minutos</p>
                      </div>
                    </div>
                    {appointment.location && (
                      <div className="flex items-start space-x-3">
                        <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-500">Ubicación</p>
                          <p className="text-sm font-medium">{appointment.location}</p>
                        </div>
                      </div>
                    )}
                    {appointment.meetingLink && (
                      <div className="flex items-start space-x-3">
                        <Video className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-500">Enlace de reunión</p>
                          <a 
                            href={appointment.meetingLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-blue-600 hover:underline"
                          >
                            Unirse a la reunión
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleViewDetails(appointment.id)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver detalles
                    </Button>
                    {appointment.status === 'scheduled' && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleReschedule(appointment.id)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Reagendar
                      </Button>
                    )}
                    {appointment.status === 'scheduled' && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                        onClick={() => handleCancelAppointment(appointment.id)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancelar
                      </Button>
                    )}
                    {appointment.meetingLink && isUpcoming(appointment.date, appointment.time) && (
                      <Button 
                        size="sm" 
                        onClick={() => handleJoinMeeting(appointment)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Video className="h-4 w-4 mr-1" />
                        Unirse a la reunión
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
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
              Agendar cita
            </Button>
          </div>
        )}
      </div>

      {/* Modal de nueva cita */}
      <Dialog open={isNewAppointmentModalOpen} onOpenChange={setIsNewAppointmentModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Cita</DialogTitle>
            <DialogDescription>
              Completa los detalles para agendar una nueva cita con un abogado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input 
                id="title" 
                placeholder="Ej: Consulta sobre contrato laboral" 
                value={newAppointment.title}
                onChange={(e) => setNewAppointment({...newAppointment, title: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea 
                id="description" 
                placeholder="Describe el motivo de tu consulta" 
                rows={3}
                value={newAppointment.description}
                onChange={(e) => setNewAppointment({...newAppointment, description: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Fecha</Label>
                <Input 
                  id="date" 
                  type="date" 
                  value={newAppointment.date}
                  onChange={(e) => setNewAppointment({...newAppointment, date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Hora</Label>
                <Input 
                  id="time" 
                  type="time" 
                  value={newAppointment.time}
                  onChange={(e) => setNewAppointment({...newAppointment, time: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Tipo de consulta</Label>
              <Select 
                value={newAppointment.type}
                onValueChange={(value: 'video' | 'phone' | 'in-person') => 
                  setNewAppointment({...newAppointment, type: value})
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="video">Videollamada</SelectItem>
                  <SelectItem value="phone">Llamada telefónica</SelectItem>
                  <SelectItem value="in-person">Presencial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lawyer">Abogado</Label>
                <Input 
                  id="lawyer" 
                  placeholder="Nombre del abogado" 
                  value={newAppointment.lawyerName}
                  onChange={(e) => setNewAppointment({...newAppointment, lawyerName: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="specialty">Especialidad</Label>
                <Input 
                  id="specialty" 
                  placeholder="Ej: Derecho Laboral" 
                  value={newAppointment.lawyerSpecialty}
                  onChange={(e) => setNewAppointment({...newAppointment, lawyerSpecialty: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notas adicionales</Label>
              <Textarea 
                id="notes" 
                placeholder="Información adicional que quieras compartir" 
                rows={2}
                value={newAppointment.notes}
                onChange={(e) => setNewAppointment({...newAppointment, notes: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsNewAppointmentModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateAppointment}
              disabled={!newAppointment.title || !newAppointment.description || 
                       !newAppointment.date || !newAppointment.time || 
                       !newAppointment.lawyerName || !newAppointment.lawyerSpecialty}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Agendar cita
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de detalles de la cita */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent>
          {selectedAppointment && (
            <>
              <DialogHeader>
                <DialogTitle className="text-gray-700">Detalles de la cita</DialogTitle>
                <DialogDescription className="text-gray-500">
                  Información detallada de la cita seleccionada.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-500">Título</Label>
                  <p className="text-sm">{selectedAppointment.title}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-500">Abogado</Label>
                    <p className="text-sm">{selectedAppointment.lawyerName}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-500">Especialidad</Label>
                    <p className="text-sm">{selectedAppointment.lawyerSpecialty}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-500">Fecha</Label>
                    <p className="text-sm">{formatDate(selectedAppointment.date)}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-500">Hora</Label>
                    <p className="text-sm">{formatTime(selectedAppointment.time)}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-500">Tipo de consulta</Label>
                  <div className="flex items-center space-x-2">
                    {getTypeIcon(selectedAppointment.type)}
                    <span className="text-sm">{getTypeText(selectedAppointment.type)}</span>
                  </div>
                </div>
                {selectedAppointment.location && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-500">Ubicación</Label>
                    <p className="text-sm">{selectedAppointment.location}</p>
                  </div>
                )}
                {selectedAppointment.meetingLink && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-500">Enlace de la reunión</Label>
                    <a 
                      href={selectedAppointment.meetingLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {selectedAppointment.meetingLink}
                    </a>
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-500">Estado</Label>
                  <Badge variant="outline" className={getStatusColor(selectedAppointment.status)}>
                    {getStatusText(selectedAppointment.status)}
                  </Badge>
                </div>
                {selectedAppointment.notes && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-500">Notas</Label>
                    <p className="text-sm whitespace-pre-line">{selectedAppointment.notes}</p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setIsViewModalOpen(false)}
                >
                  Cerrar
                </Button>
                {selectedAppointment.status === 'scheduled' && (
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setIsViewModalOpen(false);
                      handleReschedule(selectedAppointment.id);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Reagendar
                  </Button>
                )}
                {selectedAppointment.status === 'scheduled' && (
                  <Button 
                    variant="destructive"
                    onClick={() => {
                      setIsViewModalOpen(false);
                      handleCancelAppointment(selectedAppointment.id);
                    }}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancelar cita
                  </Button>
                )}
                {selectedAppointment.meetingLink && isUpcoming(selectedAppointment.date, selectedAppointment.time) && (
                  <Button 
                    onClick={() => handleJoinMeeting(selectedAppointment)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Video className="h-4 w-4 mr-1" />
                    Unirse a la reunión
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de reagendamiento */}
      <Dialog open={isRescheduleModalOpen} onOpenChange={setIsRescheduleModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reagendar cita</DialogTitle>
            <DialogDescription>
              Selecciona una nueva fecha y hora para tu cita.
            </DialogDescription>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Fecha actual</Label>
                <p className="text-sm">
                  {formatDate(selectedAppointment.date)} a las {formatTime(selectedAppointment.time)}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="newDate">Nueva fecha</Label>
                  <Input 
                    id="newDate" 
                    type="date" 
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newTime">Nueva hora</Label>
                  <Input 
                    id="newTime" 
                    type="time" 
                    value={rescheduleTime}
                    onChange={(e) => setRescheduleTime(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rescheduleNotes">Motivo del reagendamiento (opcional)</Label>
                <Textarea 
                  id="rescheduleNotes" 
                  placeholder="¿Por qué necesitas reagendar esta cita?"
                  value={rescheduleNotes}
                  onChange={(e) => setRescheduleNotes(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsRescheduleModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmReschedule}
              disabled={!rescheduleDate || !rescheduleTime}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Calendar className="h-4 w-4 mr-1" />
              Confirmar reagendamiento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmación de cancelación */}
      <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Estás seguro de que deseas cancelar esta cita?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. La cita será eliminada de tu agenda.
            </DialogDescription>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-2">
              <p className="text-sm">
                <span className="font-medium">Cita:</span> {selectedAppointment.title}
              </p>
              <p className="text-sm">
                <span className="font-medium">Fecha:</span> {formatDate(selectedAppointment.date)} a las {formatTime(selectedAppointment.time)}
              </p>
              <p className="text-sm">
                <span className="font-medium">Abogado:</span> {selectedAppointment.lawyerName}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsCancelModalOpen(false)}
            >
              Volver
            </Button>
            <Button 
              variant="destructive"
              onClick={handleConfirmCancel}
            >
              <X className="h-4 w-4 mr-1" />
              Sí, cancelar cita
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
