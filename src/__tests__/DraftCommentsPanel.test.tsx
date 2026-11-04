import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { DraftCommentsPanel, type DraftCommentRow } from '@/components/legalup-ai/DraftCommentsPanel';
import type { DraftComment } from '@/hooks/useDraftComments';

const anchor = { quote: 'fragmento', prefix: '', suffix: '', start_hint: 1, end_hint: 10 };

const makeRow = (
  id: string,
  status: DraftComment['status'],
  resolution: DraftCommentRow['resolution'],
): DraftCommentRow => ({
  comment: {
    id,
    draft_id: 'd1',
    lawyer_id: 'u1',
    lawyer_case_id: 'case1',
    workspace_id: 'ws1',
    body: `Comentario ${id}`,
    author: 'ai',
    status,
    anchor,
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-01T00:00:00Z',
    resolved_at: status === 'resolved' ? '2026-11-01T01:00:00Z' : null,
  },
  resolution,
});

const renderPanel = (rows: DraftCommentRow[], over: Partial<Parameters<typeof DraftCommentsPanel>[0]> = {}) => {
  const props = {
    rows,
    isLoading: false,
    error: null,
    activeCommentId: null,
    reanchorTargetId: null,
    reanchorError: null,
    onNavigate: vi.fn(),
    onResolve: vi.fn(),
    onReopen: vi.fn(),
    onDismiss: vi.fn(),
    onDelete: vi.fn(),
    onStartReanchor: vi.fn(),
    onConfirmReanchor: vi.fn(),
    onCancelReanchor: vi.fn(),
    ...over,
  };
  render(<DraftCommentsPanel {...props} />);
  return props;
};

describe('UA-5.2 — panel de comentarios', () => {
  it('separa anclados y no anclados y deshabilita navegar sin ancla', () => {
    const props = renderPanel([
      makeRow('a', 'open', { status: 'anchored', from: 1, to: 9 }),
      makeRow('b', 'open', { status: 'orphaned' }),
      makeRow('c', 'open', { status: 'ambiguous' }),
    ]);

    expect(screen.getByTestId('draft-comments-panel')).toHaveTextContent('Anclados');
    expect(screen.getByTestId('draft-comments-panel')).toHaveTextContent('Sin anclar');
    expect(screen.getByTestId('draft-comment-navigate-a')).not.toBeDisabled();
    expect(screen.getByTestId('draft-comment-navigate-b')).toBeDisabled();
    expect(screen.getByTestId('draft-comment-navigate-c')).toBeDisabled();

    fireEvent.click(screen.getByTestId('draft-comment-navigate-a'));
    expect(props.onNavigate).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }));
    fireEvent.click(screen.getByTestId('draft-comment-resolve-a'));
    expect(props.onResolve).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }));
    fireEvent.click(screen.getByTestId('draft-comment-dismiss-a'));
    expect(props.onDismiss).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }));
  });

  it('permite reanclar manualmente un huérfano y reabrir un resuelto', () => {
    const props = renderPanel(
      [makeRow('b', 'open', { status: 'orphaned' }), makeRow('r', 'resolved', { status: 'orphaned' })],
      { reanchorTargetId: 'b' },
    );

    // El flujo de reanclaje exige una acción explícita (confirmar/cancelar) y
    // nunca mueve el ancla al seleccionar por sí solo.
    fireEvent.click(screen.getByTestId('draft-comment-reanchor-confirm'));
    expect(props.onConfirmReanchor).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(props.onCancelReanchor).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('draft-comment-reopen-r'));
    expect(props.onReopen).toHaveBeenCalledWith(expect.objectContaining({ id: 'r' }));
    fireEvent.click(screen.getByTestId('draft-comment-delete-r'));
    expect(props.onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 'r' }));
  });

  it('muestra el estado vacío honesto cuando no hay comentarios', () => {
    renderPanel([]);
    expect(screen.getByTestId('draft-comments-panel')).toHaveTextContent('Selecciona un fragmento del documento');
    expect(screen.queryByTestId('draft-comment-a')).not.toBeInTheDocument();
  });
});
