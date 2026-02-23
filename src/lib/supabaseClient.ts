import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { logger } from '@/utils/logger';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Environment variables are required
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
  const error = new Error('Missing required environment variables: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY and VITE_SUPABASE_SERVICE_ROLE_KEY must be set');
  logger.error('Supabase initialization failed', error, {
    context: 'supabaseClient',
    hasSupabaseUrl: !!supabaseUrl,
    hasSupabaseKey: !!supabaseAnonKey,
    hasSupabaseServiceRoleKey: !!supabaseServiceRoleKey,
  });
  throw error;
}

// Create a singleton instance of Supabase client
let supabaseClient: ReturnType<typeof createClient<Database>> | null = null;
let supabaseAdminClient: ReturnType<typeof createClient<Database>> | null = null;

// Track initialization state
let isInitialized = false;

/**
 * Report errors consistently
 */
const reportError = (error: Error, context: string, extra: Record<string, unknown> = {}) => {
  logger.error(`[${context}] Error occurred`, error, {
    ...extra,
    context,
    isBrowser,
    environment: process.env.NODE_ENV,
  });
};

/**
 * Get the regular Supabase client (for regular users)
 */
export const getSupabaseClient = () => {
  if (isInitialized && supabaseClient) {
    return supabaseClient;
  }

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    const error = new Error('Missing required environment variables: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY and VITE_SUPABASE_SERVICE_ROLE_KEY must be set');
    logger.error('Supabase initialization failed', error, {
      context: 'supabaseClient',
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseAnonKey,
      hasSupabaseServiceRoleKey: !!supabaseServiceRoleKey,
    });
    throw error;
  }

  const options = {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  };

  supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, options);
  
  isInitialized = true;
  return supabaseClient;
};

/**
 * Get Supabase client with service role (for admin operations)
 */
export const getSupabaseAdminClient = () => {
  if (isInitialized && supabaseAdminClient) {
    return supabaseAdminClient;
  }

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    const error = new Error('Missing required environment variables: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY and VITE_SUPABASE_SERVICE_ROLE_KEY must be set');
    logger.error('Supabase admin client initialization failed', error, {
      context: 'supabaseAdminClient',
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseAnonKey,
      hasSupabaseServiceRoleKey: !!supabaseServiceRoleKey,
    });
    throw error;
  }

  const options = {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    // Bypass RLS for admin operations
    global: {
      headers: {
        'Authorization': `Bearer ${supabaseServiceRoleKey}`,
        'X-Client-Info': 'uplegal-web/1.0-admin'
      }
    }
  };

  supabaseAdminClient = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, options);
  
  isInitialized = true;
  return supabaseAdminClient;
};

// Initialize any necessary services
if (isBrowser && process.env.NODE_ENV === 'production') {
  // Initialize error tracking service in production
  // Example: Sentry.init({ dsn: process.env.SENTRY_DSN });
}

// Create default supabase client for backward compatibility
const supabase = getSupabaseClient();

// For backward compatibility
export { supabase, reportError };
export default supabase;
