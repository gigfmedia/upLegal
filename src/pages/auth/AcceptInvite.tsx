import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, CheckCircle, AlertCircle, Eye, EyeOff, Check, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import Header from '@/components/Header';

type InviteStatus = 'checking' | 'needs_password' | 'success' | 'error';

export default function AcceptInvite() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [status, setStatus] = useState<InviteStatus>('checking');
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [role, setRole] = useState<'client' | 'lawyer'>('client');
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [passwordRequirements, setPasswordRequirements] = useState({
    length: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSymbol: false
  });

  // Check password strength and update requirements
  const checkPasswordStrength = (password: string) => {
    setPasswordRequirements({
      length: password.length >= 8 && password.length <= 18,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSymbol: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]+/.test(password),
    });
  };

  const isPasswordValid = Object.values(passwordRequirements).every(Boolean);

  const hashParams = useMemo(() => {
    if (typeof window === 'undefined') return new URLSearchParams();
    const hash = window.location.hash?.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
    return new URLSearchParams(hash || undefined);
  }, [typeof window === 'undefined' ? 0 : 1]);

  const inviteType = searchParams.get('type') || hashParams.get('type');
  const inviteEmail = searchParams.get('email') || hashParams.get('email');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('sb-pending-invite');
    }

    const initialize = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
          setStatus('error');
          setError('Tu enlace de invitación no es válido o ha expirado. Solicita que te envíen uno nuevo.');
          return;
        }

        setEmail(session.user.email || inviteEmail || '');
        const metadataRole = (session.user.user_metadata?.role as 'client' | 'lawyer' | undefined) || undefined;
        const inviteRoleParam = (searchParams.get('role') || hashParams.get('role')) as 'client' | 'lawyer' | null;
        // Priorizar el rol del user_metadata (viene de la invitación)
        // Si no hay rol en metadata, usar el parámetro o default a client
        const finalRole = metadataRole || inviteRoleParam || 'client';
        console.log('  - finalRole:', finalRole);
        setRole(finalRole as 'client' | 'lawyer');

        if (inviteType !== 'invite') {
          setStatus('error');
          setError('Esta página solo puede usarse con invitaciones válidas.');
          return;
        }

        setStatus('needs_password');
      } catch (err) {
        console.error('Error verificando la invitación:', err);
        setStatus('error');
        setError('No pudimos validar tu invitación. Inténtalo de nuevo o solicita una nueva.');
      }
    };

    initialize();
  }, [inviteEmail, inviteType]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (!isPasswordValid) {
      setError('La contraseña no cumple con todos los requisitos de seguridad.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user }, error: getUserError } = await supabase.auth.getUser();
      if (getUserError || !user) {
        throw getUserError || new Error('No pudimos obtener tu sesión. Intenta abrir el enlace nuevamente.');
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password,
        data: {
          role,
        },
      });

      if (updateError) throw updateError;

      await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email,
        role,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

      setStatus('success');
      toast({
        title: 'Contraseña configurada',
        description: 'Tu cuenta fue activada correctamente. Ya puedes acceder a LegalUp.',
      });

      setTimeout(() => {
        if (role === 'lawyer') {
          navigate('/lawyer/onboarding');
        } else {
          navigate('/dashboard');
        }
      }, 1500);
    } catch (err) {
      console.error('Error actualizando la contraseña:', err);
      setError('No pudimos guardar tu contraseña. Inténtalo nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Verificando tu invitación...</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <Header />
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="rounded-full bg-green-100 p-3">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold">¡Todo listo!</h1>
            <p className="text-gray-600">Estamos redirigiéndote a tu panel de control.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Header />
      <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-lg shadow">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Configura tu contraseña</h1>
          <p className="text-gray-600">
            Hemos verificado tu invitación para <span className="font-semibold">{email || inviteEmail || 'tu correo'}</span>.
            Define una contraseña segura para comenzar a usar LegalUp.
          </p>
        </div>

        {status === 'error' && (
          <div className="flex items-start space-x-3 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">No pudimos validar tu invitación</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        {status !== 'error' && (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-gray-900">¿Cómo planeas usar LegalUp?</h3>
              <div className="space-y-3">
                <label className={`flex items-center p-4 rounded-lg border cursor-pointer transition-colors ${
                  role === 'client'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}>
                  <div className="flex items-center h-5">
                    <input
                      type="radio"
                      name="accountType"
                      value="client"
                      checked={role === 'client'}
                      onChange={() => setRole('client')}
                      className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <span className="font-medium text-gray-900">Soy Cliente - Busco servicios legales</span>
                  </div>
                </label>

                <label className={`flex items-center p-4 rounded-lg border cursor-pointer transition-colors ${
                  role === 'lawyer'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}>
                  <div className="flex items-center h-5">
                    <input
                      type="radio"
                      name="accountType"
                      value="lawyer"
                      checked={role === 'lawyer'}
                      onChange={() => setRole('lawyer')}
                      className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <span className="font-medium text-gray-900">Soy Abogado - Ofrezco servicios legales</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Contraseña</Label>
              <Tooltip open={isPasswordFocused}>
                <TooltipTrigger asChild>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value);
                        checkPasswordStrength(event.target.value);
                      }}
                      onFocus={() => setIsPasswordFocused(true)}
                      onBlur={() => setIsPasswordFocused(false)}
                      placeholder="Mínimo 8 caracteres"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-500" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-500" />
                      )}
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="w-64 p-4 space-y-2 text-sm" side="bottom" align="start">
                  <p className="font-medium mb-2">La contraseña debe contener:</p>
                  <ul className="space-y-1">
                    <li className="flex items-center">
                      {passwordRequirements.length ? (
                        <Check className="h-4 w-4 text-green-500 mr-2" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500 mr-2" />
                      )}
                      <span>8-18 caracteres</span>
                    </li>
                    <li className="flex items-center">
                      {passwordRequirements.hasUppercase ? (
                        <Check className="h-4 w-4 text-green-500 mr-2" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500 mr-2" />
                      )}
                      <span>1 mayúscula</span>
                    </li>
                    <li className="flex items-center">
                      {passwordRequirements.hasLowercase ? (
                        <Check className="h-4 w-4 text-green-500 mr-2" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500 mr-2" />
                      )}
                      <span>1 minúscula</span>
                    </li>
                    <li className="flex items-center">
                      {passwordRequirements.hasNumber ? (
                        <Check className="h-4 w-4 text-green-500 mr-2" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500 mr-2" />
                      )}
                      <span>1 número</span>
                    </li>
                    <li className="flex items-center">
                      {passwordRequirements.hasSymbol ? (
                        <Check className="h-4 w-4 text-green-500 mr-2" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500 mr-2" />
                      )}
                      <span>1 símbolo (!@#$%^&*)</span>
                    </li>
                  </ul>
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Confirmar contraseña</Label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Repite la contraseña"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-500" />
                  )}
                </Button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <Button className="w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Guardando...
                </>
              ) : (
                'Guardar contraseña'
              )}
            </Button>
          </form>
        )}

        <Button variant="ghost" className="w-full" onClick={() => navigate('/')}>Volver al inicio</Button>
      </div>
    </div>
  );
}
