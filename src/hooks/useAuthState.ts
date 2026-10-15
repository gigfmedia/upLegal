import { isPlatformAdmin } from '@/lib/adminAuthority';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { validateAndRefreshSession, refreshSession } from '@/lib/sessionUtils';
import { handleAuthError } from '@/lib/authErrorHandler';
import { setOwnerActive, isOwnerEmail } from '@/lib/owner';
import { identifyProUser, resetProIdentity, trackProSessionReturn } from '@/lib/proAnalytics';

declare module '@supabase/supabase-js' {
  interface User {
    is_admin?: boolean;
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

  // Identidad establecida + perfil adjunto (espejos síncronos del estado).
  // Sirven para: (1) no vaciar el perfil ante eventos con usuario crudo
  // (TOKEN_REFRESHED) del MISMO usuario; (2) no aplicar respuestas
  // asíncronas obsoletas de una identidad anterior; (3) no cerrar sesión
  // ante fallos transitorios cuando ya había sesión establecida.
  const establishedUserIdRef = useRef<string | null>(null);
  const attachedProfileRef = useRef<{ userId: string; profile: unknown } | null>(null);
  const epochRef = useRef(0);
  
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
    const epoch = epochRef.current;
    const isCurrent = () => epoch === epochRef.current;
    try {
      // Don't set isLoading to true unconditionally to avoid unmounting components on background check.
      // The initial load state is handled by the default state of the hook.
      updateState({ error: null });
      
      const { data: { session: currentSession }, error } = await supabase.auth.getSession();
      
      if (currentSession?.user) {
        // Activar bloqueo de analytics si el usuario autenticado es el dueño
        setOwnerActive(isOwnerEmail(currentSession.user.email));
        // FASE 1B: identidad PostHog + retorno (idempotente, con consentimiento).
        // checkSession corre en boot, login manual y visibilidad: todos son
        // momentos de establecimiento de sesión, aptos para retorno.
        try {
          identifyProUser(currentSession.user.id);
          trackProSessionReturn(currentSession.user.id);
        } catch {
          // analytics nunca bloquea auth
        }

        let profileData = null;
        
        // Only try to fetch profile if we have a valid user ID
        if (currentSession.user.id) {
          const { data, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', currentSession.user.id)
            .maybeSingle();
            
          if (profileError) {
            console.error('Error fetching profile:', profileError);
            // Ante error de lectura, conservar el perfil ya adjunto del
            // mismo usuario en vez de vaciarlo (evita badge/rol obsoleto).
            if (
              establishedUserIdRef.current === currentSession.user.id &&
              attachedProfileRef.current?.userId === currentSession.user.id
            ) {
              profileData = attachedProfileRef.current.profile;
            }
            // Continue without profile data rather than failing
          } else {
            profileData = data;
          }
        }

        // Attach profile to user object
        currentSession.user.profile = profileData || {};

        currentSession.user.is_admin = isPlatformAdmin(currentSession.user);

        // =========================================================================
        // CLIENT-SIDE PROFILE REPAIR (Backup for Trigger Failures)
        // =========================================================================
        try {
          const meta = currentSession.user.user_metadata;
          // Use the ALREADY FETCHED profileData
          const profile = profileData;

          if (meta?.role === 'lawyer' && (!profile || profile.role !== 'lawyer')) {
              
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

      // Respuesta obsoleta (otra identidad tomó el turno): no tocar estado.
      if (!isCurrent()) return false;
      
      if (currentSession) {
        const isValid = await validateAndRefreshSession();
        if (!isCurrent()) return false;
        
        if (isValid) {
          establishedUserIdRef.current = currentSession.user.id;
          attachedProfileRef.current = {
            userId: currentSession.user.id,
            profile: currentSession.user.profile,
          };
          updateState({
            session: currentSession,
            user: currentSession.user,
            isAuthenticated: true,
            isLoading: false,
          });
          return true;
        }
      }
      
      // Sesión presente pero no validada, o validación fallida: sin señal
      // definitiva de revocación (esa la dan SIGNED_OUT o la ausencia limpia
      // de sesión) se conserva la sesión establecida para no desloguear por
      // un transitorio (red al volver a la ventana, refresh fallido, etc.).
      // Una sola pasada, sin reintentos ni bucles.
      if (establishedUserIdRef.current && currentSession?.user) {
        updateState({
          error: new Error('No se pudo validar la sesión; se mantiene la anterior.'),
          isLoading: false,
        });
        return false;
      }
      // Sin sesión previa establecida: primera carga sin sesión válida.
      establishedUserIdRef.current = null;
      attachedProfileRef.current = null;
      updateState({
        session: null,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
      
      return false;
    } catch (error) {
      // Excepción (p. ej. getSession lanzó): conservar la sesión establecida;
      // solo limpiar cuando nunca hubo una.
      if (establishedUserIdRef.current) {
        const authError = error instanceof Error ? error : new Error('Failed to check session');
        updateState({
          error: authError,
          isLoading: false,
        });
        return false;
      }
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
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let subscription: { unsubscribe: () => void } | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let handleVisibilityChange: (() => void) | null = null;
    
    const initializeAuth = async () => {
      timeoutId = setTimeout(() => {
        if (mounted && state.isLoading) {
          console.warn('Auth initialization timed out, setting isLoading to false');
          updateState({ isLoading: false });
        }
      }, 5000); // 5 second timeout for safety

      try {
        await checkSession();
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = null;
        
        // Set up auth state change listener
        const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (!mounted) return;
            
            try {
              switch (event) {
                case 'SIGNED_IN':
                case 'TOKEN_REFRESHED':
                case 'USER_UPDATED':
                  if (session) {
                    setOwnerActive(isOwnerEmail(session.user.email));
                    // FASE 1B: re-identificar (idempotente; cubre cambio de
                    // cuenta con reset previo). Retorno solo en SIGNED_IN
                    // (establecimiento real, no refresh periódico).
                    try {
                      identifyProUser(session.user.id);
                      if (event === 'SIGNED_IN') trackProSessionReturn(session.user.id);
                    } catch {
                      // analytics nunca bloquea auth
                    }
                    // Los eventos traen el usuario crudo de Supabase (sin
                    // .profile adjunto). Para el MISMO usuario se conserva el
                    // perfil ya cargado; con otra identidad no se reutiliza
                    // nada y la época invalida respuestas en vuelo.
                    const incomingId = (session.user as User)?.id ?? null;
                    if (incomingId !== establishedUserIdRef.current) {
                      establishedUserIdRef.current = incomingId;
                      attachedProfileRef.current = null;
                      epochRef.current += 1;
                    }
                    const carried =
                      incomingId !== null && attachedProfileRef.current?.userId === incomingId
                        ? attachedProfileRef.current.profile
                        : undefined;
                    const mergedUser = {
                      ...session.user,
                      ...((session.user as User).profile === undefined && carried !== undefined
                        ? { profile: carried }
                        : {}),
                    };
                    updateState({
                      session,
                      user: mergedUser as User,
                      isAuthenticated: true,
                      error: null,
                      isLoading: false,
                    });
                  }
                  break;
                  
                case 'SIGNED_OUT':
                  setOwnerActive(false);
                  // FASE 1B: reset de identidad (no-op si logout() ya lo hizo).
                  try {
                    resetProIdentity();
                  } catch {
                    // noop
                  }
                  establishedUserIdRef.current = null;
                  attachedProfileRef.current = null;
                  epochRef.current += 1;
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
        subscription = sub;
        
        // Set up periodic session validation
        intervalId = setInterval(async () => {
          if (!mounted) return;
          try {
            await validateAndRefreshSession();
          } catch (error) {
            handleAuthError(error, { showToast: false });
          }
        }, 5 * 60 * 1000); // Check every 5 minutes

        // Add visibility listener to refresh session when tab becomes visible
        handleVisibilityChange = async () => {
          if (!document.hidden && mounted) {
            await checkSession();
          }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        
      } catch (error) {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        updateState({
          error: error instanceof Error ? error : new Error('Failed to initialize auth'),
          isLoading: false,
        });
      }
    };
    
    initializeAuth();
    
    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      if (subscription) subscription.unsubscribe();
      if (intervalId) clearInterval(intervalId);
      if (handleVisibilityChange) document.removeEventListener('visibilitychange', handleVisibilityChange);
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
