import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CaseOverviewSummary } from '@/components/lawyer/CaseOverviewSummary';
import type { LawyerCase } from '@/hooks/useLawyerCases';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

const sparseFreeCase = (): LawyerCase => ({
  id: '082d1acc-95e7-4773-8694-4c6053bf270f',
  lawyer_id: 'lawyer-1',
  client_id: null,
  booking_id: null,
  quote_request_id: null,
  title: 'Test qa 1',
  description: 'Caso de prueba',
  practice_area: null,
  status: 'new',
  source: 'LAWYER_DIRECT',
  ai_workspace_id: 'ws-1',
  price_clp: null,
  currency: 'CLP',
  created_at: '2026-09-26T10:00:00.000Z',
  updated_at: '2026-09-27T12:00:00.000Z',
  client: null,
  booking: null,
});

const richCase = (): LawyerCase => ({
  ...sparseFreeCase(),
  client_id: 'client-9',
  booking_id: 'booking-7',
  practice_area: 'Laboral',
  status: 'in_progress',
  source: 'LEGALUP_MARKETPLACE',
  price_clp: 150000,
  client: { id: 'client-9', name: 'Juan Pérez', email: null },
  booking: { id: 'booking-7', user_name: 'Juan', service_title: 'Asesoría', status: 'confirmed' },
});

const renderCard = (c: LawyerCase) =>
  render(
    <MemoryRouter>
      <CaseOverviewSummary caseData={c} />
    </MemoryRouter>
  );

describe('4.47A main Resumen del caso (operational metadata, no AI)', () => {
  it('§19 sparse free direct Case looks useful, never empty', () => {
    renderCard(sparseFreeCase());
    expect(screen.getByText('Resumen del caso')).toBeInTheDocument();
    expect(screen.getByText('Nuevo')).toBeInTheDocument();
    expect(screen.getByText('Sin cliente')).toBeInTheDocument();
    expect(screen.getByText('Directo')).toBeInTheDocument();
    expect(screen.getByText('26 de septiembre 2026')).toBeInTheDocument();
    expect(screen.getByText('27 de septiembre 2026')).toBeInTheDocument();
    expect(screen.queryByText('Área')).not.toBeInTheDocument();
    expect(screen.queryByText('Reserva')).not.toBeInTheDocument();
    expect(screen.queryByText('Monto')).not.toBeInTheDocument();
  });

  it('§20 rich Case renders client link, area, booking, price', () => {
    renderCard(richCase());
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    expect(screen.getByText('Juan Pérez').closest('a')).toHaveAttribute(
      'href',
      '/lawyer/clients/client-9'
    );
    expect(screen.getByText('Laboral')).toBeInTheDocument();
    expect(screen.getByText(/Asesoría/)).toBeInTheDocument();
    expect(screen.getByText(/Confirmada/)).toBeInTheDocument();
    expect(screen.getByText('$150.000')).toBeInTheDocument();
    expect(screen.getByText('Marketplace')).toBeInTheDocument();
    expect(screen.getByText('En progreso')).toBeInTheDocument();
  });

  it('description stays out (separate CaseDescriptionCard owns it)', () => {
    renderCard(sparseFreeCase());
    expect(screen.queryByText('Caso de prueba')).not.toBeInTheDocument();
  });

  it('status uses the existing taxonomy (no new labels)', () => {
    renderCard({ ...sparseFreeCase(), status: 'cancelled' });
    expect(screen.getByText('Cancelado')).toBeInTheDocument();
  });
});

describe('4.47A overview hierarchy contracts', () => {
  it('overview renders Resumen + latest-analysis + CommandCenter + Citas in order', () => {
    const src = read('src/pages/lawyer/CaseDetailPage.tsx');
    const overview = src.slice(src.indexOf('<TabsContent value="overview"'));
    const at = (tag: string) => overview.indexOf(`<${tag}`);
    const iSummary = at('CaseOverviewSummary');
    const iLatest = at('AICaseLatestAnalysis');
    const iCenter = at('AICaseCommandCenter');
    const iCitas = overview.indexOf('Citas del caso');
    expect(iSummary).toBeGreaterThan(-1);
    expect(iLatest).toBeGreaterThan(-1);
    expect(iCenter).toBeGreaterThan(-1);
    expect(iCitas).toBeGreaterThan(-1);
    expect(iSummary).toBeLessThan(iLatest);
    expect(iLatest).toBeLessThan(iCenter);
    expect(iCenter).toBeLessThan(iCitas);
  });

  it('latest-analysis card keeps its documentary title (never renamed)', () => {
    const src = read('src/components/legalup-ai/AICaseLatestAnalysis.tsx');
    expect(src).toContain('Último análisis del caso');
    expect(src).not.toContain('Resumen del caso');
  });

  it('main card is plan-agnostic read path (no gates, no provider, no quota)', () => {
    const src = read('src/components/lawyer/CaseOverviewSummary.tsx')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|\s)\/\/.*$/gm, '$1');
    expect(src).not.toMatch(/canUse|hasAccess|pro_limited|free_case|useAI|quota|provider|chatCompletion|fetch\s*\(/);
  });

  it('labels centralized without duplicating taxonomy', () => {
    expect(read('src/lib/caseLabels.ts')).toContain('LAWYER_DIRECT');
    expect(read('src/pages/lawyer/CaseDetailPage.tsx')).toContain('@/lib/caseLabels');
  });
});
