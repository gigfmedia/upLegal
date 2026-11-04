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
 * Datos confirmados:
 * - RUT: 78.523.061-2
 * - Constitución: 29-09-2026
 * - Correo legal de contacto: contacto@legalup.cl
 *
 * TODO (datos societarios/tributarios pendientes — NO inventar valores):
 * - TODO(legal): completar LEGAL_ENTITY_ADDRESS (domicilio tributario / domicilio legal).
 * - TODO(legal): completar LEGAL_ENTITY_GIRO (giro SII).
 * - TODO(legal): completar LEGAL_ENTITY_BILLING_EMAIL (email de facturación).
 * Los documentos legales deben usar LEGAL_ENTITY_IDENTIFICATION para mantener
 * razón social, RUT y fecha de constitución consistentes.
 */

export const BRAND_NAME = 'LegalUp' as const;

export const LEGAL_ENTITY_NAME = 'LegalUp SpA' as const;

/** Línea legal discreta para el footer del sitio. */
export const LEGAL_ENTITY_OPERATOR_LINE = `${BRAND_NAME} es operado por ${LEGAL_ENTITY_NAME}.` as const;

/** Copyright legal del sitio y documentos. */
export const LEGAL_ENTITY_COPYRIGHT = `© 2026 ${LEGAL_ENTITY_NAME}` as const;

export const LEGAL_ENTITY_RUT = '78.523.061-2' as const;

export const LEGAL_ENTITY_CONSTITUTION_DATE = '29-09-2026' as const;

export const LEGAL_ENTITY_CONSTITUTION_LABEL = '29 de septiembre de 2026' as const;

export const LEGAL_ENTITY_CONTACT_EMAIL = 'contacto@legalup.cl' as const;

/** Identificación legal única para Términos, Privacidad y Cookies. */
export const LEGAL_ENTITY_IDENTIFICATION =
  `${LEGAL_ENTITY_NAME}, RUT ${LEGAL_ENTITY_RUT}, constituida el ${LEGAL_ENTITY_CONSTITUTION_LABEL}` as const;

// ---------------------------------------------------------------------------
// Placeholders pendientes de confirmación. Se dejan como `null` a propósito:
// el código que los necesite debe manejar el caso "dato no disponible" y
// mostrar un TODO visible en vez de un valor inventado.
// ---------------------------------------------------------------------------

/** TODO(legal): domicilio tributario/legal de LegalUp SpA — pendiente. */
export const LEGAL_ENTITY_ADDRESS: string | null = null;

/** TODO(legal): giro SII de LegalUp SpA — pendiente. */
export const LEGAL_ENTITY_GIRO: string | null = null;

/** TODO(legal): email de facturación — pendiente. */
export const LEGAL_ENTITY_BILLING_EMAIL: string | null = null;
