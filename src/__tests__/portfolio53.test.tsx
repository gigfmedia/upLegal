import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  activePortfolioCases,
  distinctStages,
  groupByStage,
  groupByStatus,
  normalizeStage,
  stageLabel,
} from '@/lib/portfolio';
import { PortfolioView } from '@/components/lawyer/PortfolioView';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf-8');

const K = (over: Record<string, unknown> = {}) => ({
  id: 'x', status: 'in_progress', stage: null, ...over,
});

describe('FASE 5.3 — etapa y agrupación', () => {
  it('1/2/3. etapa acepta texto, cambia y es opcional', () => {
    expect(normalizeStage('  Embargo  ')).toBe('Embargo');
    expect(normalizeStage('')).toBeNull();
    expect(normalizeStage(null)).toBeNull();
    expect(normalizeStage(undefined)).toBeNull();
    expect(normalizeStage('a'.repeat(200))).toHaveLength(80);
  });
  it('4/5. agrupación por etapa con Sin etapa explícito', () => {
    const groups = groupByStage([
      K({ id: '1', stage: 'Embargo' }),
      K({ id: '2', stage: 'Embargo' }),
      K({ id: '3', stage: 'Notificado' }),
      K({ id: '4', stage: null }),
    ]);
    expect(groups[0]).toMatchObject({ stage: 'Embargo', count: 2 });
    expect(groups.find((g) => g.stage === null)).toMatchObject({ count: 1 });
    expect(stageLabel(null)).toBe('Sin etapa');
  });
  it('6. agrupación por estado incluye históricos', () => {
    const groups = groupByStatus([
      K({ id: '1', status: 'in_progress' }),
      K({ id: '2', status: 'closed' }),
      K({ id: '3', status: 'closed' }),
    ]);
    expect(groups.find((g) => g.status === 'closed')).toMatchObject({ count: 2 });
  });
  it('7. por etapa solo activos; por estado todos', () => {
    const cases = [K({ id: '1', stage: 'Embargo', status: 'closed' }), K({ id: '2', stage: 'Embargo' })];
    expect(groupByStage(cases)).toEqual([{ stage: 'Embargo', count: 1, caseIds: ['2'] }]);
    expect(activePortfolioCases(cases)).toHaveLength(1);
  });
  it('etapas distintas para filtros/sugerencias', () => {
    expect(distinctStages([K({ stage: 'Remate' }), K({ stage: 'Embargo' }), K({})])).toEqual(['Embargo', 'Remate']);
  });
});

describe('FASE 5.3 — vista Cartera', () => {
  const groups = groupByStage([
    K({ id: '1', stage: 'Embargo' }),
    K({ id: '2', stage: 'Embargo' }),
    K({ id: '3', stage: null }),
  ]);
  it('total + bloques por etapa + sin etapa + estados', () => {
    render(
      <PortfolioView
        activeCount={3}
        stageGroups={groups}
        statusGroups={groupByStatus([K({ id: '1' }), K({ id: '2', status: 'closed' })])}
        maxStageCount={2}
        onSelectStage={() => {}}
      />
    );
    expect(screen.getByText('Cartera')).toBeInTheDocument();
    expect(screen.getByText('3 casos activos')).toBeInTheDocument();
    expect(screen.getByText('Embargo')).toBeInTheDocument();
    expect(screen.getByText('Sin etapa')).toBeInTheDocument();
  });
  it('8. click en etapa filtra (callback con el valor)', () => {
    const onSelectStage = vi.fn();
    render(
      <PortfolioView activeCount={3} stageGroups={groups} statusGroups={[]} maxStageCount={2} onSelectStage={onSelectStage} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Ver 2 casos en Embargo' }));
    expect(onSelectStage).toHaveBeenCalledWith('Embargo');
    fireEvent.click(screen.getByRole('button', { name: 'Ver 1 casos en Sin etapa' }));
    expect(onSelectStage).toHaveBeenCalledWith(null);
  });
});

describe('FASE 5.3 — wiring cases/drawer/filtros', () => {
  it('9. filtros estado + etapa combinables en CasesPage', () => {
    const src = read('src/pages/lawyer/CasesPage.tsx');
    expect(src).toContain('matchesStatus && matchesStage');
    expect(src).toContain("aria-label=\"Filtrar por etapa\"");
  });
  it('10. etapa editable en dialog y drawer; cartera recalcula de casos', () => {
    expect(read('src/components/lawyer/CaseEditDialog.tsx')).toContain('stage');
    expect(read('src/components/lawyer/CaseManagementDrawer.tsx')).toContain('CaseStageSection');
    expect(read('src/pages/lawyer/CasesPage.tsx')).toContain('groupByStage(cases)');
  });
  it('11/13. tenant por lawyer_id; una sola query de casos', () => {
    const hook = read('src/hooks/useLawyerCases.ts');
    expect(hook).toContain(".eq('lawyer_id', user.id)");
    const page = read('src/pages/lawyer/CasesPage.tsx');
    expect(page.match(/useLawyerCases\(\)/g)).toHaveLength(1);
    expect(page).not.toContain('supabase.from(\'lawyer_cases\')');
    expect(page).not.toContain('supabase.from("lawyer_cases")');
  });
  it('12. caso gratuito compatible: sin gates en etapa/cartera', () => {
    const page = read('src/pages/lawyer/CasesPage.tsx');
    const carteraIdx = page.indexOf('PortfolioView');
    expect(carteraIdx).toBeGreaterThan(-1);
    expect(read('supabase/migrations/20261008000000_case_stage.sql')).not.toMatch(/\b(pro|plus|plan|entitlement|paywall)\b/i);
  });
});
