import { supabase } from './supabaseClient';

// Cache para almacenar el conteo en memoria
let cachedCount: number | null = null;

/**
 * Obtiene el conteo de abogados verificados
 * Utiliza caché en memoria para evitar consultas innecesarias
 */
export const getVerifiedLawyersCount = async (): Promise<number> => {
  // Forzar siempre una nueva consulta para obtener los datos más recientes
  
  try {
    // Primero, obtener todos los abogados
    const { data: lawyers, error, count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .eq('role', 'lawyer');

    if (error) throw error;
    
    // Filtrar abogados verificados (consideramos verificado si tiene pjud_verified O verified en true)
    const verifiedLawyers = lawyers?.filter(lawyer => 
      (lawyer.pjud_verified === true || lawyer.verified === true) &&
      !lawyer.first_name?.toLowerCase().includes('admin')
    ) || [];
    
    const verifiedCount = verifiedLawyers.length;
    
    // Actualizar la caché con el nuevo valor
    cachedCount = verifiedCount;
    return verifiedCount;
  } catch (error) {
    console.error('Error fetching verified lawyers count:', error);
    return 0;
  }
};

/**
 * Suscripción a cambios en los abogados verificados
 */
export const subscribeToVerifiedLawyers = (callback: (count: number) => void) => {
  // Función para actualizar el conteo y notificar
  const updateCount = async () => {
    const count = await getVerifiedLawyersCount();
    callback(count);
  };

  // Crear canal para actualizaciones en tiempo real
  const channel = supabase
    .channel('verified-lawyers-changes')
    .on(
      'postgres_changes',
      {
        event: 'INSERT', // Solo escuchar inserciones
        schema: 'public',
        table: 'profiles',
        filter: 'role=eq.lawyer'
      } as const,
      updateCount
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE', // Escuchar eliminaciones
        schema: 'public',
        table: 'profiles',
        filter: 'role=eq.lawyer'
      } as const,
      updateCount
    )
    .subscribe(
      (status, err) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Error en la suscripción a cambios de perfiles:', status, err);
        }
      }
    );

  // Cargar el conteo inicial
  updateCount();

  // Función de limpieza
  return () => {
    supabase.removeChannel(channel);
  };
};
