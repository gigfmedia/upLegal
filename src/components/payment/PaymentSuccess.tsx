import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils/currency';

interface PaymentSuccessProps {
  payment: {
    id: string;
    amount: number;
    currency: string;
    description: string;
    created: number;
    receipt_url?: string;
  };
  onBack?: () => void;
  onViewReceipt?: () => void;
}

export function PaymentSuccess({ payment, onBack, onViewReceipt }: PaymentSuccessProps) {
  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="text-center space-y-4">
        <div className="mx-auto rounded-full bg-green-100 p-3">
          <CheckCircle2 className="h-12 w-12 text-green-600" />
        </div>
        <CardTitle>¡Pago Completado!</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2 text-center">
          <p className="text-3xl font-bold">{formatCurrency(payment.amount, payment.currency)}</p>
          <p className="text-muted-foreground">{payment.description}</p>
          <p className="text-sm text-muted-foreground">
            ID de transacción: {payment.id}
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fecha</span>
            <span className="font-medium">
              {new Date(payment.created * 1000).toLocaleDateString('es-CL', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Método de pago</span>
            <span className="font-medium">Tarjeta de crédito/débito</span>
          </div>
        </div>

        <div className="space-y-2 pt-4">
          <Button className="w-full" onClick={onBack}>
            Volver al inicio
          </Button>
          {payment.receipt_url && (
            <Button
              variant="outline"
              className="w-full"
              onClick={onViewReceipt}
            >
              Ver recibo
            </Button>
          )}
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Hemos enviado un correo electrónico con los detalles de tu pago.
        </p>
      </CardContent>
    </Card>
  );
}
