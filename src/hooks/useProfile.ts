import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { calculateProfileCompletion } from "@/utils/profileCompletion";

// Define a more flexible Json type that can handle nested objects and arrays
type Json = 
  | string 
  | number 
  | boolean 
  | null 
  | { [key: string]: Json | undefined } 
  | Json[]
  | Record<string, unknown>;

export interface Profile {
  // Basic profile info
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
  contact_fee_clp: number | null;
  
  // Payment fields
  payment_method?: string | null;
  payment_status?: 'unverified' | 'pending' | 'verified' | 'rejected' | null;
  
  // Profile metadata
  response_time?: string | null;
  satisfaction_rate?: number | null;
  languages?: string[] | null;
  availability?: string | null;
  verified?: boolean;
  available_for_hire?: boolean;
  bar_association_number?: string | null;
  zoom_link?: string | null;
  education?: string | Record<string, unknown> | null;
  university?: string | null;
  study_start_year?: number | string | null;
  study_end_year?: number | string | null;
  certifications?: string | Record<string, unknown> | null;
  rut?: string | null;
  pjud_verified?: boolean;
  experience_years?: number | null;
  rating?: number;
  review_count?: number;
  has_used_free_consultation?: boolean;
  
  // Settings
  visibility_settings?: {
    profile_visible: boolean;
    show_online_status: boolean;
    allow_direct_messages: boolean;
  } | null;
  
  // Verification
  verification_documents?: {
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
  
  // Timestamps
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

// Define the database profile type
interface DatabaseProfile {
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
  contact_fee_clp: number | null;
  payment_method?: string | null;
  payment_status?: 'unverified' | 'pending' | 'verified' | 'rejected' | null;
  visibility_settings?: {
    profile_visible: boolean;
    show_online_status: boolean;
    allow_direct_messages: boolean;
  } | null;
  verification_documents?: {
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
  created_at?: string;
  updated_at?: string | null;
  [key: string]: unknown; // Allow additional properties
}

export function useProfile(userId?: string) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [services, setServices] = useState<LawyerService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchServices = useCallback(async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('lawyer_services')
        .select('*')
        .eq('lawyer_user_id', id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching services:', error);
        return [];
      }

      // Define a type for the service data from the database
      interface DatabaseService {
        id?: string;
        lawyer_user_id: string;
        title: string;
        description: string;
        price_clp: number;
        delivery_time: string;
        features: string[] | string | null;
        available: boolean;
        [key: string]: unknown;
      }

      const servicesData = (data as DatabaseService[] || []).map((service) => ({
        ...service,
        features: Array.isArray(service.features) 
          ? service.features 
          : typeof service.features === 'string' 
            ? service.features.split('\n').filter(Boolean)
            : []
      }));

      setServices(servicesData);
      return servicesData;
    } catch (error) {
      console.error('Error in fetchServices:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not fetch services. Please try again.",
      });
      return [];
    }
  }, [toast]);

  const fetchProfile = useCallback(async (id: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', id)
        .single<DatabaseProfile>();

      if (error || !data) {
        console.error('Error fetching profile:', error);
        setError('Failed to load profile');
        return null;
      }

      // Convert the database profile to our Profile type
      // Convert the database profile to our Profile type with proper type safety
      const profileData: Profile = {
        ...data,
        // Required fields with defaults
        id: data.id || '',
        user_id: data.user_id || '',
        first_name: data.first_name || null,
        last_name: data.last_name || null,
        display_name: data.display_name || null,
        avatar_url: data.avatar_url || null,
        bio: data.bio || null,
        location: data.location || null,
        phone: data.phone || null,
        website: data.website || null,
        role: data.role || 'client',
        specialties: data.specialties || null,
        hourly_rate_clp: data.hourly_rate_clp || null,
        contact_fee_clp: data.contact_fee_clp || null,
        
        // Payment fields
        
        // Profile metadata
        response_time: data.response_time as string || null,
        satisfaction_rate: data.satisfaction_rate as number || null,
        languages: (data.languages as string[]) || [],
        availability: data.availability as string || null,
        verified: !!data.verified,
        available_for_hire: !!data.available_for_hire,
        bar_association_number: data.bar_association_number as string || null,
        zoom_link: data.zoom_link as string || null,
        education: data.education as string | Record<string, unknown> || null,
        university: data.university as string || null,
        study_start_year: data.study_start_year as number | string || null,
        study_end_year: data.study_end_year as number | string || null,
        certifications: data.certifications as string | Record<string, unknown> || null,
        rut: data.rut as string || null,
        pjud_verified: !!data.pjud_verified,
        experience_years: data.experience_years as number || null,
        rating: data.rating as number || 0,
        review_count: data.review_count as number || 0,
        has_used_free_consultation: !!data.has_used_free_consultation,
        
        // Settings
        visibility_settings: (data.visibility_settings as any) || {
          profile_visible: true,
          show_online_status: true,
          allow_direct_messages: true
        },
        
        // Verification
        verification_documents: (data.verification_documents as any) || null,
        
        // Timestamps
        created_at: data.created_at as string || new Date().toISOString(),
        updated_at: data.updated_at as string || new Date().toISOString()
      };

      setProfile(profileData);
      setError(null);
      return profileData;
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      setError('An error occurred while fetching profile');
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not fetch profile data. Please try again.",
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (userId) {
      fetchProfile(userId);
      fetchServices(userId);
    }
  }, [userId, fetchProfile, fetchServices]);

  // Define a type for the updates that can be sent to the database
  type ProfileUpdate = Omit<Partial<Profile>, 'verification_documents' | 'visibility_settings' | 'certifications' | 'education'> & {
    verification_documents?: Json;
    certifications?: Json;
    education?: Json;
    visibility_settings?: {
      profile_visible: boolean;
      show_online_status: boolean;
      allow_direct_messages: boolean;
    };
  };

  const updateProfile = useCallback(async (updates: ProfileUpdate) => {
    if (!profile) return null;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profile.id)
        .select()
        .single<DatabaseProfile>();

      if (error || !data) {
        console.error('Error updating profile:', error);
        throw error || new Error('Failed to update profile');
      }

      const updatedProfile: Profile = {
        ...data,
        role: data.role || 'client',
        visibility_settings: data.visibility_settings ?? {
          profile_visible: true,
          show_online_status: true,
          allow_direct_messages: true
        },
        verification_documents: data.verification_documents ?? null,
        created_at: data.created_at || new Date().toISOString(),
        updated_at: data.updated_at || new Date().toISOString(),
        response_time: null,
        satisfaction_rate: null,
        languages: (data.languages as string[]) || [],
        availability: data.availability as string || null,
        verified: !!data.verified,
        available_for_hire: !!data.available_for_hire,
        bar_association_number: data.bar_association_number as string || null,
        zoom_link: data.zoom_link as string || null,
        education: data.education as string | Record<string, unknown> || null,
        university: data.university as string || null,
        study_start_year: data.study_start_year as number | string || null,
        study_end_year: data.study_end_year as number | string || null,
        certifications: data.certifications as string | Record<string, unknown> || null,
        rut: data.rut as string || null,
        pjud_verified: !!data.pjud_verified,
        experience_years: data.experience_years as number || null,
        rating: data.rating as number || 0,
        review_count: data.review_count as number || 0,
        has_used_free_consultation: !!data.has_used_free_consultation
      };

      setProfile(updatedProfile);
      
      // Refresh services if needed
      if (userId) {
        await fetchServices(userId);
      }
      
      toast({
        title: "Success",
        description: "Profile updated successfully"
      });
      
      return updatedProfile;
    } catch (error) {
      console.error('Error in updateProfile:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not update profile. Please try again.",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [profile, toast, userId, fetchServices]);

  const createService = useCallback(async (service: Omit<LawyerService, 'id' | 'lawyer_user_id'>) => {
    if (!profile) return null;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('lawyer_services')
        .insert([{ ...service, lawyer_user_id: profile.user_id }])
        .select()
        .single<LawyerService>();

      if (error || !data) {
        console.error('Error creating service:', error);
        throw error || new Error('Failed to create service');
      }

      setServices(prev => [data, ...prev]);
      return data;
    } catch (error) {
      console.error('Error in createService:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not create service. Please try again.",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [profile, toast]);

  const updateService = useCallback(async (serviceId: string, updates: Partial<LawyerService>) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('lawyer_services')
        .update(updates)
        .eq('id', serviceId)
        .select()
        .single<LawyerService>();

      if (error || !data) {
        console.error('Error updating service:', error);
        throw error || new Error('Failed to update service');
      }

      setServices(prev => prev.map(s => s.id === serviceId ? { ...s, ...data } : s));
      return data;
    } catch (error) {
      console.error('Error in updateService:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not update service. Please try again.",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const deleteService = useCallback(async (serviceId: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('lawyer_services')
        .delete()
        .eq('id', serviceId);

      if (error) {
        console.error('Error deleting service:', error);
        throw error;
      }

      setServices(prev => prev.filter(s => s.id !== serviceId));
      return true;
    } catch (error) {
      console.error('Error in deleteService:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not delete service. Please try again.",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const refreshProfile = useCallback(() => {
    if (userId) {
      return fetchProfile(userId);
    }
    return Promise.resolve(null);
  }, [fetchProfile, userId]);

  const refreshServices = useCallback(() => {
    if (userId) {
      return fetchServices(userId);
    }
    return Promise.resolve([]);
  }, [fetchServices, userId]);

  // Calcular el porcentaje de completitud del perfil
  const completionPercentage = useMemo(() => {
    if (!profile) return 0;
    return calculateProfileCompletion({
      ...profile,
      servicesCount: services?.length || 0
    });
  }, [profile, services]);

  return {
    profile,
    services,
    loading,
    error,
    updateProfile,
    createService,
    updateService,
    deleteService,
    refreshProfile,
    refreshServices,
    completionPercentage
  };
}