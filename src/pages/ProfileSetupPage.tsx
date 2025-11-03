import { Suspense, lazy, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load the wizard
const ProfileSetupWizard = lazy(() => import('@/components/lawyer/ProfileSetupWizard'));

// Skeleton loader for the form
const FormSkeleton = () => (
  <div className="space-y-6">
    <div className="space-y-2 text-center">
      <Skeleton className="h-8 w-64 mx-auto" />
      <Skeleton className="h-5 w-96 mx-auto" />
    </div>
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <div className="flex justify-between pt-4">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  </div>
);

export default function ProfileSetupPage() {
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
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <FormSkeleton />
      </div>
    );
  }

  if (!user) {
    return null; // Will be redirected by the effect
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <Suspense fallback={<FormSkeleton />}>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Configuración de perfil</h1>
          <p className="mt-2 text-muted-foreground">
            Completa tu perfil para comenzar a usar la plataforma
          </p>
        </div>
        <ProfileSetupWizard />
      </Suspense>
    </div>
  );
}
