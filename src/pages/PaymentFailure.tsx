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

    const retryStr = sessionStorage.getItem('mp_booking_retry');
    let ctx = retryStr ? JSON.parse(retryStr) : null;
    const attempt = (ctx?.attempt || 0) + 1;

    window.gtag?.('event', 'payment_retry', {
      booking_id: ctx?.bookingId || searchParams.get('booking_id') || searchParams.get('appointmentId'),
      attempt,
      payment_method: 'mercadopago',
      reason: 'payment_failed',
    });

    if (!ctx) {
      const target = lawyerSlug ? `/abogado/${lawyerSlug}` : '/search';
      navigate(target);
      return;
    }

    setIsRetrying(true);
    try {
      ctx.attempt = attempt;
      sessionStorage.setItem('mp_booking_retry', JSON.stringify(ctx));

      const origin = window.location.origin;
      const body: Record<string, unknown> = {
        appointmentId: ctx.bookingId,
        amount: ctx.price,
        lawyerId: ctx.lawyerId,
        userEmail: ctx.userEmail,
        userName: ctx.userName,
        successUrl: `${origin}/booking/success?booking_id=${ctx.bookingId}`,
        failureUrl: `${origin}/booking/failure?booking_id=${ctx.bookingId}`,
        pendingUrl: `${origin}/booking/pending?booking_id=${ctx.bookingId}`,
      };
      if (user) body.userId = user.id;

      const resp = await fetch(`${import.meta.env.VITE_API_BASE_URL || origin}/create-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Error al procesar el pago');

      if (data.payment_link) {
        window.location.href = data.payment_link;
      } else {
        throw new Error('No se recibió el enlace de pago');
      }
    } catch (error) {
      console.error('Error retrying payment:', error);
      toast({
        title: 'Error al reintentar',
        description: error instanceof Error ? error.message : 'No se pudo procesar el pago',
        variant: 'destructive',
      });
      setIsRetrying(false);
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
