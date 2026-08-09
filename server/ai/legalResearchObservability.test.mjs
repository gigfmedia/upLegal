import { describe, it, expect, vi, afterEach } from 'vitest';

// Fase 4.1.2: observabilidad y resiliencia de búsqueda BCN. Estos tests
// simulan fallas/éxitos de BCN/LeyChile con un mock de fetch e inyectan la
// URL de los endpoints para verificar el contrato y los logs estructurados.

import { searchBcnNormas, searchJurisprudence } from './jurisprudenceSources.mjs';

// ---------------------------------------------------------------------------
// Helpers de mock
// ---------------------------------------------------------------------------
const SPARQL_HOST = 'https://datos.bcn.cl';
const LEYCHILE_JSON_HOST = 'https://nuevo.leychile.cl';
const TC_API_HOST = 'https://buscador-backend.tcchile.cl';
const OPENALEX_API_HOST = 'https://api.openalex.org';

const QUERY = '¿Qué derechos reconoce la Ley 21.719 a los titulares de datos personales?';
const LEY_21_719_TITLE = 'REGULA LA PROTECCIÓN DE LOS DATOS PERSONALES';
const LEY_21_719_BINDINGS = [
  {
    title: { value: LEY_21_719_TITLE },
    number: { value: '21719' },
    code: { value: '1209272' },
    date: { value: '2024-01-01' },
  },
];
const LEY_21_719_HTML = [
  'Artículo 4.- Los titulares tienen derecho a conocer, rectificar y eliminar sus datos personales.',
  'Artículo 11.- Toda entidad deberá mantener la confidencialidad de los datos.',
  'Artículo 14.- Las infracciones serán sancionadas conforme a la ley.',
];

function jsonResponse(body) {
  return {
    ok: true,
    status: 200,
    async json() {
      return body;
    },
    async text() {
      return JSON.stringify(body);
    },
  };
}

function sparqlResponse(bindings) {
  return jsonResponse({ results: { bindings } });
}

function leychileJsonResponse(html) {
  const htmlArray = Array.isArray(html) ? html : [html];
  return jsonResponse({
    html: htmlArray,
    metadatos: { fecha_publicacion: '2024-01-01', derogado: false, tipo_version_s: 'v' },
  });
}

function tcResponse(search) {
  // El proveedor devuelve filas cuyo texto contiene los términos buscados.
  const text = `texto relevante del fallo sobre ${search || 'datos personales'}`;
  return jsonResponse({
    data: {
      results: [
        {
          id: '123',
          rol: '1234-2020',
          competenciaShortName: 'Inaplicabilidad',
          content: text,
          highlightParagraphs: [{ full: 'texto relevante del fallo' }],
        },
      ],
    },
  });
}

/** Extrae el término `search` del filter codificado en la URL del TC. */
function parseTcSearchFromUrl(url) {
  const parsed = new URL(url);
  const filter = JSON.parse(parsed.searchParams.get('filter'));
  return filter.search;
}

function openalexResponse() {
  return jsonResponse({
    results: [
      {
        id: 'https://openalex.org/W123456',
        title: 'La protección de datos personales en Chile',
        publication_year: 2021,
        authorships: [{ author: { display_name: 'Autor Ejemplo' } }],
        abstract_inverted_index: { proteccion: [0], datos: [1] },
      },
    ],
  });
}

/** Mock global de fetch que enruta por host. */
function mockFetch({ sparqlFail = false } = {}) {
  globalThis.fetch = vi.fn(async (url) => {
    const target = String(url);
    if (target.includes(SPARQL_HOST)) {
      if (sparqlFail) throw new Error('HTTP 504 Gateway Timeout');
      return sparqlResponse(LEY_21_719_BINDINGS);
    }
    if (target.includes(LEYCHILE_JSON_HOST)) {
      return leychileJsonResponse(LEY_21_719_HTML);
    }
    if (target.includes(TC_API_HOST)) return tcResponse(parseTcSearchFromUrl(url));
    if (target.includes(OPENALEX_API_HOST)) return openalexResponse();
    throw new Error(`unhandled: ${url}`);
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  delete globalThis.fetch;
});

// ---------------------------------------------------------------------------
// Caso A: BCN responde correctamente → aparece Ley 21.719 (bcn-1209272).
// ---------------------------------------------------------------------------
describe('Caso A — BCN correcto', () => {
  it('busca por número y devuelve bcn-1209272 como normativa tipo ley', async () => {
    mockFetch();

    const sources = await searchBcnNormas(QUERY, 6);
    const ley = sources.find((s) => s.id === 'bcn-1209272');
    expect(ley).toBeDefined();
    expect(ley.kind).toBe('normativa');
    expect(ley.norm_type).toBe('ley');
  });
});

// ---------------------------------------------------------------------------
// Caso B: SPARQL por número lanza timeout/error; el de título también falla.
// searchBcnNormas() devuelve [] y el error queda registrado (console.warn).
// ---------------------------------------------------------------------------
describe('Caso B — fallo total de BCN', () => {
  it('devuelve [] cuando ambos caminos SPARQL fallan y registra el error', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockFetch({ sparqlFail: true });

    const sources = await searchBcnNormas(QUERY, 6);
    expect(sources).toEqual([]);

    const bcnLogs = warnSpy.mock.calls
      .map((c) => c.join(' '))
      .filter((s) => s.includes('jurisprudence_bcn_sparql'));
    expect(bcnLogs.length).toBeGreaterThan(0);

    const noNormativa = warnSpy.mock.calls
      .map((c) => c.join(' '))
      .filter((s) => s.includes('jurisprudence_bcn_no_normativa'));
    expect(noNormativa.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Caso C: BCN falla pero TC / OpenAlex funcionan → el pipeline no explota.
// ---------------------------------------------------------------------------
describe('Caso C — BCN cae, el pipeline sobrevive', () => {
  it('searchJurisprudence no lanza y sigue devolviendo fuentes no normativas', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    globalThis.fetch = vi.fn(async (url) => {
      const target = String(url);
      if (target.includes(SPARQL_HOST)) throw new Error('SPARQL error');
      if (target.includes(LEYCHILE_JSON_HOST)) return leychileJsonResponse(LEY_21_719_HTML);
      if (target.includes(TC_API_HOST)) return tcResponse(parseTcSearchFromUrl(url));
      if (target.includes(OPENALEX_API_HOST)) return openalexResponse();
      throw new Error(`unhandled: ${url}`);
    });

    const { sources } = await searchJurisprudence(QUERY, { limit: 8 });
    expect(Array.isArray(sources)).toBe(true);
    expect(sources.some((s) => s.kind === 'normativa')).toBe(false);
    expect(sources.some((s) => s.kind === 'jurisprudencia')).toBe(true);

    // BCN degrada a [] internamente: el error queda en el log SPARQL y el
    // pipeline reporta el proveedor como vacío sin explotar.
    const bcnError = warnSpy.mock.calls
      .map((c) => c.join(' '))
      .filter((s) => s.includes('jurisprudence_bcn_sparql') && s.includes('error'));
    expect(bcnError.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Caso D: consulta explícita "Ley 21.719" y BCN devuelve la norma con sus
// fragments. Comprueba que se mantiene bcn-1209272 y sus metadata.fragments.
// ---------------------------------------------------------------------------
describe('Caso D — Ley 21.719 con fragments', () => {
  it('conserva bcn-1209272 y sus fragments verificables', async () => {
    mockFetch();

    const sources = await searchBcnNormas('Ley 21.719 sobre protección de datos personales', 6);
    const ley = sources.find((s) => s.id === 'bcn-1209272');
    expect(ley).toBeDefined();
    expect(Array.isArray(ley.metadata?.fragments)).toBe(true);
    expect(ley.metadata.fragments.length).toBeGreaterThan(0);
    expect(ley.excerpt).toContain('Artículo 4');
  });
});

// ---------------------------------------------------------------------------
// Caso E: los logs no exponen contenido de la consulta del usuario
// (términos normalizados aparecen solo como hash, nunca como texto plano).
// ---------------------------------------------------------------------------
describe('Caso E — no se expone contenido sensible en logs', () => {
  it('no registra el término crudo de la búsqueda por título en texto plano', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Consulta con datos personales: un RUT y un nombre que NO deben salir
    // en texto plano en ningún log.
    const personalQuery = '¿Puede Juan Pérez con RUT 12.345.678-9 demandar a la empresa?';
    globalThis.fetch = vi.fn(async (url) => {
      // SPARQL responde vacío para forzar el path de título y sus logs.
      if (String(url).includes(SPARQL_HOST)) return sparqlResponse([]);
      if (String(url).includes(LEYCHILE_JSON_HOST)) return leychileJsonResponse(LEY_21_719_HTML);
      throw new Error('unhandled');
    });

    await searchBcnNormas(personalQuery, 6);

    const allLogs = warnSpy.mock.calls.map((c) => c.join(' ')).join('\n');
    // Los términos derivados (juan, perez, rut) no deben aparecer en texto plano.
    expect(allLogs).not.toMatch(/juan/i);
    expect(allLogs).not.toMatch(/perez/i);
    expect(allLogs).not.toMatch(/rut/i);
    expect(allLogs).not.toMatch(/12\.345\.678/);
    // El número de ley del SPARQL (sin personal) puede aparecer; el término de
    // búsqueda de título debe ir solo como term_hash (sha256).
    const titleLogs = warnSpy.mock.calls
      .map((c) => c.join(' '))
      .filter((s) => s.includes('search_type":"title"'));
    expect(titleLogs.length).toBeGreaterThan(0);
    titleLogs.forEach((l) => {
      expect(l).not.toMatch(/"term":/);
      expect(l).toMatch(/"term_hash":/);
    });
  });

  it('sanitiza el mensaje de error eliminando los query params de la URL', () => {
    // El sanitizador se usa internamente; verificamos que el mensaje crudo de
    // un error de provider no quede completo en el log.
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    globalThis.fetch = vi.fn(async (url) => {
      if (String(url).includes(TC_API_HOST)) {
        return { ok: false, status: 500, async json() { return {}; }, async text() { return ''; } };
      }
      throw new Error('HTTP 500 en https://buscador-backend.tcchile.cl/api/extended/sentencias?filter=RU:12.345.678');
    });

    return searchJurisprudence('consulta personal de Juan', { limit: 8 }).then(() => {
      const allLogs = warnSpy.mock.calls.map((c) => c.join(' ')).join('\n');
      expect(allLogs).not.toMatch(/12\.345\.678/);
    });
  });
});