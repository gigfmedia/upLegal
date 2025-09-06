import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, MessageSquare } from "lucide-react";

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
  onContactService?: (service: Service) => void;
}

export function ServicesSection({ services = [], isOwner = false, onContactService }: ServicesSectionProps) {
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  // Mock services if none provided
  const defaultServices: Service[] = [
    {
      id: "1",
      title: "Consulta Legal Inicial",
      description: "Consulta de 1 hora para evaluar tu caso y brindar orientación legal inicial.",
      price_clp: 75000,
      delivery_time: "Inmediato",
      features: [
        "Evaluación completa del caso",
        "Orientación legal especializada",
        "Plan de acción recomendado",
        "Seguimiento por email"
      ],
      available: true
    },
    {
      id: "2", 
      title: "Redacción de Contratos",
      description: "Elaboración profesional de contratos civiles y comerciales adaptados a tus necesidades.",
      price_clp: 200000,
      delivery_time: "3 días hábiles",
      features: [
        "Contratos personalizados",
        "Revisión legal completa",
        "2 rondas de revisiones",
        "Asesoría sobre términos"
      ],
      available: true
    },
    {
      id: "3",
      title: "Representación Legal", 
      description: "Representación completa en procesos judiciales y administrativos.",
      price_clp: 150000,
      delivery_time: "Variable",
      features: [
        "Representación en tribunales",
        "Estrategia legal personalizada",
        "Seguimiento del caso",
        "Comunicación constante"
      ],
      available: true
    },
    {
      id: "4",
      title: "Asesoría Empresarial",
      description: "Asesoría legal integral para empresas en temas de compliance y operaciones.",
      price_clp: 300000,
      delivery_time: "1 semana",
      features: [
        "Auditoría de compliance", 
        "Políticas corporativas",
        "Recomendaciones legales",
        "Informe final detallado"
      ],
      available: false
    }
  ];

  const servicesToShow = services.length > 0 ? services : defaultServices;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  const handleServiceContact = (service: Service) => {
    if (onContactService) {
      onContactService(service);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Servicios Ofrecidos</CardTitle>
        <CardDescription>
          Servicios legales especializados con precios transparentes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          {servicesToShow.map((service) => (
            <div key={service.id} className="border rounded-lg p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="text-lg font-semibold mb-2">{service.title}</h4>
                  <div className="text-2xl font-bold text-primary mb-2">
                    {formatPrice(service.price_clp)}
                  </div>
                </div>
                <Badge variant={service.available ? "default" : "secondary"}>
                  {service.available ? "Disponible" : "No Disponible"}
                </Badge>
              </div>

              <p className="text-gray-600 text-sm leading-relaxed">
                {service.description}
              </p>

              <div className="flex items-center text-sm text-gray-500">
                <Clock className="h-4 w-4 mr-1" />
                <span>Entrega: {service.delivery_time}</span>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Incluye:</p>
                <ul className="space-y-1">
                  {service.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-sm text-gray-600">
                      <CheckCircle className="h-3 w-3 text-green-500 mr-2 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <Button 
                className="w-full"
                variant={service.available ? "default" : "secondary"}
                disabled={!service.available}
                onClick={() => handleServiceContact(service)}
              >
                {service.available ? (
                  <>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Solicitar Servicio
                  </>
                ) : (
                  "No Disponible"
                )}
              </Button>
            </div>
          ))}
        </div>

        {servicesToShow.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No hay servicios configurados aún.</p>
            {isOwner && (
              <Button variant="outline" className="mt-4">
                Agregar Primer Servicio
              </Button>
            )}
          </div>
        )}

        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h5 className="font-medium mb-2">¿Necesitas algo personalizado?</h5>
          <p className="text-sm text-gray-600 mb-3">
            Si no encuentras el servicio que necesitas, puedo crear una propuesta personalizada para tu caso específico.
          </p>
          <Button variant="outline" size="sm">
            Solicitar Cotización Personalizada
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}