import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildActionCenter,
  formatActionDate,
  formatStaleLabel,
  type ActionCaseLike,
  type ActionTaskLike,
} from '@/lib/actionCenter';
import { ActionCenter } from '@/components/lawyer/ActionCenter';

const thisDir = dirname(fileURLToPath(import.meta.url));
const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf-8');

// Fijamos "hoy" = 6 oct 2026 12:00 local (mediodía evita bordes de huso).
const NOW = new Date(2026, 9, 6, 12, 0, 0).getTime();
const iso = (y: number, m: number, d: number, h = 12) => new Date(y, m, d, h, 0, 0).toISOString();

const C = (over: Partial<ActionCaseLike> = {}): ActionCaseLike => ({
  id: 'C1', title: 'Caso Pérez', status: 'in_progress', updated_at: iso(2026, 8, 30),
  next_action: null, next_action_due_at: null, next_action_completed_at: null, ...over,
});
const T = (over: Partial<ActionTaskLike> = {}): ActionTaskLike => ({
  id: 'T1', case_id: 'C1', title: 'Preparar escrito', due_at: null, completed: false, ...over,
});

describe('FASE 5.2 — buckets temporales', () => {
  it('1. pendiente vencido aparece en Vencidos', () => {
    const d = buildActionCenter([C()], [T({ due_at: iso(2026, 9, 4) })], NOW);
    expect(d.overdue).toHaveLength(1);
    expect(d.overdue[0]).toMatchObject({ kind: 'task', title: 'Preparar escrito' });
  });
  it('2. próxima gestión vencida aparece en Vencidos', () => {
    const d = buildActionCenter(
      [C({ next_action: 'Enviar antecedentes', next_action_due_at: iso(2026, 9, 5) })], [], NOW);
    expect(d.overdue).toHaveLength(1);
    expect(d.overdue[0]).toMatchObject({ kind: 'next_action' });
  });
  it('3. item de hoy aparece en Hoy (y no en Vencidos aunque sea AM)', () => {
    const d = buildActionCenter(
      [C({ next_action: 'Revisar', next_action_due_at: iso(2026, 9, 6, 9) })],
      [T({ id: 'T2', due_at: iso(2026, 9, 6, 18) })], NOW);
    expect(d.today).toHaveLength(2);
    expect(d.overdue).toHaveLength(0);
  });
  it('4. item futuro aparece en Próximos 7 días', () => {
    const d = buildActionCenter([C()], [T({ due_at: iso(2026, 9, 9) })], NOW);
    expect(d.next7).toHaveLength(1);
    expect(d.today).toHaveLength(0);
    expect(d.overdue).toHaveLength(0);
  });
  it('5. elemento >7 días no aparece en ningún grupo temporal', () => {
    const d = buildActionCenter([C()], [T({ due_at: iso(2026, 9, 20) })], NOW);
    expect(d.overdue).toHaveLength(0);
    expect(d.today).toHaveLength(0);
    expect(d.next7).toHaveLength(0);
  });
  it('6. completados no aparecen', () => {
    const d = buildActionCenter(
      [C({ next_action: 'Hecha', next_action_due_at: iso(2026, 9, 4), next_action_completed_at: iso(2026, 9, 5) })],
      [T({ due_at: iso(2026, 9, 4), completed: true })], NOW);
    expect(d.overdue).toHaveLength(0);
    expect(d.today).toHaveLength(0);
    expect(d.next7).toHaveLength(0);
  });
  it('7. closed/cancelled no aparecen (ni sus tareas)', () => {
    const closed = C({ id: 'CX', status: 'closed', next_action: 'X', next_action_due_at: iso(2026, 9, 4) });
    const cancelled = C({ id: 'CY', status: 'cancelled', next_action: 'Y', next_action_due_at: iso(2026, 9, 4) });
    const d = buildActionCenter(
      [closed, cancelled],
      [T({ id: 'TX', case_id: 'CX', due_at: iso(2026, 9, 4) }), T({ id: 'TY', case_id: 'CY', due_at: iso(2026, 9, 4) })],
      NOW);
    expect(d.overdue).toHaveLength(0);
    expect(d.noNextAction).toHaveLength(0);
  });
  it('8. caso activo sin next_action aparece en Sin próxima gestión', () => {
    const d = buildActionCenter([C({ id: 'A', updated_at: iso(2026, 8, 20) })], [], NOW);
    expect(d.noNextAction).toHaveLength(1);
    expect(d.noNextAction[0]).toMatchObject({ id: 'A' });
  });
  it('9. caso con próxima gestión no aparece ahí', () => {
    const d = buildActionCenter(
      [C({ next_action: 'Algo', next_action_due_at: iso(2026, 9, 9) })], [], NOW);
    expect(d.noNextAction).toHaveLength(0);
  });
  it('10. vencidos ordenados: más antiguo primero', () => {
    const d = buildActionCenter(
      [C()],
      [T({ id: 'NEW', due_at: iso(2026, 9, 5) }), T({ id: 'OLD', due_at: iso(2026, 9, 1) })],
      NOW);
    expect(d.overdue.map((i) => (i as { taskId: string }).taskId)).toEqual(['OLD', 'NEW']);
  });
  it('sin gestión ordena por actualización más antigua primero', () => {
    const d = buildActionCenter(
      [C({ id: 'B', updated_at: iso(2026, 9, 1) }), C({ id: 'A', updated_at: iso(2026, 8, 20) })], [], NOW);
    expect(d.noNextAction.map((c) => c.id)).toEqual(['A', 'B']);
  });
});

describe('FASE 5.2 — formato', () => {
  it('etiquetas de fecha en español', () => {
    expect(formatActionDate(iso(2026, 9, 5), NOW)).toBe('Venció ayer');
    expect(formatActionDate(iso(2026, 9, 4), NOW)).toBe('Venció 4 oct');
    expect(formatActionDate(iso(2026, 9, 6, 18), NOW)).toBe('Hoy');
    expect(formatActionDate(iso(2026, 9, 9), NOW)).toMatch(/oct/);
    expect(formatStaleLabel(iso(2026, 8, 30), NOW)).toBe('Actualizado hace 6 días');
  });
});

describe('FASE 5.2 — componente ActionCenter', () => {
  const cases = [
    { ...C(), next_action: 'Enviar antecedentes', next_action_due_at: iso(2026, 9, 4) },
    { ...C({ id: 'C2', title: 'Caso Soto', updated_at: iso(2026, 9, 1) }) },
  ] as never;
  const tasks = [{ ...T(), case_id: 'C1', due_at: iso(2026, 9, 4) }] as never;

  it('contadores provienen de los mismos datos renderizados', () => {
    render(<ActionCenter cases={cases} tasks={tasks} loading={false} nowMs={NOW} onOpenCase={() => {}} onCompleteTask={async () => {}} />);
    expect(screen.getByText('No tienes gestiones para hoy.')).toBeInTheDocument(); // hoy vacío
    expect(screen.getByText('Enviar antecedentes')).toBeInTheDocument();
    expect(screen.getByText('Caso Soto')).toBeInTheDocument();
    expect(screen.getByText('Preparar escrito')).toBeInTheDocument();
  });
  it('11. click en item abre el drawer del caso correcto', () => {
    const onOpenCase = vi.fn();
    render(<ActionCenter cases={cases} tasks={tasks} loading={false} nowMs={NOW} onOpenCase={onOpenCase} onCompleteTask={async () => {}} />);
    fireEvent.click(screen.getByText('Caso Soto'));
    expect(onOpenCase).toHaveBeenCalledWith('C2');
  });
  it('click en checkbox no abre el drawer (solo completa)', async () => {
    const onOpenCase = vi.fn();
    const onCompleteTask = vi.fn(async () => {});
    render(<ActionCenter cases={cases} tasks={tasks} loading={false} nowMs={NOW} onOpenCase={onOpenCase} onCompleteTask={onCompleteTask} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Completar Preparar escrito' }));
    await vi.waitFor(() => expect(onCompleteTask).toHaveBeenCalledWith('T1'));
    expect(onOpenCase).not.toHaveBeenCalled();
  });
  it('empty states cortos', () => {
    render(<ActionCenter cases={[]} tasks={[]} loading={false} nowMs={NOW} onOpenCase={() => {}} onCompleteTask={async () => {}} />);
    expect(screen.getByText('Todo al día.')).toBeInTheDocument();
    expect(screen.getByText('No tienes gestiones para hoy.')).toBeInTheDocument();
    expect(screen.getByText('No hay gestiones próximas.')).toBeInTheDocument();
    expect(screen.getByText('Todos tus casos activos tienen un próximo paso definido.')).toBeInTheDocument();
  });
  it('5.2B: 4 cards con tonos semánticos en grid 2 columnas', () => {
    const { container } = render(<ActionCenter cases={[]} tasks={[]} loading={false} nowMs={NOW} onOpenCase={() => {}} onCompleteTask={async () => {}} />);
    for (const title of ['Vencidos', 'Para hoy', 'Próximos 7 días', 'Sin próxima gestión']) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
    const html = container.innerHTML;
    expect(html).toContain('bg-red-50');
    expect(html).toContain('bg-amber-50');
    expect(html).toContain('bg-blue-50');
    expect(html).toContain('bg-slate-50');
    expect(html).toContain('lg:grid-cols-2');
  });
  it('5.2B: más de 4 items muestra Ver todo y expande', () => {
    const many = Array.from({ length: 6 }, (_, i) => ({
      ...T(), id: `T${i}`, title: `Pendiente ${i}`, case_id: 'C1', due_at: iso(2026, 9, 4),
    })) as never;
    render(<ActionCenter cases={[C() as never]} tasks={many} loading={false} nowMs={NOW} onOpenCase={() => {}} onCompleteTask={async () => {}} />);
    expect(screen.queryByText('Pendiente 5')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Ver todo (6)'));
    expect(screen.getByText('Pendiente 5')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Ver menos'));
    expect(screen.queryByText('Pendiente 5')).not.toBeInTheDocument();
  });
});

describe('FASE 5.2 — dashboard, tenant, performance, free', () => {
  it('dashboard monta ActionCenter antes que métricas y drawer reusable', () => {
    const src = read('src/pages/lawyer/DashboardPage.tsx');
    expect(src).toContain('<ActionCenter');
    expect(src).toContain('<CaseManagementDrawer');
    expect(src).toContain('onOpenCase={setManageCaseId}');
    expect(src.indexOf('<ActionCenter')).toBeLessThan(src.indexOf('{/* HOY */}'));
  });
  it('12. sin gates: ActionCenter no consulta entitlement ni planes', () => {
    const src = read('src/components/lawyer/ActionCenter.tsx');
    expect(src).not.toMatch(/entitlement|hasProAccess|canUse|paywall|ProPricing/i);
    // Un caso LAWYER_DIRECT sin workspace participa igual.
    const d = buildActionCenter(
      [C({ source: 'LAWYER_DIRECT' }) as ActionCaseLike], [], NOW);
    expect(d.noNextAction).toHaveLength(1);
  });
  it('13. aislamiento tenant: queries filtradas por lawyer_id', () => {
    const hookSrc = read('src/hooks/useCaseTasks.ts');
    expect(hookSrc).toContain(".eq('lawyer_id', user.id)");
    const casesSrc = read('src/hooks/useLawyerCases.ts');
    expect(casesSrc).toContain(".eq('lawyer_id', user.id)");
  });
  it('14. sin N+1: el dashboard usa una sola query agregada de tareas', () => {
    const hookSrc = read('src/hooks/useCaseTasks.ts');
    const allFn = hookSrc
      .slice(hookSrc.indexOf('export function useAllCaseTasks'))
      .split('export function useCaseControlSummary')[0];
    expect(allFn).not.toContain(".eq('case_id'");
    const dashSrc = read('src/pages/lawyer/DashboardPage.tsx');
    expect(dashSrc.match(/useAllCaseTasks\(\)/g)).toHaveLength(1);
    expect(dashSrc).not.toMatch(/[^A-Za-z]useCaseTasks\(/);
  });
});
