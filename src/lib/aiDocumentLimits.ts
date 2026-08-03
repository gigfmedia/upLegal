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

/** Convierte un error de upload de Supabase Storage en un mensaje amigable para el usuario. */
export function toFriendlyUploadError(error: unknown): Error {
  if (isStorageSizeLimitError(error as { statusCode?: string | number; message?: string })) {
    return new Error('El documento supera el tamaño máximo permitido de 20 MB.');
  }
  return new Error('No se pudo subir el PDF. Inténtalo de nuevo.');
}
