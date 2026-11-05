import { load } from 'cheerio';
import {
  BLOCKED_PAGE_HOSTS,
  CHILE_CITIES,
  SPECIALTY_KEYWORDS,
  MAX_PAGES_PER_RUN,
  PAGE_FETCH_TIMEOUT_MS,
  PAGE_FETCH_CONCURRENCY,
  PAGE_FETCH_DELAY_MS,
  MAX_DESCRIPTION_LENGTH,
} from './constants.mjs';
import {
  containsHumanName,
  emailBelongsToPage,
  isGenericEmail,
  isDisposableEmail,
  isValidEmailSyntax,
  normalizeContactName,
  normalizeDomain,
  normalizeEmail,
  normalizeFirmName,
  validateEmail,
} from './validation.mjs';

const USER_AGENT = 'LegalUpProspectingBot/1.0 (+https://legalup.cl; contacto: juan@legalup.cl)';
const MAX_HTML_BYTES = 1_200_000;

export function createSearchProvider({ env = process.env, fetchImpl = globalThis.fetch } = {}) {
  const doFetch = fetchImpl || globalThis.fetch;
  if (env.SERPER_API_KEY) {
    return {
      name: 'serper',
      async search(query, limit = 10) {
        const response = await doFetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: {
            'X-API-KEY': env.SERPER_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ q: query, gl: 'cl', hl: 'es', num: Math.min(10, limit) }),
        });
        if (!response.ok) throw new Error(`serper_http_${response.status}`);
        const data = await response.json();
        return (data.organic || []).map((item) => ({
          title: item.title || '',
          url: item.link || '',
          snippet: item.snippet || '',
        }));
      },
    };
  }

  if (env.BRAVE_SEARCH_API_KEY) {
    return {
      name: 'brave',
      async search(query, limit = 10) {
        const url = new URL('https://api.search.brave.com/res/v1/web/search');
        url.searchParams.set('q', query);
        url.searchParams.set('country', 'cl');
        url.searchParams.set('search_lang', 'es');
        url.searchParams.set('count', String(Math.min(20, limit)));
        const response = await doFetch(url.toString(), {
          headers: {
            Accept: 'application/json',
            'X-Subscription-Token': env.BRAVE_SEARCH_API_KEY,
          },
        });
        if (!response.ok) throw new Error(`brave_http_${response.status}`);
        const data = await response.json();
        return (data.web?.results || []).map((item) => ({
          title: item.title || '',
          url: item.url || '',
          snippet: item.description || '',
        }));
      },
    };
  }

  if (env.GOOGLE_CSE_API_KEY && env.GOOGLE_CSE_CX) {
    return {
      name: 'google_cse',
      async search(query, limit = 10) {
        const url = new URL('https://www.googleapis.com/customsearch/v1');
        url.searchParams.set('key', env.GOOGLE_CSE_API_KEY);
        url.searchParams.set('cx', env.GOOGLE_CSE_CX);
        url.searchParams.set('q', query);
        url.searchParams.set('gl', 'cl');
        url.searchParams.set('hl', 'es');
        url.searchParams.set('num', String(Math.min(10, limit)));
        const response = await doFetch(url.toString());
        if (!response.ok) throw new Error(`google_cse_http_${response.status}`);
        const data = await response.json();
        return (data.items || []).map((item) => ({
          title: item.title || '',
          url: item.link || '',
          snippet: item.snippet || '',
        }));
      },
    };
  }

  return null;
}

export function buildSearchQueries({ target = 100, cities = CHILE_CITIES, specialties = Object.keys(SPECIALTY_KEYWORDS) } = {}) {
  const desired = Math.max(12, Math.min(40, Math.ceil(target / 6)));
  const queries = [];
  const seen = new Set();
  const push = (query) => {
    const normalized = String(query || '').replace(/\s+/g, ' ').trim();
    if (!normalized || seen.has(normalized.toLowerCase())) return;
    seen.add(normalized.toLowerCase());
    queries.push(normalized);
  };

  const priorityCities = ['Santiago', 'Providencia', 'Las Condes', 'Viña del Mar', 'Valparaíso', 'Concepción', 'Temuco', 'La Serena', 'Antofagasta', 'Talca', ...cities];
  const prioritySpecialties = ['Derecho laboral', 'Derecho de familia', 'Derecho civil', 'Derecho penal', 'Derecho tributario', 'Derecho comercial', ...specialties];

  let index = 0;
  while (queries.length < desired && index < priorityCities.length * prioritySpecialties.length) {
    const city = priorityCities[index % priorityCities.length];
    const specialty = prioritySpecialties[index % prioritySpecialties.length];
    push(`abogado ${specialty.replace(/^Derecho /, '')} ${city} Chile`);
    push(`estudio jurídico ${city} Chile`);
    index += 1;
  }
  for (const city of priorityCities) {
    if (queries.length >= desired) break;
    push(`abogados ${city} Chile`);
  }
  return queries.slice(0, desired);
}

export function isBlockedUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return true;
  }
  if (!/^https?:$/.test(parsed.protocol)) return true;
  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  if (BLOCKED_PAGE_HOSTS.has(host)) return true;
  return [...BLOCKED_PAGE_HOSTS].some((blocked) => host.endsWith(`.${blocked}`));
}

export function parseRobots(robotsTxt) {
  const groups = [];
  let current = null;
  for (const rawLine of String(robotsTxt || '').split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) continue;
    const colon = line.indexOf(':');
    if (colon < 0) continue;
    const key = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (key === 'user-agent') {
      if (!current || current.rules.length > 0) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
    } else if ((key === 'allow' || key === 'disallow') && current) {
      if (value) current.rules.push({ type: key, path: value });
    }
  }
  return groups;
}

export function isAllowedByRobots(robotsTxt, targetUrl, userAgent = USER_AGENT) {
  if (!robotsTxt) return true;
  let parsed;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return false;
  }
  const path = `${parsed.pathname || '/'}${parsed.search || ''}`;
  const ua = String(userAgent).toLowerCase();
  const groups = parseRobots(robotsTxt);
  const matched = groups.filter((group) =>
    group.agents.some((agent) => agent === '*' || ua.includes(agent.replace(/[^a-z0-9._-]/g, '')))
  );
  const rules = matched.flatMap((group) => group.rules);
  if (rules.length === 0) return true;

  let decision = true;
  let bestLength = -1;
  for (const rule of rules) {
    const pattern = rule.path;
    const matches = pattern === '/' || path.startsWith(pattern.replace(/\*.*$/, ''));
    if (!matches) continue;
    const length = pattern.replace(/\*/g, '').length;
    if (length > bestLength || (length === bestLength && rule.type === 'allow')) {
      bestLength = length;
      decision = rule.type === 'allow';
    }
  }
  return decision;
}

export async function discoverProspects({
  settings,
  target = 100,
  env = process.env,
  fetchImpl = globalThis.fetch,
  resolveMx,
  logger = console,
  maxPages = MAX_PAGES_PER_RUN,
  clock = () => new Date(),
} = {}) {
  const doFetch = fetchImpl || globalThis.fetch;
  const provider = createSearchProvider({ env, fetchImpl: doFetch });
  if (!provider) {
    return {
      candidates: [],
      reason: 'discovery_provider_not_configured',
      stats: { provider: null, queries: 0, pages: 0, skipped: 0 },
    };
  }

  const queries = buildSearchQueries({ target });
  const results = [];
  const seenUrls = new Set();
  const stats = { provider: provider.name, queries: 0, pages: 0, skipped: 0, errors: [] };

  for (const query of queries) {
    stats.queries += 1;
    try {
      const batch = await provider.search(query, 10);
      for (const item of batch) {
        const url = normalizeUrl(item.url);
        if (!url || seenUrls.has(url) || isBlockedUrl(url)) continue;
        seenUrls.add(url);
        results.push({ ...item, url, query });
      }
    } catch (error) {
      stats.errors.push({ query, error: String(error?.message || error) });
      logger.warn?.('[Prospecting] search failed', { query, error: error?.message || error });
    }
    if (results.length >= maxPages * 2) break;
  }

  const robotsCache = new Map();
  const mxCache = new Map();
  const candidates = [];
  const candidateKeys = new Set();
  const pages = results.slice(0, maxPages);

  const pageResults = await mapWithConcurrency(pages, PAGE_FETCH_CONCURRENCY, async (item) => {
    try {
      const origin = new URL(item.url).origin;
      if (!robotsCache.has(origin)) {
        robotsCache.set(origin, await fetchRobots(origin, doFetch));
      }
      const robots = robotsCache.get(origin);
      if (robots === false) {
        stats.skipped += 1;
        return [];
      }
      if (!isAllowedByRobots(robots, item.url)) {
        stats.skipped += 1;
        return [];
      }
      const html = await fetchHtml(item.url, doFetch);
      if (!html) {
        stats.skipped += 1;
        return [];
      }
      stats.pages += 1;
      return extractCandidatesFromPage(html, item.url, item, { mxCache, resolveMx });
    } catch (error) {
      stats.skipped += 1;
      stats.errors.push({ url: item.url, error: String(error?.message || error) });
      return [];
    } finally {
      await sleep(PAGE_FETCH_DELAY_MS);
    }
  });

  for (const list of pageResults) {
    for (const candidate of list) {
      if (!candidate?.dedupe_key || candidateKeys.has(candidate.dedupe_key)) continue;
      candidateKeys.add(candidate.dedupe_key);
      candidates.push(candidate);
    }
  }

  const validated = await validateCandidateEmails(candidates, { resolveMx, mxCache });
  validated.sort((a, b) => candidateScore(b) - candidateScore(a));
  const limited = validated.slice(0, Math.max(target * 2, target + 25));
  return {
    candidates: limited,
    reason: limited.length === 0 ? 'no_candidates_found' : null,
    stats: { ...stats, discovered: limited.length, at: clock().toISOString() },
  };
}

export function extractCandidatesFromPage(html, pageUrl, searchItem = {}, { resolveMx, mxCache } = {}) {
  const $ = load(html);
  const host = new URL(pageUrl).hostname.replace(/^www\./, '');
  const text = $('body').text().replace(/\s+/g, ' ').trim();
  if (!text && !$('title').text().trim()) return [];

  const jsonLd = extractJsonLd($);
  const firmName = normalizeFirmName(
    jsonLd.organizationName
    || $('meta[property="og:site_name"]').attr('content')
    || $('h1').first().text()
    || splitTitle($('title').first().text())
    || host,
  );
  const contactName = normalizeContactName(
    jsonLd.personName
    || findHumanHeading($, firmName)
    || null,
  );
  const city = jsonLd.city || detectCity(text);
  const specialties = detectSpecialties(`${$('title').text()} ${text}`);
  const description = truncate(
    jsonLd.description
    || $('meta[name="description"]').attr('content')
    || searchItem.snippet
    || text.slice(0, 500),
    MAX_DESCRIPTION_LENGTH,
  );
  const linkedin = jsonLd.linkedin || findLinkedIn($);
  const website = new URL(pageUrl).origin;
  const emails = extractEmails($, pageUrl, text);

  const base = {
    firm_name: firmName || host,
    contact_name: contactName,
    role: contactName ? 'Abogado/a' : 'Estudio jurídico',
    website,
    linkedin_url: linkedin || null,
    city: city || null,
    specialties,
    description: description || null,
    source: `public_web:${searchItem.query ? 'search' : 'direct'}`,
    source_url: pageUrl,
  };

  if (emails.length === 0) {
    return [{
      ...base,
      email: null,
      validation_status: 'no_email',
      status: 'pending_contact',
      dedupe_key: buildStaticDedupeKey(base),
    }];
  }

  return emails.map((email) => ({
    ...base,
    email,
    validation_status: 'pending',
    status: 'new',
    dedupe_key: `email:${normalizeEmail(email)}`,
    _needsMxValidation: true,
    _resolveMx: resolveMx,
    _mxCache: mxCache,
  }));
}

export async function validateCandidateEmails(candidates, { resolveMx, mxCache = new Map() } = {}) {
  const output = [];
  for (const candidate of candidates) {
    if (!candidate.email) {
      output.push({ ...candidate, validation_status: 'no_email', status: 'pending_contact' });
      continue;
    }
    const domain = normalizeEmail(candidate.email).split('@')[1] || '';
    let result = mxCache.get(domain);
    if (!result) {
      result = await validateEmail(candidate.email, { resolveMx });
      mxCache.set(domain, result);
    }
    if (result.status === 'valid') {
      output.push({ ...candidate, validation_status: 'valid', status: 'validated', validated_at: new Date().toISOString() });
    } else if (result.status === 'unknown') {
      output.push({ ...candidate, validation_status: 'unknown', status: 'pending_contact', notes: result.reason });
    } else {
      output.push({ ...candidate, email: null, validation_status: 'no_email', status: 'pending_contact', notes: result.reason, dedupe_key: buildStaticDedupeKey(candidate) });
    }
  }
  return output;
}

export function extractEmails($, pageUrl, text) {
  const found = new Set();
  $('a[href^="mailto:"]').each((_, element) => {
    const href = $(element).attr('href') || '';
    const value = decodeURIComponent(href.replace(/^mailto:/i, '').split('?')[0]).trim();
    if (isValidEmailSyntax(value)) found.add(normalizeEmail(value));
  });
  const regex = /[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+/gi;
  const matches = String(text || '').match(regex) || [];
  for (const value of matches.slice(0, 50)) found.add(normalizeEmail(value));

  return [...found]
    .filter((email) => isValidEmailSyntax(email))
    .filter((email) => emailBelongsToPage(email, pageUrl))
    .filter((email) => !isGenericEmail(email))
    .filter((email) => !isDisposableEmail(email))
    .sort((a, b) => scoreEmail(b) - scoreEmail(a))
    .slice(0, 3);
}

function scoreEmail(email) {
  const local = email.split('@')[0] || '';
  let score = 0;
  if (local.includes('.')) score += 3;
  if (local.length <= 30) score += 1;
  if (/^[a-z]+\.[a-z]+$/.test(local)) score += 2;
  return score;
}

function extractJsonLd($) {
  let organizationName = null;
  let personName = null;
  let city = null;
  let description = null;
  let linkedin = null;
  const types = new Set(['Organization', 'LegalService', 'LawFirm', 'Attorney', 'Person', 'LocalBusiness']);

  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      const raw = JSON.parse($(element).contents().text());
      const nodes = Array.isArray(raw) ? raw : [raw];
      for (const node of nodes.flatMap(flattenGraph)) {
        const nodeTypes = []
          .concat(node['@type'] || [])
          .map((type) => String(type));
        if (!nodeTypes.some((type) => types.has(type))) continue;
        if (!organizationName && (nodeTypes.includes('Organization') || nodeTypes.includes('LegalService') || nodeTypes.includes('LawFirm'))) {
          organizationName = node.name || null;
        }
        if (!personName && (nodeTypes.includes('Person') || nodeTypes.includes('Attorney'))) {
          personName = node.name || null;
        }
        if (!city && node.address?.addressLocality) city = node.address.addressLocality;
        if (!description && node.description) description = node.description;
        if (!linkedin) {
          const sameAs = [].concat(node.sameAs || []).find((link) => /linkedin\.com/i.test(String(link)));
          if (sameAs) linkedin = sameAs;
        }
      }
    } catch {
      // JSON-LD inválido: se ignora, nunca se inventan datos.
    }
  });
  return { organizationName, personName, city, description, linkedin };
}

function flattenGraph(node) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(flattenGraph);
  return [node, ...flattenGraph(node['@graph'])];
}

function findHumanHeading($, firmName = null) {
  const firm = String(firmName || '').toLowerCase();
  for (const selector of ['h1', 'h2', 'h3']) {
    const value = normalizeContactName($(selector).first().text());
    if (!value || !containsHumanName(value)) continue;
    if (firm && value.toLowerCase() === firm) continue;
    if (/estudio|abogad|jurídic|juridic|legal|law firm|asociados|consultores|equipo|nosotros|quiénes|quienes|servicios|contacto/i.test(value)) continue;
    return value;
  }
  return null;
}

function findLinkedIn($) {
  let found = null;
  $('a[href*="linkedin.com/"]').each((_, element) => {
    if (found) return;
    const href = $(element).attr('href') || '';
    if (/linkedin\.com\/(in|company)\//i.test(href)) found = href;
  });
  return found;
}

function detectCity(text) {
  const haystack = String(text || '').toLowerCase();
  const ordered = [...CHILE_CITIES].sort((a, b) => b.length - a.length);
  return ordered.find((city) => haystack.includes(city.toLowerCase())) || null;
}

function detectSpecialties(text) {
  const haystack = String(text || '').toLowerCase();
  const found = [];
  for (const [specialty, keywords] of Object.entries(SPECIALTY_KEYWORDS)) {
    if (keywords.some((keyword) => haystack.includes(keyword))) found.push(specialty);
  }
  return found.slice(0, 4);
}

function buildStaticDedupeKey(candidate) {
  const website = normalizeDomain(candidate.website);
  const firm = String(candidate.firm_name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `web:${website || 'sin-sitio'}:${firm || 'sin-nombre'}`;
}

function candidateScore(candidate) {
  let score = 0;
  if (candidate.email) score += 10;
  if (candidate.validation_status === 'valid') score += 20;
  if (candidate.contact_name) score += 3;
  if (candidate.city) score += 1;
  if (candidate.specialties?.length) score += 1;
  return score;
}

async function fetchRobots(origin, fetchImpl) {
  try {
    const response = await withTimeout(fetchImpl(`${origin}/robots.txt`, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/plain' },
    }), PAGE_FETCH_TIMEOUT_MS);
    if (!response.ok) return null;
    const text = await response.text();
    return String(text || '').slice(0, 200_000);
  } catch {
    // Sin robots accesible no se hace scraping: se descarta el sitio.
    return false;
  }
}

async function fetchHtml(url, fetchImpl) {
  const response = await withTimeout(fetchImpl(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'es-CL,es;q=0.9',
    },
    redirect: 'follow',
  }), PAGE_FETCH_TIMEOUT_MS);
  if (!response.ok) return null;
  if (isBlockedUrl(response.url || url)) return null;
  const contentType = String(response.headers?.get?.('content-type') || '');
  if (contentType && !/text\/html|application\/xhtml/i.test(contentType)) return null;
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > MAX_HTML_BYTES) return null;
  return buffer.toString('utf8');
}

function normalizeUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

function splitTitle(title) {
  const value = String(title || '').trim();
  if (!value) return null;
  return value.split(/\s*[|·–—]\s*/)[0].trim() || null;
}

function truncate(value, max) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 1).trim()}…` : text;
}

async function mapWithConcurrency(items, concurrency, fn) {
  const results = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await fn(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}
