/**
 * Lógica pura de disponibilidad para booking (sin I/O, sin estado).
 * Extraída de BookingPage para hacerla testeable tras la regresión que
 * vaciaba la grilla (fall-through en el filtro por configuración).
 */

export type ConfigSlot = { time: string };

/**
 * Filtra slots base por configuración del abogado.
 * - Con arreglo del día: conserva solo índices `true`.
 * - Sin arreglo pero con config (día no atendido): descarta todo.
 * - Sin config: conserva todo (comportamiento legacy).
 */
export function filterSlotsByConfig(
  baseSlots: ConfigSlot[],
  dayAvailability: boolean[] | null | undefined,
  hasCustomAvailability: boolean,
  startHour = 9
): ConfigSlot[] {
  return baseSlots.filter((slot) => {
    const hour = parseInt(slot.time.split(':')[0], 10);
    const hourIndex = hour - startHour;

    if (dayAvailability && Array.isArray(dayAvailability)) {
      return dayAvailability[hourIndex] === true;
    }

    if (hasCustomAvailability) {
      return false;
    }

    return true;
  });
}

/** ¿Queda hoy algún slot config-true que supere el corte (now+15min)? */
export function hasSurvivingSlotToday(
  dayAvailability: boolean[] | null | undefined,
  nowDate: Date,
  startHour = 9
): boolean {
  if (!Array.isArray(dayAvailability)) return false;
  const cutoff = new Date(nowDate.getTime() + 15 * 60 * 1000);
  return dayAvailability.some((slot, index) => {
    if (!slot) return false;
    const d = new Date(nowDate);
    d.setHours(startHour + index, 0, 0, 0);
    return d.getTime() >= cutoff.getTime();
  });
}
