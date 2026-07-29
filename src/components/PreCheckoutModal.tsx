import { useState, useEffect, useCallback } from 'react';
import { format, addDays, startOfDay, isBefore, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { logPaymentEvent } from '@/utils/paymentLogger';
import { supabase } from '@/lib/supabaseClient';

export interface AppointmentCheckoutData {
  type: 'appointment';
  lawyer_id: string;
  lawyer_name: string;
  scheduled_date?: string;
  scheduled_time?: string;
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

const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const AVAILABILITY_START_HOUR = 9;

function getDayName(date: Date): string {
  return DAY_NAMES[date.getDay()];
}

function normalizeDayKey(key: string): string {
  return key.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function getAvailabilityForDay(config: Record<string, boolean[]> | null, dayName: string): boolean[] | null {
  if (!config) return null;
  const targetKey = normalizeDayKey(dayName);
  for (const [key, value] of Object.entries(config)) {
    if (normalizeDayKey(key) === targetKey && Array.isArray(value)) {
      return value as boolean[];
    }
  }
  return null;
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

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  const [availableSlots, setAvailableSlots] = useState<{ time: string; available: boolean }[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [calendarOffset, setCalendarOffset] = useState(0);

  useEffect(() => {
    if (!isService && isOpen) {
      const dates: Date[] = [];
      const today = startOfDay(new Date());
      for (let i = 0; i < 30; i++) {
        const d = addDays(today, i);
        if (d.getDay() !== 0) dates.push(d);
      }
      setAvailableDates(dates);

      if (checkoutData.scheduled_date) {
        const parsed = parseISO(checkoutData.scheduled_date);
        if (!isNaN(parsed.getTime())) {
          setSelectedDate(parsed);
        }
      }
      if (checkoutData.scheduled_time) {
        setSelectedTime(checkoutData.scheduled_time);
      }
    }
  }, [!isService, isOpen]);

  const fetchSlots = useCallback(async (date: Date) => {
    setIsLoadingSlots(true);
    try {
      const dayName = getDayName(date);
      const formattedDate = format(date, 'yyyy-MM-dd');
      const isSaturday = date.getDay() === 6;
      const endHour = isSaturday ? 14 : 18;
      const needsExtendedSlot = !isSaturday;
      const duration = (checkoutData as AppointmentCheckoutData).duration;

      const slots: { time: string; available: boolean }[] = [];
      for (let hour = 9; hour < endHour; hour++) {
        const minutes = duration >= 60 ? [0] : [0, 30];
        for (const minute of minutes) {
          const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          slots.push({ time, available: true });
        }
      }
      if (needsExtendedSlot) {
        const extraMinutes = duration >= 60 ? [0] : [0, 30];
        extraMinutes.forEach(minute => {
          const time = `18:${minute.toString().padStart(2, '0')}`;
          slots.push({ time, available: true });
        });
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('availability')
        .eq('user_id', checkoutData.lawyer_id)
        .single();

      const availabilityConfig: Record<string, boolean[]> | null = (() => {
        if (!profile?.availability) return null;
        try {
          return typeof profile.availability === 'string'
            ? JSON.parse(profile.availability)
            : profile.availability;
        } catch {
          console.warn('[PreCheckoutModal] Error parsing availability, using defaults');
          return null;
        }
      })();

      const dayAvail = getAvailabilityForDay(availabilityConfig, dayName);

      slots.forEach(slot => {
        const hour = parseInt(slot.time.split(':')[0]);
        const hourIdx = hour - AVAILABILITY_START_HOUR;
        if (dayAvail && dayAvail[hourIdx] === false) {
          slot.available = false;
        }
      });

      const now = new Date();
      if (format(date, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd')) {
        const cutoff = now.getTime() + 60 * 60 * 1000;
        slots.forEach(slot => {
          const [sh, sm] = slot.time.split(':').map(Number);
          const slotTime = new Date(date);
          slotTime.setHours(sh, sm, 0, 0);
          if (slotTime.getTime() < cutoff) slot.available = false;
        });
      }

      const { data: busySlots } = await supabase
        .rpc('get_lawyer_busy_slots', {
          query_lawyer_id: checkoutData.lawyer_id,
          query_date: formattedDate,
        });

      if (busySlots) {
        const busyTimes = new Set(
          (busySlots as { scheduled_time: string }[]).map(s => s.scheduled_time.slice(0, 5))
        );
        // Remove pending bookings older than 15 minutes (expired) from busy set
        const { data: expiredPending } = await supabase
          .from('bookings')
          .select('scheduled_time')
          .eq('lawyer_id', checkoutData.lawyer_id)
          .eq('scheduled_date', formattedDate)
          .eq('status', 'pending')
          .lt('created_at', new Date(Date.now() - 15 * 60 * 1000).toISOString());

        if (expiredPending) {
          (expiredPending as { scheduled_time: string }[]).forEach(b => {
            busyTimes.delete(b.scheduled_time.slice(0, 5));
          });
        }

        slots.forEach(slot => {
          if (busyTimes.has(slot.time)) slot.available = false;
        });
      }

      setAvailableSlots(slots);
    } catch (err) {
      console.error('[PreCheckoutModal] Error fetching slots:', err);
    } finally {
      setIsLoadingSlots(false);
    }
  }, [checkoutData.lawyer_id]);

  useEffect(() => {
    if (!isService && selectedDate) {
      if (!checkoutData.scheduled_time) setSelectedTime(null);
      fetchSlots(selectedDate);
    }
  }, [!isService, selectedDate, fetchSlots]);

  const visibleDates = availableDates.slice(calendarOffset * 7, calendarOffset * 7 + 7);

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

    if (!isService && (!selectedDate || !selectedTime)) {
      toast({ title: 'Selecciona fecha y hora', description: 'Elige un horario disponible para tu asesoría', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    const finalDate = !isService && selectedDate ? format(selectedDate, 'yyyy-MM-dd') : (checkoutData as AppointmentCheckoutData).scheduled_date!;
    const finalTime = !isService && selectedTime ? selectedTime : (checkoutData as AppointmentCheckoutData).scheduled_time!;

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
      const payload = isAppointment
        ? {
            lawyer_id: checkoutData.lawyer_id,
            user_id: sessionUserId || undefined,
            user_email: email,
            user_name: name,
            user_phone: phoneTrimmed || undefined,
            scheduled_date: finalDate,
            scheduled_time: finalTime,
            duration: (checkoutData as AppointmentCheckoutData).duration,
            price: checkoutData.price,
            booking_type: 'appointment',
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
          ? `/booking/${nameSlug}-${checkoutData.lawyer_id}?date=${finalDate}&time=${finalTime}&duration=${(checkoutData as AppointmentCheckoutData).duration}`
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

  const summaryTitle = isService ? checkoutData.service_title : 'Resumen de tu asesoría';
  const pp = checkoutData as AppointmentCheckoutData;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {requiresQuote ? 'Solicitar evaluación' : (isService ? 'Solicitar servicio legal' : 'Agenda tu asesoría legal')}
          </DialogTitle>
          <DialogDescription>
            {requiresQuote
              ? 'Describe tu situación para que el abogado pueda evaluarte y enviar un presupuesto personalizado.'
              : (isService
                ? 'Completa tus datos para pagar de forma segura. El abogado recibirá tu solicitud una vez confirmado el pago.'
                : !isService && checkoutData.scheduled_date && checkoutData.scheduled_time
                ? 'Completa tus datos y confirma el pago en un solo paso.'
                : 'Completa tus datos, elige el horario y paga en un solo paso.')}
          </DialogDescription>
        </DialogHeader>

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

          {/* Inline date/time picker for appointments (hidden if time already selected on BookingPage) */}
          {!isService && !checkoutData.scheduled_time && (
            <div className="space-y-3 border rounded-lg p-4 bg-gray-50">
              <Label className="text-sm font-medium">Elige fecha y hora</Label>

              {/* Date selector - only show when no pre-selected date */}
              {!checkoutData.scheduled_date && (
                <div className="flex items-center justify-between gap-2">
                  <button type="button" onClick={() => setCalendarOffset(Math.max(0, calendarOffset - 1))} disabled={calendarOffset === 0} className="p-1 rounded hover:bg-gray-200 disabled:opacity-30">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <div className="flex gap-1 overflow-x-auto">
                    {visibleDates.map((d) => {
                      const isSelected = selectedDate && format(d, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
                      const dayName = DAY_NAMES[d.getDay()].slice(0, 3);
                      return (
                        <button
                          key={d.toISOString()}
                          type="button"
                          onClick={() => setSelectedDate(d)}
                          className={`flex flex-col items-center px-2 py-1.5 rounded-lg text-xs transition-colors min-w-[52px] ${
                            isSelected ? 'bg-green-900 text-white' : 'hover:bg-gray-200'
                          }`}
                        >
                          <span className="uppercase font-medium">{dayName}</span>
                          <span className="text-sm font-bold">{d.getDate()}</span>
                        </button>
                      );
                    })}
                  </div>
                  <button type="button" onClick={() => setCalendarOffset(calendarOffset + 1)} disabled={(calendarOffset + 1) * 7 >= availableDates.length} className="p-1 rounded hover:bg-gray-200 disabled:opacity-30">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Pre-selected date display */}
              {checkoutData.scheduled_date && selectedDate && (
                <p className="text-sm font-medium text-gray-700">
                  {format(selectedDate, "d 'de' MMMM yyyy", { locale: es })}
                </p>
              )}

              {/* Time slots */}
              {selectedDate && (
                <div>
                  {isLoadingSlots ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-gray-900" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                      {availableSlots.filter(s => s.available).map((slot) => (
                        <button
                          key={slot.time}
                          type="button"
                          disabled={!slot.available}
                          onClick={() => setSelectedTime(slot.time)}
                          className={`p-2 text-sm border-2 rounded-lg transition-all ${
                            selectedTime === slot.time
                              ? 'border-green-900 bg-green-50'
                              : slot.available
                                ? 'border-gray-200 bg-white hover:border-gray-300'
                                : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          {slot.time}
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-4">La reserva se mantendrá 15 minutos mientras completas el pago</p>
                </div>
              )}
            </div>
          )}

          {/* Summary */}
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
                  <p>• Fecha: {!isService && selectedDate ? format(selectedDate, 'dd/MM/yyyy') : pp.scheduled_date}</p>
                  <p>• Hora: {!isService && selectedTime ? selectedTime : pp.scheduled_time}</p>
                  <p>• Duración: {pp.duration} minutos</p>
                  <p>• Total: ${checkoutData.price.toLocaleString('es-CL')}</p>
                </>
              )}
            </div>
          </div>

          <Button type="submit" className="w-full bg-gray-900 hover:bg-green-900 h-11" disabled={isSubmitting}>
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
                  className="flex items-center justify-center gap-2 text-sm text-green-700 hover:text-green-800 border border-green-300 rounded-lg p-2 h-11 hover:bg-green-50 transition-colors"
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