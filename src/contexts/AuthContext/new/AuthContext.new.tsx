import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from "@/lib/supabaseClient";
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { toast } from "@/hooks/use-toast";

// Types
type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

type Availability = 'available' | 'unavailable' | 'away';
type VerificationStatus = 'pending' | 'approved' | 'rejected' | 'not_uploaded';

interface VerificationDocument {
  status: VerificationStatus;
  rejection_reason?: string;
  verified_at?: string;
}

interface BarVerification extends VerificationDocument {
  bar_number: string;
  state: string;
}

interface VisibilitySettings {
  profile_visible: boolean;
  show_online_status: boolean;
  allow_direct_messages: boolean;
}

interface VerificationDocuments {
  id_verification?: VerificationDocument;
  bar_verification?: BarVerification;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'client' | 'lawyer';
  hasUsedFreeConsultation: boolean;
  profile: Profile;
}

export interface Profile {
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
  availability: Availability | null;
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
  visibility_settings: VisibilitySettings;
  verification_documents: VerificationDocuments;
  created_at: string;
  updated_at: string | null;
  [key: string]: unknown; // Allow additional properties
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  error: Error | null;
  login: (email: string, password: string) => Promise<User>;
  signup: (email: string, password: string, name: string, role: 'client' | 'lawyer') => Promise<User>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<User>;
  refreshUser: () => Promise<User>;
}

// Create the auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to safely parse JSON fields
function safeJsonParse<T>(value: unknown, defaultValue: T): T {
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
}

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

    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', authUser.id)
        .single();

      if (profileError) throw profileError;
      if (!profile) throw new Error('Perfil no encontrado');

      // Parse JSON fields
      const education = safeJsonParse<Record<string, unknown>>(
        typeof profile.education === 'string' ? profile.education : JSON.stringify(profile.education || {}), 
        {}
      );
      
      const certifications = safeJsonParse<Record<string, unknown>>(
        typeof profile.certifications === 'string' ? profile.certifications : JSON.stringify(profile.certifications || {}), 
        {}
      );
      
      const visibilitySettings = safeJsonParse<VisibilitySettings>(
        typeof profile.visibility_settings === 'string' ? profile.visibility_settings : JSON.stringify(profile.visibility_settings || {}),
        {
          profile_visible: true,
          show_online_status: true,
          allow_direct_messages: true
        }
      );
      
      const verificationDocuments = safeJsonParse<VerificationDocuments>(
        typeof profile.verification_documents === 'string' ? profile.verification_documents : JSON.stringify(profile.verification_documents || {}),
        {
          id_verification: { status: 'not_uploaded' },
          bar_verification: { status: 'not_uploaded', bar_number: '', state: '' }
        }
      );

      // Process profile data with proper typing
      const processedProfile: Profile = {
        ...profile,
        role: (profile.role === 'lawyer' ? 'lawyer' : 'client') as 'lawyer' | 'client',
        specialties: Array.isArray(profile.specialties) ? profile.specialties : [],
        languages: Array.isArray(profile.languages) ? profile.languages : [],
        verified: Boolean(profile.verified),
        available_for_hire: Boolean(profile.available_for_hire),
        has_used_free_consultation: Boolean(profile.has_used_free_consultation),
        visibility_settings: visibilitySettings,
        verification_documents: verificationDocuments,
        education,
        certifications,
        rating: Number(profile.rating || 0),
        review_count: Number(profile.review_count || 0),
        experience_years: Number(profile.experience_years) || null,
        hourly_rate_clp: Number(profile.hourly_rate_clp) || null,
        satisfaction_rate: Number(profile.satisfaction_rate) || null,
        availability: profile.availability && ['available', 'unavailable', 'away'].includes(profile.availability as string)
          ? profile.availability as Availability 
          : null
      };

      const userData: User = {
        id: authUser.id,
        email: authUser.email || '',
        name: processedProfile.display_name || 
              (processedProfile.first_name ? 
                `${processedProfile.first_name} ${processedProfile.last_name || ''}`.trim() : 
                authUser.email?.split('@')[0] || 'Usuario'),
        role: processedProfile.role,
        hasUsedFreeConsultation: processedProfile.has_used_free_consultation,
        profile: processedProfile
      };

      setUser(userData);
      return userData;
    } catch (error) {
      console.error('Error loading profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al cargar el perfil';
      throw new Error(errorMessage);
    }
  }, []);

  // Rest of the implementation...
  // [Previous implementation of the rest of the AuthProvider]

  const contextValue = useMemo(() => ({
    user,
    session,
    isLoading,
    error,
    login: async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data.user) throw new Error('No se pudo iniciar sesión');
      return loadUserProfile(data.user);
    },
    signup: async (email: string, password: string, name: string, role: 'client' | 'lawyer') => {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      if (!data.user) throw new Error('No se pudo crear la cuenta');
      
      const [first_name, ...lastNameParts] = name.split(' ');
      const last_name = lastNameParts.join(' ');
      
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{ user_id: data.user.id, email, first_name, last_name, role }]);
        
      if (profileError) throw profileError;
      return loadUserProfile(data.user);
    },
    logout: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setSession(null);
    },
    updateProfile: async (updates: Partial<Profile>) => {
      if (!user) throw new Error('No hay usuario autenticado');
      
      // Handle JSON fields
      const updateData: Record<string, unknown> = { ...updates };
      
      if (updates.education) {
        updateData.education = JSON.stringify(updates.education);
      }
      
      if (updates.certifications) {
        updateData.certifications = JSON.stringify(updates.certifications);
      }
      
      if (updates.visibility_settings) {
        updateData.visibility_settings = JSON.stringify(updates.visibility_settings);
      }
      
      if (updates.verification_documents) {
        updateData.verification_documents = JSON.stringify(updates.verification_documents);
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', user.id)
        .select()
        .single();
        
      if (error) throw error;
      return loadUserProfile(user as unknown as SupabaseUser);
    },
    refreshUser: async () => {
      if (!user) throw new Error('No hay usuario autenticado');
      return loadUserProfile(user as unknown as SupabaseUser);
    }
  }), [user, session, isLoading, error, loadUserProfile]);

  // Check user session on mount
  useEffect(() => {
    const checkUser = async () => {
      try {
        setIsLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await loadUserProfile(session.user);
          setSession(session);
        }
      } catch (error) {
        console.error('Error checking session:', error);
        setError(error instanceof Error ? error : new Error('Error al verificar la sesión'));
      } finally {
        setIsLoading(false);
      }
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          try {
            await loadUserProfile(session.user);
            setSession(session);
          } catch (error) {
            console.error('Error on auth state change:', error);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setSession(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [loadUserProfile]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
