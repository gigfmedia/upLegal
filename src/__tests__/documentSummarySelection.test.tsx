import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { resolveSelectedDocument } from '@/lib/aiDocumentSelection';
import { AIAnalysisView } from '@/components/legalup-ai/AIAnalysisView';
import type { AIDocumentAnalysis } from '@/hooks/useAIDocuments';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

/** Exact production row shape (snake_case, PostgREST select *). */
const prodFixture = (overrides: Partial<AIDocumentAnalysis> = {}): AIDocumentAnalysis =>
  ({
    id: 'a1',
    document_id: 'd1',
    lawyer_id: 'l1',
    workspace_id: 'w1',
    summary: 'Resumen de prueba del documento con hallazgos verificados.',
    document_type: 'contrato',
    parties: [],
    key_points: [],
    obligations: [],
    deadlines: [],
    risks: ['Riesgo de plazo acotado'],
    recommendations: ['Revisar cláusula quinta'],
    claims: [],
    evidence_sources: [],
    model: 'openai/gpt-oss-20b',
    created_at: '2026-09-26T15:00:00.000Z',
    updated_at: '2026-09-26T15:00:00.000Z',
    ...overrides,
  }) as unknown as AIDocumentAnalysis;

describe('4.45A default document selection (read-path, plan-agnostic)', () => {
  it('explicit selection always wins', () => {
    const docs = [
      { id: 'new', analysis_status: 'none' },
      { id: 'old', analysis_status: 'ready' },
    ];
    expect(resolveSelectedDocument(docs, 'new')?.id).toBe('new');
    expect(resolveSelectedDocument(docs, 'old')?.id).toBe('old');
  });

  it('without selection prefers the analyzed document over the newest upload', () => {
    const docs = [
      { id: 'new-unanalyzed', analysis_status: 'none' },
      { id: 'analyzed', analysis_status: 'ready' },
    ];
    expect(resolveSelectedDocument(docs, null)?.id).toBe('analyzed');
  });

  it('falls back to newest when nothing analyzed; null when empty', () => {
    expect(
      resolveSelectedDocument(
        [
          { id: 'a', analysis_status: 'none' },
          { id: 'b', analysis_status: 'processing' },
        ],
        null
      )?.id
    ).toBe('a');
    expect(resolveSelectedDocument([], null)).toBeNull();
  });

  it('is deterministic across remounts (reopen shows the same analyzed doc)', () => {
    const docs = [
      { id: 'new-unanalyzed', analysis_status: 'none' },
      { id: 'analyzed', analysis_status: 'ready' },
    ];
    expect(resolveSelectedDocument(docs, null)?.id).toBe(
      resolveSelectedDocument(structuredClone(docs), null)?.id
    );
  });
});

describe('4.45A stored summary render (no provider, no quota)', () => {
  const baseProps = {
    model: 'openai/gpt-oss-20b',
    analyzing: false,
    onModelChange: vi.fn(),
    onAnalyze: vi.fn(),
  };

  it('renders the persisted summary with exact production shape', () => {
    render(<AIAnalysisView {...baseProps} analysis={prodFixture()} />);
    expect(screen.getByText('Resumen ejecutivo')).toBeInTheDocument();
    expect(
      screen.getByText('Resumen de prueba del documento con hallazgos verificados.')
    ).toBeInTheDocument();
    expect(screen.getByText('Riesgo de plazo acotado')).toBeInTheDocument();
    expect(screen.getByText('Revisar cláusula quinta')).toBeInTheDocument();
  });

  it('omits empty sections but keeps summary (grounding-filtered shape)', () => {
    render(<AIAnalysisView {...baseProps} analysis={prodFixture()} />);
    expect(screen.queryByText('Partes intervinientes')).not.toBeInTheDocument();
    expect(screen.queryByText('Puntos clave')).not.toBeInTheDocument();
    expect(
      screen.getByText('Resumen de prueba del documento con hallazgos verificados.')
    ).toBeInTheDocument();
  });

  it('empty summary shows safe fallback, never a blank tab', () => {
    render(<AIAnalysisView {...baseProps} analysis={prodFixture({ summary: '' })} />);
    expect(
      screen.getByText('El análisis se completó, pero no hay un resumen disponible.')
    ).toBeInTheDocument();
  });

  it('renders stored result for any plan: no paywall over generated output', () => {
    const { container } = render(<AIAnalysisView {...baseProps} analysis={prodFixture()} />);
    expect(container.textContent).toContain('Resumen de prueba');
    expect(screen.queryByText(/Ver planes|Ver LegalUp Pro/i)).not.toBeInTheDocument();
  });

  it('failed/empty state keeps existing CTA (no regression)', () => {
    render(<AIAnalysisView {...baseProps} analysis={null} />);
    expect(screen.getByText('Analiza este documento')).toBeInTheDocument();
  });
});

describe('4.45A post-analysis refresh contract (unchanged paths)', () => {
  it('analyze mutation invalidates documents + analyses queries on settle', () => {
    const src = read('src/hooks/useAIDocuments.ts');
    const block = src.slice(src.indexOf('export function useAnalyzeAIDocument'));
    expect(block).toContain('AI_DOCUMENTS_QUERY_KEY');
    expect(block).toContain('AI_ANALYSIS_QUERY_KEY');
    expect(block).toContain('invalidateQueries');
  });

  it('analysis fetch reads the canonical row by document_id (snake_case intact)', () => {
    const src = read('src/hooks/useAIDocuments.ts');
    expect(src).toContain("from('ai_document_analyses')");
    expect(src).toContain('.eq(\'document_id\'');
    const view = read('src/components/legalup-ai/AIAnalysisView.tsx');
    expect(view).toContain('analysis.summary');
    expect(view).not.toContain('analysis_summary');
  });
});
