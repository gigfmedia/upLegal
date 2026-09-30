/**
 * Offsets compartidos de elementos flotantes inferiores.
 *
 * Patrón existente (botón WhatsApp en Footer): `bottom-6` por defecto y
 * `bottom-24` cuando debe elevarse para no solapar otro flotante.
 * CookieBanner reutiliza el mismo criterio en perfil de abogado.
 */

/** Base de flotantes inferiores: 24px. */
export const FLOATING_BOTTOM_BASE = 'bottom-6' as const;

/** Flotante elevado para evitar solapamiento: 96px. */
export const FLOATING_BOTTOM_RAISED = 'bottom-24' as const;

/**
 * Cookie elevada: 72px. La caja del cookie lleva padding inferior interno
 * (pb-6 = 24px), así su borde queda a 96px, alineado con el botón WhatsApp
 * y con el mismo aire sobre el sticky bar. Evita la subida doble.
 */
export const FLOATING_COOKIE_RAISED = 'bottom-[72px]' as const;
