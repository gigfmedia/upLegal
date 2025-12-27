import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Calendar, Clock, User, Mail, ArrowRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface Booking {
  id: string;
  scheduled_date: string;
  scheduled_time: string;
  duration: number;
  price: number;
  user_name: string;
  user_email: string;
  lawyer: {
    first_name: string;
    last_name: string;
    avatar_url: string;
  };
}

export default function BookingSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const bookingId = searchParams.get('booking_id');
  
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBooking() {
      if (!bookingId) {
        navigate('/');
        return;
      }

      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/api/bookings/${bookingId}`
        );

        if (!response.ok) {
          throw new Error('Booking not found');
        }

        const data = await response.json();
        setBooking(data.booking);
      } catch (error) {
        console.error('Error fetching booking:', error);
        navigate('/');
      } finally {
        setLoading(false);
      }
    }

    fetchBooking();
  }, [bookingId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!booking) {
    return null;
  }

  const formattedDate = format(parseISO(booking.scheduled_date), "d 'de' MMMM, yyyy", { locale: es });

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full">
        {/* Success Icon */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            ¡Tu asesoría está confirmada!
          </h1>
          <p className="text-gray-600">
            Hemos enviado los detalles a tu correo electrónico
          </p>
        </div>

        {/* Booking Details Card */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            {/* Lawyer Info */}
            <div className="flex items-center gap-4 pb-6 border-b">
              <img
                src={booking.lawyer.avatar_url || '/default-avatar.png'}
                alt={`${booking.lawyer.first_name} ${booking.lawyer.last_name}`}
                className="w-16 h-16 rounded-full object-cover"
              />
              <div>
                <p className="text-sm text-gray-600">Asesoría con</p>
                <p className="text-lg font-semibold text-gray-900">
                  {booking.lawyer.first_name} {booking.lawyer.last_name}
                </p>
              </div>
            </div>

            {/* Booking Details */}
            <div className="space-y-4 py-6">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Fecha</p>
                  <p className="font-medium text-gray-900">{formattedDate}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Hora</p>
                  <p className="font-medium text-gray-900">
                    {booking.scheduled_time} ({booking.duration} minutos)
                  </p>
                </div>
              </div>

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

            {/* Price */}
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

        {/* Email Confirmation Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800 text-center">
            📧 <strong>Revisa tu correo</strong> para confirmar tu cuenta y acceder a todas las funciones de la plataforma
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={() => navigate('/dashboard/appointments')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6"
          >
            Gestionar mi asesoría
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>

          <Button
            onClick={() => navigate('/search')}
            variant="outline"
            className="w-full"
          >
            Volver a buscar abogados
          </Button>
        </div>

        {/* Additional Info */}
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
