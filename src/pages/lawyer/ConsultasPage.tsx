import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Clock, User, MapPin, Mail, Phone, X, Check, Plus, Search as SearchIcon } from 'lucide-react';

// UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Interface for consultation data
interface Consulta {
  id: number;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  service: string;
  date: Date;
  duration: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  notes?: string;
}

export default function ConsultasPage() {
  // State for consultations and UI
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [selectedConsulta, setSelectedConsulta] = useState<Consulta | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch consultations
  useEffect(() => {
    // Mock data - replace with actual API call
    const mockConsultas: Consulta[] = [
      {
        id: 1,
        clientName: 'Juan Pérez',
        clientEmail: 'juan@example.com',
        clientPhone: '+56912345678',
        service: 'Asesoría Legal Inicial',
        date: new Date(2023, 5, 15, 10, 0),
        duration: 60,
        status: 'pending',
        notes: 'Cliente nuevo, necesita asesoría sobre contrato de arriendo.'
      },
      // Add more mock data as needed
    ];

    setConsultas(mockConsultas);
  }, []);

  // Filter consultations by status and search query
  const filteredConsultas = (status: Consulta['status']) => {
    return consultas.filter(consulta => {
      const matchesStatus = consulta.status === status;
      const matchesSearch = 
        consulta.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        consulta.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
        consulta.clientEmail.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesStatus && (searchQuery === '' || matchesSearch);
    });
  };

  // Handle status change
  const handleStatusChange = (id: number, newStatus: Consulta['status']) => {
    setConsultas(prev => 
      prev.map(consulta => 
        consulta.id === id ? { ...consulta, status: newStatus } : consulta
      )
    );
  };

  // Get status label in Spanish
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'pendientes';
      case 'confirmed': return 'confirmadas';
      case 'completed': return 'completadas';
      case 'cancelled': return 'canceladas';
      default: return status;
    }
  };

  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Consultas</h2>
          <p className="text-muted-foreground">
            Gestiona las consultas de tus clientes
          </p>
        </div>
        
        <div className="w-full md:w-auto">
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar consultas..."
              className="w-full md:w-[300px] pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Pendientes</TabsTrigger>
          <TabsTrigger value="confirmed">Confirmadas</TabsTrigger>
          <TabsTrigger value="completed">Completadas</TabsTrigger>
          <TabsTrigger value="cancelled">Canceladas</TabsTrigger>
        </TabsList>

        {['pending', 'confirmed', 'completed', 'cancelled'].map((status) => (
          <TabsContent key={status} value={status} className="space-y-4">
            {filteredConsultas(status as Consulta['status']).length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  {`No hay consultas ${getStatusLabel(status)}`}
                </CardContent>
              </Card>
            ) : (
              filteredConsultas(status as Consulta['status']).map((consulta) => (
                <ConsultaCard 
                  key={consulta.id}
                  consulta={consulta}
                  onStatusChange={handleStatusChange}
                  onSelect={setSelectedConsulta}
                />
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>
      
      {/* Consultation Detail Modal */}
      {selectedConsulta && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold">{selectedConsulta.service}</h3>
                  <p className="text-muted-foreground">Consulta con {selectedConsulta.clientName}</p>
                </div>
                <button 
                  onClick={() => setSelectedConsulta(null)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <h4 className="font-medium">Detalles de la cita</h4>
                  <div className="flex items-center space-x-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{format(selectedConsulta.date, 'EEEE d MMMM yyyy', { locale: es })}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{format(selectedConsulta.date, 'HH:mm')} - {format(new Date(selectedConsulta.date.getTime() + selectedConsulta.duration * 60000), 'HH:mm')}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedConsulta.clientName}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${selectedConsulta.clientEmail}`} className="text-primary hover:underline">
                      {selectedConsulta.clientEmail}
                    </a>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${selectedConsulta.clientPhone}`} className="text-primary hover:underline">
                      {selectedConsulta.clientPhone}
                    </a>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Notas</h4>
                    <div className="bg-muted/50 p-3 rounded-md text-sm">
                      {selectedConsulta.notes || 'No hay notas adicionales.'}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Estado</h4>
                    <Badge 
                      variant={
                        selectedConsulta.status === 'completed' ? 'default' :
                        selectedConsulta.status === 'confirmed' ? 'secondary' :
                        selectedConsulta.status === 'cancelled' ? 'destructive' : 'outline'
                      }
                    >
                      {getStatusLabel(selectedConsulta.status)}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedConsulta(null)}
                >
                  Cerrar
                </Button>
                {selectedConsulta.status === 'pending' && (
                  <>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        handleStatusChange(selectedConsulta.id, 'cancelled');
                        setSelectedConsulta(null);
                      }}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      Cancelar Consulta
                    </Button>
                    <Button 
                      onClick={() => {
                        handleStatusChange(selectedConsulta.id, 'confirmed');
                        setSelectedConsulta(null);
                      }}
                    >
                      Confirmar Consulta
                    </Button>
                  </>
                )}
                {selectedConsulta.status === 'confirmed' && (
                  <Button 
                    onClick={() => {
                      handleStatusChange(selectedConsulta.id, 'completed');
                      setSelectedConsulta(null);
                    }}
                  >
                    Marcar como Completada
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ConsultaCardProps {
  consulta: Consulta;
  onStatusChange: (id: number, status: 'pending' | 'confirmed' | 'cancelled' | 'completed') => void;
  onSelect: (consulta: Consulta) => void;
}

function ConsultaCard({ consulta, onStatusChange, onSelect }: ConsultaCardProps) {
  const formatTime = (date: Date) => format(date, 'HH:mm');
  const formatDate = (date: Date) => format(date, 'd MMM', { locale: es });
  
  return (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onSelect(consulta)}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h4 className="font-medium">{consulta.service}</h4>
            <div className="flex items-center text-sm text-muted-foreground">
              <User className="h-4 w-4 mr-1" />
              {consulta.clientName}
            </div>
            <div className="flex items-center text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 mr-1" />
              {formatDate(consulta.date)} • {formatTime(consulta.date)}
            </div>
          </div>
          <Badge 
            variant={
              consulta.status === 'completed' ? 'default' :
              consulta.status === 'confirmed' ? 'secondary' :
              consulta.status === 'cancelled' ? 'destructive' : 'outline'
            }
            className="ml-2"
          >
            {consulta.status === 'pending' ? 'Pendiente' :
             consulta.status === 'confirmed' ? 'Confirmada' :
             consulta.status === 'completed' ? 'Completada' : 'Cancelada'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
