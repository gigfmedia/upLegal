import { useEffect, useState, useCallback } from 'react';
import { supabase } from "@/lib/supabaseClient";
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { toast } from "@/hooks/use-toast";
import type { AuthContextType, User } from '../auth.types';
import { Profile } from '@/hooks/useProfile';
import { AuthContext } from './context';


export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load user profile from Supabase
  const loadUserProfile = useCallback(async (authUser: SupabaseUser): Promise<User> => {
    if (!authUser?.id) {
      throw new Error('Usuario no autenticado');
    }
    
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', authUser.id)
        .single();

      if (error) {
        console.error('Error loading profile:', error);
        throw new Error('No se pudo cargar el perfil del usuario');
      }
      
      if (!profile) {
        throw new Error('Perfil no encontrado');
      }

      // Create a safe profile with all required fields
      const safeProfile: Profile = {
        id: String(profile?.id || ''),
        user_id: authUser.id,
        first_name: profile?.first_name ?? null,
        last_name: profile?.last_name ?? null,
        display_name: profile?.display_name ?? null,
        avatar_url: profile?.avatar_url ?? null,
        bio: profile?.bio ?? null,
        location: profile?.location ?? null,
        phone: profile?.phone ?? null,
        website: profile?.website ?? null,
        specialties: profile?.specialties ?? null,
        hourly_rate_clp: profile?.hourly_rate_clp ?? null,
        response_time: profile?.response_time ?? null,
        satisfaction_rate: profile?.satisfaction_rate ?? null,
        languages: profile?.languages ?? null,
        availability: profile?.availability ?? null,
        verified: Boolean(profile?.verified ?? false),
        available_for_hire: Boolean(profile?.available_for_hire ?? false),
        bar_number: profile?.bar_number ?? null,
        zoom_link: profile?.zoom_link ?? null,
        education: profile?.education ?? null,
        certifications: profile?.certifications ?? null,
        experience_years: profile?.experience_years ?? null,
        rating: Number(profile?.rating ?? 0),
        review_count: Number(profile?.review_count ?? 0),
        has_used_free_consultation: Boolean(profile?.has_used_free_consultation ?? false),
        visibility_settings: (() => {
          try {
            if (!profile?.visibility_settings) {
              return {
                profile_visible: true,
                show_online_status: true,
                allow_direct_messages: true
              };
            }

            // Handle case where visibility_settings might be a string (JSON)
            const settings = typeof profile.visibility_settings === 'string' 
              ? JSON.parse(profile.visibility_settings)
              : profile.visibility_settings;

            return {
              profile_visible: Boolean(settings?.profile_visible ?? true),
              show_online_status: Boolean(settings?.show_online_status ?? true),
              allow_direct_messages: Boolean(settings?.allow_direct_messages ?? true)
            };
          } catch (error) {
            console.error('Error parsing visibility settings:', error);
            return {
              profile_visible: true,
              show_online_status: true,
              allow_direct_messages: true
            };
          }
        })(),
        verification_documents: (() => {
          try {
            if (!profile?.verification_documents) {
              return {
                id_verification: { status: 'not_uploaded' as const },
                bar_verification: {
                  status: 'not_uploaded' as const,
                  bar_number: '',
                  state: ''
                }
              };
            }

            // Handle case where verification_documents might be a string (JSON)
            const docs = typeof profile.verification_documents === 'string'
              ? JSON.parse(profile.verification_documents)
              : profile.verification_documents;

            return {
              id_verification: {
                status: (docs.id_verification?.status || 'not_uploaded') as 
                  'pending' | 'rejected' | 'not_uploaded' | 'approved',
                rejection_reason: docs.id_verification?.rejection_reason,
                verified_at: docs.id_verification?.verified_at
              },
              bar_verification: {
                status: (docs.bar_verification?.status || 'not_uploaded') as 
                  'pending' | 'rejected' | 'not_uploaded' | 'approved',
                bar_number: String(docs.bar_verification?.bar_number || ''),
                state: String(docs.bar_verification?.state || ''),
                rejection_reason: docs.bar_verification?.rejection_reason,
                verified_at: docs.bar_verification?.verified_at
              }
            };
          } catch (error) {
            console.error('Error parsing verification documents:', error);
            return {
              id_verification: { status: 'not_uploaded' as const },
              bar_verification: {
                status: 'not_uploaded' as const,
                bar_number: '',
                state: ''
              }
            };
          }
        })(),
        created_at: profile?.created_at || new Date().toISOString(),
        updated_at: profile?.updated_at || null
      };

      if (!authUser.email) {
        throw new Error('El usuario no tiene un correo electrónico asociado');
      }

      const userData: User = {
        id: authUser.id,
        email: authUser.email,
        name: safeProfile.display_name || authUser.user_metadata?.name || authUser.email.split('@')[0] || 'User',
        role: (authUser.user_metadata?.role as 'client' | 'lawyer') || 'client',
        hasUsedFreeConsultation: safeProfile.has_used_free_consultation,
        profile: safeProfile
      };

      setUser(userData);
      return userData;
    } catch (error) {
      console.error('Error loading user profile:', error);
      
      // Lanzamos el error en lugar de devolver un usuario por defecto
      throw error instanceof Error ? error : new Error('Error al cargar el perfil del usuario');
    }
  }, []);

  // Check if user is logged in
  const checkUser = useCallback(async () => {
    try {
      console.log('[Auth] Checking user session...');
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('[Auth] Error getting session:', error);
        throw error;
      }
      
      setSession(session);
      
      if (session?.user) {
        console.log('[Auth] User session found, loading profile...');
        await loadUserProfile(session.user);
      } else {
        console.log('[Auth] No active session found');
        setUser(null);
      }
    } catch (error) {
      console.error('Error checking user:', error);
      setError(error instanceof Error ? error : new Error('An unknown error occurred'));
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [loadUserProfile]);

  // Login with email/password
  const login = useCallback(async (email: string, password: string): Promise<User> => {
    try {
      console.log('[Auth] Starting login process');
      setIsLoading(true);
      console.log('[Auth] isLoading set to true');
      
      console.log('[Auth] Calling supabase.auth.signInWithPassword');
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });
      console.log('[Auth] supabase.auth.signInWithPassword response:', { data, error });

      if (error) {
        console.error('[Auth] Login error:', error);
        let errorMessage = 'Error al iniciar sesión';
        
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Correo o contraseña incorrectos';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Por favor verifica tu correo electrónico antes de iniciar sesión';
        }
        
        console.log('[Auth] Showing error toast:', errorMessage);
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive'
        });
        
        console.log('[Auth] Throwing error:', errorMessage);
        throw new Error(errorMessage);
      }

      if (!data?.user) {
        console.log('[Auth] No user data in response');
        throw new Error('No se pudo obtener la información del usuario');
      }

      console.log('[Auth] User authenticated, loading profile...');
      const userProfile = await loadUserProfile(data.user);
      
      if (!userProfile) {
        throw new Error('No se pudo cargar el perfil del usuario');
      }
      
      console.log('[Auth] User profile loaded:', userProfile);
      
      console.log('[Auth] Showing welcome toast');
      toast({
        title: '¡Bienvenido!',
        description: 'Has iniciado sesión correctamente.'
      });
      
      console.log('[Auth] Login successful, returning user profile');
      return userProfile;
    } catch (error) {
      console.error('[Auth] Error in login process:', error);
      throw error;
    } finally {
      console.log('[Auth] Setting isLoading to false');
      setIsLoading(false);
      console.log('[Auth] Login process completed');
    }
  }, [loadUserProfile]);

  // Sign up new user
  const signup = useCallback(async (email: string, password: string, name: string, role: 'client' | 'lawyer'): Promise<User> => {
    try {
      setIsLoading(true);
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

      if (error) {
        console.error('Signup error:', error);
        let errorMessage = 'Error al crear la cuenta';
        
        if (error.message.includes('already registered')) {
          errorMessage = 'Este correo ya está registrado';
        } else if (error.message.includes('password')) {
          errorMessage = 'La contraseña debe tener al menos 6 caracteres';
        }
        
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive'
        });
        
        throw new Error(errorMessage);
      }

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
          throw new Error('Error al crear el perfil del usuario');
        }

        const userProfile = await loadUserProfile(data.user);
        
        if (!userProfile) {
          throw new Error('No se pudo cargar el perfil del usuario después de crearlo');
        }
        
        toast({
          title: '¡Cuenta creada!',
          description: 'Por favor verifica tu correo electrónico para activar tu cuenta.'
        });
        
        return userProfile;
      }
    } catch (error) {
      console.error('Signup error:', error);
      throw error instanceof Error ? error : new Error('Error desconocido al crear la cuenta');
    }
  }, [loadUserProfile]);

  // Logout user
  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signOut();
      
      if (error) throw error;
      
      setUser(null);
      setSession(null);
      
      toast({
        title: 'Sesión cerrada',
        description: 'Has cerrado sesión correctamente.'
      });
    } catch (error) {
      console.error('Error logging out:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cerrar la sesión. Por favor, inténtalo de nuevo.',
        variant: 'destructive'
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update user profile
  const updateProfile = useCallback(async (profile: Partial<Profile>) => {
    if (!user) {
      throw new Error('No hay un usuario autenticado para actualizar');
    }
    
    try {
      console.log('[Auth] Updating profile for user:', user.id);
      const { error } = await supabase
        .from('profiles')
        .update({
          ...profile,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('[Auth] Error updating profile:', error);
        throw new Error('Error al actualizar el perfil: ' + error.message);
      }
      
      // Refresh user data
      console.log('[Auth] Profile updated, refreshing user data...');
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('[Auth] Error getting updated user:', userError);
        throw new Error('No se pudo obtener la información actualizada del usuario');
      }
      
      if (!authUser) {
        throw new Error('No se encontró el usuario autenticado');
      }
      
      return await loadUserProfile(authUser);
    } catch (error) {
      console.error('[Auth] Error in updateProfile:', error);
      throw error instanceof Error ? error : new Error('Error desconocido al actualizar el perfil');
    }
  }, [user, loadUserProfile]);

  // Refresh user data
  const refreshUser = useCallback(async (): Promise<User> => {
    if (!user) {
      throw new Error('No hay un usuario autenticado para actualizar');
    }
    
    try {
      const { data: { user: authUser }, error } = await supabase.auth.getUser();
      if (error) throw error;
      
      if (!authUser) {
        throw new Error('No se pudo obtener la información del usuario autenticado');
      }
      
      const updatedProfile = await loadUserProfile(authUser);
      
      if (!updatedProfile) {
        throw new Error('No se pudo cargar el perfil actualizado del usuario');
      }
      
      return updatedProfile;
    } catch (error) {
      console.error('Error refreshing user:', error);
      throw error instanceof Error ? error : new Error('Error desconocido al actualizar el usuario');
    }
  }, [user, loadUserProfile]);

  // Set up auth state listener
  useEffect(() => {
    console.log('[Auth] Setting up auth state listener');
    
    // Initial check
    checkUser().catch(error => {
      console.error('[Auth] Error in initial checkUser:', error);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`[Auth] Auth state changed: ${event}`, { hasSession: !!session });
        
        try {
          setSession(session);
          
          if (session?.user) {
            console.log('[Auth] User authenticated, loading profile...');
            await loadUserProfile(session.user);
          } else {
            console.log('[Auth] No user in session, setting user to null');
            setUser(null);
          }
        } catch (error) {
          console.error('[Auth] Error in auth state change handler:', error);
          setUser(null);
        }
      }
    );

    return () => {
      console.log('[Auth] Cleaning up auth state listener');
      subscription?.unsubscribe();
    };
  }, [checkUser, loadUserProfile]);

  const value = {
    user,
    isLoading,
    login,
    signup,
    logout: async () => {
      await logout();
    },
    updateProfile,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

