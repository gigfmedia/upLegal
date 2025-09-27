
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface LinkedInProfile {
  id: string;
  user_id: string;
  linkedin_id: string | null;
  first_name: string | null;
  last_name: string | null;
  headline: string | null;
  summary: string | null;
  location: string | null;
  industry: string | null;
  profile_picture_url: string | null;
  public_profile_url: string | null;
  connections_count: number | null;
  raw_data: any;
  created_at: string;
  updated_at: string;
}

export function useLinkedInProfile(userId: string) {
  const [profile, setProfile] = useState<LinkedInProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('linkedin_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      setProfile(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const connectLinkedIn = async () => {
    try {
      // In a real implementation, this would initiate the LinkedIn OAuth flow
      // For now, we'll create a mock profile to demonstrate the functionality
      const mockProfile = {
        user_id: userId,
        linkedin_id: 'mock_linkedin_id_' + Date.now(),
        first_name: 'John',
        last_name: 'Doe',
        headline: 'Senior Corporate Attorney | Business Law Expert',
        summary: 'Experienced corporate attorney with over 10 years of experience in business law, mergers & acquisitions, and regulatory compliance. Passionate about helping businesses navigate complex legal challenges.',
        location: 'New York, NY',
        industry: 'Legal Services',
        profile_picture_url: '/placeholder.svg',
        public_profile_url: 'https://linkedin.com/in/johndoe',
        connections_count: 1250,
        raw_data: {
          connected_at: new Date().toISOString(),
          mock_data: true
        }
      };

      const { data, error } = await supabase
        .from('linkedin_profiles')
        .insert([mockProfile])
        .select()
        .single();

      if (error) {
        throw error;
      }

      setProfile(data);
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Failed to fetch LinkedIn profile'));
    }
  };

  const refreshProfile = async () => {
    // In a real implementation, this would refresh data from LinkedIn API
    await fetchProfile();
  };

  const disconnectLinkedIn = async () => {
    try {
      const { error } = await supabase
        .from('linkedin_profiles')
        .delete()
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      setProfile(null);
    } catch (err) {
      setError(err as Error);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchProfile();
    }
  }, [userId]);

  return {
    profile,
    isLoading,
    error,
    connectLinkedIn,
    refreshProfile,
    disconnectLinkedIn,
    refetch: fetchProfile
  };
}
