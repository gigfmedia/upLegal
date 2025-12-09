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
  zoom_link: string | null;
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
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            first_name: userData.firstName.trim(),
            last_name: userData.lastName.trim(),
            role: userData.role,
            email_redirect_to: `${window.location.origin}/auth/callback`,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpError) {
        console.error('Supabase signup error:', signUpError);
        
        let errorMessage = 'Error creating account';
        if (signUpError.message.includes('already registered')) {
          errorMessage = 'This email is already registered. Did you forget your password?';
        } else if (signUpError.message.includes('password')) {
          errorMessage = 'Password does not meet the minimum requirements';
        } else if (signUpError.message.includes('email')) {
          errorMessage = 'Please enter a valid email address';
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
      
      // Create user profile in the database
      if (data.user) {
        try {
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: data.user.id,
              user_id: data.user.id,
              email: data.user.email,
              first_name: userData.firstName.trim(),
              last_name: userData.lastName.trim(),
              display_name: `${userData.firstName.trim()} ${userData.lastName.trim()}`.trim(),
              profile_setup_completed: userData.role === 'lawyer' ? false : true,
              updated_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              role: userData.role,
              // Include other required fields with default values
              bio: '',
              avatar_url: '',
              phone: '',
              website: '',
              location: '',
              specialties: [],
              languages: [],
              verified: false,
              response_time: '24h',
              satisfaction_rate: 0,
              zoom_link: '',
              profile_visible: true,
              show_online_status: true,
              // Asegurarse de que el RUT se guarde correctamente
              rut: userData.rut || null,
              pjud_verified: false,
              bar_association_number: null,
              experience_years: null,
              education: null,
              university: null,
              settings: {},
              notifications: { email: true, push: true },
              preferences: { theme: 'light', language: 'es' },
              metadata: { 
                signup_method: 'email', 
                signup_date: new Date().toISOString(),
                first_name: userData.firstName.trim(),
                last_name: userData.lastName.trim()
              }
            });

          if (profileError) {
            console.error('Error creating profile:', profileError);
            // Don't fail the entire signup if profile creation fails
            // The user can update their profile later
          }
        } catch (profileError) {
          console.error('Unexpected error creating profile:', profileError);
          // Continue with signup even if profile creation fails
        }
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
    if (!user) {
      throw new Error('No user is currently signed in');
    }

    try {
      
      // Process the input profile data to clean/format values
      // Only process fields that are actually present in the input
      const updates: any = {
        updated_at: new Date().toISOString()
      };

      // Helper to safely trim strings
      const safeTrim = (val: any) => (typeof val === 'string' ? val.trim() : val);

      if ('first_name' in profile) updates.first_name = safeTrim(profile.first_name) || null;
      if ('last_name' in profile) updates.last_name = safeTrim(profile.last_name) || null;
      if ('display_name' in profile) updates.display_name = safeTrim(profile.display_name) || null;
      if ('bio' in profile) updates.bio = safeTrim(profile.bio) || null;
      if ('phone' in profile) updates.phone = safeTrim(profile.phone) || null;
      if ('location' in profile) updates.location = safeTrim(profile.location) || null;
      if ('website' in profile) updates.website = safeTrim(profile.website) || null;
      if ('education' in profile) updates.education = safeTrim(profile.education) || null;
      if ('university' in profile) updates.university = safeTrim(profile.university) || null;
      if ('bar_association_number' in profile) updates.bar_association_number = safeTrim(profile.bar_association_number) || null;
      if ('rut' in profile) updates.rut = safeTrim(profile.rut) || null;
      if ('zoom_link' in profile) updates.zoom_link = safeTrim(profile.zoom_link) || null;
      if ('avatar_url' in profile) updates.avatar_url = safeTrim(profile.avatar_url) || null;
      if ('pjud_verified' in profile) updates.pjud_verified = Boolean(profile.pjud_verified);
      
      // Arrays
      if ('specialties' in profile && Array.isArray(profile.specialties)) {
        updates.specialties = profile.specialties.map(s => String(s).trim()).filter(s => s !== '');
      }
      if ('languages' in profile && Array.isArray(profile.languages)) {
        updates.languages = profile.languages.map(l => String(l).trim()).filter(l => l !== '');
      }

      // Numbers / Complex fields
      if ('experience_years' in profile) {
        updates.experience_years = profile.experience_years !== undefined 
          ? (typeof profile.experience_years === 'string' 
              ? parseInt(profile.experience_years, 10) 
              : profile.experience_years)
          : null;
      }

      if ('study_start_year' in profile) {
        let val = profile.study_start_year;
        if (val !== undefined && val !== null && val !== '') {
          const num = typeof val === 'string' ? parseInt(val, 10) : Number(val);
          updates.study_start_year = isNaN(num) ? null : num;
        } else {
          updates.study_start_year = null;
        }
      }

      if ('study_end_year' in profile) {
        let val = profile.study_end_year;
        if (val !== undefined && val !== null && val !== '') {
          const num = typeof val === 'string' ? parseInt(val, 10) : Number(val);
          updates.study_end_year = isNaN(num) ? null : num;
        } else {
          updates.study_end_year = null;
        }
      }

      // Process hourly rate - ensure it's a number or null
      const processHourlyRate = (rate: any): number | null => {
        if (rate === null || rate === undefined || rate === '') return null;
        try {
          if (typeof rate === 'number') return rate;
          let cleanRate = String(rate)
            .replace(/\./g, '')
            .replace(',', '.')
            .replace(/[^0-9.]/g, '');
          const num = Number(cleanRate);
          if (isNaN(num)) return null;
          if (Number.isInteger(num)) return num;
          return Math.round((num + Number.EPSILON) * 100) / 100;
        } catch (error) {
          console.error('Error processing hourly rate:', error);
          return null;
        }
      };

      if ('hourly_rate_clp' in profile) {
        updates.hourly_rate_clp = processHourlyRate(profile.hourly_rate_clp);
      }

      // Process certifications
      const processCertifications = (certs: any): string | null => {
        if (certs === null || certs === undefined || certs === '') return null;
        try {
          if (Array.isArray(certs)) {
            return certs.map(c => String(c).trim()).filter(c => c !== '').join('\n') || null;
          } else if (typeof certs === 'string') {
            return certs.split('\n').map(line => line.trim()).filter(line => line !== '').join('\n') || null;
          } else if (typeof certs === 'object' && certs !== null) {
            return Object.values(certs).filter(v => v !== null && v !== undefined).map(v => String(v).trim()).filter(v => v !== '').join('\n') || null;
          }
          return String(certs).trim() || null;
        } catch (error) {
          console.error('Error processing certifications:', error);
          return null;
        }
      };

      if ('certifications' in profile) {
        updates.certifications = processCertifications(profile.certifications);
      }

      // Always set profile_setup_completed if we are updating
      updates.profile_setup_completed = true;

      try {
        // Try to update existing profile
        const { data: updateResult, error: updateError } = await supabase
          .from('profiles')
          .update(updates)
          .eq('user_id', user.id)
          .select(); // Select to see if row existed

        if (updateError) throw updateError;

        // If no row was updated, we need to insert
        if (!updateResult || updateResult.length === 0) {
          const insertData = {
            ...updates,
            user_id: user.id,
            created_at: new Date().toISOString(),
            // Set defaults for required fields if they are missing in updates
            first_name: updates.first_name || null,
            last_name: updates.last_name || null,
            // Ensure other required fields have defaults if not provided in `updates`
            display_name: updates.display_name || null,
            email: user.email, // Email should always be present from user object
            role: updates.role || 'client', // Default role if not provided
            bio: updates.bio || '',
            avatar_url: updates.avatar_url || '',
            phone: updates.phone || '',
            website: updates.website || '',
            location: updates.location || '',
            specialties: updates.specialties || [],
            languages: updates.languages || [],
            verified: updates.verified || false,
            response_time: updates.response_time || '24h',
            satisfaction_rate: updates.satisfaction_rate || 0,
            zoom_link: updates.zoom_link || '',
            profile_visible: updates.profile_visible || true,
            show_online_status: updates.show_online_status || true,
            settings: updates.settings || {},
            notifications: updates.notifications || { email: true, push: true },
            preferences: updates.preferences || { theme: 'light', language: 'es' },
            metadata: updates.metadata || { signup_method: 'email', signup_date: new Date().toISOString() }
          };
          
          const { error: insertError } = await supabase
            .from('profiles')
            .insert(insertData);
            
          if (insertError) throw insertError;
        }

        // Update auth metadata (merges with existing)
        const { data: updatedUser, error: authError } = await supabase.auth.updateUser({
          data: updates
        });

        if (authError) throw authError;
        if (!updatedUser.user) throw new Error('No se pudo actualizar el perfil');

        // Manually update local state
        setUser(updatedUser.user);
        
        return updatedUser.user;

      } catch (error) {
        console.error('Exception during profile update:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in updateProfile:', error);
      throw error;
    }
  }, [user, setUser]);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo ( () => ({
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
