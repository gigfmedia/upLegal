import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from "@/lib/supabaseClient";
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { toast } from "@/hooks/use-toast";
import type { AuthContextType, User, Json } from '../../auth.types';
import { Profile } from '@/hooks/useProfile.new';

// Create the auth context with proper typing
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to safely parse JSON fields
const safeJsonParse = <T,>(value: Json | null | undefined, defaultValue: T): T => {
  if (value === null || value === undefined) return defaultValue;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch (e) {
      console.error('Error parsing JSON:', e);
      return defaultValue;
    }
  }
  return value as T;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load user profile from Supabase
  const loadUserProfile = useCallback(async (authUser: SupabaseUser): Promise<User> => {
    if (!authUser?.id) {
      throw new Error('User not authenticated');
    }

    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', authUser.id)
        .single();

      if (profileError) {
        console.error('Error loading profile:', profileError);
        throw new Error('Failed to load user profile');
      }
      
      if (!profile) {
        throw new Error('Profile not found');
      }

      // Process profile data with proper typing
      const userProfile: User = {
        id: authUser.id,
        email: authUser.email || '',
        name: profile.first_name ? 
          `${profile.first_name} ${profile.last_name || ''}`.trim() : 
          authUser.email?.split('@')[0] || 'User',
        role: profile.role || 'client',
        hasUsedFreeConsultation: Boolean(profile.has_used_free_consultation),
        profile: profile as unknown as Profile
      };

      setUser(userProfile);
      return userProfile;
    } catch (error) {
      console.error('Error in loadUserProfile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load profile';
      setError(new Error(errorMessage));
      throw error;
    }
  }, []);

  // Handle auth state changes
  useEffect(() => {
    let mounted = true;

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        try {
          setIsLoading(true);
          setSession(session);

          if (session?.user) {
            await loadUserProfile(session.user);
          } else {
            setUser(null);
          }
        } catch (error) {
          console.error('Auth state change error:', error);
          setError(error instanceof Error ? error : new Error('Authentication error'));
        } finally {
          if (mounted) {
            setIsLoading(false);
          }
        }
      }
    );

    // Initial session check
    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (initialSession?.user) {
          await loadUserProfile(initialSession.user);
        }
      } catch (error) {
        console.error('Initial auth check failed:', error);
        setError(error instanceof Error ? error : new Error('Initial auth check failed'));
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, [loadUserProfile]);

  // Login with email and password
  const login = useCallback(async (email: string, password: string): Promise<User> => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.user) {
        throw error || new Error('Login failed');
      }

      return await loadUserProfile(data.user);
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [loadUserProfile]);

  // Sign up new user
  const signup = useCallback(async (
    email: string, 
    password: string, 
    name: string, 
    role: 'client' | 'lawyer'
  ): Promise<User> => {
    try {
      setIsLoading(true);
      
      // Create auth user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError || !authData.user) {
        throw signUpError || new Error('Signup failed');
      }

      // Create user profile
      const [firstName, ...lastNameParts] = name.split(' ');
      const lastName = lastNameParts.join(' ');
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            user_id: authData.user.id,
            email: email.toLowerCase(),
            first_name: firstName,
            last_name: lastName,
            role,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (profileError) {
        // Clean up auth user if profile creation fails
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw profileError;
      }

      return await loadUserProfile(authData.user);
    } catch (error) {
      console.error('Signup error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Signup failed';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [loadUserProfile]);

  // Logout user
  const logout = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error('Logout error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Logout failed';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update user profile
  const updateProfile = useCallback(async (updates: Partial<Profile>): Promise<User> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to update profile');

      // Reload user data
      return await loadUserProfile(user as unknown as SupabaseUser);
    } catch (error) {
      console.error('Update profile error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [user, loadUserProfile]);

  // Refresh user data
  const refreshUser = useCallback(async (): Promise<User> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      setIsLoading(true);
      return await loadUserProfile(user as unknown as SupabaseUser);
    } catch (error) {
      console.error('Refresh user error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh user data';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [user, loadUserProfile]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    user,
    isLoading,
    login,
    signup,
    logout,
    updateProfile,
    refreshUser,
  }), [user, isLoading, login, signup, logout, updateProfile, refreshUser]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
