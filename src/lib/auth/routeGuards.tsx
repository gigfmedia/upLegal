import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { handleAuthError } from './authErrorHandler';

/**
 * A component that protects routes based on authentication status
 * Redirects to login if not authenticated
 */
export const ProtectedRoute = ({
  children,
  requiredRoles = [],
  redirectTo = '/auth/login',
}: {
  children: React.ReactNode;
  requiredRoles?: string[];
  redirectTo?: string;
}) => {
  const { isAuthenticated, isLoading, hasAnyRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading) {
      // If not authenticated, redirect to login
      if (!isAuthenticated) {
        const redirectUrl = `${location.pathname}${location.search}`;
        navigate(`${redirectTo}?redirect=${encodeURIComponent(redirectUrl)}`, { 
          replace: true 
        });
      } 
      // If roles are required, check if user has any of them
      else if (requiredRoles.length > 0 && !hasAnyRole(requiredRoles)) {
        handleAuthError(new Error('Unauthorized: Insufficient permissions'));
        navigate('/', { replace: true });
      }
    }
  }, [isAuthenticated, isLoading, hasAnyRole, requiredRoles, navigate, location, redirectTo]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If authenticated and has required role, render children
  if (isAuthenticated && (requiredRoles.length === 0 || hasAnyRole(requiredRoles))) {
    return <>{children}</>;
  }

  // Otherwise, show nothing (will redirect)
  return null;
};

/**
 * A component that redirects to a different route if the user is authenticated
 * Useful for login/signup pages that should not be accessible when logged in
 */
export const GuestRoute = ({
  children,
  redirectTo = '/dashboard',
}: {
  children: React.ReactNode;
  redirectTo?: string;
}) => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      // If there's a redirect URL in the query params, use it
      const params = new URLSearchParams(location.search);
      const redirectUrl = params.get('redirect') || redirectTo;
      navigate(redirectUrl, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, location, redirectTo]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If not authenticated, render children
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  // Otherwise, show nothing (will redirect)
  return null;
};

/**
 * A higher-order component that protects routes based on authentication status
 * @deprecated Use the `ProtectedRoute` component instead
 */
export const withAuth = <P extends object>(
  Component: React.ComponentType<P>,
  options: { requiredRoles?: string[]; redirectTo?: string } = {}
) => {
  const WrappedComponent = (props: P) => (
    <ProtectedRoute requiredRoles={options.requiredRoles} redirectTo={options.redirectTo}>
      <Component {...props} />
    </ProtectedRoute>
  );
  
  // Copy static properties from the original component
  Object.assign(WrappedComponent, Component);
  
  return WrappedComponent;
};

/**
 * A higher-order component that only allows guest users
 * @deprecated Use the `GuestRoute` component instead
 */
export const withGuest = <P extends object>(
  Component: React.ComponentType<P>,
  options: { redirectTo?: string } = {}
) => {
  const WrappedComponent = (props: P) => (
    <GuestRoute redirectTo={options.redirectTo}>
      <Component {...props} />
    </GuestRoute>
  );
  
  // Copy static properties from the original component
  Object.assign(WrappedComponent, Component);
  
  return WrappedComponent;
};
