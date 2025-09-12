import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Profile } from "@/hooks/useProfile";
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { useToast } from "@/hooks/use-toast";

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'client' | 'lawyer';
  hasUsedFreeConsultation: boolean;
  profile?: Profile;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  signup: (email: string, password: string, name: string, role: 'client' | 'lawyer') => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (profile: Partial<Profile>) => Promise<void>;
  refreshUser: () => Promise<User | undefined>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Load user profile from Supabase
  const loadUserProfile = useCallback(async (authUser: SupabaseUser): Promise<User> => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', authUser.id)
        .single();

      if (error) throw error;

      // Create a safe profile with all required fields
      const safeProfile: Profile = {
        id: profile?.id || '',
        user_id: authUser.id,
        first_name: profile?.first_name || null,
        last_name: profile?.last_name || null,
        display_name: profile?.display_name || null,
        avatar_url: profile?.avatar_url || null,
        bio: profile?.bio || null,
        location: profile?.location || null,
        phone: profile?.phone || null,
        website: profile?.website || null,
        specialties: profile?.specialties || null,
        hourly_rate_clp: profile?.hourly_rate_clp || null,
        response_time: profile?.response_time || null,
        satisfaction_rate: profile?.satisfaction_rate || null,
        languages: profile?.languages || null,
        availability: profile?.availability || null,
        verified: profile?.verified || false,
        available_for_hire: profile?.available_for_hire || false,
        bar_number: profile?.bar_number || null,
        zoom_link: profile?.zoom_link || null,
        education: profile?.education || null,
        certifications: profile?.certifications || null,
        experience_years: profile?.experience_years || null,
        rating: profile?.rating || 0,
        review_count: profile?.review_count || 0,
        has_used_free_consultation: profile?.has_used_free_consultation || false,
        visibility_settings: profile?.visibility_settings || {
          profile_visible: true,
          show_online_status: true,
          allow_direct_messages: true
        },
        verification_documents: profile?.verification_documents || {
          id_verification: { status: 'not_uploaded' },
          bar_verification: {
            status: 'not_uploaded',
            bar_number: '',
            state: ''
          }
        },
        created_at: profile?.created_at || new Date().toISOString(),
        updated_at: profile?.updated_at || null
      };

      const userData: User = {
        id: authUser.id,
        email: authUser.email || '',
        name: safeProfile.display_name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
        role: (authUser.user_metadata?.role as 'client' | 'lawyer') || 'client',
        hasUsedFreeConsultation: safeProfile.has_used_free_consultation,
        profile: safeProfile
      };

      setUser(userData);
      return userData;
    } catch (error) {
      console.error('Error loading user profile:', error);
      const defaultUser: User = {
        id: authUser.id,
        email: authUser.email || '',
        name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
        role: (authUser.user_metadata?.role as 'client' | 'lawyer') || 'client',
        hasUsedFreeConsultation: false
      };
      setUser(defaultUser);
      return defaultUser;
    }
  }, []);

  // Check if user is logged in
  const checkUser = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      
      if (session?.user) {
        await loadUserProfile(session.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Error checking user:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [loadUserProfile]);

  // Login with email/password
  const login = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      if (data?.user) {
        await loadUserProfile(data.user);
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }, [loadUserProfile]);

  // Login with Google
  const loginWithGoogle = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    }
  }, []);

  // Sign up new user
  const signup = useCallback(async (email: string, password: string, name: string, role: 'client' | 'lawyer') => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role,
          },
        },
      });

      if (error) throw error;

      if (data?.user) {
        // Create profile for new user
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              user_id: data.user.id,
              display_name: name,
              role,
              has_used_free_consultation: false,
            },
          ]);

        if (profileError) {
          console.error('Error creating profile:', profileError);
        }

        await loadUserProfile(data.user);
      }
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  }, [loadUserProfile]);

  // Logout user
  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  }, []);

  // Update user profile
  const updateProfile = useCallback(async (profile: Partial<Profile>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update(profile)
        .eq('user_id', user.id);

      if (error) throw error;

      // Refresh user data
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        await loadUserProfile(authUser);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }, [user, loadUserProfile]);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data: { user: authUser }, error } = await supabase.auth.getUser();
      if (error) throw error;
      
      if (authUser) {
        return await loadUserProfile(authUser);
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
      throw error;
    }
  }, [user, loadUserProfile]);

  // Set up auth state listener
  useEffect(() => {
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        if (session?.user) {
          await loadUserProfile(session.user);
        } else {
          setUser(null);
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, [checkUser]);

  const value = {
    user,
    isLoading,
    login,
    loginWithGoogle,
    signup,
    logout,
    updateProfile,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
