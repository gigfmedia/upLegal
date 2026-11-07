import {
  DISPOSABLE_EMAIL_DOMAINS,
  GENERIC_EMAIL_LOCAL_PARTS,
  ROLE_EMAIL_LOCAL_PARTS,
} from './constants.mjs';

const EMAIL_RE = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;
const PROSPECT_LOCAL_RE = /^[a-z][a-z0-9._'-]*$/i;
const CL_SECOND_LEVEL = new Set(['com', 'gob', 'net', 'org', 'mil', 'edu', 'int', 'nom']);

const HEADING_WORDS = new Set([
  'abogado', 'abogada', 'abogados', 'abogadas', 'actualidad', 'area', 'área',
  'areas', 'áreas', 'calculadora', 'calculadoras', 'contacto', 'copropiedad',
  'derecho', 'equipo', 'especialidades', 'estudio', 'firma', 'inicio',
  'juridico', 'jurídico', 'legal', 'nuestra', 'nuestro', 'operaciones', 'practica',
  'práctica', 'profesionales', 'quienes', 'quiénes', 'servicios', 'somos',
]);

const NON_NAME_WORDS = new Set([
  ...HEADING_WORDS,
  'accidente', 'causas', 'centro', 'chile', 'como', 'cómo', 'expertos', 'funciona',
  'home', 'laboral', 'mar', 'navegacion', 'navegación', 'penal', 'penales',
  'penalista', 'principal', 'valparaiso', 'valparaíso', 'vina', 'viña',
]);

const NAME_PARTICLES = new Set(['de', 'del', 'la', 'las', 'los', 'y']);

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

/**
 * Sintaxis general. No decide si el correo es de una persona o de una firma.
 */
export function isValidEmailSyntax(email) {
  const value = normalizeEmail(email);
  if (!value || value.length > 320) return false;
  if (!EMAIL_RE.test(value)) return false;
  const [local, domain] = value.split('@');
  if (!local || !domain) return false;
  if (local.length > 64) return false;
  if (local.startsWith('.') || local.endsWith('.') || local.startsWith("'") || local.endsWith("'")) return false;
  if (local.includes('..')) return false;
  if (domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) return false;
  return true;
}

/**
 * Sintaxis apta para prospección: un local que empieza con dígito o apóstrofe
 * suele ser un dato mal extraído del HTML, no una casilla real.
 */
export function isProspectEmailSyntax(email) {
  const value = normalizeEmail(email);
  if (!isValidEmailSyntax(value)) return false;
  const local = value.split('@')[0] || '';
  if (!PROSPECT_LOCAL_RE.test(local)) return false;
  if (!/^[a-z]/i.test(local)) return false;
  return true;
}

export function isCompositeGenericLocal(local) {
  const base = String(local || '').split('+')[0].replace(/[._-]/g, '');
  if (base.length < 8) return false;
  const tokens = [...GENERIC_EMAIL_LOCAL_PARTS]
    .filter((token) => token.length >= 4 && /^[a-z]+$/.test(token))
    .sort((a, b) => b.length - a.length);
  const memo = new Map();
  const canSplit = (index) => {
    if (index === base.length) return true;
    if (memo.has(index)) return memo.get(index);
    for (const token of tokens) {
      if (!base.startsWith(token, index)) continue;
      if (canSplit(index + token.length)) {
        memo.set(index, true);
        return true;
      }
    }
    memo.set(index, false);
    return false;
  };
  return canSplit(0);
}

export function isRoleEmail(email) {
  const value = normalizeEmail(email);
  const local = value.split('@')[0] || '';
  if (!local) return true;
  const base = local.split('+')[0];
  if (ROLE_EMAIL_LOCAL_PARTS.has(base)) return true;
  if (isCompositeGenericLocal(base)) return true;
  return /^(contacto|info|admin|administracion|ventas|comercial|comunicaciones|copropiedad|soporte|hola|mail|correo|secretaria|oficina|reclamos|notificaciones)[._-]/.test(base);
}

export function isGenericEmail(email) {
  const local = normalizeEmail(email).split('@')[0] || '';
  if (!local) return true;
  return GENERIC_EMAIL_LOCAL_PARTS.has(local.split('+')[0]) || isRoleEmail(email);
}

/**
 * Detecta direcciones de firma como prieto@prieto.cl o
 * magasich@magasichycia.cl: el local repite el nombre del dominio.
 */
export function isFirmStyleEmail(email) {
  const value = normalizeEmail(email);
  const [local, domain] = value.split('@');
  if (!local || !domain) return false;
  const localBase = local.split('+')[0].replace(/[._-]/g, '');
  if (localBase.length < 5) return false;
  const domainLabel = domain.split('.')[0] || '';
  if (!domainLabel) return false;
  if (domainLabel === localBase) return true;
  if (domainLabel.startsWith(localBase) && domainLabel.length > localBase.length + 2) return true;
  const remainder = localBase.startsWith(domainLabel) ? localBase.slice(domainLabel.length) : '';
  return /^(asociados?|abogad[oa]s?|estudios?|firma|legal|contacto|info|correo)$/.test(remainder);
}

/**
 * Al extraer texto HTML sin separadores se concatenan etiquetas y nombres:
 * "Larronde" + "Socio" + "alvaro.troncoso" termina en un local corrupto.
 */
export function isCorruptedEmailLocal(local) {
  const base = String(local || '').split('+')[0];
  if (!base) return true;
  if (ROLE_EMAIL_LOCAL_PARTS.has(base)) return false;
  return /[a-z](socio|abogad[oa]|contacto|correo)[a-z]/i.test(base);
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

export function classifyProspectEmail(email, { pageUrl = null } = {}) {
  const normalized = normalizeEmail(email);
  if (!isProspectEmailSyntax(normalized)) {
    return { normalized, kind: 'invalid', reason: 'invalid_syntax', local: null, domain: null };
  }
  const [local, domain] = normalized.split('@');
  if (isDisposableEmail(normalized)) {
    return { normalized, kind: 'invalid', reason: 'disposable_domain', local, domain };
  }
  if (pageUrl && !emailBelongsToPage(normalized, pageUrl)) {
    return { normalized, kind: 'third_party', reason: 'third_party_domain', local, domain };
  }
  if (isRoleEmail(normalized)) {
    return { normalized, kind: 'role', reason: 'role_address', local, domain };
  }
  if (isFirmStyleEmail(normalized)) {
    return { normalized, kind: 'firm', reason: 'firm_address', local, domain };
  }
  if (isCorruptedEmailLocal(local)) {
    return { normalized, kind: 'invalid', reason: 'corrupted_local_part', local, domain };
  }
  return { normalized, kind: 'personal', reason: null, local, domain };
}

/**
 * Valida sintaxis de prospección, calidad del local y existencia de MX.
 * `resolveMx` se inyecta para poder probar sin red.
 */
export async function validateEmail(email, { resolveMx, timeoutMs = 4000, pageUrl = null } = {}) {
  const classification = classifyProspectEmail(email, { pageUrl });
  const normalized = classification.normalized;
  if (classification.kind !== 'personal') {
    return {
      valid: false,
      status: 'invalid',
      normalized,
      reason: classification.reason,
      email_kind: classification.kind,
      mailbox_verified: false,
    };
  }

  const domain = normalized.split('@')[1];
  if (typeof resolveMx !== 'function') {
    return {
      valid: false,
      status: 'unknown',
      normalized,
      reason: 'mx_not_configured',
      email_kind: 'personal',
      mailbox_verified: false,
    };
  }

  try {
    const records = await withTimeout(Promise.resolve(resolveMx(domain)), timeoutMs);
    if (!Array.isArray(records) || records.length === 0) {
      return {
        valid: false,
        status: 'invalid',
        normalized,
        reason: 'no_mx_records',
        email_kind: 'personal',
        mailbox_verified: false,
      };
    }
    return {
      valid: true,
      status: 'valid',
      normalized,
      reason: null,
      email_kind: 'personal',
      // MX prueba que el dominio recibe correo, no que la casilla exista.
      mailbox_verified: false,
    };
  } catch (error) {
    if (error?.code === 'ENOTFOUND' || error?.code === 'ENODATA') {
      return {
        valid: false,
        status: 'invalid',
        normalized,
        reason: 'domain_not_found',
        email_kind: 'personal',
        mailbox_verified: false,
      };
    }
    return {
      valid: false,
      status: 'unknown',
      normalized,
      reason: 'mx_lookup_failed',
      email_kind: 'personal',
      mailbox_verified: false,
    };
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
  const name = normalizeContactName(value);
  if (!name) return false;
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 5) return false;
  if (!words.every((word) => /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ'.-]+$/.test(word))) return false;
  if (name === name.toUpperCase() && words.length >= 2) return false;
  return !words.some((word) => NON_NAME_WORDS.has(word.toLowerCase().replace(/[.'-]/g, '')));
}

export function firstNameFrom(contactName) {
  const name = normalizeContactName(contactName);
  if (!name || !containsHumanName(name)) return null;
  const first = name.split(/\s+/)[0];
  if (!first || first.length < 2 || NAME_PARTICLES.has(first.toLowerCase())) return null;
  return first;
}
