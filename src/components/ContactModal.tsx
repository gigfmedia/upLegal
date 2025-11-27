import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext/clean/useAuth";
import { Check, Loader2, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { fetchPlatformSettings, getDefaultPlatformSettings } from "@/services/platformSettings";

// Helper function to format CLP
const formatCLP = (amount: number): string => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(amount);
};

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
  contactFeeClp?: number;
}

export function ContactModal({ isOpen, onClose, lawyerName, lawyerId, service, contactFeeClp = 0 }: ContactModalProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [hasUsedFirstConsultation, setHasUsedFirstConsultation] = useState(false);
  const [actualContactFee, setActualContactFee] = useState(contactFeeClp);
  const [platformSettings, setPlatformSettings] = useState(getDefaultPlatformSettings());
  const { toast } = useToast();
  const navigate = useNavigate();

  // Función para verificar el estado de la primera consulta
  const checkFirstConsultationStatus = useCallback(async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('consultations')
      .select('id')
      .eq('client_id', user.id)
      .eq('lawyer_id', lawyerId)
      .limit(1);

    if (!error && data && data.length > 0) {
      setHasUsedFirstConsultation(true);
    }
  }, [user, lawyerId]);

  // Función para obtener la tarifa de contacto actualizada
  const getUpdatedContactFee = useCallback(async () => {
    // SIEMPRE usar el contactFeeClp de las props primero
    if (contactFeeClp && contactFeeClp > 0) {
      setActualContactFee(contactFeeClp);
    } else {
      // Solo hacer fetch si no tenemos un precio válido de las props
      const { data: lawyerProfile, error: lawyerError } = await supabase
        .from('profiles')
        .select('contact_fee_clp')
        .eq('id', lawyerId)
        .single();

      if (!lawyerError && lawyerProfile?.contact_fee_clp) {
        setActualContactFee(lawyerProfile.contact_fee_clp);
      }
    }
  }, [contactFeeClp, lawyerId]);

  // SOLUCIÓN 2: Resetear estados cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      // Resetear y actualizar cuando el modal se abre
      setActualContactFee(contactFeeClp);
      setHasUsedFirstConsultation(false);
      
      // Volver a verificar todo
      const checkEverything = async () => {
        await checkFirstConsultationStatus();
        await getUpdatedContactFee();
      };
      
      if (user) {
        checkEverything();
      }
    }
  }, [isOpen, contactFeeClp, user, lawyerId, checkFirstConsultationStatus, getUpdatedContactFee]);

  // SOLUCIÓN 1: Sincronización adicional cuando cambian las props o el usuario
  useEffect(() => {
    if (user && isOpen) {
      // Verificar periódicamente si hay cambios
      checkFirstConsultationStatus();
      getUpdatedContactFee();
    }
  }, [user, lawyerId, contactFeeClp, isOpen, checkFirstConsultationStatus, getUpdatedContactFee]);

  // Load platform fee settings (public read policy allows this)
  useEffect(() => {
    let isMounted = true;
    fetchPlatformSettings()
      .then(settings => {
        if (isMounted) {
          setPlatformSettings(settings);
        }
      })
      .catch(error => {
        console.error('Failed to load platform settings for ContactModal:', error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Auto-fill user data cuando el componente monta o el usuario cambia
  useEffect(() => {
    if (user && isOpen) {
      const userData = user.user_metadata || {};
      const profile = userData.profile || {};
      const fullName = [
        profile.first_name || userData.first_name,
        profile.last_name || userData.last_name
      ].filter(Boolean).join(' ').trim() || userData.full_name || user.email?.split('@')[0] || '';
      
      setFormData(prev => ({
        ...prev,
        name: fullName,
        email: user.email || '',
        phone: profile.phone || userData.phone || '',
      }));
    }
  }, [user, isOpen]);

  // Calculate pricing details
  const pricing = useMemo(() => {
    const basePrice = actualContactFee;
    const isFirstConsultation = !hasUsedFirstConsultation;
    const discountRate = isFirstConsultation ? 0.4 : 0;
    const serviceFeeRate = platformSettings.client_surcharge_percent;

    const discountAmount = Math.round(basePrice * discountRate);
    const subtotal = Math.max(basePrice - discountAmount, 0);
    const serviceFee = Math.round(subtotal * serviceFeeRate);
    const total = subtotal + serviceFee;

    return {
      basePrice,
      isFirstConsultation,
      discountRate,
      discountAmount,
      subtotal,
      serviceFee,
      serviceFeeRate,
      total
    };
  }, [actualContactFee, hasUsedFirstConsultation, platformSettings.client_surcharge_percent]);

  // Check if field is valid
  const isFieldValid = (field: string) => {
    const value = formData[field as keyof typeof formData];
    if (!value) return false;
    
    switch (field) {
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      case 'phone':
        return /^\+?[0-9\s-]{8,}$/.test(value);
      case 'name':
        return value.trim().length >= 2;
      case 'subject':
        return value.trim().length >= 5;
      case 'message':
        return value.trim().length >= 10;
      default:
        return value.length > 0;
    }
  };
  
  const getInputClass = (field: string) => {
    const baseClass = "w-full mt-1 pr-10";
    if (!formData[field as keyof typeof formData]) return baseClass;
    return `${baseClass} ${isFieldValid(field) ? 'border-green-500 focus:ring-green-500 focus:border-green-500' : ''}`;
  };
  
  const renderFieldWithCheck = (field: string, label: string, type = 'text') => {
    const isValid = isFieldValid(field);
    return (
      <div className="relative">
        <Label htmlFor={field} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </Label>
        <div className="relative">
          <Input
            id={field}
            name={field}
            type={type}
            value={formData[field as keyof typeof formData]}
            onChange={handleChange}
            className={`${getInputClass(field)} ${isValid ? 'pr-10' : ''}`}
            readOnly={field === 'email' && !!user?.email}
          />
          {isValid && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <Check className="h-4 w-4 text-green-500" strokeWidth={3} />
            </div>
          )}
        </div>
      </div>
    );
  };

  // FUNCIONES QUE FALTABAN:

  const sendMessage = async (messageData: {
    lawyerId: string;
    senderId: string;
    senderName: string;
    senderEmail: string;
    senderPhone: string;
    subject: string;
    message: string;
    serviceId?: string;
    consultationId?: string;
  }) => {
    const messageContent = `
      Nombre: ${messageData.senderName}
      Email: ${messageData.senderEmail}
      Teléfono: ${messageData.senderPhone}
      Asunto: ${messageData.subject}
      
      Mensaje:
      ${messageData.message}
    `;

    const { data: lawyerUser, error: lawyerUserError } = await supabase
      .from('profiles')
      .select('id, user_id')
      .eq('id', messageData.lawyerId)
      .single();

    if (lawyerUserError || !lawyerUser) {
      console.error('Error al obtener el ID de usuario del abogado:', lawyerUserError);
      throw new Error('No se pudo encontrar la información del abogado');
    }

    const messagePayload = {
      sender_id: messageData.senderId,
      receiver_id: lawyerUser.user_id,
      content: messageContent,
      service_id: messageData.serviceId || null,
      consultation_id: messageData.consultationId || null,
      read: false,
      created_at: new Date().toISOString()
    };

    console.log('Enviando mensaje con datos:', messagePayload);

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([messagePayload])
        .select('*');

      return { data, error };
    } catch (error) {
      console.error('Error en sendMessage:', error);
      throw error;
    }
  };

  const createConsultation = async () => {
    if (!user) throw new Error('Usuario no autenticado');
    
    try {
      const { data: lawyerProfile, error: lawyerError } = await supabase
        .from('profiles')
        .select('contact_fee_clp')
        .eq('id', lawyerId)
        .single();

      if (lawyerError || !lawyerProfile) {
        console.error('Error fetching lawyer profile:', lawyerError);
        throw new Error('No se pudo obtener la información del abogado');
      }

      const consultationPrice = lawyerProfile.contact_fee_clp || contactFeeClp || 0;
      
      console.log('Creating consultation with data:', {
        client_id: user.id,
        lawyer_id: lawyerId,
        title: formData.subject || 'Nueva consulta',
        description: formData.message,
        status: 'pending',
        price: consultationPrice
      });
      
      const { data, error } = await supabase
        .from('consultations')
        .insert([{
          client_id: user.id,
          lawyer_id: lawyerId,
          title: formData.subject || 'Nueva consulta',
          description: formData.message,
          status: 'pending_payment',
          price: consultationPrice
        }])
        .select('*');

      if (error) {
        console.error('Error details from Supabase:', error);
        throw new Error(`No se pudo crear la consulta: ${error.message}`);
      }

      console.log('Consultation created successfully:', data);
      return data?.[0];
    } catch (error) {
      console.error('Error in createConsultation:', error);
      throw error;
    }
  };

  interface CreatePaymentParams {
    amount: number;
    originalAmount: number;
    userId: string;
    lawyerId: string;
    appointmentId: string;
    description: string;
    successUrl: string;
    failureUrl: string;
    pendingUrl: string;
    userEmail: string;
    userName: string;
  }

  const createPayment = async (paymentParams: CreatePaymentParams) => {
    try {
      const BACKEND_URL = 'https://uplegal.netlify.app/.netlify/functions/create-payment';
      
      console.log('Creating payment with params:', paymentParams);
      
      const response = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentParams)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Payment API error response:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const paymentResult = await response.json();
      console.log('Payment created successfully:', paymentResult);
      
      return paymentResult;
    } catch (error) {
      console.error('Error creating payment:', error);
      throw new Error(`Error al crear el pago: ${error.message}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para contactar al abogado.",
        variant: "destructive",
      });
      return;
    }

    // Validate required fields
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos obligatorios.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Create consultation first
      const consultation = await createConsultation();
      
      // Create payment with MercadoPago
      const paymentParams = {
        amount: pricing.total,
        originalAmount: pricing.subtotal,
        userId: user.id,
        lawyerId: lawyerId,
        appointmentId: consultation.id,
        description: service 
          ? `Consulta: ${service.title} con ${lawyerName}`
          : `Consulta legal con ${lawyerName}`,
        // Use fallback base URL if window.location.origin is empty
        successUrl: `${window.location.origin || 'https://uplegal.netlify.app'}/payment/success?appointmentId=${consultation.id}`,
        failureUrl: `${window.location.origin || 'https://uplegal.netlify.app'}/payment/failure?appointmentId=${consultation.id}`,
        pendingUrl: `${window.location.origin || 'https://uplegal.netlify.app'}/payment/pending?appointmentId=${consultation.id}`,
        userEmail: user.email || formData.email,
        userName: formData.name
      };

      // Validate URLs before sending
      if (!paymentParams.successUrl || !paymentParams.failureUrl || !paymentParams.pendingUrl) {
        throw new Error('Error al generar las URLs de retorno del pago');
      }

      console.log('Creating payment with params:', paymentParams);
      
      const paymentResult = await createPayment(paymentParams);
      
      // Send message after payment is created
      await sendMessage({
        lawyerId,
        senderId: user.id,
        senderName: formData.name,
        senderEmail: formData.email,
        senderPhone: formData.phone,
        subject: formData.subject,
        message: formData.message,
        serviceId: service?.id,
        consultationId: consultation.id
      });

      // Redirect to MercadoPago
      if (paymentResult.payment_link) {
        console.log('Redirecting to payment URL:', paymentResult.payment_link);
        window.location.href = paymentResult.payment_link;
      } else {
        throw new Error('No se pudo obtener el enlace de pago');
      }

    } catch (error) {
      console.error('Error al procesar el contacto:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo procesar el contacto. Por favor, inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleClose = () => {
    // Resetear el form cuando se cierra
    setFormData({
      name: "",
      email: "",
      phone: "",
      subject: "",
      message: ""
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[90vh] overflow-y-auto p-0 rounded-none sm:rounded-lg">
        <DialogHeader className="sticky top-0 bg-background z-10 py-4 px-6 border-b border-border/50">
          <Button
            type="button"
            variant="ghost"
            className="absolute right-4 top-4 px-2 h-8 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Cerrar</span>
          </Button>
          <DialogTitle className="text-left">
            {pricing.isFirstConsultation ? (
              <span>Contacta a {lawyerName}</span>
            ) : (
              `Contacta a ${lawyerName}`
            )}
          </DialogTitle>
          <DialogDescription className="text-left">
            {pricing.isFirstConsultation 
              ? `Aprovecha tu primera consulta con un 40% de descuento.`
              : `Completa el formulario para contactar al Abogado`}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 p-6 pt-4">
          <div className="space-y-4 px-1">
            {service && (
              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <h4 className="font-medium text-blue-800">{service.title}</h4>
                <p className="text-sm text-blue-700 mt-1">{service.description}</p>
                <p className="text-sm font-medium text-blue-900 mt-2">
                  Precio del servicio: {formatCLP(service.price_clp)}
                </p>
              </div>
            )}
            
            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderFieldWithCheck('name', 'Nombre completo')}
              {renderFieldWithCheck('phone', 'Teléfono', 'tel')}
            </div>
            {renderFieldWithCheck('email', 'Correo electrónico', 'email')}
            
            <div className="space-y-2">
              <Label htmlFor="subject" className="text-sm font-medium text-gray-700">
                Asunto
              </Label>
              <div className="relative">
                <Input
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  placeholder="Ej: Consulta sobre caso legal"
                  className={`w-full ${formData.subject && isFieldValid('subject') ? 'border-green-500 pr-10' : ''}`}
                  required
                />
                {formData.subject && isFieldValid('subject') && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <Check className="h-4 w-4 text-green-500" strokeWidth={3} />
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="message" className="text-sm font-medium text-gray-700">Mensaje</Label>
              <div className="relative">
                <Textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Describe tu consulta o caso legal aquí..."
                  className={`min-h-[120px] w-full ${formData.message && isFieldValid('message') ? 'border-green-500 pr-10' : ''}`}
                  required
                />
                {formData.message && isFieldValid('message') && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-start pt-3 pointer-events-none">
                    <Check className="h-4 w-4 text-green-500" strokeWidth={3} />
                  </div>
                )}
              </div>
            </div>

            {/* Pricing Details */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="space-y-2">
                {/* Tarifa por mensaje */}
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Tarifa por consulta</span>
                  <span className="font-medium">
                    {formatCLP(pricing.basePrice)}
                  </span>
                </div>

                {/* Descuento primera consulta */}
                {pricing.isFirstConsultation && (
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-medium text-gray-700">Descuento primera consulta (40%)</span>
                    <span className="font-medium text-green-600">-{formatCLP(pricing.discountAmount)}</span>
                  </div>
                )}

                {/* Subtotal */}
                <div className="border-t border-gray-200 my-2"></div>

                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Subtotal</span>
                  <span className="font-medium">{formatCLP(pricing.subtotal)}</span>
                </div>

                {/* Tarifa de servicio */}
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center">
                    <span className="text-gray-600">Tarifa por servicio</span>
                    <span className="ml-1 text-xs text-gray-500">*</span>
                  </div>
                  <span className="text-gray-600">
                    +{formatCLP(pricing.serviceFee)}
                  </span>
                </div>

                {/* Total a pagar */}
                <div className="border-t border-gray-200 my-1"></div>

                <div className="flex justify-between items-center">
                  <span className="text-base font-bold">Total a pagar</span>
                  <span className="text-xl font-bold text-blue-600">
                    {formatCLP(pricing.total)}
                  </span>
                </div>

                {/* Nota de recargo */}
                <p className="text-xs text-gray-500 mt-2">
                  * Incluye 10% de recargo por servicio app.
                </p>

                {pricing.isFirstConsultation && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-2">
                    <p className="text-xs text-green-800 text-center">
                      🎉 ¡Aprovecha tu 40% de descuento en esta primera consulta!
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose} className="min-w-[100px]">
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
                className="min-w-[180px] bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  `Pagar ${formatCLP(pricing.total)}`
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}