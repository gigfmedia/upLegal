// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import {
  createPinnedLookup,
  createSafeFetcher,
  isBlockedIp,
  isBlockedUrl,
  resolvePublicAddresses,
} from './ssrf.mjs';

function response({ status = 200, body = '', headers = {} } = {}) {
  const normalized = new Map(Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value]));
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => normalized.get(String(name).toLowerCase()) ?? null },
    text: async () => body,
    arrayBuffer: async () => Buffer.from(body),
  };
}

const publicLookup = async () => [{ address: '93.184.216.34', family: 4 }];

describe('prospecting SSRF URL validation', () => {
  it('permite hosts públicos y URLs HTTP/HTTPS normales', () => {
    expect(isBlockedUrl('https://example.com')).toBe(false);
    expect(isBlockedUrl('http://sub.example.com/path?q=1')).toBe(false);
    expect(isBlockedUrl('https://[2606:4700:4700::1111]/')).toBe(false);
    expect(isBlockedUrl('https://[::ffff:8.8.8.8]/')).toBe(false);
  });

  it.each([
    'http://localhost',
    'http://localhost/',
    'http://localhost.',
    'http://foo.localhost',
    'http://sub.foo.localhost./',
    'http://printer.local',
    'http://metadata.google.internal/',
    'http://instance-data.ec2.internal/',
    'http://intranet/',
    'ftp://example.com/file',
    'file:///etc/passwd',
  ])('bloquea host local o esquema no HTTP: %s', (url) => {
    expect(isBlockedUrl(url)).toBe(true);
  });

  it.each([
    'http://0.0.0.0/',
    'http://10.0.0.1/',
    'http://100.64.0.1/',
    'http://127.0.0.1/',
    'http://127.1/',
    'http://169.254.169.254/latest/meta-data',
    'http://172.16.0.1/',
    'http://192.0.2.1/',
    'http://192.168.1.1/',
    'http://198.18.0.1/',
    'http://198.51.100.1/',
    'http://203.0.113.1/',
    'http://224.0.0.1/',
    'http://240.0.0.1/',
    'http://255.255.255.255/',
  ])('bloquea IPv4 no global: %s', (url) => {
    expect(isBlockedUrl(url)).toBe(true);
  });

  it.each([
    'http://2130706433/',
    'http://0x7f000001/',
    'http://0x7f.0.0.1/',
    'http://0177.0.0.1/',
    'http://127.1/',
    'http://0/',
    'http://3232235777/',
  ])('bloquea representaciones alternativas de IPv4: %s', (url) => {
    expect(isBlockedUrl(url)).toBe(true);
  });

  it.each([
    'http://[::]/',
    'http://[::1]/',
    'http://[fc00::1]/',
    'http://[fd12:3456::1]/',
    'http://[fe80::1]/',
    'http://[ff02::1]/',
    'http://[2001:db8::1]/',
    'http://[2002:7f00:1::]/',
    'http://[64:ff9b::7f00:1]/',
    'http://[::ffff:127.0.0.1]/',
    'http://[::ffff:7f00:1]/',
    'http://[::ffff:a9fe:a9fe]/',
    'http://[0:0:0:0:0:ffff:7f00:1]/',
    'http://[0:0:0:0:ffff:0:0:0]/',
    'http://[3fff::1]/',
  ])('bloquea IPv6 no global o IPv4 mapeada: %s', (url) => {
    expect(isBlockedUrl(url)).toBe(true);
  });

  it('clasifica direcciones IP directamente', () => {
    expect(isBlockedIp('169.254.169.254')).toBe(true);
    expect(isBlockedIp('::ffff:169.254.169.254')).toBe(true);
    expect(isBlockedIp('8.8.8.8')).toBe(false);
    expect(isBlockedIp('::ffff:8.8.8.8')).toBe(false);
    expect(isBlockedIp('::8.8.8.8')).toBe(true);
    expect(isBlockedIp('not-an-ip')).toBe(true);
  });
});

describe('prospecting SSRF DNS validation', () => {
  it('resuelve y acepta solo direcciones públicas', async () => {
    const addresses = await resolvePublicAddresses('example.com', {
      lookup: async () => [
        { address: '93.184.216.34', family: 4 },
        { address: '2606:4700:4700::1111', family: 6 },
      ],
    });
    expect(addresses).toEqual([
      { address: '93.184.216.34', family: 4 },
      { address: '2606:4700:4700::1111', family: 6 },
    ]);
  });

  it('rechaza DNS privado', async () => {
    await expect(resolvePublicAddresses('evil.example', {
      lookup: async () => [{ address: '127.0.0.1', family: 4 }],
    })).rejects.toMatchObject({ code: 'blocked_address' });
  });

  it('rechaza respuestas DNS mixtas aunque incluyan una dirección pública', async () => {
    await expect(resolvePublicAddresses('mixed.example', {
      lookup: async () => [
        { address: '93.184.216.34', family: 4 },
        { address: '10.0.0.5', family: 4 },
      ],
    })).rejects.toMatchObject({ code: 'blocked_address' });
  });

  it('falla de forma segura ante errores DNS y respuestas vacías', async () => {
    await expect(resolvePublicAddresses('missing.example', {
      lookup: async () => { throw Object.assign(new Error('not found'), { code: 'ENOTFOUND' }); },
    })).rejects.toMatchObject({ code: 'dns_lookup_failed' });

    await expect(resolvePublicAddresses('empty.example', {
      lookup: async () => [],
    })).rejects.toMatchObject({ code: 'dns_empty' });
  });

  it('fija la dirección validada para impedir un cambio entre validación y conexión', async () => {
    const lookup = createPinnedLookup({ address: '93.184.216.34', family: 4 });
    const single = await new Promise((resolve, reject) => {
      lookup('evil.example', {}, (error, address, family) => (error ? reject(error) : resolve({ address, family })));
    });
    const all = await new Promise((resolve, reject) => {
      lookup('evil.example', { all: true }, (error, addresses) => (error ? reject(error) : resolve(addresses)));
    });

    expect(single).toEqual({ address: '93.184.216.34', family: 4 });
    expect(all).toEqual([{ address: '93.184.216.34', family: 4 }]);
  });
});

describe('prospecting safe fetch', () => {
  it('valida y entrega únicamente la dirección resuelta al transporte', async () => {
    const requestImpl = vi.fn(async (_url, addresses) => {
      expect(addresses).toEqual([{ address: '93.184.216.34', family: 4 }]);
      return response({ body: 'ok' });
    });
    const lookup = vi.fn(publicLookup);
    const fetcher = createSafeFetcher({ lookup, requestImpl });

    const result = await fetcher.fetchUrl('https://example.com/page');

    expect(result.url).toBe('https://example.com/page');
    expect(await result.response.text()).toBe('ok');
    expect(lookup).toHaveBeenCalledTimes(1);
    expect(requestImpl).toHaveBeenCalledTimes(1);
  });

  it('no envía ninguna solicitud a una URL prohibida literal', async () => {
    const fetchImpl = vi.fn();
    const fetcher = createSafeFetcher({ fetchImpl, lookup: publicLookup });

    await expect(fetcher.fetchUrl('http://169.254.169.254/latest/meta-data'))
      .rejects.toMatchObject({ code: 'blocked_url' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('no envía ninguna solicitud cuando el DNS resuelve a una dirección prohibida', async () => {
    const fetchImpl = vi.fn();
    const fetcher = createSafeFetcher({
      fetchImpl,
      lookup: async () => [{ address: '10.0.0.7', family: 4 }],
    });

    await expect(fetcher.fetchUrl('https://public-looking.example/'))
      .rejects.toMatchObject({ code: 'blocked_address' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('no envía ninguna solicitud cuando el DNS mezcla direcciones públicas y privadas', async () => {
    const fetchImpl = vi.fn();
    const fetcher = createSafeFetcher({
      fetchImpl,
      lookup: async () => [
        { address: '93.184.216.34', family: 4 },
        { address: '192.168.0.10', family: 4 },
      ],
    });

    await expect(fetcher.fetchUrl('https://mixed.example/'))
      .rejects.toMatchObject({ code: 'blocked_address' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('no sigue una redirección pública hacia una dirección privada', async () => {
    const fetchImpl = vi.fn(async () => response({
      status: 302,
      headers: { location: 'http://127.0.0.1/internal' },
    }));
    const fetcher = createSafeFetcher({ fetchImpl, lookup: publicLookup });

    await expect(fetcher.fetchUrl('https://example.com/start'))
      .rejects.toMatchObject({ code: 'blocked_url' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0][0]).toBe('https://example.com/start');
  });

  it('elimina headers sensibles y Host al redirigir a otro host', async () => {
    const seen = [];
    const requestImpl = vi.fn(async (url, _addresses, options) => {
      seen.push({ url: url.toString(), headers: options.headers });
      if (seen.length === 1) {
        return response({ status: 302, headers: { location: 'https://otro.example/final' } });
      }
      return response({ body: 'ok' });
    });
    const fetcher = createSafeFetcher({ lookup: publicLookup, requestImpl });

    await fetcher.fetchUrl('https://example.com/start', {
      headers: {
        Host: 'evil.example',
        Authorization: 'Bearer secreto',
        Cookie: 'session=1',
        'X-Api-Key': 'api-key',
        'X-Custom-Auth': 'otro-secreto',
        'X-Client-Key': 'otra-key',
        'User-Agent': 'ua',
      },
    });

    expect(seen[0].headers).toEqual({
      Authorization: 'Bearer secreto',
      Cookie: 'session=1',
      'X-Api-Key': 'api-key',
      'X-Custom-Auth': 'otro-secreto',
      'X-Client-Key': 'otra-key',
      'User-Agent': 'ua',
    });
    expect(seen[1].headers).toEqual({ 'User-Agent': 'ua' });
  });

  it('conserva headers sensibles en redirecciones del mismo origen', async () => {
    const seen = [];
    const requestImpl = vi.fn(async (url, _addresses, options) => {
      seen.push({ url: url.toString(), headers: options.headers });
      if (seen.length === 1) {
        return response({ status: 302, headers: { location: '/siguiente' } });
      }
      return response({ body: 'ok' });
    });
    const fetcher = createSafeFetcher({ lookup: publicLookup, requestImpl });
    const headers = { Authorization: 'Bearer secreto', Cookie: 'session=1' };

    await fetcher.fetchUrl('https://example.com/start', { headers });

    expect(seen[1].headers).toEqual(headers);
  });

  it('bloquea redirecciones a esquemas distintos de HTTP/HTTPS', async () => {
    const fetchImpl = vi.fn(async () => response({
      status: 302,
      headers: { location: 'ftp://example.com/archivo' },
    }));
    const fetcher = createSafeFetcher({ fetchImpl, lookup: publicLookup });

    await expect(fetcher.fetchUrl('https://example.com/start'))
      .rejects.toMatchObject({ code: 'blocked_url' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('rechaza credenciales embebidas en la URL antes de solicitar', async () => {
    const fetchImpl = vi.fn();
    const fetcher = createSafeFetcher({ fetchImpl, lookup: publicLookup });

    await expect(fetcher.fetchUrl('https://usuario:clave@example.com/'))
      .rejects.toMatchObject({ code: 'url_credentials' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('sigue redirecciones públicas encadenadas revalidando cada destino', async () => {
    const responses = [
      response({ status: 301, headers: { location: 'https://cdn.example.com/step-2' } }),
      response({ status: 302, headers: { location: '/step-3' } }),
      response({ body: 'final' }),
    ];
    const fetchImpl = vi.fn(async () => responses.shift());
    const lookup = vi.fn(publicLookup);
    const fetcher = createSafeFetcher({ fetchImpl, lookup });

    const result = await fetcher.fetchUrl('https://example.com/start');

    expect(result.url).toBe('https://cdn.example.com/step-3');
    expect(await result.response.text()).toBe('final');
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(lookup).toHaveBeenCalledTimes(3);
  });

  it('corta cadenas de redirección demasiado largas', async () => {
    const fetchImpl = vi.fn(async (_url, _options) => response({
      status: 302,
      headers: { location: '/again' },
    }));
    const fetcher = createSafeFetcher({ fetchImpl, lookup: publicLookup, maxRedirects: 2 });

    await expect(fetcher.fetchUrl('https://example.com/start'))
      .rejects.toMatchObject({ code: 'too_many_redirects' });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('falla de forma segura ante timeouts de DNS y de solicitud', async () => {
    const dnsFetcher = createSafeFetcher({
      fetchImpl: vi.fn(),
      lookup: () => new Promise(() => {}),
      timeoutMs: 20,
    });
    await expect(dnsFetcher.fetchUrl('https://slow-dns.example/'))
      .rejects.toMatchObject({ code: 'dns_timeout' });

    const requestFetcher = createSafeFetcher({
      lookup: publicLookup,
      requestImpl: () => new Promise(() => {}),
      timeoutMs: 20,
    });
    await expect(requestFetcher.fetchUrl('https://slow-request.example/'))
      .rejects.toMatchObject({ code: 'request_timeout' });
  });
});
