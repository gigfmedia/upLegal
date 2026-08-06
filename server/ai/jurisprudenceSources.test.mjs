import { describe, it, expect } from 'vitest';
import {
  extractLawNumber,
  htmlToPlainText,
  splitLawArticles,
  rankFragments,
  buildVigenciaDetail,
  formatChileanDate,
  detectNormVigency,
} from './jurisprudenceSources.mjs';

describe('extractLawNumber', () => {
  it('detecta el número en "Ley 21.719"', () => {
    expect(extractLawNumber('¿Qué establece la Ley 21.719 sobre protección de datos personales?')).toContain('21719');
  });
  it('detecta "Ley N° 21.719"', () => {
    expect(extractLawNumber('Ley N° 21.719')).toContain('21719');
  });
  it('detecta "Ley Nº 21.719" (con ordinal femenino)', () => {
    expect(extractLawNumber('Ley Nº 21.719')).toContain('21719');
  });
  it('detecta "ley 21719" sin puntuación', () => {
    expect(extractLawNumber('ley 21719')).toContain('21719');
  });
  it('detecta preguntas con número de ley', () => {
    expect(extractLawNumber('¿Qué derechos reconoce la Ley 21.719?')).toContain('21719');
  });
  it('detecta otras leyes (Ley 19.628)', () => {
    expect(extractLawNumber('Ley 19.628')).toContain('19628');
  });
  it('devuelve vacío para una consulta general sin número de ley', () => {
    expect(extractLawNumber('consulta general sobre protección de datos sin número de ley')).toEqual([]);
  });
  it('devuelve vacío para frases sin numeración', () => {
    expect(extractLawNumber('La declaración de cumplimiento')).toEqual([]);
  });
});

describe('detectNormVigency', () => {
  it('usa la vigencia diferida reportada por BCN', () => {
    expect(
      detectNormVigency('REGULA ...', {
        derogado: false,
        tipoVersionS: 'Con Vigencia Diferida por Fecha',
        inicioVigencia: '2026-12-01',
      }),
    ).toBe('diferida');
  });
  it('marca como derogada cuando BCN lo indica', () => {
    expect(detectNormVigency('Título', { derogado: true })).toBe('derogada');
  });
  it('no inventa vigente cuando BCN no aporta información', () => {
    expect(detectNormVigency('REGULA ALGO SIN INDICIOS')).toBe('desconocida');
  });
  it('sigue usando el título como pista de menor confianza', () => {
    expect(detectNormVigency('TEXTO REFUNDIDO Y ACTUALIZADO ...')).toBe('vigente');
  });
});

describe('buildVigenciaDetail / formatChileanDate', () => {
  it('diferencia publicación de entrada en vigencia (01-DIC-2026)', () => {
    expect(
      buildVigenciaDetail({
        tipo_version_s: 'Con Vigencia Diferida por Fecha',
        fecha_publicacion: '2024-12-13',
        vigencia: { inicio_vigencia: '2026-12-01' },
      }),
    ).toBe('Con Vigencia Diferida por Fecha · entra en vigencia el 01-DIC-2026 · publicada el 2024-12-13');
  });
  it('da formato chileno a la fecha', () => {
    expect(formatChileanDate('2026-12-01')).toBe('01-DIC-2026');
  });
});

describe('htmlToPlainText', () => {
it('decodifica entidades y quita tags', () => {
    const out = htmlToPlainText('<div><p>Art&#xED;culo 1&#176;.- Protecci&oacute;n de datos</p></div>');
    expect(out).toContain('Artículo 1°');
    expect(out).toContain('Protección');
    expect(out).not.toContain('<p>');
    expect(out).not.toContain('&#xED;');
  });
});

describe('splitLawArticles', () => {
  it('separa artículos de número y ordinal conservando etiqueta y texto', () => {
    const frags = splitLawArticles(
      'Artículo primero.- Introduce modificaciones a la ley. Artículo 2°.- Establece el tratamiento. Art. 3.- Regula otra materia.',
    );
    expect(frags.length).toBe(3);
    expect(frags[0].article).toBe('Artículo primero');
    expect(frags[1].article).toMatch(/Artículo 2/);
    expect(frags[1].text).toContain('tratamiento');
  });
  it('devuelve un solo fragmento "Preámbulo" sin artículos', () => {
    const frags = splitLawArticles('Teniendo presente que el H. Congreso aprueba...');
    expect(frags).toHaveLength(1);
    expect(frags[0].article).toBe('Preámbulo');
  });
});

describe('rankFragments', () => {
  it('ordena primero los fragmentos con más términos pertinentes de la consulta', () => {
    const frags = [
      { article: 'Artículo 1', text: 'derechos de los titulares sobre datos personales y su tratamiento' },
      { article: 'Artículo 2', text: 'reglas de protección de datos en el ámbito laboral' },
      { article: 'Artículo 3', text: 'normas sobre consumo y publicidad' },
    ];
    const ranked = rankFragments('protección de datos personales', frags, { limit: 3 });
    expect(ranked[0].article).toBe('Artículo 1');
  });
});