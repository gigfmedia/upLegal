import {
  classifyProspectEmail,
  containsHumanName,
  normalizeContactName,
  normalizeDomain,
  normalizeEmail,
  normalizeFirmName,
  registrableDomain,
} from './validation.mjs';

const PUBLIC_ENTITY_DOMAINS = new Set([
  'providencia.cl', 'lascondes.cl', 'vitacura.cl', 'nunoa.cl', 'maipu.cl',
  'puentealto.cl', 'lareina.cl', 'colina.cl', 'lo-barnechea.cl', 'sanmiguel.cl',
  'lacisterna.cl', 'santiago.cl', 'concepcion.cl', 'valparaiso.cl',
  'vinadelmar.cl', 'temuco.cl', 'antofagasta.cl', 'laserena.cl', 'iquique.cl',
  'arica.cl', 'talca.cl', 'rancagua.cl', 'chillan.cl', 'puertomontt.cl',
]);

const PUBLIC_ENTITY_SUFFIXES = ['.gob.cl', '.gob', '.gov', '.mil'];
const SCHOOL_SUFFIXES = ['.edu.cl', '.edu'];
const SCHOOL_WORDS = /\b(colegio|liceo|escuela|universidad|education|school)\b/i;
const SCHOOL_SITE_WORDS = /\b(matr[ií]cula|matriculas?|apoderad[oa]s?|alumn[oa]s?|admisi[oó]n escolar|ense[nñ]anza (?:b[aá]sica|media|parvularia)|prek[ií]nder|k[ií]nder)\b/i;
const SCHOOL_NAME_HINTS = /\b(ss\.?cc|colegio|liceo|escuela|universidad|instituto|academia)\b/i;
const PORTAL_WORDS = /\b(directorio|portal|guia|guía|buscador|encuentra abogados|abogados por especialidad|marketplace)\b/i;
const PORTAL_HOSTS = /(abogadopro|directorio|guialegal|legalpro)/i;
const LAW_FIRM_STRONG = /\b(abogad(?:o|a|os|as)|abogac[ií]a|bufetes?|law\s+firms?|legal(?:es)?|derechos?|jur[ií]dic(?:o|a|os|as)|litigaci[oó]n|attorneys?|solicitors?)\b/i;
const LAW_FIRM_WEAK = /\b(estudios?|firmas?|asociados?|compa[nñ][ií]a)\b/i;
const STRUCTURED_LEGAL_TYPES = new Set(['legalservice', 'lawfirm', 'attorney']);
const LEAD_GEN_WORDS = /\b(gratis|paga solo por resultados|consulta gratis|calculadoras?|publica tu caso|encuentra (?:un )?abogado|marketplace|directorio|ranking)\b/i;
const GENERIC_FIRM_NAMES = /^(abogad[oa]s?|abogadas?|asesor(?:[ií]a)?(?: legal| penal)?|asesor penal|estudio(?: jurídico)?|firma|firma de abogados|legal|derecho|inicio|home|contacto|nuestra firma|qui[eé]nes somos|quienes somos|servicios|equipo)$/i;
const SENTENCE_FIRM_WORDS = /\b(conf[ií]e|conf[ií]a|nosotros|somos|tu|tus|nuestra|nuestro|experiencia|comprometid[oa]|cercan[oa]|creativ[oa]|fundad[oa]|especializa|bienvenid[oa]s?|cont[aá]ctanos|con[oó]cenos)\b/i;

function splitIdentityCandidates(value) {
  return String(value || '')
    .split(/\s*[|·–—]\s*|\s+-\s+/)
    .map((part) => normalizeFirmName(part))
    .filter(Boolean);
}

function isPlausibleFirmName(value) {
  const name = normalizeFirmName(value);
  if (!name || name.length < 3 || name.length > 120) return false;
  if (GENERIC_FIRM_NAMES.test(name)) return false;
  if (SENTENCE_FIRM_WORDS.test(name)) return false;
  if (LEAD_GEN_WORDS.test(name)) return false;
  if (/^(abogad[oa]s?\s+(en|de|para)\s+)/i.test(name)) return false;
  if (/^abogad[oa]s?\b/i.test(name) && !/[&]|asociados?|compa[nñ][ií]a|c[ií]a\.?/i.test(name)) return false;
  if (/^(chile|santiago|providencia|las condes|vitacura|vi[nñ]a del mar|valpara[ií]so|concepci[oó]n)$/i.test(name)) return false;
  return name.split(/\s+/).length <= 8;
}

function hasStructuredLegalType(jsonLdTypes) {
  return [].concat(jsonLdTypes || [])
    .map((type) => String(type || '').toLowerCase())
    .some((type) => STRUCTURED_LEGAL_TYPES.has(type));
}

function evaluateOrganization({
  website = null,
  firmName = null,
  text = '',
  sourceUrl = null,
  email = null,
  sourceTitle = null,
  sourceH1 = null,
  metaDescription = null,
  jsonLdTypes = [],
  siteSignals = null,
} = {}) {
  const identityText = [firmName, sourceTitle, sourceH1, metaDescription, text]
    .filter(Boolean)
    .join(' ');
  const schoolText = [sourceTitle, sourceH1, metaDescription, siteSignals, text]
    .filter(Boolean)
    .join(' ');
  const haystack = [
    website,
    firmName,
    text,
    sourceUrl,
    email,
    sourceTitle,
    sourceH1,
    metaDescription,
    siteSignals,
    ...[].concat(jsonLdTypes || []),
  ].filter(Boolean).join(' ').toLowerCase();
  const host = normalizeDomain(website || sourceUrl || (email ? String(email).split('@')[1] : '') || '');
  const domain = host ? registrableDomain(host) : '';

  if (PUBLIC_ENTITY_DOMAINS.has(host) || PUBLIC_ENTITY_DOMAINS.has(domain)) {
    return { orgType: 'public_entity', reviewReason: null };
  }
  if (PUBLIC_ENTITY_SUFFIXES.some((suffix) => host.endsWith(suffix))) {
    return { orgType: 'public_entity', reviewReason: null };
  }
  if (/\b(municipalidad|gobierno regional|servicio publico|servicio público|reparticion publica|repartición pública)\b/i.test(haystack)) {
    return { orgType: 'public_entity', reviewReason: null };
  }

  if (SCHOOL_SUFFIXES.some((suffix) => host.endsWith(suffix)) || SCHOOL_WORDS.test(schoolText) || SCHOOL_SITE_WORDS.test(schoolText)) {
    return { orgType: 'school', reviewReason: null };
  }

  if (PORTAL_HOSTS.test(host) || PORTAL_WORDS.test(haystack)) {
    return { orgType: 'portal', reviewReason: null };
  }

  const schoolHint = SCHOOL_NAME_HINTS.test([website, firmName, sourceTitle, sourceH1].filter(Boolean).join(' '));
  if (schoolHint) return { orgType: 'other', reviewReason: 'organization_school_ambiguity' };

  const structuredLegal = hasStructuredLegalType(jsonLdTypes);
  const strongLegal = structuredLegal || LAW_FIRM_STRONG.test(haystack);
  const weakLegal = LAW_FIRM_WEAK.test(haystack);
  if (!strongLegal) {
    return {
      orgType: 'other',
      reviewReason: weakLegal ? 'organization_legal_evidence_missing' : null,
    };
  }

  const identityNames = [
    firmName,
    sourceH1,
    ...splitIdentityCandidates(sourceTitle),
  ].filter(Boolean);
  const hasPlausibleName = identityNames.some(isPlausibleFirmName);
  const leadGenRisk = LEAD_GEN_WORDS.test(identityText.slice(0, 800));
  if (leadGenRisk) return { orgType: 'law_firm', reviewReason: 'organization_lead_gen_risk' };
  if (!hasPlausibleName) {
    return { orgType: 'law_firm', reviewReason: 'organization_weak_identity' };
  }
  return { orgType: 'law_firm', reviewReason: null };
}

export function classifyOrganization(input = {}) {
  return evaluateOrganization(input).orgType;
}

export function isLikelyPersonName(value) {
  return containsHumanName(value);
}

export function buildPersonKey(contactName) {
  const name = normalizeContactName(contactName);
  if (!name || !containsHumanName(name)) return null;
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120) || null;
}

export function buildDomainKey({ email = null, website = null } = {}) {
  const emailDomain = normalizeEmail(email).split('@')[1] || '';
  const host = emailDomain || website;
  if (!host) return null;
  const domain = registrableDomain(normalizeDomain(host));
  return domain || null;
}

export function assessCandidateQuality(candidate, { pageUrl = null } = {}) {
  const sourceUrl = candidate.source_url || pageUrl || candidate.website || null;
  const classification = candidate.email
    ? classifyProspectEmail(candidate.email, { pageUrl: sourceUrl })
    : { kind: null, reason: null, normalized: null };
  const contactName = isLikelyPersonName(candidate.contact_name)
    ? normalizeContactName(candidate.contact_name)
    : null;
  const organization = evaluateOrganization({
    website: candidate.website,
    firmName: candidate.firm_name,
    text: candidate.description,
    sourceUrl,
    email: candidate.email,
    sourceTitle: candidate.sourceTitle ?? candidate.source_title ?? null,
    sourceH1: candidate.sourceH1 ?? candidate.source_h1 ?? null,
    metaDescription: candidate.metaDescription ?? candidate.meta_description ?? null,
    jsonLdTypes: candidate.jsonLdTypes ?? candidate.json_ld_types ?? [],
    siteSignals: candidate.siteSignals ?? candidate.site_signals ?? null,
  });
  const orgType = organization.orgType;

  let reviewReason = organization.reviewReason;
  if (classification.reason === 'corrupted_local_part') {
    reviewReason = reviewReason || 'email_corrupted_local_part';
  }
  let rejectionReason = candidate.rejection_reason || null;
  let status = candidate.status || 'new';
  let validationStatus = candidate.validation_status || 'pending';

  if (orgType !== 'law_firm') {
    rejectionReason = reviewReason || rejectionReason || `organization_${orgType}`;
    status = 'excluded';
    validationStatus = 'invalid';
  } else if (reviewReason) {
    rejectionReason = reviewReason;
    status = 'excluded';
    validationStatus = 'invalid';
  } else if (classification.kind && classification.kind !== 'personal') {
    rejectionReason = rejectionReason || classification.reason;
    status = 'excluded';
    validationStatus = 'invalid';
  }

  return {
    ...candidate,
    contact_name: contactName,
    email_kind: classification.kind,
    org_type: orgType,
    review_required: Boolean(reviewReason),
    review_reason: reviewReason,
    rejection_reason: rejectionReason,
    person_key: buildPersonKey(contactName),
    domain_key: buildDomainKey({ email: candidate.email, website: candidate.website }),
    mailbox_verified: false,
    status,
    validation_status: validationStatus,
  };
}

export function selectEligibleContacts(rows, { allowMultipleContactsPerFirm = false, limit = rows.length } = {}) {
  const selected = [];
  const seenPeople = new Set();
  const seenDomains = new Set();

  for (const row of rows) {
    if (selected.length >= limit) break;
    const personKey = row.person_key || buildPersonKey(row.contact_name);
    const domainKey = row.domain_key || buildDomainKey({ email: row.email, website: row.website });
    if (personKey && seenPeople.has(personKey)) continue;
    if (!allowMultipleContactsPerFirm && domainKey && seenDomains.has(domainKey)) continue;
    if (personKey) seenPeople.add(personKey);
    if (!allowMultipleContactsPerFirm && domainKey) seenDomains.add(domainKey);
    selected.push(row);
  }
  return selected;
}
