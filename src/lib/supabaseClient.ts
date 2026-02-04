import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { logger } from '@/utils/logger';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Environment variables are required
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  const error = new Error('Missing required environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set');
  logger.error('Supabase initialization failed', error, {
    context: 'supabaseClient',
    hasSupabaseUrl: !!supabaseUrl,
    hasSupabaseKey: !!supabaseAnonKey,
  });
  throw error;
}

// Create a singleton instance of the Supabase client
let supabaseClient: ReturnType<typeof createClient<Database>> | null = null;

// Track initialization state
let isInitialized = false;

/**
 * Report errors consistently
 */
const reportError = (error: Error, context: string = 'Supabase Client', extra: Record<string, any> = {}) => {
  logger.error(`[${context}] Error occurred`, error, {
    ...extra,
    context,
    isBrowser,
    environment: process.env.NODE_ENV,
  });
};

/**
 * Get or create the Supabase client instance
 * Ensures only one instance is created per request in SSR environments
 */
export const getSupabaseClient = () => {
  try {
    if (!supabaseClient || !isInitialized) {
      logger.debug('Creating new Supabase client instance', {
        isBrowser,
        environment: process.env.NODE_ENV,
      });
      
            // Block WebSocket at the lowest level possible
      if (isBrowser && !window.originalWebSocket) {
        window.originalWebSocket = window.WebSocket;
        
        // Override WebSocket to block Supabase realtime connections
        window.WebSocket = class BlockedWebSocket extends window.originalWebSocket {
          constructor(url: string | URL, protocols?: string | string[]) {
            if (typeof url === 'string' && url.includes('supabase.co/realtime')) {
              console.warn('Blocked WebSocket connection to Supabase realtime:', url);
              // Return a mock WebSocket that does nothing
              const mockSocket = {
                send: () => {},
                close: () => {},
                addEventListener: () => {},
                removeEventListener: () => {},
                dispatchEvent: () => true,
                readyState: 3, // CLOSED
                bufferedAmount: 0,
                onopen: null,
                onclose: null,
                onerror: null,
                onmessage: null,
                url: '',
                extensions: '',
                protocol: '',
                CONNECTING: 0,
                OPEN: 1,
                CLOSING: 2,
                CLOSED: 3
              };
              return mockSocket as unknown as WebSocket;
            }
            super(url, protocols);
          }
        } as any;
      }

      const options = {
        auth: {
          autoRefreshToken: true,
          persistSession: isBrowser,
          detectSessionInUrl: false, // Disable URL session detection
          storage: isBrowser ? {
            getItem: (key: string) => {
              logger.debug('Storage getItem:', key);
              return localStorage.getItem(key);
            },
            setItem: (key: string, value: string) => {
              logger.debug('Storage setItem:', key);
              localStorage.setItem(key, value);
            },
            removeItem: (key: string) => {
              logger.debug('Storage removeItem:', key);
              localStorage.removeItem(key);
            }
          } : undefined,
          storageKey: 'sb-auth-token',
          flowType: 'pkce' as const,
        },
        // Completely disable realtime features
        realtime: {
          disabled: true
        },
        // Disable auto-connect
        autoConnect: false,
        // Global fetch handler as an additional safety measure
        global: {
          fetch: (url: string, options: any) => {
            // Block any WebSocket or realtime connections
            if (typeof url === 'string' && 
                (url.includes('/realtime/') || 
                 url.includes('websocket') || 
                 url.startsWith('wss:'))) {
              console.warn('Blocked WebSocket connection attempt to:', url);
              return Promise.reject(new Error('WebSocket connections are disabled by client configuration'));
            }
            return fetch(url, options);
          },
          headers: {
            'X-Client-Info': 'uplegal-web/1.0',
            'X-Requested-With': 'XMLHttpRequest'
          }
        }
      };
      
      supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, options);
      
      // Add auth state change listener for debugging
      if (process.env.NODE_ENV === 'development') {
        supabaseClient.auth.onAuthStateChange((event, session) => {
          logger.debug('Auth state changed', { 
            event, 
            hasSession: !!session,
            session: session ? {
              user: {
                id: session.user?.id,
                email: session.user?.email,
                role: session.user?.role,
              },
              expiresAt: session.expires_at
            } : null
          });
        });
      }

      isInitialized = true;
    } else {
      logger.debug('Returning existing Supabase client instance');
    }
    
    return supabaseClient;
  } catch (error) {
    reportError(error as Error, 'getSupabaseClient');
    throw error;
  }
};

// For backward compatibility
export const supabase = getSupabaseClient();

// Initialize any necessary services
if (isBrowser && process.env.NODE_ENV === 'production') {
  // Initialize error tracking service in production
  // Example: Sentry.init({ dsn: process.env.SENTRY_DSN });
}

export { reportError };
export default supabase;
