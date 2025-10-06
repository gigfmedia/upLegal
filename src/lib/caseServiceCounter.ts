import { supabase } from './supabaseClient';

/**
 * Obtiene el conteo de casos resueltos
 * Multiplica por 5 el número de abogados verificados como valor temporal
 */
export const getCompletedCasesCount = async (): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'lawyer')
      .eq('pjud_verified', true);

    if (error) throw error;
    
    // Multiplicar por 5 como valor temporal
    return (count || 0) * 5;
  } catch (error) {
    console.error('Error contando casos resueltos:', error);
    return 25; // Valor por defecto en caso de error
  }
};

/**
 * Suscripción a cambios en los casos resueltos
 */
export const subscribeToCompletedCases = (callback: (count: number) => void) => {
  // Usar un intervalo para actualizar periódicamente
  const updateCount = async () => {
    const count = await getCompletedCasesCount();
    callback(count);
  };

  // Actualizar inmediatamente
  updateCount();
  
  // Actualizar cada minuto (o el intervalo que prefieras)
  const intervalId = setInterval(updateCount, 60000);

  // Función de limpieza
  return () => {
    clearInterval(intervalId);
  };
};
