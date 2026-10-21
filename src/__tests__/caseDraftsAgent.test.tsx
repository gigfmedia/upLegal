import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AICaseDrafts } from '@/components/legalup-ai/AICaseDrafts';

// UA-3 — Composer Agent AI del editor de borradores (patrón Tiptap Agent
// Editor): kit contextual con acciones reales (adjuntar copia del borrador,
// citar selección del editor, chat del caso), propuestas de texto con
// aceptar/descartar/copiar e inserción en cursor por el pipeline normal de
// guardado, sin duplicaciones, y sin tocar el zoom ni la disposición de la hoja.

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
  state?: { selection?: { from: number; to: number; empty: boolean }; doc?: { textBetween?: (a: number, b: number, bs?: string) => string } };
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
// plugin de latencia: si está definido, el POST chat espera a que el test resuelva
let chatDelay: Promise<void> | null = null;
let chatRepliesServed = 0;
const chatPostResponse = (status = 200) => {
  chatRepliesServed += 1;
  return new Response(JSON.stringify(
    status === 200 && chatReply
      ? {
          message: { id: `as-${chatRequests.length}`, role: 'assistant', content: chatReply.content, workspace_id: 'ws-a', conversation_id: 'conv', metadata: null },
          user_message: null,
          sources: [],
        }
      : { error: 'Servicio no disponible' }
  ), { status });
};

const chatPosts = (): { init: RequestInit }[] => chatRequests;

const makeD2 = () => makeDraft({ id: 'd2', instruction: 'planeacion', title: 'Borrador de planteamiento del caso' });

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

// El composer no depende de ningún toggle: al abrir un borrador ya está ahí.
const openAgentPanel = async () => {
  await screen.findByTestId('draft-agent-panel');
};

const proposalInstruction = () =>
  document.getElementById('agent-proposal-instruction') as HTMLTextAreaElement;

beforeEach(() => {
  documentsData.list = [{ id: 'doc-a', status: 'ready', original_filename: 'demanda.pdf' }];
  resetEditors();
  chatRequests = [];
  chatReply = { content: 'Texto de propuesta.' };
  chatDelay = null;
  chatRepliesServed = 0;
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
      if (chatDelay) await chatDelay;
      return chatPostResponse(chatReply ? 200 : 502);
    }
    if (urlStr.includes('/drafts/d2/versions')) {
      return { ok: true, json: async () => ({ versions: [], total: 0 }) } as Response;
    }
    if (urlStr.includes('/drafts/d2')) {
      return { ok: true, json: async () => ({ draft: makeD2() }) } as Response;
    }
    if (urlStr.includes('/drafts/d1/versions')) {
      return { ok: true, json: async () => ({ versions: [{ version_no: 1, origin: 'generation', content_format: 'markdown', model: 'm', title: 'v1', created_at: '2026-10-01T10:00:00Z' }], total: 1 }) } as Response;
    }
    if (urlStr.includes('/drafts/d1')) {
      return { ok: true, json: async () => ({ draft: makeDraft() }) } as Response;
    }
    if (urlStr.includes('/drafts')) {
      return { ok: true, json: async () => ({ drafts: [makeDraft(), makeD2()] }) } as Response;
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
  // El composer llega en modo «proponer cambios» (es su único canal).
  fireEvent.change(proposalInstruction(), { target: { value: instruction } });
  if (attach) {
    fireEvent.click(screen.getByTestId('agent-attach-draft'));
  }
  fireEvent.click(screen.getByTestId('agent-proposal-send'));
};

describe('UA-3 Agent AI — integración en el editor', () => {
  it('el composer está siempre visible al abrir un borrador, dentro de la hoja y sin botón extra', async () => {
    await openDraftEditor();
    // Ni toggle ni clic previo: el input ya está disponible (plegado).
    expect(screen.queryByTestId('draft-agent-toggle')).not.toBeInTheDocument();
    const panel = screen.getByTestId('draft-agent-panel');
    expect(proposalInstruction()).toBeInTheDocument();
    // Pertenece al flujo de la hoja: vive dentro de draft-zoom-content y de la
    // propia hoja. Se desplaza dentro de ella (sticky simulado con geometría
    // real) para seguir disponible al escribir, sin pegarse al viewport y sin
    // `fixed`; al final de la página vuelve a su lugar natural.
    const zoom = screen.getByTestId('draft-zoom-content');
    const sheet = screen.getByTestId('draft-sheet');
    expect(sheet.contains(panel)).toBe(true);
    expect(zoom.contains(panel)).toBe(true);
    expect(panel.className).toContain('relative');
    expect(panel.className).not.toContain('fixed');
    expect(panel.className).not.toContain('sticky');
    expect(panel.style.transformOrigin).toBe('bottom center');
    expect(screen.getByTestId('draft-toolbar')).toBeInTheDocument();
    expect(zoom).toHaveStyle({ transform: 'scale(1)' });
  });

  it('el zoom escala solo la hoja: el composer no crece ni encoge', async () => {
    await openDraftEditor();
    await openAgentPanel();
    const panel = screen.getByTestId('draft-agent-panel');
    const plus = () => screen.getByLabelText('Aumentar zoom');
    for (let i = 0; i < 5; i++) fireEvent.click(plus());
    const zoom = screen.getByTestId('draft-zoom-content');
    expect(zoom).toHaveStyle({ transform: 'scale(1.5)' });
    // Contra-escala exacta: neutraliza la escala del ancestro de zoom.
    expect(panel.style.transform).toBe(`scale(${1 / 1.5})`);
    expect(panel.style.transformOrigin).toBe('bottom center');
    // Regreso al 100 % vuelve a la neutralidad exacta.
    const minus = () => screen.getByLabelText('Reducir zoom');
    for (let i = 0; i < 5; i++) fireEvent.click(minus());
    expect(panel.style.transform).toBe('scale(1)');
  });

  it('al enfocar el input se expande y abre el menú de ejemplos; al tipear el menú se cierra sin descartar el texto', async () => {
    await openDraftEditor();
    await openAgentPanel();
    const ta = proposalInstruction();
    fireEvent.focus(ta);
    expect(await screen.findByTestId('agent-toolkit')).toBeInTheDocument();
    // Las cuatro acciones del toolkit son reales y están listadas.
    expect(screen.getByTestId('agent-toolkit-proofread-selection')).toHaveTextContent('Revisar la selección');
    expect(screen.getByTestId('agent-toolkit-rewrite-selection')).toHaveTextContent('Reescribir la selección');
    expect(screen.getByTestId('agent-toolkit-shorten-selection')).toHaveTextContent('Acortar la selección');
    expect(screen.getByTestId('agent-toolkit-new-paragraph')).toHaveTextContent('Escribir un párrafo nuevo');
    // Tipear cierra el menú y conserva todo lo escrito.
    fireEvent.change(ta, { target: { value: 'texto del usuario' } });
    expect(screen.queryByTestId('agent-toolkit')).not.toBeInTheDocument();
    expect(ta.value).toBe('texto del usuario');
  });

  it('acción del toolkit con selección: envía instrucción real + cita, cierra el menú y la propuesta queda revisable', async () => {
    await openDraftEditor();
    await openAgentPanel();
    const ed = mainEditor();
    if (ed) {
      ed.state = { selection: { from: 0, to: 10, empty: false }, doc: { textBetween: () => 'Se notificó al demandado el 3 de enero' } };
    }
    const ta = proposalInstruction();
    fireEvent.focus(ta);
    const row = await screen.findByTestId('agent-toolkit-proofread-selection');
    await waitFor(() => expect(row).toBeEnabled()); // la conversación del caso ya está lista
    fireEvent.click(row);
    await waitFor(() => expect(chatPosts()).toHaveLength(1));
    const body = JSON.parse(String(chatPosts()[0].init.body)) as { message: string };
    expect(body.message).toContain('Revisa la ortografía y gramática');
    expect(body.message).toContain('Selección citada del borrador');
    expect(body.message).toContain('Se notificó al demandado el 3 de enero');
    expect(screen.queryByTestId('agent-toolkit')).not.toBeInTheDocument();
    // Revisable antes de insertar: el pipeline de propuesta no cambia.
    expect(await screen.findByTestId('agent-proposal-card')).toBeInTheDocument();
  });

  it('acción del toolkit sin selección activa explica qué falta y no envía nada', async () => {
    await openDraftEditor();
    await openAgentPanel();
    const ta = proposalInstruction();
    fireEvent.focus(ta);
    const row = await screen.findByTestId('agent-toolkit-shorten-selection');
    await waitFor(() => expect(row).toBeEnabled());
    fireEvent.click(row);
    expect(screen.getByTestId('agent-selection-hint')).toHaveTextContent('Selecciona el texto en el editor para «Acortar la selección».');
    expect(chatPosts()).toHaveLength(0);
  });

  it('«Escribir un párrafo nuevo» adjunta la copia real del borrador como contexto y queda revisable', async () => {
    await openDraftEditor();
    await openAgentPanel();
    const ta = proposalInstruction();
    fireEvent.focus(ta);
    const row = await screen.findByTestId('agent-toolkit-new-paragraph');
    await waitFor(() => expect(row).toBeEnabled());
    fireEvent.click(row);
    await waitFor(() => expect(chatPosts()).toHaveLength(1));
    const body = JSON.parse(String(chatPosts()[0].init.body)) as { message: string };
    expect(body.message).toContain('Redacta un párrafo nuevo');
    expect(body.message).toContain('Copia del borrador abierto');
    expect(body.message).toContain('Contenido');
    expect(body.message).not.toContain('<p>');
    expect(await screen.findByTestId('agent-proposal-card')).toBeInTheDocument();
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

  it('al cambiar de borrador el contexto adjunto NO reutiliza el anterior y usa el borrador abierto', async () => {
    await openDraftEditor();
    await openAgentPanel();
    // d1: el usuario activa el adjunto pero todavía no envía.
    fireEvent.click(screen.getByTestId('agent-attach-draft'));
    expect(screen.getByTestId('agent-attach-draft')).toHaveAttribute('aria-pressed', 'true');

    // Cambio de borrador: el adjunto se resetea (nunca hereda estado).
    fireEvent.click(await screen.findByRole('button', { name: /Borrador de planteamiento/ }));
    await screen.findByTestId('draft-toolbar');
    await screen.findByTestId('draft-agent-panel');
    expect(screen.getByTestId('agent-attach-draft')).toHaveAttribute('aria-pressed', 'false');

    // Envío sin volver a activar: mensaje sin contexto (nada de d1).
    fireEvent.change(proposalInstruction(), { target: { value: 'instrucción para d2' } });
    fireEvent.click(screen.getByTestId('agent-proposal-send'));
    await waitFor(() => expect(chatPosts()).toHaveLength(1));
    const first = JSON.parse(String(chatPosts()[0].init.body)) as { message: string };
    expect(first.message).not.toContain('Copia del borrador abierto');
    await screen.findByTestId('agent-proposal-card');

    // Activado en d2: el contexto es el del borrador AHORA abierto.
    fireEvent.click(screen.getByTestId('agent-attach-draft'));
    fireEvent.change(proposalInstruction(), { target: { value: 'instrucción con contexto de d2' } });
    fireEvent.click(screen.getByTestId('agent-proposal-send'));
    await waitFor(() => expect(chatPosts()).toHaveLength(2));
    const second = JSON.parse(String(chatPosts()[1].init.body)) as { message: string };
    expect(second.message).toContain('Copia del borrador abierto');
    expect(second.message).toContain('Borrador de planteamiento del caso');
    expect(second.message).not.toContain('Borrador de contestación');
  });

  it('los iconos quedan centrados y el estado activo usa green-300 (sin morado)', async () => {
    await openDraftEditor();
    await openAgentPanel();
    const row = screen.getByTestId('agent-input-row');
    expect(row.className).toContain('items-center');
    expect(row.className).not.toContain('items-end');
    const sparkles = row.querySelector('svg');
    expect(sparkles?.getAttribute('class') ?? '').not.toContain('mt-1.5');

    // Reposo: borde neutro, sin acentos morados en el composer.
    const card = screen.getByTestId('agent-composer-card');
    expect(card.className).toContain('border-input');
    expect(card.className).not.toContain('rgb(98,41,255)');

    // Activo: foco del input → borde green-300; adjunto pressed → green-300.
    fireEvent.focus(proposalInstruction());
    expect(screen.getByTestId('agent-composer-card').className).toContain('border-green-300');
    fireEvent.change(proposalInstruction(), { target: { value: 'hola' } });
    const send = screen.getByTestId('agent-proposal-send');
    expect(send.className).toContain('bg-green-300');
    expect(send.className).not.toContain('rgb(98,41,255)');
    fireEvent.click(screen.getByTestId('agent-attach-draft'));
    const attach = screen.getByTestId('agent-attach-draft');
    expect(attach.className).toContain('border-green-300');
    expect(attach.className).toContain('bg-green-300');
    expect(document.body.innerHTML).not.toContain('rgb(98,41,255)');
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

  it('el botón de chat del composer abre el chat del caso reutilizado con los documentos del workspace', async () => {
    await openDraftEditor();
    await openAgentPanel();
    fireEvent.click(screen.getByTestId('agent-chat-toggle'));
    const embed = await screen.findByTestId('agent-chat-embed');
    expect(embed.dataset.workspace).toBe('ws-a');
    expect(JSON.parse(embed.dataset.documents ?? '[]')).toEqual(documentsData.list);
    // El over del chat se cierra explícitamente.
    fireEvent.click(screen.getByTestId('agent-chat-close'));
    await waitFor(() => expect(screen.queryByTestId('agent-chat-embed')).not.toBeInTheDocument());
  });

  it('«Usar selección» cita la selección real del editor en la instrucción y viaja en el mensaje', async () => {
    await openDraftEditor();
    await openAgentPanel();
    const ed = mainEditor();
    if (ed) {
      ed.state = { selection: { from: 0, to: 5, empty: false }, doc: { textBetween: () => 'El demandado no fue notificado' } };
    }
    fireEvent.click(screen.getByTestId('agent-use-selection'));
    const textarea = proposalInstruction();
    expect(textarea.value).toContain('Selección citada del borrador');
    expect(textarea.value).toContain('El demandado no fue notificado');
    fireEvent.change(textarea, { target: { value: `${textarea.value}\n\nReescribe este pasaje` } });
    fireEvent.click(screen.getByTestId('agent-proposal-send'));
    await waitFor(() => expect(chatPosts()).toHaveLength(1));
    const body = JSON.parse(String(chatPosts()[0].init.body)) as { message: string };
    expect(body.message).toContain('Selección citada del borrador');
    expect(body.message).toContain('El demandado no fue notificado');
    expect(body.message).toContain('Reescribe este pasaje');
  });

  it('«Usar selección» sin selección activa da feedback honesto y no cita texto inexistente', async () => {
    await openDraftEditor();
    await openAgentPanel();
    fireEvent.click(screen.getByTestId('agent-use-selection'));
    expect(screen.getByTestId('agent-selection-hint')).toHaveTextContent('No hay texto seleccionado en el editor.');
    expect(proposalInstruction().value).toBe('');
  });

  it('una respuesta tardía del borrador anterior no se muestra ni se puede insertar en otro borrador', async () => {
    await openDraftEditor();
    await openAgentPanel();

    // Envío en curso con respuesta diferida, asociado al borrador d1.
    let releaseChat: (() => void) | null = null;
    const gate = new Promise<void>((resolve) => { releaseChat = resolve; });
    chatDelay = gate;
    fireEvent.change(proposalInstruction(), { target: { value: 'propuesta transitoria' } });
    fireEvent.click(screen.getByTestId('agent-attach-draft'));
    fireEvent.click(screen.getByTestId('agent-proposal-send'));
    await waitFor(() => expect(chatPosts()).toHaveLength(1));

    // El usuario cambia de borrador mientras la respuesta sigue en vuelo.
    fireEvent.click(await screen.findByRole('button', { name: /Borrador de planteamiento/ }));
    await screen.findByTestId('draft-toolbar');
    expect(mainEditor()!.html).toContain('Contenido.');

    // La respuesta tardía llega CUANDO el borrador abierto ya es d2.
    releaseChat?.();
    await waitFor(() => expect(chatRepliesServed).toBe(1)); // la respuesta SÍ se resolvió
    await new Promise((r) => setTimeout(r, 100)); // margen para setProposal si no hubiera guard

    // Guard: propuesta de d1 no aparece, no hay error, no hay insert, d2 intacto.
    expect(screen.queryByTestId('agent-proposal-card')).not.toBeInTheDocument();
    expect(screen.queryByTestId('agent-proposal-error')).not.toBeInTheDocument();
    expect(mainEditor()!.cmdLog.some((c) => c.startsWith('insertContent('))).toBe(false);
    expect(mainEditor()!.html).toContain('Contenido.');
    expect(mainEditor()!.html).not.toContain('Texto de propuesta.');

    // El envío siguiente en el borrador d2 funciona con normalidad (ni el
    // guard ni el aborto rompen la operación nueva).
    chatDelay = null;
    fireEvent.change(proposalInstruction(), { target: { value: 'propuesta para d2' } });
    fireEvent.click(screen.getByTestId('agent-proposal-send'));
    const card = await screen.findByTestId('agent-proposal-card');
    expect(card).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('agent-proposal-accept'));
    const ed = mainEditor()!;
    expect(ed.html).toContain('Texto de propuesta.');
    expect((ed.html.match(/Texto de propuesta\./g) ?? []).length).toBe(1);
    // El reintento quedó asociado al mensaje nuevo (no al de d1): el error de
    // d1 nunca reaparece como botón Reintentar.
    expect(screen.queryByTestId('agent-proposal-retry')).not.toBeInTheDocument();
  });

  it('doble clic en Aceptar e insertar no produce inserciones duplicadas', async () => {
    await openDraftEditor();
    await openAgentPanel();
    fireEvent.change(proposalInstruction(), { target: { value: 'propuesta única' } });
    fireEvent.click(screen.getByTestId('agent-proposal-send'));
    await waitFor(() => expect(screen.getByTestId('agent-proposal-card')).toBeInTheDocument());

    // Doble clic contra el mismo render (mismo tick): el guard evita dos
    // insertContent con la propuesta duplicada.
    await act(async () => {
      fireEvent.click(screen.getByTestId('agent-proposal-accept'));
      fireEvent.click(screen.getByTestId('agent-proposal-accept'));
    });

    const ed = mainEditor()!;
    expect(ed.cmdLog.filter((c) => c.startsWith('insertContent('))).toHaveLength(1);
    expect((ed.html.match(/Texto de propuesta\./g) ?? []).length).toBe(1);
    await screen.findByTestId('agent-notice');
  });

  it('el contexto adjunto se trunca con nota honesta al superar el límite', async () => {
    const giantContent = `# Borrador\n\nContenido.\n\n${'A'.repeat(25000)}`;
    const giant = makeDraft({ content: giantContent });
    // Overridden impl incluida d2 para no romper el routing de la lista.
    fetchMock.mockImplementation(async (url: string, opts?: RequestInit) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/ai/usage')) {
        return { ok: true, json: async () => ({ allowance: { plan: 'pro_limited', drafting: { used: 12, limit: 30 } } }) } as Response;
      }
      if (opts?.method === 'PUT') {
        return { ok: true, json: async () => ({ draft: { ...giant, revision: 2 } }) } as Response;
      }
      if (opts?.method === 'POST' && urlStr.includes('/chat')) {
        chatRequests.push({ init: opts });
        return chatPostResponse(chatReply ? 200 : 502);
      }
      if (urlStr.includes('/drafts/d2/versions')) {
        return { ok: true, json: async () => ({ versions: [], total: 0 }) } as Response;
      }
      if (urlStr.includes('/drafts/d2')) {
        return { ok: true, json: async () => ({ draft: makeD2() }) } as Response;
      }
      if (urlStr.includes('/drafts/d1/versions')) {
        return { ok: true, json: async () => ({ versions: [], total: 0 }) } as Response;
      }
      if (urlStr.includes('/drafts/d1')) {
        return { ok: true, json: async () => ({ draft: giant }) } as Response;
      }
      if (urlStr.includes('/drafts')) {
        return { ok: true, json: async () => ({ drafts: [giant, makeD2()] }) } as Response;
      }
      if (urlStr.includes('/chat')) {
        return { ok: true, json: async () => ({ conversation: { id: 'conv' }, messages: [] }) } as Response;
      }
      throw new Error(`fetch no cubierto: ${urlStr}`);
    });

    await openDraftEditor();
    await openAgentPanel();
    fireEvent.change(proposalInstruction(), { target: { value: 'algo' } });
    fireEvent.click(screen.getByTestId('agent-attach-draft'));
    fireEvent.click(screen.getByTestId('agent-proposal-send'));

    await waitFor(() => expect(chatPosts()).toHaveLength(1));
    const body = JSON.parse(String(chatPosts()[0].init.body)) as { message: string };
    expect(body.message).toContain('se truncó por longitud');
    expect(body.message).toContain('se adjuntaron los primeros 20000 caracteres de');
    expect(body.message.includes('A'.repeat(20001))).toBe(false);
    expect(body.message.length).toBeLessThanOrEqual('algo'.length + 20000 + 400);
    // La propuesta sigue operando con normalidad.
    await waitFor(() => expect(screen.getByTestId('agent-proposal-card')).toBeInTheDocument());
  });
});
