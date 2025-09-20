import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

// Use environment variables if available, otherwise fall back to hardcoded values
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://lgxsfmvyjctxehwslvyw.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxneHNmbXZ5amN0eGVod3Nsdnl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3OTkyMTAsImV4cCI6MjA2ODM3NTIxMH0.s2DoNuKigl_G3erwGeC4oLCC_3UiMQu5KJd0gnnYDeU';

// Create a single supabase client for the app
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    storageKey: 'sb-auth-token',
    flowType: 'pkce',
  },
});

export default supabase;
