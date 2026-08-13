import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { buildSourceEvidencePlan } from '@/hooks/useAIResearch';
import { constrainResumenOverstatement } from '@/components/legalup-ai/resumenConstraint';
import { SourceClaims } from '@/components/legalup-ai/AIResearchPanel';
import type { AIResearchSource } from '@/hooks/useAIResearch';

afterEach(() => cleanup());

// ---------------------------------------------------------------------------
// Fase 4.2.6-FE: el backend devuelve evidencia DOCUMENTAL del caso (category
// "document") diferenciada de las fuentes jurídicas. El frontend debe tiparla,
// renderizarla como evidencia del documento y NO romper las categorías previas
// (normativa/jurisprudencia/doctrina) ni las respuestas antiguas.
// ---------------------------------------------------------------------------

const DOC_FRAGMENT_ID = 'document::doc-abc-123::0';

/** Fuente documental tal como la persiste el backend de Fase 4.2.6. */
function documentSource(overrides: Partial<AIResearchSource> = {}): AIResearchSource {
  return {
    id: 'doc-abc-123',
    kind: 'document',
    citation: 'Contrato de arrendamiento.pdf',
    claims: [
      {
        source_id: 'doc-abc-123',
        fragment_id: DOC_FRAGMENT_ID,
        category: 'document',
        afirmacion: 'El contrato establece que la garantía será restituida a la terminación del arrendamiento.',
        evidencia: 'La garantía será restituida íntegramente al término del contrato, sin perjuicio de las deducciones justificadas.',
        verified: true,
        vigencia: null,
        vigencia_nota: null,
      },
    ],
    ...overrides,
  };
}

/** Fuente normativa (shape previo a Fase 4.2.6, debe seguir funcionando). */
function normSource(overrides: Partial<AIResearchSource> = {}): AIResearchSource {
  return {
    id: 'bcn-1209272',
    kind: 'normativa',
    citation: 'Ley N° 21.719',
    metadata: {
      fragments: [
        { id: 'frag:1209272:1', article: 'Artículo 4º', text: 'Toda persona tiene derecho de acceso, rectificación, supresión, oposición, portabilidad y bloqueo.' },
      ],
    },
    claims: [
      {
        source_id: 'bcn-1209272',
        fragment_id: 'frag:1209272:1',
        category: 'normativa',
        afirmacion: 'La ley reconoce los derechos del titular.',
        evidencia: 'Toda persona tiene derecho de acceso, rectificación, supresión, oposición, portabilidad y bloqueo.',
        verified: true,
      },
    ],
    ...overrides,
  };
}

describe('buildSourceEvidencePlan — evidencia documental (category "document")', () => {
  it('una claim document se convierte en evidencia principal con su fragment_id y texto literal', () => {
    const plan = buildSourceEvidencePlan(documentSource());
    expect(plan.primary).toHaveLength(1);
    expect(plan.primary[0].fragment_id).toBe(DOC_FRAGMENT_ID);
    expect(plan.primary[0].afirmacion).toContain('garantía será restituida');
    expect(plan.primary[0].evidencia).toContain('La garantía será restituida íntegramente');
    // Un documento no tiene artículo de norma: article queda null, sin chip inventado.
    expect(plan.primary[0].article).toBeNull();
    // Sin metadata.fragments no hay "contexto secundario" fabricado.
    expect(plan.context).toHaveLength(0);
  });

  it('documento sin claims verificados → sin evidencia principal', () => {
    const plan = buildSourceEvidencePlan(documentSource({ claims: [] }));
    expect(plan.primary).toHaveLength(0);
  });

  it('claim documental no verificado NO se presenta como evidencia', () => {
    const plan = buildSourceEvidencePlan(
      documentSource({
        claims: [
          {
            source_id: 'doc-abc-123',
            fragment_id: DOC_FRAGMENT_ID,
            category: 'document',
            afirmacion: 'El contrato establece una multa del 10%.',
            evidencia: 'En caso de mora, se aplicará una multa.',
            verified: false,
          },
        ],
      }),
    );
    expect(plan.primary).toHaveLength(0);
  });

  it('categorías previas NO se rompen: normativa conserva su artículo', () => {
    const plan = buildSourceEvidencePlan(normSource());
    expect(plan.primary).toHaveLength(1);
    expect(plan.primary[0].article).toBe('Artículo 4º');
    expect(plan.primary[0].fragment_id).toBe('frag:1209272:1');
  });

  it('claim de jurisprudencia y doctrina siguen siendo evidencia', () => {
    const jurPlan = buildSourceEvidencePlan({
      id: 'tc-123',
      kind: 'jurisprudencia',
      citation: 'Tribunal Constitucional — Rol 12.345',
      claims: [
        {
          source_id: 'tc-123',
          fragment_id: null,
          category: 'jurisprudencia',
          afirmacion: 'El TC declaró admisible el requerimiento.',
          evidencia: 'SE declara admisible el requerimiento de inaplicabilidad.',
          verified: true,
        },
      ],
    });
    expect(jurPlan.primary).toHaveLength(1);
    expect(jurPlan.primary[0].afirmacion).toContain('admisible');
  });
});

describe('Respuesta antigua y ausencia de research_type (retrocompatibilidad)', () => {
  it('una fuente antigua sin research_type ni claims documentales funciona igual', () => {
    const oldSource: AIResearchSource = {
      id: 'bcn-1209272',
      kind: 'normativa',
      source_type: 'normativa',
      legal_authority: 'vinculante',
      vigency: 'vigente',
      title: 'Ley 21.719',
      citation: 'Ley N° 21.719',
      excerpt: 'idNorma 1209272 · Ley N° 21.719 · Vigente',
      claims: [
        {
          source_id: 'bcn-1209272',
          fragment_id: 'frag:1209272:1',
          category: 'normativa',
          afirmacion: 'Regula el tratamiento de datos personales.',
          evidencia: 'El tratamiento de datos personales se regula por esta ley.',
          verified: true,
        },
      ],
    };
    const plan = buildSourceEvidencePlan(oldSource);
    expect(plan.primary).toHaveLength(1);
    expect(plan.primary[0].afirmacion).toContain('tratamiento de datos personales');
  });

  it('constrainResumenOverstatement no se rompe sin research_type y procesa una fuente documental', () => {
    const answer = `**Respuesta breve**

El contrato establece la restitución de la garantía, entre otros.

**Hechos del caso (documentos)**

- **Contrato de arrendamiento.pdf**: la garantía se restituye al término.`;
    const out = constrainResumenOverstatement(answer, [documentSource()]);
    // La respuesta sigue procesándose (no se rompe por la fuente documental).
    expect(out).toContain('**Respuesta breve**');
    expect(out).toContain('**Hechos del caso (documentos)**');
    // Regla conservadora: sin enumeración cerrada equivalente, no se modifica.
    expect(out).toContain('entre otros');
  });

  it('la evidencia documental puede cerrar una enumeración del resumen', () => {
    const answer = `**Respuesta breve**

El contrato obliga al pago del arriendo, mantención y seguro, entre otros.`;
    const doc = documentSource({
      claims: [
        {
          source_id: 'doc-abc-123',
          fragment_id: DOC_FRAGMENT_ID,
          category: 'document',
          afirmacion: 'El contrato obliga al arriendo, mantención y seguro.',
          evidencia: 'El arrendatario paga el arriendo, mantención y seguro de la propiedad.',
          verified: true,
        },
      ],
    });
    const out = constrainResumenOverstatement(answer, [doc]);
    expect(out).not.toContain('entre otros');
    expect(out).toContain('seguro.');
  });

  it('respuesta sin sección de Respuesta breve devuelve el texto intacto', () => {
    const out = constrainResumenOverstatement('Solo un texto.', [documentSource()]);
    expect(out).toBe('Solo un texto.');
  });
});

describe('SourceClaims — la UI distingue evidencia documental de fuente jurídica', () => {
  it('renderiza una claim document como "Evidencia del documento" con su fragmento', () => {
    render(<SourceClaims source={documentSource()} />);
    expect(screen.getByText('Evidencia del documento')).toBeTruthy();
    // La afirmación aparece en el claim y el texto citado es la evidencia.
    expect(screen.getAllByText(/garantía será restituida/).length).toBeGreaterThan(0);
    expect(screen.getByText(/La garantía será restituida íntegramente/)).toBeTruthy();
    expect(screen.getByText('fragmento del documento')).toBeTruthy();
    expect(screen.getByText(DOC_FRAGMENT_ID)).toBeTruthy();
  });

  it('una claim de norma sigue renderizando como "Evidencia" con su artículo y "fragmento de la fuente"', () => {
    render(<SourceClaims source={normSource()} />);
    expect(screen.getByText('Evidencia')).toBeTruthy();
    expect(screen.getByText('Artículo 4º')).toBeTruthy();
    expect(screen.getByText('fragmento de la fuente')).toBeTruthy();
    expect(screen.queryByText('Evidencia del documento')).toBeNull();
  });

  it('una fuente sin claims verificados no muestra evidencia', () => {
    const { container } = render(
      <SourceClaims source={documentSource({ claims: [] })} />,
    );
    expect(container.textContent ?? '').toBe('');
  });
});
