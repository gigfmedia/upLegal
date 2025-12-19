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
import { handlePasswordReset } from '@/utils/auth-utils';
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

  // Handle the password reset token from URL
  useEffect(() => {
    const processPasswordReset = async () => {
      const code = searchParams.get('code');
      
      if (code) {
        setProcessingReset(true);
        const result = await handlePasswordReset();
        if (!result.success) {
          setError(result.error || 'Error al procesar el restablecimiento de contraseña');
          toast({
            title: 'Error',
            description: result.error || 'Error al procesar el restablecimiento de contraseña',
            variant: 'destructive',
          });
        }
      }
      setLoading(false);
      setProcessingReset(false);
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
      const code = searchParams.get('code');
      const email = searchParams.get('email');
      
      if (code && email) {
        // If we have a code and email, verify the OTP first
        const { error: verifyError } = await supabase.auth.verifyOtp({
          email,
          token: code,
          type: 'recovery'
        });

        if (verifyError) throw verifyError;
      }

      // Now update the password
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

  // Handle the password reset token from URL
  useEffect(() => {
    const processPasswordReset = async () => {
      const code = searchParams.get('code');
      const email = searchParams.get('email');
      
      if (code && email) {
        try {
          setProcessingReset(true);
          // Just verify the code is valid, don't update the password yet
          const { error } = await supabase.auth.verifyOtp({
            email,
            token: code,
            type: 'recovery'
          });
          
          if (error) throw error;
          
        } catch (error) {
          console.error('Error al procesar el enlace de recuperación:', error);
          setError('El enlace de recuperación no es válido o ha expirado. Por favor, solicita un nuevo enlace.');
        } finally {
          setProcessingReset(false);
        }
      }
      setLoading(false);
    };

    processPasswordReset();
  }, [searchParams]);

  // Show error if no code is provided
  if (!searchParams.get('code') && !searchParams.get('access_token')) {
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
