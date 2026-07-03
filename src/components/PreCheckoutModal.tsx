import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { logPaymentEvent } from '@/utils/paymentLogger';
import { supabase } from '@/lib/supabaseClient';

export interface AppointmentCheckoutData {
  type: 'appointment';
  lawyer_id: string;
  lawyer_name: string;
  scheduled_date: string;
  scheduled_time: string;
  duration: number;
  price: number;
}

export interface ServiceCheckoutData {
  type: 'service';
  lawyer_id: string;
  lawyer_name: string;
  service_id: string;
  service_title: string;
  service_description: string;
  service_delivery_time: string;
  price: number;
  requires_meeting: boolean;
}

export type CheckoutData = AppointmentCheckoutData | ServiceCheckoutData;

interface PreCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  checkoutData: CheckoutData;
}

export default function PreCheckoutModal({ isOpen, onClose, checkoutData }: PreCheckoutModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const { toast } = useToast();

  const isService = checkoutData.type === 'service';

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
        variant: 'destructive',
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: 'Email inválido',
        description: 'Por favor ingresa un email válido',
        variant: 'destructive',
      });
      return;
    }

    const phoneTrimmed = phone.trim();
    if (phoneTrimmed) {
      const phoneRegex = /^(\+?56)?0?9\d{8}$/;
      if (!phoneRegex.test(phoneTrimmed.replace(/\s/g, ''))) {
        toast({
          title: 'Teléfono inválido',
          description: 'Ingresa un número chileno válido, ej: 912345678',
          variant: 'destructive',
        });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const payload =
        checkoutData.type === 'service'
          ? {
            lawyer_id: checkoutData.lawyer_id,
            user_id: sessionUserId || undefined,
            user_email: email,
            user_name: name,
            user_phone: phoneTrimmed || undefined,
            price: checkoutData.price,
            booking_type: 'service',
            service_id: checkoutData.service_id,
            service_title: checkoutData.service_title,
            service_description: checkoutData.service_description,
            service_delivery_time: checkoutData.service_delivery_time,
            requires_meeting: checkoutData.requires_meeting,
          }
          : {
            lawyer_id: checkoutData.lawyer_id,
            user_id: sessionUserId || undefined,
            user_email: email,
            user_name: name,
            user_phone: phoneTrimmed || undefined,
            scheduled_date: checkoutData.scheduled_date,
            scheduled_time: checkoutData.scheduled_time,
            duration: checkoutData.duration,
            price: checkoutData.price,
            booking_type: 'appointment',
          };

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/bookings/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Error al crear la reserva');
      }

      window.gtag?.('event', 'lead_created', {
        lawyer_id: checkoutData.lawyer_id,
        price: checkoutData.price,
        booking_type: checkoutData.type,
      });

      if (data.lead_id) {
        sessionStorage.setItem('pending_lead_id', data.lead_id);
      }

      if (data.payment_link) {
        await logPaymentEvent({
          event_type: 'started',
          appointment_id: data.booking_id,
          amount: checkoutData.price,
          metadata: {
            lawyer_id: checkoutData.lawyer_id,
            source: isService ? 'ServicePreCheckoutModal' : 'PreCheckoutModal',
            booking_type: checkoutData.type,
          },
        });

        window.gtag?.('event', 'begin_checkout', {
          booking_id: data.booking_id,
          value: checkoutData.price,
          currency: 'CLP',
          items: [{
            item_id: data.booking_id,
            item_name: isService
              ? checkoutData.service_title
              : `Asesoría con ${checkoutData.lawyer_name}`,
            price: checkoutData.price,
            quantity: 1,
          }],
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
        variant: 'destructive',
      });
      setIsSubmitting(false);
    }
  };

  const summaryTitle = isService ? checkoutData.service_title : 'Resumen de tu asesoría';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isService ? 'Solicitar servicio legal' : 'Agenda tu asesoría legal'}
          </DialogTitle>
          <DialogDescription>
            {isService
              ? 'Completa tus datos para pagar de forma segura. El abogado recibirá tu solicitud una vez confirmado el pago.'
              : 'Estás a un paso de hablar con un abogado verificado en el Poder Judicial mediante videollamada.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre completo</Label>
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

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
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

          <div className="space-y-2">
            <Label htmlFor="phone">WhatsApp</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="912 345 678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={isSubmitting}
              inputMode="numeric"
            />
            <p className="text-xs text-gray-500">
              Si surge algún problema con tu solicitud, podremos contactarte por WhatsApp.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm text-blue-800 space-y-1">
              <p className="font-medium">{summaryTitle}</p>
              <p>• Abogado: {checkoutData.lawyer_name}</p>
              {isService ? (
                <>
                  <p>• Entrega: {checkoutData.service_delivery_time || 'Según acuerdo'}</p>
                  {checkoutData.service_description && (
                    <p>• {checkoutData.service_description}</p>
                  )}
                </>
              ) : (
                <>
                  <p>• Fecha: {checkoutData.scheduled_date}</p>
                  <p>• Hora: {checkoutData.scheduled_time}</p>
                  <p>• Duración: {checkoutData.duration} minutos</p>
                </>
              )}
              <p>• Total: ${checkoutData.price.toLocaleString('es-CL')}</p>
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
              isService ? 'Confirmar y pagar servicio' : 'Confirmar y pagar asesoría'
            )}
          </Button>

          <p className="text-sm text-gray-500 text-center">
            Serás redirigido a Mercado Pago para completar tu pago de forma segura.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
