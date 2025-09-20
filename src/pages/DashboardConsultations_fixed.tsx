import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { 
  Search, 
  MessageSquare, 
  Clock, 
  DollarSign, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  MessageCircle, 
  Edit2, 
  Trash2, 
  Plus,
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
  updatedAt: string;
  messages: number;
  price: number | null;
  isFirstConsultation: boolean;
}

const mockLawyers: Lawyer[] = [
  {
    id: '1',
    name: 'Juan Pérez',
    specialty: 'Derecho Laboral',
    hourlyRate: 45000,
    image: '/placeholder-lawyer.jpg'
  },
  {
    id: '2',
    name: 'María González',
    specialty: 'Derecho de Familia',
    hourlyRate: 50000,
    image: '/placeholder-lawyer.jpg'
  },
  {
    id: '3',
    name: 'Carlos Rodríguez',
    specialty: 'Derecho Civil',
    hourlyRate: 40000,
    image: '/placeholder-lawyer.jpg'
  },
];

const mockConsultations: Consultation[] = [
  {
    id: '1',
    title: 'Despido injustificado',
    description: 'Me despidieron sin justa causa después de 3 años de trabajo',
    status: 'pending',
    priority: 'high',
    lawyerId: '1',
    lawyerName: 'Juan Pérez',
    lawyerSpecialty: 'Derecho Laboral',
    createdAt: '2023-05-10T10:30:00Z',
    updatedAt: '2023-05-10T10:30:00Z',
    messages: 3,
    price: 45000,
    isFirstConsultation: false
  },
  {
    id: '2',
    title: 'Pensión de alimentos',
    description: 'Necesito asesoría sobre pensión de alimentos para mis dos hijos',
    status: 'in-progress',
    priority: 'medium',
    lawyerId: '2',
    lawyerName: 'María González',
    lawyerSpecialty: 'Derecho de Familia',
    createdAt: '2023-05-08T14:15:00Z',
    updatedAt: '2023-05-09T11:20:00Z',
    messages: 5,
    price: null,
    isFirstConsultation: true
  },
];

export default function DashboardConsultations() {
  const { toast } = useToast();
  const [consultations, setConsultations] = useState<Consultation[]>(mockConsultations);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ConsultationStatus | 'all'>('all');
  const [isNewConsultationOpen, setIsNewConsultationOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories] = useState([
    'Derecho Laboral',
    'Derecho de Familia',
    'Derecho Civil',
    'Derecho Comercial',
    'Derecho de Propiedad Intelectual'
  ]);

  const [newConsultation, setNewConsultation] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'medium' as Priority,
    lawyerId: ''
  });

  const filteredConsultations = useCallback(() => {
    return consultations.filter(consultation => {
      const matchesSearch = consultation.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         consultation.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || consultation.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [consultations, searchTerm, statusFilter]);

  const handleCreateNewConsultation = () => {
    if (!newConsultation.title.trim() || !newConsultation.description.trim() || !newConsultation.lawyerId) {
      toast({
        title: 'Error',
        description: 'Por favor completa todos los campos obligatorios',
        variant: 'destructive',
      });
      return;
    }

    const newConsult: Consultation = {
      id: `consult-${Date.now()}`,
      title: newConsultation.title,
      description: newConsultation.description,
      status: 'pending',
      priority: newConsultation.priority,
      lawyerId: newConsultation.lawyerId,
      lawyerName: mockLawyers.find(l => l.id === newConsultation.lawyerId)?.name || 'Abogado',
      lawyerSpecialty: mockLawyers.find(l => l.id === newConsultation.lawyerId)?.specialty || 'General',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: 0,
      price: 0,
      isFirstConsultation: !consultations.some(c => c.lawyerId === newConsultation.lawyerId)
    };

    setConsultations([newConsult, ...consultations]);
    setNewConsultation({
      title: '',
      description: '',
      category: '',
      priority: 'medium',
      lawyerId: ''
    });
    setSelectedCategory('');
    setIsNewConsultationOpen(false);

    toast({
      title: 'Consulta creada',
      description: 'Tu consulta ha sido creada exitosamente',
    });
  };

  const handleDeleteConsultation = () => {
    if (!selectedConsultation) return;
    
    setConsultations(consultations.filter(c => c.id !== selectedConsultation.id));
    setIsDeleteModalOpen(false);
    
    toast({
      title: 'Consulta eliminada',
      description: 'La consulta ha sido eliminada correctamente',
    });
  };

  const getStatusColor = (status: ConsultationStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: ConsultationStatus) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-3.5 w-3.5" />;
      case 'in-progress':
        return <AlertCircle className="h-3.5 w-3.5" />;
      case 'resolved':
        return <CheckCircle2 className="h-3.5 w-3.5" />;
      case 'rejected':
        return <XCircle className="h-3.5 w-3.5" />;
      default:
        return <Clock className="h-3.5 w-3.5" />;
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

  const formatPrice = (price: number | null) => {
    if (price === null) return 'Gratis';
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
                        <h3 className="text-lg font-semibold text-gray-900">{consultation.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{consultation.lawyerName} • {consultation.lawyerSpecialty}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`${getPriorityColor(consultation.priority)} flex items-center gap-1`}>
                          {consultation.priority === 'high' ? 'Alta' : consultation.priority === 'medium' ? 'Media' : 'Baja'}
                        </Badge>
                        <Badge className={`${getStatusColor(consultation.status)} flex items-center gap-1`}>
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

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-gray-100">
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-4 w-4" />
                          {consultation.messages} {consultation.messages === 1 ? 'mensaje' : 'mensajes'}
                        </span>
                        <span>•</span>
                        <span>Última actualización: {formatDate(consultation.updatedAt)}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {consultation.isFirstConsultation ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            Gratis
                          </Badge>
                        ) : (
                          <span className="text-sm font-medium text-gray-900">
                            {formatPrice(consultation.price)}
                          </span>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="ml-2"
                          onClick={() => {
                            setSelectedConsultation(consultation);
                            setIsViewModalOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver detalles
                        </Button>
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
                <Plus className="h-4 w-4 mr-2" />
                Crear consulta
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Modal de nueva consulta */}
      <Dialog open={isNewConsultationOpen} onOpenChange={setIsNewConsultationOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Nueva Consulta Legal</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título de la consulta</Label>
              <Input 
                id="title" 
                placeholder="Ej: Despido injustificado" 
                value={newConsultation.title}
                onChange={(e) => setNewConsultation({...newConsultation, title: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Descripción detallada</Label>
              <Textarea 
                id="description" 
                placeholder="Describe tu situación legal con el mayor detalle posible..." 
                rows={5}
                value={newConsultation.description}
                onChange={(e) => setNewConsultation({...newConsultation, description: e.target.value})}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Área de derecho</Label>
                <Select 
                  value={selectedCategory} 
                  onValueChange={(value) => {
                    setSelectedCategory(value);
                    setNewConsultation(prev => ({...prev, category: value, lawyerId: ''}));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un área" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Prioridad</Label>
                <Select 
                  value={newConsultation.priority} 
                  onValueChange={(value) => setNewConsultation({...newConsultation, priority: value as Priority})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona prioridad" />
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
              <Label>Seleccionar abogado</Label>
              <Select 
                value={newConsultation.lawyerId} 
                onValueChange={(value) => setNewConsultation({...newConsultation, lawyerId: value})}
                disabled={!selectedCategory}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedCategory ? "Selecciona un abogado" : "Primero selecciona un área"} />
                </SelectTrigger>
                <SelectContent>
                  {selectedCategory ? (
                    mockLawyers
                      .filter(lawyer => lawyer.specialty === selectedCategory)
                      .map((lawyer) => (
                        <SelectItem key={lawyer.id} value={lawyer.id}>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                              {lawyer.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium">{lawyer.name}</p>
                              <p className="text-xs text-muted-foreground">{lawyer.specialty}</p>
                            </div>
                            <div className="ml-auto">
                              <p className="text-sm font-medium">${lawyer.hourlyRate.toLocaleString()}/hora</p>
                            </div>
                          </div>
                        </SelectItem>
                      ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-gray-500">
                      Selecciona un área de derecho para ver abogados disponibles
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsNewConsultationOpen(false);
                setSelectedCategory('');
                setNewConsultation({ 
                  title: '', 
                  description: '', 
                  category: '', 
                  priority: 'medium', 
                  lawyerId: '' 
                });
              }}
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

      {/* Modal de vista de consulta */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          {selectedConsultation && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedConsultation.title}</DialogTitle>
                <div className="flex items-center gap-2 pt-2">
                  <Badge className={getStatusColor(selectedConsultation.status)}>
                    {selectedConsultation.status === 'pending' ? 'Pendiente' : 
                     selectedConsultation.status === 'in-progress' ? 'En progreso' : 
                     selectedConsultation.status === 'resolved' ? 'Resuelto' : 'Rechazado'}
                  </Badge>
                  <Badge variant="outline" className={getPriorityColor(selectedConsultation.priority)}>
                    {selectedConsultation.priority === 'high' ? 'Alta prioridad' : 
                     selectedConsultation.priority === 'medium' ? 'Prioridad media' : 'Baja prioridad'}
                  </Badge>
                </div>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Descripción</h4>
                  <p className="text-gray-700">{selectedConsultation.description}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Abogado</h4>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                        {selectedConsultation.lawyerName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium">{selectedConsultation.lawyerName}</p>
                        <p className="text-sm text-muted-foreground">{selectedConsultation.lawyerSpecialty}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Información</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Creada:</span>
                        <span>{formatDate(selectedConsultation.createdAt)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Última actualización:</span>
                        <span>{formatDate(selectedConsultation.updatedAt)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Mensajes:</span>
                        <span>{selectedConsultation.messages}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Precio:</span>
                        <span className="font-medium">
                          {selectedConsultation.isFirstConsultation 
                            ? <Badge variant="secondary">Gratis</Badge> 
                            : formatPrice(selectedConsultation.price)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">Mensajes</h4>
                  <div className="border rounded-lg p-4 h-48 overflow-y-auto">
                    {selectedConsultation.messages > 0 ? (
                      <div className="space-y-4">
                        <div className="flex justify-end">
                          <div className="bg-blue-50 rounded-lg p-3 max-w-[80%]">
                            <p className="text-sm">Hola, gracias por tu consulta. Estoy revisando los detalles.</p>
                            <p className="text-xs text-muted-foreground text-right mt-1">
                              {formatDate(new Date(Date.now() - 3600000).toISOString())}
                            </p>
                          </div>
                        </div>
                        <div className="flex">
                          <div className="bg-gray-50 rounded-lg p-3 max-w-[80%]">
                            <p className="text-sm">¡Gracias! Espero tu respuesta.</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDate(new Date().toISOString())}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center p-4 text-muted-foreground">
                        <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
                        <p className="text-sm">Aún no hay mensajes en esta consulta</p>
                        <p className="text-xs mt-1">Envía un mensaje para iniciar la conversación</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Input placeholder="Escribe tu mensaje..." />
                    <Button>Enviar</Button>
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsDeleteModalOpen(true);
                    setIsViewModalOpen(false);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar consulta
                </Button>
                <Button 
                  onClick={() => {
                    // Lógica para marcar como resuelta
                    const updatedConsultations = consultations.map(c => 
                      c.id === selectedConsultation.id 
                        ? {...c, status: 'resolved', updatedAt: new Date().toISOString()}
                        : c
                    );
                    setConsultations(updatedConsultations);
                    setIsViewModalOpen(false);
                    
                    toast({
                      title: 'Consulta marcada como resuelta',
                      description: 'La consulta ha sido marcada como resuelta exitosamente',
                    });
                  }}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Marcar como resuelta
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de confirmación de eliminación */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>¿Eliminar consulta?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. ¿Estás seguro de que deseas eliminar esta consulta?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteConsultation}>
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
