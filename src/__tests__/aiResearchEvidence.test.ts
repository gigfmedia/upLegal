import { describe, it, expect } from 'vitest';
import { buildSourceEvidencePlan, type AIResearchSource } from '@/hooks/useAIResearch';

const FRAGMENTS = [
  { id: 'frag:1209272:1', article: 'Artículo 4º', text: 'Derechos del titular de datos. Toda persona tiene derecho a acceso, rectificación, supresión, oposición, portabilidad y bloqueo.' },
  { id: 'frag:1209272:2', article: 'Artículo 11', text: 'Procedimiento ante el responsable de datos.' },
  { id: 'frag:1209272:3', article: 'Artículo 14 quáter', text: 'Deber de protección desde el diseño.' },
  { id: 'frag:1209272:4', article: 'Artículo 14 quinquies', text: 'Deber de adoptar medidas de seguridad.' },
];

function normSource(overrides: Partial<AIResearchSource> = {}): AIResearchSource {
  return {
    id: 'bcn-1209272',
    kind: 'normativa',
    legal_authority: 'vinculante',
    citation: 'Ley N° 21.719',
    excerpt: FRAGMENTS.map((f) => `[${f.article}] ${f.text}`).join('\n\n'),
    metadata: { fragments: FRAGMENTS },
    claims: [],
    ...overrides,
  };
}

describe('buildSourceEvidencePlan — evidencia centrada en claims verificados (Fase 4.1.1)', () => {
  it('claim de Artículo 4º → selecciona frag:1209272:1 como evidencia principal', () => {
    const plan = buildSourceEvidencePlan(
      normSource({
        claims: [
          {
            source_id: 'bcn-1209272',
            fragment_id: 'frag:1209272:1',
            category: 'normativa',
            afirmacion: 'La ley reconoce los derechos de acceso, rectificación, supresión, oposición, portabilidad y bloqueo.',
            evidencia: FRAGMENTS[0].text,
            verified: true,
          },
        ],
      }),
    );
    expect(plan.primary).toHaveLength(1);
    expect(plan.primary[0].fragment_id).toBe('frag:1209272:1');
    expect(plan.primary[0].article).toBe('Artículo 4º');
    expect(plan.primary[0].evidencia).toContain('acceso, rectificación, supresión');
  });

  it('fragmentos no usados (Art. 11, 14 quinquies) NO aparecen como evidencia principal', () => {
    const plan = buildSourceEvidencePlan(
      normSource({
        claims: [
          {
            source_id: 'bcn-1209272',
            fragment_id: 'frag:1209272:1',
            category: 'normativa',
            afirmacion: 'Reconoce los derechos del titular.',
            evidencia: FRAGMENTS[0].text,
            verified: true,
          },
        ],
      }),
    );
    expect(plan.primary).toHaveLength(1);
    expect(plan.primary[0].fragment_id).toBe('frag:1209272:1');
    expect(plan.primary.some((c) => c.article?.includes('11'))).toBe(false);
    expect(plan.primary.some((c) => c.article?.includes('quinquies'))).toBe(false);
    // Los no usados quedan en contexto secundario.
    expect(plan.context.map((f) => f.id)).toContain('frag:1209272:2');
    expect(plan.context.map((f) => f.id)).toContain('frag:1209272:4');
  });

  it('claims sobre Art. 4º y Art. 11 → ambos fragmentos como evidencia principal', () => {
    const plan = buildSourceEvidencePlan(
      normSource({
        claims: [
          {
            source_id: 'bcn-1209272',
            fragment_id: 'frag:1209272:1',
            category: 'normativa',
            afirmacion: 'Reconoce los derechos del titular.',
            evidencia: FRAGMENTS[0].text,
            verified: true,
          },
          {
            source_id: 'bcn-1209272',
            fragment_id: 'frag:1209272:2',
            category: 'normativa',
            afirmacion: 'Regula el procedimiento ante el responsable.',
            evidencia: FRAGMENTS[1].text,
            verified: true,
          },
        ],
      }),
    );
    const ids = plan.primary.map((c) => c.fragment_id);
    expect(ids).toContain('frag:1209272:1');
    expect(ids).toContain('frag:1209272:2');
    expect(plan.primary).toHaveLength(2);
  });

  it('fuente sin claims verificados → sin evidencia principal', () => {
    const plan = buildSourceEvidencePlan(
      normSource({
        claims: [
          {
            source_id: 'bcn-1209272',
            fragment_id: 'frag:1209272:1',
            category: 'normativa',
            afirmacion: 'Reconoce los derechos del titular.',
            evidencia: FRAGMENTS[0].text,
            verified: false, // NO verificado → no puede ser evidencia.
          },
        ],
      }),
    );
    expect(plan.primary).toHaveLength(0);
    // Todo queda como contexto (nada se presenta como evidencia puntual).
    expect(plan.context.map((f) => f.id)).toContain('frag:1209272:1');
  });

  it('fuente sin claims → sin evidencia principal y excerpt conservado', () => {
    const plan = buildSourceEvidencePlan(normSource({ claims: [] }));
    expect(plan.primary).toHaveLength(0);
    expect(plan.excerpt).toContain('Artículo 14 quinquies');
    expect(plan.context).toHaveLength(FRAGMENTS.length);
  });

  it('el Artículo 14 quinquies NO respalda los derechos: si el claim NO lo usa, no es evidencia', () => {
    const plan = buildSourceEvidencePlan(
      normSource({
        claims: [
          {
            source_id: 'bcn-1209272',
            fragment_id: 'frag:1209272:4', // Art. 14 quinquies (medidas de seguridad).
            category: 'normativa',
            afirmacion: 'Derechos de acceso, rectificación y supresión.',
            evidencia: FRAGMENTS[3].text,
            verified: true,
          },
        ],
      }),
    );
    // La evidencia apunta al fragmento citado; la selección no inventa el Art. 4º.
    expect(plan.primary[0].fragment_id).toBe('frag:1209272:4');
    expect(plan.primary[0].article).toBe('Artículo 14 quinquies');
    // El Art. 4º (que sí lista los derechos) queda como contexto, no como evidencia.
    expect(plan.context.map((f) => f.id)).toContain('frag:1209272:1');
  });
});