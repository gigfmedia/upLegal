import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from "@/lib/supabaseClient";
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { toast } from "@/hooks/use-toast";
import type { AuthContextType, User, Json } from '../../auth.types';
import { Profile } from '@/hooks/useProfile.new';

// Create the auth context
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

      if (error) {
        throw new Error(error.message || 'Error al iniciar sesión');
      }

      if (!data?.user) {
        throw new Error('No se pudo obtener la información del usuario');
      }

      const userProfile = await loadUserProfile(data.user);
      setUser(userProfile);
      
      toast({
        title: '¡Bienvenido!',
        description: 'Has iniciado sesión correctamente.',
      });

      return userProfile;
    } catch (error) {
      console.error('Login error:', error);
      
      let errorMessage = 'Error al iniciar sesión';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
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

  // Sign up with email and password
  const signup = useCallback(async (
    email: string, 
    password: string, 
    name: string, 
    role: 'client' | 'lawyer'
  ): Promise<User> => {
    try {
      setIsLoading(true);
      
      // Create the user in Auth
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            name,
            role,
          },
        },
      });

      if (error) {
        throw new Error(error.message || 'Error al crear la cuenta');
      }

      if (!data.user) {
        throw new Error('No se pudo crear el usuario');
      }

      // Create the profile in the database
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            user_id: data.user.id,
            first_name: name.split(' ')[0],
            last_name: name.split(' ').slice(1).join(' ') || null,
            display_name: name,
            role,
          },
        ]);

      if (profileError) {
        throw new Error(profileError.message || 'Error al crear el perfil');
      }

      // Load the full user profile
      const userProfile = await loadUserProfile(data.user);
      setUser(userProfile);
      
      toast({
        title: '¡Cuenta creada!',
        description: 'Por favor verifica tu correo electrónico para continuar.',
      });

      return userProfile;
    } catch (error) {
      console.error('Signup error:', error);
      
      let errorMessage = 'Error al crear la cuenta';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
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

  // Logout
  const logout = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }
      
      setUser(null);
      setSession(null);
      
      toast({
        title: 'Sesión cerrada',
        description: 'Has cerrado sesión correctamente.',
      });
    } catch (error) {
      console.error('Logout error:', error);
      
      toast({
        title: 'Error',
        description: 'No se pudo cerrar la sesión. Por favor, inténtalo de nuevo.',
        variant: 'destructive',
      });
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update user profile
  const updateProfile = useCallback(async (profile: Partial<Profile>): Promise<User> => {
    if (!user) {
      throw new Error('No hay un usuario autenticado');
    }

    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          ...profile,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) {
        throw new Error(error.message || 'Error al actualizar el perfil');
      }

      // Refresh the user data
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        throw new Error('No se pudo obtener la información actualizada del usuario');
      }
      
      if (!authUser) {
        throw new Error('No se encontró el usuario autenticado');
      }

      const updatedUser = await loadUserProfile(authUser);
      setUser(updatedUser);
      
      toast({
        title: 'Perfil actualizado',
        description: 'Tus datos se han actualizado correctamente.',
      });

      return updatedUser;
    } catch (error) {
      console.error('Update profile error:', error);
      
      let errorMessage = 'Error al actualizar el perfil';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
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
      throw new Error('No hay un usuario autenticado para actualizar');
    }

    try {
      setIsLoading(true);
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        throw new Error('No se pudo obtener la información del usuario');
      }
      
      if (!authUser) {
        throw new Error('No se encontró el usuario autenticado');
      }

      const updatedUser = await loadUserProfile(authUser);
      setUser(updatedUser);
      
      return updatedUser;
    } catch (error) {
      console.error('Refresh user error:', error);
      
      let errorMessage = 'Error al actualizar la información del usuario';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
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

  const value = {
    user,
    isLoading,
    login,
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

// Export the auth hook for components to use
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
