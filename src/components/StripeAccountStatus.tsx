import { Badge } from './ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { StripeConnectButton } from './StripeConnectButton';

interface StripeAccountStatusProps {
  profile: {
    stripe_account_status?: string;
    stripe_charges_enabled?: boolean;
    stripe_payouts_enabled?: boolean;
  };
}

export function StripeAccountStatus({ profile }: StripeAccountStatusProps) {
  const { user } = useAuth();
  
  const getStatusBadge = () => {
    switch (profile.stripe_account_status) {
      case 'verified':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Verificado
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            <AlertCircle className="w-3 h-3 mr-1" />
            Pendiente
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <XCircle className="w-3 h-3 mr-1" />
            Rechazado
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            No verificado
          </Badge>
        );
    }
  };

  if (!user) return null;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-lg">Cuenta de Pago</CardTitle>
            <CardDescription>
              Estado de tu cuenta de Stripe Connect
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent>
        {profile.stripe_account_status === 'verified' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">Pagos habilitados</p>
                <p className="text-sm text-muted-foreground">
                  {profile.stripe_charges_enabled ? 'Sí' : 'No'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Retiros habilitados</p>
                <p className="text-sm text-muted-foreground">
                  {profile.stripe_payouts_enabled ? 'Sí' : 'No'}
                </p>
              </div>
            </div>
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle>¡Todo listo!</AlertTitle>
              <AlertDescription className="text-green-700">
                Tu cuenta de pago está configurada correctamente y lista para recibir pagos.
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert variant="destructive" className="bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertTitle>Cuenta no verificada</AlertTitle>
              <AlertDescription className="text-red-700">
                {profile.stripe_account_status === 'rejected'
                  ? 'Tu cuenta fue rechazada. Por favor, completa la verificación nuevamente.'
                  : 'Debes completar la verificación de tu cuenta para recibir pagos.'}
              </AlertDescription>
            </Alert>
            <StripeConnectButton />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
