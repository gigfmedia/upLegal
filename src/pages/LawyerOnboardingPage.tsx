import { Suspense, lazy, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import { isEmailVerified } from '@/lib/lawyerOnboardingGate';
import { calculateProfileCompletion } from '@/utils/profileCompletion';

const LawyerOnboardingWizard = lazy(() => import('@/components/lawyer/LawyerOnboardingWizard'));

export default function LawyerOnboardingPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    // No autenticado con email no verificado -> bloquear onboarding
    if (!isEmailVerified(user as any)) {
      setChecking(false);
      return;
    }
    (async () => {
      const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle();
      setProfile(data || null);
      const metaRole = (user.user_metadata as any)?.role;
      const isLawyer = data?.role === 'lawyer' || metaRole === 'lawyer';
      if (!isLawyer) {
        navigate('/', { replace: true });
        return;
      }
      // Si ya completó onboarding, no mostrarlo de nuevo
      if (data?.profile_setup_completed === true) {
        navigate('/lawyer/dashboard', { replace: true });
        return;
      }
      // Abogado existente con perfil >=70% → no forzar onboarding (misma regla que DashboardLayout/AuthCallback)
      // Usa el mismo cálculo real: calculateProfileCompletion
      try {
        const { count: servicesCount } = await supabase
          .from('lawyer_services')
          .select('id', { count: 'exact', head: true })
          .eq('lawyer_user_id', user.id);
        const completion = calculateProfileCompletion({ ...(data as any), servicesCount: servicesCount ?? 0 });
        if (completion >= 70) {
          navigate('/lawyer/dashboard', { replace: true });
          return;
        }
      } catch {
        // si falla el cómputo, continuar a mostrar onboarding (no bloquear)
      }
      setChecking(false);
    })();
  }, [user, isLoading, navigate, location]);

  const handleResend = async () => {
    if (!user?.email) return;
    await supabase.auth.resend({ type: 'signup', email: user.email });
  };

  const handleRefresh = async () => {
    await supabase.auth.refreshSession().catch(() => {});
    const { data: { user: fresh } } = await supabase.auth.getUser();
    if (fresh?.email_confirmed_at) window.location.reload();
  };

  if (isLoading || checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-900" />
      </div>
    );
  }

  if (!user) return null;

  if (!isEmailVerified(user as any)) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center min-h-[70vh] px-4 pt-20">
          <div className="max-w-md w-full bg-white rounded-lg shadow p-8 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
              <MailCheck className="h-7 w-7 text-amber-600" />
            </div>
            <h1 className="text-xl font-bold">Verifica tu correo</h1>
            <p className="text-sm text-gray-600">
              Te enviamos un enlace a <span className="font-semibold">{user.email}</span>. Debes verificar tu email antes de completar tu perfil profesional.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <Button onClick={handleRefresh}>Ya verifiqué mi correo</Button>
              <Button variant="outline" onClick={handleResend}>Reenviar correo</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-900">
      <Header />
      <div className="py-10 px-4 pt-32">
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          }
        >
          <LawyerOnboardingWizard />
        </Suspense>
      </div>
    </div>
  );
}
