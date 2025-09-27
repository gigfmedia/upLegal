import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface Service {
  id: string;
  title: string;
  description: string;
  price_clp: number;
}

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  lawyerName: string;
  lawyerId: string;
  service?: Service | null;
}

export function ContactModal({ isOpen, onClose, lawyerName, lawyerId, service }: ContactModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: ""
  });
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prepare the message with service details if available
    const messageDetails = service 
      ? `\n\nServicio de interés: ${service.title}\nPrecio: ${new Intl.NumberFormat('es-CL', {
          style: 'currency',
          currency: 'CLP',
          minimumFractionDigits: 0,
        }).format(service.price_clp)}`
      : '';
    
    const fullMessage = `${formData.message}${messageDetails}`;
    
    // In a real app, you would send this to your backend
    console.log('Sending message to lawyer:', {
      lawyerId,
      serviceId: service?.id,
      ...formData,
      message: fullMessage,
    });
    
    // Simulate sending message
    toast({
      title: "Mensaje enviado",
      description: `Tu consulta ha sido enviada a ${lawyerName}. Te contactarán pronto.`,
    });
    
    // Reset form
    setFormData({
      name: "",
      email: "",
      phone: "",
      subject: service ? `Consulta sobre servicio: ${service.title}` : "",
      message: ""
    });
    
    onClose();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  // Set default subject if service is provided
  useEffect(() => {
    if (service && !formData.subject) {
      setFormData(prev => ({
        ...prev,
        subject: `Consulta sobre servicio: ${service.title}`
      }));
    }
  }, [service]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {service ? `Solicitar servicio: ${service.title}` : `Contactar a ${lawyerName}`}
          </DialogTitle>
        </DialogHeader>
        
        {service && (
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <h4 className="font-medium text-blue-800 mb-1">Detalles del servicio</h4>
            <p className="text-sm text-blue-700">{service.description}</p>
            <p className="text-sm font-medium text-blue-900 mt-2">
              Precio: {new Intl.NumberFormat('es-CL', {
                style: 'currency',
                currency: 'CLP',
                minimumFractionDigits: 0,
              }).format(service.price_clp)}
            </p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre completo</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="subject">Asunto de la consulta</Label>
            <Input
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="message">Mensaje</Label>
            <Textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              rows={4}
              placeholder="Describe tu consulta legal..."
              required
            />
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">
              Enviar mensaje
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}