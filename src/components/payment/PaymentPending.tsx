import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils/currency';

interface PaymentPendingProps {
  payment: {
    id: string;
    amount: number;
    currency: string;
    description: string;
    created: number;
  };
  onBack?: () => void;
  onCheckStatus?: () => void;
}

export function PaymentPending({ 
  payment, 
  onBack, 
  onCheckStatus 
}: PaymentPendingProps) {
  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="text-center space-y-4">
        <div className="mx-auto rounded-full bg-amber-100 p-3">
          <Clock className="h-12 w-12 text-amber-600" />
        </div>
        <CardTitle>Pago en Proceso</CardTitle>
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
            <span className="text-muted-foreground">Estado</span>
            <span className="font-medium text-amber-600">En proceso</span>
          </div>
        </div>

        <div className="space-y-2 pt-4">
          {onCheckStatus && (
            <Button className="w-full" onClick={onCheckStatus}>
              Verificar estado
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

        <div className="rounded-md bg-amber-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <Clock className="h-5 w-5 text-amber-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-amber-800">
                Estamos procesando tu pago
              </h3>
              <div className="mt-2 text-sm text-amber-700">
                <p>
                  Recibirás una notificación por correo electrónico cuando el pago sea confirmado.
                  Este proceso puede tardar unos minutos.
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
