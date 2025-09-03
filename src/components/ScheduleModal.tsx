import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  lawyerName: string;
  hourlyRate: number;
  lawyerId: string;
}

export function ScheduleModal({ isOpen, onClose, lawyerName, hourlyRate, lawyerId }: ScheduleModalProps) {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    date: "",
    time: "",
    duration: "60",
    consultationType: "",
    description: ""
  });
  const { toast } = useToast();

  const timeSlots = [
    "09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00", "18:00"
  ];

  const consultationTypes = [
    { value: "consultation", label: "Consulta inicial" },
    { value: "legal-advice", label: "Asesoría legal" },
    { value: "document-review", label: "Revisión de documentos" },
    { value: "contract-review", label: "Revisión de contratos" },
    { value: "other", label: "Otro" }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Continuar como invitado",
        description: "Procesaremos el pago sin iniciar sesión.",
      });
    }

    setIsProcessing(true);

    try {
      // CLP es moneda sin decimales; enviar el monto total sin convertir a centavos
      const totalAmount = Math.round(estimatedCost);
      
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          lawyerId: lawyerId,
          amount: totalAmount,
          serviceDescription: `${formData.consultationType} - ${formData.description}`,
          email: formData.email,
        }
      });

      if (error) throw error;

      // Open Stripe checkout in a new tab
      if (data?.url) {
        window.open(data.url, '_blank');
        
        toast({
          title: "Redirigiendo a Stripe",
          description: "Se ha abierto una nueva pestaña para completar el pago",
        });
        
        // Reset form
        setFormData({
          name: "",
          email: "",
          phone: "",
          date: "",
          time: "",
          duration: "60",
          consultationType: "",
          description: ""
        });
        
        onClose();
      }
    } catch (error: any) {
      console.error('Error creating payment:', error);
      toast({
        title: "Error",
        description: "Error al procesar el pago. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSelectChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Calculate estimated cost
  const estimatedCost = (parseInt(formData.duration || "60") / 60) * hourlyRate;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Agendar cita con {lawyerName}</span>
          </DialogTitle>
          <DialogDescription>
            Completa los datos para agendar y pagar en línea. Usa tarjeta de prueba si estás en modo test.
          </DialogDescription>
        </DialogHeader>
        
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
                required
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
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Fecha preferida</Label>
              <Input
                id="date"
                name="date"
                type="date"
                value={formData.date}
                onChange={handleChange}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Hora preferida</Label>
              <Select value={formData.time} onValueChange={(value) => handleSelectChange("time", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona la hora" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((time) => (
                    <SelectItem key={time} value={time}>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4" />
                        <span>{time}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Duración (minutos)</Label>
              <Select value={formData.duration} onValueChange={(value) => handleSelectChange("duration", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutos</SelectItem>
                  <SelectItem value="60">1 hora</SelectItem>
                  <SelectItem value="90">1.5 horas</SelectItem>
                  <SelectItem value="120">2 horas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="consultationType">Tipo de consulta</Label>
              <Select value={formData.consultationType} onValueChange={(value) => handleSelectChange("consultationType", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el tipo" />
                </SelectTrigger>
                <SelectContent>
                  {consultationTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Descripción del caso</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              placeholder="Describe brevemente tu caso o consulta..."
              required
            />
          </div>
          
          {/* Cost Estimate */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium">Costo estimado:</span>
              <span className="text-xl font-bold text-green-600">
                ${estimatedCost.toLocaleString()}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {formData.duration} min × ${hourlyRate}/hora
            </p>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isProcessing}
            >
              {isProcessing ? "Procesando..." : `Pagar $${estimatedCost.toLocaleString()}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}