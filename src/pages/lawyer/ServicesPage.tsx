import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2, X, Clock, DollarSign, CheckCircle, Loader2, FileText, MessageSquare, Calendar, Building2, Scale } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface Service {
  id?: string;
  title: string;
  description: string;
  price_clp: number;
  delivery_time: string; // Asegurando que sea string según el esquema de la base de datos
  features: string[];
  available?: boolean;
  lawyer_user_id?: string;
  created_at?: string;
  updated_at?: string;
}

interface EditingService {
  id: string | null;
  title: string;
  description: string;
  price: string;
  duration: string;
  delivery_days: string;
  features: string;
  available: boolean;
}

export default function ServicesPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  
  // Services state
  const [services, setServices] = useState<Service[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<EditingService>({
    id: null,
    title: '',
    description: '',
    price: '',
    duration: '',
    delivery_days: '',
    features: '',
    available: true
  });

  // Fetch services from Supabase
  useEffect(() => {
    const fetchServices = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('lawyer_services')
          .select('*')
          .eq('lawyer_user_id', user.id)
          .order('created_at', { ascending: true });
          
        if (error) throw error;
        
        setServices(data || []);
      } catch (error) {
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los servicios. Por favor, intenta de nuevo.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchServices();
  }, [user, toast]);
  
  const handleAddService = () => {
    setEditingService({
      id: null,
      title: '',
      description: '',
      price: '',
      duration: '',
      delivery_days: '',
      features: '',
      available: true
    });
    setIsModalOpen(true);
  };
  
  const handleEditService = (service: Service) => {
    // Extraer duración y días de entrega del delivery_time
    const raw = (service.delivery_time || '').trim();
    let parsedDuration = '';
    let parsedDays = '';
    if (raw.includes('|')) {
      const parts = raw.split('|');
      const hoursRaw = (parts[0] || '').trim();
      parsedDuration = hoursRaw !== '' && !isNaN(Number(hoursRaw)) ? hoursRaw : '';
      parsedDays = (parts[1] || '').trim();
    } else {
      // Si no hay pipe: decidir si es horas (numérico o minutos) o días (texto)
      const lower = raw.toLowerCase();
      const isMinutes = lower.includes('min') && !isNaN(Number(lower.replace(/[^0-9]/g, '')));
      const isNumeric = !isNaN(Number(raw));
      if (isNumeric || isMinutes) {
        // tratar como horas
        // si viene en minutos múltiplo de 60 se guarda como su número original; formateo se hace al render
        parsedDuration = raw;
        parsedDays = '';
      } else {
        parsedDuration = '';
        parsedDays = raw;
      }
    }

    setEditingService({
      id: service.id || null,
      title: service.title,
      description: service.description || '',
      price: service.price_clp.toString(),
      duration: parsedDuration,
      delivery_days: parsedDays,
      features: Array.isArray(service.features) ? service.features.join('\n') : '',
      available: service.available !== false
    });
    setIsModalOpen(true);
  };
  
  const handleCancelEdit = () => {
    setEditingService({
      id: null,
      title: '',
      description: '',
      price: '',
      duration: '',
      delivery_days: '',
      features: '',
      available: true
    });
    setIsModalOpen(false);
  };
  
  const handleSaveService = async () => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'Debes iniciar sesión para guardar servicios',
        variant: 'destructive',
      });
      return;
    }

    // Validate form
    if (!editingService.title.trim()) {
      toast({
        title: 'Error',
        description: 'El título del servicio es requerido',
        variant: 'destructive',
      });
      return;
    }

    if (!editingService.description.trim()) {
      toast({
        title: 'Error',
        description: 'La descripción es requerida',
        variant: 'destructive',
      });
      return;
    }

    const price = parseInt(editingService.price);
    const duration = editingService.duration.trim();
    const features = editingService.features
      .split('\n')
      .map(f => f.trim())
      .filter(f => f !== '');

    if (isNaN(price) || price <= 0) {
      toast({
        title: 'Error',
        description: 'El precio debe ser un número mayor a 0',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true);
      
      // Formato: "horas|dias" - usar horas solo si es numérico
      const durationRaw = editingService.duration.trim();
      const numericDuration = durationRaw !== '' && !isNaN(Number(durationRaw)) ? durationRaw : '';
      let delivery_time = '';
      if (numericDuration) {
        delivery_time = [
          numericDuration,
          editingService.delivery_days.trim()
        ].filter(Boolean).join('|');
      } else {
        delivery_time = editingService.delivery_days.trim();
      }

      const serviceData = {
        title: editingService.title.trim(),
        description: editingService.description.trim(),
        price_clp: Number(price),
        delivery_time,
        features,
        available: editingService.available,
        updated_at: new Date().toISOString()
      };
      
      if (editingService.id) {
        // Update existing service
        const { error } = await supabase
          .from('lawyer_services')
          .update(serviceData)
          .eq('id', editingService.id);
          
        if (error) throw error;
        
        // Refrescar la lista completa de servicios
        const { data: updatedServices, error: fetchError } = await supabase
          .from('lawyer_services')
          .select('*')
          .eq('lawyer_user_id', user.id)
          .order('created_at', { ascending: true });
          
        if (fetchError) throw fetchError;
        
        setServices(updatedServices || []);
        
        toast({
          title: '¡Listo!',
          description: 'Servicio actualizado correctamente',
        });
      } else {
        // Add new service
        const newService = {
          ...serviceData,
          lawyer_user_id: user.id,
          created_at: new Date().toISOString(),
          // Asegurando que todos los campos opcionales estén definidos
          available: true,
          features: features || []
        };
        
        const { data, error } = await supabase
          .from('lawyer_services')
          .insert(newService)
          .select()
          .single();
          
        if (error) throw error;
        
        if (data) {
          // Refrescar la lista completa de servicios
          const { data: updatedServices, error: fetchError } = await supabase
            .from('lawyer_services')
            .select('*')
            .eq('lawyer_user_id', user.id)
            .order('created_at', { ascending: true });
            
          if (fetchError) throw fetchError;
          
          setServices(updatedServices || []);
          toast({
            title: '¡Listo!',
            description: 'Servicio agregado correctamente',
          });
        }
      }
      
      handleCancelEdit();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo guardar el servicio. Por favor, intenta de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDeleteClick = (id: string) => {
    setServiceToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteService = async () => {
    if (!serviceToDelete) return;
    
    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('lawyer_services')
        .delete()
        .eq('id', serviceToDelete);
        
      if (error) throw error;
      
      // Refrescar la lista completa de servicios
      const { data: updatedServices, error: fetchError } = await supabase
        .from('lawyer_services')
        .select('*')
        .eq('lawyer_user_id', user?.id)
        .order('created_at', { ascending: true });
        
      if (fetchError) throw fetchError;
      
      setServices(updatedServices || []);
      
      toast({
        title: 'Servicio eliminado',
        description: 'El servicio ha sido eliminado correctamente',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el servicio. Por favor, intenta de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setServiceToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleCancelEdit();
    } else {
      setIsModalOpen(true);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-8 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-4 w-80 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="h-10 w-full sm:w-40 bg-gray-200 rounded-md animate-pulse"></div>
        </div>
        
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-full flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-3/4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col pt-0">
                <div className="space-y-3 mt-2">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 bg-gray-200 rounded-full animate-pulse"></div>
                    <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 bg-gray-200 rounded-full animate-pulse"></div>
                    <div className="h-4 w-40 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                  <div className="pt-2">
                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-2"></div>
                    <div className="space-y-1">
                      {[1, 2, 3].map((_, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="h-4 w-4 bg-gray-200 rounded-full animate-pulse"></div>
                          <div className="h-3 w-48 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-3 w-full">
                  <div className="h-9 w-full bg-gray-200 rounded-md animate-pulse"></div>
                  <div className="h-9 w-full bg-gray-200 rounded-md animate-pulse"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-8 py-6">
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex justify-between items-center">
              <AlertDialogTitle>¿Eliminar servicio?</AlertDialogTitle>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsDeleteDialogOpen(false)}
                className="h-8 w-8 p-0 -mr-2"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Cerrar</span>
              </Button>
            </div>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El servicio será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteService}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                'Eliminar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mis Servicios</h1>
          <p className="text-muted-foreground">
            Gestiona los servicios legales que ofreces a tus clientes
          </p>
        </div>
        <Button onClick={handleAddService} className="gap-2 w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Nuevo Servicio
        </Button>
      </div>
      
      {services.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {services.map((service) => (
            <Card key={service.id} className={`h-full flex flex-col hover:shadow-md transition-shadow border ${service.available === false ? 'opacity-70' : ''} border-gray-200 shadow-sm`}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1 pr-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-50">
                        {service.title.toLowerCase().includes('contrat') ? (
                          <FileText className="h-5 w-5 text-blue-600" />
                        ) : service.title.toLowerCase().includes('consulta') ? (
                          <MessageSquare className="h-5 w-5 text-blue-600" />
                        ) : service.title.toLowerCase().includes('empresarial') ? (
                          <Building2 className="h-5 w-5 text-blue-600" />
                        ) : service.title.toLowerCase().includes('representación') ? (
                          <Scale className="h-5 w-5 text-blue-600" />
                        ) : (
                          <DollarSign className="h-5 w-5 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-lg font-semibold">
                          {service.title}
                        </CardTitle>
                        {service.available === false && (
                          <Badge variant="outline" className="text-xs mt-1 bg-white/80 text-gray-700 border-gray-200 hover:bg-white">
                            No disponible
                          </Badge>
                        )}
                      </div>
                    </div>
                    <CardDescription className="mt-2 text-sm text-gray-600">
                      {service.description}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-blue-600">
                      ${service.price_clp.toLocaleString('es-CL')}
                    </span>
                    <span className="block text-xs text-gray-500">Precio final</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between pt-0">
                <div className="space-y-3 mt-2">
                  {
                    // Parse delivery_time: can be "horas|dias" or only "dias"
                    (() => {
                      const raw = (service.delivery_time || '').trim();
                      const hasPipe = raw.includes('|');
                      const hoursPartRaw = hasPipe ? raw.split('|')[0].trim() : '';
                      let daysRaw = hasPipe ? (raw.split('|')[1]?.trim() || '') : raw;

                      // Hours label
                      let hoursLabel = '';
                      if (hoursPartRaw || !hasPipe) {
                        const candidate = hoursPartRaw || raw;
                        // Support minutes input like "60 min"
                        const minsMatch = candidate.toLowerCase().includes('min')
                          ? Number(candidate.replace(/[^0-9]/g, ''))
                          : NaN;
                        if (!isNaN(minsMatch)) {
                          if (minsMatch >= 60 && minsMatch % 60 === 0) {
                            const h = minsMatch / 60;
                            hoursLabel = `${h} ${h === 1 ? 'hora' : 'horas'}`;
                          } else if (minsMatch > 0) {
                            hoursLabel = `${minsMatch} min`;
                          }
                        } else if (!isNaN(Number(candidate))) {
                          const h = Number(candidate);
                          hoursLabel = `${h} ${h === 1 ? 'hora' : 'horas'}`;
                        }
                      }

                      // Days label
                      let daysLabel = '';
                      if (daysRaw) {
                        // If single-part looked like hours, don't show days
                        if (!hasPipe && hoursLabel) {
                          daysRaw = '';
                        }
                        const lower = daysRaw.toLowerCase();
                        if (lower === 'variable') {
                          daysLabel = 'variable';
                        } else if(/^\d+$/.test(daysRaw)) {
                          const d = Number(daysRaw);
                          if (d % 7 === 0) {
                            const w = d / 7;
                            daysLabel = `${w} ${w === 1 ? 'semana' : 'semanas'}`;
                          } else {
                            daysLabel = `${d} ${d === 1 ? 'día' : 'días'}`;
                          }
                        } else {
                          // ranges/text like "2 - 3": append ' días'
                          const rangePattern = /^\d+\s*-\s*\d+$/;
                          daysLabel = rangePattern.test(daysRaw) ? `${daysRaw} días` : daysRaw;
                        }
                      }
                      return (
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                          {hoursLabel && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              <span>{hoursLabel}</span>
                            </div>
                          )}
                          {daysLabel && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>Entrega: {daysLabel}</span>
                            </div>
                          )}
                        </div>
                      );
                    })()
                  }
                  {service.features && service.features.length > 0 && (
                    <div className="pt-2">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Incluye:</p>
                      <ul className="space-y-1">
                        {service.features.map((feature, index) => (
                          <li key={index} className="flex items-start text-sm text-muted-foreground">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 mr-1.5 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-3 w-full">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleEditService(service)}
                    className="gap-1.5 w-full px-4 py-2 h-9"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDeleteClick(service.id!)}
                    className="text-red-500 hover:bg-red-50 hover:text-red-600 gap-1.5 w-full px-4 py-2 h-9"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Eliminar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Plus className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-1">No hay servicios</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Aún no has agregado ningún servicio. Comienza ofreciendo tu primer servicio a los clientes.
          </p>
          <Button onClick={handleAddService} className="gap-2 w-full max-w-xs mx-auto py-2">
            <Plus className="h-4 w-4" />
            Nuevo Servicio
          </Button>
        </div>
      )}

      {/* Add/Edit Service Modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => !open && handleCancelEdit()}>
        <DialogContent className="sm:max-w-[600px] max-h-[100vh] flex flex-col aria-describedby:dialog-description">
          <DialogHeader>
            <DialogTitle>
              {editingService.id ? 'Editar Servicio' : 'Nuevo Servicio'}
            </DialogTitle>
            <p id="dialog-description" className="sr-only">
              {editingService.id ? 'Formulario para editar un servicio existente' : 'Formulario para agregar un nuevo servicio'}
            </p>
          </DialogHeader>
          
          <div className="grid gap-4 py-4 overflow-y-auto flex-1">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <Label htmlFor="available" className="text-sm font-medium text-gray-700">
                Disponible para contratación
              </Label>
              <button
                type="button"
                onClick={() => setEditingService({...editingService, available: !editingService.available})}
                className={`relative inline-flex h-6 w-11 items-center rounded-full ${editingService.available ? 'bg-blue-600' : 'bg-gray-200'}`}
              >
                <span className="sr-only">Disponible</span>
                <span
                  className={`${editingService.available ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition`}
                />
              </button>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="title">Título del Servicio</Label>
              <Input
                id="title"
                placeholder="Ej: Asesoría Legal Inicial"
                value={editingService.title}
                onChange={(e) => setEditingService({...editingService, title: e.target.value})}
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                placeholder="Descripción detallada del servicio"
                value={editingService.description}
                onChange={(e) => setEditingService({...editingService, description: e.target.value})}
                disabled={isLoading}
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Precio (CLP)</Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="Ej: 50000"
                  value={editingService.price}
                  onChange={(e) => setEditingService({...editingService, price: e.target.value})}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duración (horas)</Label>
                <Input
                  id="duration"
                  type="number"
                  placeholder="Ej: 1"
                  value={editingService.duration}
                  onChange={(e) => setEditingService({...editingService, duration: e.target.value})}
                  disabled={isLoading}
                  min="0.5"
                  step="0.5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="delivery_days">Tiempo de entrega (días)</Label>
                <Input
                  id="delivery_days"
                  type="text"
                  placeholder="Ej: 3 o 'variable'"
                  value={editingService.delivery_days}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow any text input
                    setEditingService({...editingService, delivery_days: value});
                  }}
                  disabled={isLoading}
                  className="lowercase"
                />
                <p className="text-xs text-muted-foreground">
                  Ingresa un número de días o escribe 'variable'
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="features">Características (una por línea)</Label>
              <Textarea
                id="features"
                placeholder="Incluye las características principales del servicio, una por línea"
                value={editingService.features}
                onChange={(e) => setEditingService({...editingService, features: e.target.value})}
                disabled={isLoading}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Cada línea se convertirá en un elemento de la lista de características.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={handleCancelEdit}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveService}
              disabled={isLoading}
              className="mb-4"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {editingService.id ? 'Guardando...' : 'Agregando...'}
                </>
              ) : editingService.id ? (
                'Guardar Cambios'
              ) : (
                'Agregar Servicio'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
