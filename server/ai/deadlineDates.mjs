// ---------------------------------------------------------------------------
// FASE 4.60B.2 — normalización determinista de fechas de plazos estructurados.
// Solo formatea fechas calendario explícitas ya presentes en la salida del
// modelo. NO calcula plazos, NO infiere días hábiles, NO usa calendarios.
// Todo lo ambiguo ("dentro de quinto día...") se preserva verbatim para que
// la promoción 4.60B NO pre-rellene fecha (parseSupportedDeadlineDate solo
// acepta AAAA-MM-DD estricto).
// ---------------------------------------------------------------------------

const MESES = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};

function pad2(n) {
  return String(n).padStart(2, '0');
}

function isValidCalendarDate(y, m, d) {
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return false;
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

/**
 * Normaliza una fecha de plazo a AAAA-MM-DD solo cuando es una fecha
 * calendario explícita e inequívoca. El resto se devuelve verbatim.
 * @param {unknown} raw
 * @returns {string}
 */
export function normalizeDeadlineDate(raw) {
  if (raw == null) return '';
  const s = String(raw).trim();
  if (!s) return '';

  // Ya normalizada: validar calendario real (rechaza 2026-02-30, 2026-13-40).
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    return isValidCalendarDate(y, mo, d) ? `${m[1]}-${m[2]}-${m[3]}` : s;
  }

  // Forma larga española: "15 de octubre de 2026" (tolerante a mayúsculas y tildes).
  m = s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .match(/^(\d{1,2})\s+de\s+([a-z]+)\s+de\s+(\d{4})$/);
  if (m) {
    const d = Number(m[1]);
    const mo = MESES[m[2]];
    const y = Number(m[3]);
    if (mo && isValidCalendarDate(y, mo, d)) return `${y}-${pad2(mo)}-${pad2(d)}`;
    return s;
  }

  // Numérica orden chileno DD-MM-AAAA (separadores / . -).
  m = s.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);
  if (m) {
    const d = Number(m[1]);
    const mo = Number(m[2]);
    const y = Number(m[3]);
    if (isValidCalendarDate(y, mo, d)) return `${y}-${pad2(mo)}-${pad2(d)}`;
    return s;
  }

  // Plazo relativo o texto ambiguo: verbatim, sin calcular nada.
  return s;
}

/**
 * Normaliza un item de deadline del esquema a { date, description }.
 * @param {unknown} item
 * @returns {{ date: string, description: string }}
 */
export function normalizeDeadlineItem(item) {
  if (typeof item === 'string') return { date: '', description: item };
  const d = item && typeof item === 'object' ? item : {};
  return {
    date: normalizeDeadlineDate(d.date),
    description: String(d.description ?? ''),
  };
}
