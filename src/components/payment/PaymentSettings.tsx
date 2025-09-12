import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Loader2 } from 'lucide-react';

export default function PaymentSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [accountStatus, setAccountStatus] = useState({
    connected: false,
    status: 'unverified',
    payoutsEnabled: false,
    loginLink: '',
    balance: null,
    recentPayouts: [],
  });

  const connectStripeAccount = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/create-connect-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          userId: user.id,
          returnUrl: `${window.location.origin}/dashboard/settings/payments`,
          refreshUrl: `${window.location.origin}/dashboard/settings/payments`,
        }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error connecting Stripe account:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccountStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/get-account-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({ userId: user.id }),
      });

      const data = await response.json();
      if (data.account) {
        setAccountStatus({
          connected: true,
          status: data.account.details_submitted ? 'complete' : 'pending',
          payoutsEnabled: data.account.payouts_enabled || false,
          loginLink: data.loginLink,
          balance: data.balance,
          recentPayouts: data.recentPayouts || [],
        });
      }
    } catch (error) {
      console.error('Error fetching account status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAccountStatus();
    }
  }, [user]);

  const formatCurrency = (amount: number, currency: string = 'clp') => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount / 100);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Configuración de Pagos</h2>
        <p className="text-muted-foreground">
          Gestiona tu cuenta de Stripe para recibir pagos
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cuenta de Stripe</CardTitle>
          <CardDescription>
            Conecta tu cuenta de Stripe para recibir pagos por tus servicios legales.
            UpLegal retiene una comisión del 20% por cada transacción.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : accountStatus.connected ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Estado de la cuenta:</p>
                  <p className="text-sm text-muted-foreground">
                    {accountStatus.status === 'complete' ? 'Verificada' : 'Pendiente de verificación'}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Pagos habilitados:</p>
                  <p className="text-sm text-muted-foreground">
                    {accountStatus.payoutsEnabled ? 'Sí' : 'No'}
                  </p>
                </div>
              </div>

              {accountStatus.balance && (
                <div className="pt-4 border-t">
                  <h3 className="font-medium mb-2">Saldo disponible</h3>
                  {accountStatus.balance.available.map((balance: any) => (
                    <div key={balance.currency} className="flex items-center justify-between">
                      <span>{balance.currency.toUpperCase()}</span>
                      <span className="font-medium">
                        {formatCurrency(balance.amount, balance.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-4 border-t flex justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => window.open(accountStatus.loginLink, '_blank')}
                >
                  Ver en Stripe
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center py-8 space-y-4">
              <p className="text-center text-muted-foreground">
                Conecta tu cuenta de Stripe para comenzar a recibir pagos por tus servicios legales.
              </p>
              <Button 
                onClick={connectStripeAccount}
                disabled={loading}
              >
                {loading ? 'Conectando...' : 'Conectar con Stripe'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {accountStatus.recentPayouts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pagos recientes</CardTitle>
            <CardDescription>
              Historial de tus últimos pagos realizados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {accountStatus.recentPayouts.map((payout: any) => (
                <div key={payout.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">
                      {new Date(payout.arrival_date * 1000).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {payout.status === 'paid' ? 'Completado' : 'Pendiente'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {formatCurrency(payout.amount, payout.currency)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {payout.bank_account?.bank_name || payout.destination?.bank_name || ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
