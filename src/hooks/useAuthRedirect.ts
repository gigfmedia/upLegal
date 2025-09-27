import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';
import { handleAuthError } from '@/lib/authErrorHandler';

/**
 * Hook to handle authentication redirects based on authentication status and user roles
 * @param options Configuration options for the redirect behavior
 * @returns Authentication state and helper functions
 */
export const useAuthRedirect = (options: {
  /**
   * Whether authentication is required for the current route
   * @default true
   */
  requireAuth?: boolean;
  
  /**
   * Required user roles to access the route
   * If empty, any authenticated user can access
   */
  requiredRoles?: string[];
  
  /**
   * URL to redirect to if authentication is required but not present
   * @default '/auth/login'
   */
  authRedirectTo?: string;
  
  /**
   * URL to redirect to if user is authenticated but doesn't have required roles
   * @default '/unauthorized'
   */
  unauthorizedRedirectTo?: string;
  
  /**
   * Whether to redirect to the original URL after successful login
   * @default true
   */
  redirectBack?: boolean;
} = {}) => {
  const {
    requireAuth = true,
    requiredRoles = [],
    authRedirectTo = '/auth/login',
    unauthorizedRedirectTo = '/unauthorized',
    redirectBack = true,
  } = options;
  
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if user has required roles
  const hasRequiredRole = requiredRoles.length === 0 || 
    (auth.isAuthenticated && auth.hasAnyRole(requiredRoles));
  
  // Handle redirects based on authentication status and roles
  useEffect(() => {
    // Skip if still loading or if no authentication is required
    if (auth.isLoading || !requireAuth) return;
    
    const currentPath = `${location.pathname}${location.search}`;
    
    // If authentication is required but user is not authenticated
    if (requireAuth && !auth.isAuthenticated) {
      const redirectUrl = redirectBack ? currentPath : undefined;
      const redirectQuery = redirectUrl ? `?redirect=${encodeURIComponent(redirectUrl)}` : '';
      navigate(`${authRedirectTo}${redirectQuery}`, { replace: true });
      return;
    }
    
    // If user is authenticated but doesn't have required roles
    if (auth.isAuthenticated && requiredRoles.length > 0 && !hasRequiredRole) {
      handleAuthError(new Error('You do not have permission to access this page'));
      navigate(unauthorizedRedirectTo, { replace: true });
      return;
    }
  }, [
    auth.isLoading, 
    auth.isAuthenticated, 
    hasRequiredRole, 
    requireAuth, 
    requiredRoles,
    navigate, 
    location,
    authRedirectTo,
    unauthorizedRedirectTo,
    redirectBack
  ]);
  
  // Helper function to redirect after successful authentication
  const redirectAfterAuth = (defaultPath = '/dashboard') => {
    const params = new URLSearchParams(location.search);
    const redirectUrl = params.get('redirect') || defaultPath;
    navigate(redirectUrl, { replace: true });
  };
  
  return {
    ...auth,
    hasRequiredRole,
    redirectAfterAuth,
    isAuthChecking: auth.isLoading,
    isAuthorized: !requireAuth || (auth.isAuthenticated && hasRequiredRole)
  };
};

/**
 * Hook to check if the current user has a specific role
 * @param role The role to check for
 * @returns Boolean indicating if the user has the role
 */
export const useHasRole = (role: string): boolean => {
  const { hasRole } = useAuth();
  return hasRole(role);
};

/**
 * Hook to check if the current user has any of the specified roles
 * @param roles Array of roles to check
 * @returns Boolean indicating if the user has any of the roles
 */
export const useHasAnyRole = (roles: string[]): boolean => {
  const { hasAnyRole } = useAuth();
  return hasAnyRole(roles);
};
