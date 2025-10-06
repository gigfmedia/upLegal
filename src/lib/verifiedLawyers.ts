import { supabase } from './supabaseClient';

// Cache para almacenar el conteo en memoria
let cachedCount: number | null = null;

/**
 * Obtiene el conteo de abogados verificados
 * Utiliza caché en memoria para evitar consultas innecesarias
 */
export const getVerifiedLawyersCount = async (): Promise<number> => {
  // Si ya tenemos un valor en caché, lo devolvemos
  if (cachedCount !== null) {
    return cachedCount;
  }

  try {
    // Solo solicitamos el campo 'id' para minimizar los datos transferidos
    const { count, error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'lawyer')
      .eq('pjud_verified', true);

    if (error) throw error;
    
    // Actualizamos la caché
    cachedCount = count || 0;
    return cachedCount;
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
      (status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('Error en la suscripción a cambios de abogados verificados');
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
