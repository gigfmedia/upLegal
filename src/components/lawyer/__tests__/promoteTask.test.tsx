import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CaseTasksSection } from '@/components/lawyer/CaseTasksSection';

const updateCaseMock = vi.fn();
vi.mock('@/hooks/useLawyerCases', () => ({
  useLawyerCases: () => ({ updateCase: updateCaseMock }),
}));

const completeTaskMock = vi.fn();
const reopenTaskMock = vi.fn();
const TASKS = [
  { id: 'T1', title: 'Presentar escrito', due_at: '2026-10-15T15:00:00.000Z', completed: false, completed_at: null },
  { id: 'T2', title: 'Llamar al cliente', due_at: null, completed: false, completed_at: null },
  { id: 'T3', title: 'Hecho viejo', due_at: null, completed: true, completed_at: '2026-10-01T12:00:00.000Z' },
];
vi.mock('@/hooks/useCaseTasks', () => ({
  useCaseTasks: () => ({
    tasks: TASKS,
    loading: false,
    createTask: vi.fn(),
    completeTask: completeTaskMock,
    reopenTask: reopenTaskMock,
  }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function renderSection(currentNextAction: { next_action: string | null; next_action_due_at: string | null; next_action_completed_at: string | null } | null = null) {
  const onPromoted = vi.fn();
  render(<CaseTasksSection caseId="CASE-1" currentNextAction={currentNextAction} onPromoted={onPromoted} />);
  return { onPromoted };
}

function openPromoteFor(title: string) {
  const buttons = screen.getAllByRole('button', { name: /usar como próxima gestión/i });
  const idx = TASKS.filter((t) => !t.completed).findIndex((t) => t.title === title);
  fireEvent.click(buttons[idx]);
}

describe('CTA por tarea', () => {
  beforeEach(() => {
    updateCaseMock.mockReset();
    updateCaseMock.mockImplementation(async (_id: string, patch: Record<string, unknown>) => ({ id: 'CASE-1', ...patch }));
  });

  it('tareas activas muestran CTA; completadas no', () => {
    renderSection();
    expect(screen.getAllByRole('button', { name: /usar como próxima gestión/i })).toHaveLength(2);
  });

  it('prefill título + fecha desde la tarea', () => {
    renderSection();
    openPromoteFor('Presentar escrito');
    expect((screen.getByLabelText(/texto de la próxima gestión/i) as HTMLInputElement).value).toBe('Presentar escrito');
    expect(screen.getByRole('button', { name: /fecha de la próxima gestión/i })).toBeDefined();
  });

  it('tarea sin fecha: DatePicker vacío y due_at null al guardar', async () => {
    renderSection();
    openPromoteFor('Llamar al cliente');
    expect(screen.getByRole('button', { name: /fecha de la próxima gestión/i })).toHaveTextContent(/sin fecha/i);
    fireEvent.click(screen.getByRole('button', { name: /guardar próxima gestión/i }));
    await waitFor(() => expect(updateCaseMock).toHaveBeenCalledTimes(1));
    expect(updateCaseMock).toHaveBeenCalledWith('CASE-1', {
      next_action: 'Llamar al cliente',
      next_action_due_at: null,
      next_action_completed_at: null,
    });
  });

  it('edición antes de guardar; la tarea queda intacta (copia, no vínculo)', async () => {
    renderSection();
    openPromoteFor('Presentar escrito');
    fireEvent.change(screen.getByLabelText(/texto de la próxima gestión/i), { target: { value: 'Revisar y presentar escrito' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar próxima gestión/i }));
    await waitFor(() => expect(updateCaseMock).toHaveBeenCalledTimes(1));
    expect(updateCaseMock.mock.calls[0][1].next_action).toBe('Revisar y presentar escrito');
    expect(TASKS[0].title).toBe('Presentar escrito');
  });

  it('advierte reemplazo cuando hay próxima gestión activa', () => {
    renderSection({ next_action: 'Llamar al cliente', next_action_due_at: null, next_action_completed_at: null });
    openPromoteFor('Presentar escrito');
    expect(screen.getByText(/reemplazará la próxima gestión actual/i)).toBeDefined();
    expect(screen.getAllByText(/Llamar al cliente/).length).toBeGreaterThanOrEqual(2);
  });

  it('sin próxima gestión activa: sin advertencia', () => {
    renderSection(null);
    openPromoteFor('Presentar escrito');
    expect(screen.queryByText(/reemplazará la próxima gestión actual/i)).toBeNull();
  });

  it('cancelar no llama updateCase', () => {
    renderSection();
    openPromoteFor('Presentar escrito');
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(updateCaseMock).not.toHaveBeenCalled();
  });

  it('completed_at se resetea (aunque hubiera completada previa)', async () => {
    renderSection({ next_action: 'Vieja', next_action_due_at: null, next_action_completed_at: '2026-10-01T12:00:00.000Z' });
    openPromoteFor('Presentar escrito');
    fireEvent.click(screen.getByRole('button', { name: /guardar próxima gestión/i }));
    await waitFor(() => expect(updateCaseMock).toHaveBeenCalledTimes(1));
    expect(updateCaseMock.mock.calls[0][1].next_action_completed_at).toBeNull();
  });

  it('onPromoted recibe la fila para actualizar el drawer', async () => {
    const { onPromoted } = renderSection();
    openPromoteFor('Presentar escrito');
    fireEvent.click(screen.getByRole('button', { name: /guardar próxima gestión/i }));
    await waitFor(() => expect(onPromoted).toHaveBeenCalledTimes(1));
  });
});
