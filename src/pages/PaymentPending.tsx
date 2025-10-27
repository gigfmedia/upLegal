import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, ArrowLeft, AlertCircle } from 'lucide-react';

export default function PaymentPending() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <Clock className="h-10 w-10 text-amber-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Pago en Proceso</CardTitle>
          <p className="text-gray-600">
            Estamos procesando tu pago. Te notificaremos por correo electrónico cuando se complete.
          </p>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <div className="flex items-center justify-center text-amber-500">
            <AlertCircle className="mr-2 h-5 w-5" />
            <span>El pago está siendo procesado</span>
          </div>
          <div className="pt-4">
            <Button asChild className="w-full">
              <Link to="/dashboard" className="flex items-center justify-center">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al inicio
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
