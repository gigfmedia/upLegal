'use client';

import { createContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session, User } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';

export type UserRole = 'client' | 'lawyer';

export interface UserData {
  firstName: string;
  lastName: string;
  role: UserRole;
}

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  error: Error | null;
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
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Basic validation
      if (!email || !password) {
        const error = new Error('Por favor ingresa tu correo y contraseña');
        setError(error);
        return { user: null, error };
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      
      if (error) {
        console.error('Supabase auth error:', error);
        
        // Map Supabase auth errors to more user-friendly messages
        let errorMessage = 'Error al iniciar sesión';
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Correo o contraseña incorrectos';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Por favor verifica tu correo electrónico antes de iniciar sesión';
        } else if (error.message.includes('Too many requests')) {
          errorMessage = 'Demasiados intentos. Por favor intente más tarde';
        }
        
        const formattedError = new Error(errorMessage);
        setError(formattedError);
        return { user: null, error: formattedError };
      }
      
      if (!data.session || !data.user) {
        const error = new Error('No se pudo iniciar sesión. Por favor intente de nuevo.');
        setError(error);
        return { user: null, error };
      }
      
      setUser(data.user);
      setSession(data.session);
      
      // Clear any previous errors on successful login
      setError(null);
      
      return { user: data.user, error: null };
    } catch (error) {
      console.error('Unexpected error during login:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Ocurrió un error inesperado al iniciar sesión';
      
      const formattedError = new Error(errorMessage);
      setError(formattedError);
      return { user: null, error: formattedError };
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email: string, password: string, userData: UserData) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Basic validation
      if (!email || !password) {
        const error = new Error('Por favor ingresa un correo y contraseña válidos');
        setError(error);
        return { user: null, error };
      }
      
      if (!userData.firstName?.trim() || !userData.lastName?.trim()) {
        const error = new Error('Por favor ingresa tu nombre completo');
        setError(error);
        return { user: null, error };
      }
      
      if (password.length < 6) {
        const error = new Error('La contraseña debe tener al menos 6 caracteres');
        setError(error);
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
        
        let errorMessage = 'Error al crear la cuenta';
        if (signUpError.message.includes('already registered')) {
          errorMessage = 'Este correo ya está registrado. ¿Olvidaste tu contraseña?';
        } else if (signUpError.message.includes('password')) {
          errorMessage = 'La contraseña no cumple con los requisitos mínimos';
        } else if (signUpError.message.includes('email')) {
          errorMessage = 'Por favor ingresa un correo electrónico válido';
        }
        
        const formattedError = new Error(errorMessage);
        setError(formattedError);
        return { user: null, error: formattedError };
      }
      
      if (!data.user) {
        const error = new Error('No se pudo crear la cuenta. Por favor intente de nuevo.');
        setError(error);
        return { user: null, error };
      }
      
      // Create user profile in the database
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            user_id: data.user.id,
            email: data.user.email,
            first_name: userData.firstName.trim(),
            last_name: userData.lastName.trim(),
            display_name: `${userData.firstName} ${userData.lastName}`.trim(),
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
            // Add any other required fields with default values
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
      }

      // Update local state
      setUser(data.user);
      setSession(data.session);
      
      // Clear any previous errors on successful signup
      setError(null);
      
      return { 
        user: data.user, 
        error: null,
        // Add additional metadata if needed
        requiresEmailConfirmation: !data.session
      };
    } catch (error) {
      console.error('Unexpected error during signup:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Ocurrió un error inesperado al crear la cuenta';
      
      const formattedError = new Error(errorMessage);
      setError(formattedError);
      return { user: null, error: formattedError };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (options: { redirect?: string } = {}) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Clear any existing session data first
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Supabase sign out error:', error);
        throw new Error('Error al cerrar la sesión. Por favor intente de nuevo.');
      }
      
      // Clear local state
      setUser(null);
      setSession(null);
      
      // Clear any cached data or local storage if needed
      window.localStorage.removeItem('supabase.auth.token');
      
      // Handle redirection if needed
      if (options.redirect && typeof window !== 'undefined') {
        window.location.href = options.redirect;
      }
      
      return { success: true, error: null };
    } catch (error) {
      console.error('Error during logout:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Ocurrió un error inesperado al cerrar la sesión';
      
      const formattedError = new Error(errorMessage);
      setError(formattedError);
      return { success: false, error: formattedError };
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
      })
      .catch((error) => {
        setError(error);
      })
      .finally(() => {
        setIsLoading(false);
      });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const value = {
    user,
    session,
    isLoading,
    error,
    setUser,
    setSession,
    setIsLoading,
    setError,
    login,
    signup,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
