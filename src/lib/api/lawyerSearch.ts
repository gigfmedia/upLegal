import { supabase } from '@/lib/supabaseClient';

interface LawyerProfile {
  id: string;
  first_name: string;
  last_name: string;
  specialties?: string[];
  rating?: number;
  review_count?: number;
  location?: string;
  bio?: string;
  avatar_url?: string;
  hourly_rate_clp?: number;
  experience_years?: number;
  verified: boolean;
  role: string;
}

export interface LawyerSearchParams {
  query?: string;
  specialty?: string;
  location?: string;
  minRating?: number;
  minExperience?: number;
  availableNow?: boolean;
}

// Cache for search results
const searchCache = new Map<string, any>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Create a cache key from search params
function getCacheKey(params: LawyerSearchParams, page: number = 1) {
  return JSON.stringify({
    q: params.query,
    s: params.specialty,
    l: params.location,
    r: params.minRating,
    e: params.minExperience,
    p: page
  });
}

// Add this index creation query to your database migrations
// CREATE INDEX IF NOT EXISTS idx_profiles_search ON profiles 
// USING GIN (to_tsvector('spanish', COALESCE(first_name, '') || ' ' || COALESCE(last_name, '') || ' ' || COALESCE(bio, '')));

// Add this index for location search
// CREATE INDEX IF NOT EXISTS idx_profiles_location ON profiles USING GIN (to_tsvector('spanish', location));

export async function searchLawyers(params: LawyerSearchParams = {}, page: number = 1, pageSize: number = 10) {
  const cacheKey = getCacheKey(params, page);
  const cached = searchCache.get(cacheKey);
  
  // Return cached result if available and not expired
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    // Only select the fields we need for the card view
    let query = supabase
      .from('profiles')
      .select('id, first_name, last_name, specialties, rating, review_count, location, avatar_url, hourly_rate_clp, experience_years, verified', 
        { count: 'exact' })
      .eq('role', 'lawyer')
      .eq('verified', true)
      .eq('available_for_hire', true)
      .order('rating', { ascending: false, nullsLast: true })
      .range((page - 1) * pageSize, (page * pageSize) - 1);

    // Apply filters with optimized queries
    if (params.query) {
      const searchTerm = params.query.toLowerCase().trim();
      // Use full text search if available, otherwise fall back to ILIKE
      query = query.or(
        `first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`
      );
    }

    if (params.specialty && params.specialty !== 'all') {
      query = query.contains('specialties', [params.specialty.toLowerCase()]);
    }

    if (params.location) {
      // Use a GIN index on location for better performance
      query = query.textSearch('location', params.location.toLowerCase(), {
        type: 'websearch',
        config: 'spanish'
      });
    }

    if (params.minRating) {
      query = query.gte('rating', params.minRating);
    }

    if (params.minExperience) {
      query = query.gte('experience_years', params.minExperience);
    }

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    const result = { 
      lawyers: (data as LawyerProfile[]) || [],
      total: count || 0,
      page,
      pageSize
    };
    
    // Cache the result
    searchCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });
    
    return result;
  } catch (error) {
    throw error;
  }
}
