import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AICaseDrafts } from '@/components/legalup-ai/AICaseDrafts';

// UA-3 — Panel Agent AI del editor de borradores: chat del caso reutilizado,
// propuestas de texto con adjunto de contexto explícito, aceptar/descartar/
// copiar, inserción en cursor por el pipeline normal de guardado, sin
// duplicaciones, y sin tocar el zoom ni la disposición de la hoja.

const authState = vi.hoisted(() => {
  const currentToken = { value: 'tok' };
  return {
    currentToken,
    reset: () => { currentToken.value = 'tok'; },
  };
});

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: { access_token: authState.currentToken.value, user: { id: 'u' } } } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  },
}));

vi.mock('@/lib/aiOperationIdentity', () => ({
  aiOperationIdentity: async () => ({ id: 'op-1', complete: () => {} }),
}));

vi.mock('@/lib/aiInProgressPoll', () => ({
  pollTerminalResult: async (fn: () => Promise<{ res: Response; body: unknown }>) => fn(),
}));

// Documentos del caso controlado (para el chat embebido del Agent AI).
const documentsData = vi.hoisted(() => ({
  list: [{ id: 'doc-a', status: 'ready', original_filename: 'demanda.pdf' }],
}));
vi.mock('@/hooks/useAIDocuments', () => ({
  useAIDocuments: () => ({ data: documentsData.list, isLoading: false, error: null }),
}));

// AIChat se stubbea: la suite de chat tiene sus pruebas (chatLifecycle).
// Aquí solo interesa el cableado del embed.
vi.mock('@/components/legalup-ai/AIChat', () => ({
  AIChat: (props: { workspaceId: string; documents: unknown[] }) => (
    <div data-testid="agent-chat-embed" data-workspace={props.workspaceId} data-documents={JSON.stringify(props.documents)} />
  ),
}));

// Mock de TipTap: editor principal con registro de comandos. insertContent
// replica el editor real: agrega el nodo al documento y dispara onUpdate
// (= edición del usuario → autosave normal).
type FakeEditor = {
  isDestroyed: boolean;
  opts: { content?: string; editable?: boolean; onUpdate?: (e: { editor: unknown }) => void };
  html: string;
  cmdLog: string[];
  getHTML: () => string;
  isActive: (name: string | Record<string, unknown>, attrs?: Record<string, unknown>) => boolean;
  chain: () => Record<string, (...args: unknown[]) => unknown>;
  can: () => { undo: () => boolean; redo: () => boolean };
  commands: { setContent: (html: string, opts?: { emitUpdate?: boolean }) => void };
};
const fakeEditors: FakeEditor[] = [];
const editorCache: { main: FakeEditor | null; preview: FakeEditor | null } = { main: null, preview: null };
vi.mock('@tiptap/react', () => ({
  useEditor: (options: FakeEditor['opts']) => {
    const key = options?.editable === false ? 'preview' : 'main';
    const ed = editorCache[key] as FakeEditor | null;
    if (ed) {
      ed.opts = options ?? ed.opts;
      return ed;
    }
    const state: Record<string, boolean | number | string | undefined> = {};
    const created: FakeEditor = {
      isDestroyed: false,
      opts: options ?? {},
      cmdLog: [],
      html: options?.content ?? '<p></p>',
      isActive: (name, attrs) => {
        if (typeof name === 'string') {
          if (name === 'heading' && attrs && 'level' in attrs) {
            return !!state.heading && state.headingLevel === attrs.level;
          }
          return !!state[name];
        }
        if ('textAlign' in name) return state.textAlign === name.textAlign;
        return false;
      },
      chain: () => {
        type ChainFn = (...args: unknown[]) => unknown;
        const ret: ChainFn & Record<string, (...args: unknown[]) => unknown> = (() => ret) as ChainFn & Record<string, ChainFn>;
        const rec = (name: string, args?: unknown[]): unknown => {
          created.cmdLog.push(args?.length ? `${name}(${JSON.stringify(args)})` : name);
          return ret;
        };
        ret.focus = ret; ret.run = ret;
        ret.insertContent = (html: unknown) => {
          created.html = `${created.html}${String(html)}`;
          // Editorial real: insertContent emite una edición del usuario.
          (options ?? created.opts)?.onUpdate?.({ editor: created });
          return rec('insertContent', [html]);
        };
        ret.toggleBold = () => rec('toggleBold');
        ret.toggleItalic = () => rec('toggleItalic');
        ret.toggleBulletList = () => rec('toggleBulletList');
        ret.toggleOrderedList = () => rec('toggleOrderedList');
        ret.setParagraph = () => rec('setParagraph');
        ret.setTextAlign = (...args: unknown[]) => rec('setTextAlign', args);
        ret.unsetAllMarks = () => rec('unsetAllMarks');
        ret.clearNodes = () => rec('clearNodes');
        return ret;
      },
      can: () => ({ undo: () => false, redo: () => false }),
      commands: {
        setContent(html: string, opts?: { emitUpdate?: boolean }) {
          created.html = html;
          if (opts?.emitUpdate !== false) (options ?? created.opts)?.onUpdate?.({ editor: created });
        },
      },
      getHTML: () => created.html,
    };
    editorCache[key] = created;
    fakeEditors.push(created);
    return created;
  },
  EditorContent: ({ editor }: { editor: FakeEditor }) => (
    <div
      data-testid={editor?.opts?.editable === false ? 'tiptap-preview' : 'tiptap-content'}
      dangerouslySetInnerHTML={{ __html: (editor?.getHTML() ?? '') as string }}
    />
  ),
}));

const mainEditor = (): FakeEditor | null => fakeEditors.find((e) => e.opts?.editable !== false) ?? null;
const resetEditors = () => {
  fakeEditors.length = 0;
  editorCache.main = null;
  editorCache.preview = null;
};

const makeDraft = (over: Record<string, unknown> = {}) => ({
  id: 'd1', draft_type: 'escrito', title: 'Borrador de contestación', status: 'completed',
  created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z',
  intelligence_snapshot_id: 's1', instruction: 'instr', content: '# Borrador\n\nContenido.',
  sources: [], model: 'm', revision: 1, content_format: 'markdown', ...over,
});

let fetchMock: ReturnType<typeof vi.fn>;
let chatRequests: { init: RequestInit }[];
// Respuesta del POST chat controlable por test: null = fallo 502; string = éxito
// ('' implies the plain content already; the panel receives composition via
// composeProposalMessage independent of this reply content).
let chatReply: { content: string } | null = { content: 'Texto de propuesta.' };
const chatPostResponse = (status = 200) =>
  new Response(JSON.stringify(
    status === 200 && chatReply
      ? {
          message: { id: `as-${chatRequests.length}`, role: 'assistant', content: chatReply.content, workspace_id: 'ws-a', conversation_id: 'conv', metadata: null },
          user_message: null,
          sources: [],
        }
      : { error: 'Servicio no disponible' }
  ), { status });

const chatPosts = (): { init: RequestInit }[] => chatRequests;

let client: QueryClient;
const mountApp = () =>
  render(
    <QueryClientProvider client={client}>
      <AICaseDrafts workspaceId="ws-a" />
    </QueryClientProvider>
  );

// Abre el editor con el borrador d1 y devuelve el editor falso.
const openDraftEditor = async () => {
  const app = mountApp();
  await screen.findByText('Borradores anteriores');
  fireEvent.click(await screen.findByRole('button', { name: /Borrador de contestación/ }));
  await screen.findByTestId('draft-toolbar');
  await waitFor(() => {
    const ed = mainEditor();
    if (!ed) throw new Error('editor no listo');
    return ed;
  });
  return app;
};

const openAgentPanel = async () => {
  fireEvent.click(screen.getByTestId('draft-agent-toggle'));
  await screen.findByTestId('draft-agent-panel');
};

const proposalInstruction = () =>
  document.getElementById('agent-proposal-instruction') as HTMLTextAreaElement;

beforeEach(() => {
  documentsData.list = [{ id: 'doc-a', status: 'ready', original_filename: 'demanda.pdf' }];
  resetEditors();
  chatRequests = [];
  chatReply = { content: 'Texto de propuesta.' };
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } });
  vi.stubGlobal('ResizeObserver', class { observe() { /** noop */ } disconnect() { /** noop */ } });
  fetchMock = vi.fn(async (url: string, opts?: RequestInit) => {
    const urlStr = String(url);
    if (urlStr.includes('/api/ai/usage')) {
      return { ok: true, json: async () => ({ allowance: { plan: 'pro_limited', drafting: { used: 12, limit: 30 } } }) } as Response;
    }
    if (opts?.method === 'PUT') {
      return { ok: true, json: async () => ({ draft: makeDraft({ revision: 2 }), version: { version_no: 2, origin: JSON.parse(String(opts.body)).origin } }) } as Response;
    }
    if (opts?.method === 'POST' && urlStr.includes('/chat')) {
      const req = { init: opts };
      chatRequests.push(req);
      return chatPostResponse(chatReply ? 200 : 502);
    }
    if (urlStr.includes('/drafts/d1/versions')) {
      return { ok: true, json: async () => ({ versions: [{ version_no: 1, origin: 'generation', content_format: 'markdown', model: 'm', title: 'v1', created_at: '2026-10-01T10:00:00Z' }], total: 1 }) } as Response;
    }
    if (urlStr.includes('/drafts/d1')) {
      return { ok: true, json: async () => ({ draft: makeDraft() }) } as Response;
    }
    if (urlStr.includes('/drafts')) {
      return { ok: true, json: async () => ({ drafts: [makeDraft()] }) } as Response;
    }
    if (urlStr.includes('/chat')) {
      return { ok: true, json: async () => ({ conversation: { id: 'conv' }, messages: [] }) } as Response;
    }
    throw new Error(`fetch no cubierto: ${urlStr}`);
  });
  vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);
});

afterEach(() => {
  cleanup();
  client?.clear();
  vi.unstubAllGlobals();
});

const sendProposal = async (instruction: string, attach: boolean) => {
  await openDraftEditor();
  await openAgentPanel();
  // Por defecto la pestaña activa es «Proponer cambios».
  fireEvent.change(proposalInstruction(), { target: { value: instruction } });
  if (attach) {
    fireEvent.click(screen.getByTestId('agent-attach-draft'));
  }
  fireEvent.click(screen.getByTestId('agent-proposal-send'));
};

describe('UA-3 Agent AI — integración en el editor', () => {
  it('el toggle muestra/oculta el panel Agent AI dentro del panel del editor, sin tocar el zoom ni la toolbar', async () => {
    await openDraftEditor();
    expect(screen.queryByTestId('draft-agent-panel')).not.toBeInTheDocument();
    expect(screen.getByTestId('draft-agent-toggle')).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(screen.getByTestId('draft-agent-toggle'));
    await screen.findByTestId('draft-agent-panel');
    expect(screen.getByTestId('draft-agent-toggle')).toHaveAttribute('aria-expanded', 'true');
    // El panel vive FUERA del lienzo escalado.
    const zoom = screen.getByTestId('draft-zoom-content');
    expect(zoom.querySelector('[data-testid="draft-agent-panel"]')).toBeNull();
    expect(screen.getByTestId('draft-toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('draft-zoom-content')).toHaveStyle({ transform: 'scale(1)' });
    fireEvent.click(screen.getByTestId('draft-agent-toggle'));
    await waitFor(() => expect(screen.queryByTestId('draft-agent-panel')).not.toBeInTheDocument());
  });

  it('envía la instrucción SIN contexto del borrador cuando el adjunto está desactivado', async () => {
    await sendProposal('Redacta un párrafo sobre la falta de requerimiento', false);
    await waitFor(() => expect(chatPosts()).toHaveLength(1));
    const body = JSON.parse(String(chatPosts()[0].init.body)) as { message: string; conversation_id: string };
    expect(body.conversation_id).toBe('conv');
    expect(body.message).toContain('falta de requerimiento');
    expect(body.message).not.toContain('Copia del borrador abierto');
    expect(body.message).not.toContain('Contenido');
  });

  it('envía con contexto una COPIA en texto plano del borrador (sin HTML ni etiquetas)', async () => {
    await sendProposal('Redacta un párrafo sobre la falta de requerimiento', true);
    await waitFor(() => expect(chatPosts()).toHaveLength(1));
    const body = JSON.parse(String(chatPosts()[0].init.body)) as { message: string };
    expect(body.message).toContain('falta de requerimiento');
    expect(body.message).toContain('Copia del borrador abierto');
    expect(body.message).toContain('Contenido');
    expect(body.message).not.toContain('<h1>');
    expect(body.message).not.toContain('<p>');
  });

  it('no envía nada si el usuario pide contexto y el contenido del editor no se puede leer', async () => {
    await openDraftEditor();
    await openAgentPanel();
    const ed = mainEditor();
    if (ed) ed.isDestroyed = true;
    fireEvent.click(screen.getByTestId('agent-attach-draft'));
    fireEvent.change(proposalInstruction(), { target: { value: 'instrucción con contexto' } });
    fireEvent.click(screen.getByTestId('agent-proposal-send'));
    await waitFor(() => expect(screen.getByTestId('agent-proposal-error')).toBeInTheDocument());
    expect(chatPosts()).toHaveLength(0);
    // El editor queda restaurado para el siguiente intento.
    if (ed) ed.isDestroyed = false;
  });

  it('los errores del servidor muestran el panel de reintento y NO duplican el envío con doble clic', async () => {
    chatReply = null; // el POST de chat responde 502
    await sendProposal('instrucción con doble clic', false);
    fireEvent.click(screen.getByTestId('agent-proposal-send')); // doble clic: sigue pendiente/deshabilitado
    await waitFor(() => expect(chatPosts()).toHaveLength(1));
    await waitFor(() => expect(screen.getByTestId('agent-proposal-error')).toBeInTheDocument());
    // Retry: reenvía el mismo mensaje exacto por la misma identidad,
    // y mientras hay una operación activa nunca hay segunda petición.
    const sendBtn = screen
      .getAllByRole('button')
      .find((b) => b.textContent?.includes('Enviar')) as HTMLButtonElement;
    expect(sendBtn).toBeDisabled();
    fireEvent.click(screen.getByTestId('agent-proposal-retry'));
    await waitFor(() => expect(chatPosts()).toHaveLength(2));
  });

  it('Aceptar e insertar ingresa la propuesta por el pipeline normal de guardado sin borrar el contenido existente', async () => {
    chatReply = { content: 'Texto insertado.' };

    await sendProposal('redacta un párrafo', false);
    await waitFor(() => expect(screen.getByTestId('agent-proposal-card')).toBeInTheDocument());
    expect(screen.getByTestId('agent-proposal-text')).toHaveTextContent('Texto insertado.');

    await act(async () => fireEvent.click(screen.getByTestId('agent-proposal-accept')));

    // El editor NO fue reemplazado: el contenido previo sigue y la propuesta se agregó.
    const ed = mainEditor();
    expect(ed?.cmdLog.some((c) => c.startsWith('insertContent('))).toBe(true);
    expect(ed?.html).toContain('<h1>Borrador</h1>');
    expect(ed?.html).toContain('Contenido.');
    expect(ed?.html).toContain('Texto insertado.');

    // El pipeline habitual: onUpdate → debounce → PUT autosave con html.
    await waitFor(
      () => {
        const puts = (fetchMock.mock.calls as unknown[][]).filter(
          (c) => (c[1] as RequestInit)?.method === 'PUT'
        );
        if (puts.length === 0) throw new Error('sin PUT aún');
      },
      { timeout: 3000 }
    );
    const put = (fetchMock.mock.calls as unknown[][]).find((c) => (c[1] as RequestInit)?.method === 'PUT') as unknown[];
    const putBody = JSON.parse(String((put[1] as RequestInit).body)) as Record<string, unknown>;
    expect(putBody.origin).toBe('autosave');
    expect(putBody.content_format).toBe('html');
    expect(String(putBody.content)).toContain('Texto insertado.');
    expect(String(putBody.content)).toContain('Contenido.');

    // Feedback visible y propuesta limpia.
    await screen.findByTestId('agent-notice');
    expect(screen.queryByTestId('agent-proposal-card')).not.toBeInTheDocument();
  });

  it('Descartar y Copiar texto no modifican el documento ni persisten nada', async () => {
    chatReply = { content: 'Texto de propuesta alternativa.' };

    await sendProposal('redacta otro', false);
    await waitFor(() => expect(screen.getByTestId('agent-proposal-card')).toBeInTheDocument());

    // Copiar texto: no consume ninguna mutación de guardado.
    const writeText = vi.fn().mockResolvedValue(undefined);
    const originalClipboard = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(navigator),
      'clipboard'
    );
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    try {
      fireEvent.click(screen.getByTestId('agent-proposal-copy'));
      await waitFor(() => expect(writeText).toHaveBeenCalledWith('Texto de propuesta alternativa.'));
      const main = mainEditor();
      expect(main?.html).not.toContain('Texto de propuesta alternativa.');
    } finally {
      if (originalClipboard) {
        Object.defineProperty(Object.getPrototypeOf(navigator), 'clipboard', originalClipboard);
      } else {
        delete (navigator as unknown as { clipboard?: unknown }).clipboard;
      }
    }

    // Descartar: la propuesta desaparece y no hay PUT por ese contenido.
    fireEvent.click(screen.getByTestId('agent-proposal-discard'));
    await waitFor(() => expect(screen.queryByTestId('agent-proposal-card')).not.toBeInTheDocument());
    const puts = (fetchMock.mock.calls as unknown[][]).filter((c) => (c[1] as RequestInit)?.method === 'PUT');
    expect(puts.length === 0 || !String(JSON.parse(String((puts[0][1] as RequestInit).body)).content).includes('Texto de propuesta alternativa.')).toBe(true);
  });

  it('la pestaña de chat integra el chat del caso reutilizado con los documentos del workspace', async () => {
    await openDraftEditor();
    await openAgentPanel();
    fireEvent.click(screen.getByTestId('agent-tab-chat'));
    const embed = await screen.findByTestId('agent-chat-embed');
    expect(embed.dataset.workspace).toBe('ws-a');
    expect(JSON.parse(embed.dataset.documents ?? '[]')).toEqual(documentsData.list);
  });
});
