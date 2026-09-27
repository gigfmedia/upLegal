import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AIAnalysisView } from '@/components/legalup-ai/AIAnalysisView';
import type { AIDocumentAnalysis } from '@/hooks/useAIDocuments';

const baseProps = {
  model: 'openai/gpt-oss-20b',
  analyzing: false,
  onModelChange: vi.fn(),
  onAnalyze: vi.fn(),
};

const fullFixture = (): AIDocumentAnalysis =>
  ({
    id: 'a1',
    document_id: 'd1',
    lawyer_id: 'l1',
    workspace_id: 'w1',
    summary: 'Resumen completo del documento.',
    document_type: 'contrato',
    parties: ['Empresa X', 'Juan Pérez'],
    key_points: ['Objeto del contrato'],
    obligations: ['Pagar la renta'],
    deadlines: [{ date: '2026-01-01', description: 'Vencimiento' }],
    risks: ['Riesgo de plazo'],
    recommendations: ['Revisar cláusula'],
    claims: [],
    evidence_sources: [],
    model: 'openai/gpt-oss-20b',
    created_at: '2026-09-26T15:00:00.000Z',
    updated_at: '2026-09-26T15:00:00.000Z',
  }) as unknown as AIDocumentAnalysis;

const emptyFixture = (): AIDocumentAnalysis =>
  ({
    ...fullFixture(),
    id: 'a2',
    document_id: 'd2',
    summary: 'Resumen presente aunque sin secciones.',
    parties: [],
    key_points: [],
    obligations: [],
    deadlines: [],
    risks: [],
    recommendations: [],
  }) as unknown as AIDocumentAnalysis;

describe('4.50A honest empty states (presentation only, no fabrication)', () => {
  it('A. full analysis renders content unchanged', () => {
    render(<AIAnalysisView {...baseProps} analysis={fullFixture()} />);
    expect(screen.getByText('Resumen completo del documento.')).toBeInTheDocument();
    expect(screen.getByText('Empresa X')).toBeInTheDocument();
    expect(screen.getByText('Pagar la renta')).toBeInTheDocument();
    expect(screen.getByText('Riesgo de plazo')).toBeInTheDocument();
    expect(screen.queryByText(/No se identificaron/)).not.toBeInTheDocument();
    expect(screen.queryByText(/No se generaron/)).not.toBeInTheDocument();
  });

  it('B. empty sections keep headings with honest copy', () => {
    render(<AIAnalysisView {...baseProps} analysis={emptyFixture()} />);
    for (const title of [
      'Partes intervinientes',
      'Puntos clave',
      'Obligaciones',
      'Plazos y fechas clave',
      'Riesgos y alertas',
      'Recomendaciones',
    ]) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
    expect(
      screen.getByText('No se identificaron obligaciones explícitas en este documento.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Resumen presente aunque sin secciones.')
    ).toBeInTheDocument();
  });

  it('C. risks empty never claims "no hay riesgos"', () => {
    render(<AIAnalysisView {...baseProps} analysis={emptyFixture()} />);
    expect(
      screen.getByText('No se identificaron riesgos explícitos en este documento.')
    ).toBeInTheDocument();
    expect(screen.queryByText('No hay riesgos')).not.toBeInTheDocument();
  });

  it('D. recommendations empty uses neutral copy', () => {
    render(<AIAnalysisView {...baseProps} analysis={emptyFixture()} />);
    expect(
      screen.getByText('No se generaron recomendaciones específicas a partir de este documento.')
    ).toBeInTheDocument();
    expect(screen.queryByText('No hay recomendaciones')).not.toBeInTheDocument();
  });

  it('E. failed analysis keeps error UI (no section copy)', () => {
    render(<AIAnalysisView {...baseProps} analysis={null} />);
    expect(screen.getByText('Analiza este documento')).toBeInTheDocument();
    expect(screen.queryByText('Partes intervinientes')).not.toBeInTheDocument();
    expect(screen.queryByText(/No se identificaron/)).not.toBeInTheDocument();
  });

  it('null/undefined/blank shapes do not crash', () => {
    const weird = {
      ...emptyFixture(),
      summary: '   ',
      parties: null,
      key_points: undefined,
      obligations: ['', '   '],
      deadlines: ['', { date: '', description: '' }],
      risks: null,
      recommendations: undefined,
    } as unknown as AIDocumentAnalysis;
    render(<AIAnalysisView {...baseProps} analysis={weird} />);
    expect(
      screen.getByText('No se pudo obtener un resumen útil de este documento.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('No se identificaron partes intervinientes explícitas en este documento.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('No se identificaron plazos ni fechas clave explícitas en este documento.')
    ).toBeInTheDocument();
  });

  it('no fabrication: summary naming Empresa X does not populate parties', () => {
    const fixture = {
      ...emptyFixture(),
      summary: 'Este contrato lo firmó Empresa X en Santiago.',
    } as unknown as AIDocumentAnalysis;
    render(<AIAnalysisView {...baseProps} analysis={fixture} />);
    expect(screen.queryByText('Empresa X')).not.toBeInTheDocument();
    expect(
      screen.getByText('No se identificaron partes intervinientes explícitas en este documento.')
    ).toBeInTheDocument();
  });
});
