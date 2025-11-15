import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext/clean/useAuth";
import { Check, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

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
  hasFreeConsultation?: boolean;
  contactFeeClp?: number;
}

export function ContactModal({ isOpen, onClose, lawyerName, lawyerId, service, hasFreeConsultation = false, contactFeeClp = 0 }: ContactModalProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: hasFreeConsultation ? "Primera consulta" : "",
    message: hasFreeConsultation ? "Me gustaría agendar una primera consulta gratuita" : ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [hasUsedFreeConsultation, setHasUsedFreeConsultation] = useState(false);
  const [actualContactFee, setActualContactFee] = useState(contactFeeClp);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Check if user has already used their free consultation with this lawyer and get contact fee
  useEffect(() => {
    const checkFreeConsultationAndFee = async () => {
      if (!user) return;
      
      // Check free consultation usage
      const { data, error } = await supabase
        .from('consultations')
        .select('id')
        .eq('client_id', user.id)
        .eq('lawyer_id', lawyerId)
        .eq('is_free_consultation', true)
        .limit(1);

      if (!error && data && data.length > 0) {
        setHasUsedFreeConsultation(true);
      }

      // Get the actual contact fee from the lawyer's profile
      const { data: lawyerProfile, error: lawyerError } = await supabase
        .from('profiles')
        .select('contact_fee_clp')
        .eq('id', lawyerId)
        .single();

      if (!lawyerError && lawyerProfile) {
        setActualContactFee(lawyerProfile.contact_fee_clp || contactFeeClp || 0);
      }
    };

    checkFreeConsultationAndFee();
  }, [user, lawyerId, contactFeeClp]);

  // Auto-fill user data when component mounts or user changes
  useEffect(() => {
    if (user) {
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
        subject: hasFreeConsultation ? "Primera consulta" : prev.subject,
        message: hasFreeConsultation ? "Me gustaría agendar una primera consulta gratuita" : prev.message
      }));
    }
  }, [user]);
  
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
        return value.trim().length >= 5; // Mínimo 5 caracteres para el asunto
      case 'message':
        return value.trim().length >= 10; // Mínimo 10 caracteres para el mensaje
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

  const sendMessage = async (messageData: {
    lawyerId: string;  // Este es el ID del perfil del abogado
    senderId: string;  // ID del usuario que envía el mensaje
    senderName: string;
    senderEmail: string;
    senderPhone: string;
    subject: string;
    message: string;
    serviceId?: string;
    consultationId?: string;
  }) => {
    // Construir el mensaje según la estructura de la tabla
    const messageContent = `
      Nombre: ${messageData.senderName}
      Email: ${messageData.senderEmail}
      Teléfono: ${messageData.senderPhone}
      Asunto: ${messageData.subject}
      
      Mensaje:
      ${messageData.message}
    `;

    // Primero, obtener el ID de usuario del perfil del abogado
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
      sender_id: messageData.senderId,  // ID del usuario que envía
      receiver_id: lawyerUser.user_id,   // ID de usuario del abogado
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

  const createConsultation = async (isFree: boolean) => {
    if (!user) throw new Error('Usuario no autenticado');
    
    try {
      // First, get the lawyer's profile to ensure we have the latest contact_fee_clp
      const { data: lawyerProfile, error: lawyerError } = await supabase
        .from('profiles')
        .select('contact_fee_clp')
        .eq('id', lawyerId)
        .single();

      if (lawyerError || !lawyerProfile) {
        console.error('Error fetching lawyer profile:', lawyerError);
        throw new Error('No se pudo obtener la información del abogado');
      }

      // Use the contact_fee_clp from the profile, fallback to the prop if not available
      const consultationPrice = lawyerProfile.contact_fee_clp || contactFeeClp || 0;
      
      console.log('Creating consultation with data:', {
        client_id: user.id,
        lawyer_id: lawyerId,
        title: formData.subject || 'Nueva consulta',
        description: formData.message,
        status: 'pending',
        is_free: isFree,
        price: consultationPrice
      });
      
      const { data, error } = await supabase
        .from('consultations')
        .insert([{
          client_id: user.id,
          lawyer_id: lawyerId,
          title: formData.subject || 'Nueva consulta',
          description: formData.message,
          status: 'pending',
          is_free: isFree,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para enviar un mensaje.",
        variant: "destructive",
      });
      return;
    }

    // For non-free consultations or if user has already used their free consultation with this lawyer
    const needsPayment = (!hasFreeConsultation || hasUsedFreeConsultation) && actualContactFee > 0;
    
    if (needsPayment) {
      try {
        setIsLoading(true);
        
        // Get the latest contact fee from the profile
        const { data: lawyerProfile, error: lawyerError } = await supabase
          .from('profiles')
          .select('contact_fee_clp')
          .eq('id', lawyerId)
          .single();

        if (lawyerError || !lawyerProfile) {
          throw new Error('No se pudo obtener la información del abogado');
        }

        const originalAmount = lawyerProfile.contact_fee_clp || actualContactFee || contactFeeClp || 0;
        
        // Calculate fees: 20% platform fee, 10% client surcharge
        const platformFee = Math.round(originalAmount * 0.2); // 20% of original amount
        const clientSurcharge = Math.round(originalAmount * 0.1); // 10% surcharge to client
        const clientAmount = Math.round(originalAmount * 1.1); // Amount client pays (original + 10%)
        const lawyerAmount = originalAmount - platformFee; // Amount lawyer receives (original - 20%)
        
        // 1. First create the consultation record
        const consultationTitle = service 
          ? `Consulta: ${service.title}`
          : formData.subject || 'Consulta legal';
        
        const consultationDescription = service
          ? `[Servicio: ${service.title}]\n\n${formData.message}`
          : formData.message;
        
        const { data: consultation, error: consultationError } = await supabase
          .from('consultations')
          .insert([{
            client_id: user.id,
            lawyer_id: lawyerId,
            title: consultationTitle,
            description: consultationDescription,
            status: 'pending',
            is_free: false,
            price: originalAmount
          }])
          .select()
          .single();

        if (consultationError) throw consultationError;

        // 2. Create payment record with fees
        // Get lawyer's user_id from profile
        const { data: lawyerProfileFull, error: lawyerProfileError } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('id', lawyerId)
          .single();

        if (lawyerProfileError || !lawyerProfileFull) {
          throw new Error('No se pudo obtener el ID de usuario del abogado');
        }

        const { data: payment, error: paymentError } = await supabase
          .from('payments')
          .insert({
            user_id: user.id,
            lawyer_id: lawyerProfileFull.user_id,
            amount: clientAmount, // Amount with surcharge
            platform_fee: platformFee,
            lawyer_amount: lawyerAmount,
            currency: 'CLP',
            status: 'pending',
            metadata: {
              type: 'contact_fee',
              consultation_id: consultation.id,
              original_amount: originalAmount,
              client_surcharge: clientSurcharge,
              service_id: service?.id || null
            }
          })
          .select()
          .single();

        if (paymentError) {
          console.error('Error creating payment record:', paymentError);
          // Continue anyway, but log the error
        }

        // 3. Create Mercado Pago preference
        // Use production URL for back_urls (MercadoPago requires accessible URLs)
        // For localhost, use a public URL or remove auto_return
        const baseUrl = window.location.origin;
        const isLocalhost = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');
        
        // Use production URL if available, otherwise use localhost (but remove auto_return for localhost)
        const productionUrl = import.meta.env.VITE_APP_URL || 'https://uplegal.netlify.app';
        const finalBaseUrl = isLocalhost ? productionUrl : baseUrl;
        
        const successUrl = `${finalBaseUrl}/payment-success?consultation_id=${consultation.id}`;
        const failureUrl = `${finalBaseUrl}/payment/failure?consultation_id=${consultation.id}`;
        const pendingUrl = `${finalBaseUrl}/payment-canceled?consultation_id=${consultation.id}`;
        
        const mpPayload: {
          items: Array<{
            id: string;
            title: string;
            quantity: number;
            currency_id: string;
            unit_price: number;
            description: string;
          }>;
          external_reference: string;
          back_urls: {
            success: string;
            failure: string;
            pending: string;
          };
          auto_return?: string;
          binary_mode: boolean;
          statement_descriptor: string;
          metadata: Record<string, unknown>;
          notification_url?: string;
        } = {
          items: [{
            id: `consulta-${consultation.id}`,
            title: service 
              ? `Consulta: ${service.title}`.substring(0, 100)
              : `Consulta con ${lawyerName}`.substring(0, 100),
            quantity: 1,
            currency_id: 'CLP',
            unit_price: clientAmount, // Client pays amount with surcharge
            description: (formData.subject || 'Consulta legal').substring(0, 255),
          }],
          external_reference: payment?.id || `consulta-${consultation.id}`,
          back_urls: {
            success: successUrl,
            failure: failureUrl,
            pending: pendingUrl
          },
          // Only use auto_return if URLs are accessible (not localhost)
          ...(!isLocalhost && { auto_return: 'approved' }),
          binary_mode: true,
          statement_descriptor: 'UPLEGAL',
          metadata: {
            type: 'legal_consultation',
            consultation_id: consultation.id,
            lawyer_id: lawyerId,
            client_id: user.id,
            service_id: service?.id || null,
            payment_id: payment?.id || null,
            original_amount: originalAmount,
            platform_fee: platformFee,
            client_surcharge: clientSurcharge,
            lawyer_amount: lawyerAmount
          }
        };

        // Add notification_url only if it's defined
        if (import.meta.env.VITE_SUPABASE_URL) {
          mpPayload.notification_url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mercado-pago-webhook`;
        }
        
        // 3. Send request to Mercado Pago
        if (!import.meta.env.VITE_MERCADOPAGO_ACCESS_TOKEN) {
          throw new Error('Token de acceso de MercadoPago no configurado');
        }

        const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_MERCADOPAGO_ACCESS_TOKEN}`
          },
          body: JSON.stringify(mpPayload)
        });
        
        const preference = await response.json();
        
        if (!response.ok) {
          console.error('Error de MercadoPago:', {
            status: response.status,
            error: preference.error,
            message: preference.message,
            cause: preference.cause
          });
          throw new Error(preference.message || preference.error || 'Error al crear la preferencia de pago');
        }
        
        if (!preference.id) {
          console.error('Respuesta inválida de MercadoPago:', preference);
          throw new Error('La respuesta de MercadoPago no incluye un ID de preferencia');
        }

        // 4. Update payment record with MercadoPago preference ID if payment was created
        if (payment?.id) {
          await supabase
            .from('payments')
            .update({
              metadata: {
                ...payment.metadata,
                mercadopago_preference_id: preference.id
              }
            })
            .eq('id', payment.id);
        }

        // 5. Save consultation data for callback handling
        const consultationData = {
          ...formData,
          paymentId: payment?.id || preference.id,
          preferenceId: preference.id,
          amount: originalAmount,
          clientAmount: clientAmount,
          platformFee: platformFee,
          lawyerAmount: lawyerAmount,
          lawyerId,
          lawyerName,
          consultationId: consultation.id,
          clientId: user.id,
          clientName: formData.name,
          clientEmail: formData.email,
          subject: formData.subject,
          message: formData.message,
          createdAt: new Date().toISOString()
        };
        
        // 6. Get redirect URL from preference response
        // MercadoPago returns init_point (production) or sandbox_init_point (sandbox)
        let redirectUrl = preference.init_point || preference.sandbox_init_point;
        
        // If no init_point, construct the URL manually
        if (!redirectUrl && preference.id) {
          // Determine if we're in production or sandbox based on token
          const accessToken = import.meta.env.VITE_MERCADOPAGO_ACCESS_TOKEN || '';
          const isProduction = !accessToken.startsWith('TEST-');
          
          if (isProduction) {
            redirectUrl = `https://www.mercadopago.cl/checkout/v1/redirect?pref_id=${preference.id}`;
          }
        }
        
        if (!redirectUrl) {
          console.error('No se pudo obtener URL de redirección');
          throw new Error('No se pudo obtener la URL de redirección de MercadoPago');
        }
        
        // 7. Save data to localStorage for callback handling
        localStorage.setItem('pendingConsultation', JSON.stringify(consultationData));
        
        // 8. Close the modal
        onClose();
        
        // 9. Redirect to MercadoPago (use setTimeout to ensure modal closes first)
        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 150);
      } catch (error) {
        console.error('Error al procesar el pago:', error);
        toast({
          title: "Error",
          description: "Hubo un error al procesar el pago. Por favor, inténtalo de nuevo.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
    }

    // Verificar que el token de autenticación esté presente
    const session = await supabase.auth.getSession();
    if (!session.data.session) {
      toast({
        title: "Error de autenticación",
        description: "La sesión ha expirado. Por favor, inicia sesión nuevamente.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Verificar que el ID del abogado existe
      const { data: lawyerData, error: lawyerError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', lawyerId)
        .single();

      if (lawyerError || !lawyerData) {
        throw new Error('No se pudo encontrar el perfil del abogado. Por favor, inténtalo de nuevo.');
      }

      // Preparar el mensaje con los detalles del servicio si está disponible
      const messageDetails = service 
        ? `\n\nServicio de interés: ${service.title}\nPrecio: ${new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            minimumFractionDigits: 0,
          }).format(service.price_clp)}`
        : '';
      
      const fullMessage = `${formData.message}${messageDetails}`;
      
      // 1. Crear la consulta en la base de datos
      const isFree = hasFreeConsultation && !hasUsedFreeConsultation;
      const consultation = await createConsultation(isFree);
      
      // 2. Enviar mensaje a la base de datos
      const { data: messageData, error: messageError } = await sendMessage({
        lawyerId,
        senderId: user.id,
        senderName: formData.name,
        senderEmail: formData.email,
        senderPhone: formData.phone,
        subject: formData.subject || (service ? `Consulta sobre servicio: ${service.title}` : "Nueva consulta"),
        message: fullMessage,
        serviceId: service?.id,
        consultationId: consultation.id
      });

      if (messageError) {
        console.error('Error al enviar mensaje:', messageError);
        throw new Error(messageError.message || 'Error al enviar el mensaje');
      }

      // Obtenemos el user_id del perfil del abogado
      const { data: lawyerProfile, error: lawyerProfileError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .eq('id', lawyerId)
        .single();

      if (lawyerProfileError || !lawyerProfile) {
        console.error('Error al obtener perfil del abogado:', lawyerProfileError);
        throw new Error('No se pudo obtener la información del perfil del abogado');
      }

      // Obtenemos el email del abogado usando la función de borde
      const { data: emailData, error: emailError } = await supabase.functions.invoke('get-user-email', {
        body: { userId: lawyerProfile.user_id }
      });
      
      if (emailError || !emailData?.email) {
        console.error('Error al obtener email del abogado:', emailError);
        throw new Error('No se pudo obtener el correo del abogado');
      }
      
      const lawyerEmail = emailData.email;

      // El email de notificación se enviará después del pago exitoso a través del webhook
      // o del callback de pago exitoso
      
      // Reiniciar formulario
      setFormData({
        name: "",
        email: "",
        phone: "",
        subject: service ? `Consulta sobre servicio: ${service.title}` : "",
        message: ""
      });
      
      onClose();
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo enviar el mensaje. Por favor, inténtalo de nuevo.",
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
            {hasFreeConsultation ? (
              <span>Primera consulta con {lawyerName} <span className="text-green-600">¡Gratis!</span></span>
            ) : (
              `Contactar a ${lawyerName}`
            )}
          </DialogTitle>
          {hasFreeConsultation && (
            <p className="text-sm text-muted-foreground">
              Aprovecha tu primera consulta sin costo para discutir tu caso con {lawyerName.split(' ')[0]}.
            </p>
          )}
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4 px-1">
            {service && (
              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <h4 className="font-medium text-blue-800">{service.title}</h4>
                <p className="text-sm text-blue-700 mt-1">{service.description}</p>
                {!hasFreeConsultation && (
                  <p className="text-sm font-medium text-blue-900 mt-2">
                    Precio: {new Intl.NumberFormat('es-CL', {
                      style: 'currency',
                      currency: 'CLP',
                      minimumFractionDigits: 0,
                    }).format(service.price_clp)}
                  </p>
                )}
              </div>
            )}

            {/* Mostrar precio de consulta cuando hay servicio pero también hay tarifa de contacto */}
            {service && (!hasFreeConsultation || hasUsedFreeConsultation) && actualContactFee > 0 && (
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-amber-900">Tarifa por contactar</p>
                    <p className="text-xs text-amber-600 mt-1">Incluye 10% de recargo por procesamiento</p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-semibold text-amber-900">
                      {formatCLP(Math.round(actualContactFee * 1.1))}
                    </p>
                    <p className="text-xs text-amber-700 line-through">
                      {formatCLP(actualContactFee)}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderFieldWithCheck('name', 'Nombre completo')}
              {renderFieldWithCheck('phone', 'Teléfono', 'tel')}
            </div>
            {renderFieldWithCheck('email', 'Correo electrónico', 'email')}
            
            <div className="space-y-2">
              <Label htmlFor="subject" className="text-sm font-medium text-gray-700">
                {hasFreeConsultation ? 'Asunto (opcional)' : 'Asunto'}
              </Label>
              <div className="relative">
                <Input
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  placeholder={hasFreeConsultation ? 'Primera consulta' : 'Ej: Consulta sobre servicio legal'}
                  className={`w-full ${formData.subject && isFieldValid('subject') ? 'border-green-500 pr-10' : ''}`}
                  required={!hasFreeConsultation}
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
                  placeholder="Escribe tu mensaje aquí..."
                  className={`min-h-[120px] w-full mb-4 ${formData.message && isFieldValid('message') ? 'border-green-500 pr-10' : ''}`}
                  required
                />
                {formData.message && isFieldValid('message') && (
                  <div className="absolute top-3 right-3">
                    <Check className="h-4 w-4 text-green-500" strokeWidth={3} />
                  </div>
                )}
              </div>

              {/* Mostrar precio de consulta cuando no es gratuita */}
              {(!hasFreeConsultation || hasUsedFreeConsultation) && actualContactFee > 0 && !service && (
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium pt-1">Costo estimado:</span>
                      <p className="text-xs text-amber-700 mt-1">Se te redirigirá a MercadoPago para completar el pago</p>
                      <p className="text-xs text-amber-600 mt-1">Incluye 10% de recargo por procesamiento</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-black-600 block">
                        {formatCLP(Math.round(actualContactFee * 1.1))}
                      </p>
                      <p className="text-sm text-gray-600 line-through">
                        {formatCLP(actualContactFee)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
                className={`min-w-[180px] ${!hasFreeConsultation || hasUsedFreeConsultation ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {hasFreeConsultation && !hasUsedFreeConsultation ? 'Enviando...' : 'Procesando...'}
                  </>
                ) : hasFreeConsultation && !hasUsedFreeConsultation ? (
                  'Enviar consulta gratuita'
                ) : (
                  <>
                    Pagar {actualContactFee > 0 ? formatCLP(Math.round(actualContactFee * 1.1)) : 'consulta'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}