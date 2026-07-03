import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Calendar, Clock, User, Mail, ArrowRight, FileText } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface Booking {
  id: string;
  booking_type?: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  duration: number;
  price: number;
  user_name: string;
  user_email: string;
  service_title?: string | null;
  service_description?: string | null;
  service_delivery_time?: string | null;
  requires_meeting?: boolean | null;
  lawyer: {
    first_name: string;
    last_name: string;
    profile_picture_url?: string | null;
    avatar_url?: string | null;
  };
}

export default function BookingSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const bookingId = searchParams.get('booking_id') || searchParams.get('external_reference');

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const purchaseTracked = useRef(false);

  useEffect(() => {
    async function fetchBooking() {
      if (!bookingId) {
        console.warn('No bookingId found in search parameters');
        navigate('/');
        return;
      }

      try {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
        const response = await fetch(`${apiBaseUrl}/api/bookings/${bookingId}`);

        if (!response.ok) {
          throw new Error(`Booking fetch failed with status ${response.status}`);
        }

        const data = await response.json();
        setBooking(data.booking);
      } catch (error) {
        console.error('Error fetching booking in success page:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchBooking();
  }, [bookingId, navigate]);

  useEffect(() => {
    if (booking && !purchaseTracked.current) {
      purchaseTracked.current = true;

      const isService = booking.booking_type === 'service';
      const itemName = isService
        ? booking.service_title || 'Servicio legal'
        : `Asesoría con ${booking.lawyer?.first_name || 'Tu'} ${booking.lawyer?.last_name || 'Abogado'}`.trim();

      window.gtag?.('event', 'purchase', {
        transaction_id: booking.id,
        booking_id: booking.id,
        value: booking.price,
        currency: 'CLP',
        items: [{
          item_id: booking.id,
          item_name: itemName,
          price: booking.price,
          quantity: 1,
        }],
      });

      window.gtag?.('event', 'booking_confirmed', {
        booking_id: booking.id,
        booking_type: booking.booking_type || 'appointment',
        lawyer_name: `${booking.lawyer?.first_name || 'Tu'} ${booking.lawyer?.last_name || 'Abogado'}`.trim(),
        price: booking.price,
      });

      const pendingLeadId = sessionStorage.getItem('pending_lead_id');
      if (pendingLeadId) {
        fetch(`${import.meta.env.VITE_API_BASE_URL}/api/leads/${pendingLeadId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'paid' }),
        })
          .then(() => sessionStorage.removeItem('pending_lead_id'))
          .catch((err) => console.warn('Could not update lead status to paid:', err));
      }
    }
  }, [booking]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="h-12 w-12 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!booking) {
    return null;
  }

  const isService = booking.booking_type === 'service';
  const hasMeeting = !isService || booking.requires_meeting !== false;
  const lawyerAvatar =
    booking.lawyer?.profile_picture_url ||
    booking.lawyer?.avatar_url ||
    '/default-avatar.png';

  const formattedDate =
    booking.scheduled_date &&
    format(parseISO(booking.scheduled_date), "d 'de' MMMM yyyy", { locale: es });

  const successTitle = isService
    ? hasMeeting
      ? '¡Servicio confirmado con éxito!'
      : '¡Solicitud de servicio confirmada!'
    : '¡Asesoría confirmada con éxito!';

  const successSubtitle = isService
    ? hasMeeting
      ? 'Te enviamos un correo con los detalles y el enlace de la videollamada.'
      : 'Te enviamos un correo con los detalles. El abogado comenzará a trabajar en tu solicitud.'
    : 'Te enviamos un correo con los detalles y el enlace de la videollamada.';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{successTitle}</h1>
          <p className="text-gray-600">{successSubtitle}</p>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 pb-6 border-b">
              <img
                src={lawyerAvatar}
                alt={`${booking.lawyer?.first_name || ''} ${booking.lawyer?.last_name || 'Abogado'}`.trim()}
                className="w-16 h-16 rounded-full object-cover"
              />
              <div>
                <p className="text-sm text-gray-600">
                  {isService ? 'Servicio con' : 'Asesoría con'}
                </p>
                <p className="text-lg font-semibold text-gray-900">
                  {booking.lawyer?.first_name || 'Tu'} {booking.lawyer?.last_name || 'Abogado'}
                </p>
              </div>
            </div>

            <div className="space-y-4 py-6">
              {isService && booking.service_title && (
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Servicio</p>
                    <p className="font-medium text-gray-900">{booking.service_title}</p>
                    {booking.service_description && (
                      <p className="text-sm text-gray-500 mt-1">{booking.service_description}</p>
                    )}
                  </div>
                </div>
              )}

              {isService && booking.service_delivery_time && (
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Plazo de entrega</p>
                    <p className="font-medium text-gray-900">{booking.service_delivery_time}</p>
                  </div>
                </div>
              )}

              {formattedDate && (
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Fecha</p>
                    <p className="font-medium text-gray-900">{formattedDate}</p>
                  </div>
                </div>
              )}

              {booking.scheduled_time && (
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Hora</p>
                    <p className="font-medium text-gray-900">
                      {booking.scheduled_time} ({booking.duration} minutos)
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Nombre</p>
                  <p className="font-medium text-gray-900">{booking.user_name}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium text-gray-900">{booking.user_email}</p>
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-900">Total pagado</span>
                <span className="text-2xl font-bold text-blue-600">
                  ${booking.price.toLocaleString('es-CL')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800 text-center">
            <strong>Revisa tu correo</strong> para confirmar tu cuenta y acceder a todas las funciones de la plataforma
          </p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => navigate(hasMeeting ? '/dashboard/appointments' : '/dashboard')}
            className="w-full bg-gray-900 hover:bg-green-900 text-lg py-6"
          >
            {isService ? 'Ver mi servicio' : 'Ver mi asesoría'}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>

          <Button onClick={() => navigate('/search')} variant="outline" className="w-full">
            Volver a buscar abogados
          </Button>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Si tienes alguna pregunta, contáctanos a{' '}
          <a href="mailto:soporte@legalup.cl" className="text-blue-600 hover:underline">
            soporte@legalup.cl
          </a>
        </p>
      </div>
    </div>
  );
}
