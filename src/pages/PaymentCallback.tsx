import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';

export function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const status = searchParams.get('status');
  const paymentId = searchParams.get('payment_id');
  const preferenceId = searchParams.get('preference_id');

  useEffect(() => {
    const handlePaymentCallback = async () => {
      if (status === 'success' && preferenceId) {
        try {
          // Get the pending consultation data from localStorage
          const pendingConsultation = localStorage.getItem('pendingConsultation');
          
          if (!pendingConsultation) {
            throw new Error('No se encontró la información de la consulta');
          }

          const {
            lawyerId,
            lawyerName,
            clientId,
            clientName,
            clientEmail,
            subject,
            message,
            amount
          } = JSON.parse(pendingConsultation);

          // 1. Create the consultation in the database
          const { data: consultation, error: consultationError } = await supabase
            .from('consultations')
            .insert([{
              client_id: clientId,
              lawyer_id: lawyerId,
              title: subject || 'Consulta legal',
              description: message,
              status: 'pending',
              is_free: false,
              price: amount,
              payment_id: paymentId,
              payment_status: 'paid'
            }])
            .select('*')
            .single();

          if (consultationError) throw consultationError;

          // 2. Send email notification to the lawyer
          if (consultation) {
            try {
              await supabase.functions.invoke('send-message-notification', {
                body: {
                  message: message,
                  lawyerEmail: `${lawyerId}@abogado.uplegal.cl`, // Adjust this based on your email structure
                  clientName: clientName,
                  subject: subject || 'Nueva consulta pagada',
                  isPaidConsultation: true,
                  amount: amount
                }
              });
            } catch (emailError) {
              console.error('Error al enviar notificación por correo:', emailError);
              // Continue even if email fails
            }
          }

          // 3. Clear the pending consultation from localStorage
          localStorage.removeItem('pendingConsultation');

          // 4. Redirect to success page or dashboard
          navigate('/dashboard/consultations?payment=success');
          
        } catch (error) {
          console.error('Error procesando el pago:', error);
          navigate('/dashboard/consultations?payment=error');
        }
      } else if (status === 'failure') {
        navigate('/dashboard/consultations?payment=failed');
      } else {
        navigate('/dashboard/consultations');
      }
    };

    handlePaymentCallback();
  }, [status, paymentId, preferenceId, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Procesando tu pago...</h1>
        <p>Por favor espera mientras confirmamos tu pago.</p>
      </div>
    </div>
  );
}

export default PaymentCallback;
