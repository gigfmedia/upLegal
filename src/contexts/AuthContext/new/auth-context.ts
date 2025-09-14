import { createContext } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { Session } from '@supabase/supabase-js';

export interface AuthContextType {
  user: SupabaseUser | null;
  session: Session | null;
  isLoading: boolean;
  error: Error | null;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
