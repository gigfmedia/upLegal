import { supabase } from '@/lib/supabaseClient';
// Función para manejar la búsqueda de abogados
export async function searchLawyers(params: {
  query?: string;
  specialty?: string | null;
  location?: string | null;
  minRating?: number;
  minExperience?: number;
  availableNow?: boolean;
}) {
  try {
    const { 
      query = '', 
      specialty = null, 
      location = null, 
      minRating = 0, 
      minExperience = 0, 
      availableNow = false 
    } = params;

    // Base query for lawyers - include all active lawyers
    let queryBuilder = supabase
      .from('profiles')
      .select('*')
      .eq('role', 'lawyer')
      .or('verified.eq.true,pjud_verified.eq.true');

    // Apply filters
    if (query) {
      queryBuilder = queryBuilder.or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,bio.ilike.%${query}%`);
    }

    if (specialty && specialty !== 'all') {
      // Búsqueda más flexible por especialidad
      queryBuilder = queryBuilder.or(
        `specialty_id.eq.${specialty},specialty_id.ilike.%${specialty}%,specialties.cs.{"${specialty}"},specialties.cs.{"${specialty.toLowerCase()}"}`
      );
      
      // Si la especialidad contiene espacios, buscar por cada palabra
      if (specialty.includes(' ')) {
        const words = specialty.split(' ').filter(w => w.length > 2);
        words.forEach(word => {
          queryBuilder = queryBuilder.or(`specialty_id.ilike.%${word}%,specialties.cs.{"${word}"}`);
        });
      }
    }

    if (location) {
      queryBuilder = queryBuilder.ilike('location', `%${location}%`);
    }

    if (minRating > 0) {
      queryBuilder = queryBuilder.gte('rating', minRating);
    }

    if (minExperience > 0) {
      queryBuilder = queryBuilder.gte('experience_years', minExperience);
    }

    if (availableNow) {
      queryBuilder = queryBuilder.eq('available_now', true);
    }

    const { data: lawyers, error } = await queryBuilder;

    if (error) {
      console.error('Error searching lawyers:', error);
      return { error: 'Error searching lawyers' };
    }

    return { lawyers };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { error: 'Internal server error' };
  }
}

// Exportar la función para usarla en los componentes
export default searchLawyers;
