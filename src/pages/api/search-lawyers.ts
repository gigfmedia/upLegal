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

// Mapeo de términos de búsqueda a especialidades
const SPECIALTY_MAPPING: Record<string, string[]> = {
  // Familia
  'familia': ['Derecho de Familia'],
  'divorcio': ['Derecho de Familia'],
  'separacion': ['Derecho de Familia'],
  'pension': ['Derecho de Familia'],
  'alimentos': ['Derecho de Familia'],
  'visitas': ['Derecho de Familia'],
  'pension alimenticia': ['Derecho de Familia'],
  'cuidado personal': ['Derecho de Familia'],
  'tuicion': ['Derecho de Familia'],
  'relacion directa': ['Derecho de Familia'],
  'violencia intrafamiliar': ['Derecho de Familia'],
  
  // Laboral
  'laboral': ['Derecho Laboral'],
  'despido': ['Derecho Laboral'],
  'despido injustificado': ['Derecho Laboral'],
  'finiquito': ['Derecho Laboral'],
  'fuero': ['Derecho Laboral'],
  'despido indirecto': ['Derecho Laboral'],
  'despido nulo': ['Derecho Laboral'],
  'despido por necesidades': ['Derecho Laboral'],
  'fuero maternal': ['Derecho Laboral'],
  
  // Civil
  'civil': ['Derecho Civil'],
  'contrato': ['Derecho Civil'],
  'arriendo': ['Derecho Civil'],
  'compraventa': ['Derecho Civil'],
  'arrendamiento': ['Derecho Civil'],
  'responsabilidad civil': ['Derecho Civil'],
  'daños y perjuicios': ['Derecho Civil'],
  
  // Comercial
  'comercial': ['Derecho Comercial'],
  'empresa': ['Derecho Comercial'],
  'sociedad': ['Derecho Comercial'],
  'quiebra': ['Derecho Comercial'],
  'concurso acreedores': ['Derecho Comercial'],
  'marca': ['Derecho Comercial'],
  'patente': ['Derecho Comercial'],
  'propiedad intelectual': ['Derecho Comercial'],
  
  // Inmobiliario
  'inmobiliario': ['Derecho Inmobiliario'],
  'propiedad': ['Derecho Inmobiliario'],
  'hipoteca': ['Derecho Inmobiliario'],
  'usufructo': ['Derecho Inmobiliario'],
  'servidumbre': ['Derecho Inmobiliario'],
  'regularizacion': ['Derecho Inmobiliario'],
  
  // Penal
  'penal': ['Derecho Penal'],
  'delito': ['Derecho Penal'],
  'robo': ['Derecho Penal'],
  'hurto': ['Derecho Penal'],
  'estafa': ['Derecho Penal'],
  'lesiones': ['Derecho Penal'],
  'homicidio': ['Derecho Penal'],
  
  // Tributario
  'tributario': ['Derecho Tributario'],
  'impuestos': ['Derecho Tributario'],
  'iva': ['Derecho Tributario'],
  'renta': ['Derecho Tributario'],
  'sii': ['Derecho Tributario'],
  'multas tributarias': ['Derecho Tributario'],
  'evasion': ['Derecho Tributario'],
  
  // Otros
  'tránsito': ['Derecho de Tránsito'],
  'accidente tránsito': ['Derecho de Tránsito'],
  'seguro': ['Derecho de Seguros'],
  'herencia': ['Derecho Sucesorio'],
  'testamento': ['Derecho Sucesorio'],
  'sucesion': ['Derecho Sucesorio'],
  'consumidor': ['Derecho del Consumidor'],
  'proteccion consumidor': ['Derecho del Consumidor'],
  'salud': ['Derecho de Salud'],
  'isapre': ['Derecho de Salud'],
  'fonasa': ['Derecho de Salud'],
  'previsional': ['Derecho Previsional'],
  'afp': ['Derecho Previsional'],
  'pensiones': ['Derecho Previsional'],
  'migratorio': ['Derecho Migratorio'],
  'extranjeria': ['Derecho Migratorio'],
  'visa': ['Derecho Migratorio'],
  'medio ambiente': ['Derecho Ambiental'],
  'contaminacion': ['Derecho Ambiental'],
  'agua': ['Derecho de Aguas'],
  'mineria': ['Derecho Minero'],
  'constitucional': ['Derecho Constitucional'],
  'derechos humanos': ['Derechos Humanos'],
  'amparo': ['Derecho Constitucional'],
  'proteccion derechos': ['Derecho Constitucional']
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

    // Validar parámetros
    const validatedPage = Math.max(1, page);
    const validatedPageSize = Math.min(100, Math.max(1, pageSize));
    const from = (validatedPage - 1) * validatedPageSize;
    const to = from + validatedPageSize - 1;

    // Construir consulta base
    let queryBuilder = supabase
      .from('profiles')
      .select(select, { count: 'exact' })
      .eq('role', 'lawyer')

      .order('verified', { ascending: false, nullsLast: true })
      .order('rating', { ascending: false, nullsLast: true })
      .order('review_count', { ascending: false, nullsLast: true })
      .range(from, to);
      
    // Asegurarse de que no se incluya available_now en la consulta
    if (select.includes('available_now')) {
      const selectFields = select.split(',').map(f => f.trim()).filter(f => f !== 'available_now');
      queryBuilder = queryBuilder.select(selectFields.join(','), { count: 'exact' });
    }

    // Combinamos todas las condiciones en una sola consulta
    const conditions = [];
    
    // 1. Agregar condiciones de especialidad si existen
    if (specialty && specialty !== 'all') {
      
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
          const mappedTerms = SPECIALTY_MAPPING[lowerTerm];
          // Agregar cada término mapeado a las condiciones
          mappedTerms.forEach(term => {
            conditions.push(`specialties.cs.{"${term}"}`);
          });
        }
      }
    }
    
    // 2. Agregar condiciones de búsqueda de texto si existe
    if (query) {
      const searchTerm = query.trim();
      if (searchTerm) {
        const escapedTerm = escapeSearchTerm(searchTerm);
        
        // Si hay filtro de especialidad, NO buscar en specialties ni bio con el query
        // Solo buscar en nombres
        if (specialty && specialty !== 'all') {
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
            const mappedTerms = SPECIALTY_MAPPING[normalizedTerm];
            mappedTerms.forEach(term => {
              conditions.push(`specialties.cs.{"${term}"}`);
            });
          }
        }
      }
    }
    
    // Aplicar todas las condiciones con OR
    if (conditions.length > 0) {
      const conditionsStr = [...new Set(conditions)].join(',');
      queryBuilder = queryBuilder.or(conditionsStr);
    }

    // Filtros adicionales
    if (location) {
      const locationTerm = location.toString().trim();
      if (locationTerm) {
        queryBuilder = queryBuilder.ilike('location', `%${escapeSearchTerm(locationTerm)}%`);
      }
    }

    if (minRating > 0) {
      queryBuilder = queryBuilder.gte('rating', minRating);
    }

    if (minExperience > 0) {
      queryBuilder = queryBuilder.gte('experience_years', minExperience);
    }

    if (availableNow) {
    }

    // Ejecutar la consulta
    
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
    
    if (lawyers && lawyers.length > 0) {
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