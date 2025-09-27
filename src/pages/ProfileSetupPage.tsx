import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';
import ProfileSetupWizard from '@/components/lawyer/ProfileSetupWizard';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { supabase } from '@/lib/supabaseClient';

export default function ProfileSetupPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      if (!isLoading) {
        // If no user, redirect to login
        if (!user) {
          navigate('/login', { state: { from: location.pathname } });
          return;
        }
        setIsInitialized(true);
      }
    };

    checkAuth();
  }, [user, isLoading, navigate, location]);

  // Show loading state while checking auth
  if (isLoading || !isInitialized) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Configuración de perfil</h1>
        <p className="mt-2 text-muted-foreground">
          Completa tu perfil para comenzar a usar la plataforma
        </p>
      </div>
      <ProfileSetupWizard />
    </div>
  );
}
