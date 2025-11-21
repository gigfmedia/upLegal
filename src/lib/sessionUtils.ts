import { supabase } from './supabaseClient';

/**
 * Attempts to refresh the current session
 * @returns Promise<boolean> True if refresh was successful, false otherwise
 */
export const refreshSession = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error('Error refreshing session:', error);
      return false;
    }
    
    if (!data.session) {
      console.warn('No session data after refresh');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Unexpected error during session refresh:', error);
    return false;
  }
};

/**
 * Validates the current session and refreshes if needed
 * @returns Promise<boolean> True if session is valid, false otherwise
 */
export const validateAndRefreshSession = async (): Promise<boolean> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    // No session exists
    if (!session) return false;
    
    // Check if token is expired or about to expire (in 5 minutes)
    const expiresAt = session.expires_at || 0;
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = expiresAt - nowInSeconds;
    
    // If token is still valid for more than 5 minutes
    if (timeUntilExpiry > 300) return true;
    
    // Token is about to expire or already expired, try to refresh
    return await refreshSession();
    
  } catch (error) {
    console.error('Error validating session:', error);
    return false;
  }
};

/**
 * Creates an interceptor for API calls that require authentication
 * Automatically refreshes the session if needed before making the request
 */
export const withAuth = async <T>({
  apiCall,
  options = { autoRefresh: true }
}: {
  apiCall: () => Promise<T>;
  options?: { autoRefresh?: boolean };
}): Promise<T> => {
  try {
    if (options.autoRefresh) {
      const isValid = await validateAndRefreshSession();
      if (!isValid) {
        throw new Error('Session is not valid');
      }
    }
    return await apiCall();
  } catch (error) {
    console.error('API call with auth failed:', error);
    throw error;
  }
};
