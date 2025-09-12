import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { 
  Search, 
  MessageSquare, 
  Clock, 
  DollarSign, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  Clock4, 
  XCircle, 
  ChevronDown, 
  ChevronUp, 
  MessageCircle, 
  Edit2, 
  Trash2, 
  Plus,
  ArrowRight,
  Eye
} from 'lucide-react';

type ConsultationStatus = 'pending' | 'in-progress' | 'resolved' | 'rejected';
type Priority = 'low' | 'medium' | 'high';

interface Lawyer {
  id: string;
  name: string;
  specialty: string;
  hourlyRate: number;
  image: string;
}

interface Consultation {
  id: string;
  title: string;
  description: string;
  status: ConsultationStatus;
  priority: Priority;
  lawyerId: string;
  lawyerName: string;
  lawyerSpecialty: string;
  createdAt: string;
  lastUpdate: string;
  messages: number;
  price: number;
  category: string;
  isFree?: boolean;
}

// Mock abogados
const mockLawyers: Lawyer[] = [
  { id: '1', name: 'María González', specialty: 'Derecho Laboral', hourlyRate: 45000, image: 'https://randomuser.me/api/portraits/women/45.jpg' },
  { id: '2', name: 'Carlos Rodríguez', specialty: 'Derecho Familiar', hourlyRate: 120000, image: 'https://randomuser.me/api/portraits/men/32.jpg' },
  { id: '3', name: 'Ana Martínez', specialty: 'Derecho Comercial', hourlyRate: 80000, image: 'https://randomuser.me/api/portraits/women/63.jpg' },
  { id: '4', name: 'Pedro Silva', specialty: 'Derecho Civil', hourlyRate: 60000, image: 'https://randomuser.me/api/portraits/men/54.jpg' },
];

// Mock consultas
const mockConsultations: Consultation[] = [
  {
    id: '1',
    title: 'Consulta sobre contrato laboral',
    description: 'Necesito asesoría sobre los términos de mi contrato laboral actual y si son favorables.',
    status: 'in-progress',
    priority: 'high',
    lawyerId: '1',
    lawyerName: 'María González',
    lawyerSpecialty: 'Derecho Laboral',
    createdAt: '2024-01-10T10:30:00',
    lastUpdate: '2024-01-10T11:15:00',
    messages: 3,
    price: 45000,
    category: 'Laboral',
    isFree: true
  },
  {
    id: '2',
    title: 'División de bienes en divorcio',
    description: 'Necesito asesoría sobre cómo se dividirían los bienes en mi proceso de divorcio de mutuo acuerdo.',
    status: 'pending',
    priority: 'medium',
    lawyerId: '2',
    lawyerName: 'Carlos Rodríguez',
    lawyerSpecialty: 'Derecho Familiar',
    createdAt: '2024-01-12T14:20:00',
    lastUpdate: '2024-01-12T14:20:00',
    messages: 0,
    price: 120000,
    category: 'Familia',
    isFree: false
  },
  {
    id: '3',
    title: 'Contrato de arriendo comercial',
    description: 'Revisión de cláusulas de un contrato de arriendo para local comercial.',
    status: 'resolved',
    priority: 'low',
    lawyerId: '3',
    lawyerName: 'Ana Martínez',
    lawyerSpecialty: 'Derecho Comercial',
    createdAt: '2023-12-15T09:10:00',
    lastUpdate: '2023-12-20T16:45:00',
    messages: 5,
    price: 80000,
    category: 'Comercial',
    isFree: false
  },
  {
    id: '4',
    title: 'Demanda por daños y perjuicios',
    description: 'Asesoría para iniciar una demanda por daños y perjuicios por incumplimiento de contrato.',
    status: 'in-progress',
    priority: 'high',
    lawyerId: '4',
    lawyerName: 'Pedro Silva',
    lawyerSpecialty: 'Derecho Civil',
    createdAt: '2024-01-05T11:30:00',
    lastUpdate: '2024-01-08T17:20:00',
    messages: 7,
    price: 60000,
    category: 'Civil',
    isFree: false
  },
  {
    id: '5',
    title: 'Consulta sobre herencia',
    description: 'Tengo dudas sobre el proceso de aceptación de herencia y reparto de bienes.',
    status: 'pending',
    priority: 'medium',
    lawyerId: '2',
    lawyerName: 'Carlos Rodríguez',
    lawyerSpecialty: 'Derecho Familiar',
    createdAt: '2024-01-18T16:45:00',
    lastUpdate: '2024-01-18T16:45:00',
    messages: 0,
    price: 120000,
    category: 'Sucesiones',
    isFree: false
  }
];

export default function DashboardConsultations() {
  const { toast } = useToast();
  const [consultations, setConsultations] = useState<Consultation[]>(mockConsultations);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ConsultationStatus | 'all'>('all');
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isNewConsultationOpen, setIsNewConsultationOpen] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [newConsultation, setNewConsultation] = useState({ 
    title: '', 
    description: '', 
    category: '', 
    priority: 'medium' as Priority, 
    lawyerId: '' 
  });

  const filteredConsultations = useCallback(() => 
    consultations.filter(c => {
      const matchesSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.lawyerName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    }), 
    [consultations, searchTerm, statusFilter]
  );

  const handleSendReply = () => {
    if (!selectedConsultation || !replyMessage.trim()) return;
    
    // Update the consultation with the new reply
    const updatedConsultations = consultations.map(c => 
      c.id === selectedConsultation.id 
        ? { ...c, messages: c.messages + 1, lastUpdate: new Date().toISOString() }
        : c
    );
    
    setConsultations(updatedConsultations);
    setReplyMessage('');
    setIsReplyModalOpen(false);
    
    toast({
      title: "Respuesta enviada",
      description: "Tu respuesta ha sido enviada al abogado.",
    });
  };

  const handleSaveEdit = () => {
    if (!selectedConsultation || !editTitle.trim() || !editDescription.trim()) return;
    
    const updatedConsultations = consultations.map(c => 
      c.id === selectedConsultation.id 
        ? { 
            ...c, 
            title: editTitle, 
            description: editDescription,
            lastUpdate: new Date().toISOString() 
          }
        : c
    );
    
    setConsultations(updatedConsultations);
    setIsEditModalOpen(false);
    
    toast({
      title: "Consulta actualizada",
      description: "Los cambios en tu consulta han sido guardados.",
    });
  };

  const handleDeleteConsultation = () => {
    if (!selectedConsultation) return;
    
    setConsultations(consultations.filter(c => c.id !== selectedConsultation.id));
    setIsDeleteModalOpen(false);
    
    toast({
      title: "Consulta eliminada",
      description: "La consulta ha sido cancelada exitosamente.",
    });
  };

  const handleCreateNewConsultation = () => {
    if (!newConsultation.title.trim() || !newConsultation.description.trim() || !newConsultation.lawyerId) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos.",
        variant: "destructive",
      });
      return;
    }
    
    const selectedLawyer = mockLawyers.find(l => l.id === newConsultation.lawyerId);
    if (!selectedLawyer) return;
    
    const newConsult: Consultation = {
      id: `consult-${Date.now()}`,
      title: newConsultation.title,
      description: newConsultation.description,
      status: 'pending',
      priority: newConsultation.priority,
      lawyerId: newConsultation.lawyerId,
      lawyerName: selectedLawyer.name,
      lawyerSpecialty: selectedLawyer.specialty,
      createdAt: new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      messages: 0,
      price: selectedLawyer.hourlyRate,
      category: newConsultation.category,
      isFree: consultations.length === 0 // First consultation is free
    };
    
    setConsultations([newConsult, ...consultations]);
    setNewConsultation({ title: '', description: '', category: '', priority: 'medium', lawyerId: '' });
    setIsNewConsultationOpen(false);
    
    toast({
      title: "Consulta creada",
      description: "Tu consulta ha sido enviada al abogado.",
    });
  };

  const getStatusIcon = (status: ConsultationStatus | 'alert-circle' | 'clock') => {
    if (status === 'alert-circle') return <AlertCircle className="h-4 w-4" />;
    if (status === 'clock') return <Clock4 className="h-4 w-4" />;
    
    switch (status) {
      case 'pending':
        return <Clock4 className="h-4 w-4" />;
      case 'in-progress':
        return <AlertCircle className="h-4 w-4" />;
      case 'resolved':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'medium':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'low':
        return 'bg-green-50 text-green-700 border-green-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusColor = (status: ConsultationStatus) => {
    switch (status) {
      case 'in-progress':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'resolved':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'rejected':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'pending':
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Mis Consultas</h1>
            <p className="text-muted-foreground">
              Gestiona tus consultas legales y comunicación con abogados
            </p>
          </div>
          <Button onClick={() => setIsNewConsultationOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Consulta
          </Button>
        </div>

      {/* Filtros y búsqueda */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar consultas..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ConsultationStatus | 'all')}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="pending">Pendiente</SelectItem>
            <SelectItem value="in-progress">En progreso</SelectItem>
            <SelectItem value="resolved">Resuelto</SelectItem>
            <SelectItem value="rejected">Rechazado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de consultas */}
      <div className="space-y-4">
        {filteredConsultations().length > 0 ? (
          filteredConsultations().map((consultation) => (
            <Card key={consultation.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {consultation.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {consultation.lawyerName} • {consultation.lawyerSpecialty}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className={`${getPriorityColor(consultation.priority)} flex items-center gap-1`}>
                        {getStatusIcon(consultation.priority === 'high' ? 'alert-circle' : 'clock')}
                        <span className="ml-1">
                          {consultation.priority === 'high' ? 'Alta' : 
                           consultation.priority === 'medium' ? 'Media' : 'Baja'} prioridad
                        </span>
                      </Badge>
                      <Badge variant="outline" className={`${getStatusColor(consultation.status)} flex items-center gap-1`}>
                        {getStatusIcon(consultation.status)}
                        <span className="ml-1">
                          {consultation.status === 'pending' ? 'Pendiente' :
                           consultation.status === 'in-progress' ? 'En progreso' :
                           consultation.status === 'resolved' ? 'Resuelto' : 'Rechazado'}
                        </span>
                      </Badge>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {consultation.description}
                  </p>
                  
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-2 border-t border-gray-100">
                    <div className="flex items-center text-sm text-gray-500 space-x-4">
                      <span className="flex items-center">
                        <MessageCircle className="h-4 w-4 mr-1" />
                        {consultation.messages} {consultation.messages === 1 ? 'mensaje' : 'mensajes'}
                      </span>
                      <span className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {formatDate(consultation.lastUpdate)}
                      </span>
                      {consultation.isFree && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Gratis
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2 mt-3 sm:mt-0 w-full sm:w-auto">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full sm:w-auto"
                        onClick={() => {
                          setSelectedConsultation(consultation);
                          setIsViewModalOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver detalles
                      </Button>
                      
                      {consultation.status === 'pending' && (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full sm:w-auto"
                            onClick={() => {
                              setSelectedConsultation(consultation);
                              setEditTitle(consultation.title);
                              setEditDescription(consultation.description);
                              setIsEditModalOpen(true);
                            }}
                          >
                            <Edit2 className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full text-red-600 hover:text-red-700 sm:w-auto"
                            onClick={() => {
                              setSelectedConsultation(consultation);
                              setIsDeleteModalOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Cancelar
                          </Button>
                        </>
                      )}
                      
                      {consultation.status === 'in-progress' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full sm:w-auto"
                          onClick={() => {
                            setSelectedConsultation(consultation);
                            setReplyMessage('');
                            setIsReplyModalOpen(true);
                          }}
                        >
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Responder
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-12">
            <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No se encontraron consultas
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || statusFilter !== 'all'
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'Aún no tienes consultas. ¡Crea tu primera consulta legal!'}
            </p>
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => setIsNewConsultationOpen(true)}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Nueva Consulta
            </Button>
          </div>
        )}
      </div>

      {/* Modal Ver Consulta */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          {selectedConsultation && (
            <>
              <DialogHeader>
                <DialogTitle className="text-gray-700">Detalles de la Consulta</DialogTitle>
                <DialogDescription className="text-gray-500">
                  Información detallada sobre tu consulta legal
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Título</h4>
                  <p className="text-base">{selectedConsultation.title}</p>
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Descripción</h4>
                  <p className="whitespace-pre-line text-base">{selectedConsultation.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Abogado</h4>
                    <p>{selectedConsultation.lawyerName}</p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Especialidad</h4>
                    <p>{selectedConsultation.lawyerSpecialty}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Estado</h4>
                    <div className="flex items-center">
                      {getStatusIcon(selectedConsultation.status)}
                      <span className="ml-2">
                        {selectedConsultation.status === 'pending' ? 'Pendiente' :
                         selectedConsultation.status === 'in-progress' ? 'En progreso' :
                         selectedConsultation.status === 'resolved' ? 'Resuelto' : 'Rechazado'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Prioridad</h4>
                    <p>
                      {selectedConsultation.priority === 'high' ? 'Alta' : 
                       selectedConsultation.priority === 'medium' ? 'Media' : 'Baja'}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Creada</h4>
                    <p>{formatDate(selectedConsultation.createdAt)}</p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Última actualización</h4>
                    <p>{formatDate(selectedConsultation.lastUpdate)}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Mensajes</h4>
                  <p>{selectedConsultation.messages} {selectedConsultation.messages === 1 ? 'mensaje' : 'mensajes'}</p>
                </div>
                {selectedConsultation.isFree && (
                  <div className="bg-green-50 p-3 rounded-md">
                    <p className="text-green-700 text-sm flex items-center">
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Esta consulta es gratuita
                    </p>
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
                {selectedConsultation.status === 'in-progress' && (
                  <Button 
                    onClick={() => {
                      setIsViewModalOpen(false);
                      setReplyMessage('');
                      setIsReplyModalOpen(true);
                    }}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Responder
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Responder Consulta */}
      <Dialog open={isReplyModalOpen} onOpenChange={setIsReplyModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Responder Consulta</DialogTitle>
            <DialogDescription>
              Escribe tu mensaje para el abogado a continuación.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reply">Tu mensaje</Label>
              <Textarea 
                id="reply" 
                placeholder="Escribe tu mensaje aquí..." 
                rows={4}
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsReplyModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSendReply}
              disabled={!replyMessage.trim()}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Enviar respuesta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Editar Consulta */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Editar Consulta</DialogTitle>
            <DialogDescription>
              Realiza los cambios necesarios en tu consulta.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input 
                id="title" 
                placeholder="Título de la consulta" 
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea 
                id="description" 
                placeholder="Describe tu consulta con el mayor detalle posible..." 
                rows={5}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveEdit}
              disabled={!editTitle.trim() || !editDescription.trim()}
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Eliminar Consulta */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>¿Estás seguro de cancelar esta consulta?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. La consulta será eliminada permanentemente.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedConsultation && (
              <div className="bg-gray-50 p-4 rounded-md">
                <h4 className="font-medium">{selectedConsultation.title}</h4>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedConsultation.description.substring(0, 100)}...
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Volver
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDeleteConsultation}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Sí, cancelar consulta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Nueva Consulta */}
      <Dialog open={isNewConsultationOpen} onOpenChange={setIsNewConsultationOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Nueva Consulta Legal</DialogTitle>
            <DialogDescription>
              Completa el formulario para crear una nueva consulta con un abogado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-title">Título <span className="text-red-500">*</span></Label>
              <Input 
                id="new-title" 
                placeholder="Ej: Problema con contrato laboral" 
                value={newConsultation.title}
                onChange={(e) => setNewConsultation({...newConsultation, title: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-description">Descripción detallada <span className="text-red-500">*</span></Label>
              <Textarea 
                id="new-description" 
                placeholder="Describe tu situación con el mayor detalle posible..." 
                rows={5}
                value={newConsultation.description}
                onChange={(e) => setNewConsultation({...newConsultation, description: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-category">Categoría</Label>
                <Input 
                  id="new-category" 
                  placeholder="Ej: Derecho Laboral" 
                  value={newConsultation.category}
                  onChange={(e) => setNewConsultation({...newConsultation, category: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-priority">Prioridad</Label>
                <Select 
                  value={newConsultation.priority}
                  onValueChange={(value) => setNewConsultation({...newConsultation, priority: value as Priority})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una prioridad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baja</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-lawyer">Selecciona un abogado <span className="text-red-500">*</span></Label>
              <Select
                value={newConsultation.lawyerId}
                onValueChange={(value) => setNewConsultation({...newConsultation, lawyerId: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un abogado" />
                </SelectTrigger>
                <SelectContent>
                  {mockLawyers.map((lawyer) => (
                    <SelectItem key={lawyer.id} value={lawyer.id}>
                      <div className="flex items-center">
                        <img 
                          src={lawyer.image} 
                          alt={lawyer.name} 
                          className="h-6 w-6 rounded-full mr-2"
                        />
                        <div>
                          <p className="font-medium">{lawyer.name}</p>
                          <p className="text-xs text-gray-500">{lawyer.specialty} • {formatPrice(lawyer.hourlyRate)}/hora</p>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {consultations.length === 0 && (
              <div className="bg-blue-50 p-3 rounded-md">
                <p className="text-blue-700 text-sm flex items-center">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  ¡Tu primera consulta es gratuita!
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsNewConsultationOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateNewConsultation}
              disabled={!newConsultation.title.trim() || !newConsultation.description.trim() || !newConsultation.lawyerId}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              {consultations.length === 0 ? 'Crear consulta gratis' : 'Crear consulta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
