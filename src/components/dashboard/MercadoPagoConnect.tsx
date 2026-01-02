import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Loader2, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MercadoPagoAccount {
  id: string;
  mercadopago_user_id: string;
  email: string;
  nickname: string;
  first_name: string;
  last_name: string;
  expires_at: string;
  created_at: string;
}

export const MercadoPagoConnect: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState<MercadoPagoAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Check connection status on mount
  useEffect(() => {
    checkConnection();
  }, [user]);

  // Handle OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mpSuccess = params.get('mp_success');
    const mpConnected = params.get('mp_connected');
    const mpError = params.get('mp_error');

    // Handle success from OAuth callback
    if (mpSuccess === 'true' || mpConnected === 'success') {
      // Extract OAuth data from URL
      const mpUserId = params.get('mp_user_id');
      const mpEmail = params.get('mp_email');
      const mpNickname = params.get('mp_nickname');
      const mpAccessToken = params.get('mp_access_token');
      const mpRefreshToken = params.get('mp_refresh_token');
      const mpPublicKey = params.get('mp_public_key');
      const mpExpiresAt = params.get('mp_expires_at');

      if (mpUserId && mpAccessToken && user?.id) {
        saveAccount({
          userId: user.id,
          mercadopagoUserId: mpUserId,
          accessToken: mpAccessToken,
          refreshToken: mpRefreshToken || '',
          publicKey: mpPublicKey || '',
          email: mpEmail || '',
          nickname: mpNickname || '',
          firstName: '',
          lastName: '',
          expiresAt: mpExpiresAt || ''
        });
      } else if (mpConnected === 'success') {
        // If we only have mp_connected=success, just refresh the connection status
        // This happens when the backend saves the account directly
        checkConnection();
        toast({
          title: 'Cuenta conectada',
          description: 'Tu cuenta de MercadoPago ha sido conectada exitosamente.',
        });
      }

      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (mpError || mpConnected === 'error') {
      toast({
        title: 'Error al conectar',
        description: getErrorMessage(mpError || 'server_error'),
        variant: 'destructive'
      });
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [user]);

  const getErrorMessage = (error: string): string => {
    const messages: Record<string, string> = {
      'no_code': 'No se recibió el código de autorización',
      'token_exchange_failed': 'Error al intercambiar el código por token',
      'user_fetch_failed': 'Error al obtener información del usuario',
      'server_error': 'Error del servidor'
    };
    return messages[error] || 'Error desconocido';
  };

  const checkConnection = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
      const response = await fetch(`${API_BASE_URL}/api/mercadopago/account/${user.id}`);
      
      if (!response.ok) {
        throw new Error('Failed to check connection');
      }

      const data = await response.json();
      setIsConnected(data.connected);
      setAccount(data.account || null);
    } catch (error) {
      // Error handled silently
    } finally {
      setIsLoading(false);
    }
  };

  const saveAccount = async (accountData: any) => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
      const response = await fetch(`${API_BASE_URL}/api/mercadopago/save-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(accountData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save account');
      }

      const result = await response.json();
      
      // Update state immediately with the saved account data
      if (result.account) {
        setIsConnected(true);
        setAccount({
          id: result.account.id || accountData.mercadopagoUserId,
          mercadopago_user_id: result.account.mercadopago_user_id || accountData.mercadopagoUserId,
          email: result.account.email || accountData.email,
          nickname: result.account.nickname || accountData.nickname || '',
          first_name: result.account.first_name || accountData.firstName || '',
          last_name: result.account.last_name || accountData.lastName || '',
          expires_at: result.account.expires_at || accountData.expiresAt || '',
          created_at: result.account.created_at || new Date().toISOString()
        });
      } else {
        // If no account in response, refresh from server
        await checkConnection();
      }

      toast({
        title: 'Cuenta conectada',
        description: `Tu cuenta de MercadoPago (${accountData.email || 'conectada'}) ha sido conectada exitosamente.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo guardar la conexión de MercadoPago.',
        variant: 'destructive'
      });
      // Still try to check connection in case it was saved by the backend
      await checkConnection();
    }
  };

  const handleConnect = () => {
    const clientId = import.meta.env.VITE_MERCADOPAGO_CLIENT_ID;
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
    
    // IMPORTANT: redirect_uri must point to the BACKEND server, not the frontend
    const redirectUri = `${apiBaseUrl}/api/mercadopago/oauth/callback`;
    const state = Math.random().toString(36).substring(2);

    // Save state for validation
    localStorage.setItem('mp_auth_state', state);

    // Build OAuth URL - MercadoPago uses a unified OAuth endpoint for all regions
    const authUrl = new URL('https://auth.mercadopago.com/authorization');
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('platform_id', 'mp');
    authUrl.searchParams.append('state', state);
    authUrl.searchParams.append('redirect_uri', redirectUri);

    window.location.href = authUrl.toString();
  };

  const handleDisconnect = async () => {
    if (!user?.id) return;
    
    if (!confirm('¿Estás seguro de que deseas desconectar tu cuenta de MercadoPago?')) {
      return;
    }

    try {
      setIsDisconnecting(true);
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
      const response = await fetch(`${API_BASE_URL}/api/mercadopago/disconnect/${user.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect');
      }

      toast({
        title: 'Cuenta desconectada',
        description: 'Tu cuenta de MercadoPago ha sido desconectada.',
      });

      setIsConnected(false);
      setAccount(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo desconectar la cuenta de MercadoPago.',
        variant: 'destructive'
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>MercadoPago</CardTitle>
          <CardDescription>Conecta tu cuenta para recibir pagos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          MercadoPago
          {isConnected && <CheckCircle className="h-5 w-5 text-green-600" />}
        </CardTitle>
        <CardDescription>
          Conecta tu cuenta de MercadoPago para recibir pagos directamente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected && account ? (
          <>
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Cuenta conectada: <strong>{account.email}</strong>
                {account.nickname && ` (@${account.nickname})`}
              </AlertDescription>
            </Alert>
            
            <div className="text-sm text-gray-600">
              <p>Conectada desde: {new Date(account.created_at).toLocaleDateString('es-CL')}</p>
            </div>

            <Button
              variant="destructive"
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="w-full"
            >
              {isDisconnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Desconectando...
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Desconectar cuenta
                </>
              )}
            </Button>
          </>
        ) : (
          <>
            <Alert>
              <AlertDescription>
                Conecta tu cuenta de MercadoPago para recibir el 80% de los pagos directamente en tu cuenta.
              </AlertDescription>
            </Alert>

            <Button
              onClick={handleConnect}
              className="w-full bg-blue-500 hover:bg-blue-600"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Conectar con MercadoPago
            </Button>

            <p className="text-xs text-gray-500 text-center">
              Serás redirigido a MercadoPago para autorizar la conexión
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};
