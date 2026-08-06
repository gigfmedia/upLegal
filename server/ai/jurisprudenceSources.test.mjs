import { describe, it, expect } from 'vitest';
import {
  extractLawNumber,
  htmlToPlainText,
  splitLawArticles,
  rankFragments,
  buildVigenciaDetail,
  formatChileanDate,
  detectNormVigency,
  formatNormNumber,
  fragmentSupportsClaim,
  resolveClaimFragment,
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

describe('formatNormNumber', () => {
  it('formatea números de ley en formato chileno (21719 → 21.719)', () => {
    expect(formatNormNumber('21719')).toBe('21.719');
    expect(formatNormNumber('19628')).toBe('19.628');
    expect(formatNormNumber('11207')).toBe('11.207');
  });
  it('conserva separadores ya presentes y números cortos', () => {
    expect(formatNormNumber('21.719')).toBe('21.719');
    expect(formatNormNumber('4')).toBe('4');
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

// ---------------------------------------------------------------------------
// Fase 4.0.4 — Alineación exacta afirmación ↔ fragmento
// ---------------------------------------------------------------------------

const ley21719Fragments = [
  {
    id: 'frag:1209272:f1',
    article: 'Artículo 2',
    text: 'Derechos de los titulares: toda persona tiene derecho a acceso, rectificación, supresión, oposición, portabilidad y bloqueo de sus datos personales.',
  },
  {
    id: 'frag:1209272:f2',
    article: 'Artículo 14',
    text: 'El tratamiento de datos personales efectuado por organismos públicos se sujetará a las normas de esta ley.',
  },
  {
    id: 'frag:1209272:f3',
    article: 'Artículo 5',
    text: 'El responsable del tratamiento deberá informar de manera clara y verificable al titular de datos personales.',
  },
];

describe('fragmentSupportsClaim', () => {
  it('afirmación sobre derechos de titulares respaldada por el fragmento que los lista', () => {
    const af = 'La ley reconoce el derecho de acceso, rectificación, supresión, oposición, portabilidad y bloqueo a los titulares';
    expect(fragmentSupportsClaim(ley21719Fragments[0], af)).toBe(true);
  });
  it('un fragmento sobre organismos públicos NO respalda la lista de derechos', () => {
    const af = 'La ley reconoce el derecho de acceso, rectificación, supresión, oposición, portabilidad y bloqueo a los titulares';
    expect(fragmentSupportsClaim(ley21719Fragments[1], af)).toBe(false);
  });
  it('deber de información queda respaldado por el fragmento de información al titular', () => {
    const af = 'El responsable debe informar al titular de datos personales el tratamiento';
    expect(fragmentSupportsClaim(ley21719Fragments[2], af)).toBe(true);
  });
  it('no respalda con menos de dos términos significativos', () => {
    expect(fragmentSupportsClaim(ley21719Fragments[0], 'y pues')).toBe(false);
  });
});

describe('resolveClaimFragment', () => {
  it('elige el fragmento de los derechos de los titulares (no el de organismos)', () => {
    const af = 'La ley reconoce el derecho de acceso, rectificación, supresión, oposición, portabilidad y bloqueo a los titulares';
    const resolved = resolveClaimFragment(af, ley21719Fragments);
    expect(resolved).not.toBeNull();
    expect(resolved.id).toBe('frag:1209272:f1');
    expect(resolved.article).toBe('Artículo 2');
  });
  it('objeto de la Ley: asocia al fragmento que regula el objeto de la materia', () => {
    const fragments = [
      { id: 'F1', article: 'Artículo 1', text: 'El objeto de esta ley es regular el tratamiento de datos personales en igualdad de condiciones.' },
      { id: 'F2', article: 'Artículo 14', text: 'Regulación sobre organismos públicos y su cumplimiento.' },
    ];
    const resolved = resolveClaimFragment('El objeto de la ley es regular el tratamiento de datos personales', fragments);
    expect(resolved?.id).toBe('F1');
  });
  it('supresión: elige el fragmento que menciona supresión de datos personales', () => {
    const fragments = [
      { id: 'F1', article: 'Artículo 2', text: 'derechos de acceso, rectificación, supresión y oposición de los datos personales' },
      { id: 'F2', article: 'Artículo 9', text: 'tratamiento de datos por fuerzas de orden y seguridad' },
    ];
    const resolved = resolveClaimFragment('El titular puede solicitar la supresión de sus datos personales', fragments);
    expect(resolved?.id).toBe('F1');
  });
  it('devuelve null cuando ningún fragmento respalda la afirmación', () => {
    const af = 'indemnización por despido injustificado del trabajador';
    expect(resolveClaimFragment(af, ley21719Fragments)).toBeNull();
  });
});