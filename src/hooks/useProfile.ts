import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Profile {
  id?: string;
  user_id: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  location?: string;
  phone?: string;
  website?: string;
  specialties?: string[];
  hourly_rate_clp?: number;
  response_time?: string;
  satisfaction_rate?: number;
  languages?: string[];
  availability?: string;
  verified?: boolean;
  available_for_hire?: boolean;
  bar_number?: string;
  zoom_link?: string;
  education?: any;
  certifications?: any;
  experience_years?: number;
  rating?: number;
  review_count?: number;
  verification_documents?: any;
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

export function useProfile(userId?: string) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [services, setServices] = useState<LawyerService[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (userId) {
      fetchProfile(userId);
      fetchServices(userId);
    }
  }, [userId]);

  const fetchProfile = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      setProfile(data as Profile);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('lawyer_services')
        .select('*')
        .eq('lawyer_user_id', id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching services:', error);
        return;
      }

      setServices(data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!userId) return false;

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: userId,
          ...updates,
          updated_at: new Date().toISOString()
        });

      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo actualizar el perfil: " + error.message
        });
        return false;
      }

      await fetchProfile(userId);
      toast({
        title: "Éxito",
        description: "Perfil actualizado correctamente"
      });
      return true;
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error inesperado al actualizar el perfil"
      });
      return false;
    }
  };

  const createService = async (service: Omit<LawyerService, 'id' | 'lawyer_user_id'>) => {
    if (!userId) return false;

    try {
      const { error } = await supabase
        .from('lawyer_services')
        .insert({
          ...service,
          lawyer_user_id: userId
        });

      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo crear el servicio: " + error.message
        });
        return false;
      }

      await fetchServices(userId);
      toast({
        title: "Éxito",
        description: "Servicio creado correctamente"
      });
      return true;
    } catch (error) {
      console.error('Error creating service:', error);
      return false;
    }
  };

  const updateService = async (serviceId: string, updates: Partial<LawyerService>) => {
    try {
      const { error } = await supabase
        .from('lawyer_services')
        .update(updates)
        .eq('id', serviceId);

      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo actualizar el servicio: " + error.message
        });
        return false;
      }

      if (userId) {
        await fetchServices(userId);
      }
      toast({
        title: "Éxito",
        description: "Servicio actualizado correctamente"
      });
      return true;
    } catch (error) {
      console.error('Error updating service:', error);
      return false;
    }
  };

  const deleteService = async (serviceId: string) => {
    try {
      const { error } = await supabase
        .from('lawyer_services')
        .delete()
        .eq('id', serviceId);

      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo eliminar el servicio: " + error.message
        });
        return false;
      }

      if (userId) {
        await fetchServices(userId);
      }
      toast({
        title: "Éxito",
        description: "Servicio eliminado correctamente"
      });
      return true;
    } catch (error) {
      console.error('Error deleting service:', error);
      return false;
    }
  };

  return {
    profile,
    services,
    loading,
    updateProfile,
    createService,
    updateService,
    deleteService,
    refreshProfile: () => userId && fetchProfile(userId),
    refreshServices: () => userId && fetchServices(userId)
  };
}