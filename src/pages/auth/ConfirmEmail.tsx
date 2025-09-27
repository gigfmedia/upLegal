import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { handleAuthError } from '@/lib/authErrorHandler';

interface ConfirmEmailState {
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
}

export function ConfirmEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { confirmEmail, isEmailVerified } = useAuth();
  const [state, setState] = useState<ConfirmEmailState>({
    status: 'idle',
    error: null,
  });
  
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  const redirectTo = searchParams.get('redirect') || '/dashboard';

  useEffect(() => {
    const confirmEmailAddress = async () => {
      if (!token || !email) {
        setState({
          status: 'error',
          error: 'Enlace de confirmación inválido. Faltan parámetros requeridos.',
        });
        return;
      }

      // Check if email is already verified
      if (isEmailVerified()) {
        setState({ status: 'success', error: null });
        return;
      }

      try {
        setState({ status: 'loading', error: null });
        
        const success = await confirmEmail(token, email);
        
        if (!success) {
          throw new Error('No se pudo confirmar el correo electrónico. El enlace puede haber expirado.');
        }
        
        setState({ status: 'success', error: null });
      } catch (error) {
        console.error('Error confirming email:', error);
        const errorMessage = error instanceof Error 
          ? error.message 
          : 'Ocurrió un error al confirmar tu correo electrónico. Por favor, inténtalo de nuevo.';
        
        setState({ status: 'error', error: errorMessage });
      }
    };

    if (state.status === 'idle') {
      confirmEmailAddress();
    }
  }, [token, email, confirmEmail, isEmailVerified, state.status]);

  const handleContinue = () => {
    // If there's a redirect URL in the query params, use it
    // Otherwise, go to the profile setup
    navigate(redirectTo);
  };

  // Show loading state
  if (state.status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="bg-white p-8 rounded-lg shadow-md">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            </div>
            <h2 className="mt-6 text-2xl font-bold text-gray-900">
              Confirmando tu correo electrónico...
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Por favor, espera mientras verificamos tu dirección de correo electrónico.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (state.status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="bg-white p-8 rounded-lg shadow-md">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="mt-6 text-2xl font-bold text-gray-900 text-center">
              Error al confirmar el correo
            </h2>
            
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {state.error || 'Ocurrió un error al confirmar tu correo electrónico.'}
              </AlertDescription>
            </Alert>
            
            <div className="mt-6 space-y-4">
              <p className="text-sm text-gray-600 text-center">
                ¿No recibiste el correo de confirmación o el enlace expiró?
              </p>
              
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/auth/resend-confirmation')}
              >
                Reenviar correo de confirmación
              </Button>
              
              <Button
                variant="ghost"
                className="w-full mt-2"
                onClick={() => navigate('/')}
              >
                Volver al inicio
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show success state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          
          <h1 className="mt-6 text-2xl font-bold text-gray-900 text-center">
            ¡Correo confirmado con éxito!
          </h1>
          
          <div className="mt-4 space-y-4">
            <p className="text-sm text-gray-600 text-center">
              Gracias por confirmar tu dirección de correo electrónico. 
              Tu cuenta ha sido verificada exitosamente.
            </p>
            
            <Alert className="bg-blue-50 border-blue-200">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-800">¡Bienvenido a LegalUp!</AlertTitle>
              <AlertDescription className="text-blue-700">
                Por favor, completa tu perfil para comenzar a utilizar la plataforma.
              </AlertDescription>
            </Alert>
            
            <div className="mt-6 space-y-3">
              <Button 
                onClick={handleContinue}
                className="w-full"
              >
                Continuar a mi cuenta
              </Button>
              
              <Button 
                variant="outline"
                className="w-full"
                onClick={() => navigate('/')}
              >
                Volver al inicio
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
