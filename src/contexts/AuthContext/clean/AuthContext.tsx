'use client';

import { createContext, useCallback, useMemo, useEffect } from 'react';
import type { Session, User, SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { sendWelcomeEmail } from '@/lib/emails/welcomeEmail';
import { clearAuthData } from '@/lib/authUtils';
import { refreshSession } from '@/lib/sessionUtils';
import { handleAuthError } from '@/lib/authErrorHandler';
import { useAuth } from '@/hooks/useAuthState';
import { supabase } from '@/lib/supabaseClient';

export type UserRole = 'client' | 'lawyer';

export interface UserData {
  firstName: string;
  lastName: string;
  role: UserRole;
  rut?: string; // Optional RUT for lawyer registration
  pjudVerified?: boolean; // Optional verification status
}

export // Interface for database profile with all fields
interface DatabaseProfile extends Omit<Profile, 'id' | 'user_id' | 'created_at' | 'updated_at'> {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface Profile {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  bio: string | null;
  phone: string | null;
  location: string | null;
  website: string | null;
  avatar_url: string | null;
  specialties: string[];
  hourly_rate_clp: number | null;
  response_time?: string;
  satisfaction_rate?: number;
  experience_years: number | null;
  education: string | null;
  university: string | null;
  study_start_year?: number | string | null;
  study_end_year?: number | string | null;
  certifications?: string | null;
  availability?: string | null;
  bar_association_number: string | null;
  rut: string | null;
  pjud_verified: boolean;
  languages: string[];
  verified?: boolean;
  available_for_hire?: boolean;
  created_at?: string;
  updated_at?: string;
  profile_setup_completed?: boolean;
  // For backward compatibility (will be converted to specialties array)
  specialization?: string;
}

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
  supabase: SupabaseClient;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: Error | null) => void;
  login: (email: string, password: string) => Promise<{ user: User | null; error: Error | null }>;
  signup: (email: string, password: string, userData: UserData) => Promise<{ 
    user: User | null; 
    error: Error | null;
    requiresEmailConfirmation?: boolean;
  }>;
  logout: (options?: { redirect?: string }) => Promise<{ success: boolean; error: Error | null }>;
  updateProfile: (profile: Partial<Profile>) => Promise<User | null>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const {
    user,
    session,
    isLoading,
    error,
    checkSession,
    refreshAuth,
    isAuthenticated,
    setUser,
  } = useAuth();
  
  // Set error helper function
  const setErrorState = useCallback((error: Error | null) => {
    handleAuthError(error, { showToast: false });
  }, []);
  
  // Set loading state helper function
  const setLoadingState = useCallback((loading: boolean) => {
    // Loading state is managed by useAuth hook
    if (loading !== isLoading) {
      // If we need to manually set loading state, we can add logic here
    }
  }, [isLoading]);

  // Login function
  const login = useCallback(
    async (email: string, password: string) => {
      try {
        setLoadingState(true);
        setErrorState(null);
        
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        
        if (error) throw error;
        
        // The useAuth hook will handle updating the user and session
        // We just need to check if the session is valid
        const isValid = await checkSession();
        
        if (!isValid) {
          throw new Error('Failed to establish a valid session');
        }
        
        return { user: data.user, error: null };
      } catch (error) {
        console.error('Login error:', error);
        const errorMessage = error instanceof Error ? error.message : 'An error occurred during login';
        const formattedError = new Error(errorMessage);
        setErrorState(formattedError);
        return { user: null, error: formattedError };
      } finally {
        setLoadingState(false);
      }
    },
    [checkSession, setErrorState, setLoadingState]
  );

  // Signup function
  const signup = useCallback(async (email: string, password: string, userData: UserData) => {
    try {
      setLoadingState(true);
      setErrorState(null);
      
      // Basic validation
      if (!email || !password) {
        const error = new Error('Email and password are required');
        setErrorState(error);
        return { user: null, error };
      }
      
      if (password.length < 6) {
        const error = new Error('Password must be at least 6 characters');
        setErrorState(error);
        return { user: null, error };
      }

      // Sign up the user with Supabase Auth
      const normalizedEmail = email.trim().toLowerCase();
      const firstName = userData.firstName.trim();
      const lastName = userData.lastName.trim();
      const displayName = [firstName, lastName].filter(Boolean).join(' ') || normalizedEmail.split('@')[0];

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            name: displayName,
            first_name: firstName,
            last_name: lastName,
            role: userData.role,
            rut: userData.rut || null,
            pjud_verified: userData.pjudVerified || false,
            email_redirect_to: `${window.location.origin}/auth/callback`,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpError) {
        console.error('Supabase signup error:', signUpError);
        let errorMessage = 'Error creating account';
        
        if (signUpError.message.includes('already registered')) {
          errorMessage = 'Este correo ya está registrado. ¿Olvidaste tu contraseña?';
        } else if (signUpError.message.includes('password')) {
          errorMessage = 'La contraseña no cumple con los requisitos mínimos';
        } else if (signUpError.message.toLowerCase().includes('sending confirmation email')) {
          errorMessage = 'Error al enviar el correo de confirmación. Posible problema temporal del servicio.';
        } else if (signUpError.message.includes('email')) {
          errorMessage = 'Por favor ingresa un correo válido';
        }
        
        const formattedError = new Error(errorMessage);
        setErrorState(formattedError);
        return { user: null, error: formattedError };
      }
      
      if (!data.user) {
        const error = new Error('Failed to create account. Please try again.');
        setErrorState(error);
        return { user: null, error };
      }

      // Create or update profile with the user's information
      const profileData = {
        id: data.user.id,
        user_id: data.user.id,
        email: normalizedEmail,
        first_name: firstName,
        last_name: lastName,
        display_name: displayName,
        role: userData.role,
        rut: userData.rut || null,
        pjud_verified: userData.pjudVerified || false,
        has_used_free_consultation: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      try {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert(profileData, { onConflict: 'id' });

        if (profileError) {
          console.error('Error creating/updating profile:', profileError);
          // Don't fail the signup if profile update fails, just log it
        }
      } catch (profileError) {
        console.error('Unexpected error during profile update:', profileError);
        // Continue with signup even if profile update fails
      }

      // GA4 event
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'sign_up', {
          method: 'modal',
          role: userData.role,
          status: 'pending_email_confirmation'
        });
      }
      
      // The useAuth hook will handle updating the user and session
      await checkSession();
      
      return { 
        user: data.user, 
        error: null,
        requiresEmailConfirmation: !data.session
      };
    } catch (error) {
      console.error('Unexpected error during signup:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred while creating your account';
      
      const formattedError = new Error(errorMessage);
      setErrorState(formattedError);
      return { user: null, error: formattedError };
    } finally {
      setLoadingState(false);
    }
  }, [checkSession, setErrorState, setLoadingState]);

  const logout = useCallback(async (options: { redirect?: string } = {}) => {
    try {
      setLoadingState(true);
      setErrorState(null);
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut().catch(error => {
        console.warn('Supabase sign out had issues, but continuing with cleanup:', error);
        return { error };
      });
      
      // Clear all auth data
      await clearAuthData();
      
      // The useAuth hook will handle updating the user and session state
      
      // Handle redirect if needed
      if (options.redirect && typeof window !== 'undefined') {
        // Add a small delay to ensure all cleanup is complete
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Use window.location for redirects instead of useNavigate
        // to avoid router context issues
        const timestamp = new Date().getTime();
        const separator = options.redirect.includes('?') ? '&' : '?';
        window.location.href = `${options.redirect}${separator}t=${timestamp}`;
        
        // Prevent further execution
        await new Promise(() => {});
      }
      
      return { success: true, error: null };
    } catch (error) {
      console.error('Error during logout:', error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred while signing out';
      
      const formattedError = new Error(errorMessage);
      setErrorState(formattedError);
      return { success: false, error: formattedError };
    } finally {
      setLoadingState(false);
    }
  }, [setErrorState, setLoadingState]);

  const confirmEmail = useCallback(async (token: string, email: string): Promise<boolean> => {
    try {
      setLoadingState(true);
      setErrorState(null);
      
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });

      if (error) throw error;

      // Update user's email_confirmed_at in the profiles table
      if (data.user?.id) {
        await supabase
          .from('profiles')
          .update({ 
            email_confirmed_at: new Date().toISOString(),
            updated_at: new Date().toISOString() 
          })
          .eq('user_id', data.user.id);
      }

      // Refresh the auth state to get the latest session
      await checkSession();
      
      return true;
    } catch (error) {
      console.error('Error confirming email:', error);
      setErrorState(error as Error);
      return false;
    } finally {
      setLoadingState(false);
    }
  }, [checkSession, setErrorState, setLoadingState]);

  // Set up profile deletion detection
  useEffect(() => {
    if (!user?.id) return;

    // Set up a channel to listen for profile deletions
    const channel = supabase
      .channel('profile_deletions')
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        async () => {
          console.log('Profile deleted, signing out...');
          // Use the existing logout function
          await logout();
          
          // Show a message to the user
          if (typeof window !== 'undefined') {
            alert('Su perfil ha sido eliminado. Ha sido desconectado del sistema.');
          }
        }
      )
      .subscribe();

    // Clean up the subscription when the component unmounts or user changes
    return () => {
      channel.unsubscribe();
    };
  }, [user?.id, logout]);

  const updateProfile = useCallback(async (profile: Partial<Profile>): Promise<User | null> => {
    // First, ensure we have a valid user session
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (!currentSession?.user?.id) {
      console.error('No active user session found');
      throw new Error('No active user session found. Please sign in again.');
    }

    const userId = currentSession.user.id;
    if (!userId) {
      console.error('No user ID found in session');
      throw new Error('No user is currently signed in');
    }

    try {
      // Helper functions
      const safeTrim = (val: string | null | undefined): string | undefined => 
        typeof val === 'string' ? val.trim() : undefined;
        
      const safeNumber = (val: any): number | null => {
        if (val === null || val === undefined || val === '') return null;
        const num = typeof val === 'string' ? 
          parseFloat(val.replace(/\./g, '').replace(',', '.')) : 
          Number(val);
        return isNaN(num) ? null : num;
      };

      // Process certifications
      const processCertifications = (certs: any): string | null => {
        try {
          if (Array.isArray(certs)) {
            return certs.map(c => String(c).trim()).filter(c => c !== '').join('\n') || null;
          } else if (typeof certs === 'string') {
            return certs.split('\n').map(line => line.trim()).filter(line => line !== '').join('\n') || null;
          } else if (certs && typeof certs === 'object') {
            return Object.values(certs)
              .filter(v => v !== null && v !== undefined)
              .map(v => String(v).trim())
              .filter(v => v !== '')
              .join('\n') || null;
          }
          return String(certs).trim() || null;
        } catch (error) {
          console.error('Error processing certifications:', error);
          return null;
        }
      };

      // Process profile data
      const updates: Partial<Profile> = {
        updated_at: new Date().toISOString(),
        user_id: userId,  // Use the userId from session
        // Basic fields
        first_name: 'first_name' in profile ? safeTrim(profile.first_name) : undefined,
        last_name: 'last_name' in profile ? safeTrim(profile.last_name) : undefined,
        display_name: 'display_name' in profile ? safeTrim(profile.display_name) : undefined,
        bio: 'bio' in profile ? safeTrim(profile.bio) : undefined,
        phone: 'phone' in profile ? safeTrim(profile.phone) : undefined,
        location: 'location' in profile ? safeTrim(profile.location) : undefined,
        website: 'website' in profile ? safeTrim(profile.website) : undefined,
        education: 'education' in profile ? safeTrim(profile.education) : undefined,
        university: 'university' in profile ? safeTrim(profile.university) : undefined,
        bar_association_number: 'bar_association_number' in profile ? safeTrim(profile.bar_association_number) : undefined,
        rut: 'rut' in profile ? safeTrim(profile.rut) : undefined,
        avatar_url: 'avatar_url' in profile ? safeTrim(profile.avatar_url) : undefined,
        // Arrays
        specialties: 'specialties' in profile && Array.isArray(profile.specialties) 
          ? profile.specialties.map(s => String(s).trim()).filter(s => s !== '')
          : undefined,
        languages: 'languages' in profile && Array.isArray(profile.languages)
          ? profile.languages.map(l => String(l).trim()).filter(l => l !== '')
          : undefined,
        // Numbers
        experience_years: 'experience_years' in profile ? safeNumber(profile.experience_years) : undefined,
        study_start_year: 'study_start_year' in profile ? safeNumber(profile.study_start_year) : undefined,
        study_end_year: 'study_end_year' in profile ? safeNumber(profile.study_end_year) : undefined,
        // Process hourly rate
        hourly_rate_clp: 'hourly_rate_clp' in profile 
          ? safeNumber(profile.hourly_rate_clp)
          : undefined,
        // Booleans
        pjud_verified: 'pjud_verified' in profile ? Boolean(profile.pjud_verified) : undefined,
        available_for_hire: 'available_for_hire' in profile ? Boolean(profile.available_for_hire) : undefined,
        // Other fields
        certifications: 'certifications' in profile ? processCertifications(profile.certifications) : undefined,
        availability: 'availability' in profile ? profile.availability : undefined,
        response_time: 'response_time' in profile ? profile.response_time : undefined,
        satisfaction_rate: 'satisfaction_rate' in profile ? safeNumber(profile.satisfaction_rate) : undefined,
        specialization: 'specialization' in profile ? profile.specialization : undefined,
        // Always mark as completed when updating
        profile_setup_completed: true
      };

      // Remove undefined values
      Object.keys(updates).forEach(key => {
        if (updates[key as keyof Profile] === undefined) {
          delete updates[key as keyof Profile];
        }
      });

      // Update the profile in Supabase
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,  // Use userId from session
          ...updates
        }, {
          onConflict: 'id'
        })
        .select()
        .single();

      if (updateError) {
        console.error('Error updating profile:', updateError);
        throw updateError;
      }

      if (!updatedProfile) {
        throw new Error('No se pudo actualizar el perfil');
      }

      // Get the latest user data to ensure we have the most up-to-date information
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        throw new Error('No se pudo obtener la información actualizada del usuario');
      }

      // Update local user state with the updated profile data
      setUser(prevUser => {
        if (!prevUser) return null;
        return {
          ...prevUser,
          // Only include fields that exist in the User type
          ...(updates.first_name !== undefined && { first_name: updates.first_name }),
          ...(updates.last_name !== undefined && { last_name: updates.last_name }),
          ...(updates.display_name !== undefined && { display_name: updates.display_name }),
          ...(updates.avatar_url !== undefined && { avatar_url: updates.avatar_url })
        };
      });

      return updatedProfile as unknown as User;
    } catch (error) {
      console.error('Error in updateProfile:', error);
      throw error;
    }
  }, []);

  // Add fetchProfile function to handle profile fetching with proper error handling
  const fetchProfile = useCallback(async (userId: string | undefined) => {
    console.log('fetchProfile called with userId:', userId);
    
    if (!userId) {
      console.error('No user ID provided to fetchProfile. Stack trace:', new Error().stack);
      return null;
    }

    try {
      console.log('Fetching profile for user ID:', userId);
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('first_name, profile_setup_completed, role, user_id, avatar_url')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          console.log('No profile found for user ID:', userId);
          return null;
        }
        console.error('Error fetching profile:', error);
        throw error;
      }

      console.log('Successfully fetched profile:', profile);
      return profile;
    } catch (error) {
      console.error('Error in fetchProfile:', {
        error,
        message: error.message,
        code: error.code,
        userId
      });
      
      if (error.message.includes('JWT') || 
          error.message.includes('invalid input syntax for type uuid') ||
          error.code === '22P02') {
        console.log('Auth error detected, signing out...');
        await supabase.auth.signOut();
        setUser(null);
      }
      return null;
    }
  }, [setUser]);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
      user,
      session,
      isLoading,
      error,
      isAuthenticated,
      supabase: getSupabaseClient(),
      setUser: () => {
        console.warn('setUser should not be called directly. Use login/signup methods instead.');
      },
      setSession: () => {
        console.warn('setSession should not be called directly. Use login/signup methods instead.');
      },
      setIsLoading: setLoadingState,
      setError: setErrorState,
      login,
      signup,
      logout,
      confirmEmail,
      checkSession,
      refreshAuth,
      updateProfile,
      fetchProfile,
    }),
    [
      user,
      session,
      isLoading,
      error,
      isAuthenticated,
      login,
      signup,
      logout,
      updateProfile,
      confirmEmail,
      checkSession,
      refreshAuth,
      fetchProfile,
      setLoadingState,
      setErrorState,
    ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
