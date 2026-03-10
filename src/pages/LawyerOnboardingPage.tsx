import { Suspense, lazy, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';
import { Loader2 } from 'lucide-react';
import Header from '@/components/Header';

const LawyerOnboardingWizard = lazy(() => import('@/components/lawyer/LawyerOnboardingWizard'));

export default function LawyerOnboardingPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/login', { state: { from: location.pathname } });
    }
  }, [user, isLoading, navigate, location]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="py-10 px-4 pt-24">

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
