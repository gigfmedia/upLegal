import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

type Booking = {
  id: string;
  lawyer_id: string;
  user_name: string;
  user_email: string;
  user_phone: string | null;
  service_id: string | null;
  service_title: string | null;
  service_description: string | null;
  service_delivery_time: string | null;
  price: number;
  requires_meeting: boolean | null;
  booking_type: string;
  status: string;
  payment_status: string | null;
  mercadopago_preference_id: string | null;
  created_at: string;
};

type LawyerProfile = {
  slug: string | null;
  first_name: string | null;
  last_name: string | null;
};

const CheckoutResume = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [lawyer, setLawyer] = useState<LawyerProfile | null>(null);

  useEffect(() => {
    if (!bookingId) {
      setError('ID de booking no proporcionado');
      setLoading(false);
      return;
    }

    loadBooking();
  }, [bookingId]);

  const loadBooking = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch booking
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (bookingError || !bookingData) {
        setError('Booking no encontrado');
        return;
      }

      // Validate booking type
      if (bookingData.booking_type !== 'service') {
        setError('Este booking no es un servicio');
        return;
      }

      // Validate booking status
      if (bookingData.status !== 'pending') {
        if (bookingData.status === 'confirmed' || bookingData.payment_status === 'approved') {
          // Already paid, redirect to success or lawyer profile
          const { data: lawyerData } = await supabase
            .from('profiles')
            .select('slug')
            .eq('user_id', bookingData.lawyer_id)
            .single();

          if (lawyerData?.slug) {
            navigate(`/abogado/${lawyerData.slug}`, { replace: true });
          } else {
            navigate('/dashboard', { replace: true });
          }
          return;
        }
        setError('Este booking no está disponible para pago');
        return;
      }

      setBooking(bookingData);

      // Fetch lawyer profile for redirect
      const { data: lawyerData } = await supabase
        .from('profiles')
        .select('slug, first_name, last_name')
        .eq('user_id', bookingData.lawyer_id)
        .single();

      setLawyer(lawyerData);

      // Process payment
      await processPayment(bookingData, lawyerData);
    } catch (err) {
      console.error('Error loading booking:', err);
      setError('Error al cargar el booking');
    } finally {
      setLoading(false);
    }
  };

  const processPayment = async (booking: Booking, lawyer: LawyerProfile | null) => {
    try {
      // Check if preference exists and is valid
      if (booking.mercadopago_preference_id) {
        // Try to use existing preference
        window.location.href = `https://www.mercadopago.cl/checkout/v1/redirect?pref_id=${booking.mercadopago_preference_id}`;
        return;
      }

      // Create new preference
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast({
          title: 'Error',
          description: 'Debes iniciar sesión para continuar',
          variant: 'destructive',
        });
        navigate('/auth/callback');
        return;
      }

      const mpPayload = {
        items: [{
          id: booking.service_id || booking.id,
          title: booking.service_title || 'Servicio legal',
          description: booking.service_description || '',
          quantity: 1,
          unit_price: booking.price,
          currency_id: 'CLP'
        }],
        payer: {
          name: booking.user_name,
          email: booking.user_email,
          phone: booking.user_phone ? {
            area_code: '56',
            number: booking.user_phone
          } : undefined
        },
        external_reference: booking.id,
        metadata: {
          booking_id: booking.id,
          booking_type: 'service',
          lawyer_id: booking.lawyer_id,
          service_id: booking.service_id,
          lawyer_slug: lawyer?.slug
        }
      };

      // Call MercadoPago preference creation
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-mercado-pago-preference`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(mpPayload)
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al crear preferencia de pago');
      }

      // Update booking with new preference ID
      await supabase
        .from('bookings')
        .update({ mercadopago_preference_id: data.id })
        .eq('id', booking.id);

      // Redirect to MercadoPago
      window.location.href = data.init_point || data.url;
    } catch (err) {
      console.error('Error processing payment:', err);
      toast({
        title: 'Error',
        description: 'Error al procesar el pago. Por favor intenta nuevamente.',
        variant: 'destructive',
      });
      if (lawyer?.slug) {
        navigate(`/abogado/${lawyer.slug}`, { replace: true });
      } else {
        navigate('/search', { replace: true });
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-gray-900 mx-auto mb-4" />
          <p className="text-gray-600">Cargando tu solicitud...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center justify-center mb-4">
            <AlertCircle className="h-12 w-12 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-center mb-2">Error</h2>
          <p className="text-gray-600 text-center mb-6">{error}</p>
          <button
            onClick={() => navigate('/search')}
            className="w-full bg-gray-900 text-white py-3 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return null; // Should redirect automatically
};

export default CheckoutResume;
