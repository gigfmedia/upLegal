/**
 * Utilidades de identidad del trial de LegalUp AI (Capa 1, Fase 3.7).
 * Compartidas entre el backend (server.mjs) y los tests para evitar divergencias
 * en la normalización de la identidad que controla el trial.
 */

/** Normaliza un email para deduplicación: trim + lowercase + colapso de espacios. */
export function normalizeAIEmail(email) {
  if (!email || typeof email !== 'string') return null;
  const trimmed = email.trim().toLowerCase().replace(/\s+/g, '');
  return trimmed || null;
}

/** Máximo de casos permitidos durante el trial (autoridad: BD + backend). */
export const AI_TRIAL_MAX_CASES = 3;
/** Máximo de documentos permitidos durante el trial. */
export const AI_TRIAL_MAX_DOCUMENTS = 10;