import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyEmail = async () => {
      const email = searchParams.get('email');
      const token = searchParams.get('token');
      const type = searchParams.get('type') || 'email';

      if (!email || !token) {
        setStatus('error');
        setError('Falta el correo o el token de verificación');
        return;
      }

      try {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          email,
          token,
          type: type as 'signup' | 'email'
        });

        if (verifyError) throw verifyError;
        
        setStatus('success');
        // Redirect to dashboard after 3 seconds
        setTimeout(() => navigate('/dashboard'), 3000);
      } catch (err) {
        console.error('Error verifying email:', err);
        setStatus('error');
        setError('No se pudo verificar el correo. El enlace puede haber expirado o ser inválido.');
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-md">
        <div className="text-center">
          {status === 'loading' && (
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
              <h2 className="text-2xl font-bold text-gray-900">Verificando tu correo...</h2>
              <p className="text-gray-600">Por favor espera mientras confirmamos tu dirección de correo.</p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">¡Correo verificado!</h2>
              <p className="text-gray-600">Tu dirección de correo ha sido verificada correctamente.</p>
              <p className="text-sm text-gray-500">Redirigiendo al dashboard...</p>
              <Button onClick={() => navigate('/dashboard')} className="mt-4">
                Ir al Dashboard
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="rounded-full bg-red-100 p-3">
                <AlertCircle className="h-10 w-10 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Error de verificación</h2>
              <p className="text-center text-gray-600">{error}</p>
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/login'}
                className="mt-4"
              >
                Volver al inicio de sesión
              </Button>
              <Button 
                variant="ghost"
                onClick={() => window.location.href = '/signup'}
                className="text-blue-600 hover:text-blue-800"
              >
                ¿No tienes una cuenta? Regístrate
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
