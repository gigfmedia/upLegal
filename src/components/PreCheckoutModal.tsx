import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  requires_quote: boolean;
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
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const { toast } = useToast();

  const isService = checkoutData.type === 'service';
  const requiresQuote = isService && checkoutData.requires_quote;

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
    if (isOpen) {
      loadSession();
      // form_start: fires when the guest checkout form first opens — tracks intent to complete booking
      window.gtag?.('event', 'form_start', {
        form_name: 'pre_checkout',
        lawyer_id: checkoutData.lawyer_id,
        booking_type: checkoutData.type,
      });
    }
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

    // Validar descripción para servicios que requieren cotización
    if (requiresQuote && !description.trim()) {
      toast({
        title: 'Descripción requerida',
        description: 'Por favor describe tu situación para que el abogado pueda cotizar',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Si requiere cotización, usar el endpoint de quote request
      if (requiresQuote) {
        const quotePayload = {
          lawyer_id: checkoutData.lawyer_id,
          service_id: checkoutData.service_id,
          service_title: checkoutData.service_title,
          user_id: sessionUserId || undefined,
          user_name: name,
          user_email: email,
          user_phone: phoneTrimmed || undefined,
          description: description.trim(),
        };

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/service-quote-request`,
          {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify(quotePayload),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Error al enviar la solicitud');
        }

        toast({
          title: 'Solicitud enviada',
          description: 'El abogado revisará tu caso y te enviará un presupuesto personalizado.',
        });

        onClose();
        setDescription('');
        setIsSubmitting(false);
        return;
      }

      // Flujo normal de booking para servicios fijos y citas
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
        throw new Error(data.message || data.error || 'Error al crear la reserva');
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

        // Save booking context so PaymentFailure can redirect back to pre-filled form
        const nameSlug = checkoutData.lawyer_name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
        const bookingUrl = checkoutData.type === 'appointment'
          ? `/booking/${nameSlug}-${checkoutData.lawyer_id}?date=${checkoutData.scheduled_date}&time=${checkoutData.scheduled_time}&duration=${checkoutData.duration}`
          : `/abogado/${nameSlug}-${checkoutData.lawyer_id}`;
        sessionStorage.setItem('mp_booking_redirect', bookingUrl);
        sessionStorage.setItem('mp_booking_price', String(checkoutData.price));

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
            {requiresQuote ? 'Solicitar evaluación' : (isService ? 'Solicitar servicio legal' : 'Agenda tu asesoría legal')}
          </DialogTitle>
          <DialogDescription>
            {requiresQuote
              ? 'Describe tu situación para que el abogado pueda evaluarte y enviar un presupuesto personalizado.'
              : (isService
                ? 'Completa tus datos para pagar de forma segura. El abogado recibirá tu solicitud una vez confirmado el pago.'
                : 'Estás a un paso de hablar con un abogado verificado en el Poder Judicial mediante videollamada.')}
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

          {requiresQuote && (
            <div className="space-y-2">
              <Label htmlFor="description">Describe tu situación *</Label>
              <Textarea
                id="description"
                placeholder="¿Hace cuánto están separados? ¿Existen hijos? ¿Existe acuerdo entre las partes? Cualquier otro antecedente importante."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
                required
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-gray-500">
                Cuéntanos brevemente tu situación para que podamos entregarte una cotización personalizada.
              </p>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm text-blue-800 space-y-1">
              <p className="font-medium">{summaryTitle}</p>
              <p>• Abogado: {checkoutData.lawyer_name}</p>
              {isService ? (
                <>
                  <p>• Entrega: {checkoutData.service_delivery_time || 'Según acuerdo'}</p>
                  {requiresQuote ? (
                    <>
                      <p>• Precio: Desde ${checkoutData.price.toLocaleString('es-CL')}</p>
                      <p className="text-xs text-blue-600 mt-2">
                        El valor definitivo depende de diversos factores jurídicos que deben ser evaluados por el abogado.
                      </p>
                    </>
                  ) : (
                    <>
                      {checkoutData.service_description && (
                        <p>• {checkoutData.service_description}</p>
                      )}
                      <p>• Total: ${checkoutData.price.toLocaleString('es-CL')}</p>
                    </>
                  )}
                </>
              ) : (
                <>
                  <p>• Fecha: {checkoutData.scheduled_date}</p>
                  <p>• Hora: {checkoutData.scheduled_time}</p>
                  <p>• Duración: {checkoutData.duration} minutos</p>
                  <p>• Total: ${checkoutData.price.toLocaleString('es-CL')}</p>
                </>
              )}
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
              requiresQuote ? 'Solicitar evaluación' : (isService ? 'Confirmar y pagar servicio' : 'Confirmar y pagar asesoría')
            )}
          </Button>

          {!requiresQuote && (
            <p className="text-sm text-gray-500 text-center">
              Serás redirigido a Mercado Pago para completar tu pago de forma segura.
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
