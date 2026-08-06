import { describe, it, expect } from 'vitest';
import {
  splitSentences,
  verifySynthesis,
  buildSynthesis,
  verifyAndBuildSynthesis,
  constrainOpenEndedEnumerations,
} from './synthesisVerifier.mjs';

const claim = (id, kind, afirmacion, fragmento, fragment_id = null) => ({
  source_id: id,
  fragment_id,
  afirmacion,
  fragmento,
  source: { kind },
});

describe('Fase 4.1 · síntesis verificada', () => {
  const claims = [
    claim(
      'bcn-21719',
      'normativa',
      'La Ley 21.719 reconoce los derechos de acceso, rectificación, supresión, oposición, portabilidad y bloqueo.',
      'Toda persona tiene derecho de acceso, rectificación, supresión, oposición, portabilidad y bloqueo de sus datos personales.',
      'frag:1209272:1',
    ),
    claim(
      'tc-1',
      'jurisprudencia',
      'El Tribunal Constitucional sostuvo en este caso que la protección de datos es un derecho fundamental.',
      'se reconoce como derecho fundamental',
    ),
  ];

  it('I: elimina una conclusión sin respaldo (oración inventada)', () => {
    const { sentences, warnings } = verifySynthesis(
      'La ley obliga a indemnizar automáticamente al titular por cualquier daño, lo que no está en las fuentes.',
      claims,
    );
    expect(sentences[0].dropped).toBe(true);
    expect(warnings.length).toBeGreaterThan(0);
  });

  it('conserva oraciones respaldadas por un claim y vincula source_id/fragment_id', () => {
    const { sentences } = verifySynthesis(
      'La ley reconoce el derecho de acceso, rectificación, supresión, oposición, portabilidad y bloqueo de los datos personales.',
      claims,
    );
    expect(sentences[0].dropped).toBe(false);
    expect(sentences[0].category).toBe('normativa');
    expect(sentences[0].source_ids).toContain('bcn-21719');
    expect(sentences[0].fragment_ids).toContain('frag:1209272:1');
  });

  it('no convierte jurisprudencia en normativa: oración con marco discursivo distinto al claim se elimina', () => {
    const { sentences } = verifySynthesis(
      'El tribunal ordena el pago inmediato de una indemnización laboral en todos los casos.',
      claims,
    );
    expect(sentences[0].dropped).toBe(true);
  });

  it('etiqueta como inferencia una oración con lenguaje modal construible desde claims', () => {
    const { sentences } = verifySynthesis(
      'Sobre la base de estas fuentes, puede inferirse que el régimen de protección de datos reconoce estos derechos al titular.',
      claims,
    );
    expect(sentences[0].dropped).toBe(false);
    expect(sentences[0].inference).toBe(true);
    expect(sentences[0].category).toBe('inferencia');
  });

  it('splitSentences separa oraciones protegiendo abreviaturas y números', () => {
    expect(splitSentences('La ley regula. El art. 4 establece el derecho. Ver Ley 21.719.')).toEqual([
      'La ley regula.',
      'El art. 4 establece el derecho.',
      'Ver Ley 21.719.',
    ]);
  });

  it('buildSynthesis arma el texto final con marcos de categoría e inferencia explícita', () => {
    const { sentences } = verifySynthesis(
      'La ley reconoce el derecho de acceso de los datos personales. Sobre la base de estas fuentes, puede inferirse que la norma también reconoce la supresión y la portabilidad.',
      claims,
    );
    expect(sentences[0].dropped).toBe(false);
    const text = buildSynthesis(sentences);
    expect(text).toContain('La norma establece');
    expect(text).toContain('Inferencia del sistema');
  });

  it('verifyAndBuildSynthesis devuelve síntesis vacía cuando todo se elimina', () => {
    const { síntesis, warnings } = verifyAndBuildSynthesis(
      'Los marcianos regalan derechos laborales a los extraterrestres.',
      claims,
    );
    expect(síntesis).toBe('');
    expect(warnings.length).toBeGreaterThan(0);
  });
});

describe('Fase 4.1.3 · enumeraciones cerradas (no ampliar lo que la evidencia cierra)', () => {
  const rightsClaim = [
    {
      source_id: 'bcn-21719',
      fragment_id: 'frag:1209272:1',
      afirmacion:
        'La Ley 21.719 reconoce los derechos de acceso, rectificación, supresión, oposición, portabilidad y bloqueo.',
      fragmento:
        'Toda persona tiene derecho de acceso, rectificación, supresión, oposición, portabilidad y bloqueo de sus datos personales.',
      source: { kind: 'normativa' },
    },
  ];

  it('elimina "entre otros" cuando la enumeración coincide con la lista cerrada de la evidencia', () => {
    const { sentences } = constrainOpenEndedEnumerations(
      [{ text: 'La ley reconoce el derecho de acceso, rectificación, supresión, oposición, portabilidad y bloqueo, entre otros.', dropped: false }],
      rightsClaim,
    );
    expect(sentences[0].text).toContain('portabilidad y bloqueo');
    expect(sentences[0].text).not.toContain('entre otros');
    expect(sentences[0].text).toMatch(/bloqueo\.$/);
  });

  it('no elimina "entre otros" cuando la lista del texto NO coincide con la evidencia (conservadora)', () => {
    const { sentences } = constrainOpenEndedEnumerations(
      [{ text: 'La ley reconoce el derecho a conocer, rectificar y eliminar sus datos, entre otros.', dropped: false }],
      rightsClaim,
    );
    expect(sentences[0].text).toContain('entre otros');
  });

  it('no elimina expresiones de apertura cuando la evidencia NO presenta la lista como cerrada', () => {
    const openClaim = [
      {
        source_id: 'bcn-x',
        afirmacion: 'La ley reconoce derechos como acceso, rectificación y otros.',
        fragmento: 'Se reconocen derechos como acceso, rectificación, supresión y otros.',
        source: { kind: 'normativa' },
      },
    ];
    const { sentences } = constrainOpenEndedEnumerations(
      [{ text: 'La ley reconoce el derecho de acceso, rectificación y supresión, entre otros.', dropped: false }],
      openClaim,
    );
    expect(sentences[0].text).toContain('entre otros');
  });

  it('no modifica textos sin expresiones de apertura', () => {
    const { sentences } = constrainOpenEndedEnumerations(
      [{ text: 'La ley reconoce el derecho de acceso, rectificación, supresión, oposición, portabilidad y bloqueo.', dropped: false }],
      rightsClaim,
    );
    expect(sentences[0].text).toBe('La ley reconoce el derecho de acceso, rectificación, supresión, oposición, portabilidad y bloqueo.');
  });

  it('verifyAndBuildSynthesis aplica la regla end-to-end y emite advertencia', () => {
    const { síntesis, warnings } = verifyAndBuildSynthesis(
      'La ley reconoce el derecho de acceso, rectificación, supresión, oposición, portabilidad y bloqueo, entre otros.',
      rightsClaim,
    );
    expect(síntesis).not.toContain('entre otros');
    expect(síntesis).toContain('portabilidad y bloqueo');
    expect(warnings.some((w) => w.includes('enumeración'))).toBe(true);
  });
});