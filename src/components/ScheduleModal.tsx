import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Phone, Video, Check } from "lucide-react";
import { Label } from "@/components/ui/label";
import { ValidatedInput } from "@/components/ValidatedInput";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  lawyerName: string;
  hourlyRate: number;
  lawyerId: string;
}

// Helper function to format date as YYYY-MM-DD
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
};

export function ScheduleModal({ isOpen, onClose, lawyerName, hourlyRate, lawyerId }: ScheduleModalProps) {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set());
  // Initialize form data with user information if available
  const [formData, setFormData] = useState(() => {
    // Get user's full name from either user_metadata or profile
    const fullName = user?.user_metadata?.full_name || 
                    (user?.user_metadata?.first_name && user.user_metadata.last_name 
                      ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}` 
                      : '');
    
    // Get phone number from profile or user_metadata
    const phone = user?.phone || 
                 user?.user_metadata?.phone || 
                 '';
    
    // Get email from user object
    const email = user?.email || '';

    // Format today's date as YYYY-MM-DD for the date input
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    
    return {
      name: fullName,
      email: email,
      phone: phone,
      date: formattedDate, // Set today's date as default
      time: "",
      duration: "60",
      consultationType: "consultation",
      contactMethod: "videollamada", // Default to videocall
      description: "",
      address: "" // Add address field for presential meetings
    };
  });

  // Update form data when user data changes
  useEffect(() => {
    if (user) {
      const fullName = user.user_metadata?.full_name || 
                      (user.user_metadata?.first_name && user.user_metadata.last_name 
                        ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}` 
                        : '');
      
      const phone = user.phone || 
                   user.user_metadata?.phone || 
                   '';
      
      const email = user.email || '';

      setFormData(prev => ({
        ...prev,
        name: fullName || prev.name,
        email: email || prev.email,
        phone: phone || prev.phone
      }));
    }
  }, [user]);

  const { toast } = useToast();

  // Fetch booked time slots when date or lawyer changes
  useEffect(() => {
    const fetchBookedSlots = async () => {
      // Don't fetch if we don't have a date or lawyer ID
      if (!formData.date || !lawyerId) return;
      
      try {
        const { data, error } = await supabase
          .from('appointments')
          .select('appointment_time')
          .eq('date', formData.date)
          .eq('lawyer_id', lawyerId);
        
        if (error) {
          console.error('Supabase error:', error);
          return; // Don't show toast for this error
        }
        
        // Create a Set of booked time slots for O(1) lookups
        const booked = new Set(data?.map(slot => slot.appointment_time) || []);
        setBookedSlots(booked);
      } catch (error) {
        console.error('Error in fetchBookedSlots:', error);
        // Don't show toast for this error
      }
    };
    
    fetchBookedSlots();
  }, [formData.date, lawyerId, toast]);

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
    
    if (!formData.name || !formData.email || !formData.date || !formData.time || 
        !formData.consultationType || !formData.contactMethod || 
        (formData.contactMethod === 'presencial' && !formData.address)) {
      toast({
        title: "Error",
        description: formData.contactMethod === 'presencial' && !formData.address 
          ? "Por favor ingresa la dirección para la cita presencial."
          : "Por favor completa todos los campos obligatorios.",
        variant: "destructive"
      });
      return;
    }
    
    // Validate base URL
    const baseUrl = window.location.origin;
    if (!baseUrl || baseUrl === 'null') {
      toast({
        title: "Error",
        description: "No se pudo determinar la URL base. Por favor, recarga la página e intenta de nuevo.",
        variant: "destructive"
      });
      return;
    }
    
    // Ensure we're using HTTPS in production
    const isProduction = import.meta.env.PROD;
    const protocol = isProduction ? 'https:' : window.location.protocol;
    const formattedBaseUrl = isProduction 
      ? baseUrl.replace(/^http:/, 'https:') 
      : baseUrl;

    setIsProcessing(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const serviceType = consultationTypes.find(t => t.value === formData.consultationType)?.label || formData.consultationType;
      const description = `Consulta con ${lawyerName}`;
      
      // Get the current session first
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('Error getting session:', sessionError);
        throw new Error('No se pudo verificar tu sesión. Por favor, inicia sesión nuevamente.');
      }

      // Ensure we have a valid base URL
      const baseUrl = window.location.origin;
      if (!baseUrl || baseUrl === 'null') {
        throw new Error('No se pudo determinar la URL base');
      }

      // Prepare back URLs with proper formatting
      const backUrls = {
        success: `${baseUrl}/payment/success`,
        failure: `${baseUrl}/payment/failure`,
        pending: `${baseUrl}/payment/pending`
      };

      console.log('Using back URLs:', backUrls);

      // Prepare the request payload
      const payload = {
        items: [{
          id: `consulta-${Date.now()}`,
          title: `Consulta con ${lawyerName}`,
          description: formData.consultationType || 'Consulta legal',
          quantity: 1,
          unit_price: chargeAmount,
          currency_id: 'CLP',
          category_id: 'services'
        }],
        payer: {
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: {
            number: formData.phone ? formData.phone.replace(/\D/g, '') : '000000000',
            area_code: '56' // Default Chile area code
          }
        },
        back_urls: backUrls,
        auto_return: 'approved',
        binary_mode: true,
        statement_descriptor: 'UPLEGAL',
        metadata: {
          client_id: user?.id || 'unknown',
          lawyer_id: lawyerId,
          service_type: formData.consultationType || 'general',
          contact_method: formData.contactMethod || 'videollamada',
          created_at: new Date().toISOString(),
          appointment_info: {
            date: formatDate(formData.date),
            time: formData.time || '',
            duration: formData.duration || 60, // Default to 60 minutes
            description: formData.description || '',
            contact_method: formData.contactMethod || 'videollamada'
          },
          amount: chargeAmount
        }
      };

      // Log the request payload (without sensitive data)
      const { payer, ...payloadWithoutPII } = payload;
      console.debug('Sending request to MercadoPago:', {
        ...payloadWithoutPII,
        payer: {
          ...payer,
          email: '[REDACTED]',
          phone: { ...payer.phone, number: '***' + (payer.phone?.number?.slice(-3) || '') }
        }
      });
      
      // Make the API request
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-mercado-pago-preference`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || ''
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        }
      );

      // Parse the response
      let responseData;
      try {
        responseData = await response.json();
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError);
        throw new Error('Error procesando la respuesta del servidor');
      }
      
      // Log the response
      console.debug('Response from Supabase Function:', {
        status: response.status,
        statusText: response.statusText,
        data: {
          ...responseData,
          init_point: responseData.init_point ? '[REDACTED]' : undefined,
          sandbox_init_point: responseData.sandbox_init_point ? '[REDACTED]' : undefined
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorDetails = responseData?.error?.details || responseData?.details;
        const errorMessage = responseData?.error?.message || 
                           responseData?.message || 
                           `Error del servidor: ${response.status} ${response.statusText}`;
                           
        console.error('Error details:', {
          status: response.status,
          statusText: response.statusText,
          error: responseData?.error,
          details: errorDetails
        });
        
        throw new Error(errorMessage);
      }

      // Save appointment data to local storage before redirect
      const appointmentData = {
        ...formData,
        paymentId: responseData.id || '',
        amount: chargeAmount,
        lawyerId,
        lawyerName,
        createdAt: new Date().toISOString()
      };
      
      localStorage.setItem('pendingAppointment', JSON.stringify(appointmentData));
      
      // Only use production URL
      const redirectUrl = responseData.init_point || responseData.url;
      if (redirectUrl) {
        const paymentUrl = new URL(redirectUrl);
        // Force production domain
        paymentUrl.hostname = 'www.mercadopago.cl';
        paymentUrl.protocol = 'https:';
        window.location.href = paymentUrl.toString();
        return;
      }
      
      throw new Error('No se recibió una URL de pago válida');
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      let errorMessage = 'Error al procesar el pago. Por favor, inténtalo de nuevo.';
      
      if (error instanceof Error) {
        console.error('Error al procesar el pago:', {
          name: error.name,
          message: error.message,
          stack: error.stack,
          cause: error.cause
        });
        
        if (error.name === 'AbortError') {
          errorMessage = 'La solicitud ha excedido el tiempo de espera. Por favor, verifica tu conexión e inténtalo de nuevo.';
        } else if (error.message.includes('network') || error.message.includes('conexión')) {
          errorMessage = 'Error de conexión. Por favor, verifica tu conexión a internet.';
        } else if (error.message) {
          errorMessage = error.message;
        }
      } else {
        console.error('Error desconocido al procesar el pago:', error);
      }
      
      setError(errorMessage);
      
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

  // Configuración de fechas - usar fecha local sin hora
  const getLocalDate = (date = new Date()) => {
    const localDate = new Date(date);
    return new Date(localDate.getFullYear(), localDate.getMonth(), localDate.getDate());
  };
  
  const today = getLocalDate();
  
  // Fecha mínima es hoy (sin importar la hora actual)
  const minDate = new Date(today);
  
  // Si hoy es domingo, comenzar desde mañana (lunes)
  if (minDate.getDay() === 0) {
    minDate.setDate(minDate.getDate() + 1);
  }
  
  // Formatear como YYYY-MM-DD para el input de fecha
  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const minDateString = formatDateForInput(minDate);

  // Fecha máxima: 90 días a partir de hoy
  const maxDate = new Date(today);
  maxDate.setDate(today.getDate() + 90);
  
  // Si la fecha máxima cae en domingo, retroceder al sábado
  if (maxDate.getDay() === 0) {
    maxDate.setDate(maxDate.getDate() - 1);
  }
  
  const maxDateString = formatDateForInput(maxDate);

  // Function to get the next valid day (not Sunday)
  const getNextValidDay = useCallback((date: Date): string => {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1); // Sumar 1 día
    
    // Si es domingo, sumar otro día para llegar al lunes
    if (nextDay.getDay() === 0) {
      nextDay.setDate(nextDay.getDate() + 1);
    }
    
    return formatDateForInput(nextDay);
  }, []);

  // Check if a date is a Sunday (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const isSunday = (dateString: string): boolean => {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCDay() === 0; // 0 is Sunday
  };

  // Handle date change with validation
  const handleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = e.target.value;
    
    // Verificar si la fecha seleccionada es domingo
    const [year, month, day] = selectedDate.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    
    if (date.getUTCDay() === 0) { // Si es domingo
      // Calcular la fecha del lunes siguiente
      date.setDate(date.getDate() + 1);
      const nextValidDate = formatDateForInput(date);
      
      // Usar setTimeout para asegurar que la actualización del DOM se complete
      setTimeout(() => {
        const dateInput = document.getElementById('date') as HTMLInputElement;
        if (dateInput) {
          dateInput.value = nextValidDate;
        }
      }, 0);
      
      // Actualizar el estado del formulario
      setFormData(prev => ({
        ...prev,
        date: nextValidDate
      }));
      
      // Mostrar notificación
      toast({
        title: "Domingo no disponible",
        description: `Hemos ajustado la fecha al lunes ${nextValidDate}.`,
        variant: "destructive"
      });
    } else {
      // Si no es domingo, actualizar normalmente
      setFormData(prev => ({
        ...prev,
        date: selectedDate
      }));
    }
  }, [toast]);

  // Función para verificar si una fecha debe estar deshabilitada
  const isDateDisabled = useCallback((date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Establecer a inicio del día actual
    
    // Deshabilitar si es domingo o es una fecha pasada
    return date < today || date.getDay() === 0;
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
      <DialogContent className="sm:max-w-[425px] md:max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="sticky top-0 bg-background z-10 py-4 px-6 border-b border-border/50">
          <Button
            type="button"
            variant="ghost"
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Cerrar</span>
          </Button>
          <DialogTitle>Solicitar asesoría con {lawyerName}</DialogTitle>
          <DialogDescription>
            Completa el formulario para agendar tu asesoría. Los campos con * son obligatorios.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 p-6 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre completo *</Label>
              <ValidatedInput
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                showCheckmark={!!formData.name}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono *</Label>
              <ValidatedInput
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                showCheckmark={!!formData.phone}
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico *</Label>
            <ValidatedInput
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              showCheckmark={!!formData.email}
              required
            />
          </div>
          
          <div className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Método de contacto *</Label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <input
                      type="radio"
                      id="llamada"
                      name="contactMethod"
                      value="llamada"
                      checked={formData.contactMethod === 'llamada'}
                      onChange={() => setFormData({ ...formData, contactMethod: 'llamada' })}
                      className="hidden peer"
                    />
                    <label 
                      htmlFor="llamada"
                      className={`flex flex-col items-center justify-center p-4 border rounded-lg cursor-pointer transition-colors ${
                        formData.contactMethod === 'llamada' 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <Phone className="h-6 w-6 mb-2 text-gray-700" />
                      <span className="text-sm font-medium">Llamada</span>
                    </label>
                  </div>
                  <div>
                    <input
                      type="radio"
                      id="videollamada"
                      name="contactMethod"
                      value="videollamada"
                      checked={formData.contactMethod === 'videollamada'}
                      onChange={() => setFormData({ ...formData, contactMethod: 'videollamada' })}
                      className="hidden peer"
                    />
                    <label 
                      htmlFor="videollamada"
                      className={`flex flex-col items-center justify-center p-4 border rounded-lg cursor-pointer transition-colors ${
                        formData.contactMethod === 'videollamada' 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <Video className="h-6 w-6 mb-2 text-gray-700" />
                      <span className="text-sm font-medium">Videollamada</span>
                    </label>
                  </div>
                  <div>
                    <input
                      type="radio"
                      id="presencial"
                      name="contactMethod"
                      value="presencial"
                      checked={formData.contactMethod === 'presencial'}
                      onChange={() => setFormData({ ...formData, contactMethod: 'presencial' })}
                      className="hidden peer"
                    />
                    <label 
                      htmlFor="presencial"
                      className={`flex flex-col items-center justify-center p-4 border rounded-lg cursor-pointer transition-colors ${
                        formData.contactMethod === 'presencial' 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 mb-2 text-gray-700">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                      </svg>
                      <span className="text-sm font-medium">Presencial</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {formData.contactMethod === 'presencial' && (
            <div className="space-y-2">
              <Label htmlFor="address">Dirección de la cita *</Label>
              <div className="relative">
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Ingresa la dirección para la cita"
                  className={cn(
                    "w-full pr-8 border focus:ring-0 focus:ring-offset-0 focus:shadow-none",
                    formData.address ? "border-green-500" : "border-gray-300"
                  )}
                  required
                />
                {formData.address && (
                  <Check className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-500" />
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Fecha *</Label>
              <div className="relative">
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={handleDateChange}
                  min={minDateString}
                  max={maxDateString}
                  className={cn(
                    "pl-10 w-full pr-8",
                    formData.date && "border-green-500 ring-0.5 ring-green-500"
                  )}
                  required
                />
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                {formData.date && (
                  <Check className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-500" />
                )}
              </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="time">Hora *</Label>
                <div className="relative">
                  <Select
                    value={formData.time}
                    onValueChange={(value) => handleSelectChange("time", value)}
                  >
                    <SelectTrigger className={cn(
                      "w-full",
                      formData.time && "border-green-500 ring-0.5 ring-green-500"
                    )}>
                      <SelectValue placeholder="Selecciona una hora" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((time) => {
                        const [hours, minutes] = time.split(':').map(Number);
                        const selectedDateObj = new Date(formData.date);
                        const slotDateTime = new Date(selectedDateObj);
                        slotDateTime.setHours(hours, minutes, 0, 0);
                        
                        // Verificar si la fecha seleccionada es hoy
                        const today = new Date();
                        const selectedDateStr = formData.date;
                        const [year, month, day] = selectedDateStr.split('-').map(Number);
                        
                        // Crear fecha de inicio del día seleccionado
                        const selectedDate = new Date(year, month - 1, day);
                        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                        
                        // Comparar fechas (sin horas)
                        const isToday = selectedDate.getTime() === todayStart.getTime();
                        
                        let isDisabled = false;
                        
                        // Solo deshabilitar horarios pasados si es el día actual
                        if (isToday) {
                          const now = new Date();
                          const currentHours = now.getHours();
                          const currentMinutes = now.getMinutes();
                          
                          // Deshabilitar solo si la hora ya pasó
                          isDisabled = hours < currentHours || 
                                     (hours === currentHours && minutes < currentMinutes);
                        }
                        
                        // Check if the time slot is already booked
                        const isBooked = bookedSlots.has(time);
                        
                        return (
                          <SelectItem 
                            key={time} 
                            value={time}
                            disabled={isDisabled || isBooked}
                            className={cn(
                              'px-4 py-2',
                              isBooked ? 'opacity-50 cursor-not-allowed' : '',
                              isBooked ? 'line-through' : '',
                              isDisabled ? 'opacity-50 cursor-not-allowed' : '',
                              '[&>span:first-child]:hidden [&>span:last-child]:block'
                            )}
                            title={isBooked ? 'Este horario ya está reservado' : ''}
                          >
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span>{time}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {formData.time && (
                    <Check 
                      className="absolute right-8 top-1/2 h-4 w-4 -translate-y-1/2 text-green-500" 
                      aria-hidden="true"
                      strokeWidth={3}
                    />
                  )}
                </div>
              </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Duración (minutos)</Label>
              <div className="relative">
                <Select value={formData.duration} onValueChange={(value) => handleSelectChange("duration", value)}>
                  <SelectTrigger className={cn(
                    formData.duration && "border-green-500 ring-0.5 ring-green-500"
                  )}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutos</SelectItem>
                    <SelectItem value="60">1 hora</SelectItem>
                    <SelectItem value="90">1.5 horas</SelectItem>
                    <SelectItem value="120">2 horas</SelectItem>
                  </SelectContent>
                </Select>
                {formData.duration && (
                  <Check 
                    className="absolute right-8 top-1/2 h-4 w-4 -translate-y-1/2 text-green-500" 
                    aria-hidden="true"
                    strokeWidth={3}
                  />
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="consultationType">Tipo de consulta *</Label>
              <div className="relative">
                <Select
                  value={formData.consultationType}
                  onValueChange={(value) => handleSelectChange("consultationType", value)}
                >
                  <SelectTrigger className={cn(
                    formData.consultationType && "border-green-500 ring-0.5 ring-green-500"
                  )}>
                    <SelectValue placeholder="Selecciona un tipo de consulta" />
                  </SelectTrigger>
                  <SelectContent>
                    {consultationTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.consultationType && (
                  <Check 
                    className="absolute right-8 top-1/2 h-4 w-4 -translate-y-1/2 text-green-500" 
                    aria-hidden="true"
                    strokeWidth={3}
                  />
                )}
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Descripción del caso</Label>
            <div className="relative">
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe brevemente el motivo de tu consulta"
                className={cn(
                  "min-h-[100px] pr-10",
                  formData.description && "border-green-500 ring-0.5 ring-green-500"
                )}
              />
              {formData.description && (
                <Check 
                  className="absolute right-3 top-3 h-4 w-4 text-green-500" 
                  aria-hidden="true"
                  strokeWidth={3}
                />
              )}
            </div>
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