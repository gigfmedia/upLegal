import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, CheckCircle, MessageSquare, Plus, FileText, Building2, Scale } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { Skeleton } from "@/components/ui/skeleton";

interface Service {
  id: string;
  title: string;
  description: string;
  price_clp: number;
  delivery_time: string;
  features: string[];
  available: boolean;
}

interface ServicesSectionProps {
  services?: Service[];
  isOwner?: boolean;
  isLoading?: boolean;
  onContactService?: (service: Service) => void;
  lawyerId?: string;
}

export function ServicesSection({ 
  services: initialServices = [], 
  isOwner = false, 
  isLoading = false, 
  onContactService, 
  lawyerId: lawyerIdProp 
}: ServicesSectionProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Process services to ensure they're in pairs and last one is unavailable if odd count
  const services = useMemo(() => {
    if (!initialServices.length) return [];
    
    // Sort services to put unavailable ones at the end
    const sortedServices = [...initialServices].sort((a, b) => {
      if (a.available === b.available) return 0;
      return a.available ? -1 : 1;
    });
    
    return sortedServices;
  }, [initialServices]);
  
  // Group services into pairs
  const servicePairs = useMemo(() => {
    const pairs = [];
    for (let i = 0; i < services.length; i += 2) {
      pairs.push(services.slice(i, i + 2));
    }
    return pairs;
  }, [services]);
  
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };
  
  const handleServiceSelect = async (service: Service) => {
    if (!user) {
      toast({
        title: "Inicia sesión",
        description: "Debes iniciar sesión para solicitar un servicio.",
        variant: "destructive"
      });
      return;
    }
    
    if (!service.available) return;
    
    setIsProcessing(true);
    try {
      const lawyerId = lawyerIdProp || window.location.pathname.split('/').pop();
      if (!lawyerId) throw new Error('No se pudo identificar al abogado');
      
      const { data: response, error } = await supabase.functions.invoke('create-payment', {
        body: {
          lawyerId,
          amount: service.price_clp,
          serviceDescription: service.title,
          email: user.email,
        }
      });
      
    } catch (error) {
      console.error('Error al procesar la solicitud:', error);
      toast({
        title: 'Error',
        description: 'No se pudo procesar la solicitud. Por favor, inténtalo de nuevo más tarde.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const renderServiceCard = (service: Service) => {
    if (!service) return null;
    
    const formatDeliveryTime = () => {
      const raw = (service.delivery_time || '').trim();
      const hasPipe = raw.includes('|');
      const hoursRaw = hasPipe ? raw.split('|')[0].trim() : '';
      const daysRaw = hasPipe ? (raw.split('|')[1]?.trim() || '') : raw;
      
      // Build hours label
      let hoursLabel = '';
      if (hoursRaw) {
        if (!isNaN(Number(hoursRaw))) {
          const h = Number(hoursRaw);
          hoursLabel = `${h} ${h === 1 ? 'hora' : 'horas'}`;
        } else if (hoursRaw.toLowerCase().includes('min')) {
          const mins = Number(hoursRaw.replace(/[^0-9]/g, ''));
          if (!isNaN(mins)) {
            if (mins >= 60 && mins % 60 === 0) {
              const h = mins / 60;
              hoursLabel = `${h} ${h === 1 ? 'hora' : 'horas'}`;
            } else if (mins > 0) {
              hoursLabel = `${mins} min`;
            }
          }
        }
      }

      // Build days label
      let daysLabel = '';
      if (daysRaw) {
        const lower = daysRaw.toLowerCase();
        if (lower === 'variable') {
          daysLabel = 'variable';
        } else if (/^\d+$/.test(daysRaw)) {
          const d = Number(daysRaw);
          if (d % 7 === 0) {
            const w = d / 7;
            daysLabel = `${w} ${w === 1 ? 'semana' : 'semanas'}`;
          } else {
            daysLabel = `${d} ${d === 1 ? 'día' : 'días'}`;
          }
        } else {
          const rangePattern = /^\d+\s*-\s*\d+$/;
          daysLabel = rangePattern.test(daysRaw) ? `${daysRaw} días` : daysRaw;
        }
      }

      return { hoursLabel, daysLabel };
    };
    
    const { hoursLabel, daysLabel } = formatDeliveryTime();
    
    return (
      <Card key={service.id} className="w-full hover:shadow-md transition-shadow">
        <div className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-blue-50">
                  {service.title.toLowerCase().includes('consulta') ? (
                    <MessageSquare className="h-5 w-5 text-blue-600" />
                  ) : service.title.toLowerCase().includes('contrato') ? (
                    <FileText className="h-5 w-5 text-blue-600" />
                  ) : service.title.toLowerCase().includes('empresa') || 
                     service.title.toLowerCase().includes('corporativo') ? (
                    <Building2 className="h-5 w-5 text-blue-600" />
                  ) : service.title.toLowerCase().includes('familiar') || 
                     service.title.toLowerCase().includes('familia') ? (
                    <Scale className="h-5 w-5 text-blue-600" />
                  ) : (
                    <MessageSquare className="h-5 w-5 text-blue-600" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{service.title}</h3>
                  {!service.available && (
                    <Badge variant="outline" className="mt-1 bg-white text-gray-500 border-gray-300 text-xs">
                      No disponible
                    </Badge>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-1">{service.description}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">
                {service.price_clp > 0 ? formatPrice(service.price_clp) : 'A convenir'}
              </p>
            </div>
          </div>
          
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="inline-flex items-center">
                <Clock className="h-4 w-4 mr-1.5 text-gray-500" />
                {hoursLabel || 'Duración a convenir'}
              </span>
              <span className="inline-flex items-center">
                <Calendar className="h-4 w-4 mr-1.5 text-gray-500" />
                {daysLabel ? `Entrega: ${daysLabel}` : 'Plazo a convenir'}
              </span>
            </div>
            
            {service.features && service.features.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Incluye:</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  {service.features.map((feature, i) => (
                    <li key={i} className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-100">
            <Button 
              variant="default"
              className={`w-full ${
                isOwner 
                  ? 'bg-blue-600 hover:bg-blue-600 cursor-not-allowed opacity-70' 
                  : service.available 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'bg-blue-600 opacity-70 cursor-not-allowed'
              } text-white`}
              disabled={isOwner || !service.available || isProcessing}
              onClick={() => service.available && !isOwner && handleServiceSelect(service)}
            >
              {isProcessing ? 'Procesando...' : service.available ? 'Solicitar servicio' : 'No disponible'}
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="w-full">
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-full p-6">
              <div className="space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <div className="flex justify-between items-center">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
                <Skeleton className="h-10 w-full mt-4" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // No services state
  if (services.length === 0) {
    if (isOwner) {
      return (
        <div className="bg-white rounded-lg shadow p-6 text-center border-2 border-dashed border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aún no has agregado servicios</h3>
          <p className="text-gray-500 mb-4">Comienza ofreciendo tus servicios legales a los clientes</p>
          <Button variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Agregar primer servicio
          </Button>
        </div>
      );
    }
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No hay servicios disponibles en este momento.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="space-y-6">
        {servicePairs.map((pair, pairIndex) => (
          <div key={pairIndex} className="grid gap-4 grid-cols-1 md:grid-cols-2 w-full">
            {pair.map((service, serviceIndex) => (
              <div key={service?.id || `empty-${pairIndex}-${serviceIndex}`} className={!service ? 'hidden md:block' : ''}>
                {renderServiceCard(service as Service)}
              </div>
            ))}
          </div>
        ))}
      </div>
      
      {!isOwner && (
        <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-100">
          <h5 className="font-medium text-blue-800 mb-2">¿Necesitas algo personalizado?</h5>
          <p className="text-sm text-blue-700 mb-4">
            Si no encuentras el servicio que necesitas, puedo crear una propuesta personalizada para tu caso específico.
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            className="border-blue-200 text-blue-700 hover:bg-blue-100"
            onClick={() => onContactService && onContactService({
              id: 'custom',
              title: 'Servicio personalizado',
              description: 'Solicitud de servicio personalizado',
              price_clp: 0,
              delivery_time: 'A convenir',
              features: [],
              available: true
            })}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Solicitar cotización personalizada
          </Button>
        </div>
      )}
    </div>
  );
}
