'use client';

import { createContext, useCallback, useMemo } from 'react';
import type { Session, User } from '@supabase/supabase-js';
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

export interface Profile {
  id?: string;
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
  education: any | null; // JSONB field
  bar_number: string | null;
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
      setLoadingState(true);
      
      // Get the supabase client
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session found');
      }
      
      // Only include fields that have changed
      const changedFields: Record<string, any> = {};
      const fieldsToCheck = [
        'first_name', 'last_name', 'bio', 'phone', 'location', 'website',
        'specialties', 'languages', 'education', 'zoom_link', 
        'bar_association_number', 'avatar_url', 'hourly_rate_clp',
        'experience_years', 'profile_setup_completed'
      ];

      // Handle specialties (convert from string to array if needed)
      if ('specialization' in profile || 'specialties' in profile) {
        changedFields.specialties = Array.isArray(profile.specialties)
          ? profile.specialties
          : (profile.specialization || '').split(',').map((s: string) => s.trim()).filter(Boolean);
      }

      // Handle other fields
      fieldsToCheck.forEach(field => {
        if (field in profile) {
          if (field === 'bar_association_number') {
            changedFields.bar_number = profile[field] || null;
          } else if (field === 'hourly_rate') {
            changedFields.hourly_rate_clp = profile[field] || 0;
          } else if (field === 'languages' && !Array.isArray(profile[field])) {
            changedFields[field] = [];
          } else if (field === 'profile_setup_completed') {
            changedFields[field] = Boolean(profile[field]);
          } else if (field !== 'specialties') {  // Skip specialties as it's already handled
            changedFields[field] = profile[field as keyof Profile] ?? null;
          }
        }
      });

      // Add updated_at timestamp
      changedFields.updated_at = new Date().toISOString();

      // First update or create the profile in the profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .upsert(
          {
            user_id: user.id,
            ...changedFields
          },
          { onConflict: 'user_id' }
        )
        .select()
        .single();

      if (profileError) {
        console.error('Error upserting profile:', profileError);
        throw profileError;
      }

      // Then update the user's metadata in auth.users
      const { data: authUpdate, error: authUpdateError } = await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          ...changedFields
        }
      });

      if (authUpdateError) throw authUpdateError;
      
      // Refresh the auth state to get the latest user data
      await checkSession();
      
      // Return the updated user data
      return authUpdate.user;
    } catch (error) {
      console.error('Error updating profile:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An error occurred while updating your profile';
      
      const formattedError = new Error(errorMessage);
      setErrorState(formattedError);
      throw formattedError;
    } finally {
      setLoadingState(false);
    }
  }, [user, checkSession, setErrorState, setLoadingState]);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      user,
      session,
      isLoading,
      error,
      isAuthenticated,
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
      updateProfile,
      confirmEmail,
      checkSession: async () => checkSession(),
      refreshAuth: async () => {
        await refreshAuth();
      },
    }),
    [
      user,
      session,
      isLoading,
      error,
      isAuthenticated,
      setLoadingState,
      setErrorState,
      login,
      signup,
      logout,
      updateProfile,
      confirmEmail,
      checkSession,
      refreshAuth,
    ]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}
