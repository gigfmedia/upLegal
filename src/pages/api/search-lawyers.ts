import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const specialty = searchParams.get('specialty');
    const location = searchParams.get('location');
    const minRating = Number(searchParams.get('minRating')) || 0;
    const minExperience = Number(searchParams.get('minExperience')) || 0;
    const availableNow = searchParams.get('availableNow') === 'true';

    const supabase = createClient();

    // Base query for lawyers - include all verified lawyers
    let queryBuilder = supabase
      .from('profiles')
      .select('*')
      .eq('role', 'lawyer')
      .eq('verified', true);

    // Apply filters
    if (query) {
      queryBuilder = queryBuilder.or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,bio.ilike.%${query}%`);
    }

    if (specialty && specialty !== 'all') {
      queryBuilder = queryBuilder.contains('specialties', [specialty]);
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
      return NextResponse.json(
        { error: 'Error searching lawyers' },
        { status: 500 }
      );
    }

    return NextResponse.json({ lawyers });
  } catch (error) {
    console.error('Error in search-lawyers API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
