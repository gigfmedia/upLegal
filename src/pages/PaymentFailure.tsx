import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PaymentFailure as PaymentFailureComponent } from '@/components/payment/PaymentFailure';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';

export default function PaymentFailure() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [isRetrying, setIsRetrying] = useState(false);

  const appointmentId = searchParams.get('appointmentId');

  const handleBack = () => {
    navigate('/');
  };

  const handleRetry = async () => {
    if (!appointmentId) {
      console.error('No appointmentId found in URL');
      navigate('/');
      return;
    }

    if (!user) {
      console.error('User not authenticated');
      navigate('/login');
      return;
    }

    setIsRetrying(true);

    try {
      // First, try to find in appointments table
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .select('*, profiles!appointments_lawyer_id_fkey(display_name)')
        .eq('id', appointmentId)
        .single();

      if (appointment && !appointmentError) {
        // Found in appointments - create payment directly
        await createPaymentForAppointment(appointment);
        return;
      }

      // If not in appointments, try consultations table
      const { data: consultation, error: consultationError } = await supabase
        .from('consultations')
        .select('*, profiles!consultations_lawyer_id_fkey(display_name)')
        .eq('id', appointmentId)
        .single();

      if (consultation && !consultationError) {
        // Found in consultations - create payment directly
        await createPaymentForConsultation(consultation);
        return;
      }

      // If not found in either table, go back to home
      console.error('Appointment/Consultation not found');
      alert('No se pudo encontrar la cita. Por favor, intenta nuevamente desde el inicio.');
      navigate('/');
    } catch (error) {
      console.error('Error retrying payment:', error);
      alert('Ocurrió un error al reintentar el pago. Por favor, intenta nuevamente.');
      navigate('/');
    } finally {
      setIsRetrying(false);
    }
  };

  const createPaymentForAppointment = async (appointment: any) => {
    try {
      const API_BASE_URL = 'https://uplegal.netlify.app';
      const FUNCTION_URL = `${API_BASE_URL}/.netlify/functions/create-payment`;

      const lawyerName = appointment.profiles?.display_name || 'Abogado';
      
      const paymentParams = {
        amount: appointment.amount || appointment.price,
        originalAmount: appointment.original_amount,
        userId: user!.id,
        lawyerId: appointment.lawyer_id,
        appointmentId: appointment.id,
        description: `Consulta legal con ${lawyerName}`,
        successUrl: `${window.location.origin || 'https://uplegal.netlify.app'}/payment/success?appointmentId=${appointment.id}`,
        failureUrl: `${window.location.origin || 'https://uplegal.netlify.app'}/payment/failure?appointmentId=${appointment.id}`,
        pendingUrl: `${window.location.origin || 'https://uplegal.netlify.app'}/payment/pending?appointmentId=${appointment.id}`,
        userEmail: user!.email || '',
        userName: user!.user_metadata?.full_name || user!.email?.split('@')[0] || 'Usuario'
      };

      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentParams)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Payment API error:', errorText);
        throw new Error('Error al crear el pago');
      }

      const paymentResult = await response.json();
      
      if (paymentResult.payment_link) {
        window.location.href = paymentResult.payment_link;
      } else {
        throw new Error('No se pudo obtener el enlace de pago');
      }
    } catch (error) {
      console.error('Error creating payment for appointment:', error);
      throw error;
    }
  };

  const createPaymentForConsultation = async (consultation: any) => {
    try {
      const API_BASE_URL = 'https://uplegal.netlify.app';
      const FUNCTION_URL = `${API_BASE_URL}/.netlify/functions/create-payment`;

      const lawyerName = consultation.profiles?.display_name || 'Abogado';
      
      const paymentParams = {
        amount: consultation.price,
        originalAmount: consultation.original_amount,
        userId: user!.id,
        lawyerId: consultation.lawyer_id,
        appointmentId: consultation.id,
        description: `Consulta legal con ${lawyerName}`,
        successUrl: `${window.location.origin || 'https://uplegal.netlify.app'}/payment/success?appointmentId=${consultation.id}`,
        failureUrl: `${window.location.origin || 'https://uplegal.netlify.app'}/payment/failure?appointmentId=${consultation.id}`,
        pendingUrl: `${window.location.origin || 'https://uplegal.netlify.app'}/payment/pending?appointmentId=${consultation.id}`,
        userEmail: user!.email || '',
        userName: user!.user_metadata?.full_name || user!.email?.split('@')[0] || 'Usuario'
      };

      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentParams)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Payment API error:', errorText);
        throw new Error('Error al crear el pago');
      }

      const paymentResult = await response.json();
      
      if (paymentResult.payment_link) {
        window.location.href = paymentResult.payment_link;
      } else {
        throw new Error('No se pudo obtener el enlace de pago');
      }
    } catch (error) {
      console.error('Error creating payment for consultation:', error);
      throw error;
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <PaymentFailureComponent 
        onRetry={handleRetry}
        onBack={handleBack}
        isRetrying={isRetrying}
      />
    </div>
  );
}
