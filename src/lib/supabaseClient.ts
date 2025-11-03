import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Debug log to track client initialization
const DEBUG = true;
const log = (...args: any[]) => {
  if (DEBUG && isBrowser) {
    //console.log('[SupabaseClient]', ...args);
  }
};

// Use environment variables if available, otherwise fall back to hardcoded values
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://lgxsfmvyjctxehwslvyw.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxneHNmbXZ5amN0eGVod3Nsdnl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3OTkyMTAsImV4cCI6MjA2ODM3NTIxMH0.s2DoNuKigl_G3erwGeC4oLCC_3UiMQu5KJd0gnnYDeU';

// Create a singleton instance of the Supabase client
let supabaseClient: ReturnType<typeof createClient<Database>> | null = null;

// Track initialization state
let isInitialized = false;

/**
 * Get or create the Supabase client instance
 * Ensures only one instance is created per request in SSR environments
 */
export const getSupabaseClient = () => {
  if (!supabaseClient || !isInitialized) {
    log('Creating new Supabase client instance');
    
    supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: isBrowser,
        detectSessionInUrl: isBrowser,
        storage: isBrowser ? {
          getItem: (key: string) => {
            log('Storage getItem:', key);
            return localStorage.getItem(key);
          },
          setItem: (key: string, value: string) => {
            log('Storage setItem:', key);
            localStorage.setItem(key, value);
          },
          removeItem: (key: string) => {
            log('Storage removeItem:', key);
            localStorage.removeItem(key);
          }
        } : undefined,
        storageKey: 'sb-auth-token',
        flowType: 'pkce',
      },
    });
    
    isInitialized = true;
  } else {
    log('Returning existing Supabase client instance');
  }
  
  return supabaseClient;
};

// For backward compatibility
export const supabase = getSupabaseClient();

// Debug: Log when the module is initialized
if (isBrowser) {
  log('Supabase client module initialized');
}

export default supabase;
