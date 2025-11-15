'use client';

import { createContext, useCallback, useMemo } from 'react';
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
              display_name: `${userData.firstName} ${userData.lastName}`.trim(),
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
              allow_direct_messages: true,
              settings: {},
              notifications: { email: true, push: true },
              preferences: { theme: 'light', language: 'es' },
              metadata: { signup_method: 'email', signup_date: new Date().toISOString() }
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

  const updateProfile = useCallback(async (profile: Partial<Profile>) => {
    if (!user) {
      throw new Error('No user is currently signed in');
    }

    try {
      
      // Get current user data
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const currentMetadata = currentUser?.user_metadata || {};
      // Prepare the update data with only the fields that exist in the database
      // Handle study years - ensure they are properly converted to numbers or null
      let studyStartYear = null;
      let studyEndYear = null;


      if (profile.study_start_year !== undefined && profile.study_start_year !== null && profile.study_start_year !== '') {
        studyStartYear = typeof profile.study_start_year === 'string' 
          ? parseInt(profile.study_start_year, 10) 
          : Number(profile.study_start_year);
        // Ensure it's a valid number
        studyStartYear = isNaN(studyStartYear) ? null : studyStartYear;
      } else {
        console.log('study_start_year is empty or null, setting to null');
      }
      
      if (profile.study_end_year !== undefined && profile.study_end_year !== null && profile.study_end_year !== '') {
        studyEndYear = typeof profile.study_end_year === 'string' 
          ? parseInt(profile.study_end_year, 10) 
          : Number(profile.study_end_year);
        // Ensure it's a valid number
        studyEndYear = isNaN(studyEndYear) ? null : studyEndYear;
      } else {
        console.log('study_end_year is empty or null, setting to null');
      }

      // Process hourly rate - ensure it's a number or null
      const processHourlyRate = (rate: any): number | null => {
        
        if (rate === null || rate === undefined || rate === '') {
          return null;
        }
        
        try {
          if (typeof rate === 'number') {
            return rate;
          }
          
          // Handle string input with thousand separators and decimal comma
          let cleanRate = String(rate)
            .replace(/\./g, '')  // Remove thousand separators
            .replace(',', '.')    // Convert decimal comma to dot
            .replace(/[^0-9.]/g, ''); // Remove any remaining non-numeric characters
          
          // Use Number() instead of parseFloat for more precise parsing
          const num = Number(cleanRate);
          
          if (isNaN(num)) {
            return null;
          }
          
          // For whole numbers, avoid decimal places
          if (Number.isInteger(num)) {
            return num;
          }
          
          // For decimal numbers, round to 2 decimal places to avoid floating point issues
          const rounded = Math.round((num + Number.EPSILON) * 100) / 100;
          return rounded;
        } catch (error) {
          console.error('Error processing hourly rate:', error);
          return null;
        }
      };

      // Process certifications - ensure it's a string with line breaks
      const processCertifications = (certs: any): string | null => {
        
        if (certs === null || certs === undefined || certs === '') {
          return undefined; // Return undefined to indicate no change
        }
        
        try {
          let result: string;
          
          if (Array.isArray(certs)) {
            result = certs
              .map(c => String(c).trim())
              .filter(c => c !== '')
              .join('\n');
          } else if (typeof certs === 'string') {
            result = certs
              .split('\n')
              .map(line => line.trim())
              .filter(line => line !== '')
              .join('\n');
          } else if (typeof certs === 'object' && certs !== null) {
            // Handle case where certs is an object
            result = Object.values(certs)
              .filter(v => v !== null && v !== undefined)
              .map(v => String(v).trim())
              .filter(v => v !== '')
              .join('\n');
          } else {
            result = String(certs || '').trim();
          }
          return result || null;
        } catch (error) {
          console.error('Error processing certifications:', error);
          return null;
        }
      };

      // Process hourly rate
      const hourlyRate = 'hourly_rate_clp' in profile 
        ? processHourlyRate(profile.hourly_rate_clp)
        : undefined;
        
      // Always process certifications to ensure proper formatting
      // But only include in update if explicitly provided
      const certifications = 'certifications' in profile
        ? processCertifications(profile.certifications)
        : undefined;
      
      const updateData: Omit<Profile, 'id' | 'user_id' | 'created_at'> & { updated_at: string } = {
        ...profile, // Spread all profile data first
        first_name: profile.first_name?.trim() || null,
        last_name: profile.last_name?.trim() || null,
        display_name: profile.display_name?.trim() || null,
        bio: profile.bio?.trim() || null,
        phone: profile.phone?.trim() || null,
        hourly_rate_clp: hourlyRate,
        certifications: certifications,
        location: profile.location?.trim() || null,
        website: profile.website?.trim() || null,
        specialties: Array.isArray(profile.specialties) 
          ? profile.specialties.map(s => String(s).trim()).filter(s => s !== '')
          : [],
        experience_years: profile.experience_years !== undefined 
          ? (typeof profile.experience_years === 'string' 
              ? parseInt(profile.experience_years, 10) 
              : profile.experience_years)
          : null,
        languages: Array.isArray(profile.languages) 
          ? profile.languages.map(l => String(l).trim()).filter(l => l !== '')
          : [],
        education: profile.education?.trim() || null,
        university: profile.university?.trim() || null,
        study_start_year: studyStartYear,
        study_end_year: studyEndYear,
        bar_association_number: profile.bar_association_number?.trim() || null,
        rut: profile.rut?.trim() || null,
        pjud_verified: Boolean(profile.pjud_verified),
        zoom_link: profile.zoom_link?.trim() || null,
        avatar_url: profile.avatar_url?.trim() || null,
        profile_setup_completed: true,
        updated_at: new Date().toISOString()
      };

      // Prepare the update payload for the database
      const updatePayload = {
        ...updateData,
        updated_at: new Date().toISOString()
      };

      try {
        // First, check if a profile exists for this user
        // First, get the current profile data to preserve existing fields
        const { data: currentProfile, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        // Merge existing profile data with the new updates
        const updateData = {
          ...currentProfile, // Preserve all existing fields
          ...updatePayload,  // Apply the new updates
          // Only update certifications if they are being explicitly set in the payload
          certifications: updatePayload.certifications !== undefined 
            ? updatePayload.certifications 
            : currentProfile?.certifications || null,
          // Asegurarse de que los campos numéricos no se sobrescriban con null si no se proporcionan
          hourly_rate_clp: updatePayload.hourly_rate_clp !== undefined
            ? updatePayload.hourly_rate_clp
            : currentProfile?.hourly_rate_clp || null,
          experience_years: updatePayload.experience_years !== undefined
            ? updatePayload.experience_years
            : currentProfile?.experience_years || null,
          user_id: user.id,  // Ensure user_id is always set
          updated_at: new Date().toISOString()
        };
        
        if (currentProfile) {
          // Profile exists, perform update
          const { data: updateResult, error: updateError } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('user_id', user.id);
            
          if (updateError) {
            console.error('Error updating profile:', updateError);
            throw updateError;
          }
        } else {
          // No profile exists, perform insert with default values
          const newProfileData = {
            ...updateData,
            created_at: new Date().toISOString(),
            // Ensure required fields have default values
            certifications: updateData.certifications || null,
            hourly_rate_clp: updateData.hourly_rate_clp || null,
            specialties: updateData.specialties || [],
            languages: updateData.languages || []
          };
          
          const { data: insertResult, error: insertError } = await supabase
            .from('profiles')
            .insert(newProfileData);
            
          if (insertError) {
            console.error('Error inserting profile:', insertError);
            throw insertError;
          }
          
        }
      } catch (error) {
        console.error('Exception during profile update:', error);
        throw error;
      }

      // Fetch the updated profile to verify the data
      const { data: updatedProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single<DatabaseProfile>();

      if (fetchError) {
        console.error('Error fetching updated profile:', fetchError);
      } else if (updatedProfile) {
      }

      // Then update the auth user metadata with the same data
      const userMetadata = {
        ...currentMetadata, // Keep existing metadata
        first_name: updateData.first_name,
        last_name: updateData.last_name,
        bio: updateData.bio,
        phone: updateData.phone,
        location: updateData.location,
        website: updateData.website,
        specialties: updateData.specialties,
        // Asegurarse de que los valores numéricos se guarden correctamente
        experience_years: updateData.experience_years !== undefined 
          ? updateData.experience_years 
          : currentMetadata?.experience_years || null,
        hourly_rate_clp: updateData.hourly_rate_clp !== undefined 
          ? updateData.hourly_rate_clp 
          : currentMetadata?.hourly_rate_clp || null,
        education: updateData.education,
        university: updateData.university,
        study_start_year: studyStartYear,
        study_end_year: studyEndYear,
        // Asegurarse de que las certificaciones no se sobrescriban con null
        certifications: updateData.certifications !== undefined 
          ? updateData.certifications 
          : currentMetadata?.certifications || null,
        bar_association_number: updateData.bar_association_number,
        availability: updateData.availability,
        zoom_link: updateData.zoom_link,
        languages: updateData.languages,
        profile_setup_completed: true
      };

      const { data: updatedUser, error: updateError } = await supabase.auth.updateUser({
        data: userMetadata
      });

      if (updateError) throw updateError;
      if (!updatedUser.user) throw new Error('No se pudo actualizar el perfil');

      // The useAuth hook will automatically update the user state
      // by listening to auth state changes
      
      return updatedUser.user;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }, [user]);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
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
    ]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
