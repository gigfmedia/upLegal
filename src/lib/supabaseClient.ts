import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Log environment variables for debugging (remove in production)
if (isBrowser) {
  //console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL ? 'Using .env' : 'Using fallback');
}

// Use environment variables if available, otherwise fall back to hardcoded values
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://lgxsfmvyjctxehwslvyw.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxneHNmbXZ5amN0eGVod3Nsdnl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3OTkyMTAsImV4cCI6MjA2ODM3NTIxMH0.s2DoNuKigl_G3erwGeC4oLCC_3UiMQu5KJd0gnnYDeU';

// Create a singleton instance of the Supabase client
let supabaseClient: ReturnType<typeof createClient<Database>> | null = null;

/**
 * Get or create the Supabase client instance
 * Ensures only one instance is created per request in SSR environments
 */
export const getSupabaseClient = () => {
  if (!supabaseClient) {
    supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: isBrowser,
        detectSessionInUrl: isBrowser,
        storage: isBrowser ? localStorage : undefined,
        storageKey: 'sb-auth-token',
        flowType: 'pkce',
      },
    });
  }
  
  return supabaseClient;
};

// For backward compatibility
export const supabase = getSupabaseClient();

export default supabase;
