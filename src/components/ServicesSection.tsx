import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Clock, Calendar, MessageSquare, FileText, Building2, Scale, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import PreCheckoutModal, { type ServiceCheckoutData } from '@/components/PreCheckoutModal';
import {
  applyClientSurcharge,
  isInitialConsultationService,
  roundToThousands,
  serviceRequiresMeeting,
} from '@/lib/serviceBooking';

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
  lawyerId?: string;
  lawyerName?: string;
}

export function ServicesSection({
  services: initialServices = [],
  isOwner = false,
  isLoading = false,
  lawyerId: lawyerIdProp,
  lawyerName = 'Abogado',
}: ServicesSectionProps) {
  const [checkoutData, setCheckoutData] = useState<ServiceCheckoutData | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const { toast } = useToast();

  const services = useMemo(() => {
    if (!initialServices.length) return [];
    return [...initialServices].sort((a, b) => {
      if (a.available === b.available) return 0;
      return a.available ? -1 : 1;
    });
  }, [initialServices]);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);

  const getDisplayPrice = (service: Service) => {
    if (isInitialConsultationService(service.title)) {
      return roundToThousands(applyClientSurcharge(service.price_clp));
    }
    return applyClientSurcharge(service.price_clp);
  };

  const handleServiceSelect = (service: Service) => {
    if (!service.available) return;

    if (isInitialConsultationService(service.title)) {
      if (!lawyerIdProp) {
        toast({
          title: 'Error',
          description: 'No se pudo identificar al abogado.',
          variant: 'destructive',
        });
        return;
      }
      window.location.assign(`/booking/${lawyerIdProp}`);
      return;
    }

    if (!lawyerIdProp) {
      toast({
        title: 'Error',
        description: 'No se pudo identificar al abogado.',
        variant: 'destructive',
      });
      return;
    }

    setCheckoutData({
      type: 'service',
      lawyer_id: lawyerIdProp,
      lawyer_name: lawyerName,
      service_id: service.id,
      service_title: service.title,
      service_description: service.description,
      service_delivery_time: service.delivery_time,
      price: getDisplayPrice(service),
      requires_meeting: serviceRequiresMeeting(service.title),
    });
    setShowCheckout(true);
  };

  const renderServiceCard = (service: Service) => {
    if (!service) return null;

    const isInitialConsultation = isInitialConsultationService(service.title);

    const formatDeliveryTime = () => {
      if (isInitialConsultation) return '60 minutos';
      if (!service.delivery_time) return '';
      const raw = service.delivery_time.trim();
      if (raw.includes('|')) {
        const daysRaw = raw.split('|')[1]?.trim() || raw.split('|')[0]?.trim() || '';
        if (daysRaw.toLowerCase() === 'variable' || daysRaw.toLowerCase().includes('día')) return daysRaw;
        return `${daysRaw} días`;
      }
      if (raw.toLowerCase() === 'variable' || raw.toLowerCase().includes('día')) return raw;
      return raw;
    };

    const getServiceIcon = () => {
      const title = service.title.toLowerCase();
      if (title.includes('consulta')) return <MessageSquare className="h-5 w-5" />;
      if (title.includes('revisión') || title.includes('revision')) return <FileText className="h-5 w-5" />;
      if (title.includes('empresa') || title.includes('corporativo')) return <Building2 className="h-5 w-5" />;
      return <Scale className="h-5 w-5" />;
    };

    return (
      <div key={service.id} className="border border-gray-200 rounded-xl p-6 flex flex-col h-full hover:shadow-md transition-shadow">
        <div className="flex-1 space-y-5">
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-green-900 p-2 rounded-lg text-green-600">{getServiceIcon()}</div>
              <h4 className="text-lg font-semibold text-gray-900">{service.title}</h4>
            </div>
            <div className="flex items-end gap-1 mt-4 md:mt-0">
              <span className="text-2xl font-bold text-primary">{formatPrice(getDisplayPrice(service))}</span>
              <span className="text-sm text-gray-500 mb-1">CLP</span>
            </div>
          </div>

          <div className="flex items-center text-sm text-gray-500 bg-gray-50 p-2 rounded-lg w-fit">
            <Clock className="h-4 w-4 mr-2 text-green-600" />
            <span>{isInitialConsultation ? formatDeliveryTime() : `Entrega: ${formatDeliveryTime()}`}</span>
          </div>

          <p className="text-gray-600 leading-relaxed">{service.description}</p>

          <div className="space-y-3 pt-2">
            <p className="text-sm font-medium text-gray-700">Incluye:</p>
            <ul className="space-y-2">
              {service.features.map((feature, index) => (
                <li key={index} className="flex items-start text-gray-600">
                  <span className="text-green-600 font-bold mr-2 flex-shrink-0">✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Button
          className="w-full h-11 mt-6 py-5 text-base font-medium rounded-lg bg-gray-900 hover:bg-green-900 transition-colors"
          disabled={!service.available}
          onClick={() => handleServiceSelect(service)}
        >
          {service.available ? (
            <>
              {isInitialConsultation && <Calendar className="h-4 w-4 mr-2" />}
              {isInitialConsultation ? 'Agenda consulta' : <><Send className="h-4 w-4 mr-2" />Solicita servicio</>}
            </>
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
          <div key={i} className="p-6 border rounded-xl space-y-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-full mt-4" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        <div className="grid md:grid-cols-2 gap-6 items-stretch">
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
          </div>
        )}
      </div>

      {checkoutData && (
        <PreCheckoutModal
          isOpen={showCheckout}
          onClose={() => {
            setShowCheckout(false);
            setCheckoutData(null);
          }}
          checkoutData={checkoutData}
        />
      )}
    </>
  );
}
