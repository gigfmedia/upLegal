import { ReactNode, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';

export default function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();

  const checkAdminStatus = () => {
    if (!user) return false;
    
    // Check for admin status in different possible locations
    return (
      user.is_admin === true ||
      user.user_metadata?.is_admin === true ||
      user.email?.toLowerCase() === 'gigfmedia@icloud.com' ||
      user.role === 'admin'
    );
  };

  const isAdmin = checkAdminStatus();

  useEffect(() => {
    if (!isLoading) {
      if (!isAdmin) {
        toast({
          title: 'Acceso denegado',
          description: 'No tienes permisos de administrador',
          variant: 'destructive',
        });
      } else {
      }
    }
  }, [isLoading, isAdmin, user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
