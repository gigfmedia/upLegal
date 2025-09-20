import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';

export default function EmailVerification() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');
      const type = searchParams.get('type') as 'signup' | 'recovery' | 'invite' | 'email' | null;

      if (!token || !type) {
        setStatus('error');
        setError('Enlace de verificación inválido o faltan parámetros requeridos.');
        return;
      }

      try {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: type as 'signup' | 'recovery' | 'invite' | 'email',
        });

        if (error) throw error;
        
        setStatus('success');
        toast({
          title: '¡Correo verificado!',
          description: 'Tu dirección de correo electrónico ha sido verificada correctamente.',
        });
      } catch (err) {
        console.error('Error al verificar el correo:', err);
        setStatus('error');
        setError('El enlace de verificación ha expirado o no es válido.');
      }
    };

    verifyEmail();
  }, [searchParams, toast]);

  const handleResendEmail = async () => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: searchParams.get('email') || undefined,
      });

      if (error) throw error;

      toast({
        title: 'Correo de verificación reenviado',
        description: 'Por favor revisa tu bandeja de entrada.',
      });
    } catch (err) {
      console.error('Error al reenviar el correo:', err);
      toast({
        title: 'Error',
        description: 'No se pudo reenviar el correo de verificación. Inténtalo de nuevo más tarde.',
        variant: 'destructive',
      });
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
        <Loader2 className="w-12 h-12 mb-4 text-blue-600 animate-spin" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Verificando tu correo electrónico</h1>
        <p className="text-gray-600">Por favor espera mientras confirmamos tu dirección de correo electrónico...</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
        <div className="bg-green-100 p-4 rounded-full mb-6">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">¡Correo verificado con éxito!</h1>
        <p className="text-gray-600 mb-8 max-w-md">
          Tu dirección de correo electrónico ha sido verificada correctamente. 
          Ahora puedes acceder a todas las funciones de LegalUp.
        </p>
        <Button onClick={() => navigate('/dashboard')}>
          Ir al panel de control
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      <div className="bg-red-100 p-4 rounded-full mb-6">
        <XCircle className="w-12 h-12 text-red-600" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Error al verificar el correo</h1>
      <p className="text-gray-600 mb-6 max-w-md">
        {error || 'Ha ocurrido un error al intentar verificar tu dirección de correo electrónico.'}
      </p>
      <div className="space-x-4">
        <Button variant="outline" onClick={() => navigate('/')}>
          Volver al inicio
        </Button>
        <Button onClick={handleResendEmail}>
          Reenviar correo de verificación
        </Button>
      </div>
    </div>
  );
}
