import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Clock, User, Mail, Phone, X, Check, Search as SearchIcon } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';

// UI Components
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';

// Interface for consultation data
interface Consulta {
  id: string;
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
  const { user } = useAuth();
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [selectedConsulta, setSelectedConsulta] = useState<Consulta | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Fetch consultations from the database
  const fetchConsultations = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('consultations')
        .select(`
          id,
          title,
          description,
          status,
          created_at,
          price,
          client:profiles!consultations_client_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .eq('lawyer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to match our UI interface
      const formattedConsultas: Consulta[] = (data || []).map((consultation: any) => ({
        id: consultation.id,
        clientName: `${consultation.client?.first_name || ''} ${consultation.client?.last_name || ''}`.trim() || 'Cliente',
        clientEmail: consultation.client?.email || '',
        clientPhone: consultation.client?.phone || '',
        service: consultation.title || 'Consulta Legal',
        date: new Date(consultation.created_at),
        duration: 30, // Default duration
        status: consultation.status === 'pending' ? 'pending' : 
                consultation.status === 'completed' ? 'completed' : 
                consultation.status === 'cancelled' ? 'cancelled' : 'confirmed',
        notes: consultation.description
      }));

      setConsultas(formattedConsultas);
    } catch (error) {
      console.error('Error fetching consultations:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las consultas. Por favor, inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConsultations();
  }, [user?.id]);

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
  const handleStatusChange = async (id: string, newStatus: Consulta['status']) => {
    try {
      const { error } = await supabase
        .from('consultations')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      // Update local state
      setConsultas(prev => 
        prev.map(consulta => 
          consulta.id === id ? { ...consulta, status: newStatus } : consulta
        )
      );

      // Update selected consulta if it's the one being updated
      if (selectedConsulta?.id === id) {
        setSelectedConsulta(prev => prev ? { ...prev, status: newStatus } : null);
      }

      toast({
        title: 'Estado actualizado',
        description: `La consulta ha sido marcada como ${getStatusLabel(newStatus)}`,
      });
    } catch (error) {
      console.error('Error updating consultation status:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el estado de la consulta. Por favor, inténtalo de nuevo.',
        variant: 'destructive',
      });
    }
  };

  // Get status label in Spanish
  const getStatusLabel = (status: string, capitalize = false) => {
    let label = '';
    switch (status) {
      case 'pending': label = 'pendiente'; break;
      case 'confirmed': label = 'confirmada'; break;
      case 'completed': label = 'completada'; break;
      case 'cancelled': label = 'cancelada'; break;
      default: label = status;
    }
    return capitalize ? label.charAt(0).toUpperCase() + label.slice(1) : label;
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
            <SearchIcon className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
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
        
        {isLoading && (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        )}

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
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
