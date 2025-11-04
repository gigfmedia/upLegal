import { XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils/currency';

interface PaymentFailureProps {
  payment?: {
    id?: string;
    amount?: number;
    currency?: string;
    description?: string;
    created?: number;
    status_detail?: string;
  };
  onRetry?: () => void;
  onBack?: () => void;
}

export function PaymentFailure({ 
  payment = {}, 
  onRetry, 
  onBack 
}: PaymentFailureProps) {
  const getErrorMessage = () => {
    if (payment?.status_detail === 'cc_rejected_bad_filled_security_code') {
      return 'El código de seguridad de la tarjeta es incorrecto.';
    } else if (payment?.status_detail === 'cc_rejected_insufficient_amount') {
      return 'Fondos insuficientes en la tarjeta.';
    } else if (payment?.status_detail === 'cc_rejected_bad_filled_date') {
      return 'La fecha de vencimiento es incorrecta.';
    } else if (payment?.status_detail === 'cc_rejected_other_reason') {
      return 'La tarjeta fue rechazada. Por favor, intenta con otro medio de pago.';
    }
    return 'El pago no pudo ser procesado. Por favor, inténtalo nuevamente.';
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="text-center space-y-4">
        <div className="mx-auto rounded-full bg-red-100 p-3">
          <XCircle className="h-12 w-12 text-red-600" />
        </div>
        <CardTitle>Pago Rechazado</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2 text-center">
          {payment?.amount && (
            <p className="text-3xl font-bold">
              {formatCurrency(payment.amount, payment.currency || 'CLP')}
            </p>
          )}
          <p className="text-muted-foreground">{getErrorMessage()}</p>
          {payment?.id && (
            <p className="text-sm text-muted-foreground">
              ID de transacción: {payment.id}
            </p>
          )}
        </div>

        {payment?.created && (
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fecha</span>
              <span className="font-medium">
                {new Date((payment.created || 0) * 1000).toLocaleDateString('es-CL', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        )}

        <div className="space-y-2 pt-4">
          {onRetry && (
            <Button className="w-full" onClick={onRetry}>
              Reintentar pago
            </Button>
          )}
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={onBack}
          >
            Volver al inicio
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Si el problema persiste, por favor contacta a nuestro soporte.
        </p>
      </CardContent>
    </Card>
  );
}
