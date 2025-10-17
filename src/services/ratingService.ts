import { supabase } from '@/lib/supabaseClient';
import { Rating, CreateRatingInput, UpdateRatingInput } from '@/types/rating';

export const ratingService = {
  // Get all ratings for a lawyer
  async getRatingsByLawyer(lawyerId: string): Promise<Rating[]> {
    // First, get the ratings
    const { data: ratingsData, error: ratingsError } = await supabase
      .from('ratings')
      .select('*')
      .eq('lawyer_id', lawyerId)
      .order('created_at', { ascending: false });

    if (ratingsError) throw ratingsError;
    if (!ratingsData || ratingsData.length === 0) return [];

    // Get user IDs from ratings
    const userIds = [...new Set(ratingsData.map(r => r.user_id))];
    
    // Get user profiles
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIds);

    if (profilesError) throw profilesError;

    // Create a map of user ID to profile
    const profilesMap = new Map(
      (profilesData || []).map(profile => [profile.id, profile])
    );

    // Combine ratings with user data
    return (ratingsData || []).map(rating => {
      const userProfile = profilesMap.get(rating.user_id);
      return {
        ...rating,
        user: userProfile ? {
          id: userProfile.id,
          email: userProfile.email || '',
          name: [userProfile.first_name, userProfile.last_name]
            .filter(Boolean)
            .join(' ') || 'Usuario anónimo',
          avatar_url: userProfile.avatar_url
        } : {
          id: rating.user_id,
          email: '',
          name: 'Usuario anónimo',
          avatar_url: ''
        }
      };
    });
  },

  // Get a user's rating for a lawyer
  async getUserRating(lawyerId: string, userId: string): Promise<Rating | null> {
    const { data, error } = await supabase
      .from('ratings')
      .select('*')
      .eq('lawyer_id', lawyerId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows found
        return null;
      }
      throw error;
    }

    return data;
  },

  // Create a new rating
  async createRating(input: CreateRatingInput, userId: string): Promise<Rating> {
    const { data, error } = await supabase
      .from('ratings')
      .insert([
        {
          lawyer_id: input.lawyerId,
          user_id: userId,
          rating: input.rating,
          comment: input.comment
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update an existing rating
  async updateRating(ratingId: string, input: UpdateRatingInput, userId: string): Promise<Rating> {
    const { data, error } = await supabase
      .from('ratings')
      .update({
        rating: input.rating,
        comment: input.comment,
        updated_at: new Date().toISOString()
      })
      .eq('id', ratingId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete a rating
  async deleteRating(ratingId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('ratings')
      .delete()
      .eq('id', ratingId)
      .eq('user_id', userId);

    if (error) throw error;
  },

  // Get average rating and count for a lawyer
  async getLawyerRatingStats(lawyerId: string): Promise<{ average: number; count: number }> {
    const { data, error } = await supabase
      .rpc('get_rating_stats', { lawyer_id: lawyerId })
      .single();

    if (error) {
      // Fallback to manual calculation if RPC function doesn't exist
      const { data: ratings, error: ratingsError } = await this.getRatingsByLawyer(lawyerId);
      if (ratingsError) throw ratingsError;
      
      const sum = ratings.reduce((acc, curr) => acc + curr.rating, 0);
      const average = ratings.length > 0 ? sum / ratings.length : 0;
      
      return {
        average: parseFloat(average.toFixed(1)),
        count: ratings.length
      };
    }

    return {
      average: parseFloat((data?.average_rating || 0).toFixed(1)),
      count: data?.rating_count || 0
    };
  }
};

// Create the RPC function if it doesn't exist
declare global {
  interface Window {
    createRatingRpcFunction?: boolean;
  }
}

// Only run this once
if (typeof window !== 'undefined' && !window.createRatingRpcFunction) {
  window.createRatingRpcFunction = true;
  
  // This is a one-time setup that should be done on the server
  // It's included here for reference and should be added to your database migrations
  /*
  CREATE OR REPLACE FUNCTION get_rating_stats(lawyer_id UUID)
  RETURNS TABLE (
    average_rating NUMERIC,
    rating_count BIGINT
  ) AS $$
  BEGIN
    RETURN QUERY
    SELECT 
      COALESCE(AVG(r.rating), 0)::NUMERIC(3,1) as average_rating,
      COUNT(r.id)::BIGINT as rating_count
    FROM public.ratings r
    WHERE r.lawyer_id = $1;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;
  */
}
