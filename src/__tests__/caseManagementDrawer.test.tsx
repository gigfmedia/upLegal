import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { LawyerCase } from '@/hooks/useLawyerCases';

const PAST = new Date(Date.now() - 86400000).toISOString();
const FUTURE = new Date(Date.now() + 86400000).toISOString();

const tasksState = vi.hoisted(() => {
  const past = new Date(Date.now() - 86400000).toISOString();
  const future = new Date(Date.now() + 2 * 86400000).toISOString();
  return {
  tasks: [
    { id: 'T1', lawyer_id: 'L1', case_id: 'C1', title: 'Preparar escrito', due_at: future, completed: false, completed_at: null, created_at: past, updated_at: past },
    { id: 'T2', lawyer_id: 'L1', case_id: 'C1', title: 'Revisar resolución', due_at: past, completed: false, completed_at: null, created_at: past, updated_at: past },
  ] as Record<string, unknown>[],
  create: vi.fn(async (input: unknown) => input),
  complete: vi.fn(async (id: string) => id),
  reopen: vi.fn(async (id: string) => id),
  };
});

vi.mock('@/hooks/useClientCommunications', () => ({
  useClientCommunications: () => ({
    comms: [],
    loading: false,
    error: null,
    refetch: vi.fn(),
    registerComm: vi.fn(),
  }),
  useAllCommunications: () => ({ comms: [], loading: false, refetch: vi.fn() }),
  useClientFollowUpOverview: () => ({ lastByClient: new Map(), overdueClientIds: new Set(), loading: false }),
}));

vi.mock('@/hooks/useCaseTasks', () => ({
  useCaseTasks: () => ({
    tasks: tasksState.tasks,
    loading: false,
    error: null,
    refetch: vi.fn(),
    createTask: tasksState.create,
    completeTask: tasksState.complete,
    reopenTask: tasksState.reopen,
  }),
  useCaseControlSummary: () => ({ pendingCount: 2, overdueCount: 1, nextOverdue: false, loading: false }),
}));

const db = vi.hoisted(() => ({ payload: null as Record<string, unknown> | null, row: null as Record<string, unknown> | null }));
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: (table: string) => {
      const q: Record<string, unknown> = {};
      q.update = (p: Record<string, unknown>) => { db.payload = { table, ...p }; return q; };
      q.eq = () => q;
      q.select = () => q;
      q.single = async () => ({ data: db.row ?? { id: 'C1' }, error: null });
      return q;
    },
  },
}));

import { CaseManagementDrawer } from '@/components/lawyer/CaseManagementDrawer';

const thisDir = dirname(fileURLToPath(import.meta.url));
const detailSrc = readFileSync(resolve(thisDir, '../pages/lawyer/CaseDetailPage.tsx'), 'utf-8');

const baseCase = {
  id: 'C1',
  lawyer_id: 'L1',
  client_id: null,
  booking_id: null,
  quote_request_id: null,
  title: 'Divorcio Juan Pérez',
  description: null,
  practice_area: null,
  status: 'in_progress',
  source: 'LAWYER_DIRECT',
  ai_workspace_id: null,
  price_clp: null,
  currency: 'CLP',
  created_at: PAST,
  updated_at: PAST,
  next_action: 'Revisar resolución y preparar escrito',
  next_action_due_at: FUTURE,
  next_action_completed_at: null,
  priority: 'medium',
} as unknown as LawyerCase;

const renderDrawer = (c: LawyerCase = baseCase, open = true, onOpenChange = vi.fn(), onCaseUpdated = vi.fn()) => {
  const utils = render(
    <CaseManagementDrawer caseData={c} open={open} onOpenChange={onOpenChange} onCaseUpdated={onCaseUpdated} />
  );
  return { ...utils, onOpenChange, onCaseUpdated };
};

beforeEach(() => {
  vi.clearAllMocks();
  db.payload = null;
  db.row = null;
});

// 1. Inline eliminado, trigger + drawer en el detalle.
describe('FASE 5.1B drawer — detalle limpio', () => {
  it('sin panel inline; trigger Gestionar caso controla el drawer', () => {
    const code = detailSrc.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(code).not.toMatch(/<CaseControlPanel/);
    expect(code).toMatch(/Gestionar caso/);
    expect(code).toMatch(/setManageOpen\(true\)/);
    expect(code).toMatch(/<CaseManagementDrawer/);
    expect(code).toMatch(/open=\{manageOpen\}/);
  });
});

// 2-3. Trigger con contexto + drawer muestra próxima gestión.
describe('FASE 5.1B drawer — trigger y contenido', () => {
  it('trigger prioriza vencidos sobre pendientes sobre normal', () => {
    expect(detailSrc).toContain('vencido');
    expect(detailSrc).toContain('pendiente');
  });
  it('drawer abierto muestra estado, próxima gestión y pendientes', () => {
    renderDrawer();
    expect(screen.getByText('Gestión del caso')).toBeInTheDocument();
    expect(screen.getByText('Divorcio Juan Pérez')).toBeInTheDocument();
    expect(screen.getByText(/Revisar resolución y preparar escrito/)).toBeInTheDocument();
    expect(screen.getByText('Preparar escrito')).toBeInTheDocument();
    expect(screen.getByText(/Última actualización/)).toBeInTheDocument();
  });
  it('drawer cerrado no muestra el contenido', () => {
    renderDrawer(baseCase, false);
    expect(screen.queryByText(/Revisar resolución y preparar escrito/)).not.toBeInTheDocument();
  });
});

// 4. Editar próxima gestión.
describe('FASE 5.1B drawer — editar próxima gestión', () => {
  it('guardar envía texto y propaga el caso actualizado', async () => {
    const { onCaseUpdated } = renderDrawer();
    fireEvent.click(screen.getByRole('button', { name: /editar/i }));
    const input = screen.getByLabelText('Texto próxima gestión');
    fireEvent.change(input, { target: { value: 'Nuevo texto de gestión' } });
    db.row = { ...baseCase, next_action: 'Nuevo texto de gestión' };
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await vi.waitFor(() => expect(onCaseUpdated).toHaveBeenCalled());
    // El padre fusiona el patch (setPatched): el form se cierra tras guardar.
    expect(screen.queryByLabelText('Texto próxima gestión')).not.toBeInTheDocument();
    expect(db.payload).toMatchObject({ table: 'lawyer_cases', next_action: 'Nuevo texto de gestión' });
    expect(onCaseUpdated).toHaveBeenCalledWith(expect.objectContaining({ next_action: 'Nuevo texto de gestión' }));
  });
  it('marcar completada registra timestamp', async () => {
    renderDrawer();
    db.row = { ...baseCase, next_action_completed_at: new Date().toISOString() };
    fireEvent.click(screen.getByRole('button', { name: /marcar como completada/i }));
    await vi.waitFor(() => expect(db.payload).toMatchObject({ table: 'lawyer_cases' }));
    expect(db.payload).toHaveProperty('next_action_completed_at');
  });
});

// 5-6. Calendar custom: abrir, seleccionar, quitar.
describe('FASE 5.1B drawer — calendario', () => {
  it('abre calendario en español y seleccionar día fija la fecha al guardar', async () => {
    renderDrawer();
    fireEvent.click(screen.getByRole('button', { name: /editar/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Fecha próxima gestión' }));
    const dialogs = await screen.findAllByRole('dialog');
    const dialog = dialogs[dialogs.length - 1];
    expect(dialog.textContent).toMatch(/octubre|noviembre|septiembre|diciembre|enero/i);
    fireEvent.click(within(dialog).getByText('15', { selector: 'button' }));
    db.row = { ...baseCase };
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await vi.waitFor(() => expect(db.payload).not.toBeNull());
    const due = db.payload!['next_action_due_at'] as string;
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    expect(due).toContain(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-15`);
  });
  it('quitar fecha guarda null', async () => {
    renderDrawer();
    fireEvent.click(screen.getByRole('button', { name: /editar/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Fecha próxima gestión' }));
    fireEvent.click(await screen.findByText('Quitar fecha'));
    db.row = { ...baseCase, next_action_due_at: null };
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await vi.waitFor(() => expect(db.payload).not.toBeNull());
    expect(db.payload!['next_action_due_at']).toBeNull();
  });
});

// 7-8. Crear y completar pendiente.
describe('FASE 5.1B drawer — pendientes', () => {
  it('crear pendiente sin fecha envía due_at null', async () => {
    renderDrawer();
    fireEvent.click(screen.getByRole('button', { name: 'Nuevo pendiente' }));
    fireEvent.change(screen.getByLabelText('Título del pendiente'), { target: { value: 'Llamar al cliente' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar pendiente' }));
    await vi.waitFor(() => expect(tasksState.create).toHaveBeenCalled());
    expect(tasksState.create).toHaveBeenCalledWith({ title: 'Llamar al cliente', due_at: null });
  });
  it('crear pendiente con fecha envía ISO', async () => {
    renderDrawer();
    fireEvent.click(screen.getByRole('button', { name: 'Nuevo pendiente' }));
    fireEvent.change(screen.getByLabelText('Título del pendiente'), { target: { value: 'Con fecha' } });
    fireEvent.click(screen.getByRole('button', { name: 'Fecha del pendiente' }));
    const dialogs = await screen.findAllByRole('dialog');
    const dialog = dialogs[dialogs.length - 1];
    fireEvent.click(within(dialog).getByText('15', { selector: 'button' }));
    fireEvent.click(screen.getByRole('button', { name: 'Agregar pendiente' }));
    await vi.waitFor(() => expect(tasksState.create).toHaveBeenCalled());
    const arg = tasksState.create.mock.calls[0][0] as { due_at: string };
    expect(arg.due_at).toMatch(/-15T/);
  });
  it('completar pendiente llama al hook', () => {
    renderDrawer();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Completar Preparar escrito' }));
    expect(tasksState.complete).toHaveBeenCalledWith('T1');
  });
});

// 9. Indicador de vencido.
describe('FASE 5.1B drawer — vencidos', () => {
  it('pendiente vencido muestra Venció + fecha; próxima vencida muestra badge', () => {
    const overdueCase = { ...baseCase, next_action_due_at: PAST } as LawyerCase;
    renderDrawer(overdueCase);
    expect(screen.getByText(/Venció/)).toBeInTheDocument();
    expect(screen.getByText('Vencida')).toBeInTheDocument();
  });
});

// 10. Cerrar/reabrir mantiene estado (fuente: servidor vía hook).
describe('FASE 5.1B drawer — persistencia', () => {
  it('cerrar emite onOpenChange(false) y al reabrir sigue la lista', () => {
    const { onOpenChange, rerender, onCaseUpdated } = renderDrawer();
    expect(screen.getByText('Preparar escrito')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar gestión del caso' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    rerender(
      <CaseManagementDrawer caseData={baseCase} open={true} onOpenChange={onOpenChange} onCaseUpdated={onCaseUpdated} />
    );
    expect(screen.getByText('Preparar escrito')).toBeInTheDocument();
    expect(screen.getByText(/Revisar resolución y preparar escrito/)).toBeInTheDocument();
  });
});

// 11. Caso gratuito usa todo el drawer (sin gates, sin workspace).
describe('FASE 5.1B drawer — caso gratuito', () => {
  it('renderiza estado, próxima gestión, pendientes y última actualización', () => {
    const freeCase = { ...baseCase, source: 'LAWYER_DIRECT', ai_workspace_id: null } as LawyerCase;
    renderDrawer(freeCase);
    expect(screen.getByText('En progreso')).toBeInTheDocument();
    expect(screen.getByText(/Revisar resolución y preparar escrito/)).toBeInTheDocument();
    expect(screen.getByText('Preparar escrito')).toBeInTheDocument();
    expect(screen.getByText(/Última actualización/)).toBeInTheDocument();
  });
});
