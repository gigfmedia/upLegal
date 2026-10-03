import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  parseSupportedDeadlineDate,
  IntelligenceDeadlineRow,
  DeadlinePromoteDialog,
} from '@/components/legalup-ai/DeadlinePromoteDialog';

const createTaskMock = vi.fn();
vi.mock('@/hooks/useCaseTasks', () => ({
  useCaseTasks: () => ({ createTask: createTaskMock }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('parseSupportedDeadlineDate', () => {
  it('acepta fecha normalizada AAAA-MM-DD', () => {
    const d = parseSupportedDeadlineDate('2026-10-15');
    expect(d).toBeDefined();
    expect(d!.getFullYear()).toBe(2026);
    expect(d!.getMonth()).toBe(9);
    expect(d!.getDate()).toBe(15);
  });
  it('rechaza texto legal ambiguo (no adivina fechas)', () => {
    expect(parseSupportedDeadlineDate('10 días desde la notificación')).toBeUndefined();
    expect(parseSupportedDeadlineDate('dentro de quinto día')).toBeUndefined();
    expect(parseSupportedDeadlineDate('15 días hábiles')).toBeUndefined();
    expect(parseSupportedDeadlineDate('antes de la audiencia')).toBeUndefined();
  });
  it('rechaza vacíos, otros formatos e inválidas', () => {
    expect(parseSupportedDeadlineDate('')).toBeUndefined();
    expect(parseSupportedDeadlineDate(null)).toBeUndefined();
    expect(parseSupportedDeadlineDate(undefined)).toBeUndefined();
    expect(parseSupportedDeadlineDate('15/10/2026')).toBeUndefined();
    expect(parseSupportedDeadlineDate('2026-13-40')).toBeUndefined();
    expect(parseSupportedDeadlineDate('2026-02-30')).toBeUndefined();
  });
});

describe('IntelligenceDeadlineRow', () => {
  const deadline = { date: '2026-10-15', description: 'Presentar escrito' };
  it('renderiza CTA solo cuando hay caso canónico', () => {
    const { rerender } = render(
      <IntelligenceDeadlineRow deadline={deadline} caseId="CASE-1" onPromote={() => {}} />
    );
    expect(screen.getByRole('button', { name: /agregar a pendientes/i })).toBeDefined();
    rerender(<IntelligenceDeadlineRow deadline={deadline} onPromote={() => {}} />);
    expect(screen.queryByRole('button', { name: /agregar a pendientes/i })).toBeNull();
  });
  it('llama onPromote con el plazo al hacer click', () => {
    const onPromote = vi.fn();
    render(<IntelligenceDeadlineRow deadline={deadline} caseId="CASE-1" onPromote={onPromote} />);
    fireEvent.click(screen.getByRole('button', { name: /agregar a pendientes/i }));
    expect(onPromote).toHaveBeenCalledTimes(1);
    expect(onPromote).toHaveBeenCalledWith(deadline);
  });
});

describe('DeadlinePromoteDialog', () => {
  beforeEach(() => {
    createTaskMock.mockReset();
    createTaskMock.mockResolvedValue({ id: 'T1' });
  });

  function renderDialog(deadline = { date: '2026-10-15', description: 'Presentar escrito de prueba' }) {
    return render(
      <DeadlinePromoteDialog open onClose={() => {}} caseId="CASE-1" deadline={deadline} />
    );
  }

  it('pre-rellena título desde la descripción y permite editar', () => {
    renderDialog();
    const input = screen.getByLabelText(/título del pendiente/i) as HTMLInputElement;
    expect(input.value).toBe('Presentar escrito de prueba');
    fireEvent.change(input, { target: { value: 'Título editado' } });
    expect(input.value).toBe('Título editado');
  });

  it('muestra contexto de solo lectura de la fuente', () => {
    renderDialog();
    expect(screen.getByText(/detectado en inteligencia/i)).toBeDefined();
  });

  it('confirmar crea exactamente un pendiente del caso correcto', async () => {
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: /guardar pendiente/i }));
    await waitFor(() => expect(createTaskMock).toHaveBeenCalledTimes(1));
    const payload = createTaskMock.mock.calls[0][0];
    expect(payload.title).toBe('Presentar escrito de prueba');
    expect(payload.due_at).toContain('2026-10-15');
  });

  it('fecha ambigua: no pre-rellena fecha (due_at null)', async () => {
    renderDialog({ date: '15 días hábiles', description: 'Contestar demanda' });
    expect(screen.getByText(/sin fecha/i)).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /guardar pendiente/i }));
    await waitFor(() => expect(createTaskMock).toHaveBeenCalledTimes(1));
    expect(createTaskMock.mock.calls[0][0].due_at).toBeNull();
  });

  it('doble click no crea duplicados', async () => {
    renderDialog();
    const btn = screen.getByRole('button', { name: /guardar pendiente/i });
    fireEvent.click(btn);
    fireEvent.click(btn);
    await waitFor(() => expect(createTaskMock).toHaveBeenCalledTimes(1));
  });
});
