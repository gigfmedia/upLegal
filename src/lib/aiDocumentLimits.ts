/**
 * Límites de documentos de LegalUp AI.
 *
 * El límite real de 20 MB lo impone Supabase Storage (server-side) vía el
 * `file_size_limit` del bucket `ai-documents`. Este módulo solo centraliza la
 * constante y los helpers de validación/errores para mantener frontend e
 * infraestructura en sincronía (ver migración `ai_documents_bucket_size_limit`).
 */

export const MAX_DOCUMENT_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

/** Indica si un tamaño de archivo excede el máximo permitido (20 MB). */
export function isDocumentOverMaxSize(bytes: number): boolean {
  return bytes > MAX_DOCUMENT_SIZE_BYTES;
}

/** Detecta si un error de Supabase Storage corresponde a archivo demasiado grande. */
export function isStorageSizeLimitError(
  error: { statusCode?: string | number; message?: string } | null | undefined
): boolean {
  if (!error) return false;
  const status = String(error.statusCode ?? '');
  if (status === '413') return true;
  return /(\btoo large\b|\bexceeded\b|size.*limit|maximum.*size)/i.test(error.message ?? '');
}

/** Detecta si un error de Supabase (DB) corresponde al tope de documentos del plan. */
export function isDocumentCapacityLimitError(
  error: { code?: string | number; message?: string } | null | undefined
): boolean {
  if (!error) return false;
  const message = String(error.message ?? '');
  // 4.38C: stable marker raised by ai_enforce_trial_limits for Pro (50 docs).
  if (message.includes('AI_DOCUMENT_CAPACITY_REACHED')) return true;
  // 4.44A: lifetime free first-Case markers (2 docs scoped to the free workspace).
  if (message.includes('FREE_CASE_DOCUMENT_LIMIT_REACHED')) return true;
  if (message.includes('AI_FREE_CASE_DOCUMENT_SCOPE')) return true;
  // 4.44C: consumed-but-unidentified grant fails closed (never "no plan").
  // Surfaces via PostgREST direct insert (no server route inserts ai_documents);
  // map to the safe free-case message, never raw SQL text.
  if (message.includes('AI_FREE_CASE_INVALID_SCOPE')) return true;
  if (String(error.code ?? '') === 'P0001' && /documento\(s\)/i.test(message)) return true;
  return false;
}

/** 4.44A: detecta el tope lifetime del primer caso gratis (2 documentos). */
export function isFreeCaseDocumentLimitError(
  error: { code?: string | number; message?: string } | null | undefined
): boolean {
  if (!error) return false;
  const message = String(error.message ?? '');
  return (
    message.includes('FREE_CASE_DOCUMENT_LIMIT_REACHED') ||
    message.includes('AI_FREE_CASE_DOCUMENT_SCOPE') ||
    message.includes('AI_FREE_CASE_INVALID_SCOPE')
  );
}

/** Mensaje de capacidad para el tope de documentos almacenados del plan. */
export function documentCapacityLimitMessage(): string {
  return 'Alcanzaste el límite de 50 documentos almacenados. Puedes eliminar documentos que ya no necesites para liberar espacio.';
}

/** 4.44A: mensaje para el tope lifetime del primer caso gratis. */
export function freeCaseDocumentLimitMessage(): string {
  return 'Tu primer caso incluye hasta 2 documentos. Puedes eliminar uno para liberar espacio o pasar a Pro para más.';
}

/** Convierte un error de upload de Supabase Storage en un mensaje amigable para el usuario. */
export function toFriendlyUploadError(error: unknown): Error {
  if (isStorageSizeLimitError(error as { statusCode?: string | number; message?: string })) {
    return new Error('El documento supera el tamaño máximo permitido de 20 MB.');
  }
  return new Error('No se pudo subir el PDF. Inténtalo de nuevo.');
}
