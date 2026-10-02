import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AICaseFreeSnapshot } from '@/components/legalup-ai/AICaseFreeSnapshot';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

const intel = {
  workspace_id: 'w1',
  document_count: 1,
  pending_count: 0,
  failed_count: 0,
  total_documents: 1,
  documents: [],
  facts: [{ text: 'Hecho verificado' }, { text: 'Otro hecho' }],
  parties: [],
  obligations: [],
  deadlines: [],
  risks: ['Riesgo de plazo'],
  contradictions: [{ topic: 'Fecha del contrato', versions: [] }],
  missingInformation: ['Falta fecha de firma'],
  caseSummary: 'Resumen',
  attributionCoverage: 1,
};

const hookState = vi.hoisted(() => ({ data: null as unknown, isLoading: false, isError: false }));

vi.mock('@/hooks/useAIDocuments', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/useAIDocuments')>(
    '@/hooks/useAIDocuments'
  );
  return {
    ...actual,
    useAICaseIntelligence: () => ({
      data: hookState.data,
      isLoading: hookState.isLoading,
      isError: hookState.isError,
    }),
  };
});

beforeEach(() => {
  hookState.data = null;
  hookState.isLoading = false;
  hookState.isError = false;
});

describe('4.48B free intelligence snapshot (deterministic, 0 provider)', () => {
  it('free with metrics: correct counts, max 2 highlights', () => {
    hookState.data = intel;
    render(<AICaseFreeSnapshot workspaceId="w1" />);
    expect(screen.getByText('Estado del caso')).toBeInTheDocument();
    expect(screen.getByText('Documentos')).toBeInTheDocument();
    expect(screen.getByText('Hechos')).toBeInTheDocument();
    expect(screen.getByText('Riesgos')).toBeInTheDocument();
    expect(screen.getByText('Contradicciones')).toBeInTheDocument();
    expect(screen.getByText('Pendientes')).toBeInTheDocument();
    // risk first, then contradiction; missing capped at 2 highlights
    expect(screen.getByText('Riesgo de plazo')).toBeInTheDocument();
    expect(screen.queryByText('Falta fecha de firma')).not.toBeInTheDocument();
  });

  it('empty intelligence: minimal state, no zero grid', () => {
    hookState.data = { ...intel, document_count: 0, facts: [], risks: [], contradictions: [], missingInformation: [] };
    render(<AICaseFreeSnapshot workspaceId="w1" />);
    expect(
      screen.getByText('Agrega documentos para obtener más contexto sobre el caso.')
    ).toBeInTheDocument();
    expect(screen.queryByText('Hechos')).not.toBeInTheDocument();
  });

  it('loading skeleton, error hides card (overview stays usable)', () => {
    hookState.isLoading = true;
    const { unmount } = render(<AICaseFreeSnapshot workspaceId="w1" />);
    expect(screen.getByLabelText('Cargando estado del caso')).toBeInTheDocument();
    unmount();
    hookState.isLoading = false;
    hookState.isError = true;
    const { container } = render(<AICaseFreeSnapshot workspaceId="w1" />);
    expect(container.textContent ?? '').not.toContain('Estado del caso');
  });

  it('honest copy: never Command Center positioning', () => {
    const src = read('src/components/legalup-ai/AICaseFreeSnapshot.tsx');
    expect(src).toContain('Estado del caso');
    expect(src).not.toContain('Command Center');
    expect(src).not.toContain('Inteligencia avanzada');
    expect(src).not.toContain('Análisis completo');
  });

  it('plan-agnostic read path: no gates, no provider, no quota', () => {
    const src = read('src/components/legalup-ai/AICaseFreeSnapshot.tsx')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|\s)\/\/.*$/gm, '$1');
    expect(src).not.toMatch(/canUse|hasAccess|pro_limited|free_case|case_analysis|isPro|isTrial/);
    expect(src).not.toMatch(/chatCompletion|fetch\s*\(|quota_units|ai_begin_operation|useSendChat|useAnalyze/);
  });
});

describe('4.48B overview wiring contracts', () => {
  it('snapshot renders only for free_case; CommandCenter gate unchanged', () => {
    const src = read('src/pages/lawyer/CaseDetailPage.tsx');
    expect(src).toContain("aiPlan === 'free_case'");
    expect(src).toContain('<AICaseFreeSnapshot');
    expect(src).toContain("canUse('case_analysis')");
    expect(src).toContain('<AICaseCommandCenter');
  });

  it('4.46 latest analysis + 4.47 main summary preserved in order', () => {
    const src = read('src/pages/lawyer/CaseDetailPage.tsx');
    const overview = src.slice(src.indexOf('<TabsContent value="overview"'));
    const order = [
      '<AICaseFreeSnapshot',
      '<AICaseLatestAnalysis',
      '<AICaseCommandCenter',
      'Citas del caso',
    ].map((t) => overview.indexOf(t));
    expect(order.every((i) => i > -1)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
});
