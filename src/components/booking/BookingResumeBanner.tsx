import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowRight, CalendarClock, Loader2, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useBookingIntent } from '@/hooks/useBookingIntent';
import {
  shouldShowBookingResumeBanner,
  trackBookingIntentEvent,
  validateBookingIntentAvailability,
} from '@/lib/bookingIntent';

/**
 * Banner de recuperación de intención de reserva ("¿Quieres continuar tu
 * reserva?"). Card flotante bajo el header (top-28), z-[900]: por encima del
 * contenido pero sin tapar cookie banner (z-1000), bottom nav, WhatsApp ni
 * acciones de checkout (oculto en esas rutas).
 */
export default function BookingResumeBanner() {
  const { intent, clear } = useBookingIntent();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isValidating, setIsValidating] = useState(false);
  const shownRef = useRef(false);

  const pathname = location.pathname;
  const visible =
    intent !== null && shouldShowBookingResumeBanner(pathname, intent.bookingUrl);

  // Entrada animada solo al montar/aparecer: opacity 0→1, translateY 10px→0,
  // 200ms ease-out, sin bounce ni scale. `motion-safe:` deja render inmediato
  // con prefers-reduced-motion. No se reanima por re-render (flag estable).
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // booking_resume_banner_shown: una sola vez por visualización real.
  useEffect(() => {
    if (visible && intent && !shownRef.current) {
      shownRef.current = true;
      trackBookingIntentEvent('booking_resume_banner_shown', intent);
    }
    if (!visible) {
      shownRef.current = false;
    }
  }, [visible, intent]);

  if (!visible || !intent) return null;

  const formattedDate = (() => {
    try {
      return format(parseISO(`${intent.appointmentDate}T00:00:00`), "EEEE, d 'de' MMMM", {
        locale: es,
      });
    } catch {
      return intent.appointmentDate;
    }
  })();

  const initials = intent.lawyerName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleDismiss = () => {
    trackBookingIntentEvent('booking_resume_dismissed', intent);
    clear();
  };

  const handleContinue = async () => {
    if (isValidating) return;
    setIsValidating(true);
    try {
      const result = await validateBookingIntentAvailability(intent);
      if (result.status === 'unavailable') {
        trackBookingIntentEvent('booking_resume_slot_unavailable', intent, {
          reason: result.reason,
        });
        clear();
        toast({
          title: 'Horario no disponible',
          description: 'Ese horario ya no está disponible. Puedes elegir otro horario con este abogado.',
        });
        if (intent.lawyerSlug) {
          navigate(`/abogado/${intent.lawyerSlug}`);
        } else {
          navigate(intent.bookingUrl);
        }
        return;
      }
      // available o unknown (la página de booking muestra disponibilidad en vivo)
      trackBookingIntentEvent('booking_resume_clicked', intent);
      navigate(intent.bookingUrl);
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 top-28 z-[900] px-4 motion-safe:transition-all motion-safe:duration-200 motion-safe:ease-out sm:px-6 lg:px-8 ${
        entered ? 'motion-safe:translate-y-0 motion-safe:opacity-100' : 'motion-safe:translate-y-[10px] motion-safe:opacity-0'
      }`}
    >
      <div className="pointer-events-auto mx-auto w-full max-w-3xl">
        <div
          role="dialog"
          aria-live="polite"
          aria-label="Continuar tu reserva"
          className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xl sm:p-5"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <Avatar className="h-12 w-12 shrink-0">
                {intent.lawyerPhoto ? (
                  <AvatarImage src={intent.lawyerPhoto} alt={`Foto de ${intent.lawyerName}`} />
                ) : null}
                <AvatarFallback className="bg-green-900 text-sm font-semibold text-green-100">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">
                  ¿Quieres continuar tu reserva?
                </p>
                <p className="mt-0.5 truncate text-sm font-medium text-gray-800">
                  {intent.lawyerName}
                  {intent.specialty ? (
                    <span className="font-normal text-gray-500"> · {intent.specialty}</span>
                  ) : null}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-600">
                  <CalendarClock className="h-4 w-4 shrink-0 text-green-900" aria-hidden="true" />
                  <span className="capitalize">
                    {formattedDate} · {intent.appointmentTime}
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  Consulta online
                  {typeof intent.durationMinutes === 'number'
                    ? ` · ${intent.durationMinutes} min`
                    : null}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={handleContinue}
                disabled={isValidating}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-900 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-900 sm:flex-none"
              >
                {isValidating ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                )}
                Continuar
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                aria-label="Descartar reserva pendiente"
                className="rounded-lg border border-gray-200 p-2.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-900"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
