import { describe, it, expect } from 'vitest';

// Fase 4.1.4 — regresión de calidad de evidencia TC. La API del TC entrega
// `content` (el texto completo de la sentencia, "VISTOS Y CONSIDERANDO…") y,
// para varios roles, `highlightParagraphs` que solo contienen cabeceras de
// notificación/correo o bloques de cierre (firmas) — no el razonamiento del
// fallo. El fix extrae el excerpt sustantivo priorizando `content` y limpiando
// cabeceras, sin tocar `fragmentIsSupported` ni `verifyJurisprudenceClaims`.

import { extractTcSubstantiveExcerpt, cleanTcSubstantiveText } from './jurisprudenceSources.mjs';
import { verifyJurisprudenceClaims } from './jurisprudencePrompt.mjs';

const EMAILER =
  'De: Notificaciones Tc\nEnviado el: lunes, 8 de agosto de 2022 10:31\n' +
  'Para: mreyes@ejemplo.cl\nAsunto: Comunica Resolución Rol 13450-22\n' +
  'Datos adjuntos: 87710_1.pdf';

const SIGN_OFF_HIGHLIGHT =
  'y archívese.\nRol N* 2857-15-CPR.\nPronunciado por el Excmo. Tribunal Constitucional,\n' +
  'integrado por su Presidente y los Ministros. Autoriza el Secretario subrogante.';

const CONTENT_13450 =
  'VISTOS Y CONSIDERANDO:\n' +
  '1°. Que esta Sala resolvió no admitir a tramitación el presente requerimiento.\n' +
  '2°. Que se aplicará el apercibimiento dispuesto por el artículo 82 de la Ley Orgánica Constitucional del Tribunal.';

const CONTENT_2857 =
  'Santiago, cuatro de agosto de dos mil quince.\n\n' +
  'VISTOS Y CONSIDERANDO:\n\n' +
  'PRIMERO.- Que el proyecto de ley fortalece la protección de los datos personales y de la vida privada de las personas.';

function sourceOf(id, rol, row) {
  const { excerpt } = extractTcSubstantiveExcerpt(row);
  return {
    id,
    kind: 'jurisprudencia',
    legal_authority: 'persuasiva',
    vigency: 'no_aplica',
    citation: `Tribunal Constitucional — Rol ${rol}`,
    excerpt,
    metadata: {
      rol,
      provider: 'tc_buscador',
      integrity: 'verified',
      legal_authority: 'persuasiva',
      vigency: 'no_aplica',
    },
  };
}

describe('Fase 4.1.4 — extracción de evidencia sustantiva', () => {
  it('Test A — highlight boilerplate con content vacío no se trata como evidencia sustantiva', () => {
    const { excerpt, excerpt_source } = extractTcSubstantiveExcerpt({
      id: 1,
      rol: 'X-1',
      highlightParagraphs: [{ full: EMAILER }],
      content: '',
    });
    expect(excerpt_source).not.toBe('content');
    expect(/considerando|vistos|constituci/i.test(excerpt)).toBe(false);
  });

  it('Test B — highlight jurídico válido se conserva cuando no hay content', () => {
    const { excerpt, excerpt_source } = extractTcSubstantiveExcerpt({
      id: 2,
      rol: 'X-2',
      highlightParagraphs: [{ full: CONTENT_2857 }],
      content: '',
    });
    expect(excerpt).toContain('CONSIDERANDO');
    expect(excerpt_source).toBe('highlight');
  });

  it('Test C — con content real se usa el texto jurídico incluso si highlight es boilerplate', () => {
    const { excerpt, excerpt_source } = extractTcSubstantiveExcerpt({
      id: 3,
      rol: 'X-3',
      highlightParagraphs: [{ full: EMAILER }],
      content: CONTENT_13450,
    });
    expect(excerpt_source).toBe('content');
    expect(excerpt).toContain('VISTOS Y CONSIDERANDO');
    expect(excerpt).not.toContain('Notificado');
  });

  it('Test D — rol 13450 (highlight email + content real) produce excerpt sustantivo', () => {
    const { excerpt, excerpt_source } = extractTcSubstantiveExcerpt({
      id: 13450,
      rol: '13450',
      highlightParagraphs: [{ full: EMAILER, summary: EMAILER }],
      content: CONTENT_13450,
    });
    expect(excerpt_source).toBe('content');
    expect(excerpt).toContain('CONSIDERANDO');
  });

  it('Test E — rol 2857 (highlight cierre + content real) produce excerpt sustantivo', () => {
    const { excerpt, excerpt_source } = extractTcSubstantiveExcerpt({
      id: 2857,
      rol: '2857',
      highlightParagraphs: [{ full: SIGN_OFF_HIGHLIGHT }],
      content: CONTENT_2857,
    });
    expect(excerpt_source).toBe('content');
    expect(excerpt).toContain('VISTOS Y CONSIDERANDO');
  });

  it('cleanTcSubstantiveText elimina cabeceras de correo sin borrar el resto', () => {
    const cleaned = cleanTcSubstantiveText(
      'De: Notificado\nAsunto: x\nCONTENIDO LEGAL',
    );
    expect(cleaned).not.toMatch(/Notificado/);
    expect(cleaned).toContain('CONTENIDO LEGAL');
  });
});

describe('Fase 4.1.4 — verificación sin relajar estándares', () => {
  it('Test F — claim respaldado por el nuevo excerpt se conserva', () => {
    const source = sourceOf('tc-13450', '13450', {
      highlightParagraphs: [{ full: EMAILER }],
      content: CONTENT_13450,
    });
    const supported = {
      fuente_id: 'tc-13450',
      afirmacion:
        'El Tribunal señaló que no admitiría a tramitación el requerimiento y aplicaría un apercibimiento.',
      fragmento:
        'Que se aplicará el apercibimiento dispuesto por el artículo 82 de la Ley Orgánica Constitucional',
    };
    const { kept } = verifyJurisprudenceClaims(
      [supported],
      new Map([['tc-13450', source]]),
      'jurisprudencia',
    );
    expect(kept).toHaveLength(1);
    expect(kept[0].source_id).toBe('tc-13450');
  });

  it('Test G — claim NO respaldado sigue siendo descartado', () => {
    const source = sourceOf('tc-13450', '13450', {
      highlightParagraphs: [{ full: EMAILER }],
      content: CONTENT_13450,
    });
    const unsupportedClaim = {
      fuente_id: 'tc-13450',
      afirmacion: 'El Tribunal ordenó una indemnización de un millón de dólares.',
      fragmento:
        'Se ordenó la indemnización de un millón de dólares por responsabilidad civil.',
    };
    const { kept } = verifyJurisprudenceClaims(
      [unsupportedClaim],
      new Map([['tc-13450', source]]),
      'jurisprudencia',
    );
    expect(kept).toHaveLength(0);
  });
});