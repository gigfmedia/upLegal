import { supabase } from '@/lib/supabaseClient';
import { mockLawyers } from '@/mockData/lawyers';

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

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

  // In development, use mock data if available
  if (isDevelopment) {
    const filteredLawyers = mockLawyers.filter(lawyer => {
      // Convertir especialidades a minúsculas para comparación sin distinción
      const lawyerSpecialties = (lawyer.specialties || []).map(s => s.toLowerCase());
      const searchSpecialty = params.specialty?.toLowerCase() || '';
      
      // Coincidencia de especialidad (busca coincidencia exacta o parcial)
      const matchesSpecialty = !params.specialty || 
        params.specialty === 'all' || 
        lawyerSpecialties.some(s => s.includes(searchSpecialty) || searchSpecialty.includes(s));
      
      // Coincidencia de búsqueda general
      const searchQuery = (params.query || '').toLowerCase();
      const lawyerName = `${lawyer.first_name || ''} ${lawyer.last_name || ''}`.toLowerCase().trim();
      
      const matchesQuery = !params.query || 
        lawyerName.includes(searchQuery) ||
        lawyerSpecialties.some(s => s.includes(searchQuery));
      
      // Coincidencia de ubicación
      const matchesLocation = !params.location || 
        (lawyer.location && lawyer.location.toLowerCase().includes(params.location.toLowerCase()));
      
      // Coincidencia de calificación
      const matchesRating = !params.minRating || (lawyer.rating >= (params.minRating || 0));
      
      return matchesSpecialty && matchesQuery && matchesLocation && matchesRating;
    });

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedLawyers = filteredLawyers.slice(start, end);

    const result = { 
      lawyers: paginatedLawyers, 
      total: filteredLawyers.length,
      page,
      pageSize,
      hasMore: end < filteredLawyers.length
    };

    // Cache the result
    searchCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });
    
    return result;
  }

  // In production, query the database
  try {
    // Only select the fields we need for the card view
    let query = supabase
      .from('profiles')
      .select('id, user_id, first_name, last_name, specialties, rating, review_count, location, bio, avatar_url, hourly_rate_clp, experience_years, verified', 
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
      // Use contains operator to find the exact specialty in the array
      query = query.contains('specialties', [params.specialty]);
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
    console.error('Error searching lawyers:', error);
    // In development, return mock data if there's an error
    if (isDevelopment) {
      return {
        lawyers: mockLawyers.slice(0, pageSize),
        total: mockLawyers.length,
        page: 1,
        pageSize,
        hasMore: mockLawyers.length > pageSize
      };
    }
    throw error;
  }
}
