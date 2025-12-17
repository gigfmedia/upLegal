import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Realtime subscription types
export type RealtimePayload<T> = {
  event: 'INSERT' | 'UPDATE' | 'DELETE';
  schema: string;
  table: string;
  record: T;
  old_record: T | null;
};

// Helper function to handle errors
export const handleSupabaseError = (error: any, context: string = '') => {
  console.error(`Supabase Error (${context}):`, error);
  throw new Error(error.message || `Error ${context}`);
};

// Helper function to check if user is admin
export const isAdmin = async (userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data?.is_admin || false;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};
