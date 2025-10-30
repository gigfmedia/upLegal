import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
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
  const [formData, setFormData] = useState(() => ({
    name: user?.user_metadata?.full_name || "",
    email: "",
    phone: "",
    date: "",
    time: "",
    duration: "60",
    consultationType: "consultation",
    description: ""
  }));
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
    
    if (!formData.name || !formData.email || !formData.date || !formData.time || !formData.consultationType) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos obligatorios.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const serviceType = consultationTypes.find(t => t.value === formData.consultationType)?.label || formData.consultationType;
      const description = `Consulta con ${lawyerName}`;
      
      const requestBody = {
        items: [{
          id: `consulta-${Date.now()}`,
          title: description,
          description: serviceType,
          quantity: 1,
          unit_price: chargeAmount,
          currency_id: 'CLP'
        }],
        payer: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone ? { 
            area_code: '56', 
            number: formData.phone.replace(/\D/g, '') 
          } : undefined
        },
        back_urls: {
          success: 'https://834703e13045.ngrok-free.app/payment/success',
          failure: 'https://834703e13045.ngrok-free.app/payment/failure',
          pending: 'https://834703e13045.ngrok-free.app/payment/pending'
        },
        auto_return: 'approved',
        external_reference: JSON.stringify({
          lawyerId,
          clientName: formData.name,
          clientEmail: formData.email,
          serviceType: formData.consultationType,
          appointmentDate: formData.date,
          appointmentTime: formData.time,
          duration: formData.duration,
          description: formData.description
        })
      };

      // Get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('No se pudo autenticar la sesión. Por favor, inicia sesión nuevamente.');
      }

      // Prepare the reference data
      const referenceData = {
        lawyerId,
        clientName: formData.name,
        clientEmail: formData.email,
        serviceType: formData.consultationType,
        appointmentDate: formData.date,
        appointmentTime: formData.time,
        duration: formData.duration,
        description: formData.description,
        amount: chargeAmount,
        clientId: user?.id,
        timestamp: new Date().toISOString()
      };

      // Prepare the request data
      const requestData = {
        items: [{
          id: `consulta-${Date.now()}`,
          title: description,
          description: serviceType,
          quantity: 1,
          unit_price: Number(chargeAmount),
          currency_id: 'CLP'
        }],
        payer: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone ? { 
            area_code: '56', 
            number: formData.phone.replace(/\D/g, '') 
          } : undefined
        },
        back_urls: {
          success: `${window.location.origin}/payment/success`,
          failure: `${window.location.origin}/payment/failure`,
          pending: `${window.location.origin}/payment/pending`
        },
        auto_return: 'approved',
        external_reference: JSON.stringify(referenceData),
        notification_url: 'https://uplegal.netlify.app/api/mercadopago/webhook'
      };

      console.log('Sending request to Supabase Function:', JSON.stringify(requestData, null, 2));
      console.log('Using base URL:', window.location.origin);

      // Define the back URLs with ngrok URL
      const backUrls = {
        success: 'https://834703e13045.ngrok-free.app/payment/success',
        failure: 'https://834703e13045.ngrok-free.app/payment/failure',
        pending: 'https://834703e13045.ngrok-free.app/payment/pending'
      };

      // Ensure all required fields are present and properly formatted
      const payload = {
        items: [{
          ...requestData.items[0],
          id: requestData.items[0].id || `consulta-${Date.now()}`,
          title: requestData.items[0].title || 'Consulta Legal',
          description: requestData.items[0].description || 'Servicio de asesoría legal',
          quantity: 1,
          unit_price: Number(requestData.items[0].unit_price) || 0,
          currency_id: 'CLP'
        }],
        payer: {
          name: requestData.payer.name || 'Cliente',
          email: requestData.payer.email || '',
          phone: {
            area_code: String(requestData.payer.phone?.area_code || '56').replace(/\D/g, '').substring(0, 5),
            number: String(requestData.payer.phone?.number || '000000000').replace(/\D/g, '').substring(0, 15)
          }
        },
        back_urls: backUrls,
        auto_return: 'approved',
        binary_mode: true,
        statement_descriptor: 'UpLegal',
        notification_url: 'https://834703e13045.ngrok-free.app/api/mercadopago/webhook',
        metadata: {
          client_id: requestData.payer.id || 'unknown',
          lawyer_id: requestData.items[0].id?.replace('consulta-', '') || 'unknown',
          service_type: 'legal_consultation',
          timestamp: new Date().toISOString()
        }
      };

      console.log('Prepared payload for MercadoPago:', JSON.stringify(payload, null, 2));

      console.log('Sending request to Supabase Function:', JSON.stringify(payload, null, 2));
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-mercado-pago-preference`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        }
      );

      const responseData = await response.json().catch(() => ({}));
      console.log('Response from Supabase Function:', { status: response.status, data: responseData });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorMessage = responseData?.error?.message || 
                           responseData?.message || 
                           `Error del servidor: ${response.status} ${response.statusText}`;
        console.error('Error response:', errorMessage);
        throw new Error(errorMessage);
      }

      // Save appointment data to local storage before redirect
      const appointmentData = {
        ...requestData,
        paymentId: responseData.id || '',
        createdAt: new Date().toISOString()
      };
      
      localStorage.setItem('pendingAppointment', JSON.stringify(appointmentData));
      
      // Redirect to MercadoPago checkout
      const redirectUrl = responseData.init_point || 
                         responseData.sandbox_init_point || 
                         responseData.url;
      
      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        console.error('No se pudo obtener el enlace de pago. Respuesta completa:', responseData);
        throw new Error('No se pudo obtener el enlace de pago. Por favor, inténtalo de nuevo.');
      }
      
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Error al procesar el pago:', error);
      
      let errorMessage = 'Error al procesar el pago. Por favor, inténtalo de nuevo.';
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'La solicitud ha excedido el tiempo de espera. Por favor, verifica tu conexión e inténtalo de nuevo.';
        } else if (error.message.includes('network')) {
          errorMessage = 'Error de conexión. Por favor, verifica tu conexión a internet.';
        } else {
          errorMessage = error.message || errorMessage;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
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

  // Format number with dots as thousand separators
  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  // Calculate estimated cost
  const estimatedCost = (parseInt(formData.duration || "60") / 60) * hourlyRate;
  const MIN_AMOUNT_CLP = 1000;
  const chargeAmount = Math.max(Math.round(estimatedCost), MIN_AMOUNT_CLP);

  // Calculate minimum date (today if there are hours left, otherwise tomorrow, not Sunday)
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  
  // Check if there are still business hours left today (assuming business hours until 18:00)
  const isBusinessDay = currentDay >= 1 && currentDay <= 5; // Monday to Friday
  const isBusinessHours = currentHour < 18 || (currentHour === 18 && currentMinute < 30);
  
  let minDate: Date;
  
  if (isBusinessDay && isBusinessHours) {
    // If it's a business day and there are still business hours left, allow today
    minDate = new Date(now);
  } else {
    // Otherwise, set minimum date to the next business day
    minDate = new Date(now);
    minDate.setDate(minDate.getDate() + 1);
    
    // Skip weekends
    if (minDate.getDay() === 0) { // Sunday
      minDate.setDate(minDate.getDate() + 1);
    } else if (minDate.getDay() === 6) { // Saturday
      minDate.setDate(minDate.getDate() + 2);
    }
  }
  
  const minDateString = minDate.toISOString().split('T')[0];

  // Calculate maximum date (90 days from now, not Sunday)
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 90);
  if (maxDate.getDay() === 0) {
    maxDate.setDate(maxDate.getDate() - 1); // Move to Saturday if it's Sunday
  }
  const maxDateString = maxDate.toISOString().split('T')[0];

  // Function to get the next valid day (not Sunday)
  const getNextValidDay = useCallback((date: Date): string => {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    if (nextDay.getDay() === 0) { // If it's Sunday, skip to Monday
      nextDay.setDate(nextDay.getDate() + 1);
    }
    return nextDay.toISOString().split('T')[0];
  }, []);

  // Check if a date is a Sunday (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const isSunday = useCallback((dateString: string): boolean => {
    // Crear la fecha en formato YYYY-MM-DDT00:00:00 para evitar problemas de zona horaria
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCDay() === 0; // 0 is Sunday (usando UTC para evitar problemas de zona horaria)
  }, []);

  // Handle date change with validation
  const handleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let selectedDate = e.target.value;
    
    if (isSunday(selectedDate)) {
      // If Sunday is selected, find the next available day (Monday)
      const nextValidDate = getNextValidDay(new Date(selectedDate));
      
      // Update the input value directly
      const dateInput = e.target;
      if (dateInput) {
        dateInput.value = nextValidDate;
        selectedDate = nextValidDate;
      }
      
      toast({
        title: "Domingo no disponible",
        description: `Hemos ajustado la fecha al lunes ${nextValidDate}.`,
        variant: "destructive"
      });
    }
    
    setFormData(prev => ({
      ...prev,
      date: selectedDate
    }));
  }, [isSunday, getNextValidDay, toast]);

  // Función para verificar si una fecha debe estar deshabilitada
  const isDateDisabled = useCallback((date: Date): boolean => {
    return date.getUTCDay() === 0; // Solo deshabilitar domingos
  }, []);

  // Set initial date to next available day if not set
  useEffect(() => {
    if (!formData.date) {
      setFormData(prev => ({
        ...prev,
        date: minDate
      }));
    }
  }, [formData.date, minDate, setFormData]);

  // Prevent selecting Sundays in the date picker
  useEffect(() => {
    const dateInput = document.getElementById('date') as HTMLInputElement;
    if (!dateInput) return;

    const handleDateInput = (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (isSunday(target.value)) {
        e.preventDefault();
        const nextValidDate = getNextValidDay(new Date(target.value));
        
        // Update the input value directly to prevent selection
        target.value = nextValidDate;
        
        setFormData(prev => ({
          ...prev,
          date: nextValidDate
        }));
        
        toast({
          title: "Domingo no disponible",
          description: `Hemos ajustado la fecha al lunes ${nextValidDate}.`,
          variant: "destructive"
        });
      }
    };

    dateInput.addEventListener('input', handleDateInput);
    dateInput.addEventListener('change', handleDateInput);
    
    return () => {
      dateInput.removeEventListener('input', handleDateInput);
      dateInput.removeEventListener('change', handleDateInput);
    };
  }, [getNextValidDay, isSunday, setFormData, toast]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Agendar cita con {lawyerName}</span>
          </DialogTitle>
          <DialogDescription>
            Completa los datos para agendar y pagar en línea. No se pueden agendar citas los domingos.
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
                type="date"
                value={formData.date}
                onChange={handleDateChange}
                min={minDate}
                max={maxDateString}
                onKeyDown={(e) => {
                  // Prevent manual input of invalid dates
                  if (e.key === 'Enter') {
                    e.preventDefault();
                  }
                }}
                onInput={(e) => {
                  const input = e.target as HTMLInputElement;
                  const selectedDate = new Date(input.value);
                  if (isDateDisabled(selectedDate)) {
                    const nextDay = new Date(selectedDate);
                    nextDay.setDate(nextDay.getDate() + 1);
                    input.value = nextDay.toISOString().split('T')[0];
                    setFormData(prev => ({
                      ...prev,
                      date: nextDay.toISOString().split('T')[0]
                    }));
                  }
                }}
                required
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">Los domingos no están disponibles</p>
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
              <Select 
                value={formData.consultationType} 
                onValueChange={(value) => handleSelectChange("consultationType", value)}
                defaultValue="consultation"
              >
                <SelectTrigger>
                  <SelectValue />
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
              <span className="text-xl font-bold text-black-600">
                ${formatNumber(chargeAmount)}
              </span>
            </div>
              <p className="text-sm text-gray-600 mt-1">
                {formData.duration} min × ${formatNumber(hourlyRate)} / hora
              </p>
              {chargeAmount > estimatedCost && (
                <p className="text-xs text-yellow-600 mt-1">
                  Se aplica monto mínimo de $1.000 CLP para pagos con tarjeta.
                </p>
              )}
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isProcessing}
              className="bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
            >
              {isProcessing ? "Procesando..." : `Pagar $${formatNumber(chargeAmount)}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}