import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Check, ArrowLeft } from 'lucide-react';
import { AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import Header from "@/components/Header";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [processingReset, setProcessingReset] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Process recovery link: Supabase may send tokens in URL hash or a code in query
  useEffect(() => {
    const processPasswordReset = async () => {
      try {
        setProcessingReset(true);

        const url = new URL(window.location.href);
        const queryCode = searchParams.get('code');
        const hashParams = new URLSearchParams(url.hash.replace('#', ''));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        if (accessToken && refreshToken && type === 'recovery') {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) throw sessionError;

          // Clear hash to avoid leaking tokens
          window.history.replaceState({}, '', `${url.pathname}${url.search}`);
        } else if (queryCode) {
          // PKCE/code flow
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(queryCode);
          if (exchangeError) throw exchangeError;

          // Remove code from URL
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('code');
          window.history.replaceState({}, '', newUrl.toString());
        }
      } catch (err) {
        console.error('Error al procesar el enlace de recuperación:', err);
        setError('El enlace de recuperación no es válido o ha expirado. Por favor, solicita un nuevo enlace.');
        toast({
          title: 'Error',
          description: 'El enlace de recuperación no es válido o ha expirado. Por favor, solicita un nuevo enlace.',
          variant: 'destructive',
        });
      } finally {
        setProcessingReset(false);
        setLoading(false);
      }
    };

    processPasswordReset();
  }, [searchParams, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      setProcessingReset(true);
      // Update password (requires a valid recovery session)
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) throw updateError;
      
      setSuccess(true);
      toast({
        title: '¡Contraseña actualizada!',
        description: 'Tu contraseña ha sido actualizada correctamente. Serás redirigido para iniciar sesión.',
      });
      
      // Sign out the user to ensure they need to log in again
      await supabase.auth.signOut();
      
      // Redirect to login page after 3 seconds
      setTimeout(() => {
        navigate('/?showAuth=login');
      }, 3000);
      
    } catch (error) {
      console.error('Error al actualizar la contraseña:', error);
      setError('Ocurrió un error al actualizar la contraseña. El enlace puede haber expirado. Por favor, solicita uno nuevo.');
    } finally {
      setProcessingReset(false);
    }
  };

  // Show error if no code is provided
  const hasHashRecoveryToken = typeof window !== 'undefined' && window.location.hash.includes('access_token=');
  if (!searchParams.get('code') && !hasHashRecoveryToken) {
    return (
      <div className="w-full">
      <Header />
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
            <div className="text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-yellow-500" />
              <h2 className="mt-6 text-2xl font-bold text-gray-900">
                Enlace inválido o expirado
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                No se encontró un código de restablecimiento válido. Por favor, solicita un nuevo enlace desde la página de inicio de sesión.
              </p>
              <div className="mt-6">
                <Button
                  onClick={() => navigate('/')}
                  className="w-full"
                >
                  Volver al inicio de sesión
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-600" />
          <p className="mt-4 text-gray-600">Procesando solicitud de restablecimiento...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="w-full">
      <Header />
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full space-y-8 text-center p-8 bg-white rounded-lg shadow">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="mt-6 text-2xl font-bold text-gray-900">
              ¡Contraseña actualizada!
            </h2>
            <p className="text-gray-600">
              Tu contraseña ha sido actualizada correctamente. Serás redirigido a la página de inicio de sesión.
            </p>
            <Button 
              onClick={() => navigate('/login')} 
              className="mt-4"
            >
              Ir al inicio de sesión
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Header />
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
          <div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="mb-4 -ml-2"
              onClick={() => navigate('/login')}
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Volver al inicio de sesión
            </Button>
            
            <h2 className="mt-2 text-2xl font-bold text-gray-900">
              Restablecer contraseña
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Ingresa tu nueva contraseña. Asegúrate de que tenga al menos 6 caracteres.
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="password">Nueva contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1"
                  minLength={6}
                  placeholder="••••••"
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1"
                  minLength={6}
                  placeholder="••••••"
                />
              </div>
            </div>

            <div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={processingReset}
                size="lg"
              >
                {processingReset ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  'Actualizar contraseña'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
