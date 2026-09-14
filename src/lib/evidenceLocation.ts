/**
 * 4.34C — ubicación honesta de evidencia documental.
 * La extracción no preserva páginas físicas del PDF (texto concatenado +
 * chunks por ventana de caracteres), por lo que un índice de chunk nunca debe
 * presentarse como página física. `page_number` queda reservado (null) para un
 * futuro tracking certificado; la UI muestra "Fragmento N".
 */

/** "Fragmento N" (1-based) desde un fragment_id `document::<docId>::<idx>`, o null. */
export function fragmentLabelFromId(fragmentId?: string | null): string | null {
  if (!fragmentId) return null;
  const n = parseInt(fragmentId.split('::').pop() || '', 10);
  return Number.isFinite(n) ? `Fragmento ${n + 1}` : null;
}
