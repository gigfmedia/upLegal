import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Loader2 } from 'lucide-react';
import { getLawyerPostAuthDestination, isEmailVerified } from '@/lib/lawyerOnboardingGate';
import { consumePostAuthRedirect, sanitizePostAuthRedirect, trackGoogleCompleted } from '@/lib/googleAuth';
import { hasLegalConsent } from '@/lib/legalConsent';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // 4.60A: cancel/error del provider (ej: usuario cancela en Google).
        const oauthError = params.get('error');
        const oauthErrorDescription = params.get('error_description');
        if (oauthError) {
          console.warn('OAuth callback error:', oauthError);
          navigate(`/?login=true&oauth_error=${encodeURIComponent(oauthErrorDescription || 'No se pudo completar el acceso con Google.')}`, { replace: true });
          return;
        }

        // 4.60A: flujo PKCE (OAuth) trae ?code=; hay que canjearlo por sesión.
        // Los links de email usan tokens en hash y no necesitan este paso.
        const code = params.get('code');
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.error('Error exchanging OAuth code:', exchangeError);
            navigate('/?login=true&oauth_error=' + encodeURIComponent('No se pudo completar el acceso con Google.'), { replace: true });
            return;
          }
          trackGoogleCompleted();
        }

        const { data: { session }, error } = await supabase.auth.getSession();

        const redirectTo = params.get('redirectTo') || consumePostAuthRedirect();

        if (error) {
          console.error('Error getting session:', error);
          navigate('/?login=true');
          return;
        }

        if (session) {
          // Ensure we have the freshest user (email_confirmed_at)
          const { data: { user: freshUser } } = await supabase.auth.getUser();
          const user = freshUser || session.user;

        // Lawyer onboarding gate: only after email verification (respeta >=70% como satisfecho)
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

          // 4.60A: solo destinos internos (anti open-redirect).
          const safeRedirect = sanitizePostAuthRedirect(redirectTo);
          // FASE 5.6: cuentas sin evidencia de aceptación van al interstitial
          // de consentimiento (solo primera vez; existentes pasan de largo).
          try {
            const readConsent = async () =>
              supabase
                .from('profiles')
                .select('terms_accepted_at, privacy_acknowledged_at')
                .eq('id', user.id)
                .maybeSingle();
            let { data: consentRow } = await readConsent();
            // La fila del perfil puede crearse en paralelo al callback
            // (repair de sesión): un reintento breve antes de decidir.
            if (!consentRow) {
              await new Promise((r) => setTimeout(r, 1500));
              ({ data: consentRow } = await readConsent());
            }
            // Solo si la fila existe y carece de timestamps: sin fila no se
            // puede distinguir nuevo de legacy → no bloquear (perfil se crea
            // después y el próximo login sí lo evalúa).
            if (consentRow && !hasLegalConsent(consentRow)) {
              navigate(`/auth/consent?redirectTo=${encodeURIComponent(safeRedirect || '/')}`, { replace: true });
              return;
            }
          } catch {
            /* ante error de lectura no bloquear acceso: continuar flujo normal */
          }
          // If there's an explicit redirectTo, respect it only if email verified for lawyers
          if (safeRedirect) {
            const isLawyer = profile?.role === 'lawyer' || (user.user_metadata as any)?.role === 'lawyer';
            if (isLawyer && !isEmailVerified(user as any)) {
              // Don't honor redirect to dashboard/onboarding before verification
              navigate('/?verifyEmail=true', { replace: true });
              return;
            }
            navigate(safeRedirect, { replace: true });
            return;
          }

          if (profile?.role === 'lawyer' || (user.user_metadata as any)?.role === 'lawyer') {
            if (!isEmailVerified(user as any)) {
              navigate('/?verifyEmail=true', { replace: true });
              return;
            }
            // Si el perfil ya está suficientemente completo (>=70% real), considerar onboarding satisfecho
            let completion: number | null = null;
            try {
              const { calculateProfileCompletion } = await import('@/utils/profileCompletion');
              const { count: servicesCount } = await supabase
                .from('lawyer_services')
                .select('id', { count: 'exact', head: true })
                .eq('lawyer_user_id', user.id);
              completion = calculateProfileCompletion({ ...(profile as any), servicesCount: servicesCount ?? 0 });
            } catch {
              // ignore, fallback a dest sin completion
            }
            const dest = getLawyerPostAuthDestination(user as any, profile as any, completion);
            if (dest) {
              navigate(dest, { replace: true });
              return;
            }
            navigate('/lawyer/dashboard', { replace: true });
          } else {
            navigate('/dashboard', { replace: true });
          }
        } else {
          navigate('/?login=true');
        }
      } catch (error) {
        console.error('Error in auth callback:', error);
        navigate('/?login=true');
      }
    };

    handleCallback();
  }, [navigate, params]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-900" />
        <h2 className="text-xl font-semibold mb-2">Verificando tu cuenta...</h2>
        <p className="text-gray-600">Estamos configurando tu entorno, esto tomará un momento.</p>
      </div>
    </div>
  );
}
