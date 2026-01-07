import { useState, useEffect, useCallback, useMemo } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { validateAndRefreshSession, refreshSession } from '@/lib/sessionUtils';
import { handleAuthError } from '@/lib/authErrorHandler';

declare module '@supabase/supabase-js' {
  interface User {
    is_admin?: boolean;
    user_metadata?: {
      is_admin?: boolean;
      [key: string]: any;
    };
    profile?: any;
  }
}

// Define the shape of our auth state
export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  checkSession: () => Promise<boolean>;
  refreshAuth: () => Promise<void>;
}

export const useAuthState = (): AuthState => {
  const [state, setState] = useState<Omit<AuthState, 'checkSession' | 'refreshAuth' | 'setUser'>>({
    user: null,
    session: null,
    isLoading: true,
    error: null,
    isAuthenticated: false,
  });
  
  const supabase = getSupabaseClient();
  
  // Update state helper
  const updateState = useCallback((updates: Partial<Omit<AuthState, 'checkSession' | 'refreshAuth' | 'setUser'>>) => {
    setState(prev => ({
      ...prev,
      ...updates,
      // Ensure isAuthenticated is always in sync with user
      isAuthenticated: updates.user !== undefined ? !!updates.user : prev.isAuthenticated,
    }));
  }, []);

  // Manual user update helper
  const setUser = useCallback((user: User | null) => {
    updateState({ user });
  }, [updateState]);
  
  // Check and refresh the current session
  const checkSession = useCallback(async (): Promise<boolean> => {
    try {
      updateState({ isLoading: true, error: null });
      
      const { data: { session: currentSession }, error } = await supabase.auth.getSession();
      
      if (currentSession?.user) {
        // 1. Fetch Profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentSession.user.id)
          .maybeSingle();

        // Attach profile to user object
        currentSession.user.profile = profileData;

        // 2. Admin Logic
        const isAdmin = currentSession.user.email?.toLowerCase() === 'gigfmedia@icloud.com' || 
                       currentSession.user.user_metadata?.is_admin === true ||
                       profileData?.role === 'admin';
        
        currentSession.user.is_admin = isAdmin;
        
        // Ensure user_metadata exists
        if (!currentSession.user.user_metadata) {
            currentSession.user.user_metadata = { is_admin: isAdmin };
        } else {
            currentSession.user.user_metadata.is_admin = isAdmin;
        }

        // =========================================================================
        // CLIENT-SIDE PROFILE REPAIR (Backup for Trigger Failures)
        // =========================================================================
        try {
          const meta = currentSession.user.user_metadata;
          // Use the ALREADY FETCHED profileData
          const profile = profileData;

          if (meta?.role === 'lawyer' && (!profile || profile.role !== 'lawyer')) {
             console.log('Detected profile mismatch. Attempting client-side repair...', meta);
              
             const displayName = (meta.first_name && meta.last_name) 
               ? `${meta.first_name} ${meta.last_name}` 
               : currentSession.user.email?.split('@')[0];

             const { error: upsertError } = await supabase.from('profiles').upsert({
               id: currentSession.user.id,
               user_id: currentSession.user.id,
               email: currentSession.user.email,
               role: 'lawyer',
               first_name: meta.first_name || null,
               last_name: meta.last_name || null,
               display_name: displayName,
               rut: meta.rut || null,
               pjud_verified: meta.pjud_verified || false,
               created_at: new Date().toISOString(),
               updated_at: new Date().toISOString()
             }, { onConflict: 'id' });

             if (upsertError) throw upsertError;
             
             console.log('Profile repair completed.');
             
             // Update the local object immediately so UI reflects it without refresh
             currentSession.user.profile = {
               ...profile,
               role: 'lawyer',
               first_name: meta.first_name,
               last_name: meta.last_name,
               display_name: displayName,
               rut: meta.rut,
               pjud_verified: meta.pjud_verified
             };
          }
        } catch (repairError) {
          console.error('SERVER_REPAIR_ERROR: ', repairError);
        }
      }
      
      if (error) throw error;
      
      if (currentSession) {
        const isValid = await validateAndRefreshSession(currentSession);
        
        if (isValid) {
          updateState({
            session: currentSession,
            user: currentSession.user,
            isAuthenticated: true,
            isLoading: false,
          });
          return true;
        }
      }
      
      // If we get here, the session is not valid
      updateState({
        session: null,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
      
      return false;
    } catch (error) {
      const authError = error instanceof Error ? error : new Error('Failed to check session');
      updateState({ 
        error: authError,
        isAuthenticated: false,
        isLoading: false,
      });
      return false;
    }
  }, [updateState]);
  
  // Refresh the auth state
  const refreshAuth = useCallback(async () => {
    try {
      const { data: { session: currentSession }, error } = await supabase.auth.refreshSession();
      
      if (error) throw error;
      
      if (currentSession) {
        updateState({
          session: currentSession,
          user: currentSession.user,
          isAuthenticated: true,
        });
      } else {
        updateState({
          session: null,
          user: null,
          isAuthenticated: false,
        });
      }
    } catch (error) {
      updateState({
        error: error instanceof Error ? error : new Error('Failed to refresh auth'),
        isAuthenticated: false,
        isLoading: false,
      });
    }
  }, [updateState]);
  
  // Initialize auth state
  useEffect(() => {
    let mounted = true;
    
    const initializeAuth = async () => {
      try {
        await checkSession();
        
        // Set up auth state change listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (!mounted) return;
            
            try {
              switch (event) {
                case 'SIGNED_IN':
                case 'TOKEN_REFRESHED':
                case 'USER_UPDATED':
                  if (session) {
                    updateState({
                      session,
                      user: session.user,
                      isAuthenticated: true,
                      error: null,
                      isLoading: false,
                    });
                  }
                  break;
                  
                case 'SIGNED_OUT':
                case 'USER_DELETED':
                  updateState({
                    session: null,
                    user: null,
                    isAuthenticated: false,
                    error: null,
                    isLoading: false,
                  });
                  break;
                  
                case 'PASSWORD_RECOVERY':
                  // Handle password recovery flow if needed
                  break;
                  
                default:
                  // Unhandled auth event
              }
            } catch (error) {
              // Error handling auth state change
              updateState({
                error: error instanceof Error ? error : new Error('Auth state change error'),
                isLoading: false,
              });
            }
          }
        );
        
        // Set up periodic session validation
        const intervalId = setInterval(async () => {
          if (!mounted) return;
          try {
            await validateAndRefreshSession();
          } catch (error) {
            handleAuthError(error, { showToast: false });
          }
        }, 5 * 60 * 1000); // Check every 5 minutes
        
        return () => {
          subscription?.unsubscribe();
          clearInterval(intervalId);
        };
      } catch (error) {
        updateState({
          error: error instanceof Error ? error : new Error('Failed to initialize auth'),
          isLoading: false,
        });
      }
    };
    
    initializeAuth();
    
    return () => {
      mounted = false;
    };
  }, [checkSession, updateState]);
  
  // Memoize the return value to prevent unnecessary re-renders
  return useMemo(() => ({
    user: state.user,
    session: state.session,
    isLoading: state.isLoading,
    error: state.error,
    isAuthenticated: state.isAuthenticated,
    checkSession,
    refreshAuth,
    setUser,
  }), [
    state.user, 
    state.session, 
    state.isLoading, 
    state.error, 
    state.isAuthenticated,
    checkSession,
    refreshAuth,
    setUser,
  ]);
};

// Export a hook that returns the auth state and functions
export const useAuth = () => {
  const auth = useAuthState();
  return auth;
};

// Export a hook that requires authentication
// Will redirect to login if not authenticated
export const useRequireAuth = (redirectTo = '/auth/login') => {
  const { isAuthenticated, isLoading, session, user } = useAuthState();
  
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Store the current URL for redirecting back after login
      const redirectUrl = `${window.location.pathname}${window.location.search}`;
      window.location.href = `${redirectTo}?redirect=${encodeURIComponent(redirectUrl)}`;
    }
  }, [isAuthenticated, isLoading, redirectTo]);
  
  return {
    isAuthenticated,
    isLoading,
    session,
    user,
  };
};
