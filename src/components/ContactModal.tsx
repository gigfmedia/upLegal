import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext/clean/useAuth";
import { Check, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

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
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

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
        phone: profile.phone || userData.phone || ''
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
      
      // 1. Enviar mensaje a la base de datos
      const { data: messageData, error: messageError } = await sendMessage({
        lawyerId,
        senderId: user.id,
        senderName: formData.name,
        senderEmail: formData.email,
        senderPhone: formData.phone,
        subject: formData.subject || (service ? `Consulta sobre servicio: ${service.title}` : "Nueva consulta"),
        message: fullMessage,
        serviceId: service?.id
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

      // 3. Enviar notificación por correo
      try {
        const { error: emailError } = await supabase.functions.invoke('send-message-notification', {
          body: {
            message: fullMessage,
            lawyerEmail: lawyerEmail,
            clientName: formData.name,
            subject: formData.subject || `Nuevo mensaje de ${formData.name}`
          }
        });

        if (emailError) {
          console.error('Error al enviar notificación por correo:', emailError);
          // No lanzamos error para no fallar el envío del mensaje
          toast({
            title: "Atención",
            description: "El mensaje se envió correctamente, pero hubo un problema al notificar al abogado por correo.",
            variant: "default",
          });
        }
      } catch (emailError) {
        console.error('Excepción al enviar notificación por correo:', emailError);
        // Continuamos aunque falle el correo
      }
      
      // Mostrar mensaje de éxito
      toast({
        title: "Mensaje enviado",
        description: `Tu consulta ha sido enviada a ${lawyerName}. Te contactarán pronto.`,
      });
      
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
          <div className="space-y-4 px-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderFieldWithCheck('name', 'Nombre completo')}
              {renderFieldWithCheck('phone', 'Teléfono', 'tel')}
            </div>
            {renderFieldWithCheck('email', 'Correo electrónico', 'email')}
            
            <div className="space-y-2">
              <Label htmlFor="subject" className="text-sm font-medium text-gray-700">Asunto</Label>
              <div className="relative">
                <Input
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  placeholder="Ej: Consulta sobre servicio legal"
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
                  placeholder="Escribe tu mensaje aquí..."
                  className={`min-h-[120px] w-full ${formData.message && isFieldValid('message') ? 'border-green-500 pr-10' : ''}`}
                  required
                />
                {formData.message && isFieldValid('message') && (
                  <div className="absolute top-3 right-3">
                    <Check className="h-4 w-4 text-green-500" strokeWidth={3} />
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar mensaje'
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}