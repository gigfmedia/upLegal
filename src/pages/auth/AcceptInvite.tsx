import { Component, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, CheckCircle, AlertCircle, Eye, EyeOff, Check, XCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import Header from '@/components/Header';

type InviteStatus = 'checking' | 'needs_password' | 'success' | 'error';

class AcceptInviteErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('[AcceptInvite-ErrorBoundary] Error capturado:', error.message, error.stack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white p-8 rounded-lg shadow text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <h1 className="text-xl font-bold">Algo salió mal</h1>
            <p className="text-gray-600">
              No pudimos procesar tu invitación. Puedes solicitar una nueva invitación al administrador.
            </p>
            <Button variant="outline" onClick={() => window.location.href = '/'}>
              Volver al inicio
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function extractParamsFromAllSources() {
  const hash = window.location.hash?.startsWith('#') ? window.location.hash.slice(1) : window.location.hash || '';
  const search = window.location.search?.startsWith('?') ? window.location.search.slice(1) : window.location.search || '';

  const hashParams = new URLSearchParams(hash);
  const searchParams = new URLSearchParams(search);

  return {
    type: hashParams.get('type') || searchParams.get('type'),
    email: hashParams.get('email') || hashParams.get('user_email') || searchParams.get('email') || searchParams.get('user_email'),
    accessToken: hashParams.get('access_token') || searchParams.get('access_token'),
    refreshToken: hashParams.get('refresh_token') || searchParams.get('refresh_token'),
  };
}

function AcceptInviteInner() {
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
    hasSymbol: false,
  });

  const checkPasswordStrength = (pw: string) => {
    setPasswordRequirements({
      length: pw.length >= 8 && pw.length <= 18,
      hasUppercase: /[A-Z]/.test(pw),
      hasLowercase: /[a-z]/.test(pw),
      hasNumber: /[0-9]/.test(pw),
      hasSymbol: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]+/.test(pw),
    });
  };

  const isPasswordValid = Object.values(passwordRequirements).every(Boolean);

  const hashParams = useMemo(() => {
    if (typeof window === 'undefined') return new URLSearchParams();
    const h = window.location.hash?.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
    return new URLSearchParams(h || undefined);
  }, []);

  const inviteType = searchParams.get('type') || hashParams.get('type');
  const inviteEmail = searchParams.get('email') || hashParams.get('email') || hashParams.get('user_email') || searchParams.get('user_email');

  useEffect(() => {
    console.log('[AcceptInvite] Mounted - URL:', window.location.href);
    console.log('[AcceptInvite] Search:', window.location.search);
    console.log('[AcceptInvite] Hash:', window.location.hash);
    console.log('[AcceptInvite] inviteType:', inviteType, 'inviteEmail:', inviteEmail);
    console.log('[AcceptInvite] Parsed from all sources:', extractParamsFromAllSources());

    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('sb-pending-invite');
    }

    const initialize = async () => {
      try {
        const all = extractParamsFromAllSources();
        console.log('[AcceptInvite] All params:', all);

        if (all.accessToken && all.refreshToken && !all.type) {
          console.log('[AcceptInvite] Tokens found in URL (Android hash-to-query fallback), setting session');
          const { error: setSessionErr } = await supabase.auth.setSession({
            access_token: all.accessToken,
            refresh_token: all.refreshToken,
          });
          if (setSessionErr) {
            console.error('[AcceptInvite] Error setting session from query params:', setSessionErr);
          } else {
            console.log('[AcceptInvite] Session set from query params successfully');
          }
        }

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log('[AcceptInvite] getSession result:', { hasSession: !!session, sessionEmail: session?.user?.email, sessionRole: session?.user?.user_metadata?.role, error: sessionError });

        if (sessionError) {
          console.error('[AcceptInvite] Session error:', sessionError);
          setStatus('error');
          setError('Tu enlace de invitación no es válido o ha expirado. Solicita que te envíen uno nuevo.');
          return;
        }

        if (!session) {
          console.log('[AcceptInvite] No session found');
          setStatus('error');
          setError('No pudimos verificar tu identidad. Asegúrate de haber abierto el enlace correcto desde el correo de invitación.');
          return;
        }

        const resolvedEmail = session.user.email || inviteEmail || all.email || '';
        console.log('[AcceptInvite] Resolved email:', resolvedEmail);
        setEmail(resolvedEmail);

        const metadataRole = session.user.user_metadata?.role as 'client' | 'lawyer' | undefined;
        const paramRole = (searchParams.get('role') || hashParams.get('role')) as 'client' | 'lawyer' | null;
        const finalRole = metadataRole || paramRole || 'client';
        setRole(finalRole);
        console.log('[AcceptInvite] Role resolved:', finalRole, '(metadata:', metadataRole, 'param:', paramRole, ')');

        const inviteParam = searchParams.get('type') || hashParams.get('type') || all.type || session.user.user_metadata?.invite_type;
        console.log('[AcceptInvite] inviteParam:', inviteParam);

        if (inviteParam !== 'invite') {
          console.log('[AcceptInvite] NOT an invite (type=', inviteParam, '). Checking session metadata for invite clue.');
          const createdAt = session.user.created_at ? new Date(session.user.created_at).getTime() : 0;
          const hasNoPassword = !session.user.identities?.some(i => i.provider === 'email');
          const isRecent = Date.now() - createdAt < 24 * 60 * 60 * 1000;

          console.log('[AcceptInvite] Session diagnostics:', {
            createdAt: session.user.created_at,
            hasIdentities: !!session.user.identities,
            identities: session.user.identities?.map(i => i.provider),
            isRecent,
            hasNoPassword,
            userMetadata: session.user.user_metadata,
          });

          if (isRecent && hasNoPassword) {
            console.log('[AcceptInvite] User is recent and has no password, treating as invite');
            setStatus('needs_password');
            return;
          }

          setStatus('error');
          setError('Esta página solo puede usarse con invitaciones válidas.');
          return;
        }

        console.log('[AcceptInvite] Invite confirmed, showing password form');
        setStatus('needs_password');
      } catch (err) {
        console.error('[AcceptInvite] Error in initialize:', err);
        setStatus('error');
        setError('No pudimos validar tu invitación. Inténtalo de nuevo o solicita una nueva.');
      }
    };

    initialize();
  }, []);

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
        data: { role },
      });

      if (updateError) throw updateError;

      await supabase.from('profiles').upsert({
        id: user.id,
        user_id: user.id,
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
      console.error('[AcceptInvite] Error actualizando contraseña:', err);
      setError('No pudimos guardar tu contraseña. Inténtalo nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 pt-28">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-gray-900 mx-auto mb-4" />
          <p className="text-gray-600">Verificando tu invitación...</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 pt-28">
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
            Hemos verificado tu invitación para{' '}
            <span className="font-semibold">{email || inviteEmail || 'tu correo'}</span>.
            Define una contraseña segura para comenzar a usar LegalUp.
          </p>
        </div>

        {status === 'error' && (
          <div className="flex items-start space-x-3 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">No pudimos validar tu invitación</p>
              <p>{error}</p>
              <div className="flex gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setStatus('checking'); setError(null); window.location.reload(); }}
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1" />
                  Reintentar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.location.href = '/'}
                >
                  <Home className="h-3.5 w-3.5 mr-1" />
                  Volver al inicio
                </Button>
              </div>
            </div>
          </div>
        )}

        {status !== 'error' && (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-gray-900">¿Cómo planeas usar LegalUp?</h3>
              <div className="space-y-3">
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

        <Button variant="ghost" className="w-full" onClick={() => navigate('/')}>
          Volver al inicio
        </Button>
      </div>
    </div>
  );
}

export default function AcceptInvite() {
  return (
    <AcceptInviteErrorBoundary>
      <AcceptInviteInner />
    </AcceptInviteErrorBoundary>
  );
}
