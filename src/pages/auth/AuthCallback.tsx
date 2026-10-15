import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Loader2 } from 'lucide-react';
import { getLawyerPostAuthDestination, isEmailVerified } from '@/lib/lawyerOnboardingGate';
import { consumePostAuthRedirect, sanitizePostAuthRedirect, trackGoogleCompleted } from '@/lib/googleAuth';
import { buildRoleOnboardingPath, needsRoleConfirmation, needsRoleSelection } from '@/lib/roleOnboarding';
import { BIND_CONSENT_WINDOW_MS, hasCurrentLegalConsent, hasLegalConsent, consumePendingConsent } from '@/lib/legalConsent';
import {
  captureEmailVerificationCompleted,
  captureLoginCompleted,
  captureSignUpCompleted,
  identifyProUser,
  trackProSessionReturn,
  SIGNUP_ATTRIBUTION_WINDOW_DAYS,
} from '@/lib/proAnalytics';

/** Usuario creado dentro de la ventana = registro reciente (vs login). */
function isRecentSignup(createdAt: string | undefined): boolean {
  if (!createdAt) return false;
  const created = Date.parse(createdAt);
  if (Number.isNaN(created)) return false;
  return Date.now() - created <= SIGNUP_ATTRIBUTION_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

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
          consumePendingConsent();
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
            consumePendingConsent();
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

          // FASE 1B/1C: identidad + retorno + registro/login + verificación.
          // Todo idempotente y con consentimiento (no-ops sin él); el método
          // se infiere del flujo (code OAuth = google, link = email).
          try {
            const method = code ? 'google' : 'email';
            identifyProUser(user.id);
            trackProSessionReturn(user.id);
            if (isRecentSignup(user.created_at)) {
              captureSignUpCompleted(user.id, method as 'google' | 'email');
            } else {
              captureLoginCompleted(user.id, method as 'google' | 'email');
            }
            if (isEmailVerified(user as any)) {
              captureEmailVerificationCompleted(user.id, method as 'google' | 'email');
            }
          } catch {
            // analytics nunca bloquea el callback
          }

        // Lawyer onboarding gate: only after email verification (respeta >=70% como satisfecho)
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

          // 4.60A: solo destinos internos (anti open-redirect).
          const safeRedirect = sanitizePostAuthRedirect(redirectTo);
          // Onboarding: '/' es el valor por defecto que guarda
          // beginGoogleSignIn desde la home (sin destino explícito), NO un
          // destino real. En la cadena de onboarding colapsa a nulo para que
          // apliquen los destinos por rol (/search, /lawyer/onboarding).
          // Fuera del onboarding (usuario con rol) '/' sí se respeta.
          const onboardingRedirect = safeRedirect && safeRedirect !== '/' ? safeRedirect : null;
          // FASE 5.6: cuentas sin evidencia de aceptación van al interstitial
          // de consentimiento (solo primera vez; existentes pasan de largo).
          // El checkbox del modal de registro es solo compuerta local: para
          // Google nada persiste consentimiento antes del callback, así que
          // un alta fresca (created_at reciente) sin fila va a consentimiento
          // primero; legacy sin fila mantiene fail-open (se evalúa cuando la
          // fila exista, típicamente tras elegir rol).
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
            // Puente modal→OAuth (localStorage, un solo uso): si el perfil no
            // tiene evidencia pero el checkbox del modal quedó guardado al
            // iniciar OAuth y sigue válido (versiones vigentes, sin expirar),
            // se transcribe al perfil —es el mismo acto del usuario, no un
            // timestamp inventado— y no se re-pregunta.
            //
            // Vinculación al intento: solo se transcribe si la cuenta se creó
            // junto a la aceptación (ventana de 30 min entre created_at del
            // usuario y acceptedAt del puente). Un puente abandonado NO puede
            // aportar evidencia a un login posterior de cuenta antigua ni sin
            // created_at. Solo se omite el interstitial si la relectura
            // confirma timestamps Y versiones vigentes; ante cualquier fallo
            // se cae al interstitial (fail-safe, nunca se omite sin
            // evidencia guardada).
            if (!hasLegalConsent(consentRow)) {
              const transcribed = consumePendingConsent();
              const createdMs = Date.parse(String((user as { created_at?: unknown })?.created_at ?? ''));
              const acceptedMs = transcribed ? Date.parse(String(transcribed.terms_accepted_at)) : NaN;
              const boundToAttempt =
                !Number.isNaN(createdMs) &&
                !Number.isNaN(acceptedMs) &&
                Math.abs(createdMs - acceptedMs) <= BIND_CONSENT_WINDOW_MS;
              if (transcribed && boundToAttempt) {
                try {
                  const { error: transcribeError } = await supabase
                    .from('profiles')
                    .upsert(
                      { id: user.id, user_id: user.id, ...transcribed },
                      { onConflict: 'id' },
                    );
                  if (!transcribeError) {
                    const { data: transcribeCheck } = await supabase
                      .from('profiles')
                      .select('terms_accepted_at, privacy_acknowledged_at, terms_version, privacy_version')
                      .eq('id', user.id)
                      .maybeSingle();
                    if (hasCurrentLegalConsent(transcribeCheck)) {
                      consentRow = transcribeCheck;
                    }
                  }
                } catch {
                  /* cae al interstitial */
                }
              }
            } else {
              // Ya hay evidencia guardada: el puente (si existe) es redundante.
              consumePendingConsent();
            }
            // Solo si la fila existe y carece de timestamps, o si es un alta
            // fresca aún sin fila y sin rol definido en ninguna fuente (nada
            // pudo persistir su aceptación): en ambos casos corresponde el
            // interstitial. Con rol en metadata (abogado Google) o admin, y
            // legacy sin fila, no se bloquea: flujo previo intacto
            // (fail-open; el consentimiento se evalúa cuando la fila exista).
            if (
              !consentRow &&
              isRecentSignup(user.created_at) &&
              needsRoleSelection(null, user as never)
            ) {
              navigate(`/auth/consent?redirectTo=${encodeURIComponent(onboardingRedirect || '/')}`, { replace: true });
              return;
            }
            if (consentRow && !hasLegalConsent(consentRow)) {
              navigate(`/auth/consent?redirectTo=${encodeURIComponent(onboardingRedirect || '/')}`, { replace: true });
              return;
            }
          } catch {
            /* ante error de lectura no bloquear acceso: continuar flujo normal */
          }
          // Onboarding simple post-registro: sin tipo de cuenta elegido
          // conscientemente (Google genérico sin rol en metadata ni perfil,
          // 'client' por defecto del trigger sin consentimiento, o cuenta
          // legacy sin rol) → pantalla de selección. Con rol elegido o
          // admin, flujo actual.
          // El retorno sanitizado se preserva para después de la selección.
          if (needsRoleConfirmation(profile, user as never)) {
            // La marca viaja en location.state: si el rol se confirmó por
            // transcripción en este mismo paso, la pantalla de rol reevaluaría
            // con timestamps ya presentes y sin ella redirigiría sin mostrar
            // el formulario. Solo se llega aquí con rol sin confirmar.
            navigate(buildRoleOnboardingPath(onboardingRedirect), {
              replace: true,
              state: { needsRoleChoice: true },
            });
            return;
          }
          // Destino post-login: un redirectTo EXPLÍCITO y válido se respeta.
          // '/' NO es explícito: es el valor por defecto que guarda
          // beginGoogleSignIn desde la home (sin destino solicitado). Para un
          // abogado verificado sin destino explícito, '/' no debe prevalecer
          // sobre su destino por rol (cae a la rama lawyer de abajo). Para el
          // resto, '/' conserva el comportamiento habitual (volver a la home).
          if (safeRedirect) {
            const isLawyer = profile?.role === 'lawyer' || (user.user_metadata as any)?.role === 'lawyer';
            if (isLawyer && !isEmailVerified(user as any)) {
              // Don't honor redirect to dashboard/onboarding before verification
              navigate('/?verifyEmail=true', { replace: true });
              return;
            }
            if (!isLawyer || safeRedirect !== '/') {
              navigate(safeRedirect, { replace: true });
              return;
            }
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
          consumePendingConsent();
          navigate('/?login=true');
        }
      } catch (error) {
        console.error('Error in auth callback:', error);
        consumePendingConsent();
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
