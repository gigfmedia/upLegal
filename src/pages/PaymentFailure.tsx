import { useNavigate, useSearchParams } from 'react-router-dom';
import { PaymentFailure as PaymentFailureComponent } from '@/components/payment/PaymentFailure';

export default function PaymentFailure() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Extraer parámetros de la URL
  const paymentId = searchParams.get('payment_id');
  const status = searchParams.get('status');
  const statusDetail = searchParams.get('status_detail');
  const amount = searchParams.get('amount');
  const currency = searchParams.get('currency');
  const created = searchParams.get('created');

  const handleBack = () => {
    navigate('/');
  };

  const handleRetry = () => {
    // Aquí podrías implementar la lógica para reintentar el pago
    // Por ahora, simplemente recargamos la página
    window.location.reload();
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <PaymentFailureComponent 
        payment={{
          id: paymentId || undefined,
          amount: amount ? Number(amount) : undefined,
          currency: currency || 'CLP',
          status_detail: statusDetail || undefined,
          created: created ? Math.floor(new Date(created).getTime() / 1000) : undefined,
        }}
        onRetry={handleRetry}
        onBack={handleBack}
      />
    </div>
  );
}
