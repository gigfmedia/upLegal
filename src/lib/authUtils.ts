/**
 * Clears all authentication-related data from the browser
 * This includes localStorage, sessionStorage, cookies, and service workers
 */
export const clearAuthData = async (): Promise<void> => {
  try {
    // Clear localStorage
    const authKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.includes('sb-') || key?.includes('supabase.auth.')) {
        authKeys.push(key);
      }
    }
    authKeys.forEach(key => localStorage.removeItem(key));

    // Clear sessionStorage
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.includes('sb-') || key?.includes('supabase.auth.')) {
        sessionStorage.removeItem(key);
      }
    }

    // Clear cookies
    document.cookie.split(';').forEach(cookie => {
      const [name] = cookie.trim().split('=');
      if (name.includes('sb-') || name.includes('supabase-')) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      }
    });

    // Clear service workers and caches
    if (typeof window !== 'undefined') {
      // Unregister all service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(registration => registration.unregister()));
      }

      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
      }
    }
  } catch (error) {
    throw error;
  }
};

/**
 * Checks if the current session is valid or needs refresh
 * @returns Promise<boolean> True if session is valid, false otherwise
 */
export const checkSessionValidity = async (): Promise<boolean> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return false;
    
    // Check if token is expired or about to expire (in 5 minutes)
    const expiresAt = session.expires_at || 0;
    const nowInSeconds = Math.floor(Date.now() / 1000);
    return expiresAt > nowInSeconds + 300; // 5 minutes buffer
  } catch (error) {
    return false;
  }
};

// Re-export supabase client for convenience
export { supabase } from '@/lib/supabaseClient';
