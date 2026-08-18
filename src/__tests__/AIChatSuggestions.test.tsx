import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { AIChat } from '@/components/legalup-ai/AIChat';
import { AIResearchPanel } from '@/components/legalup-ai/AIResearchPanel';
import type { AIDocumentListItem } from '@/hooks/useAIDocuments';

// ---------------------------------------------------------------------------
// Fase 4.2.16 · Parte B — con acceso válido, las superficies de pregunta siguen
// presentes: el chat muestra sus preguntas sugeridas y el panel de
// jurisprudencia muestra su buscador/pregunta.
// ---------------------------------------------------------------------------

vi.mock('posthog-js', () => ({ default: { capture: vi.fn(), init: vi.fn() } }));

vi.mock('@/hooks/useAIChat', () => ({
  useAICaseChat: () => ({
    data: {
      conversation: {
        id: 'c1',
        workspace_id: 'ws-1',
        lawyer_id: 'lawyer-1',
        title: null,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z',
      },
      messages: [],
    },
    isLoading: false,
  }),
  useSendChatMessage: () => ({ mutate: vi.fn(), isPending: false, error: null }),
}));

vi.mock('@/hooks/useAIResearch', () => ({
  useAICaseResearch: () => ({ data: [], isLoading: false }),
  useRunAIResearch: () => ({ mutate: vi.fn(), isPending: false, error: null }),
  buildSourceEvidencePlan: () => ({ primary: [], context: [] }),
}));

const readyDoc = {
  id: 'd1',
  status: 'ready',
  original_filename: 'contrato.pdf',
} as unknown as AIDocumentListItem;

describe('AIChat — preguntas sugeridas (Fase 4.2.16)', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('con documento listo y conversación vacía, muestra las preguntas sugeridas', () => {
    render(<AIChat workspaceId="ws-1" documents={[readyDoc]} />);

    expect(screen.getByText('Chat del caso')).toBeTruthy();
    expect(screen.getByText('Puedes preguntar:')).toBeTruthy();
    expect(screen.getByText('¿Cuál es el principal riesgo del caso?')).toBeTruthy();
    expect(screen.getByText('Explícame la cláusula más importante.')).toBeTruthy();
  });

  it('sin documentos listos, el chat muestra el estado vacío en lugar de preguntas', () => {
    render(<AIChat workspaceId="ws-1" documents={[]} />);

    expect(screen.getByText('Este caso todavía no tiene documentos')).toBeTruthy();
    expect(screen.queryByText('Puedes preguntar:')).toBeNull();
  });
});

describe('AIResearchPanel — superficie de pregunta (Fase 4.2.16)', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('muestra el buscador de jurisprudencia y su placeholder de pregunta', () => {
    render(<AIResearchPanel workspaceId="ws-1" />);

    expect(screen.getByText('Investigar jurisprudencia')).toBeTruthy();
    expect(screen.getByPlaceholderText(/¿Qué dice la jurisprudencia sobre/)).toBeTruthy();
    expect(screen.getByText('Sin investigaciones aún')).toBeTruthy();
  });
});
