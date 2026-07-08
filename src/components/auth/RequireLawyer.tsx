import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function RequireLawyer({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return null;
  if (!user || user.role !== 'lawyer') {
    const redirectTo = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/?login=true&redirectTo=${redirectTo}`} replace />;
  }

  return <>{children}</>;
}
