import { describe, it, expect, vi, afterEach } from 'vitest';

// Fase 4.1.9 — FIX de extracción sustantiva de jurisprudencia TC. La API del TC
// entrega en `content` el texto completo del fallo, pero el inicio suele ser
// ruido OCR (números de página, "Código de validación", banners) sin el
// razonamiento. Antes el excerpt se truncaba al inicio, así que nunca llegaba
// la evidencia ("datos personales", "autodeterminación informativa") al LLM y
// el verifier no conservaba claims. Este fix extrae ventanas alrededor de los
// términos significativos de la consulta, priorizando bloques donde coinciden
// varios términos y conservando la materia/norma impugnada. Estos tests usan
// mocks que replican la estructura real del provider (content + headers OCR).

import {
  extractTcSubstantiveExcerpt,
  searchTcSentencias,
} from './jurisprudenceSources.mjs';

const TC_API_HOST = 'https://buscador-backend.tcchile.cl';

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

function mockTcFetch(handler) {
  globalThis.fetch = vi.fn(async (url) => {
    const target = String(url);
    if (!target.includes(TC_API_HOST)) throw new Error(`unhandled: ${url}`);
    const filter = JSON.parse(new URL(target).searchParams.get('filter'));
    return jsonResponse({ data: { results: handler(filter.search) } });
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  delete globalThis.fetch;
});

const QUERY =
  '¿Qué jurisprudencia del Tribunal Constitucional existe sobre la protección de datos personales en Chile?';

/** Reproduce la cabecera OCR real que aparece al inicio de `content`. */
function ocrHeader(rol) {
  return (
    '0000544\nQUINIENTOS CUARENTA Y CUATRO\n\n2022\n\nREPÚBLICA DE CHILE\n' +
    'TRIBUNAL CONSTITUCIONAL\n____________\n\nSentencia\n' +
    `Rol ${rol}-2020\n[26 de mayo de 2022]\n\n____________\n\n` +
    'Código de validación: 9666391f-d69d-4dd2-811d-4978ec9a58b1, el cual puede ' +
    'ser validado en el siguiente enlace: HTTPS://VALIDACION.TCCHILE.CL/\n'
  );
}

/** Razonamiento sustantivo (simula el articulado citado en el fallo). */
const SUSTANTIVE_REASONING =
  'VISTOS:\n\n' +
  '1°. Que, respecto del derecho a la protección de los datos personales, este ' +
  'Tribunal ha señalado que la autodeterminación informativa permite a los ' +
  'titulares de los datos conservar el derecho a reclamar el borrado y la ' +
  'eliminación de toda base o medio de tratamiento de los datos que no deban ' +
  'ser tratados.\n\n' +
  '2°. Que el derecho de reclamación ante el tratador de datos, junto con el ' +
  'establecimiento de garantías para que no sea denegado, es parte de los ' +
  'derechos ARCO reconocidos por la doctrina y la jurisprudencia.' ;

function realRow(id, rol, content) {
  return {
    id: String(id),
    rol: String(rol),
    competenciaShortName: 'INA-STC',
    highlightParagraphs: [
      { full: 'protección de los datos personales y autodeterminación informativa' },
    ],
    content,
  };
}

describe('Fase 4.1.9 — extracción query-aware con texto sustantivo real', () => {
  it('tc-9557: el excerpt es sustantivo (no OCR) e incluye los términos de la consulta', () => {
    const content = ocrHeader('9557') + SUSTANTIVE_REASONING;
    const { excerpt, excerpt_source } = extractTcSubstantiveExcerpt(
      realRow(9557, '9557-2020', content),
      QUERY,
    );
    expect(excerpt_source).toBe('content_query');
    expect(excerpt).toContain('protección de los datos personales');
    expect(excerpt).toContain('autodeterminación informativa');
    expect(excerpt).toContain('tratamiento');
    // El excerpt NO es solo cabecera/OCR.
    expect(excerpt).not.toBe('0000544');
    expect(excerpt).toMatch(/vistos|considerando|derecho/i);
    // La fuente mantiene su identidad (se valida en mapTcRow/searchTcSentencias).
    expect(excerpt.length).toBeGreaterThan(200);
  });

  it('tc-9666: prioriza el bloque donde coinciden varios términos relevantes', () => {
    const content =
      ocrHeader('9666') +
      'UN BLOQUE IRRELEVANTE SOBRE TRÁMITE DE FERIAS Y RECESO JUDICIAL.\n\n' +
      SUSTANTIVE_REASONING;
    const { excerpt } = extractTcSubstantiveExcerpt(
      realRow(9666, '9666-2020', content),
      QUERY,
    );
    expect(excerpt).toContain('datos personales');
    expect(excerpt).toContain('autodeterminación informativa');
    // El bloque incidente sin términos de la consulta no domina el excerpt.
    expect(excerpt).not.toMatch(/FERIAS Y RECESO/i);
  });

  it('tc-9511: no inventa términos ausentes en la fuente', () => {
    const content = ocrHeader('9511') + 'VISTOS: relativo a la vida privada.';
    const { excerpt, excerpt_source } = extractTcSubstantiveExcerpt(
      realRow(9511, '9511-2020', content),
      QUERY,
    );
    // Sin evidencia real de los términos, no se fabrica contenido.
    expect(excerpt).not.toContain('autodeterminación informativa');
    expect(excerpt).not.toContain('datos personales');
    expect(excerpt_source).not.toBe('content_query');
  });

  it('bloque top que excede el presupuesto no truncata el excerpt (regresión 4.1.9)', () => {
    // Bloque A: enorme (supera TC_SUBSTANTIVE_SOURCE_CHARS por sí solo) y con
    // varios términos de la consulta (score alto), seguido por bloques menores.
    const hugoBlock =
      'OCTOGÉSIMO SÉPTIMO: Que el derecho a la protección de los datos personales ' +
      'comprende un conjunto de facultades tales como el derecho de acceso, de ' +
      'complementación de datos, de rectificación y de cancelación, de modo que ' +
      'los titulares puedan controlar el tratamiento de sus datos personales. '.repeat(60);
    const accessBlock =
      'NONAGÉSIMO: Que la autodeterminación informativa permite a los titulares de ' +
      'los datos conservar el derecho a reclamar el borrado y la eliminación de ' +
      'toda base o medio de tratamiento de los datos que no deban ser tratados.';
    const content = ocrHeader('9666') + hugoBlock + '\n\n' + accessBlock;

    const { excerpt } = extractTcSubstantiveExcerpt(realRow(9666, '9666-2020', content), QUERY);
    // El bloque de mayor score excede el presupuesto, pero no debe truncar la
    // selección: los bloques posteriores más pequeños aportan la evidencia.
    expect(excerpt).toContain('autodeterminación informativa');
    expect(excerpt).toContain('borrado');
    expect(excerpt.length).toBeGreaterThan(200);
  });

  it('deterministica: misma fila y misma query producen el mismo excerpt', () => {
    const content = ocrHeader('9557') + SUSTANTIVE_REASONING;
    const a = extractTcSubstantiveExcerpt(realRow(9557, '9557-2020', content), QUERY);
    const b = extractTcSubstantiveExcerpt(realRow(9557, '9557-2020', content), QUERY);
    expect(a).toEqual(b);
  });

  it('sin query conserva el comportamiento historico (inicio del content)', () => {
    const content = ocrHeader('9557') + SUSTANTIVE_REASONING;
    const { excerpt, excerpt_source } = extractTcSubstantiveExcerpt(
      realRow(9557, '9557-2020', content),
    );
    expect(excerpt_source).toBe('content');
    // Sin query no hay extracción query-aware: se parte desde el inicio crudo.
    expect(excerpt.startsWith('0000544')).toBe(true);
    expect(excerpt).toMatch(/vistos/i);
  });
});

describe('Fase 4.1.9 — regresión pipeline: la fuente conserva su identidad y evidencia', () => {
  it('recupera tc-9557 vía searchTcSentencias con excerpt sustantivo y id intacto', async () => {
    mockTcFetch((search) => {
      if (search === 'datos personales') {
        return [realRow(9557, '9557-2020', ocrHeader('9557') + SUSTANTIVE_REASONING)];
      }
      return [];
    });

    const sources = await searchTcSentencias(
      '¿Qué jurisprudencia existe sobre la protección de datos personales?',
      4,
    );

    expect(sources.length).toBe(1);
    const source = sources[0];
    expect(source.id).toBe('tc-9557');
    expect(source.kind).toBe('jurisprudencia');
    expect(source.excerpt).toContain('protección de los datos personales');
    expect(source.excerpt).toContain('autodeterminación informativa');
    expect(source.metadata.rol).toBe('9557-2020');
    expect(source.url).toContain('9557');
  });

  it('recupera tc-9666 y tc-9511 con evidencia sustantiva y sus ids', async () => {
    mockTcFetch((search) => {
      if (search === 'titulares datos personales') {
        return [
          realRow(9666, '9666-2020', ocrHeader('9666') + SUSTANTIVE_REASONING),
          realRow(9511, '9511-2020', ocrHeader('9511') + SUSTANTIVE_REASONING),
        ];
      }
      return [];
    });

    const sources = await searchTcSentencias(
      '¿qué derechos tienen los titulares de datos personales?',
      4,
    );

    const ids = sources.map((s) => s.id).sort();
    expect(ids).toContain('tc-9666');
    expect(ids).toContain('tc-9511');
    for (const source of sources) {
      expect(source.excerpt.length).toBeGreaterThan(200);
    }
  });
});