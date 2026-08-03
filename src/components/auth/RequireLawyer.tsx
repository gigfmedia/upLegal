import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function RequireLawyer({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return null;

  // El rol JWT de Supabase (user.role) siempre es "authenticated";
  // el rol real del usuario vive en user_metadata y/o en el perfil.
  const isLawyer =
    user?.role === 'lawyer' ||
    user?.user_metadata?.role === 'lawyer' ||
    user?.profile?.role === 'lawyer';

  if (!user || !isLawyer) {
    const redirectTo = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/?login=true&redirectTo=${redirectTo}`} replace />;
  }

  return <>{children}</>;
}
