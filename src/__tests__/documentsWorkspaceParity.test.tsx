import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

const state = vi.hoisted(() => ({
  docs: [] as Record<string, unknown>[],
  analyze: vi.fn(),
  process: vi.fn(),
  asked: null as string | null,
}));
vi.mock('@/hooks/useAIDocuments', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/hooks/useAIDocuments');
  return {
    ...actual,
    useAIDocuments: () => ({ data: state.docs, isLoading: false, isError: false, refetch: vi.fn() }),
    useAIDocumentAnalysis: () => ({ data: null }),
    useAnalyzeAIDocument: () => ({ mutate: state.analyze, isPending: false }),
    useProcessAIDocument: () => ({ mutate: state.process, isPending: false }),
  };
});
vi.mock('@/hooks/useAISubscription', () => ({ useAIFeatureAccess: () => ({ canUse: () => true, isLoading: false }) }));
vi.mock('@/contexts/AuthContext/clean/useAuth', () => ({ useAuth: () => ({ user: { id: 'L1' } }) }));
vi.mock('posthog-js', () => ({ default: { capture: vi.fn() } }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/supabaseClient', () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: null } }) }, from: () => { throw new Error('no db'); } },
}));
vi.mock('@/components/legalup-ai/AIDocumentUpload', () => ({
  AIDocumentUpload: ({ onUploaded }: { onUploaded: (d: unknown) => void }) => (
    <button onClick={() => onUploaded({ id: 'd-new' })}>upload</button>
  ),
}));
vi.mock('@/components/legalup-ai/AIDocumentList', () => ({
  AIDocumentList: ({ documents, onSelect }: { documents: { id: string; original_filename: string }[]; onSelect: (id: string) => void }) => (
    <div>{documents.map((d) => <button key={d.id} onClick={() => onSelect(d.id)}>{d.original_filename}</button>)}</div>
  ),
}));
vi.mock('@/components/legalup-ai/AIAnalysisView', () => ({
  AIAnalysisView: ({ onAnalyze }: { onAnalyze: () => void }) => <button onClick={onAnalyze}>Analizar</button>,
}));
vi.mock('@/components/legalup-ai/AIChat', () => ({
  AIChat: () => <div data-testid="inline-chat">chat</div>,
}));

import { AICaseDocumentsWorkspace } from '@/components/legalup-ai/AICaseDocumentsWorkspace';

const doc = (over = {}) => ({
  id: 'd1', lawyer_id: 'L1', workspace_id: 'W1', original_filename: 'c.pdf',
  file_path: 'L1/W1/d1/original.pdf', status: 'ready', analysis_status: 'ready',
  extracted_text: 'texto suficiente para analizar el documento de prueba.',
  ...over,
});

function renderShared(over = {}) {
  return render(
    <AICaseDocumentsWorkspace
      workspaceId="W1"
      canAnalyze
      canChat
      accessLoading={false}
      upgradeCtaLabel="Ver LegalUp Pro"
      onUpgrade={vi.fn()}
      onAskDocument={(id) => { state.asked = id; }}
      analyticsSource="test"
      {...over}
    />
  );
}

describe('4.34P shared documents workspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.docs = [];
    state.asked = null;
  });

  it('renders legacy two-column workspace grid', () => {
    state.docs = [doc()];
    const { container } = renderShared();
    expect(container.querySelector('.lg\\:grid-cols-2')).not.toBeNull();
    expect(screen.getByText('Documentos del caso')).toBeInTheDocument();
    expect(screen.getByText('Análisis con IA')).toBeInTheDocument();
    expect(screen.getByTestId('inline-chat')).toBeInTheDocument();
  });

  it('selects first document by default with analysis + ask action', () => {
    state.docs = [doc(), doc({ id: 'd2', original_filename: 'e.pdf' })];
    renderShared();
    expect(screen.getByText('Analizar')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Preguntar sobre este documento'));
    expect(state.asked).toBe('d1');
  });

  it('upload auto-processes and selects the new document', () => {
    renderShared();
    fireEvent.click(screen.getByText('upload'));
    expect(state.process.mock.calls[0][0]).toBe('d-new');
  });

  it('legacy gating hides upload behind analyze lock; canonical keeps upload', () => {
    const { unmount } = renderShared({ canAnalyze: false, gateUploadOnAnalyze: true, upgradeCtaLabel: 'Ver planes' });
    expect(screen.getByText('Ver planes')).toBeInTheDocument();
    expect(screen.queryByText('upload')).not.toBeInTheDocument();
    unmount();
    renderShared({ canAnalyze: false });
    expect(screen.getByText('upload')).toBeInTheDocument();
    expect(screen.getByText('Ver LegalUp Pro')).toBeInTheDocument();
  });

  it('failed analysis offers retry with error text', () => {
    state.docs = [doc({ analysis_status: 'failed', analysis_error: 'boom' })];
    renderShared();
    expect(screen.getByText('boom')).toBeInTheDocument();
    expect(screen.getByText('Reintentar análisis')).toBeInTheDocument();
  });

  it('no standalone commercial shell inside shared component', () => {
    const c = read('src/components/legalup-ai/AICaseDocumentsWorkspace.tsx');
    expect(c).not.toMatch(/49\.900|trial|suscrib|pricing/i);
    expect(c).toContain('upgradeCtaLabel');
  });

  it('both routes render the shared workspace', () => {
    expect(read('src/pages/lawyer/AICaseDetail.tsx')).toContain('AICaseDocumentsWorkspace');
    expect(read('src/components/lawyer/CaseDocuments.tsx')).toContain('AICaseDocumentsWorkspace');
  });
});
