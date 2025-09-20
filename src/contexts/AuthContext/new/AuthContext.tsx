import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from "@/lib/supabaseClient";
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { toast } from "@/hooks/use-toast";
import type { AuthContextType, User } from '../../auth.types';
import type { Profile, safeJsonParse } from '../types';
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  phone: string | null;
  website: string | null;
  role: 'client' | 'lawyer';
  specialties: string[];
  hourly_rate_clp: number | null;
  response_time: string | null;
  satisfaction_rate: number | null;
  languages: string[];
  availability: string | null;
  verified: boolean;
  available_for_hire: boolean;
  bar_number: string | null;
  zoom_link: string | null;
  education: Record<string, unknown> | null;
  certifications: Record<string, unknown> | null;
  experience_years: number | null;
  rating: number;
  review_count: number;
  has_used_free_consultation: boolean;
  visibility_settings: {
    profile_visible: boolean;
    show_online_status: boolean;
    allow_direct_messages: boolean;
  };
  verification_documents: {
    id_verification?: {
      status: 'pending' | 'approved' | 'rejected' | 'not_uploaded';
      rejection_reason?: string;
      verified_at?: string;
    };
    bar_verification?: {
      status: 'pending' | 'approved' | 'rejected' | 'not_uploaded';
      bar_number: string;
      state: string;
      rejection_reason?: string;
      verified_at?: string;
    };
  };
  created_at: string;

// Create the auth context
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Re-export safeJsonParse from types file
export { safeJsonParse };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load user profile from Supabase
  const loadUserProfile = useCallback(async (authUser: SupabaseUser): Promise<User> => {
    if (!authUser?.id) {
      throw new Error('Usuario no autenticado');
    }

    if (!authUser.email) {
      throw new Error('El usuario no tiene un correo electrónico asociado');
    }

    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', authUser.id)
        .single();

      if (profileError) {
        console.error('Error loading profile:', profileError);
        throw new Error('No se pudo cargar el perfil del usuario');
      }
      
      if (!profile) {
        throw new Error('Perfil no encontrado');
      }

      // Process profile data with proper typing
      const processedProfile: Profile = {
        id: profile.id,
        user_id: profile.user_id,
        first_name: profile.first_name || null,
        last_name: profile.last_name || null,
        display_name: profile.display_name || null,
        avatar_url: profile.avatar_url || null,
        bio: profile.bio || null,
        location: profile.location || null,
        phone: profile.phone || null,
        website: profile.website || null,
        role: (profile.role === 'lawyer' ? 'lawyer' : 'client') as 'lawyer' | 'client',
        specialties: Array.isArray(profile.specialties) ? profile.specialties : [],
        hourly_rate_clp: profile.hourly_rate_clp || null,
        response_time: profile.response_time || null,
        satisfaction_rate: profile.satisfaction_rate || null,
        languages: Array.isArray(profile.languages) ? profile.languages : [],
        availability: profile.availability || null,
        verified: Boolean(profile.verified),
        available_for_hire: Boolean(profile.available_for_hire),
        bar_number: profile.bar_number || null,
        zoom_link: profile.zoom_link || null,
        education: safeJsonParse<Record<string, unknown> | null>(profile.education, null),
        certifications: safeJsonParse<Record<string, unknown> | null>(profile.certifications, null),
        experience_years: profile.experience_years || null,
        rating: Number(profile.rating || 0),
        review_count: Number(profile.review_count || 0),
        has_used_free_consultation: Boolean(profile.has_used_free_consultation),
        visibility_settings: {
          profile_visible: true,
          show_online_status: true,
          allow_direct_messages: true,
          ...(typeof profile.visibility_settings === 'object' && profile.visibility_settings !== null 
            ? profile.visibility_settings 
            : {})
        },
        verification_documents: {
          id_verification: { status: 'not_uploaded' as const },
          bar_verification: { status: 'not_uploaded' as const, bar_number: '', state: '' },
          ...(typeof profile.verification_documents === 'object' && profile.verification_documents !== null 
            ? profile.verification_documents 
            : {})
        },
        created_at: profile.created_at || new Date().toISOString(),
        updated_at: profile.updated_at || null
      };

      const userProfile: User = {
        id: authUser.id,
        email: authUser.email,
        name: processedProfile.display_name || 
              (processedProfile.first_name ? 
                `${processedProfile.first_name} ${processedProfile.last_name || ''}`.trim() : 
                authUser.email.split('@')[0]),
        role: processedProfile.role || 'client',
        hasUsedFreeConsultation: processedProfile.has_used_free_consultation || false,
        profile: processedProfile
      };

      setUser(userProfile);
      return userProfile;
    } catch (error) {
      console.error('Error in loadUserProfile:', error);
      setError(error instanceof Error ? error : new Error('Error al cargar el perfil'));
      throw error;
    }
  }, []);

  // Check user session on mount
  useEffect(() => {
    const checkUser = async () => {
      try {
        setIsLoading(true);
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }

        if (currentSession?.user) {
          const userProfile = await loadUserProfile(currentSession.user);
          setUser(userProfile);
          setSession(currentSession);
        } else {
          setUser(null);
          setSession(null);
        }
      } catch (error) {
        console.error('Error checking user session:', error);
        setError(error instanceof Error ? error : new Error('Error al verificar la sesión'));
      } finally {
        setIsLoading(false);
      }
    };

    checkUser();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);
        
        if (event === 'SIGNED_IN' && session?.user) {
          try {
            const userProfile = await loadUserProfile(session.user);
            setUser(userProfile);
            setSession(session);
            toast({
              title: '¡Bienvenido!',
              description: 'Has iniciado sesión correctamente.',
            });
          } catch (error) {
            console.error('Error loading user profile after sign in:', error);
            toast({
              title: 'Error',
              description: 'No se pudo cargar el perfil del usuario.',
              variant: 'destructive',
            });
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setSession(null);
        } else if (event === 'USER_UPDATED' && session?.user) {
          try {
            const userProfile = await loadUserProfile(session.user);
            setUser(userProfile);
          } catch (error) {
            console.error('Error updating user profile:', error);
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [loadUserProfile]);

  // Login with email and password
  const login = useCallback(async (email: string, password: string): Promise<User> => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error || !data.user) {
        throw error || new Error('Error al iniciar sesión');
      }

      return await loadUserProfile(data.user);
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al iniciar sesión';
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
        email: email.trim(),
        password,
      });

      if (signUpError || !authData.user) {
        throw signUpError || new Error('Error al crear la cuenta');
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
      const errorMessage = error instanceof Error ? error.message : 'Error al crear la cuenta';
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
      const errorMessage = error instanceof Error ? error.message : 'Error al cerrar sesión';
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
      throw new Error('Usuario no autenticado');
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
      if (!data) throw new Error('No se pudo actualizar el perfil');

      // Reload user data
      return await loadUserProfile(user as unknown as SupabaseUser);
    } catch (error) {
      console.error('Update profile error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al actualizar el perfil';
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
      throw new Error('Usuario no autenticado');
    }

    try {
      setIsLoading(true);
      return await loadUserProfile(user as unknown as SupabaseUser);
    } catch (error) {
      console.error('Refresh user error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al actualizar los datos del usuario';
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
    session,
    isLoading,
    error,
    login,
    signup,
    logout,
    updateProfile,
    refreshUser,
  }), [user, session, isLoading, error, login, signup, logout, updateProfile, refreshUser]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Export the auth hook for components to use
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
