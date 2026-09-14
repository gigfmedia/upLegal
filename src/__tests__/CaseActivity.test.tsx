import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const mocks = {
  docs: vi.fn(),
  workflow: vi.fn(),
  timeline: vi.fn(),
};

vi.mock('@/hooks/useAIDocuments', () => ({
  useAIDocuments: (...args: unknown[]) => mocks.docs(...args),
}));
vi.mock('@/hooks/useAICaseWorkflow', () => ({
  useAICaseWorkflow: (...args: unknown[]) => mocks.workflow(...args),
}));
const noteMocks = {
  create: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  update: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  remove: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
};

vi.mock('@/hooks/useAICaseTimeline', () => ({
  useAICaseTimeline: (...args: unknown[]) => mocks.timeline(...args),
  useCreateAITimelineNote: (...args: unknown[]) => noteMocks.create(...args),
  useUpdateAITimelineNote: (...args: unknown[]) => noteMocks.update(...args),
  useDeleteAITimelineNote: (...args: unknown[]) => noteMocks.remove(...args),
}));

import { CaseActivity } from '@/components/lawyer/CaseActivity';

const baseCase = {
  id: 'case-1',
  title: 'Caso 1',
  created_at: '2026-09-01T10:00:00.000Z',
} as never;

const idleQuery = { data: [], isLoading: false, isError: false };

function setup(opts: {
  docs?: unknown[];
  workflowItems?: unknown[];
  notes?: unknown[];
  bookings?: unknown[];
  workspaceId?: string | null;
} = {}) {
  mocks.docs.mockReturnValue({ ...idleQuery, data: opts.docs ?? [] });
  mocks.workflow.mockReturnValue({ ...idleQuery, data: { items: opts.workflowItems ?? [] } });
  mocks.timeline.mockReturnValue({ ...idleQuery, data: opts.notes ?? [] });
  const onOpenDocuments = vi.fn();
  render(
    <CaseActivity
      caseData={baseCase}
      workspaceId={'workspaceId' in opts ? (opts.workspaceId as string | null) : 'ws-1'}
      bookings={(opts.bookings ?? []) as never}
      onOpenDocuments={onOpenDocuments}
    />
  );
  return { onOpenDocuments };
}

describe('CaseActivity 4.30F — operational activity MVP', () => {
  beforeEach(() => vi.clearAllMocks());

  it('replaces placeholder: renders case-created event from lawyer_cases.created_at', () => {
    setup({ workspaceId: null });
    expect(screen.getByText('Timeline del caso')).toBeInTheDocument();
    expect(screen.getByText('Caso creado')).toBeInTheDocument();
    expect(screen.queryByText('La actividad del caso aparecerá aquí.')).not.toBeInTheDocument();
  });
  it('renders timeline heading with chronological copy', () => {
    setup({ workspaceId: null });
    expect(screen.getByText('Timeline del caso')).toBeInTheDocument();
    expect(screen.getByText('Actividad y actualizaciones del caso en orden cronológico.')).toBeInTheDocument();
  });

  it('works without workspace (case + bookings only)', () => {
    setup({
      workspaceId: null,
      bookings: [{ id: 'b-1', service_title: 'Cita inicial', scheduled_date: '2026-09-05', scheduled_time: '10:00', status: 'confirmed' }],
    });
    expect(screen.getByText('Caso creado')).toBeInTheDocument();
    expect(screen.getByText('Cita agendada')).toBeInTheDocument();
    expect(mocks.docs).toHaveBeenCalledWith(undefined);
  });

  it('document uploaded and analyzed render once each (no duplicate sources)', () => {
    setup({
      docs: [
        { id: 'd-1', original_filename: 'contrato.pdf', created_at: '2026-09-02T10:00:00.000Z', updated_at: '2026-09-03T10:00:00.000Z', analysis_status: 'ready' },
      ],
    });
    expect(screen.getByText('contrato.pdf agregado')).toBeInTheDocument();
    expect(screen.getByText('contrato.pdf analizado')).toBeInTheDocument();
    expect(screen.getAllByText(/contrato\.pdf/).length).toBe(2);
  });

  it('processing document shows upload only, not analysis', () => {
    setup({
      docs: [
        { id: 'd-2', original_filename: 'nota.pdf', created_at: '2026-09-02T10:00:00.000Z', updated_at: '2026-09-02T10:00:00.000Z', analysis_status: 'processing' },
      ],
    });
    expect(screen.getByText('nota.pdf agregado')).toBeInTheDocument();
    expect(screen.queryByText('nota.pdf analizado')).not.toBeInTheDocument();
  });

  it('workflow completed uses completed_at; items without it do not fabricate completion', () => {
    setup({
      workflowItems: [
        { id: 'w-1', title: 'Revisar cláusula', status: 'completed', completed_at: '2026-09-04T10:00:00.000Z' },
        { id: 'w-2', title: 'Pendiente', status: 'pending', completed_at: null, updated_at: '2026-09-04T10:00:00.000Z' },
      ],
    });
    expect(screen.getByText('Acción completada')).toBeInTheDocument();
    expect(screen.getByText('Revisar cláusula')).toBeInTheDocument();
    expect(screen.queryByText('Pendiente')).not.toBeInTheDocument();
  });

  it('manual notes render; non-note timeline events are ignored (no duplicates)', () => {
    setup({
      notes: [
        { id: 'n-1', event_type: 'note', title: 'Llamar al cliente', description: 'Urgente', event_date: '2026-09-05T10:00:00.000Z' },
        { id: 'e-1', event_type: 'document_uploaded', title: 'Documento incorporado', event_date: '2026-09-02T10:00:00.000Z', metadata: {} },
      ],
    });
    expect(screen.getByText('Llamar al cliente')).toBeInTheDocument();
    expect(screen.queryByText('Documento incorporado')).not.toBeInTheDocument();
  });

  it('events sorted newest-first', () => {
    setup({
      notes: [
        { id: 'n-old', event_type: 'note', title: 'Nota vieja', event_date: '2026-09-02T10:00:00.000Z' },
        { id: 'n-new', event_type: 'note', title: 'Nota nueva', event_date: '2026-09-06T10:00:00.000Z' },
      ],
    });
    const items = screen.getAllByRole('listitem');
    const text = items.map((li) => li.textContent).join('|');
    expect(text.indexOf('Nota nueva')).toBeLessThan(text.indexOf('Nota vieja'));
  });

  it('document activity navigates to outer Documentos', () => {
    const { onOpenDocuments } = setup({
      docs: [{ id: 'd-1', original_filename: 'c.pdf', created_at: '2026-09-02T10:00:00.000Z', updated_at: '2026-09-02T10:00:00.000Z', analysis_status: 'pending' }],
    });
    fireEvent.click(screen.getByLabelText('c.pdf agregado — ver en Documentos'));
    expect(onOpenDocuments).toHaveBeenCalledTimes(1);
  });

  it('opening Activity performs 0 provider calls and 0 DB writes', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    setup({
      docs: [{ id: 'd-1', original_filename: 'c.pdf', created_at: '2026-09-02T10:00:00.000Z', updated_at: '2026-09-02T10:00:00.000Z', analysis_status: 'ready' }],
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('does not claim full analysis history or audit log', () => {
    setup();
    expect(screen.queryByText(/historial completo/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/auditoría/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/cronología/i)).not.toBeInTheDocument();
  });
});

describe('CaseActivity 4.34J — note CRUD parity (legacy timeline model)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    noteMocks.create.mockReturnValue({ mutate: vi.fn(), isPending: false });
    noteMocks.update.mockReturnValue({ mutate: vi.fn(), isPending: false });
    noteMocks.remove.mockReturnValue({ mutate: vi.fn(), isPending: false });
  });

  const noteEvent = {
    id: 'ev-1', workspace_id: 'ws-1', event_type: 'note', title: 'Actualización del caso',
    description: 'Llamó el cliente', event_date: '2026-09-03T10:00:00.000Z',
  };

  it('shows add-note entry and creates via legacy hook', () => {
    setup({ notes: [noteEvent] });
    fireEvent.click(screen.getByRole('button', { name: /agregar actualización/i }));
    fireEvent.change(screen.getByLabelText(/contenido de la nota/i), { target: { value: 'Nueva nota QA' } });
    const mutate = vi.mocked(noteMocks.create().mutate);
    fireEvent.click(screen.getByRole('button', { name: /^guardar nota$/i }));
    expect(noteMocks.create).toHaveBeenCalled();
    expect(mutate).toHaveBeenCalledWith('Nueva nota QA', expect.anything());
  });

  it('note rows expose edit and delete controls', () => {
    setup({ notes: [noteEvent] });
    expect(screen.getByRole('button', { name: /editar nota/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /eliminar nota/i })).toBeInTheDocument();
  });

  it('edit flow calls update with id + description only', () => {
    setup({ notes: [noteEvent] });
    fireEvent.click(screen.getByRole('button', { name: /editar nota/i }));
    fireEvent.change(screen.getByLabelText(/editar contenido de la nota/i), { target: { value: 'Editada QA' } });
    const mutate = vi.mocked(noteMocks.update().mutate);
    fireEvent.click(screen.getByRole('button', { name: /^guardar$/i }));
    expect(mutate).toHaveBeenCalledWith({ id: 'ev-1', description: 'Editada QA' }, expect.anything());
  });

  it('delete asks confirmation and calls remove once', () => {
    const confirmSpy = vi.fn(() => true);
    Object.defineProperty(window, 'confirm', { value: confirmSpy, configurable: true });
    setup({ notes: [noteEvent] });
    fireEvent.click(screen.getByRole('button', { name: /eliminar nota/i }));
    expect(confirmSpy).toHaveBeenCalled();
    expect(noteMocks.remove().mutate).toHaveBeenCalledWith('ev-1', expect.anything());
  });

  it('existing activity events preserved alongside notes', () => {
    setup({
      notes: [noteEvent],
      docs: [{ id: 'd-1', original_filename: 'c.pdf', created_at: '2026-09-02T10:00:00.000Z', updated_at: '2026-09-02T10:00:00.000Z', analysis_status: 'ready' }],
    });
    expect(screen.getByText('Caso creado')).toBeInTheDocument();
    expect(screen.getByText('Llamó el cliente')).toBeInTheDocument();
    expect(screen.getByText('c.pdf analizado')).toBeInTheDocument();
  });

  it('note mutations bind owner explicitly; update touches description only', () => {
    const src = readFileSync(resolve(process.cwd(), 'src/hooks/useAICaseTimeline.ts'), 'utf8');
    expect(src).toContain('lawyer_id: lawyerId');
    expect(src).toContain('.update({ description: trimmed })');
  });
});
