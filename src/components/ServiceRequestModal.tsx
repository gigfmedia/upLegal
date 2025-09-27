import { useState } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

type ServiceRequestModalProps = {
  isOpen: boolean;
  onClose: () => void;
  service: {
    id: string;
    title: string;
    price_clp: number;
  };
  onSubmit: (data: { requestType: string; message: string }) => void;
};

export function ServiceRequestModal({ isOpen, onClose, service, onSubmit }: ServiceRequestModalProps) {
  const [requestType, setRequestType] = useState("consultation");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({ requestType, message });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Solicitar servicio: {service.title}</DialogTitle>
          <DialogDescription>
            Completa los siguientes datos para solicitar este servicio.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-3">Tipo de solicitud</h4>
              <RadioGroup 
                value={requestType} 
                onValueChange={setRequestType}
                className="space-y-3"
              >
                <Label 
                  htmlFor="r1" 
                  className={`block cursor-pointer ${requestType === 'consultation' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'} flex items-center space-x-3 p-4 border rounded-md transition-colors`}
                >
                  <div className="flex items-center justify-center h-5 w-5">
                    <RadioGroupItem 
                      value="consultation" 
                      id="r1" 
                      className="h-5 w-5 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex-1">
                    <span className="text-base font-medium text-gray-900">
                      Consulta inicial
                    </span>
                    <p className="text-sm text-gray-500 mt-1">
                      Realiza una consulta inicial para evaluar tu caso.
                    </p>
                  </div>
                </Label>
                
                <Label 
                  htmlFor="r2" 
                  className={`block cursor-pointer ${requestType === 'service' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'} flex items-center space-x-3 p-4 border rounded-md transition-colors`}
                >
                  <div className="flex items-center justify-center h-5 w-5">
                    <RadioGroupItem 
                      value="service" 
                      id="r2" 
                      className="h-5 w-5 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex-1">
                    <span className="text-base font-medium text-gray-900">
                      Contratar servicio completo
                    </span>
                    <p className="text-sm text-gray-500 mt-1">
                      Contrata el servicio completo para resolver tu caso.
                    </p>
                  </div>
                </Label>
                
                <Label 
                  htmlFor="r3" 
                  className={`block cursor-pointer ${requestType === 'quote' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'} flex items-center space-x-3 p-4 border rounded-md transition-colors`}
                >
                  <div className="flex items-center justify-center h-5 w-5">
                    <RadioGroupItem 
                      value="quote" 
                      id="r3" 
                      className="h-5 w-5 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex-1">
                    <span className="text-base font-medium text-gray-900">
                      Solicitar cotización
                    </span>
                    <p className="text-sm text-gray-500 mt-1">
                      Solicita una cotización personalizada para tu caso.
                    </p>
                  </div>
                </Label>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Mensaje (opcional)</Label>
              <Textarea
                id="message"
                placeholder="Describe brevemente lo que necesitas..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
              />
            </div>

            <div className="bg-gray-50 p-4 rounded-md">
              <div className="flex justify-between text-sm">
                <span>Precio del servicio:</span>
                <span className="font-medium">
                  {new Intl.NumberFormat('es-CL', {
                    style: 'currency',
                    currency: 'CLP',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  }).format(service.price_clp)}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">* El precio puede variar según los requisitos específicos de tu caso.</p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Enviando...' : 'Enviar solicitud'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
