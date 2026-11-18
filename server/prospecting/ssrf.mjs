import dns from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import { BLOCKED_PAGE_HOSTS } from './constants.mjs';

export const MAX_REDIRECTS = 5;
const BLOCKED_HOST_SUFFIXES = ['localhost', 'local', 'localdomain', 'internal', 'home.arpa', 'lan'];
const SENSITIVE_REDIRECT_HEADER_PATTERN = /(^|[-_])(auth|authorization|authentication|authenticate|oauth2?|authtoken|token|secret|key|apikey|signature|credential|cookie|session|sessionid|csrf|csrftoken|xsrf|xsrftoken|password|passwd|jwt)([-_]|$)/;
const SENSITIVE_REDIRECT_HEADERS = new Set([
  'authorization',
  'proxy-authorization',
  'cookie',
  'cookie2',
  'referer',
  'x-api-key',
  'api-key',
  'apikey',
  'x-auth-token',
  'x-access-token',
  'x-csrf-token',
  'x-xsrf-token',
  'x-supabase-auth',
  'x-goog-api-key',
  'x-amz-security-token',
  'x-amz-credential',
  'x-amz-signature',
]);

const blockedIpv4 = new net.BlockList();
[
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.88.99.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
].forEach(([address, prefix]) => blockedIpv4.addSubnet(address, prefix, 'ipv4'));

const blockedIpv6 = new net.BlockList();
[
  ['::', 8],
  ['::1', 128],
  ['64:ff9b::', 96],
  ['64:ff9b:1::', 48],
  ['100::', 64],
  ['2001::', 32],
  ['2001:2::', 48],
  ['2001:10::', 28],
  ['2001:20::', 28],
  ['2001:db8::', 32],
  ['2002::', 16],
  ['fc00::', 7],
  ['fe80::', 10],
  ['fec0::', 10],
  ['ff00::', 8],
  ['3fff::', 20],
].forEach(([address, prefix]) => blockedIpv6.addSubnet(address, prefix, 'ipv6'));

export class SsrfError extends Error {
  constructor(code, message) {
    super(message || code);
    this.name = 'SsrfError';
    this.code = code;
  }
}

export function normalizeHostname(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
    .replace(/%.*$/, '')
    .replace(/\.+$/, '');
}

function ipv6ToBytes(address) {
  let value = address;
  if (value.includes('.')) {
    const lastColon = value.lastIndexOf(':');
    const ipv4 = value.slice(lastColon + 1);
    const octets = ipv4.split('.').map((part) => Number(part));
    if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) return null;
    value = `${value.slice(0, lastColon + 1)}${((octets[0] << 8) | octets[1]).toString(16)}:${((octets[2] << 8) | octets[3]).toString(16)}`;
  }
  const halves = value.split('::');
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const missing = 8 - left.length - right.length;
  if (missing < 0 || (halves.length === 1 && missing !== 0)) return null;
  const groups = halves.length === 2 ? [...left, ...Array(missing).fill('0'), ...right] : left;
  if (groups.length !== 8) return null;
  const bytes = [];
  for (const group of groups) {
    if (!/^[0-9a-f]{1,4}$/.test(group)) return null;
    const groupValue = Number.parseInt(group, 16);
    bytes.push(groupValue >> 8, groupValue & 0xff);
  }
  return bytes;
}

export function isBlockedIp(address) {
  const normalized = normalizeHostname(address);
  const family = net.isIP(normalized);
  if (family === 4) return blockedIpv4.check(normalized, 'ipv4');
  if (family !== 6) return true;

  const bytes = ipv6ToBytes(normalized);
  if (!bytes) return true;

  if (bytes.slice(0, 10).every((byte) => byte === 0) && bytes[10] === 0xff && bytes[11] === 0xff) {
    return isBlockedIp(bytes.slice(12).join('.'));
  }
  return blockedIpv6.check(normalized, 'ipv6');
}

export function isBlockedHostname(hostname) {
  const host = normalizeHostname(hostname);
  if (!host) return true;
  if (net.isIP(host)) return isBlockedIp(host);
  if (BLOCKED_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`))) return true;
  return !host.includes('.');
}

export function isBlockedUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return true;
  }
  if (!/^https?:$/.test(parsed.protocol)) return true;
  const host = normalizeHostname(parsed.hostname);
  if (!host) return true;
  if (BLOCKED_PAGE_HOSTS.has(host)) return true;
  if ([...BLOCKED_PAGE_HOSTS].some((blocked) => host.endsWith(`.${blocked}`))) return true;
  return isBlockedHostname(host);
}

export async function resolvePublicAddresses(hostname, { lookup = dns.lookup } = {}) {
  const host = normalizeHostname(hostname);
  if (isBlockedHostname(host)) throw new SsrfError('blocked_hostname', `blocked_hostname:${host}`);

  const literalFamily = net.isIP(host);
  if (literalFamily) {
    if (isBlockedIp(host)) throw new SsrfError('blocked_address', `blocked_address:${host}`);
    return [{ address: host, family: literalFamily }];
  }

  let records;
  try {
    records = await lookup(host, { all: true, verbatim: true });
  } catch (error) {
    throw new SsrfError('dns_lookup_failed', `dns_lookup_failed:${host}:${error?.code || error?.message || 'unknown'}`);
  }
  if (!Array.isArray(records) || records.length === 0) {
    throw new SsrfError('dns_empty', `dns_empty:${host}`);
  }

  const seen = new Set();
  const addresses = [];
  for (const record of records) {
    const address = normalizeHostname(record?.address);
    const family = net.isIP(address);
    if (!family) throw new SsrfError('dns_invalid', `dns_invalid:${host}`);
    if (isBlockedIp(address)) throw new SsrfError('blocked_address', `blocked_address:${host}:${address}`);
    const key = `${family}:${address}`;
    if (seen.has(key)) continue;
    seen.add(key);
    addresses.push({ address, family });
  }
  return addresses.sort((a, b) => a.family - b.family);
}

export function createPinnedLookup(address) {
  return (_hostname, options, callback) => {
    const callbackFn = typeof options === 'function' ? options : callback;
    const lookupOptions = typeof options === 'function' ? {} : (options || {});
    if (lookupOptions.all) {
      callbackFn(null, [{ address: address.address, family: address.family }]);
      return;
    }
    callbackFn(null, address.address, address.family);
  };
}

function sanitizeRequestHeaders(headers) {
  const sanitized = {};
  for (const [name, value] of Object.entries(headers || {})) {
    if (String(name).toLowerCase() === 'host') continue;
    sanitized[name] = value;
  }
  return sanitized;
}

function isSensitiveRedirectHeader(name) {
  const normalized = String(name).toLowerCase();
  return SENSITIVE_REDIRECT_HEADERS.has(normalized) || SENSITIVE_REDIRECT_HEADER_PATTERN.test(normalized);
}

function headersForRedirect(headers, previousUrl, nextUrl) {
  if (previousUrl.origin === nextUrl.origin) return headers;
  const filtered = {};
  for (const [name, value] of Object.entries(headers || {})) {
    if (isSensitiveRedirectHeader(name)) continue;
    filtered[name] = value;
  }
  return filtered;
}

function makeResponse({ status, headers, url, buffer }) {
  const headerMap = new Map(Object.entries(headers || {}).map(([name, value]) => [
    String(name).toLowerCase(),
    Array.isArray(value) ? value.join(', ') : String(value),
  ]));
  return {
    ok: status >= 200 && status < 300,
    status,
    url: url.toString(),
    headers: {
      get(name) {
        return headerMap.get(String(name).toLowerCase()) ?? null;
      },
    },
    text: async () => buffer.toString('utf8'),
    arrayBuffer: async () => buffer,
  };
}

function requestPinned(url, addresses, { headers, maxBytes, timeoutMs }) {
  const host = normalizeHostname(url.hostname);
  const address = addresses[0];
  const transport = url.protocol === 'https:' ? https : http;

  return new Promise((resolve, reject) => {
    let settled = false;
    let timer;

    const finish = (handler, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      handler(value);
    };
    const fail = (error) => finish(reject, error);

    const request = transport.request({
      protocol: url.protocol,
      hostname: host,
      port: url.port || undefined,
      path: `${url.pathname}${url.search}`,
      method: 'GET',
      headers: {
        'Accept-Encoding': 'identity',
        ...headers,
        Host: url.host,
      },
      servername: net.isIP(host) ? undefined : host,
      lookup: createPinnedLookup(address),
      agent: false,
      autoSelectFamily: false,
    }, (response) => {
      const chunks = [];
      let total = 0;

      const contentLength = Number(response.headers['content-length']);
      if (Number.isFinite(contentLength) && contentLength > maxBytes) {
        const error = new SsrfError('response_too_large', `response_too_large:${contentLength}`);
        fail(error);
        response.destroy();
        return;
      }

      response.on('data', (chunk) => {
        total += chunk.length;
        if (total > maxBytes) {
          const error = new SsrfError('response_too_large', `response_too_large:${total}`);
          fail(error);
          response.destroy();
          return;
        }
        chunks.push(chunk);
      });
      response.on('error', fail);
      response.on('aborted', () => fail(new SsrfError('response_aborted', 'response_aborted')));
      response.on('end', () => {
        finish(resolve, makeResponse({
          status: response.statusCode || 0,
          headers: response.headers,
          url,
          buffer: Buffer.concat(chunks),
        }));
      });
    });

    timer = setTimeout(() => {
      const error = new SsrfError('request_timeout', 'request_timeout');
      fail(error);
      request.destroy(error);
    }, timeoutMs);
    request.on('error', fail);
    request.end();
  });
}

function withTimeout(promise, ms, code) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new SsrfError(code, code)), ms);
    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function redirectStatus(status) {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

function headerValue(response, name) {
  if (typeof response?.headers?.get === 'function') return response.headers.get(name);
  const headers = response?.headers || {};
  const key = Object.keys(headers).find((entry) => entry.toLowerCase() === String(name).toLowerCase());
  return key ? headers[key] : null;
}

export function createSafeFetcher({
  lookup = dns.lookup,
  fetchImpl = null,
  requestImpl = null,
  timeoutMs = 12000,
  maxRedirects = MAX_REDIRECTS,
} = {}) {
  async function fetchUrl(input, { headers = {}, maxBytes = 1_200_000 } = {}) {
    let current;
    try {
      current = new URL(input);
    } catch {
      throw new SsrfError('invalid_url', 'invalid_url');
    }
    const deadline = Date.now() + timeoutMs;
    const remaining = () => Math.max(1, deadline - Date.now());
    let requestHeaders = sanitizeRequestHeaders(headers);

    for (let hop = 0; hop <= maxRedirects; hop += 1) {
      if (current.username || current.password) throw new SsrfError('url_credentials', 'url_credentials_not_allowed');
      if (isBlockedUrl(current.toString())) throw new SsrfError('blocked_url', `blocked_url:${current.toString()}`);
      const addresses = await withTimeout(
        resolvePublicAddresses(current.hostname, { lookup }),
        remaining(),
        'dns_timeout',
      );

      let response;
      if (requestImpl) {
        response = await withTimeout(
          requestImpl(current, addresses, { headers: requestHeaders, maxBytes, timeoutMs: remaining() }),
          remaining(),
          'request_timeout',
        );
      } else if (fetchImpl) {
        response = await withTimeout(
          fetchImpl(current.toString(), { headers: requestHeaders, redirect: 'manual' }),
          remaining(),
          'request_timeout',
        );
      } else {
        response = await requestPinned(current, addresses, { headers: requestHeaders, maxBytes, timeoutMs: remaining() });
      }

      if (!response || !Number.isFinite(Number(response.status))) {
        throw new SsrfError('invalid_response', 'invalid_response');
      }
      const status = Number(response.status);
      if (!redirectStatus(status)) return { response, url: current.toString(), addresses };

      const location = headerValue(response, 'location');
      if (!location) return { response, url: current.toString(), addresses };
      response.body?.cancel?.().catch?.(() => {});
      if (hop >= maxRedirects) throw new SsrfError('too_many_redirects', 'too_many_redirects');

      let nextUrl;
      try {
        nextUrl = new URL(location, current);
      } catch {
        throw new SsrfError('invalid_redirect', 'invalid_redirect');
      }
      requestHeaders = headersForRedirect(requestHeaders, current, nextUrl);
      current = nextUrl;
    }
    throw new SsrfError('too_many_redirects', 'too_many_redirects');
  }

  return { fetchUrl };
}
