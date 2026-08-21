import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShieldCheck, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { logPaymentEvent } from '@/utils/paymentLogger';
import { supabase } from '@/lib/supabaseClient';
import { posthog } from '@/lib/posthogLoader';

export interface AppointmentCheckoutData {
  type: 'appointment';
  lawyer_id: string;
  lawyer_name: string;
  scheduled_date: string;
  scheduled_time: string;
  duration: number;
  price: number;
  lawyer_photo?: string;
  specialties?: string[];
  pjud_verified?: boolean;
  review_count?: number;
  experiment_variant?: string | null;
  posthog_distinct_id?: string | null;
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
      toast({ title: 'Campos requeridos', description: 'Por favor completa todos los campos', variant: 'destructive' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({ title: 'Email inválido', description: 'Por favor ingresa un email válido', variant: 'destructive' });
      return;
    }

    const phoneTrimmed = phone.trim();
    if (phoneTrimmed) {
      const phoneRegex = /^(\+?56)?0?9\d{8}$/;
      if (!phoneRegex.test(phoneTrimmed.replace(/\s/g, ''))) {
        toast({ title: 'Teléfono inválido', description: 'Ingresa un número chileno válido, ej: 912345678', variant: 'destructive' });
        return;
      }
    }

    if (requiresQuote && !description.trim()) {
      toast({ title: 'Descripción requerida', description: 'Por favor describe tu situación para que el abogado pueda cotizar', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    try {
      if (requiresQuote) {
        const quotePayload = {
          lawyer_id: checkoutData.lawyer_id,
          service_id: (checkoutData as ServiceCheckoutData).service_id,
          service_title: (checkoutData as ServiceCheckoutData).service_title,
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
        if (!response.ok) throw new Error(data.error || 'Error al enviar la solicitud');

        toast({ title: 'Solicitud enviada', description: 'El abogado revisará tu caso y te enviará un presupuesto personalizado.' });
        onClose();
        setDescription('');
        setIsSubmitting(false);
        return;
      }

      const isAppointment = checkoutData.type === 'appointment';
      const distinctId = posthog.get_distinct_id();
      const payload = isAppointment
        ? {
            lawyer_id: checkoutData.lawyer_id,
            user_id: sessionUserId || undefined,
            user_email: email,
            user_name: name,
            user_phone: phoneTrimmed || undefined,
            scheduled_date: checkoutData.scheduled_date,
            scheduled_time: checkoutData.scheduled_time,
            duration: (checkoutData as AppointmentCheckoutData).duration,
            price: checkoutData.price,
            booking_type: 'appointment',
            experiment_variant: checkoutData.experiment_variant || null,
            posthog_distinct_id: distinctId || null,
          }
        : {
            lawyer_id: checkoutData.lawyer_id,
            user_id: sessionUserId || undefined,
            user_email: email,
            user_name: name,
            user_phone: phoneTrimmed || undefined,
            price: checkoutData.price,
            booking_type: 'service',
            service_id: (checkoutData as ServiceCheckoutData).service_id,
            service_title: (checkoutData as ServiceCheckoutData).service_title,
            service_description: (checkoutData as ServiceCheckoutData).service_description,
            service_delivery_time: (checkoutData as ServiceCheckoutData).service_delivery_time,
            requires_meeting: (checkoutData as ServiceCheckoutData).requires_meeting,
          };

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/bookings/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error || 'Error al crear la reserva');

      window.gtag?.('event', 'lead_created', {
        lawyer_id: checkoutData.lawyer_id,
        price: checkoutData.price,
        booking_type: checkoutData.type,
      });

      if (data.lead_id) sessionStorage.setItem('pending_lead_id', data.lead_id);

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
              ? (checkoutData as ServiceCheckoutData).service_title
              : `Asesoría con ${checkoutData.lawyer_name}`,
            price: checkoutData.price,
            quantity: 1,
          }],
        });

        const nameSlug = checkoutData.lawyer_name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
        const bookingUrl = isAppointment
          ? `/booking/${nameSlug}-${checkoutData.lawyer_id}?date=${checkoutData.scheduled_date}&time=${checkoutData.scheduled_time}&duration=${(checkoutData as AppointmentCheckoutData).duration}`
          : `/abogado/${nameSlug}-${checkoutData.lawyer_id}`;
        sessionStorage.setItem('mp_booking_redirect', bookingUrl);
        sessionStorage.setItem('mp_booking_retry', JSON.stringify({
          bookingId: data.booking_id,
          price: checkoutData.price,
          lawyerId: checkoutData.lawyer_id,
          userEmail: email.trim().toLowerCase(),
          userName: name.trim(),
          attempt: 1,
        }));

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

  const pp = checkoutData as AppointmentCheckoutData;
  const summaryTitle = isService ? checkoutData.service_title : 'Resumen de tu asesoría';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[90vh] overflow-y-auto rounded-none sm:rounded-lg">
        <DialogHeader>
          <DialogTitle>
            {requiresQuote ? 'Solicitar evaluación' : (isService ? 'Solicitar servicio legal' : 'Confirmar tu asesoría')}
          </DialogTitle>
          <DialogDescription>
            {requiresQuote
              ? 'Describe tu situación para que el abogado pueda evaluarte y enviar un presupuesto personalizado.'
              : (isService
                ? 'Completa tus datos para pagar de forma segura. El abogado recibirá tu solicitud una vez confirmado el pago.'
                : 'Completa tus datos y confirma el pago en un solo paso.')}
          </DialogDescription>
        </DialogHeader>

        {!isService && (
          <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-100 rounded-xl p-4 -mt-1">
            <p className="text-xs text-gray-500 mb-2 font-medium tracking-wide uppercase">Estás a un paso de hablar con</p>
            <div className="flex items-center gap-3">
              <Avatar className="h-14 w-14 border-2 border-white shadow-sm">
                <AvatarImage src={pp.lawyer_photo} />
                <AvatarFallback className="bg-green-900 text-green-600 text-lg">
                  {pp.lawyer_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-bold text-gray-900 leading-tight">{pp.lawyer_name}</h3>
                {pp.specialties && pp.specialties.length > 1 && (
                  <p className="text-sm text-gray-600">{pp.specialties[0]}</p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-sm">
              <span className="text-yellow-500 tracking-wider">{'★'.repeat(5)}</span>
              {pp.pjud_verified && (
                <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full text-xs font-medium">
                  <ShieldCheck className="h-3 w-3" />
                  Verificado por el Poder Judicial
                </span>
              )}
              {pp.review_count !== undefined && pp.review_count > 0 && (
                <span className="text-gray-500 text-xs">{pp.review_count} consultas realizadas</span>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre completo</Label>
            <Input id="name" type="text" placeholder="Juan Pérez" value={name} onChange={(e) => setName(e.target.value)} disabled={isSubmitting} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="juan@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isSubmitting} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">WhatsApp</Label>
            <Input id="phone" type="tel" placeholder="912 345 678" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={isSubmitting} inputMode="numeric" />
            <p className="text-xs text-gray-500">Si surge algún problema con tu solicitud, podremos contactarte por WhatsApp.</p>
          </div>

          {requiresQuote && (
            <div className="space-y-2">
              <Label htmlFor="description">Describe tu situación *</Label>
              <Textarea id="description" placeholder="¿Hace cuánto están separados? ¿Existen hijos? ¿Existe acuerdo entre las partes? Cualquier otro antecedente importante." value={description} onChange={(e) => setDescription(e.target.value)} disabled={isSubmitting} required rows={4} className="resize-none" />
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm text-blue-800 space-y-1">
              <p className="font-medium">{summaryTitle}</p>
              <p>• Abogado: {checkoutData.lawyer_name}</p>
              {isService ? (
                <>
                  <p>• Entrega: {(checkoutData as ServiceCheckoutData).service_delivery_time || 'Según acuerdo'}</p>
                  {requiresQuote ? (
                    <>
                      <p>• Precio: Desde ${checkoutData.price.toLocaleString('es-CL')}</p>
                      <p className="text-xs text-blue-600 mt-2">El valor definitivo depende de diversos factores jurídicos que deben ser evaluados por el abogado.</p>
                    </>
                  ) : (
                    <>
                      {(checkoutData as ServiceCheckoutData).service_description && <p>• {(checkoutData as ServiceCheckoutData).service_description}</p>}
                      <p>• Total: ${checkoutData.price.toLocaleString('es-CL')}</p>
                    </>
                  )}
                </>
              ) : (
                <>
                  <p>• Fecha: {pp.scheduled_date}</p>
                  <p>• Hora: {pp.scheduled_time}</p>
                  <p>• Duración: {pp.duration} minutos</p>
                  <p>• Total: ${checkoutData.price.toLocaleString('es-CL')}</p>
                </>
              )}
            </div>
          </div>

          <Button type="submit" className="w-full bg-gray-900 hover:bg-green-900" disabled={isSubmitting}>
            {isSubmitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando...</>
            ) : (
              requiresQuote ? 'Solicitar evaluación' : (isService ? 'Confirmar y pagar servicio' : 'Confirmar y pagar asesoría')
            )}
          </Button>

          {!requiresQuote && (
            <>
              <p className="text-xs text-green-700 text-center bg-green-50 border border-green-200 rounded-lg p-2">
                Más de 100 clientes confían en LegalUp. Si no quedas satisfecho, te devolvemos tu dinero.
              </p>
              {phone.trim() && /^(\+?56)?0?9\d{8}$/.test(phone.replace(/\s/g, '')) && (
                <a
                  href={`https://wa.me/${phone.replace(/\s/g, '')}?text=${encodeURIComponent('Hola, estaba agendando una asesoría en LegalUp y tengo una consulta.')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 text-sm text-green-700 hover:text-green-800 border border-green-300 rounded-lg p-2 hover:bg-green-50 transition-colors"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Conectar por WhatsApp
                </a>
              )}
            </>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}