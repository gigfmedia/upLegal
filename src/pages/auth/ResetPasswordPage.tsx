import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Check, ArrowLeft } from 'lucide-react';
import { AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { sendPasswordResetEmail } from '@/utils/auth-utils';
import { PasswordField } from '@/components/auth/SecurePasswordCard';
import { isPasswordStrong } from '@/lib/passwordValidation';
import { markPasswordSetupComplete } from '@/hooks/usePasswordSetupState';
import { useToast } from '@/hooks/use-toast';
import Header from "@/components/Header";

/**
 * Autorización de recuperación con alcance de visita (sessionStorage = por pestaña).
 * Se marca SOLO cuando esta visita canjeó credenciales de recuperación con éxito
 * (setSession / exchangeCode / verifyOtp). Permite reconocer una sesión que ya
 * fue establecida y cuya URL ya se limpió, sin aceptar una sesión ordinaria:
 * el valor guardado es el user id y debe coincidir con la sesión actual.
 * updateUser sigue actuando solo sobre el propio usuario de la sesión, por lo
 * que no hay escalación posible: esto solo decide si se muestra el formulario.
 */
const RECOVERY_OK_KEY = 'legalup_recovery_ok';

function markRecoveryProcessed(userId: string | undefined) {
  if (!userId) return;
  try {
    sessionStorage.setItem(RECOVERY_OK_KEY, userId);
  } catch {
    /* almacenamiento no disponible: se mantiene el gate por tokens */
  }
}

function readRecoveryMark(): string | null {
  try {
    return sessionStorage.getItem(RECOVERY_OK_KEY);
  } catch {
    return null;
  }
}

function clearRecoveryProcessed() {
  try {
    sessionStorage.removeItem(RECOVERY_OK_KEY);
  } catch {
    /* noop */
  }
}

/** Enlace inválido/expirado con opción de solicitar otro correo (sin salir del flujo). */
function InvalidLinkScreen({ onBackToLogin, reason }: { onBackToLogin: () => void; reason: 'used_or_expired' | 'generic' }) {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({ title: 'Error', description: 'Ingresa tu correo electrónico.', variant: 'destructive' });
      return;
    }
    setSending(true);
    try {
      const { success, error } = await sendPasswordResetEmail(email.trim());
      if (!success) throw new Error(error);
      setSent(true);
      toast({ title: 'Correo enviado', description: 'Revisa tu bandeja de entrada para continuar.' });
    } catch {
      toast({ title: 'Error', description: 'No se pudo enviar el correo. Inténtalo de nuevo.', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="w-full">
      <Header />
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 pt-28">
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-yellow-500" />
            <h2 className="mt-6 text-2xl font-bold text-gray-900">
              Enlace inválido o expirado
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {reason === 'used_or_expired'
                ? 'Este enlace ya fue utilizado o expiró. Los enlaces de recuperación son de un solo uso. Ingresa tu correo para recibir uno nuevo.'
                : 'No se encontró un código de restablecimiento válido. Ingresa tu correo para recibir uno nuevo.'}
            </p>
          </div>
          {sent ? (
            <p role="status" className="text-sm text-green-700 text-center">
              Si el correo está registrado, recibirás un nuevo enlace en unos minutos.
            </p>
          ) : (
            <form onSubmit={handleResend} className="space-y-4">
              <div>
                <Label htmlFor="reset-resend-email">Correo electrónico</Label>
                <Input
                  id="reset-resend-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tucorreo@ejemplo.cl"
                  className="mt-1"
                />
              </div>
              <Button type="submit" className="w-full" disabled={sending}>
                {sending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar nuevo enlace'
                )}
              </Button>
            </form>
          )}
          <div>
            <Button onClick={onBackToLogin} variant="outline" className="w-full">
              Volver al inicio de sesión
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [processingReset, setProcessingReset] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  // null = sin verificar (solo relevante sin tokens en URL); true = esta
  // visita procesó una recuperación; false = sesión ordinaria o sin sesión.
  const [recoveryVerified, setRecoveryVerified] = useState<boolean | null>(null);
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
        const queryTokenHash = searchParams.get('token_hash');
        const queryType = searchParams.get('type');
        const hashParams = new URLSearchParams(url.hash.replace('#', ''));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        if (accessToken && refreshToken && type === 'recovery') {
          const { data: setData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) throw sessionError;
          markRecoveryProcessed(setData?.user?.id);
          setRecoveryVerified(true);

          // Clear hash to avoid leaking tokens
          window.history.replaceState({}, '', `${url.pathname}${url.search}`);
        } else if (queryCode) {
          // PKCE/code flow. El cliente (detectSessionInUrl) puede haber
          // canjeado el código automáticamente al cargar: si el canje manual
          // falla pero ya hay sesión activa, fue una carrera ganada por el
          // auto-canje y se continúa sin mostrar un falso "enlace inválido".
          // Sin sesión, el error es real.
          const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(queryCode);
          if (exchangeError) {
            const { data: { session: racedSession } } = await supabase.auth.getSession();
            if (!racedSession) throw exchangeError;
            markRecoveryProcessed(racedSession.user?.id);
          } else {
            markRecoveryProcessed(exchangeData?.user?.id);
          }
          setRecoveryVerified(true);

          // Remove code from URL
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('code');
          window.history.replaceState({}, '', newUrl.toString());
        } else if (queryTokenHash && queryType === 'recovery') {
          const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
            type: 'recovery',
            token_hash: queryTokenHash,
          });
          if (verifyError) throw verifyError;
          markRecoveryProcessed(verifyData?.user?.id);
          setRecoveryVerified(true);

          // Remove token_hash/type from URL
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('token_hash');
          newUrl.searchParams.delete('type');
          window.history.replaceState({}, '', newUrl.toString());
        } else {
          // Sin credenciales en la URL: solo continuar si ESTA visita ya
          // procesó una recuperación (sesión establecida y URL limpiada).
          // Una sesión ordinaria sin marca NO autoriza el restablecimiento.
          const mark = readRecoveryMark();
          if (mark) {
            const { data: { session: markedSession } } = await supabase.auth.getSession();
            if (markedSession && markedSession.user?.id === mark) {
              setRecoveryVerified(true);
            } else {
              setRecoveryVerified(false);
            }
          } else {
            setRecoveryVerified(false);
          }
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
    
    if (!isPasswordStrong(password)) {
      setError('La contraseña debe tener entre 8 y 18 caracteres e incluir mayúscula, minúscula, número y símbolo.');
      return;
    }

    try {
      setProcessingReset(true);
      // Si esta visita marcó una recuperación, la sesión actual debe seguir
      // siendo del mismo usuario (cierre/cambio de cuenta en otra pestaña o
      // expiración no deben heredar la autorización). Sin marca (tokens
      // validados en esta visita pero almacenamiento no disponible) se
      // continúa: updateUser actúa solo sobre la sesión vigente.
      const mark = readRecoveryMark();
      if (mark) {
        const { data: { user: submitUser } } = await supabase.auth.getUser();
        if (!submitUser || submitUser.id !== mark) {
          clearRecoveryProcessed();
          setError('La sesión cambió durante el proceso. Solicita un nuevo enlace de recuperación.');
          setProcessingReset(false);
          return;
        }
      }
      // Update password (requires a valid recovery session)
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) throw updateError;

      // Un solo uso: la autorización de esta visita queda consumida.
      clearRecoveryProcessed();

      // 4.53D: graduate into explicit password authority while the recovery
      // session is still valid (before sign-out below). Best effort: failure
      // leaves legacy_unknown (safe Cambiar fallback) without blocking reset.
      try {
        await markPasswordSetupComplete();
      } catch {
        /* marker retry happens naturally on next verified change */
      }
      
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
  const hasQueryRecoveryToken = Boolean(searchParams.get('code') || (searchParams.get('token_hash') && searchParams.get('type') === 'recovery'));
  // GoTrue redirige enlaces consumidos/expirados con params de error
  // (otp_expired, access_denied). Detectarlos distingue "enlace usado" de
  // "enlace sin tokens" sin exponer valores.
  const hashErrorParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.hash.replace('#', '') : '');
  const urlErrorCode =
    searchParams.get('error_code') ||
    hashErrorParams.get('error_code');
  const linkFailed = Boolean(searchParams.get('error') || hashErrorParams.get('error') || urlErrorCode);
  const usedOrExpired = urlErrorCode === 'otp_expired' || urlErrorCode === 'access_denied';
  if (!hasQueryRecoveryToken && !hasHashRecoveryToken && recoveryVerified !== true) {
    // loading === true + recoveryVerified === null significa "aún verificando":
    // no mostrar el error hasta que el efecto confirme que no hay autorización.
    if (loading || recoveryVerified === null) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-gray-900" />
            <p className="mt-4 text-gray-600">Procesando solicitud de restablecimiento...</p>
          </div>
        </div>
      );
    }
    return (
      <InvalidLinkScreen
        onBackToLogin={() => navigate('/')}
        reason={linkFailed || usedOrExpired ? 'used_or_expired' : 'generic'}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-gray-900" />
          <p className="mt-4 text-gray-600">Procesando solicitud de restablecimiento...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="w-full">
      <Header />
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 pt-28">
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
              Ingresa tu nueva contraseña. Debe tener entre 8 y 18 caracteres e incluir mayúscula, minúscula, número y símbolo.
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            <div className="space-y-4">
              <PasswordField
                id="password"
                label="Nueva contraseña"
                placeholder="••••••"
                value={password}
                onChange={setPassword}
                disabled={processingReset}
                autoComplete="new-password"
              />
              <PasswordField
                id="confirmPassword"
                label="Confirmar contraseña"
                placeholder="••••••"
                value={confirmPassword}
                onChange={setConfirmPassword}
                disabled={processingReset}
                autoComplete="new-password"
              />
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
