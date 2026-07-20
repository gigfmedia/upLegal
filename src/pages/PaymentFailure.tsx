import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PaymentFailure as PaymentFailureComponent } from '@/components/payment/PaymentFailure';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';
import Header from '@/components/Header';
import { logPaymentEvent } from '@/utils/paymentLogger';
import { useToast } from '@/hooks/use-toast';

export default function PaymentFailure() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isRetrying, setIsRetrying] = useState(false);

  const quoteRequestId = searchParams.get('type') === 'quote' ? searchParams.get('id') : null;
  const lawyerSlug = searchParams.get('lawyer');

  useState(() => {
    const appointmentId = searchParams.get('appointmentId') || searchParams.get('booking_id');
    logPaymentEvent({
      event_type: 'failure',
      appointment_id: appointmentId || undefined,
      status: 'failed',
      metadata: {
        source: 'PaymentFailure',
        params: Object.fromEntries(searchParams.entries())
      }
    });
  });

  const handleBack = () => {
    if (lawyerSlug) {
      navigate(`/abogado/${lawyerSlug}`);
    } else {
      navigate('/');
    }
  };

  const handleRetry = async () => {
    if (quoteRequestId) {
      await handleQuoteRetry();
      return;
    }

    const bookingRedirect = sessionStorage.getItem('mp_booking_redirect');

    if (!user) {
      const targetUrl = bookingRedirect || (lawyerSlug ? `/abogado/${lawyerSlug}` : '/');
      navigate(`/?login=true&redirectTo=${encodeURIComponent(targetUrl)}`);
      return;
    }

    if (bookingRedirect) {
      navigate(bookingRedirect);
    } else if (lawyerSlug) {
      navigate(`/abogado/${lawyerSlug}`);
    } else {
      navigate('/search');
    }
  };

  const handleQuoteRetry = async () => {
    setIsRetrying(true);
    try {
      const { data: quoteRequest, error } = await supabase
        .from('service_quote_requests')
        .select('payment_link, status')
        .eq('id', quoteRequestId)
        .single();

      if (error || !quoteRequest) {
        console.error('Quote request not found:', error);
        toast({
          title: 'Solicitud no encontrada',
          description: 'No se encontró la solicitud de presupuesto.',
          variant: 'destructive',
        });
        navigate('/');
        return;
      }

      if (quoteRequest.payment_link) {
        window.location.href = quoteRequest.payment_link;
      } else {
        toast({
          title: 'Sin enlace de pago',
          description: 'No hay un enlace de pago disponible. Contacta al abogado para recibir un nuevo presupuesto.',
          variant: 'destructive',
        });
        navigate('/');
      }
    } catch (error) {
      console.error('Error retrying quote payment:', error);
      toast({
        title: 'Error al reintentar',
        description: 'Ocurrió un error al reintentar el pago.',
        variant: 'destructive',
      });
      navigate('/');
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <>
      <Header />
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4 pt-32">
      <PaymentFailureComponent 
        onRetry={handleRetry}
        onBack={handleBack}
        isRetrying={isRetrying}
      />
    </div>
    </>
  );
}
