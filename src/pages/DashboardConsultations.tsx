import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { PaymentForm } from '@/components/PaymentForm';
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
  Eye,
  Send,
  Save,
  Loader2
} from 'lucide-react';

const CONSULTATION_STATUS = ['pending', 'in-progress', 'resolved', 'rejected'] as const;
type ConsultationStatus = typeof CONSULTATION_STATUS[number];

const PRIORITY_LEVELS = ['low', 'medium', 'high'] as const;
type Priority = typeof PRIORITY_LEVELS[number];

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

// Utility function to ensure a string is a valid ConsultationStatus
function ensureConsultationStatus(status: string): ConsultationStatus {
  if (CONSULTATION_STATUS.includes(status as ConsultationStatus)) {
    return status as ConsultationStatus;
  }
  return 'pending';
}

// Utility function to ensure a string is a valid Priority
function ensurePriority(priority: string): Priority {
  if (PRIORITY_LEVELS.includes(priority as Priority)) {
    return priority as Priority;
  }
  return 'medium';
}

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
  paymentIntentId?: string;
}

// Mock data
const mockLawyers: Lawyer[] = [
  {
    id: '1',
    name: 'Juan Pérez',
    specialty: 'Derecho Laboral',
    hourlyRate: 50000,
    image: '/lawyers/juan-perez.jpg'
  },
  {
    id: '2',
    name: 'María González',
    specialty: 'Derecho de Familia',
    hourlyRate: 60000,
    image: '/lawyers/maria-gonzalez.jpg'
  },
  // Add more mock lawyers as needed
];

const mockConsultations: Omit<Consultation, 'status' | 'priority' | 'isFirstConsultation'>[] = [
  {
    id: '1',
    title: 'Consulta sobre contrato laboral',
    description: 'Necesito asesoría sobre un despido injustificado',
    lawyerId: '1',
    lawyerName: 'Juan Pérez',
    lawyerSpecialty: 'Derecho Laboral',
    createdAt: '2023-10-01T10:00:00Z',
    updatedAt: '2023-10-01T10:00:00Z',
    messages: 3,
    price: 50000
  },
  // Add more mock consultations as needed
];

const stripePromise = loadStripe(import.meta.env.VITE_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

export default function DashboardConsultations() {
  const { toast } = useToast();
  
  // State
  const [consultations, setConsultations] = useState<Consultation[]>(() => {
    return mockConsultations.map(consultation => ({
      ...consultation,
      status: ensureConsultationStatus('pending'),
      priority: ensurePriority('medium'),
      isFirstConsultation: false
    }));
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ConsultationStatus | 'all'>('all');
  const [isNewConsultationOpen, setIsNewConsultationOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [selectedLawyer, setSelectedLawyer] = useState<Lawyer | null>(null);
  
  const [newConsultation, setNewConsultation] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'medium' as Priority,
    lawyerId: ''
  });

  const categories = Array.from(new Set(mockLawyers.map(lawyer => lawyer.specialty))).sort();

  // Filter consultations based on search term and status
  const filteredConsultations = useCallback(() => {
    return consultations.filter(consultation => {
      const matchesSearch = 
        consultation.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        consultation.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || consultation.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [consultations, searchTerm, statusFilter]);

  // Handle payment success
  const handlePaymentSuccess = async (paymentIntentId: string) => {
    try {
      // Create the consultation after successful payment
      await createConsultation(paymentIntentId);
      setShowPaymentForm(false);
      
      toast({
        title: '¡Pago exitoso!',
        description: 'Tu consulta ha sido creada exitosamente.',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al crear la consulta';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  // Create a new consultation
  const createConsultation = async (paymentIntentId?: string) => {
    if (!selectedLawyer) {
      throw new Error('No se pudo encontrar el abogado seleccionado');
    }

    const isFirstConsultation = consultations.length === 0;
    const consultationPrice = isFirstConsultation ? 0 : selectedLawyer.hourlyRate;

    const newConsultationObj: Consultation = {
      id: `cons_${Date.now()}`,
      title: newConsultation.title,
      description: newConsultation.description,
      status: 'pending',
      priority: newConsultation.priority,
      lawyerId: selectedLawyer.id,
      lawyerName: selectedLawyer.name,
      lawyerSpecialty: selectedLawyer.specialty,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: 0,
      price: consultationPrice,
      isFirstConsultation,
      paymentIntentId
    };

    setConsultations([newConsultationObj, ...consultations]);
    
    // Reset form
    setNewConsultation({
      title: '',
      description: '',
      category: '',
      priority: 'medium',
      lawyerId: ''
    });
    
    setSelectedCategory('');
    setSelectedLawyer(null);
    setIsNewConsultationOpen(false);
  };

  // Handle creating a new consultation
  const handleCreateNewConsultation = async () => {
    if (!newConsultation.title.trim() || !newConsultation.description.trim() || !newConsultation.lawyerId) {
      toast({
        title: 'Error',
        description: 'Por favor completa todos los campos obligatorios',
        variant: 'destructive',
      });
      return;
    }
    
    const lawyer = mockLawyers.find(l => l.id === newConsultation.lawyerId);
    if (!lawyer) {
      toast({
        title: 'Error',
        description: 'No se pudo encontrar el abogado seleccionado',
        variant: 'destructive',
      });
      return;
    }

    setSelectedLawyer(lawyer);
    
    // First consultation is free
    const isFirstConsultation = consultations.length === 0;
    
    if (isFirstConsultation) {
      await createConsultation();
      toast({
        title: '¡Consulta creada!',
        description: 'Tu primera consulta ha sido creada exitosamente.',
      });
    } else {
      // Show payment form for non-first consultations
      setPaymentAmount(lawyer.hourlyRate);
      setShowPaymentForm(true);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status badge color
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

  // Get priority badge color
  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 border-red-200';
      case 'medium':
        return 'text-yellow-600 border-yellow-200';
      case 'low':
        return 'text-green-600 border-green-200';
      default:
        return 'text-gray-600 border-gray-200';
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mis Consultas</h1>
          <p className="text-muted-foreground">
            Gestiona tus consultas legales y comunicación con abogados
          </p>
        </div>
        <Button 
          onClick={() => setIsNewConsultationOpen(true)}
          className="mt-4 md:mt-0"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva Consulta
        </Button>
      </div>

      {/* Search and filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar consultas..."
            className="w-full pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as ConsultationStatus | 'all')}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendiente</SelectItem>
            <SelectItem value="in-progress">En progreso</SelectItem>
            <SelectItem value="resolved">Resuelto</SelectItem>
            <SelectItem value="rejected">Rechazado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Consultations list */}
      <div className="grid gap-4">
        {filteredConsultations().length > 0 ? (
          filteredConsultations().map((consultation) => (
            <Card key={consultation.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{consultation.title}</h3>
                      <Badge className={getStatusColor(consultation.status)}>
                        {consultation.status === 'pending' ? 'Pendiente' :
                         consultation.status === 'in-progress' ? 'En progreso' :
                         consultation.status === 'resolved' ? 'Resuelto' : 'Rechazado'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {consultation.description.length > 100 
                        ? `${consultation.description.substring(0, 100)}...` 
                        : consultation.description}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <div className="flex items-center text-muted-foreground">
                        <MessageCircle className="h-4 w-4 mr-1" />
                        {consultation.messages} mensajes
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <Clock className="h-4 w-4 mr-1" />
                        {formatDate(consultation.updatedAt)}
                      </div>
                      {consultation.price !== null && (
                        <div className="flex items-center text-muted-foreground">
                          <DollarSign className="h-4 w-4 mr-1" />
                          ${consultation.price.toLocaleString('es-CL')}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedConsultation(consultation);
                        setIsViewModalOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" /> Ver
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-12">
            <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay consultas</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Comienza creando una nueva consulta.
            </p>
            <div className="mt-6">
              <Button onClick={() => setIsNewConsultationOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Consulta
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* New Consultation Dialog */}
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
                <Label>Especialidades</Label>
                <Select 
                  value={selectedCategory}
                  onValueChange={(value) => {
                    setSelectedCategory(value);
                    // Reset lawyer when category changes
                    setNewConsultation(prev => ({ ...prev, lawyerId: '' }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una especialidad" />
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
                  onValueChange={(value) => 
                    setNewConsultation({...newConsultation, priority: value as Priority})
                  }
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
                onValueChange={(value) => 
                  setNewConsultation({...newConsultation, lawyerId: value})
                }
                disabled={!selectedCategory}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedCategory ? "Selecciona un abogado" : "Primero selecciona una especialidad"} />
                </SelectTrigger>
                <SelectContent>
                  {selectedCategory ? (
                    mockLawyers
                      .filter(lawyer => lawyer.specialty === selectedCategory)
                      .map((lawyer) => (
                        <SelectItem key={lawyer.id} value={lawyer.id}>
                          <div className="flex items-center gap-3 w-full">
                            <div className="h-8 w-8 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center text-sm font-medium">
                              {lawyer.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                              <p className="font-medium truncate">{lawyer.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{lawyer.specialty}</p>
                            </div>
                            <div className="whitespace-nowrap ml-2">
                              <p className="text-sm font-medium">${lawyer.hourlyRate.toLocaleString('es-CL')}/hora</p>
                            </div>
                          </div>
                        </SelectItem>
                      ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-gray-500">
                      Selecciona una especialidad para ver abogados disponibles
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
              disabled={
                !newConsultation.title.trim() || 
                !newConsultation.description.trim() || 
                !newConsultation.lawyerId ||
                isProcessingPayment
              }
            >
              {isProcessingPayment ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : consultations.length === 0 ? (
                'Crear consulta gratis'
              ) : (
                `Pagar $${mockLawyers.find(l => l.id === newConsultation.lawyerId)?.hourlyRate.toLocaleString('es-CL')}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={showPaymentForm} onOpenChange={setShowPaymentForm}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Pagar por la consulta</DialogTitle>
            <DialogDescription>
              Por favor ingresa los datos de tu tarjeta para continuar con el pago.
            </DialogDescription>
          </DialogHeader>
          
          <Elements stripe={stripePromise}>
            <PaymentForm 
              amount={paymentAmount}
              onSuccess={handlePaymentSuccess}
              onError={(error) => {
                toast({
                  title: 'Error en el pago',
                  description: error,
                  variant: 'destructive',
                });
              }}
            />
          </Elements>
        </DialogContent>
      </Dialog>

      {/* View Consultation Dialog */}
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
                      {selectedConsultation.price !== null && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Precio:</span>
                          <span>${selectedConsultation.price.toLocaleString('es-CL')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Mensajes</h4>
                  <div className="space-y-4">
                    {selectedConsultation.messages > 0 ? (
                      <div className="text-sm text-muted-foreground">
                        {selectedConsultation.messages} mensajes en esta conversación.
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        No hay mensajes en esta conversación todavía.
                      </div>
                    )}
                    
                    <div className="flex gap-2 mt-4">
                      <Input 
                        placeholder="Escribe tu mensaje..." 
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                      />
                      <Button>
                        <Send className="h-4 w-4 mr-2" /> Enviar
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
                  Cerrar
                </Button>
                <Button>
                  <MessageSquare className="h-4 w-4 mr-2" /> Enviar mensaje
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
