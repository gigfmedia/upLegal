import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { logger } from '@/utils/logger';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Environment variables are required
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables (without throwing at module level to avoid crashing the entire app)
if (!supabaseUrl || !supabaseAnonKey) {
  logger.error('Supabase initialization failed: Missing required environment variables', new Error('Missing env vars'), {
    context: 'supabaseClient',
    hasSupabaseUrl: !!supabaseUrl,
    hasSupabaseKey: !!supabaseAnonKey,
  });
}

// Create a singleton instance of Supabase client
let supabaseClient: ReturnType<typeof createClient<Database>> | null = null;

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

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing required environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set');
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
 * Get Supabase client for admin operations.
 * NOTE: Admin operations that require bypassing RLS should be done via Supabase Edge Functions
 * using the service role key server-side. Never expose the service role key in the frontend.
 * This client uses the anon key but can be used with admin-level RLS policies.
 */
export const getSupabaseAdminClient = () => {
  // Reuse the same client — admin operations requiring RLS bypass should go through Edge Functions
  return getSupabaseClient();
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
