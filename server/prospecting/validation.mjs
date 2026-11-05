import { GENERIC_EMAIL_LOCAL_PARTS, DISPOSABLE_EMAIL_DOMAINS } from './constants.mjs';

const EMAIL_RE = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;
const CL_SECOND_LEVEL = new Set(['com', 'gob', 'net', 'org', 'mil', 'edu', 'int', 'nom']);

export function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

export function normalizeDomain(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';
  try {
    const url = raw.includes('://') ? new URL(raw) : new URL(`https://${raw}`);
    return url.hostname.replace(/^www\./, '').replace(/\.$/, '');
  } catch {
    return raw.replace(/^www\./, '').replace(/\/.*$/, '').replace(/\.$/, '');
  }
}

export function registrableDomain(hostname) {
  const host = normalizeDomain(hostname);
  if (!host || !host.includes('.')) return host;
  const parts = host.split('.');
  const tld = parts[parts.length - 1];
  const second = parts[parts.length - 2];
  if (tld === 'cl' && CL_SECOND_LEVEL.has(second) && parts.length >= 3) {
    return parts.slice(-3).join('.');
  }
  return parts.slice(-2).join('.');
}

export function isValidEmailSyntax(email) {
  const value = normalizeEmail(email);
  if (!value || value.length > 320) return false;
  if (!EMAIL_RE.test(value)) return false;
  const [local, domain] = value.split('@');
  if (!local || !domain) return false;
  if (local.length > 64) return false;
  if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) return false;
  if (domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) return false;
  return true;
}

export function isGenericEmail(email) {
  const value = normalizeEmail(email);
  const local = value.split('@')[0] || '';
  if (!local) return true;
  const base = local.split('+')[0];
  if (GENERIC_EMAIL_LOCAL_PARTS.has(base)) return true;
  if (/^(contacto|info|admin|ventas|comercial|soporte|hola|mail|correo|secretaria|oficina)[._-]/.test(base)) return true;
  return false;
}

export function isDisposableEmail(email) {
  const domain = normalizeEmail(email).split('@')[1] || '';
  if (!domain) return true;
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) return true;
  return [...DISPOSABLE_EMAIL_DOMAINS].some((blocked) => domain.endsWith(`.${blocked}`));
}

/**
 * Un email publicado en un sitio del propio estudio es aceptable; uno que
 * aparece en un directorio de terceros no se usa para contactar.
 */
export function emailBelongsToPage(email, pageUrl) {
  const domain = normalizeEmail(email).split('@')[1] || '';
  if (!domain) return false;
  let host;
  try {
    host = new URL(pageUrl).hostname;
  } catch {
    return false;
  }
  const pageDomain = normalizeDomain(host);
  return domain === pageDomain
    || pageDomain.endsWith(`.${domain}`)
    || domain.endsWith(`.${pageDomain}`)
    || registrableDomain(domain) === registrableDomain(pageDomain);
}

/**
 * Valida sintaxis, dominio desechable y existencia de MX.
 * `resolveMx` se inyecta para poder probar sin red.
 */
export async function validateEmail(email, { resolveMx, timeoutMs = 4000 } = {}) {
  const normalized = normalizeEmail(email);
  if (!isValidEmailSyntax(normalized)) {
    return { valid: false, status: 'invalid', normalized, reason: 'invalid_syntax' };
  }
  if (isGenericEmail(normalized)) {
    return { valid: false, status: 'invalid', normalized, reason: 'generic_address' };
  }
  if (isDisposableEmail(normalized)) {
    return { valid: false, status: 'invalid', normalized, reason: 'disposable_domain' };
  }

  const domain = normalized.split('@')[1];
  if (typeof resolveMx !== 'function') {
    return { valid: false, status: 'unknown', normalized, reason: 'mx_not_configured' };
  }

  try {
    const records = await withTimeout(Promise.resolve(resolveMx(domain)), timeoutMs);
    if (!Array.isArray(records) || records.length === 0) {
      return { valid: false, status: 'invalid', normalized, reason: 'no_mx_records' };
    }
    return { valid: true, status: 'valid', normalized, reason: null };
  } catch (error) {
    if (error?.code === 'ENOTFOUND' || error?.code === 'ENODATA') {
      return { valid: false, status: 'invalid', normalized, reason: 'domain_not_found' };
    }
    return { valid: false, status: 'unknown', normalized, reason: 'mx_lookup_failed' };
  }
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const error = new Error('timeout');
      error.code = 'ETIMEOUT';
      reject(error);
    }, ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}

export function normalizeContactName(value) {
  const raw = String(value || '').replace(/\s+/g, ' ').trim();
  if (!raw) return null;
  return raw
    .replace(/\s*[|·–—-]\s*(abogad[oa]s?|estudio jurídico|legal|law firm).*$/i, '')
    .replace(/^(abogad[oa]|dr\.?|dra\.?)\s+/i, '')
    .trim()
    .slice(0, 120) || null;
}

export function normalizeFirmName(value) {
  const raw = String(value || '').replace(/\s+/g, ' ').trim();
  if (!raw) return null;
  return raw
    .replace(/\s*[|·–—-]\s*(inicio|home|abogad[oa]s?|estudio jurídico).*$/i, '')
    .trim()
    .slice(0, 200) || null;
}

export function containsHumanName(value) {
  const name = String(value || '').trim();
  if (!name) return false;
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 5) return false;
  return words.every((word) => /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ'.-]+$/.test(word));
}

export function firstNameFrom(contactName) {
  const name = normalizeContactName(contactName);
  if (!name) return null;
  const first = name.split(/\s+/)[0];
  if (!first || first.length < 2) return null;
  return first;
}
