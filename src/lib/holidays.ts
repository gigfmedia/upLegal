import { format, parseISO, isSameDay } from 'date-fns';

// Días feriados en Chile para 2024 y 2025
// Formato: YYYY-MM-DD
export const CHILEAN_HOLIDAYS = [

  // 2025
  '2025-01-01', // Año Nuevo (Irrenunciable)
  '2025-04-18', // Viernes Santo
  '2025-04-19', // Sábado Santo
  '2025-05-01', // Día del Trabajo (Irrenunciable)
  '2025-05-21', // Día de las Glorias Navales
  '2025-06-20', // Día Nacional de los Pueblos Indígenas
  '2025-06-29', // San Pedro y San Pablo
  '2025-07-16', // Día de la Virgen del Carmen
  '2025-08-15', // Asunción de la Virgen
  '2025-09-18', // Independencia Nacional (Irrenunciable)
  '2025-09-19', // Día de las Glorias del Ejército (Irrenunciable)
  '2025-10-12', // Encuentro de Dos Mundos
  '2025-10-31', // Día de las Iglesias Evangélicas y Protestantes
  '2025-11-01', // Día de Todos los Santos
  '2025-11-16', // Elecciones Presidenciales y Parlamentarias (Irrenunciable)
  '2025-12-08', // Inmaculada Concepción
  '2025-12-14', // Segunda Vuelta Elecciones Presidenciales (Irrenunciable - Tentativo)
  '2025-12-25', // Navidad (Irrenunciable)

  // 2026
  '2026-01-01', // Año Nuevo (Irrenunciable)
  '2026-04-03', // Viernes Santo
  '2026-04-04', // Sábado Santo
  '2026-05-01', // Día del Trabajo (Irrenunciable)
  '2026-05-21', // Día de las Glorias Navales
  '2026-06-21', // Día Nacional de los Pueblos Indígenas
  '2026-06-29', // San Pedro y San Pablo
  '2026-07-16', // Día de la Virgen del Carmen
  '2026-08-15', // Asunción de la Virgen
  '2026-09-18', // Independencia Nacional (Irrenunciable)
  '2026-09-19', // Día de las Glorias del Ejército (Irrenunciable)
  '2026-10-12', // Encuentro de Dos Mundos
  '2026-10-31', // Día de las Iglesias Evangélicas y Protestantes
  '2026-11-01', // Día de Todos los Santos
  '2026-12-08', // Inmaculada Concepción
  '2026-12-25', // Navidad (Irrenunciable)
];

/**
 * Verifica si una fecha es un feriado en Chile
 * @param date Fecha a verificar
 * @returns true si es feriado, false si no
 */
export const isChileanHoliday = (date: Date): boolean => {
  const dateString = format(date, 'yyyy-MM-dd');
  return CHILEAN_HOLIDAYS.includes(dateString);
};
