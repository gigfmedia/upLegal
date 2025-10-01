import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

export default function PaymentSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Configuración de Pagos</h2>
        <p className="text-muted-foreground">
          Gestión de pagos y facturación
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sistema de Pagos</CardTitle>
          <CardDescription>
            Actualmente estamos trabajando en la implementación de nuestro sistema de pagos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center py-8 space-y-4">
            <p className="text-center text-muted-foreground">
              Estamos mejorando nuestra plataforma de pagos para ofrecerte la mejor experiencia.
              Pronto podrás gestionar tus pagos y facturación desde aquí.
            </p>
            <p className="text-sm text-muted-foreground text-center">
              Si necesitas ayuda con un pago o factura, por favor contáctanos a través de nuestro soporte.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
