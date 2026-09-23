import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AIChat } from '@/components/legalup-ai/AIChat';
import type { AIDocumentListItem } from '@/hooks/useAIDocuments';
import posthog from 'posthog-js';

vi.mock('@/lib/supabaseClient', () => ({ supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'test' } } }) } } }));
vi.mock('posthog-js', () => ({ default: { capture: vi.fn() } }));
vi.mock('@/components/legalup-ai/AIChatSuggestions', () => ({
  AIChatSuggestions: ({ onSelect }: { onSelect: (text: string) => void }) => (
    <button type="button" onClick={() => onSelect('Sugerencia de prueba')}>Sugerencia de prueba</button>
  ),
}));
vi.mock('@/components/legalup-ai/AIChatMessage', () => ({ AIChatMessage: ({ message }: { message: { content: string } }) => <p>{message.content}</p> }));
const documents = [{ id: 'doc-a', status: 'ready' }] as AIDocumentListItem[];
const thinking = () => screen.queryByRole('status', { name: 'LegalUp AI está analizando la pregunta' });
const input = () => screen.getByRole('textbox', { name: 'Pregunta para el asistente del caso' });
const send = (text = 'Pregunta A') => {
  fireEvent.change(input(), { target: { value: text } });
  fireEvent.click(screen.getByRole('button', { name: 'Enviar pregunta' }));
};
const response = (n = 1, workspace = 'ws-a') => new Response(JSON.stringify({
  message: { id: `answer-${n}`, role: 'assistant', content: `Respuesta ${n}`, workspace_id: workspace, conversation_id: 'conv', metadata: null },
  user_message: null, sources: [],
}));
let requests: { resolve: (value: Response) => void; reject: (error: Error) => void; init: RequestInit }[];
let client: QueryClient;
function mount(documentId?: string) {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } });
  const view = (workspace = 'ws-a', doc = documentId) => <QueryClientProvider client={client}><AIChat workspaceId={workspace} documentId={doc} documents={documents} /></QueryClientProvider>;
  return { ...render(view()), view };
}
beforeEach(() => {
  requests = [];
  vi.mocked(posthog.capture).mockReset();
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('fetch', vi.fn((_url, init: RequestInit = {}) => {
    if (init.method !== 'POST') {
      // A background history refresh deliberately never settles.
      if (requests.length) return new Promise(() => {});
      return Promise.resolve(new Response(JSON.stringify({ conversation: { id: 'conv' }, messages: [] })));
    }
    return new Promise<Response>((resolve, reject) => {
      requests.push({ resolve, reject, init });
      init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    });
  }));
});
afterEach(() => { cleanup(); client?.clear(); vi.unstubAllGlobals(); });

describe('4.40A document chat entry points (static wiring)', () => {
  const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');
  it.each([
    'src/components/lawyer/CaseDocuments.tsx',
    'src/pages/lawyer/AICaseDetail.tsx',
  ])('%s opens document chat without a default question', (p) => {
    const c = read(p);
    expect(c).toContain('onAskDocument');
    expect(c).toContain('setChatQuestion(null)');
    expect(c).not.toContain("setChatQuestion('¿Qué aspectos relevantes");
  });
  it('explicit question flows still inject the user-clicked question', () => {
    // Command-center / workflow / intelligence clicks pass their own q
    // (or the openCaseChat question param); document open passes null.
    for (const p of [
      'src/components/legalup-ai/AICaseWorkspaceContent.tsx',
      'src/pages/lawyer/AICaseDetail.tsx',
    ]) {
      expect(read(p)).toMatch(/setChatQuestion\(q\)/);
    }
    expect(read('src/pages/lawyer/CaseDetailPage.tsx')).toMatch(/setChatQuestion\(question\)/);
    // The auto-send effect itself is preserved for those explicit questions.
    expect(read('src/components/legalup-ai/AIChat.tsx')).toContain('runMutation(q)');
  });
});

describe('shared chat request lifecycle', () => {
  it.each([undefined, 'doc-a'])('settles two messages, without waiting for history refetch (document %s)', async (doc) => {
    mount(doc);
    await waitFor(() => expect(input()).not.toBeDisabled());
    for (let n = 1; n <= 2; n++) {
      send(`Pregunta ${n}`);
      await waitFor(() => expect(requests).toHaveLength(n));
      expect(thinking()).toBeInTheDocument();
      expect(input()).toBeDisabled();
      fireEvent.click(screen.getByRole('button', { name: 'Enviar pregunta' }));
      expect(requests).toHaveLength(n);
      expect(JSON.parse(requests[n - 1].init.body as string).document_id).toBe(doc);
      await act(async () => requests[n - 1].resolve(response(n)));
      await waitFor(() => expect(thinking()).not.toBeInTheDocument());
      expect(screen.getAllByText(`Respuesta ${n}`)).toHaveLength(1);
      expect(input()).not.toBeDisabled();
    }
  });
  it.each(['provider', 'network', 'json', 'shape'])('settles %s failure and allows another send', async (kind) => {
    mount(); await waitFor(() => expect(input()).not.toBeDisabled()); send();
    await waitFor(() => expect(requests).toHaveLength(1));
    await act(async () => {
      if (kind === 'network') requests[0].reject(new Error('Network failed'));
      else requests[0].resolve(kind === 'provider' ? new Response(JSON.stringify({ error: 'Provider failed' }), { status: 503 }) : kind === 'json' ? new Response('invalid json') : new Response('{}'));
    });
    await waitFor(() => expect(thinking()).not.toBeInTheDocument());
    expect(screen.getByText(kind === 'network' ? 'Network failed' : kind === 'provider' ? 'Provider failed' : 'La respuesta del chat no es válida. Intenta nuevamente.')).toBeInTheDocument();
    expect(input()).not.toBeDisabled(); send('Otra pregunta');
    await waitFor(() => expect(requests).toHaveLength(2));
  });
  it.each(['workspace', 'document', 'close'])('aborts on %s change without leaking pending state', async (kind) => {
    const mounted = mount(); await waitFor(() => expect(input()).not.toBeDisabled()); send();
    await waitFor(() => expect(requests).toHaveLength(1));
    if (kind === 'close') mounted.unmount();
    else mounted.rerender(mounted.view(kind === 'workspace' ? 'ws-b' : 'ws-a', kind === 'document' ? 'doc-b' : undefined));
    await waitFor(() => expect(requests[0].init.signal?.aborted).toBe(true));
    expect(thinking()).not.toBeInTheDocument();
    await act(async () => requests[0].resolve(response()));
    expect(screen.queryByText('Respuesta 1')).not.toBeInTheDocument();
  });
  it('external workflow/intelligence question settles without resubmitting the prop', async () => {
    client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const handled = vi.fn();
    render(<QueryClientProvider client={client}><AIChat workspaceId="ws-a" documents={documents} externalQuestion="Pregunta de workflow" onExternalQuestionHandled={handled} /></QueryClientProvider>);
    await waitFor(() => expect(requests).toHaveLength(1));
    expect(thinking()).toBeInTheDocument();
    await act(async () => requests[0].resolve(response()));
    await waitFor(() => expect(thinking()).not.toBeInTheDocument());
    expect(handled).toHaveBeenCalledTimes(1);
    expect(requests).toHaveLength(1);
    send('Seguimiento');
    await waitFor(() => expect(requests).toHaveLength(2));
  });
  it('fast success and broken analytics cannot hold the request pending', async () => {
    vi.mocked(posthog.capture).mockImplementation(() => { throw new Error('analytics'); });
    mount(); await waitFor(() => expect(input()).not.toBeDisabled());
    vi.mocked(fetch).mockImplementation(async (_url, init) => init?.method === 'POST' ? response() : new Promise(() => {}));
    send();
    await screen.findByText('Respuesta 1');
    await waitFor(() => expect(thinking()).not.toBeInTheDocument());
    expect(input()).not.toBeDisabled();
  });
  it('4.40A opening document chat sends nothing and keeps input enabled', async () => {
    mount('doc-a');
    await waitFor(() => expect(input()).not.toBeDisabled());
    expect(input()).toHaveValue('');
    expect(requests.filter((r) => r.init.method === 'POST')).toHaveLength(0);
    expect(thinking()).not.toBeInTheDocument();
    expect(posthog.capture).not.toHaveBeenCalledWith('ai_chat_message_sent', expect.anything());
  });
  it('4.40A suggestion click sends exactly once (explicit user action)', async () => {
    mount('doc-a');
    await waitFor(() => expect(input()).not.toBeDisabled());
    fireEvent.click(screen.getByRole('button', { name: 'Sugerencia de prueba' }));
    await waitFor(() => expect(requests).toHaveLength(1));
    expect(JSON.parse(requests[0].init.body as string).document_id).toBe('doc-a');
    await act(async () => requests[0].resolve(response()));
    await waitFor(() => expect(thinking()).not.toBeInTheDocument());
    expect(requests).toHaveLength(1);
    expect(input()).not.toBeDisabled();
  });
  it('4.40A close/reopen and document switch never auto-send', async () => {
    const mounted = mount('doc-a');
    await waitFor(() => expect(input()).not.toBeDisabled());
    mounted.unmount();
    const reopened = mount('doc-a');
    await waitFor(() => expect(input()).not.toBeDisabled());
    reopened.rerender(reopened.view('ws-a', 'doc-b'));
    await waitFor(() => expect(input()).not.toBeDisabled());
    expect(requests.filter((r) => r.init.method === 'POST')).toHaveLength(0);
  });
});
