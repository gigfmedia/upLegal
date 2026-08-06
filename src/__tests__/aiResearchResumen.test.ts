import { describe, it, expect } from 'vitest';
import { constrainResumenOverstatement } from '@/components/legalup-ai/resumenConstraint';
import type { AIResearchSource } from '@/hooks/useAIResearch';

const sourceWithClaims = (claims: Array<{ afirmacion: string; evidencia: string }>): AIResearchSource[] => [
  {
    id: 'bcn-1209272',
    kind: 'normativa',
    citation: 'Ley N° 21.719',
    claims: claims.map((c) => ({ ...c, source_id: 'bcn-1209272', fragment_id: 'frag:1209272:1', category: 'normativa', verified: true })),
  },
];

const ANSWER = `**Respuesta breve**

La Ley 21.719 reconoce a los titulares de datos personales los derechos de acceso, rectificación, supresión, oposición, portabilidad y bloqueo, entre otros.

**Normativa relevante**

- **Ley N° 21.719**: regula la protección de datos.`;

describe('constrainResumenOverstatement — Respuesta breve sin ampliar enumeraciones cerradas (Fase 4.1.3)', () => {
  const derechosClaims = sourceWithClaims([
    {
      afirmacion: 'La Ley 21.719 reconoce los derechos de acceso, rectificación, supresión, oposición, portabilidad y bloqueo.',
      evidencia: 'Toda persona tiene derecho de acceso, rectificación, supresión, oposición, portabilidad y bloqueo de sus datos personales.',
    },
  ]);

  it('elimina "entre otros" cuando la lista coincide con la enumeración cerrada de la evidencia', () => {
    const out = constrainResumenOverstatement(ANSWER, derechosClaims);
    expect(out).not.toContain('entre otros');
    expect(out).toContain('portabilidad y bloqueo');
  });

  it('no modifica el texto si no hay claims verificados', () => {
    const out = constrainResumenOverstatement(ANSWER, []);
    expect(out).toBe(ANSWER);
  });

  it('no modifica la Respuesta breve si no existe la sección', () => {
    const out = constrainResumenOverstatement('Texto sin sección.', derechosClaims);
    expect(out).toBe('Texto sin sección.');
  });

  it('conserva las demás secciones del markdown intactas', () => {
    const out = constrainResumenOverstatement(ANSWER, derechosClaims);
    expect(out).toContain('**Normativa relevante**');
    expect(out).toContain('regula la protección de datos');
    expect(out).toContain('**Respuesta breve**');
  });

  it('NO elimina "entre otros" si la lista del resumen difiere de la evidencia (conservadora)', () => {
    const differentClaims = sourceWithClaims([
      {
        afirmacion: 'La ley reconoce el derecho a conocer, rectificar y eliminar sus datos.',
        evidencia: 'Se reconoce el derecho a conocer y rectificar los datos personales.',
      },
    ]);
    const out = constrainResumenOverstatement(ANSWER, differentClaims);
    expect(out).toContain('entre otros');
  });

  it('no modifica una Respuesta breve sin expresiones de apertura', () => {
    const cleanAnswer = `**Respuesta breve**

La Ley 21.719 reconoce los derechos de acceso, rectificación, supresión, oposición, portabilidad y bloqueo.`;
    const out = constrainResumenOverstatement(cleanAnswer, derechosClaims);
    expect(out).toBe(cleanAnswer);
  });
});
