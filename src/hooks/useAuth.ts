import { useContext, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { AuthContext, type AuthContextType } from '@/contexts/AuthContext/clean/AuthContext';
import type { UserData, Profile } from '@/contexts/AuthContext/clean/AuthContext';
import { handleAuthError } from '@/lib/authErrorHandler';

/**
 * A hook to access the authentication context and provide authentication methods
 * Provides a clean API for components to interact with the auth state
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  const { 
    user, 
    session, 
    isLoading, 
    error, 
    isAuthenticated,
    login,
    signup,
    logout,
    updateProfile,
    setUser,
    setSession,
    setIsLoading: setLoadingState,
    setError: setErrorState
  } = context;
  
  /**
   * Login with email and password
   */
  const loginWithEmail = useCallback(async (email: string, password: string) => {
    try {
      const result = await login(email, password);
      if (result.error) throw result.error;
      return { user: result.user, error: null };
    } catch (error) {
      const authError = error instanceof Error ? error : new Error('Login failed');
      handleAuthError(authError);
      return { user: null, error: authError };
    }
  }, [login]);
  
  /**
   * Sign up with email, password and user data
   */
  const signUpWithEmail = useCallback(async (email: string, password: string, userData: UserData) => {
    try {
      const result = await signup(email, password, userData);
      if (result.error) throw result.error;
      return { 
        user: result.user as User, 
        error: null,
        requiresEmailConfirmation: result.requiresEmailConfirmation 
      };
    } catch (error) {
      const authError = error instanceof Error ? error : new Error('Signup failed');
      handleAuthError(authError);
      return { 
        user: null, 
        error: authError,
        requiresEmailConfirmation: false 
      };
    }
  }, [signup]);
  
  /**
   * Wrapper around logout with better error handling
   */
  const signOut = useCallback(async (options: { redirect?: string } = {}) => {
    try {
      const result = await logout(options);
      if (result.error) throw result.error;
      return { success: true, error: null };
    } catch (error) {
      const authError = error instanceof Error ? error : new Error('Logout failed');
      handleAuthError(authError, { showToast: false });
      return { success: false, error: authError };
    }
  }, [logout]);
  
  return {
    // State
    user,
    session,
    isLoading,
    error,
    isAuthenticated,
    
    // State setters
    setUser,
    setSession,
    setIsLoading: setLoadingState,
    setError: setErrorState,
    
    // Auth methods
    login: loginWithEmail,
    signup: signUpWithEmail,
    logout: signOut,
    updateProfile
  };
};

/**
 * A hook that requires authentication
 * Will redirect to login if not authenticated
 */
export const useRequireAuth = (redirectTo: string = '/auth/login') => {
  const auth = useAuth();
  
  // If not loading and not authenticated, redirect to login
  if (!auth.isLoading && !auth.isAuthenticated && typeof window !== 'undefined') {
    // Store the current URL for redirecting back after login
    const redirectUrl = `${window.location.pathname}${window.location.search}`;
    window.location.href = `${redirectTo}?redirect=${encodeURIComponent(redirectUrl)}`;
  }
  
  return auth;
};
