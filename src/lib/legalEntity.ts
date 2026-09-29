/**
 * Datos corporativos centralizados — LegalUp.
 *
 * Regla de uso:
 * - `BRAND_NAME` ("LegalUp") = marca comercial / producto / plataforma.
 *   Usar en logo, navegación, marketing, títulos, CTAs, emails transaccionales,
 *   nombres de producto (LegalUp Pro, LegalUp AI) y textos de UX.
 * - `LEGAL_ENTITY_NAME` ("LegalUp SpA") = entidad jurídica operadora.
 *   Usar SOLO en footer legal, Términos, Privacidad, contratos/plantillas y
 *   puntos de facturación (checkout, payment success, emails de pago,
 *   comprobantes, panel admin tributario).
 *
 * TODO (datos societarios/tributarios pendientes — NO inventar valores):
 * - TODO(legal): completar LEGAL_ENTITY_RUT (RUT de LegalUp SpA) cuando SII lo confirme.
 * - TODO(legal): completar LEGAL_ENTITY_ADDRESS (domicilio tributario / domicilio legal).
 * - TODO(legal): completar LEGAL_ENTITY_GIRO (giro SII).
 * - TODO(legal): completar LEGAL_ENTITY_BILLING_EMAIL (email de facturación).
 * - TODO(legal): completar LEGAL_ENTITY_CONTACT_EMAIL (correo legal de contacto para
 *   Términos §12 y Privacidad §12; hoy esos documentos muestran contacto@legalup.cl).
 * Ningún template debe hardcodear RUT/domicilio/giro hasta que estos campos existan aquí.
 */

export const BRAND_NAME = 'LegalUp' as const;

export const LEGAL_ENTITY_NAME = 'LegalUp SpA' as const;

/** Línea legal discreta para el footer del sitio. */
export const LEGAL_ENTITY_OPERATOR_LINE = `${BRAND_NAME} es operado por ${LEGAL_ENTITY_NAME}.` as const;

/** Copyright legal del sitio y documentos. */
export const LEGAL_ENTITY_COPYRIGHT = `© 2026 ${LEGAL_ENTITY_NAME}` as const;

// ---------------------------------------------------------------------------
// Placeholders pendientes de confirmación. Se dejan como `null` a propósito:
// el código que los necesite debe manejar el caso "dato no disponible" y
// mostrar un TODO visible en vez de un valor inventado.
// ---------------------------------------------------------------------------

/** TODO(legal): RUT de LegalUp SpA — pendiente de confirmación. */
export const LEGAL_ENTITY_RUT: string | null = null;

/** TODO(legal): domicilio tributario/legal de LegalUp SpA — pendiente. */
export const LEGAL_ENTITY_ADDRESS: string | null = null;

/** TODO(legal): giro SII de LegalUp SpA — pendiente. */
export const LEGAL_ENTITY_GIRO: string | null = null;

/** TODO(legal): email de facturación — pendiente. */
export const LEGAL_ENTITY_BILLING_EMAIL: string | null = null;

/** TODO(legal): correo legal de contacto (Términos/Privacidad) — pendiente. */
export const LEGAL_ENTITY_CONTACT_EMAIL: string | null = null;
