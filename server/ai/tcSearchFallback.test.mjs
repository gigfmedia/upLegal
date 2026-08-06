import { describe, it, expect, vi, afterEach } from 'vitest';

// Fase TC — fallback progresivo en searchTcSentencias. La API del TC hace
// matching estricto multi-término: una query larga devuelve 0 resultados aunque
// existan sentencias relevantes para subconjuntos de sus términos. Estos tests
// verifican que searchTcSentencias cae a subconjuntos, deduplica, respeta el
// límite y no filtra logs con términos crudos del usuario.

import {
  searchTcSentencias,
  buildTcSearchTermVariants,
} from './jurisprudenceSources.mjs';

const TC_API_HOST = 'https://buscador-backend.tcchile.cl';

const MIXED_QUERY =
  '¿Qué establece la Ley 21.719 sobre protección de datos personales y cómo se relaciona con la jurisprudencia del Tribunal Constitucional sobre protección de la vida privada y datos personales?';

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

function row(id, rol) {
  return {
    id: String(id),
    rol: String(rol),
    competenciaShortName: 'Inaplicabilidad',
    highlightParagraphs: [{ full: 'texto del fallo' }],
    content: 'contenido',
  };
}

/** Extrae el término `search` del filter codificado en la URL del TC. */
function parseTcSearchFromUrl(url) {
  const parsed = new URL(url);
  const filter = JSON.parse(parsed.searchParams.get('filter'));
  return filter.search;
}

/**
 * Mock global de fetch para el host del TC. `handler(search)` devuelve el
 * array de filas a responder para cada término; además expone las llamadas.
 */
function mockTcFetch(handler) {
  const calls = [];
  globalThis.fetch = vi.fn(async (url) => {
    const target = String(url);
    if (!target.includes(TC_API_HOST)) throw new Error(`unhandled: ${url}`);
    const search = parseTcSearchFromUrl(url);
    calls.push(search);
    return jsonResponse({ data: { results: handler(search) } });
  });
  return calls;
}

/** Handler que replica el TC: responde solo para subconjuntos cortos clave. */
function strictTcHandler(rowsBySearch) {
  return (search) => {
    for (const [key, rows] of Object.entries(rowsBySearch)) {
      if (key === search || search === key) return rows;
    }
    // Simula el matching estricto: la query larga no matchea.
    const tokens = search.split(/\s+/).filter(Boolean);
    if (tokens.length > 3) return [];
    return [];
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  delete globalThis.fetch;
});

describe('buildTcSearchTermVariants', () => {
  it('devuelve variantes ordenadas: números de ley primero, de específico a general', () => {
    const variants = buildTcSearchTermVariants(
      'ley 21719 proteccion datos personales vida privada tribunal constitucional',
    );
    expect(variants.length).toBeGreaterThan(0);
    // La primera variante conserva el ancla numérica.
    expect(variants[0]).toContain('21719');
    // Existe el subconjunto de 2 términos "datos personales" (los rostros).
    expect(variants).toContain('datos personales');
  });

  it('no genera variantes para consultas cortas (la cubre el intento inicial)', () => {
    expect(buildTcSearchTermVariants('datos personales')).toEqual([]);
  });

  it('es determinística: dos llamadas producen el mismo resultado', () => {
    const q = 'ley 21719 proteccion datos personales vida privada tribunal';
    const a = buildTcSearchTermVariants(q);
    const b = buildTcSearchTermVariants(q);
    expect(a).toEqual(b);
  });
});

// Test A — query larga recupera resultados vía fallback tras un primer intento vacío.
describe('Test A — query larga recupera resultados con fallback', () => {
  it('intenta primero la query completa y luego recupera con subconjuntos', async () => {
    const calls = mockTcFetch(
      strictTcHandler({ 'datos personales': [row(1, '1000-2020'), row(2, '1001-2020')] }),
    );

    const LONG_QUERY =
      'que establece la proteccion de datos personales la vida privada y el tratamiento de datos por las empresas y el derecho de acceso';
    const sources = await searchTcSentencias(LONG_QUERY, 5);

    expect(Array.isArray(sources)).toBe(true);
    expect(sources.length).toBeGreaterThan(0);
    expect(sources.every((s) => s.kind === 'jurisprudencia')).toBe(true);
    // El primer intento fue la query completa (larga), no solo el subconjunto.
    expect(calls.length).toBeGreaterThan(1);
    expect(calls.some((c) => c.split(/\s+/).filter(Boolean).length > 3)).toBe(true);
    // Al menos una llamada usó el subconjunto "datos personales".
    expect(calls).toContain('datos personales');
  });
});

// Test B: consulta real mixta Ley 21.719 + TC debe obtener >= 1 fuente TC.
describe('Test B — consulta Ley 21.719 + TC', () => {
  it('recupera jurisprudencia TC cuando un subconjunto responde', async () => {
    const calls = mockTcFetch(
      strictTcHandler({
        'datos personales': [row(100, '9666-2024')],
      }),
    );

    const sources = await searchTcSentencias(MIXED_QUERY, 8);
    expect(sources.length).toBeGreaterThanOrEqual(1);
    expect(sources[0].id).toBe('tc-100');
    expect(calls).toContain('datos personales');
  });
});

// Test C: deduplicación — el mismo id no debe repetirse.
describe('Test C — deduplicación', () => {
  it('deduplica la misma sentencia devuelta por varias queries', async () => {
    mockTcFetch((search) => {
      // Devuelve la misma sentencia (mismo id) para varios subconjuntos.
      if (search === 'datos personales' || search === 'personales vida') {
        return [row(7, '7700-2021')];
      }
      return [];
    });

    const LONG_QUERY =
      'que la proteccion de datos personales y de la vida privada de las personas';
    const sources = await searchTcSentencias(LONG_QUERY, 8);
    const unique = new Set(sources.map((s) => s.id));
    expect(unique.size).toBe(1);
  });
});

// Test D: consulta sin resultados en absoluto debe devolver [].
describe('Test D — sin resultados reales', () => {
  it('devuelve [] cuando ni la query ni los fallbacks encuentran nada', async () => {
    mockTcFetch(() => []);
    const sources = await searchTcSentencias(MIXED_QUERY, 8);
    expect(sources).toEqual([]);
  });
});

// Test E: respeta el límite aunque los fallbacks produzcan muchos resultados.
describe('Test E — límite', () => {
  it('presenta como máximo `limit` fuentes', async () => {
    const manyRows = Array.from({ length: 8 }, (_, i) => row(1000 + i, `${1000 + i}-2020`));
    mockTcFetch((search) => (search === 'datos personales' ? manyRows : []));

    const sources = await searchTcSentencias(MIXED_QUERY, 2);
    expect(sources.length).toBe(2);
  });
});

// Test F — seguridad de logs: no se registra la query cruda ni datos personales.
describe('Test F — seguridad de logs', () => {
  it('no expone la query cruda ni datos personales en logs', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockTcFetch(() => [row(1, '1000-2020')]);

    const personalQuery =
      '¿puede Juan Pérez con RUT 12.345.678-9 demandar a la empresa por el tratamiento de datos personales y la vida privada?';
    await searchTcSentencias(personalQuery, 4);

    const logs = warnSpy.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(logs).toContain('jurisprudence_tc_query');
    // nombres/RUT/query nunca deben aparecer en texto plano.
    expect(logs).not.toContain('Pérez');
    expect(logs).not.toContain('12.345.678-9');
    expect(logs).not.toContain('¿puede Juan');
    expect(logs).not.toContain('demandar');
  });
});