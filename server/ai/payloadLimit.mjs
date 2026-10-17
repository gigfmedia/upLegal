/**
 * Límite de cuerpo coherente con el contrato del editor: PUT de borradores
 * admite hasta 200.000 caracteres; los caracteres UTF-8 pueden ocupar hasta
 * 4 bytes ⇒ 2mb es el límite HTTP mínimo seguro. Los bodies que lo excedan
 * reciben un 413 JSON controlado, sin detalles internos del parseo.
 */

export const PAYLOAD_TOO_LARGE_CODE = 'PAYLOAD_TOO_LARGE';
export const PAYLOAD_TOO_LARGE_RESPONSE = {
  error: 'El contenido excede el tamaño permitido. Reduce el documento e inténtalo de nuevo.',
  code: PAYLOAD_TOO_LARGE_CODE,
};

export function isPayloadTooLargeError(error) {
  if (!error || typeof error !== 'object') return false;
  if (error.type === 'entity.too.large') return true;
  return error.status === 413 || error.statusCode === 413;
}

/**
 * Middleware de error: solo transforma el 413 del parser (body-parser) y deja
 * cualquier otro error al siguiente handler (comportamiento existente intacto).
 */
export function serverPayloadTooLargeMiddleware(error, req, res, next) {
  if (!isPayloadTooLargeError(error)) return next(error);
  return res.status(413).json(PAYLOAD_TOO_LARGE_RESPONSE);
}
