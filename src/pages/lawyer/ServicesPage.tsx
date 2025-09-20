import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2, X, Clock, DollarSign } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';

interface Service {
  id: number;
  name: string;
  description: string;
  price: number;
  duration: number;
}

export default function ServicesPage() {
  const { toast } = useToast();
  
  // Services state with localStorage persistence
  const [services, setServices] = useState<Service[]>(() => {
    if (typeof window !== 'undefined') {
      const savedServices = localStorage.getItem('lawyerServices');
      return savedServices ? JSON.parse(savedServices) : getDefaultServices();
    }
    return [];
  });

  function getDefaultServices(): Service[] {
    return [
      { 
        id: 1, 
        name: 'Consulta Inicial', 
        description: 'Primera consulta para evaluar el caso y ofrecer asesoramiento inicial.', 
        price: 50000, 
        duration: 60 
      },
      { 
        id: 2, 
        name: 'Asesoría Legal', 
        description: 'Asesoría especializada con análisis detallado de tu situación legal.', 
        price: 75000, 
        duration: 90 
      },
    ];
  }
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<{
    id: number | null;
    name: string;
    description: string;
    price: string;
    duration: string;
  }>({
    id: null,
    name: '',
    description: '',
    price: '',
    duration: ''
  });

  // Update modal open state when editing a service
  useEffect(() => {
    if (editingService.id) {
      setIsModalOpen(true);
    }
  }, [editingService.id]);

  const handleAddService = () => {
    setEditingService({
      id: null,
      name: '',
      description: '',
      price: '',
      duration: ''
    });
    setIsModalOpen(true);
  };

  const handleEditService = (service: Service) => {
    setEditingService({
      id: service.id,
      name: service.name,
      description: service.description,
      price: service.price.toString(),
      duration: service.duration.toString()
    });
  };

  // Save services to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('lawyerServices', JSON.stringify(services));
    }
  }, [services]);

  const handleSaveService = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!editingService.name.trim()) {
      toast({
        title: 'Error',
        description: 'El nombre del servicio es requerido',
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
    const duration = parseInt(editingService.duration);

    if (isNaN(price) || price <= 0) {
      toast({
        title: 'Error',
        description: 'El precio debe ser un número mayor a 0',
        variant: 'destructive',
      });
      return;
    }

    if (isNaN(duration) || duration <= 0) {
      toast({
        title: 'Error',
        description: 'La duración debe ser un número mayor a 0',
        variant: 'destructive',
      });
      return;
    }

    if (editingService.id) {
      // Update existing service
      const updatedServices = services.map(service => 
        service.id === editingService.id 
          ? { 
              ...service, 
              name: editingService.name.trim(),
              description: editingService.description.trim(),
              price,
              duration
            } 
          : service
      );
      setServices(updatedServices);
      toast({
        title: '¡Listo!',
        description: 'Servicio actualizado correctamente',
      });
    } else {
      // Add new service
      const newService = {
        id: Math.max(0, ...services.map(s => s.id)) + 1,
        name: editingService.name.trim(),
        description: editingService.description.trim(),
        price,
        duration
      };
      const updatedServices = [...services, newService];
      setServices(updatedServices);
      toast({
        title: '¡Listo!',
        description: 'Servicio agregado correctamente',
      });
    }
    
    // Reset form and close modal
    setEditingService({ id: null, name: '', description: '', price: '', duration: '' });
    setIsModalOpen(false);
  };

  const handleCancelEdit = () => {
    setEditingService({ id: null, name: '', description: '', price: '', duration: '' });
    setIsModalOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleCancelEdit();
    }
  };

  const handleDeleteService = (id: number) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este servicio?')) {
      setServices(services.filter(service => service.id !== id));
    }
  };

  // Remove this line as we're now managing isModalOpen with state
  const modalTitle = editingService.id ? 'Editar Servicio' : 'Agregar Servicio';

  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mis Servicios</h1>
          <p className="text-muted-foreground">
            Gestiona los servicios que ofreces a tus clientes
          </p>
        </div>
        <Button onClick={handleAddService} className="gap-2 px-6">
          <Plus className="h-4 w-4" />
          Nuevo Servicio
        </Button>
      </div>
      
      {services.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <Card key={service.id} className="h-full flex flex-col hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{service.name}</CardTitle>
                    <CardDescription className="mt-1">{service.description}</CardDescription>
                  </div>
                  <Badge variant="secondary" className="ml-2 whitespace-nowrap">
                    {service.duration} min
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <DollarSign className="h-4 w-4 mr-1" />
                    <span>Precio: </span>
                    <span className="ml-1 font-medium text-foreground">
                      ${service.price.toLocaleString('es-CL')} CLP
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>Duración: </span>
                    <span className="ml-1 font-medium text-foreground">
                      {service.duration} minutos
                    </span>
                  </div>
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
                    onClick={() => handleDeleteService(service.id)}
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
      <Dialog open={isModalOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingService.id ? 'Editar Servicio' : 'Nuevo Servicio'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSaveService} className="space-y-5">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre del servicio *</Label>
                <Input
                  id="name"
                  placeholder="Ej: Consulta Inicial"
                  value={editingService.name}
                  onChange={(e) => setEditingService({...editingService, name: e.target.value})}
                  className="h-10"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Descripción *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe en detalle en qué consiste el servicio"
                  value={editingService.description}
                  onChange={(e) => setEditingService({...editingService, description: e.target.value})}
                  rows={3}
                  className="min-h-[100px]"
                />
                <p className="text-xs text-muted-foreground">
                  Sé claro sobre lo que incluye el servicio y qué pueden esperar los clientes.
                </p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Precio (CLP) *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id="price"
                      type="number"
                      placeholder="50000"
                      value={editingService.price}
                      onChange={(e) => setEditingService({...editingService, price: e.target.value})}
                      className="pl-8 h-10"
                      min="0"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="duration">Duración (minutos) *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                    </span>
                    <Input
                      id="duration"
                      type="number"
                      placeholder="60"
                      value={editingService.duration}
                      onChange={(e) => setEditingService({...editingService, duration: e.target.value})}
                      className="pl-10 h-10"
                      min="1"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <DialogFooter className="mt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleCancelEdit}
                className="px-6"
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                className="px-6"
              >
                {editingService.id ? 'Guardar Cambios' : 'Crear Servicio'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
