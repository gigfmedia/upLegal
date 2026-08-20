import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { AIChat } from '@/components/legalup-ai/AIChat';
import { AIResearchPanel } from '@/components/legalup-ai/AIResearchPanel';
import type { AIDocumentListItem } from '@/hooks/useAIDocuments';

// ---------------------------------------------------------------------------
// Fase 4.2.18 · Estados del historial: "no hay historial" ≠ "no pude cargar el
// historial". Verifica:
//   - loading  -> skeleton (sin empty state momentáneo)
//   - error    -> estado explícito + Reintentar (sin sugerencias ni vacío)
//   - retry    -> reutiliza React Query (refetch) y recupera el historial
//   - empty    -> el historial vacío real NO se confunde con error de conexión
// ---------------------------------------------------------------------------

const {
  chatState,
  setChat,
  researchState,
  setResearch,
  refetchChat,
  refetchResearch,
} = vi.hoisted(() => {
  const chatState: Record<string, unknown> = {
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    failureCount: 0,
  };
  const researchState: Record<string, unknown> = {
    data: [],
    isLoading: false,
    isError: false,
    error: null,
    failureCount: 0,
  };
  const refetchChat = vi.fn();
  const refetchResearch = vi.fn();
  return {
    chatState,
    setChat: (patch: Record<string, unknown>) => Object.assign(chatState, patch),
    researchState,
    setResearch: (patch: Record<string, unknown>) => Object.assign(researchState, patch),
    refetchChat,
    refetchResearch,
  };
});

vi.mock('posthog-js', () => ({ default: { capture: vi.fn(), init: vi.fn() } }));

vi.mock('@/hooks/useAIChat', () => ({
  useAICaseChat: () => chatState,
  useSendChatMessage: () => ({ mutate: vi.fn(), isPending: false, error: null }),
}));

vi.mock('@/hooks/useAIResearch', () => ({
  useAICaseResearch: () => researchState,
  useRunAIResearch: () => ({ mutate: vi.fn(), isPending: false, error: null }),
  buildSourceEvidencePlan: () => ({ primary: [], context: [] }),
}));

const chatData = {
  conversation: {
    id: 'c1',
    workspace_id: 'ws-1',
    lawyer_id: 'lawyer-1',
    title: null,
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z',
  },
  messages: [
    {
      id: 'm1',
      conversation_id: 'c1',
      workspace_id: 'ws-1',
      lawyer_id: 'lawyer-1',
      role: 'user',
      content: '¿Qué dice el contrato?',
      metadata: null,
      created_at: '2026-08-02T00:00:00Z',
    },
    {
      id: 'm2',
      conversation_id: 'c1',
      workspace_id: 'ws-1',
      lawyer_id: 'lawyer-1',
      role: 'assistant',
      content: 'La cláusula establece el plazo.',
      metadata: null,
      created_at: '2026-08-02T00:00:01Z',
    },
  ],
};

const researchData = [
  {
    id: 'r1',
    workspace_id: 'ws-1',
    lawyer_id: 'lawyer-1',
    query: 'Indemnización por despido',
    answer: 'La jurisprudencia señala que la indemnización procede por despido injustificado.',
    sources: [],
    model: 'model-test',
    created_at: '2026-08-11T00:00:00Z',
  },
];

const readyDoc = {
  id: 'd1',
  status: 'ready',
  original_filename: 'contrato.pdf',
} as unknown as AIDocumentListItem;

const resetStates = () => {
  setChat({ data: undefined, isLoading: false, isError: false, error: null, failureCount: 0 });
  setResearch({ data: [], isLoading: false, isError: false, error: null, failureCount: 0 });
  refetchChat.mockReset();
  refetchResearch.mockReset();
};

describe('AIChat — estados del historial (Fase 4.2.18)', () => {
  beforeEach(resetStates);

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('loading → success: skeleton primero y luego el historial completo', () => {
    setChat({ data: undefined, isLoading: true, isError: false });
    const { container, rerender } = render(
      <AIChat workspaceId="ws-1" documents={[readyDoc]} />
    );

    expect(container.querySelector('.animate-pulse')).toBeTruthy();
    expect(screen.queryByText('Puedes preguntar:')).toBeNull();
    expect(screen.queryByText('No pudimos cargar el historial.')).toBeNull();

    setChat({ data: chatData, isLoading: false, isError: false });
    rerender(<AIChat workspaceId="ws-1" documents={[readyDoc]} />);

    expect(screen.getByText('¿Qué dice el contrato?')).toBeTruthy();
    expect(screen.getByText('La cláusula establece el plazo.')).toBeTruthy();
    expect(container.querySelector('.animate-pulse')).toBeNull();
  });

  it('loading → error: estado explícito y NO muestra sugerencias', () => {
    setChat({ data: undefined, isLoading: true, isError: false });
    const { container, rerender } = render(
      <AIChat workspaceId="ws-1" documents={[readyDoc]} />
    );
    expect(container.querySelector('.animate-pulse')).toBeTruthy();

    setChat({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('boom'),
      failureCount: 1,
    });
    rerender(<AIChat workspaceId="ws-1" documents={[readyDoc]} />);

    expect(screen.getByText('No pudimos cargar el historial.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy();
    expect(screen.queryByText('Puedes preguntar:')).toBeNull();
    expect(container.querySelector('.animate-pulse')).toBeNull();
  });

  it('error → retry → success: Reintentar reutiliza React Query y recupera el historial', () => {
    refetchChat.mockImplementation(() => {
      setChat({ data: chatData, isLoading: false, isError: false, error: null, failureCount: 0 });
      return Promise.resolve();
    });
    setChat({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('boom'),
      failureCount: 1,
      refetch: refetchChat,
    });
    const { rerender } = render(<AIChat workspaceId="ws-1" documents={[readyDoc]} />);
    expect(screen.getByText('No pudimos cargar el historial.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetchChat).toHaveBeenCalledTimes(1);

    rerender(<AIChat workspaceId="ws-1" documents={[readyDoc]} />);
    expect(screen.getByText('¿Qué dice el contrato?')).toBeTruthy();
    expect(screen.queryByText('No pudimos cargar el historial.')).toBeNull();
  });

  it('historial vacío real: muestra sugerencias y NO el estado de error', () => {
    setChat({
      data: { conversation: chatData.conversation, messages: [] },
      isLoading: false,
      isError: false,
    });
    const { container } = render(<AIChat workspaceId="ws-1" documents={[readyDoc]} />);

    expect(screen.getByText('Puedes preguntar:')).toBeTruthy();
    expect(screen.queryByText('No pudimos cargar el historial.')).toBeNull();
    expect(container.querySelector('.animate-pulse')).toBeNull();
  });
});

describe('AIResearchPanel — estados del historial (Fase 4.2.18)', () => {
  beforeEach(resetStates);

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('loading → success: skeleton primero y luego las investigaciones', () => {
    setResearch({ data: [], isLoading: true, isError: false });
    const { container, rerender } = render(<AIResearchPanel workspaceId="ws-1" />);

    expect(container.querySelector('.animate-pulse')).toBeTruthy();
    expect(screen.queryByText('Sin investigaciones aún')).toBeNull();
    expect(screen.queryByText('No pudimos cargar tus investigaciones.')).toBeNull();

    setResearch({ data: researchData, isLoading: false, isError: false });
    rerender(<AIResearchPanel workspaceId="ws-1" />);

    expect(screen.getByText('Indemnización por despido')).toBeTruthy();
    expect(screen.queryByText('Sin investigaciones aún')).toBeNull();
    expect(container.querySelector('.animate-pulse')).toBeNull();
  });

  it('loading → error: estado explícito y NO muestra el vacío', () => {
    setResearch({ data: [], isLoading: true, isError: false });
    const { container, rerender } = render(<AIResearchPanel workspaceId="ws-1" />);
    expect(container.querySelector('.animate-pulse')).toBeTruthy();

    setResearch({
      data: [],
      isLoading: false,
      isError: true,
      error: new Error('boom'),
      failureCount: 1,
    });
    rerender(<AIResearchPanel workspaceId="ws-1" />);

    expect(screen.getByText('No pudimos cargar tus investigaciones.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy();
    expect(screen.queryByText('Sin investigaciones aún')).toBeNull();
    expect(container.querySelector('.animate-pulse')).toBeNull();
  });

  it('error → retry → success: Reintentar reutiliza React Query y recupera las investigaciones', () => {
    refetchResearch.mockImplementation(() => {
      setResearch({
        data: researchData,
        isLoading: false,
        isError: false,
        error: null,
        failureCount: 0,
      });
      return Promise.resolve();
    });
    setResearch({
      data: [],
      isLoading: false,
      isError: true,
      error: new Error('boom'),
      failureCount: 1,
      refetch: refetchResearch,
    });
    const { rerender } = render(<AIResearchPanel workspaceId="ws-1" />);
    expect(screen.getByText('No pudimos cargar tus investigaciones.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetchResearch).toHaveBeenCalledTimes(1);

    rerender(<AIResearchPanel workspaceId="ws-1" />);
    expect(screen.getByText('Indemnización por despido')).toBeTruthy();
    expect(screen.queryByText('No pudimos cargar tus investigaciones.')).toBeNull();
  });

  it('historial vacío real: muestra "Sin investigaciones aún" y NO el estado de error', () => {
    setResearch({ data: [], isLoading: false, isError: false });
    const { container } = render(<AIResearchPanel workspaceId="ws-1" />);

    expect(screen.getByText('Sin investigaciones aún')).toBeTruthy();
    expect(screen.queryByText('No pudimos cargar tus investigaciones.')).toBeNull();
    expect(container.querySelector('.animate-pulse')).toBeNull();
  });
});