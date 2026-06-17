import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { logPaymentEvent } from '@/utils/paymentLogger';
import { supabase } from '@/lib/supabaseClient';

interface BookingData {
  lawyer_id: string;
  lawyer_name: string;
  scheduled_date: string;
  scheduled_time: string;
  duration: number;
  price: number;
}

interface PreCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingData: BookingData;
}

export default function PreCheckoutModal({ isOpen, onClose, bookingData }: PreCheckoutModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const { toast } = useToast();

  // Pre-fill fields and capture user_id if the user is already authenticated
  useEffect(() => {
    const loadSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setSessionUserId(session.user.id);
        if (!email) setEmail(session.user.email || '');
        if (!name) {
          const meta = session.user.user_metadata;
          const fullName = meta?.full_name || `${meta?.first_name || ''} ${meta?.last_name || ''}`.trim();
          if (fullName) setName(fullName);
        }
      }
    };
    if (isOpen) loadSession();
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim()) {
      toast({
        title: 'Campos requeridos',
        description: 'Por favor completa todos los campos',
        variant: 'destructive'
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: 'Email inválido',
        description: 'Por favor ingresa un email válido',
        variant: 'destructive'
      });
      return;
    }

    // Validar teléfono si se ingresó (opcional pero debe ser válido)
    const phoneTrimmed = phone.trim();
    if (phoneTrimmed) {
      // Acepta formatos chilenos: +569XXXXXXXX, 569XXXXXXXX, 9XXXXXXXX, 09XXXXXXXX
      const phoneRegex = /^(\+?56)?0?9\d{8}$/;
      if (!phoneRegex.test(phoneTrimmed.replace(/\s/g, ''))) {
        toast({
          title: 'Teléfono inválido',
          description: 'Ingresa un número chileno válido, ej: 912345678',
          variant: 'destructive'
        });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Create booking via API
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/bookings/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          lawyer_id: bookingData.lawyer_id,
          user_id: sessionUserId || undefined,
          user_email: email,
          user_name: name,
          user_phone: phoneTrimmed || undefined,   // WhatsApp para seguimiento de abandono
          scheduled_date: bookingData.scheduled_date,
          scheduled_time: bookingData.scheduled_time,
          duration: bookingData.duration,
          price: bookingData.price
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear la reserva');
      }

      // lead_created: Se dispara SOLO después de que el backend confirmó exitosamente la creación
      // de la reserva. Nunca antes de la respuesta del servidor.
      // Representa que el usuario completó el formulario de contacto y el lead fue registrado.
      window.gtag?.('event', 'lead_created', {
        lawyer_id: bookingData.lawyer_id,
        duration: bookingData.duration,
        price: bookingData.price
      });

      // Guardar lead_id en sessionStorage para poder marcar el lead como 'paid'
      // en BookingSuccessPage después de que Mercado Pago confirme el pago.
      if (data.lead_id) {
        sessionStorage.setItem('pending_lead_id', data.lead_id);
      }

      // Redirect to MercadoPago payment
      if (data.payment_link) {
        // Log payment started event
        await logPaymentEvent({
          event_type: 'started',
          appointment_id: data.booking_id,
          amount: bookingData.price,
          metadata: {
            lawyer_id: bookingData.lawyer_id,
            duration: bookingData.duration,
            source: 'PreCheckoutModal'
          }
        });

        // begin_checkout: Se dispara SOLO cuando el servidor retornó un payment_link válido
        // y justo antes de redirigir al usuario a Mercado Pago. Nunca antes.
        window.gtag?.('event', 'begin_checkout', {
          booking_id: data.booking_id,
          value: bookingData.price,
          currency: 'CLP',
          items: [{
            item_id: data.booking_id,
            item_name: `Asesoría con ${bookingData.lawyer_name}`,
            price: bookingData.price,
            quantity: 1
          }]
        });

        window.location.href = data.payment_link;
      } else {
        throw new Error('No se recibió el link de pago');
      }

    } catch (error) {
      console.error('Error creating booking:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo crear la reserva',
        variant: 'destructive'
      });
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirma tu asesoría legal</DialogTitle>
          <DialogDescription>
            Estás a un paso de hablar con un abogado verificado por el <strong>Poder Judicial</strong> por videollamada.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre completo</Label>
            <div className="relative">
              {/* <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" /> */}
              <Input
                id="name"
                type="text"
                placeholder="Juan Pérez"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Input
                id="email"
                type="email"
                placeholder="juan@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-green-700" />
              WhatsApp
              <span className="text-xs text-gray-400 font-normal">(opcional)</span>
            </Label>
            <div className="relative">
              <Input
                id="phone"
                type="tel"
                placeholder="912 345 678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={isSubmitting}
                inputMode="numeric"
              />
            </div>
            <p className="text-xs text-gray-500">
              Si no completas el pago te contactamos para ayudarte.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm text-blue-800 space-y-1">
              <p className="font-medium">Resumen de tu asesoría:</p>
              <p>• Abogado: {bookingData.lawyer_name}</p>
              <p>• Duración: {bookingData.duration} minutos</p>
              <p>• Total: ${bookingData.price.toLocaleString('es-CL')}</p>
              <p>• Reembolso si el abogado no asiste</p>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-gray-900 hover:bg-green-900"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              'Confirmar y pagar asesoría'
            )}
          </Button>

          <p className="text-sm text-gray-500 text-center">
            Al continuar, serás redirigido a MercadoPago para completar el pago de forma segura
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
