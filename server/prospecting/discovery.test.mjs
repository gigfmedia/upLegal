// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  buildSearchQueries,
  createSearchProvider,
  discoverProspects,
  extractCandidatesFromPage,
  isAllowedByRobots,
  isBlockedUrl,
} from './discovery.mjs';

const PAGE_HTML = `<!DOCTYPE html><html><head>
<title>Pérez & Asociados | Abogados laborales en Santiago</title>
<meta name="description" content="Estudio jurídico especializado en derecho laboral y civil.">
<script type="application/ld+json">
{"@type":"LegalService","name":"Pérez & Asociados","address":{"addressLocality":"Santiago"},"description":"Estudio jurídico en Santiago","sameAs":["https://www.linkedin.com/company/perez"]}
</script></head><body>
<h1>Pérez & Asociados</h1>
<p>Derecho laboral, despidos y negociación colectiva en Santiago.</p>
<a href="mailto:juan.perez@estudio.cl">Juan Pérez</a>
<a href="mailto:contacto@estudio.cl">Contacto</a>
<a href="mailto:juan@gmail.com">Personal</a>
</body></html>`;

function response({ status = 200, contentType = 'text/html', body = '', json = null } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => (String(name).toLowerCase() === 'content-type' ? contentType : null) },
    text: async () => body,
    json: async () => json,
    arrayBuffer: async () => Buffer.from(body),
  };
}

describe('prospecting discovery', () => {
  it('sin proveedor devuelve no-op explícito y cero candidatos', async () => {
    const result = await discoverProspects({ env: {}, settings: {}, target: 10 });
    expect(result.candidates).toEqual([]);
    expect(result.reason).toBe('discovery_provider_not_configured');
  });

  it('sin claves no crea proveedor de búsqueda', () => {
    expect(createSearchProvider({ env: {} })).toBe(null);
    expect(createSearchProvider({ env: { GOOGLE_CSE_API_KEY: 'solo-key' } })).toBe(null);
  });

  it('integra Serper con header, país e idioma', async () => {
    let captured;
    const provider = createSearchProvider({
      env: { SERPER_API_KEY: 'serper-key' },
      fetchImpl: async (url, options) => {
        captured = { url, options };
        return response({ contentType: 'application/json', json: { organic: [{ title: 'A', link: 'https://a.cl', snippet: 's' }] } });
      },
    });
    expect(provider.name).toBe('serper');
    expect(await provider.search('abogados santiago', 5)).toEqual([{ title: 'A', url: 'https://a.cl', snippet: 's' }]);
    expect(captured.url).toBe('https://google.serper.dev/search');
    expect(captured.options.headers['X-API-KEY']).toBe('serper-key');
    expect(JSON.parse(captured.options.body)).toMatchObject({ q: 'abogados santiago', gl: 'cl', hl: 'es' });
  });

  it('integra Brave con país, idioma y token', async () => {
    let captured;
    const provider = createSearchProvider({
      env: { BRAVE_SEARCH_API_KEY: 'brave-key' },
      fetchImpl: async (url, options) => {
        captured = { url: new URL(url), options };
        return response({ contentType: 'application/json', json: { web: { results: [{ title: 'B', url: 'https://b.cl', description: 'd' }] } } });
      },
    });
    expect(provider.name).toBe('brave');
    expect(await provider.search('abogados', 5)).toEqual([{ title: 'B', url: 'https://b.cl', snippet: 'd' }]);
    expect(captured.url.searchParams.get('country')).toBe('cl');
    expect(captured.url.searchParams.get('search_lang')).toBe('es');
    expect(captured.options.headers['X-Subscription-Token']).toBe('brave-key');
  });

  it('integra Google CSE con key y cx', async () => {
    let captured;
    const provider = createSearchProvider({
      env: { GOOGLE_CSE_API_KEY: 'google-key', GOOGLE_CSE_CX: 'cx-1' },
      fetchImpl: async (url) => {
        captured = new URL(url);
        return response({ contentType: 'application/json', json: { items: [{ title: 'C', link: 'https://c.cl', snippet: 'x' }] } });
      },
    });
    expect(provider.name).toBe('google_cse');
    expect(await provider.search('abogados', 5)).toEqual([{ title: 'C', url: 'https://c.cl', snippet: 'x' }]);
    expect(captured.searchParams.get('key')).toBe('google-key');
    expect(captured.searchParams.get('cx')).toBe('cx-1');
    expect(captured.searchParams.get('gl')).toBe('cl');
  });

  it('genera búsquedas acotadas y con ciudades chilenas', () => {
    const queries = buildSearchQueries({ target: 100 });
    expect(queries.length).toBeGreaterThanOrEqual(12);
    expect(queries.length).toBeLessThanOrEqual(40);
    expect(queries.some((query) => query.includes('Santiago'))).toBe(true);
    expect(queries.some((query) => query.includes('Chile'))).toBe(true);
  });

  it('bloquea directorios sociales y LinkedIn', () => {
    expect(isBlockedUrl('https://www.linkedin.com/in/juan')).toBe(true);
    expect(isBlockedUrl('https://cl.linkedin.com/in/juan')).toBe(true);
    expect(isBlockedUrl('https://www.instagram.com/estudio')).toBe(true);
    expect(isBlockedUrl('https://estudio.cl/equipo')).toBe(false);
    expect(isBlockedUrl('ftp://estudio.cl')).toBe(true);
  });

  it('respeta reglas robots.txt', () => {
    const robots = 'User-agent: *\nDisallow: /privado\nAllow: /privado/publico\n';
    expect(isAllowedByRobots(robots, 'https://estudio.cl/equipo')).toBe(true);
    expect(isAllowedByRobots(robots, 'https://estudio.cl/privado/datos')).toBe(false);
    expect(isAllowedByRobots(robots, 'https://estudio.cl/privado/publico')).toBe(true);
  });

  it('extrae solo email individual del dominio del sitio', () => {
    const candidates = extractCandidatesFromPage(PAGE_HTML, 'https://www.estudio.cl/equipo', { query: 'abogados' });
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      email: 'juan.perez@estudio.cl',
      firm_name: 'Pérez & Asociados',
      city: 'Santiago',
    });
    expect(candidates[0].specialties).toContain('Derecho laboral');
    expect(candidates[0].linkedin_url).toContain('linkedin.com/company/perez');
    expect(candidates[0].website).toBe('https://www.estudio.cl');
  });

  it('descubre y valida emails con búsqueda y MX simulados', async () => {
    const fetchImpl = async (url) => {
      const target = String(url);
      if (target === 'https://google.serper.dev/search') {
        return response({ contentType: 'application/json', json: { organic: [{ title: 'Pérez', link: 'https://www.estudio.cl/equipo', snippet: 'Abogados laborales' }] } });
      }
      if (target === 'https://www.estudio.cl/robots.txt') return response({ contentType: 'text/plain', body: '' });
      if (target === 'https://www.estudio.cl/equipo') return response({ body: PAGE_HTML });
      throw new Error(`unexpected fetch ${target}`);
    };
    const result = await discoverProspects({
      env: { SERPER_API_KEY: 'test' },
      settings: {},
      target: 5,
      fetchImpl,
      resolveMx: async () => [{ exchange: 'mx.estudio.cl', priority: 10 }],
      maxPages: 2,
      logger: { warn() {}, error() {} },
    });
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]).toMatchObject({
      email: 'juan.perez@estudio.cl',
      validation_status: 'valid',
      status: 'validated',
    });
  });

  it('sitio sin email queda pendiente de contacto, no se inventa dirección', async () => {
    const html = '<html><head><title>Estudio Sin Correo | Abogados</title></head><body><h1>Estudio Sin Correo</h1><p>Derecho civil</p></body></html>';
    const fetchImpl = async (url) => {
      const target = String(url);
      if (target === 'https://google.serper.dev/search') {
        return response({ contentType: 'application/json', json: { organic: [{ title: 'Sin correo', link: 'https://sincorreo.cl', snippet: '' }] } });
      }
      if (target === 'https://sincorreo.cl/robots.txt') return response({ contentType: 'text/plain', body: '' });
      if (target === 'https://sincorreo.cl' || target === 'https://sincorreo.cl/') return response({ body: html });
      throw new Error(`unexpected fetch ${target}`);
    };
    const result = await discoverProspects({
      env: { SERPER_API_KEY: 'test' },
      settings: {},
      target: 5,
      fetchImpl,
      resolveMx: async () => [{ exchange: 'mx', priority: 10 }],
      maxPages: 2,
      logger: { warn() {}, error() {} },
    });
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]).toMatchObject({
      email: null,
      validation_status: 'no_email',
      status: 'pending_contact',
    });
  });
});
