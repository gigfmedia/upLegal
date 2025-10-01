import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CreditCard, Banknote, Shield, Clock, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function PaymentSettings() {
  return (
    <div className="container mx-auto px-8 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configuración de Pagos</h1>
        <p className="text-muted-foreground">
          Gestión de pagos para tus servicios legales.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Métodos de Pago</CardTitle>
            <CardDescription>
              Gestión de métodos de pago para tus servicios legales.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertTitle>Pagos en Mantenimiento</AlertTitle>
              <AlertDescription className="mt-1 text-blue-700">
                Actualmente estamos trabajando en mejorar nuestro sistema de pagos.
              </AlertDescription>
            </Alert>

            <div className="mt-6 space-y-4">
              <Button className="w-full" variant="outline" disabled>
                <CreditCard className="h-4 w-4 mr-2" />
                Agregar método de pago
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Próximamente estarán disponibles más opciones de pago
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Información de Pago</CardTitle>
            <CardDescription>
              Detalles sobre tus transacciones y facturación.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start p-4 border rounded-lg">
                <div className="bg-blue-100 p-2 rounded-full mr-3">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium">Estado del Servicio</h4>
                  <p className="text-2xl font-bold">En Desarrollo</p>
                  <p className="text-sm text-muted-foreground">Próximamente más funcionalidades</p>
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2 flex items-center">
                  <Info className="h-4 w-4 mr-2 text-blue-600" />
                  ¿Necesitas ayuda con los pagos?
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start">
                    <Banknote className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Estamos trabajando en integrar métodos de pago seguros y confiables.</span>
                  </li>
                  <li className="flex items-start">
                    <Shield className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Tus transacciones futuras estarán protegidas con los más altos estándares de seguridad.</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
