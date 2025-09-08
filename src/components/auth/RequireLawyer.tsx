import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function RequireLawyer({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user || user.role !== 'lawyer') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
