import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import { refreshSession } from './sessionUtils';

const SESSION_STORAGE_KEY = 'sb:session';
const USER_STORAGE_KEY = 'sb:user';
const TOKEN_REFRESH_BUFFER = 5 * 60 * 1000; // 5 minutes before token expires

/**
 * Saves the current session and user to session storage
 * This is used to persist the session across page refreshes
 */
export const saveSession = (session: Session | null, user: User | null): void => {
  try {
    if (session) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } else {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
    
    if (user) {
      sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      sessionStorage.removeItem(USER_STORAGE_KEY);
    }
  } catch (error) {
    // Error saving session to storage
  }
};

/**
 * Loads the session and user from session storage
 * Returns null if no valid session is found
 */
export const loadSession = (): { session: Session | null; user: User | null } => {
  try {
    const sessionStr = sessionStorage.getItem(SESSION_STORAGE_KEY);
    const userStr = sessionStorage.getItem(USER_STORAGE_KEY);
    
    if (!sessionStr || !userStr) {
      return { session: null, user: null };
    }
    
    const session = JSON.parse(sessionStr);
    const user = JSON.parse(userStr);
    
    // Basic validation
    if (!session?.access_token || !user?.id) {
      clearSession();
      return { session: null, user: null };
    }
    
    return { session, user };
  } catch (error) {
    clearSession();
    return { session: null, user: null };
  }
};

/**
 * Clears the session and user from storage
 */
export const clearSession = (): void => {
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    sessionStorage.removeItem(USER_STORAGE_KEY);
  } catch (error) {
    // Error clearing session from storage
  }
};

/**
 * Checks if the current session is expired or about to expire
 * Returns true if the session is still valid, false otherwise
 */
export const isSessionValid = (session: Session | null): boolean => {
  if (!session?.expires_at) return false;
  
  // Convert expires_at to milliseconds and subtract buffer
  const expiresAt = session.expires_at * 1000 - TOKEN_REFRESH_BUFFER;
  const now = Date.now();
  
  return now < expiresAt;
};

/**
 * Initializes the session from storage and sets up auto-refresh
 * Should be called when the app starts
 */
export const initializeAuth = async (): Promise<{ session: Session | null; user: User | null }> => {
  // Try to load session from storage
  const { session, user } = loadSession();
  
  // If no session or session is invalid, clear and return
  if (!session || !user || !isSessionValid(session)) {
    clearSession();
    return { session: null, user: null };
  }
  
  // If session is about to expire, try to refresh it
  if (session.expires_at * 1000 - Date.now() < TOKEN_REFRESH_BUFFER * 2) {
    try {
      const { session: newSession, error } = await refreshSession(session.refresh_token);
      
      if (error || !newSession) {
        clearSession();
        return { session: null, user: null };
      }
      
      // Update the session in storage
      saveSession(newSession, user);
      return { session: newSession, user };
    } catch (error) {
      clearSession();
      return { session: null, user: null };
    }
  }
  
  // Session is still valid, set up auto-refresh
  setupAutoRefresh(session);
  
  return { session, user };
};

/**
 * Sets up auto-refresh for the session
 * Will automatically refresh the token before it expires
 */
const setupAutoRefresh = (session: Session): void => {
  if (!session?.expires_at) return;
  
  const expiresAt = session.expires_at * 1000 - TOKEN_REFRESH_BUFFER;
  const now = Date.now();
  const timeUntilRefresh = expiresAt - now;
  
  // If the session is already expired, don't set up auto-refresh
  if (timeUntilRefresh <= 0) return;
  
  // Set a timeout to refresh the token before it expires
  setTimeout(async () => {
    try {
      const { session: newSession, error } = await refreshSession(session.refresh_token);
      
      if (error || !newSession) {
        clearSession();
        window.dispatchEvent(new Event('session-expired'));
        return;
      }
      
      // Update the session in storage
      const userStr = sessionStorage.getItem(USER_STORAGE_KEY);
      const user = userStr ? JSON.parse(userStr) : null;
      saveSession(newSession, user);
      
      // Set up the next refresh
      setupAutoRefresh(newSession);
      
    } catch (error) {
      clearSession();
      window.dispatchEvent(new Event('session-expired'));
    }
  }, timeUntilRefresh);
};

/**
 * Sets up session change listeners
 * Should be called when the app starts
 */
export const setupAuthListeners = ({
  onAuthStateChange,
  onSessionExpired,
}: {
  onAuthStateChange?: (event: 'SIGNED_IN' | 'SIGNED_OUT', session: Session | null) => void;
  onSessionExpired?: () => void;
} = {}) => {
  // Listen for auth state changes from Supabase
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      if (session) {
        const { data: { user } } = await supabase.auth.getUser();
        saveSession(session, user);
        setupAutoRefresh(session);
        onAuthStateChange?.('SIGNED_IN', session);
      }
    } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
      clearSession();
      onAuthStateChange?.('SIGNED_OUT', null);
    }
  });
  
  // Listen for session expiration events
  const handleSessionExpired = () => {
    clearSession();
    onSessionExpired?.();
  };
  
  window.addEventListener('session-expired', handleSessionExpired);
  
  // Return cleanup function
  return () => {
    subscription?.unsubscribe();
    window.removeEventListener('session-expired', handleSessionExpired);
  };
};
