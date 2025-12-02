import { supabase } from '@/lib/supabaseClient';

// Tipos para los parámetros de búsqueda
interface SearchParams {
  query?: string;
  specialty?: string | string[] | null;
  location?: string | null;
  minRating?: number;
  minExperience?: number;
  availableNow?: boolean;
  page?: number;
  pageSize?: number;
  select?: string;
}

// Mapeo de términos comunes de búsqueda
const SPECIALTY_MAPPING: Record<string, string> = {
  'familia': 'Derecho de Familia',
  'laboral': 'Derecho Laboral',
  'penal': 'Derecho Penal',
  'civil': 'Derecho Civil',
  'comercial': 'Derecho Comercial',
  'inmobiliario': 'Derecho Inmobiliario',
  'tributario': 'Derecho Tributario',
  'familia y niños': 'Derecho de Familia',
  'trabajo': 'Derecho Laboral',
  'empresarial': 'Derecho Comercial',
  'empresa': 'Derecho Comercial',
  'contratos': 'Derecho Civil',
  'arriendo': 'Derecho Civil',
  'vivienda': 'Derecho Inmobiliario',
  'propiedad': 'Derecho Inmobiliario',
  'impuestos': 'Derecho Tributario',
  'tributos': 'Derecho Tributario',
  'delito': 'Derecho Penal',
  'penitenciario': 'Derecho Penal'
};

// Función para escapar caracteres especiales en búsquedas LIKE
const escapeSearchTerm = (term: string): string => {
  if (!term) return '';
  return term
    .replace(/[\[\]()%+?.*{}|^$\\-]/g, '\\$&')
    .replace(/'/g, "''");
};

// Función para manejar la búsqueda de abogados
export async function searchLawyers(params: SearchParams = {}) {
  const startTime = Date.now();
  
  try {
    const { 
      query = '', 
      specialty = null, 
      location = null, 
      minRating = 0, 
      minExperience = 0, 
      availableNow = false, // Nota: No se usa en la consulta ya que la columna no existe
      page = 1,
      pageSize = 12,
      // Eliminamos available_now de la selección por defecto
      select = 'id, user_id, first_name, last_name, specialties, specialty_id, rating, review_count, location, bio, avatar_url, hourly_rate_clp, experience_years, verified, pjud_verified, contact_fee_clp, created_at, updated_at'
    } = params;

    console.log('🔍 Iniciando búsqueda con parámetros:', JSON.stringify({
      query, 
      specialty, 
      location, 
      minRating, 
      minExperience, 
      availableNow: 'No se usa (columna no existe)',
      page, 
      pageSize 
    }, null, 2));

    // Validar parámetros
    const validatedPage = Math.max(1, page);
    const validatedPageSize = Math.min(100, Math.max(1, pageSize));
    const from = (validatedPage - 1) * validatedPageSize;
    const to = from + validatedPageSize - 1;

    // Construir consulta base
    console.log('🔧 Construyendo consulta base...');
    let queryBuilder = supabase
      .from('profiles')
      .select(select, { count: 'exact' })
      .eq('role', 'lawyer')
      .or('verified.eq.true,pjud_verified.eq.true')
      .order('rating', { ascending: false, nullsLast: true })
      .order('review_count', { ascending: false, nullsLast: true })
      .range(from, to);
      
    // Asegurarse de que no se incluya available_now en la consulta
    if (select.includes('available_now')) {
      const selectFields = select.split(',').map(f => f.trim()).filter(f => f !== 'available_now');
      queryBuilder = queryBuilder.select(selectFields.join(','), { count: 'exact' });
      console.log('ℹ️ Se eliminó available_now de la consulta');
    }

    // Combinamos todas las condiciones en una sola consulta
    const conditions = [];
    
    // 1. Agregar condiciones de especialidad si existen
    if (specialty && specialty !== 'all') {
      console.log(`🔍 Aplicando filtro de especialidad:`, specialty);
      
      const specialties = Array.isArray(specialty) ? specialty : [specialty];
      
      for (const spec of specialties) {
        if (!spec || spec === 'all') continue;
        
        const term = spec.trim();
        if (!term) continue;
        
        const lowerTerm = term.toLowerCase();
        
        // Búsqueda EXACTA en el array de especialidades (formato JSON)
        conditions.push(`specialties.cs.{"${term}"}`);
        conditions.push(`specialties.cs.{"${lowerTerm}"}`);
        
        // Manejar términos comunes del mapeo
        if (SPECIALTY_MAPPING[lowerTerm]) {
          const mappedTerm = SPECIALTY_MAPPING[lowerTerm];
          // Solo búsqueda EXACTA del término mapeado completo
          conditions.push(`specialties.cs.{"${mappedTerm}"}`);
        }
      }
    }
    
    // 2. Agregar condiciones de búsqueda de texto si existe
    if (query) {
      const searchTerm = query.trim();
      if (searchTerm) {
        console.log(`🔍 Aplicando filtro de búsqueda: "${searchTerm}"`);
        const escapedTerm = escapeSearchTerm(searchTerm);
        
        // Si hay filtro de especialidad, NO buscar en specialties ni bio con el query
        // Solo buscar en nombres
        if (specialty && specialty !== 'all') {
          console.log(`ℹ️ Filtro de especialidad presente, query solo busca en nombres`);
          conditions.push(
            `first_name.ilike.%${escapedTerm}%`,
            `last_name.ilike.%${escapedTerm}%`
          );
        } else {
          // Si NO hay filtro de especialidad, buscar también en specialties
          conditions.push(
            `first_name.ilike.%${escapedTerm}%`,
            `last_name.ilike.%${escapedTerm}%`,
            `bio.ilike.%${escapedTerm}%`,
            `specialties.cs.{"${escapedTerm}"}`
          );

          // Verificar si el término de búsqueda coincide con alguna especialidad conocida
          const normalizedTerm = searchTerm.toLowerCase().trim();
          if (SPECIALTY_MAPPING[normalizedTerm]) {
            const mappedTerm = SPECIALTY_MAPPING[normalizedTerm];
            console.log(`🔍 Término mapeado a especialidad: "${normalizedTerm}" -> "${mappedTerm}"`);
            conditions.push(`specialties.cs.{"${mappedTerm}"}`);
          }
        }
      }
    }
    
    // Aplicar todas las condiciones con OR
    if (conditions.length > 0) {
      const conditionsStr = [...new Set(conditions)].join(',');
      console.log(`🔍 Aplicando condiciones de búsqueda: ${conditionsStr}`);
      queryBuilder = queryBuilder.or(conditionsStr);
    }

    // Filtros adicionales
    if (location) {
      const locationTerm = location.toString().trim();
      if (locationTerm) {
        console.log(`📍 Aplicando filtro de ubicación: "${locationTerm}"`);
        queryBuilder = queryBuilder.ilike('location', `%${escapeSearchTerm(locationTerm)}%`);
      }
    }

    if (minRating > 0) {
      console.log(`⭐ Aplicando filtro de calificación mínima: ${minRating}`);
      queryBuilder = queryBuilder.gte('rating', minRating);
    }

    if (minExperience > 0) {
      console.log(`📅 Aplicando filtro de experiencia mínima: ${minExperience} años`);
      queryBuilder = queryBuilder.gte('experience_years', minExperience);
    }

    if (availableNow) {
      console.log('ℹ️ El filtro de disponibilidad está deshabilitado (columna no existe)');
    }

    // Ejecutar la consulta
    console.log('⚡ Ejecutando consulta a la base de datos...');
    console.log('🔍 Consulta SQL generada:', queryBuilder);
    
    const { data: lawyers, error, count } = await queryBuilder;
    const queryTime = Date.now() - startTime;

    if (error) {
      console.error('❌ Error en la búsqueda de abogados:', error);
      
      // Verificar si el error es por la columna available_now
      if (error.message && error.message.includes('available_now')) {
        console.warn('⚠️ La columna available_now no existe en la base de datos');
      }
      
      return { 
        lawyers: [], 
        total: 0, 
        page: validatedPage, 
        pageSize: validatedPageSize,
        hasMore: false,
        error: 'Error al buscar abogados: ' + (error.message || 'Error desconocido'),
        queryTime
      };
    }

    const totalResults = count || 0;
    const hasMore = to < totalResults - 1;
    
    console.log(`✅ Búsqueda completada en ${queryTime}ms. Encontrados ${totalResults} abogados.`);
    if (lawyers && lawyers.length > 0) {
      console.log('📋 Primeros abogados encontrados:', lawyers.slice(0, 3).map(l => ({
        id: l.id,
        name: `${l.first_name} ${l.last_name}`,
        specialty: l.specialty_id,
        specialties: l.specialties,
        rating: l.rating
      })));
    }
    
    return { 
      lawyers: lawyers || [], 
      total: totalResults, 
      page: validatedPage, 
      pageSize: validatedPageSize,
      hasMore,
      queryTime
    };

  } catch (error) {
    const errorTime = Date.now() - startTime;
    console.error('❌ Error inesperado en searchLawyers:', error);
    return { 
      lawyers: [], 
      total: 0, 
      page: 1, 
      pageSize: 10, 
      hasMore: false,
      error: 'Error interno del servidor',
      queryTime: errorTime
    };
  }
}

export default searchLawyers;