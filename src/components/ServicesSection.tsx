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
  onAuthRequired?: () => void;
  lawyerId?: string;
}

export function ServicesSection({ 
  services: initialServices = [], 
  isOwner = false, 
  isLoading = false, 
  onContactService, 
  onAuthRequired,
  lawyerId: lawyerIdProp 
}: ServicesSectionProps) {
  const [processingServices, setProcessingServices] = useState<Record<string, boolean>>({});
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
      if (onAuthRequired) {
        onAuthRequired();
        return;
      }
      toast({
        title: "Inicia sesión",
        description: "Debes iniciar sesión para solicitar un servicio.",
        variant: "destructive"
      });
      return;
    }

    if (!service.available) return;

    // Set processing state for this specific service
    setProcessingServices(prev => ({ ...prev, [service.id]: true }));

    try {
      const lawyerId = lawyerIdProp || window.location.pathname.split('/').pop();
      if (!lawyerId) throw new Error('No se pudo identificar al abogado');

      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No se pudo autenticar la sesión');

      // Prepare the reference data
      const referenceData = {
        lawyerId,
        clientName: user.user_metadata?.full_name || '',
        clientEmail: user.email || '',
        serviceType: service.title,
        serviceId: service.id,
        amount: service.price_clp,
        clientId: user.id,
        timestamp: new Date().toISOString()
      };

      // Prepare the request payload
      const payload = {
        items: [{
          id: `servicio-${service.id}`,
          title: service.title,
          description: service.description || 'Servicio legal',
          quantity: 1,
          unit_price: Number(service.price_clp),
          currency_id: 'CLP'
        }],
        payer: {
          name: user.user_metadata?.full_name || '',
          email: user.email || '',
          phone: {
            area_code: '56', // Default Chile code
            number: '000000000' // Default number
          }
        },
        back_urls: {
          success: 'https://834703e13045.ngrok-free.app/payment/success',
          failure: 'https://834703e13045.ngrok-free.app/payment/failure',
          pending: 'https://834703e13045.ngrok-free.app/payment/pending'
        },
        auto_return: 'approved',
        binary_mode: true,
        statement_descriptor: 'UpLegal',
        external_reference: JSON.stringify(referenceData),
        notification_url: 'https://uplegal.netlify.app/api/mercadopago/webhook',
        payment_methods: {
          excluded_payment_methods: [
            {
              id: 'bolbradesco',
            },
          ],
          excluded_payment_types: [
            {
              id: 'ticket',
            },
          ],
          installments: 12,
        },
        expires: false,
        metadata: {
          client_id: user.id,
          lawyer_id: lawyerId,
          service_type: 'legal_service',
          timestamp: new Date().toISOString(),
          session_id: session.access_token
        },
        // Ensure the success URL is included in the root of the payload
        success_url: `${window.location.origin}/payment/success`,
        // Add additional required fields
        purpose: 'onboarding_credits',
        additional_info: {
          items: [{
            id: `servicio-${service.id}`,
            title: service.title,
            description: service.description || 'Servicio legal',
            quantity: 1,
            unit_price: Number(service.price_clp),
            currency_id: 'CLP'
          }]
        }
      };

      console.log('Sending payment request:', payload);

      // Prepare the minimal required request body for MercadoPago
      const requestBody = {
        items: [{
          id: `servicio-${service.id}`,
          title: service.title,
          description: service.description || 'Servicio legal',
          quantity: 1,
          unit_price: Number(service.price_clp),
          currency_id: 'CLP'
        }],
        payer: {
          name: user.user_metadata?.full_name || '',
          email: user.email || ''
        },
        // Simplify back_urls to only include success URL
        back_urls: {
          success: 'https://834703e13045.ngrok-free.app/payment/success',
          failure: 'https://834703e13045.ngrok-free.app/payment/failure'
        },
        // Set auto_return to 'approved' as required
        auto_return: 'approved',
        // Add success_url as a top-level parameter
        success_url: 'https://834703e13045.ngrok-free.app/payment/success',
        // Include required metadata
        metadata: {
          client_id: user.id,
          lawyer_id: lawyerId,
          service_id: service.id
        },
        // Add statement descriptor
        statement_descriptor: 'UpLegal',
        // Add purpose
        purpose: 'onboarding_credits',
        // Set binary mode
        binary_mode: true
      };

      console.log('Sending payment request:', requestBody);

      // Call the Supabase Function with the correct endpoint
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-mercado-pago-preference`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || ''
          },
          body: JSON.stringify(requestBody)
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response:', errorData);
        throw new Error(errorData.error || 'Error al procesar el pago');
      }

      const responseData = await response.json();
      console.log('Payment response:', responseData);

      // Redirect to MercadoPago checkout
      if (responseData.init_point || responseData.sandbox_init_point || responseData.url) {
        window.location.href = responseData.init_point || responseData.sandbox_init_point || responseData.url;
      } else {
        throw new Error('No se recibió una URL de pago válida');
      }

    } catch (error) {
      console.error('Error al procesar la solicitud:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo procesar la solicitud. Por favor, inténtalo de nuevo más tarde.',
        variant: 'destructive',
      });
    } finally {
      // Clear processing state for this service
      setProcessingServices(prev => ({ ...prev, [service.id]: false }));
    }
  };

  // Rest of the component code...
  const renderServiceCard = (service: Service) => {
    if (!service) return null;
    
    const formatDeliveryTime = () => {
      if (!service.delivery_time) return '';
      
      const [time, unit] = service.delivery_time.split(' ');
      if (unit === 'hours' || unit === 'hour') {
        return `${time} ${time === '1' ? 'hora' : 'horas'}`;
      } else if (unit === 'days' || unit === 'day') {
        return `${time} ${time === '1' ? 'día' : 'días'}`;
      } else if (unit === 'weeks' || unit === 'week') {
        return `${time} ${time === '1' ? 'semana' : 'semanas'}`;
      }
      return service.delivery_time;
    };

    // Get icon based on service type
    const getServiceIcon = () => {
      const title = service.title.toLowerCase();
      if (title.includes('consulta')) return <MessageSquare className="h-5 w-5" />;
      if (title.includes('revisión') || title.includes('revision')) return <FileText className="h-5 w-5" />;
      if (title.includes('empresa') || title.includes('corporativo')) return <Building2 className="h-5 w-5" />;
      return <Scale className="h-5 w-5" />;
    };

    return (
      <div key={service.id} className="border border-gray-200 rounded-xl p-6 space-y-5 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start">
          {/* Service Icon and Title */}
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 p-2 rounded-lg text-blue-500">
              {getServiceIcon()}
            </div>
            <h4 className="text-lg font-semibold text-gray-900">{service.title}</h4>
          </div>
          
          {/* Price */}
          <div className="text-2xl font-bold text-blue-600">
            {formatPrice(service.price_clp)}
          </div>
        </div>

        {/* Delivery Time */}
        <div className="flex items-center text-sm text-gray-500 bg-gray-50 p-2 rounded-lg w-fit">
          <Clock className="h-4 w-4 mr-2 text-blue-500" />
          <span>Entrega: {formatDeliveryTime()}</span>
        </div>

        {/* Description */}
        <p className="text-gray-600 text-sm leading-relaxed">
          {service.description}
        </p>

        {/* Features */}
        <div className="space-y-3 pt-2">
          <p className="text-sm font-medium text-gray-700">Incluye:</p>
          <ul className="space-y-2">
            {service.features.map((feature, index) => (
              <li key={index} className="flex items-start text-sm text-gray-600">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Button */}
        <Button 
          className="w-full mt-6 py-5 text-base font-medium rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors"
          disabled={!service.available || processingServices[service.id]}
          onClick={() => handleServiceSelect(service)}
        >
          {processingServices[service.id] ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Procesando...
            </>
          ) : service.available ? (
            'Solicitar Servicio'
          ) : (
            'No Disponible'
          )}
        </Button>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="grid md:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <Card key={i} className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-5/6" />
                <Skeleton className="h-3 w-4/6" />
                <Skeleton className="h-3 w-3/4" />
              </div>
              <Skeleton className="h-10 w-full mt-4" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid md:grid-cols-2 gap-6">
        {services.map((service) => renderServiceCard(service))}
      </div>

      {services.length === 0 && (
        <div className="text-center py-12">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            <FileText className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay servicios disponibles</h3>
          <p className="mt-1 text-sm text-gray-500">
            {isOwner 
              ? 'Comienza agregando tu primer servicio.'
              : 'Este abogado aún no ha configurado sus servicios.'}
          </p>
          {isOwner && (
            <div className="mt-6">
              <Button>
                <Plus className="-ml-1 mr-2 h-5 w-5" />
                Nuevo Servicio
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
