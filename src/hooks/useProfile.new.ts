import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// Type guards for profile data
const isStringArray = (value: unknown): value is string[] => {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

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
  specialties: string[] | null;
  hourly_rate_clp: number | null;
  response_time: string | null;
  satisfaction_rate: number | null;
  languages: string[] | null;
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
      rejection_reason?: string | null;
      verified_at?: string | null;
    };
    bar_verification?: {
      status: 'pending' | 'approved' | 'rejected' | 'not_uploaded';
      bar_number: string;
      state: string;
      rejection_reason?: string | null;
      verified_at?: string | null;
    };
  } | null;
  created_at: string;
  updated_at: string | null;
}

export interface LawyerService {
  id?: string;
  lawyer_user_id: string;
  title: string;
  description: string;
  price_clp: number;
  delivery_time: string;
  features: string[];
  available: boolean;
}

// Helper function to safely parse JSON fields with runtime type checking
const safeJsonParse = <T>(
  value: unknown,
  defaultValue: T,
  errorContext?: string
): T => {
  if (value === null || value === undefined) {
    return defaultValue;
  }

  try {
    // If value is already of the expected type, return it
    if (typeof value === typeof defaultValue) {
      return value as T;
    }

    // If value is a string, try to parse it
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return parsed as T;
      } catch (e) {
        console.error(`Failed to parse JSON string${errorContext ? ` (${errorContext})` : ''}:`, e);
        return defaultValue;
      }
    }

    // If we expect an object but got something else
    if (defaultValue !== null && typeof defaultValue === 'object') {
      if (typeof value !== 'object' || value === null) {
        console.error(
          `Expected object but got ${typeof value}${errorContext ? ` (${errorContext})` : ''}`
        );
        return defaultValue;
      }

      // If default value is an array but value is not
      if (Array.isArray(defaultValue) && !Array.isArray(value)) {
        console.error(
          `Expected array but got ${typeof value}${errorContext ? ` (${errorContext})` : ''}`
        );
        return defaultValue;
      }
    }

    return value as T;
  } catch (e) {
    console.error(`Error processing value${errorContext ? ` (${errorContext})` : ''}:`, e);
    return defaultValue;
  }
};

export function useProfile(userId?: string) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [services, setServices] = useState<LawyerService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  // Process raw profile data from the database into a properly typed Profile object
  const processProfileData = useCallback((data: unknown): Profile => {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid profile data: expected an object');
    }

    const profileData = data as Record<string, unknown>;
    
    // Ensure required fields exist
    const requiredFields = ['id', 'user_id', 'role'];
    const missingFields = requiredFields.filter(field => !(field in profileData));
    if (missingFields.length > 0) {
      throw new Error(`Missing required profile fields: ${missingFields.join(', ')}`);
    }

    // Ensure role is valid
    const role = profileData.role === 'lawyer' ? 'lawyer' : 'client';

    // Process visibility_settings with type safety and validation
    const defaultVisibility = {
      profile_visible: true,
      show_online_status: true,
      allow_direct_messages: true
    } as const;

    const visibility_settings = (() => {
      const settings = safeJsonParse<typeof defaultVisibility>(
        profileData.visibility_settings,
        defaultVisibility,
        'visibility_settings'
      );

      // Ensure all required fields are present
      return {
        profile_visible: typeof settings.profile_visible === 'boolean' 
          ? settings.profile_visible 
          : defaultVisibility.profile_visible,
        show_online_status: typeof settings.show_online_status === 'boolean'
          ? settings.show_online_status
          : defaultVisibility.show_online_status,
        allow_direct_messages: typeof settings.allow_direct_messages === 'boolean'
          ? settings.allow_direct_messages
          : defaultVisibility.allow_direct_messages
      };
    })();

    // Process verification documents with type safety and validation
    type VerificationStatus = 'pending' | 'approved' | 'rejected' | 'not_uploaded';
    
    interface IdVerification {
      status: VerificationStatus;
      rejection_reason?: string | null;
      verified_at?: string | null;
    }

    interface BarVerification {
      status: VerificationStatus;
      bar_number: string;
      state: string;
      rejection_reason?: string | null;
      verified_at?: string | null;
    }

    interface VerificationDocuments {
      id_verification?: IdVerification;
      bar_verification?: BarVerification;
    }

    const defaultVerification: VerificationDocuments = {
      id_verification: { status: 'not_uploaded' },
      bar_verification: {
        status: 'not_uploaded',
        bar_number: '',
        state: ''
      }
    };

    const verification_documents = (() => {
      const docs = safeJsonParse<VerificationDocuments>(
        profileData.verification_documents,
        defaultVerification,
        'verification_documents'
      );

      // Ensure all required fields are present and valid
      const result: VerificationDocuments = {
        id_verification: docs.id_verification || defaultVerification.id_verification,
        bar_verification: {
          status: docs.bar_verification?.status || 'not_uploaded',
          bar_number: typeof docs.bar_verification?.bar_number === 'string' 
            ? docs.bar_verification.bar_number 
            : '',
          state: typeof docs.bar_verification?.state === 'string'
            ? docs.bar_verification.state
            : ''
        }
      };

      // Add optional fields if they exist
      if (docs.bar_verification?.rejection_reason) {
        result.bar_verification = {
          ...result.bar_verification!,
          rejection_reason: String(docs.bar_verification.rejection_reason)
        };
      }

      if (docs.bar_verification?.verified_at) {
        result.bar_verification = {
          ...result.bar_verification!,
          verified_at: String(docs.bar_verification.verified_at)
        };
      }

      return result;
    })();

    // Process other JSON fields with validation
    const education = safeJsonParse<Record<string, unknown> | null>(
      profileData.education,
      null,
      'education'
    );

    const certifications = safeJsonParse<Record<string, unknown> | null>(
      profileData.certifications,
      null,
      'certifications'
    );

    // Process array fields with validation
    const specialties = isStringArray(profileData.specialties) 
      ? profileData.specialties 
      : [];
      
    const languages = isStringArray(profileData.languages)
      ? profileData.languages
      : [];

    // Create the profile object with proper typing
    const profile: Profile = {
      id: String(profileData.id),
      user_id: String(profileData.user_id),
      first_name: profileData.first_name ? String(profileData.first_name) : null,
      last_name: profileData.last_name ? String(profileData.last_name) : null,
      display_name: profileData.display_name ? String(profileData.display_name) : null,
      avatar_url: profileData.avatar_url ? String(profileData.avatar_url) : null,
      bio: profileData.bio ? String(profileData.bio) : null,
      location: profileData.location ? String(profileData.location) : null,
      phone: profileData.phone ? String(profileData.phone) : null,
      website: profileData.website ? String(profileData.website) : null,
      role,
      specialties,
      hourly_rate_clp: typeof profileData.hourly_rate_clp === 'number' ? profileData.hourly_rate_clp : null,
      response_time: profileData.response_time ? String(profileData.response_time) : null,
      satisfaction_rate: typeof profileData.satisfaction_rate === 'number' ? profileData.satisfaction_rate : null,
      languages,
      availability: profileData.availability ? String(profileData.availability) : null,
      verified: Boolean(profileData.verified),
      available_for_hire: Boolean(profileData.available_for_hire),
      bar_number: profileData.bar_number ? String(profileData.bar_number) : null,
      zoom_link: profileData.zoom_link ? String(profileData.zoom_link) : null,
      education,
      certifications,
      experience_years: typeof profileData.experience_years === 'number' ? profileData.experience_years : null,
      rating: typeof profileData.rating === 'number' ? profileData.rating : 0,
      review_count: typeof profileData.review_count === 'number' ? profileData.review_count : 0,
      has_used_free_consultation: Boolean(profileData.has_used_free_consultation),
      visibility_settings,
      verification_documents,
      created_at: profileData.created_at ? String(profileData.created_at) : new Date().toISOString(),
      updated_at: profileData.updated_at ? String(profileData.updated_at) : null
    };

    return profile;

  }, []);

  // Helper function to safely fetch and validate profile data
  const fetchAndValidateProfile = useCallback(async (id: string): Promise<Profile> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', id)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Profile not found');

      return processProfileData(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Profile validation error:', errorMessage);
      throw new Error(`Failed to validate profile: ${errorMessage}`);
    }
  }, [processProfileData]);

  // Track mounted state to prevent state updates after unmount
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchProfile = useCallback(async (id: string) => {
    if (!id) {
      setError(new Error('No user ID provided'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', id)
        .single();

      if (error) {
        throw new Error(`Failed to fetch profile: ${error.message}`);
      }

      if (!data) {
        throw new Error('Profile not found');
      }

      const processedProfile = processProfileData(data);
      
      // Only update state if component is still mounted
      if (isMounted.current) {
        setProfile(processedProfile);
      }
    } catch (err) {
      console.error('Error in fetchProfile:', err);
      
      if (isMounted.current) {
        setError(err instanceof Error ? err : new Error('Failed to fetch profile'));
        
        toast({
          title: 'Error',
          description: 'No se pudo cargar el perfil',
          variant: 'destructive',
        });
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [processProfileData, toast]);

  const fetchServices = useCallback(async (id: string) => {
    if (!id) {
      console.warn('No user ID provided for fetching services');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('lawyer_services')
        .select('*')
        .eq('lawyer_user_id', id);

      if (error) {
        throw new Error(`Failed to fetch services: ${error.message}`);
      }

      // Validate and normalize services data
      const validServices = (data || []).filter(service => 
        service && 
        typeof service === 'object' &&
        'lawyer_user_id' in service &&
        'title' in service
      ) as LawyerService[];

      if (isMounted.current) {
        setServices(validServices);
      }
    } catch (err) {
      console.error('Error in fetchServices:', err);
      
      if (isMounted.current) {
        setError(err instanceof Error ? err : new Error('Failed to fetch services'));
      }
    }
  }, []);

  const updateProfile = useCallback(async (updates: Partial<Profile>): Promise<Profile | null> => {
    if (!profile) {
      throw new Error('No profile available for update');
    }

    setLoading(true);
    setError(null);

    try {
      // Prepare the update payload
      const updatePayload: Record<string, unknown> = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      // Don't update read-only fields
      delete updatePayload.id;
      delete updatePayload.user_id;
      delete updatePayload.created_at;

      const { data, error } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('user_id', profile.user_id)
        .select()
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      if (!data) {
        throw new Error('No data returned from update');
      }

      const updatedProfile = processProfileData(data);
      
      if (isMounted.current) {
        setProfile(updatedProfile);
        
        toast({
          title: 'Perfil actualizado',
          description: 'Los cambios se han guardado correctamente.',
        });
      }
      
      return updatedProfile;
    } catch (err) {
      console.error('Error in updateProfile:', err);
      
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      
      if (isMounted.current) {
        setError(new Error(`Failed to update profile: ${errorMessage}`));
        
        toast({
          title: 'Error',
          description: 'No se pudo actualizar el perfil',
          variant: 'destructive',
        });
      }
      
      throw err;
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [profile, processProfileData, toast]);

  useEffect(() => {
    if (!userId) {
      if (isMounted.current) {
        setProfile(null);
        setServices([]);
        setLoading(false);
      }
      return;
    }

    let isActive = true;
    
    const loadData = async () => {
      try {
        // Fetch profile and services in parallel
        await Promise.all([
          fetchProfile(userId),
          fetchServices(userId)
        ]);
      } catch (error) {
        console.error('Error loading profile data:', error);
      }
    };

    loadData();

    // Cleanup function
    return () => {
      isActive = false;
    };
  }, [userId, fetchProfile, fetchServices]);

  // Memoize the return value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    profile,
    services,
    loading,
    error,
    updateProfile,
    refresh: () => {
      if (!userId) {
        return Promise.resolve();
      }
      return Promise.all([
        fetchProfile(userId),
        fetchServices(userId)
      ]).then(() => undefined);
    },
  }), [profile, services, loading, error, updateProfile, fetchProfile, fetchServices, userId]);

  return contextValue;
}
