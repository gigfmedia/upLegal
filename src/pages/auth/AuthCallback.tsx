import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Loader2 } from 'lucide-react';
import { getLawyerPostAuthDestination, isEmailVerified } from '@/lib/lawyerOnboardingGate';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        const params = new URLSearchParams(window.location.search);
        const redirectTo = params.get('redirectTo');

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

          // If there's an explicit redirectTo, respect it only if email verified for lawyers
          if (redirectTo) {
            const isLawyer = profile?.role === 'lawyer' || (user.user_metadata as any)?.role === 'lawyer';
            if (isLawyer && !isEmailVerified(user as any)) {
              // Don't honor redirect to dashboard/onboarding before verification
              navigate('/?verifyEmail=true', { replace: true });
              return;
            }
            navigate(decodeURIComponent(redirectTo), { replace: true });
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
  }, [navigate]);

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
