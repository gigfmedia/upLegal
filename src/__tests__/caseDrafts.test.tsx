import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, act, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { AICaseDrafts } from '@/components/legalup-ai/AICaseDrafts';

// FASE 4.59D + 4.62C — Draft/document workspace UI: lista, creación validada,
// editor rich (TipTap) con autosave, OCC (409) y versiones.

// FASE 4.62D.31 — estado de sesión controlable para probar el flush de
// beforeunload (rotación de token por GoTrue, cierre de sesión, red caída).
const authState = vi.hoisted(() => {
  type Listener = (event: string, session: { access_token?: string } | null) => void;
  const listeners = new Set<Listener>();
  const currentToken = { value: 'tok' };
  return {
    listeners,
    currentToken,
    emit: (event: string, token: string | null) => {
      for (const cb of Array.from(listeners)) cb(event, token === null ? null : { access_token: token });
    },
    reset: () => {
      listeners.clear();
      currentToken.value = 'tok';
    },
  };
});

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: { access_token: authState.currentToken.value, user: { id: 'u' } } } }),
      onAuthStateChange: (cb: (event: string, session: { access_token?: string } | null) => void) => {
        authState.listeners.add(cb);
        return { data: { subscription: { unsubscribe: () => authState.listeners.delete(cb) } } };
      },
    },
  },
}));

vi.mock('@/lib/aiOperationIdentity', () => ({
  aiOperationIdentity: async () => ({ id: 'op-1', complete: () => {} }),
}));

vi.mock('@/lib/aiInProgressPoll', () => ({
  pollTerminalResult: async (fn: () => Promise<{ res: Response; body: unknown }>) => fn(),
}));

// Mock de TipTap (SOLO en tests; producción nunca usa dangerouslySetInnerHTML
// aquí). Registra los editores creados para disparar onUpdate desde los tests.
type FakeEditor = {
  isDestroyed: boolean;
  opts: { content?: string; editable?: boolean; onUpdate?: (e: { editor: unknown }) => void };
  html: string;
  cmdLog: string[];
  canFlags: { undo: boolean; redo: boolean };
  // FASE UA-2 (corrección): historial simulado para verificar que
  // undo/redo restauran contenido, no solo habilitan botones.
  undoStack: string[];
  redoStack: string[];
  getHTML: () => string;
  isActive: (name: string | Record<string, unknown>, attrs?: Record<string, unknown>) => boolean;
  chain: () => Record<string, (...args: unknown[]) => unknown>;
  can: () => { undo: () => boolean; redo: () => boolean };
  commands: { setContent: (html: string, opts?: { emitUpdate?: boolean }) => void };
};
const fakeEditors: FakeEditor[] = [];
// TipTap real memoiza la instancia por componente; el mock replica esa
// identidad con caché por marcador (editor principal vs preview read-only).
const editorCache: { main: FakeEditor | null; preview: FakeEditor | null } = { main: null, preview: null };
vi.mock('@tiptap/react', () => ({
  useEditor: (options: FakeEditor['opts']) => {
    const key = options?.editable === false ? 'preview' : 'main';
    const ed = editorCache[key] as FakeEditor | null;
    if (ed) {
      ed.opts = options ?? ed.opts;
      return ed;
    }
    // Necesario para isActive() del mock. Los valores no booleanos
    // (headingLevel, textAlign) replican atributos reales del schema.
    const state: Record<string, boolean | number | string | undefined> = {};
    const created: FakeEditor = {
      isDestroyed: false,
      opts: options ?? {},
      // FASE UA-2: registro de comandos de cadena para aserciones fieles
      // (comando + argumentos encodeURIComponent no — JSON directo).
      cmdLog: [],
      canFlags: { undo: false, redo: false },
      undoStack: [],
      redoStack: [],
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
        // Toggle fiel: marca no activa → activa; activa → desactiva (como
        // el editor real). El nombre grabado es el comando de cadena.
        const toggle = (cmdName: string, key: string): ChainFn => () => {
          state[key] = state[key] === true ? undefined : true;
          return rec(cmdName);
        };
        ret.focus = ret; ret.run = ret;
        ret.toggleBold = toggle('toggleBold', 'bold'); ret.toggleItalic = toggle('toggleItalic', 'italic');
        ret.toggleUnderline = toggle('toggleUnderline', 'underline'); ret.toggleStrike = toggle('toggleStrike', 'strike');
        ret.toggleBulletList = toggle('toggleBulletList', 'bulletList'); ret.toggleOrderedList = toggle('toggleOrderedList', 'orderedList');
        ret.toggleHeading = (...args: unknown[]) => {
          state.heading = true;
          state.headingLevel = args[0] && typeof args[0] === 'object' ? (args[0] as { level: number }).level : state.headingLevel;
          return rec('toggleHeading', args);
        };
        ret.setHeading = (...args: unknown[]) => {
          state.heading = true;
          state.headingLevel = args[0] && typeof args[0] === 'object' ? (args[0] as { level: number }).level : state.headingLevel;
          return rec('setHeading', args);
        };
        ret.setParagraph = (..._args: unknown[]) => {
          state.heading = false;
          state.headingLevel = undefined;
          state.paragraph = true;
          return rec('setParagraph');
        };
        ret.setTextAlign = (...args: unknown[]) => {
          state.textAlign = String(args[0]);
          return rec('setTextAlign', args);
        };
        // FASE UA-2 (corrección): undo/redo restauran contenido como el
        // editor real — el html cambia según el historial simulado.
        ret.undo = () => {
          if (created.undoStack.length > 0) {
            created.redoStack.push(created.html);
            created.html = created.undoStack.pop() as string;
          }
          return rec('undo');
        };
        ret.redo = () => {
          if (created.redoStack.length > 0) {
            created.undoStack.push(created.html);
            created.html = created.redoStack.pop() as string;
          }
          return rec('redo');
        };
        ret.unsetAllMarks = () => rec('unsetAllMarks');
        ret.clearNodes = () => rec('clearNodes');
        return ret;
      },
      can: () => ({
        undo: () => created.canFlags.undo,
        redo: () => created.canFlags.redo,
      }),
      commands: {
        setContent(html: string, opts?: { emitUpdate?: boolean }) {
          // Emit update = edición del usuario → entra al historial de undo;
          // emitUpdate false = carga programática (apertura/restauración) →
          // reinicia el historial, como el editor real.
          if (opts?.emitUpdate === false) {
            created.undoStack = [];
            created.redoStack = [];
          } else if (created.html !== html) {
            created.undoStack.push(created.html);
            created.redoStack = [];
          }
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

const mainEditor = () => fakeEditors.find((e) => e.opts?.editable !== false && fakeEditors.includes(e)) ?? null;
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
const DRAFT = makeDraft();

let fetchMock: ReturnType<typeof vi.fn>;
let usageAllowance: unknown = { plan: 'pro_limited', drafting: { used: 12, limit: 30 } };
let versionsPayload: unknown[] = [];
// FASE 4.62E: página(s) anteriores del historial (solo con ?before=) y total.
let olderVersionsPayload: unknown[] = [];
let versionsTotalPayload: number | null = null;
let olderVersionsFailure = false;
let versionDetail: unknown = null;
let putFailure: { status: number; body: Record<string, unknown> } | null = null;
// FASE UA-2: reemplaza el DRAFT servido por lista y detalle (compatibilidad
// con contenido que activa marcas nuevas).
let draftPayloadOverride: unknown = null;
// FASE 4.62D: retiene PUTs en vuelo para congelar el estado 'saving' de forma determinista.
let holdPutGate: Promise<void> | null = null;
let headGate: Promise<void> | null = null;
// FASE 4.62D.6: cola de revisiones "tardías" que el mock devuelve para
// simular respuestas con revisiones más antiguas que la vigente (Caso 5).
let putStaleRevisions: number[] = [];

type ApiCall = [string, RequestInit];

const putCalls = (): ApiCall[] =>
  (fetchMock.mock.calls as unknown[][]).filter((c) => (c[1] as RequestInit)?.method === 'PUT') as ApiCall[];
const putBody = (call: ApiCall) => JSON.parse(String(call[1].body)) as Record<string, unknown>;

beforeEach(() => {
  usageAllowance = { plan: 'pro_limited', drafting: { used: 12, limit: 30 } };
  versionsPayload = [];
  olderVersionsPayload = [];
  versionsTotalPayload = null;
  olderVersionsFailure = false;
  versionDetail = null;
  draftPayloadOverride = null;
  putFailure = null;
  holdPutGate = null;
  headGate = null;
  putStaleRevisions = [];
  authState.reset();
  resetEditors();
  fetchMock = vi.fn(async (url: string, opts?: RequestInit) => {
    const urlStr = String(url);
    if (urlStr.includes('/api/ai/usage')) {
      return { ok: true, json: async () => ({ allowance: usageAllowance }) } as Response;
    }
    if (opts?.method === 'POST' && urlStr.includes('/restore')) {
      return { ok: true, json: async () => ({ draft: makeDraft({ revision: 3 }), version: { version_no: 4, origin: 'restore', restored_from: 1 } }) } as Response;
    }
    if (opts?.method === 'POST') {
      return { ok: true, json: async () => ({ draft: DRAFT, snapshot: { version: 1 } }) } as Response;
    }
    if (opts?.method === 'PUT') {
      if (holdPutGate) {
        const gate = holdPutGate;
        holdPutGate = null;
        await gate;
      }
      if (putFailure) {
        const fail = putFailure;
        return { ok: false, status: fail.status, json: async () => fail.body } as unknown as Response;
      }
      const body = JSON.parse(String(opts?.body ?? '{}')) as { content?: string; base_revision?: number };
      const legitRevision = (body.base_revision ?? 1) + 1;
      const revision = putStaleRevisions.length > 0 ? (putStaleRevisions.shift() as number) : legitRevision;
      return {
        ok: true,
        json: async () => ({ draft: makeDraft({ content: body.content ?? '', content_format: 'html', revision }) }),
      } as Response;
    }
    if (/\/drafts\/[^/]+\/versions(\?.*|$)/.test(urlStr)) {
      if (urlStr.includes('before=')) {
        if (olderVersionsFailure) return { ok: false, status: 503, json: async () => ({ error: 'No se pudo abrir el historial.' }) } as unknown as Response;
        return { ok: true, json: async () => ({ versions: olderVersionsPayload, total_count: versionsTotalPayload }) } as Response;
      }
      return { ok: true, json: async () => ({ versions: versionsPayload, total_count: versionsTotalPayload }) } as Response;
    }
    if (/\/drafts\/[^/]+\/versions\/\d+$/.test(urlStr)) {
      return { ok: true, json: async () => ({ version: versionDetail }) } as Response;
    }
    if (/\/drafts\/[^/]+$/.test(urlStr)) {
      if (headGate) {
        const headGateAt = headGate;
        headGate = null;
        await headGateAt;
      }
      return { ok: true, json: async () => ({ draft: draftPayloadOverride ?? DRAFT }) } as Response;
    }
    return { ok: true, json: async () => ({ drafts: [draftPayloadOverride ?? DRAFT] }) } as Response;
  });
  (globalThis as unknown as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function renderDrafts() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AICaseDrafts workspaceId="w1" />
    </QueryClientProvider>
  );
}

async function openFirstDraft() {
  fireEvent.click(await screen.findByText('Borrador de contestación'));
  await screen.findByText(/Contenido\./);
}

describe('FASE 4.59D.3 contenedor único Research-like', () => {
  it('título una vez, dentro del contenedor, con icono y sin duplicados', async () => {
    const { container } = renderDrafts();
    expect(screen.getAllByText('Redacción asistida')).toHaveLength(1);
    expect(container.querySelector('svg.lucide')).toBeTruthy();
    expect(await screen.findByText('Borrador de contestación')).toBeTruthy();
  });
});

describe('FASE 4.59D.2 workspace directo', () => {
  it('título canónico + formulario visible sin click intermedio', async () => {
    renderDrafts();
    expect(screen.getByText('Redacción asistida')).toBeTruthy();
    expect(screen.getByText('¿Qué necesitas preparar?')).toBeTruthy();
    expect(screen.getByText('Generar borrador')).toBeTruthy();
    expect(screen.queryByText('Crear borrador')).toBeNull();
    expect(await screen.findByText('Borrador de contestación')).toBeTruthy();
  });

  it('sin "Crear borrador": el formulario ya está expuesto', () => {
    renderDrafts();
    expect(screen.queryByText(/^Crear borrador$/)).toBeNull();
    expect(screen.getByPlaceholderText(/Ej: borrador/)).toBeTruthy();
  });

  it('crear exige instrucción ≥10 y genera', async () => {
    renderDrafts();
    await screen.findByText('Borrador de contestación');
    const area = screen.getByPlaceholderText(/Ej: borrador/);
    fireEvent.change(area, { target: { value: 'corto' } });
    expect((screen.getByText('Generar borrador') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(area, { target: { value: 'Preparar contestación centrada en el requerimiento previo' } });
    expect((screen.getByText('Generar borrador') as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByText('Generar borrador'));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/ai/cases/w1/drafts'),
      expect.objectContaining({ method: 'POST' })
    ));
  });

  it('abrir muestra contenido persistido', async () => {
    renderDrafts();
    fireEvent.click(await screen.findByText('Borrador de contestación'));
    await waitFor(() => expect(screen.getByText(/Contenido\./)).toBeTruthy());
  });
});

describe('FASE 4.62C editor rich: escape-first integrado', () => {
  it('markdown legacy con HTML crudo NO se ejecuta: se escapa; whitelist se convierte', async () => {
    const draft = makeDraft({
      content: '<script>alert("x")</script>\n\n## Requerimiento previo\n\n- renta impaga\n**obligación** central',
    });
    fetchMock = vi.fn(async (url: string, opts?: RequestInit) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/ai/usage')) {
        return { ok: true, json: async () => ({ allowance: usageAllowance }) } as Response;
      }
      if (/\/drafts\/[^/]+$/.test(urlStr)) {
        return { ok: true, json: async () => ({ draft }) } as Response;
      }
      return { ok: true, json: async () => ({ drafts: [draft] }) } as Response;
    });
    (globalThis as unknown as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
    renderDrafts();
    fireEvent.click(await screen.findByText('Borrador de contestación'));
    await screen.findByText(/alert\("x"\)/);
    const scope = document.body;
    expect(scope.querySelector('script')).toBeNull();
    expect(screen.getByText(/alert\("x"\)/)).toBeTruthy();
    expect(scope.querySelector('h2')?.textContent).toContain('Requerimiento previo');
    expect(scope.querySelector('strong')?.textContent).toContain('obligación');
    expect(scope.querySelector('ul')).toBeTruthy();
  });
});

describe('FASE 4.62C autosave, OCC y versiones', () => {
  it('edición dispara PUT autosave con base_revision, origin autosave y html; Guardado', async () => {
    renderDrafts();
    await openFirstDraft();
    const ed = mainEditor();
    expect(ed).toBeTruthy();
    act(() => { ed!.commands.setContent('<p>texto nuevo del abogado</p>', { emitUpdate: true }); });
    expect(screen.getByTestId('save-status').textContent).toContain('Cambios sin guardar');
    await waitFor(() => {
      expect(putCalls().some((c) => String(c[0]).includes('/drafts/d1'))).toBe(true);
    }, { timeout: 3000, interval: 50 });
    const first = putCalls().find((c) => String(c[0]).includes('/drafts/d1'))!;
    expect(first[0]).toContain('/api/ai/cases/w1/drafts/d1');
    const body = putBody(first);
    expect(body.origin).toBe('autosave');
    expect(body.content_format).toBe('html');
    expect(body.base_revision).toBe(1);
    await waitFor(() => expect(screen.getByTestId('save-status').textContent).toContain('Guardado'));
    // segunda edición: base_revision monotónica (2, no 1)
    act(() => { ed!.commands.setContent('<p>texto nuevo dos</p>', { emitUpdate: true }); });
    await waitFor(() => {
      const checks = putCalls().filter((c) => putBody(c).base_revision === 2);
      expect(checks.length).toBeGreaterThan(0);
    }, { timeout: 3000, interval: 50 });
  }, 15000);

  it('PUT sin cambios no dispara PUT duplicado (pt set server head)', async () => {
    renderDrafts();
    await openFirstDraft();
    const ed = mainEditor()!;
    // setContent emitUpdate true con el MISMO html → sin autosave (no-op)
    act(() => { ed.commands.setContent(ed.getHTML(), { emitUpdate: true }); });
    await new Promise((r) => setTimeout(r, 900));
    expect(putCalls()).toHaveLength(0);
  }, 10000);

  it('PUT 409 → panel conflicto con 3 salidas; Forzar manda force:true', async () => {
    renderDrafts();
    await openFirstDraft();
    putFailure = { status: 409, body: { error: 'conflicto', code: 'AI_DRAFT_REVISION_CONFLICT', current_revision: 7 } };
    const ed = mainEditor()!;
    act(() => { ed.commands.setContent('<p>mi versión local</p>', { emitUpdate: true }); });
    expect(await screen.findByText('El documento cambió en otro dispositivo o pestaña.')).toBeTruthy();
    expect(screen.getByText('Copiar mis cambios')).toBeTruthy();
    expect(screen.getByText('Descartar y recargar')).toBeTruthy();
    expect(screen.getByText('Forzar mi versión')).toBeTruthy();
    putFailure = null;
    fireEvent.click(screen.getByText('Forzar mi versión'));
    await waitFor(() => {
      const forced = putCalls().find((c) => putBody(c).force === true);
      expect(forced).toBeTruthy();
    }, { timeout: 3000, interval: 50 });
  }, 20000);

  it('PUT 500 → cambios preservados en editor y Reintentar repite PUT', async () => {
    renderDrafts();
    await openFirstDraft();
    const ed = mainEditor()!;
    putFailure = { status: 500, body: { error: 'boom' } };
    act(() => { ed.commands.setContent('<p>trabajo delicado</p>', { emitUpdate: true }); });
    await waitFor(() => expect(screen.getByText('Reintentar')).toBeTruthy(), { timeout: 3000, interval: 50 });
    expect(screen.getByText(/trabajo delicado/)).toBeTruthy();
    putFailure = null;
    fireEvent.click(screen.getByText('Reintentar'));
    await waitFor(() => expect(putCalls().length).toBeGreaterThanOrEqual(2), { timeout: 3000, interval: 50 });
  }, 20000);

  it('historial + restauración: preview y POST restore sin borrar historial', async () => {
    versionsPayload = [
      { version_no: 2, origin: 'autosave', content_format: 'html', model: null, title: null, created_at: '2026-10-02T10:00:00Z' },
      { version_no: 1, origin: 'generation', content_format: 'markdown', model: 'm', title: 'v1', created_at: '2026-10-01T10:00:00Z' },
    ];
    versionDetail = {
      version_no: 1, origin: 'generation', content_format: 'markdown', model: 'm', title: 'v1',
      created_at: '2026-10-01T10:00:00Z', content: '# Borrador\n\nTexto original de la IA.',
    };
    renderDrafts();
    await openFirstDraft();
    fireEvent.click((await screen.findAllByText(/v1 · generación IA/))[0]);
    expect(await screen.findByText(/Texto original de la IA\./)).toBeTruthy();
    fireEvent.click(screen.getByText('Restaurar esta versión'));
    await waitFor(() => expect(
      fetchMock.mock.calls.some((c) => String(c[0]).includes('/versions/1/restore') && (c[1] as RequestInit).method === 'POST')
    ).toBe(true));
    // post-restore el historial sigue listado: restauración nunca destruye
    expect(await screen.findByText(/v2 · guardado automático/)).toBeTruthy();
  }, 20000);

  it('cambio de borrador con cambios sin guardar exige resolución explícita', async () => {
    renderDrafts();
    await openFirstDraft();
    const ed = mainEditor()!;
    act(() => { ed.commands.setContent('<p>sin guardar aún</p>', { emitUpdate: true }); });
    // Reintento de apertura del MISMO item con trabajo pendiente: resolvible
    fireEvent.click((await screen.findAllByText('Borrador de contestación'))[0]);
    expect(await screen.findByText('Guardar y abrir')).toBeTruthy();
    expect(screen.getByText('Descartar cambios y abrir')).toBeTruthy();
  }, 20000);
});

describe('FASE 4.59D.4 gating preservado', () => {
  it('muestra uso Pro y gating al límite', async () => {
    renderDrafts();
    expect(await screen.findByText('12 de 30 este mes')).toBeTruthy();
    usageAllowance = { plan: 'pro_limited', drafting: { used: 30, limit: 30 } };
    cleanup();
    renderDrafts();
    expect(await screen.findByText(/Has utilizado los 30 borradores/)).toBeTruthy();
    expect(screen.getByText('Ver LegalUp Plus')).toBeTruthy();
  });

  it('free muestra gating Pro sin contador', async () => {
    usageAllowance = { plan: 'free_case', drafting: { used: 0, limit: 0 } };
    renderDrafts();
    expect(await screen.findByText('Ver LegalUp Pro')).toBeTruthy();
    expect(screen.queryByText(/de 30 este mes/)).toBeNull();
  });
});

describe('FASE 4.62D.2 restauración sin pérdida de ediciones', () => {
  const openVersionPreview = async (needle: RegExp) => {
    fireEvent.click((await screen.findAllByText(needle))[0]);
    return await screen.findByText('Restaurar esta versión');
  };

  it('dirty → restaurar: primero PUT origin edit con el contenido local, después restore', async () => {
    versionsPayload = [
      { version_no: 1, origin: 'generation', content_format: 'markdown', model: 'm', title: 'v1', created_at: '2026-10-01T10:00:00Z' },
    ];
    versionDetail = {
      version_no: 1, origin: 'generation', content_format: 'markdown', model: 'm', title: 'v1',
      created_at: '2026-10-01T10:00:00Z', content: 'Texto de la versión previa.',
    };
    renderDrafts();
    await openFirstDraft();
    const ed = mainEditor()!;
    act(() => { ed.commands.setContent('<p>trabajo local pendiente</p>', { emitUpdate: true }); });
    const restoreBtn = await openVersionPreview(/v1 · generación IA/);
    fireEvent.click(restoreBtn);
    // El guardado local precede a la restauración y lleva el contenido local.
    await waitFor(() => {
      const edits = putCalls().filter((c) => putBody(c).origin === 'edit');
      expect(edits.length).toBeGreaterThan(0);
      expect(putBody(edits[0]).content).toContain('trabajo local pendiente');
    }, { timeout: 3000, interval: 50 });
    await waitFor(() => {
      expect(fetchMock.mock.calls.some((c) => String(c[0]).includes('/versions/1/restore') && (c[1] as RequestInit).method === 'POST')).toBe(true);
    }, { timeout: 3000, interval: 50 });
    // Nada se perdió: el PUT local persistió antes de restaurar.
    expect(putBody(putCalls()[0]).origin).toBe('edit');
  }, 20000);

  it('guardado fallido antes de restaurar: sin POST restore, texto local intacto, aviso visible', async () => {
    versionsPayload = [
      { version_no: 1, origin: 'generation', content_format: 'markdown', model: 'm', title: 'v1', created_at: '2026-10-01T10:00:00Z' },
    ];
    versionDetail = {
      version_no: 1, origin: 'generation', content_format: 'markdown', model: 'm', title: 'v1',
      created_at: '2026-10-01T10:00:00Z', content: 'Texto de la versión previa.',
    };
    renderDrafts();
    await openFirstDraft();
    const ed = mainEditor()!;
    putFailure = { status: 500, body: { error: 'boom' } };
    act(() => { ed.commands.setContent('<p>ediciones no confirmadas</p>', { emitUpdate: true }); });
    const restoreBtn = await openVersionPreview(/v1 · generación IA/) as HTMLElement;
    fireEvent.click(restoreBtn);
    await waitFor(() => expect(putCalls().length).toBeGreaterThan(0), { timeout: 3000, interval: 50 });
    // La restauración NO se ejecuta.
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes('/restore'))).toBe(false);
    expect(await screen.findByText(/La restauración se canceló/)).toBeTruthy();
    // El contenido local sigue en el editor (sin reemplazo silencioso).
    expect(ed.getHTML()).toContain('ediciones no confirmadas');
    putFailure = null;
  }, 20000);

  it('conflicto OCC en el flush: sin POST restore, cambios locales conservados y panel de conflicto', async () => {
    versionsPayload = [
      { version_no: 1, origin: 'generation', content_format: 'markdown', model: 'm', title: 'v1', created_at: '2026-10-01T10:00:00Z' },
    ];
    versionDetail = {
      version_no: 1, origin: 'generation', content_format: 'markdown', model: 'm', title: 'v1',
      created_at: '2026-10-01T10:00:00Z', content: 'Texto de la versión previa.',
    };
    renderDrafts();
    await openFirstDraft();
    const ed = mainEditor()!;
    putFailure = { status: 409, body: { error: 'conflicto', code: 'AI_DRAFT_REVISION_CONFLICT', current_revision: 9 } };
    act(() => { ed.commands.setContent('<p>mi versión local en conflicto</p>', { emitUpdate: true }); });
    const restoreBtn = await openVersionPreview(/v1 · generación IA/) as HTMLElement;
    fireEvent.click(restoreBtn);
    await waitFor(() => expect(putCalls().length).toBeGreaterThan(0), { timeout: 3000, interval: 50 });
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes('/restore'))).toBe(false);
    // El panel de conflicto manda: el usuario decide, la restauración queda cancelada.
    expect(await screen.findByText('El documento cambió en otro dispositivo o pestaña.')).toBeTruthy();
    expect((screen.getAllByText('Copiar mis cambios')).length).toBeGreaterThan(0);
    expect(ed.getHTML()).toContain('mi versión local en conflicto');
    putFailure = null;
  }, 20000);

  it('sin cambios pendientes: restauración directa sin PUT previo', async () => {
    versionsPayload = [
      { version_no: 1, origin: 'generation', content_format: 'markdown', model: 'm', title: 'v1', created_at: '2026-10-01T10:00:00Z' },
    ];
    versionDetail = {
      version_no: 1, origin: 'generation', content_format: 'markdown', model: 'm', title: 'v1',
      created_at: '2026-10-01T10:00:00Z', content: 'Texto de la versión previa.',
    };
    renderDrafts();
    await openFirstDraft();
    const restoreBtn = await openVersionPreview(/v1 · generación IA/);
    fireEvent.click(restoreBtn as HTMLElement);
    await waitFor(() => {
      expect(fetchMock.mock.calls.some((c) => String(c[0]).includes('/versions/1/restore') && (c[1] as RequestInit).method === 'POST')).toBe(true);
    }, { timeout: 3000, interval: 50 });
    // Sin flush previo: ningún PUT en toda la sesión.
    expect(putCalls()).toHaveLength(0);
  }, 20000);

  it('botón de restauración deshabilitado durante el guardado en curso', async () => {
    versionsPayload = [
      { version_no: 1, origin: 'generation', content_format: 'markdown', model: 'm', title: 'v1', created_at: '2026-10-01T10:00:00Z' },
    ];
    versionDetail = {
      version_no: 1, origin: 'generation', content_format: 'markdown', model: 'm', title: 'v1',
      created_at: '2026-10-01T10:00:00Z', content: 'Texto de la versión previa.',
    };
    let releaseHold = () => {};
    renderDrafts();
    await openFirstDraft();
    const ed = mainEditor()!;
    holdPutGate = new Promise<void>((resolve) => { releaseHold = resolve; });
    act(() => { ed.commands.setContent('<p>guardado retenido</p>', { emitUpdate: true }); });
    const restoreBtn = await openVersionPreview(/v1 · generación IA/);
    // El PUT en vuelo (retenido) congela 'saving': el botón debe estar deshabilitado.
    fireEvent.click(restoreBtn);
    await waitFor(() => {
      expect(restoreBtn).toBeDisabled();
    }, { timeout: 3000, interval: 50 });
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes('/restore'))).toBe(false);
    releaseHold();
    await waitFor(() => {
      expect(fetchMock.mock.calls.some((c) => String(c[0]).includes('/versions/1/restore') && (c[1] as RequestInit).method === 'POST')).toBe(true);
    }, { timeout: 3000, interval: 50 });
  }, 20000);
});

describe('FASE 4.62D.6 serialización de escrituras OCC', () => {
  const openVersionPreviewLocal = async (needle: RegExp) => {
    fireEvent.click((await screen.findAllByText(needle))[0]);
    return await screen.findByText('Restaurar esta versión');
  };

  const loadVersionOne = () => {
    versionsPayload = [
      { version_no: 1, origin: 'generation', content_format: 'markdown', model: 'm', title: 'v1', created_at: '2026-10-01T10:00:00Z' },
    ];
    versionDetail = {
      version_no: 1, origin: 'generation', content_format: 'markdown', model: 'm', title: 'v1',
      created_at: '2026-10-01T10:00:00Z', content: 'Texto de la versión previa.',
    };
  };

  it('CASO 1: un solo PUT activo; la edición durante el vuelo se persiste después con base_revision actualizada', async () => {
    let releaseHold = () => {};
    renderDrafts();
    await openFirstDraft();
    const ed = mainEditor()!;
    holdPutGate = new Promise<void>((resolve) => { releaseHold = resolve; });
    act(() => { ed.commands.setContent('<p>primera</p>', { emitUpdate: true }); });
    await waitFor(() => expect(putCalls()).toHaveLength(1), { timeout: 3000, interval: 50 });
    // El usuario sigue escribiendo mientras el PUT 1 está retenido.
    act(() => { ed.commands.setContent('<p>primera segunda</p>', { emitUpdate: true }); });
    await new Promise((r) => setTimeout(r, 300));
    // Serialización: ningún segundo PUT mientras el primero sigue pendiente.
    expect(putCalls()).toHaveLength(1);
    releaseHold();
    await waitFor(() => expect(putCalls()).toHaveLength(2), { timeout: 3000, interval: 50 });
    await waitFor(() => expect(screen.getByTestId('save-status').textContent).toContain('Guardado'), { timeout: 3000, interval: 50 });
    // PUT 1: contenido en el momento del guardado, base revision inicial.
    expect(putBody(putCalls()[0]).base_revision).toBe(1);
    expect(String(putBody(putCalls()[0]).content)).toContain('primera');
    expect(String(putBody(putCalls()[0]).content)).not.toContain('segunda');
    // Trailing save: contenido más reciente con la revisión ya actualizada.
    expect(putBody(putCalls()[1]).base_revision).toBe(2);
    expect(String(putBody(putCalls()[1]).content)).toContain('segunda');
  }, 20000);

  it('CASO 2: restaurar durante un guardado en vuelo — PUT serializados y POST restore solo después del flush', async () => {
    loadVersionOne();
    let releaseHold = () => {};
    renderDrafts();
    await openFirstDraft();
    const ed = mainEditor()!;
    holdPutGate = new Promise<void>((resolve) => { releaseHold = resolve; });
    act(() => { ed.commands.setContent('<p>edición en vuelo</p>', { emitUpdate: true }); });
    await waitFor(() => expect(putCalls()).toHaveLength(1), { timeout: 3000, interval: 50 });
    act(() => { ed.commands.setContent('<p>edición en vuelo extra</p>', { emitUpdate: true }); });
    const restoreBtn = (await openVersionPreviewLocal(/v1 · generación IA/)) as HTMLElement;
    fireEvent.click(restoreBtn);
    await new Promise((r) => setTimeout(r, 300));
    // Mientras el PUT 1 esté retenido: no hay segundo PUT ni POST de restauración
    // (la restauración se une al guardado activo y no entra con base obsoleta).
    expect(putCalls()).toHaveLength(1);
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes('/restore'))).toBe(false);
    releaseHold();
    await waitFor(() => {
      expect(fetchMock.mock.calls.some((c) => String(c[0]).includes('/versions/1/restore') && (c[1] as RequestInit).method === 'POST')).toBe(true);
    }, { timeout: 3000, interval: 50 });
    // Flush serializado: PUT 2 con base_revision fresca y el contenido local más reciente.
    expect(putCalls()).toHaveLength(2);
    expect(putBody(putCalls()[1]).base_revision).toBe(2);
    expect(String(putBody(putCalls()[1]).content)).toContain('extra');
    // Orden: la restauración ocurre estrictamente después del último PUT.
    const calls = fetchMock.mock.calls as unknown[][];
    const restoreIdx = calls.findIndex((c) => String(c[0]).includes('/versions/1/restore'));
    const lastPutIdx = calls.reduce((acc, c, i) => ((c[1] as RequestInit).method === 'PUT' ? i : acc), -1);
    expect(restoreIdx).toBeGreaterThan(lastPutIdx);
  }, 20000);

  it('CASO 3: fallo del primer guardado — texto intacto, restauración cancelada y sin bloqueo permanente', async () => {
    loadVersionOne();
    putFailure = { status: 500, body: { error: 'boom' } };
    renderDrafts();
    await openFirstDraft();
    const ed = mainEditor()!;
    act(() => { ed.commands.setContent('<p>cambio con fallo</p>', { emitUpdate: true }); });
    const restoreBtn = (await openVersionPreviewLocal(/v1 · generación IA/)) as HTMLElement;
    fireEvent.click(restoreBtn);
    await waitFor(() => expect(putCalls().length).toBeGreaterThan(0), { timeout: 3000, interval: 50 });
    // El errorpaneal aparece y la restauración queda cancelada, no ejecutada.
    expect(await screen.findByText('No se pudo guardar: los cambios siguen en el editor.')).toBeTruthy();
    expect(await screen.findByText('La restauración se canceló: guarda o resuelve tus cambios pendientes primero. Tu texto sigue en el editor.')).toBeTruthy();
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes('/restore'))).toBe(false);
    // La edición local permanece y no se marcó como guardada.
    expect(ed.getHTML()).toContain('cambio con fallo');
    expect(screen.getByTestId('save-status').textContent).toContain('Error al guardar');
    // Sin bloqueo permanente: al liberar el fallo, el reintento guarda con base_revision fresca.
    putFailure = null;
    fireEvent.click(screen.getByText('Reintentar'));
    await waitFor(() => expect(screen.getByTestId('save-status').textContent).toContain('Guardado'), { timeout: 3000, interval: 50 });
    const retry = putCalls()[putCalls().length - 1];
    expect(putBody(retry).base_revision).toBe(1);
    expect(String(putBody(retry).content)).toContain('cambio con fallo');
  }, 20000);

  it('CASO 5: una respuesta tardía con revisión antigua nunca degrada la base OCC local', async () => {
    renderDrafts();
    await openFirstDraft();
    const ed = mainEditor()!;
    act(() => { ed.commands.setContent('<p>uno</p>', { emitUpdate: true }); });
    await waitFor(() => expect(screen.getByTestId('save-status').textContent).toContain('Guardado'), { timeout: 3000, interval: 50 });
    // El PUT 2 devolverá una revisión "tardía" (1) aunque el PUT 1 confirmó la 2:
    // la base OCC local no puede retroceder con una respuesta antigua.
    putStaleRevisions = [1];
    act(() => { ed.commands.setContent('<p>uno dos</p>', { emitUpdate: true }); });
    await waitFor(() => expect(putCalls()).toHaveLength(2), { timeout: 3000, interval: 50 });
    await waitFor(() => expect(screen.getByTestId('save-status').textContent).toContain('Guardado'), { timeout: 3000, interval: 50 });
    act(() => { ed.commands.setContent('<p>uno dos tres</p>', { emitUpdate: true }); });
    await waitFor(() => expect(putCalls()).toHaveLength(3), { timeout: 3000, interval: 50 });
    // Monotónico: el PUT 3 mantiene la revisión confirmada por el PUT 1 (2);
    // una base degradada a 1 (la de la respuesta tardía) haría fallar este assert.
    expect(putBody(putCalls()[2]).base_revision).toBe(2);
  }, 20000);
});

describe('FASE 4.62D.11 cambio de borrador: la base OCC es la del borrador abierto', () => {
  const A_ID = 'dA';
  const B_ID = 'dB';
  const TITLE_A = 'Contestación revisión alta';
  const TITLE_B = 'Carta revisión baja';
  const draftA = makeDraft({ id: A_ID, title: TITLE_A, revision: 10, content: '# TextoA\n\nPárrafo alto de A.' });
  const draftB = makeDraft({ id: B_ID, title: TITLE_B, revision: 1, content: '# TextoB\n\nPárrafo bajo de B.' });

  let restoreHoldGate: Promise<void> | null = null;
  let restoredDraft = draftA;

  beforeEach(() => {
    restoreHoldGate = null;
    restoredDraft = makeDraft({ id: A_ID, title: TITLE_A, revision: 11, content: '# TextoA\n\nPárrafo alto de A.' });
    const byId: Record<string, unknown> = { [A_ID]: draftA, [B_ID]: draftB };
    fetchMock = vi.fn(async (url: string, opts?: RequestInit) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/ai/usage')) {
        return { ok: true, json: async () => ({ allowance: usageAllowance }) } as Response;
      }
      if (opts?.method === 'POST' && urlStr.includes('/restore')) {
        if (restoreHoldGate) await restoreHoldGate;
        return { ok: true, json: async () => ({ draft: restoredDraft, version: { version_no: 11, origin: 'restore', restored_from: 1 } }) } as Response;
      }
      if (opts?.method === 'PUT') {
        if (holdPutGate) {
          const gate = holdPutGate;
          holdPutGate = null;
          await gate;
        }
        if (putFailure) {
          const fail = putFailure;
          return { ok: false, status: fail.status, json: async () => fail.body } as unknown as Response;
        }
        const body = JSON.parse(String(opts?.body ?? '{}')) as { content?: string; base_revision?: number };
        const legitRevision = (body.base_revision ?? 1) + 1;
        const revision = putStaleRevisions.length > 0 ? (putStaleRevisions.shift() as number) : legitRevision;
        return {
          ok: true,
          json: async () => ({ draft: makeDraft({ content: body.content ?? '', content_format: 'html', revision }) }),
        } as Response;
      }
      if (/\/drafts\/[^/]+\/versions\/\d+$/.test(urlStr)) {
        return { ok: true, json: async () => ({ version: versionDetail }) } as Response;
      }
      if (/\/drafts\/[^/]+\/versions$/.test(urlStr)) {
        return { ok: true, json: async () => ({ versions: versionsPayload }) } as Response;
      }
      if (/\/drafts\/[^/]+$/.test(urlStr)) {
        const m = urlStr.match(/\/drafts\/([^/?]+)$/) as RegExpMatchArray;
        return { ok: true, json: async () => ({ draft: byId[m[1]] ?? draftA }) } as Response;
      }
      return { ok: true, json: async () => ({ drafts: [draftA, draftB] }) } as Response;
    });
    (globalThis as unknown as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
  });

  const loadVersionsOne = () => {
    versionsPayload = [
      { version_no: 1, origin: 'generation', content_format: 'markdown', model: 'm', title: 'v1', created_at: '2026-10-01T10:00:00Z' },
    ];
    versionDetail = {
      version_no: 1, origin: 'generation', content_format: 'markdown', model: 'm', title: 'v1',
      created_at: '2026-10-01T10:00:00Z', content: 'Texto de la versión previa.',
    };
  };

  it('CASO A10→B1: abrir A(rev 10) y luego B(rev 1); el primer PUT de B usa base_revision=1, nunca 10', async () => {
    renderDrafts();
    fireEvent.click(await screen.findByText(TITLE_A));
    await screen.findByText(/Párrafo alto de A\./);
    // Cambio a B con A en estado tranquilo (sin dirty): switch directo.
    fireEvent.click((await screen.findAllByText(TITLE_B))[0]);
    await screen.findByText(/Párrafo bajo de B\./);
    const ed = mainEditor()!;
    expect(ed.getHTML()).toContain('Párrafo bajo de B.');
    expect(ed.getHTML()).not.toContain('Párrafo alto de A.');
    act(() => { ed.commands.setContent('<p>edición de B</p>', { emitUpdate: true }); });
    await waitFor(() => expect(putCalls()).toHaveLength(1), { timeout: 3000, interval: 50 });
    const first = putCalls()[0];
    expect(first[0]).toContain(`/api/ai/cases/w1/drafts/${B_ID}`);
    expect(putBody(first).base_revision).toBe(1);
    // El guardado de B no reutiliza contenido de A.
    expect(String(putBody(first).content)).toContain('edición de B');
    expect(String(putBody(first).content)).not.toContain('Párrafo alto de A.');
    // Síntoma del bug histórico: ninguna petición con base_revision=10.
    expect(putCalls().some((c) => putBody(c).base_revision === 10)).toBe(false);
  }, 20000);

  it('CASO B1→A10: abrir B(rev 1) y luego A(rev 10); el primer PUT de A usa base_revision=10', async () => {
    renderDrafts();
    fireEvent.click(await screen.findByText(TITLE_B));
    await screen.findByText(/Párrafo bajo de B\./);
    fireEvent.click((await screen.findAllByText(TITLE_A))[0]);
    await screen.findByText(/Párrafo alto de A\./);
    const ed = mainEditor()!;
    act(() => { ed.commands.setContent('<p>edición de A</p>', { emitUpdate: true }); });
    await waitFor(() => expect(putCalls()).toHaveLength(1), { timeout: 3000, interval: 50 });
    const first = putCalls()[0];
    expect(first[0]).toContain(`/api/ai/cases/w1/drafts/${A_ID}`);
    expect(putBody(first).base_revision).toBe(10);
    expect(putCalls().some((c) => putBody(c).base_revision === 1)).toBe(false);
  }, 20000);

  it('respuesta tardía del PUT de A no contamina B: resolución explícita durante el vuelo, sin PUT extra y base de B intacta', async () => {
    let releaseHold = () => {};
    renderDrafts();
    fireEvent.click(await screen.findByText(TITLE_A));
    await screen.findByText(/Párrafo alto de A\./);
    const ed = mainEditor()!;
    holdPutGate = new Promise<void>((resolve) => { releaseHold = resolve; });
    act(() => { ed.commands.setContent('<p>edición de A en vuelo</p>', { emitUpdate: true }); });
    await waitFor(() => expect(putCalls()).toHaveLength(1), { timeout: 3000, interval: 50 });
    expect(putBody(putCalls()[0]).base_revision).toBe(10);
    // FASE 4.62D.33: 'saving' también exige resolución explícita; el switch
    // directo de la fase 4.62D.11 era la ventana de pérdida que se corrige.
    fireEvent.click((await screen.findAllByText(TITLE_B))[0]);
    await screen.findByText(/Tienes cambios sin guardar/);
    // Guardar y abrir: runSave se une al vuelo retenido y espera su resultado.
    fireEvent.click(screen.getByText('Guardar y abrir'));
    releaseHold();
    await screen.findByText(/Párrafo bajo de B\./);
    await new Promise((r) => setTimeout(r, 1200));
    // La respuesta tardía de A (rev 11) fue la que CONFIRMÓ el contenido vía
    // la unión: sin PUT extra (ni re-envío redundante ni PUT por B).
    expect(putCalls()).toHaveLength(1);
    // Sin estado falso de guardado tras abrir B ('idle' → label vacío).
    expect(screen.getByTestId('save-status').textContent).toBe('');
    // La base OCC de B sigue siendo su propia revisión (1), no la de la respuesta tardía.
    act(() => { ed.commands.setContent('<p>edición de B tardía</p>', { emitUpdate: true }); });
    await waitFor(() => expect(putCalls()).toHaveLength(2), { timeout: 3000, interval: 50 });
    const bPut = putCalls().find((c) => String(c[0]).includes(`/drafts/${B_ID}`))!;
    expect(putBody(bPut).base_revision).toBe(1);
    expect(String(putBody(bPut).content)).toContain('edición de B tardía');
  }, 20000);

  it('respuesta tardía del POST restore de A no reabre A ni pisa el contenido de B', async () => {
    loadVersionsOne();
    let releaseRestore = () => {};
    renderDrafts();
    fireEvent.click(await screen.findByText(TITLE_A));
    await screen.findByText(/Párrafo alto de A\./);
    // Preview de la v1 de A y click en restaurar con el POST retenido.
    fireEvent.click((await screen.findAllByText(/v1 · generación IA/))[0]);
    const restoreBtn = await screen.findByText('Restaurar esta versión');
    restoreHoldGate = new Promise<void>((resolve) => { releaseRestore = resolve; });
    fireEvent.click(restoreBtn);
    await waitFor(() => {
      expect(fetchMock.mock.calls.some((c) => String(c[0]).includes('/versions/1/restore') && (c[1] as RequestInit).method === 'POST')).toBe(true);
    }, { timeout: 3000, interval: 50 });
    // Cambio a B mientras el restore de A está en vuelo (permitido: no hay dirty).
    fireEvent.click((await screen.findAllByText(TITLE_B))[0]);
    await screen.findByText(/Párrafo bajo de B\./);
    releaseRestore();
    await new Promise((r) => setTimeout(r, 1200));
    // El borrador B sigue abierto e intacto: la respuesta tardía de A no lo pisó.
    expect(mainEditor()!.getHTML()).toContain('Párrafo bajo de B.');
    expect(mainEditor()!.getHTML()).not.toContain('Texto de la versión previa.');
    expect(screen.getByText(/Párrafo bajo de B\./)).toBeTruthy();
    // La edición posterior de B sigue usando su propia base (1).
    act(() => { mainEditor()!.commands.setContent('<p>edición de B post restore</p>', { emitUpdate: true }); });
    await waitFor(() => expect(putCalls()).toHaveLength(1), { timeout: 3000, interval: 50 });
    expect(putBody(putCalls()[0]).base_revision).toBe(1);
  }, 20000);

  it('HTTP 409 genuino durante la edición de B tras cambiar de A: panel con las 3 salidas y Forzar envía force', async () => {
    renderDrafts();
    fireEvent.click(await screen.findByText(TITLE_A));
    await screen.findByText(/Párrafo alto de A\./);
    fireEvent.click((await screen.findAllByText(TITLE_B))[0]);
    await screen.findByText(/Párrafo bajo de B\./);
    putFailure = { status: 409, body: { error: 'conflicto', code: 'AI_DRAFT_REVISION_CONFLICT', current_revision: 7 } };
    act(() => { mainEditor()!.commands.setContent('<p>mi versión local de B</p>', { emitUpdate: true }); });
    expect(await screen.findByText('El documento cambió en otro dispositivo o pestaña.')).toBeTruthy();
    expect(screen.getByText('Copiar mis cambios')).toBeTruthy();
    expect(screen.getByText('Descartar y recargar')).toBeTruthy();
    expect(screen.getByText('Forzar mi versión')).toBeTruthy();
    putFailure = null;
    fireEvent.click(screen.getByText('Forzar mi versión'));
    await waitFor(() => {
      const forced = putCalls().find((c) => putBody(c).force === true);
      expect(forced).toBeTruthy();
      expect(String(forced![0])).toContain(`/drafts/${B_ID}`);
    }, { timeout: 3000, interval: 50 });
  }, 20000);
});

// FASE 4.62D.30 — Guardar y abrir: el destino solo se abre cuando el guardado
// pendiente terminó en 'saved'. Fallos (500/red) y conflictos 409 mantienen al
// usuario en el borrador de origen con su texto; «Descartar cambios y abrir»
// sigue siendo la vía forzada explícita.
describe('FASE 4.62D.30 guardar y abrir no abandona el borrador con guardado fallido', () => {
  const A_ID = 'dA';
  const B_ID = 'dB';
  const TITLE_A = 'Contestación origen';
  const TITLE_B = 'Carta destino';
  const draftA = makeDraft({ id: A_ID, title: TITLE_A, revision: 3, content: '# TextoA\n\nPárrafo de A.' });
  const draftB = makeDraft({ id: B_ID, title: TITLE_B, revision: 1, content: '# TextoB\n\nPárrafo de B.' });
  const LOCAL_TEXT = 'trabajo local pendiente de confirmar';

  beforeEach(() => {
    const byId: Record<string, unknown> = { [A_ID]: draftA, [B_ID]: draftB };
    fetchMock = vi.fn(async (url: string, opts?: RequestInit) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/ai/usage')) {
        return { ok: true, json: async () => ({ allowance: usageAllowance }) } as Response;
      }
      if (opts?.method === 'PUT') {
        if (putFailure) {
          const fail = putFailure;
          return { ok: false, status: fail.status, json: async () => fail.body } as unknown as Response;
        }
        const body = JSON.parse(String(opts?.body ?? '{}')) as { content?: string; base_revision?: number };
        return { ok: true, json: async () => ({ draft: makeDraft({ content: body.content ?? '', content_format: 'html', revision: (body.base_revision ?? 1) + 1 }) }) } as Response;
      }
      if (/\/drafts\/[^/]+$/.test(urlStr)) {
        const m = urlStr.match(/\/drafts\/([^/?]+)$/) as RegExpMatchArray;
        return { ok: true, json: async () => ({ draft: byId[m[1]] ?? draftA }) } as Response;
      }
      return { ok: true, json: async () => ({ drafts: [draftA, draftB] }) } as Response;
    });
    (globalThis as unknown as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
  });

  const abrirConPendiente = async () => {
    renderDrafts();
    fireEvent.click(await screen.findByText(TITLE_A));
    await screen.findByText(/Párrafo de A\./);
    const ed = mainEditor()!;
    act(() => { ed.commands.setContent(`<p>${LOCAL_TEXT}</p>`, { emitUpdate: true }); });
    fireEvent.click((await screen.findAllByText(TITLE_B))[0]);
    await screen.findByText('Guardar y abrir');
    return ed;
  };

  const destinoNoAbierto = () => {
    // GET del borrador destino jamás ocurrió ni ocurrirá tras la resolución.
    expect(fetchMock.mock.calls.some((c) => String(c[0]).endsWith(`/drafts/${B_ID}`))).toBe(false);
    expect(mainEditor()!.getHTML()).toContain(LOCAL_TEXT);
    expect(mainEditor()!.getHTML()).not.toContain('Párrafo de B.');
  };

  it('1. guardado correcto: el borrador de destino se abre', async () => {
    const ed = await abrirConPendiente();
    fireEvent.click(screen.getByText('Guardar y abrir'));
    // PUT de flush con el contenido local y origin edit.
    await waitFor(() => {
      const flush = putCalls().find((c) => putBody(c).origin === 'edit');
      expect(flush).toBeTruthy();
      expect(String(putBody(flush!).content)).toContain(LOCAL_TEXT);
    }, { timeout: 3000, interval: 50 });
    await screen.findByText(/Párrafo de B\./);
    expect(mainEditor()!.getHTML()).toContain('Párrafo de B.');
    expect(mainEditor()!.getHTML()).not.toContain(LOCAL_TEXT);
    expect(ed).toBeTruthy();
  }, 20000);

  it('2. guardado con estado de error (500): el destino no se abre y el texto se conserva', async () => {
    putFailure = { status: 500, body: { error: 'boom' } };
    const ed = await abrirConPendiente();
    fireEvent.click(screen.getByText('Guardar y abrir'));
    await waitFor(() => expect(putCalls().length).toBeGreaterThan(0), { timeout: 3000, interval: 50 });
    await screen.findByText('No se pudo guardar: los cambios siguen en el editor.');
    expect(screen.getByTestId('save-status').textContent).toContain('Error al guardar');
    destinoNoAbierto();
    expect(screen.getByText(/Tienes cambios sin guardar/)).toBeTruthy();
    expect(screen.getByText('Guardar y abrir')).toBeTruthy();
    expect(ed).toBeTruthy();
    putFailure = null;
  }, 20000);

  it('3. conflicto 409: se conserva el flujo de recuperación y no se abandona el borrador', async () => {
    putFailure = { status: 409, body: { error: 'conflicto', code: 'AI_DRAFT_REVISION_CONFLICT', current_revision: 8 } };
    const ed = await abrirConPendiente();
    fireEvent.click(screen.getByText('Guardar y abrir'));
    await waitFor(() => expect(putCalls().length).toBeGreaterThan(0), { timeout: 3000, interval: 50 });
    // El panel de conflicto manda: 3 salidas presentes, usuario en el origen.
    expect(await screen.findByText('El documento cambió en otro dispositivo o pestaña.')).toBeTruthy();
    expect(screen.getByText('Copiar mis cambios')).toBeTruthy();
    expect(screen.getByText('Descartar y recargar')).toBeTruthy();
    expect(screen.getByText('Forzar mi versión')).toBeTruthy();
    destinoNoAbierto();
    expect(screen.getByText(/Tienes cambios sin guardar/)).toBeTruthy();
    putFailure = null;
  }, 20000);

  it('4. fallo de red (promesa PUT rechazada): el destino no se abre y el contenido sigue recuperable', async () => {
    // El mock de fetch rechaza: requestJson propaga el rechazo; runSave lo
    // traduce a 'error' y nunca deja escapar la promesa sin abrir el destino.
    const originalFetch = fetchMock;
    fetchMock = vi.fn(async (url: string, opts?: RequestInit) => {
      if (opts?.method === 'PUT') throw new TypeError('network down');
      return originalFetch(url, opts);
    });
    (globalThis as unknown as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
    const ed = await abrirConPendiente();
    fireEvent.click(screen.getByText('Guardar y abrir'));
    await screen.findByText('No se pudo guardar: los cambios siguen en el editor.');
    expect(screen.getByTestId('save-status').textContent).toContain('Error al guardar');
    destinoNoAbierto();
    expect(screen.getByText(/Tienes cambios sin guardar/)).toBeTruthy();
    expect(ed).toBeTruthy();
  }, 20000);

  it('5. descartar explícitamente: sigue permitiendo cambiar de borrador sin guardar', async () => {
    await abrirConPendiente();
    fireEvent.click(screen.getByText('Descartar cambios y abrir'));
    await screen.findByText(/Párrafo de B\./);
    expect(mainEditor()!.getHTML()).toContain('Párrafo de B.');
    expect(mainEditor()!.getHTML()).not.toContain(LOCAL_TEXT);
  }, 20000);
});

// FASE 4.62D.31 — flush de beforeunload con token vigente. El PUT de emergencia
// no puede esperar una renovación (beforeunload es síncrono), así que el token
// en caché debe mantenerse al día con los eventos de sesión de GoTrue.
// El flush sigue siendo best-effort: no se atribuyen garantías del navegador.
describe('FASE 4.62D.31 flush de beforeunload con token vigente', () => {
  const flushCalls = (): ApiCall[] =>
    (fetchMock.mock.calls as unknown[][]).filter((c) => (c[1] as RequestInit).keepalive === true) as ApiCall[];
  const flushAuthorization = (call: ApiCall) =>
    ((call[1].headers ?? {}) as Record<string, string>).Authorization;
  const abrirConCambiosPendientes = async () => {
    renderDrafts();
    await openFirstDraft();
    const ed = mainEditor()!;
    act(() => { ed.commands.setContent('<p>cambios al abandonar</p>', { emitUpdate: true }); });
    return ed;
  };

  it('TOKEN_REFRESHED: el flush de emergencia envía el token rotado, no el de montaje', async () => {
    await abrirConCambiosPendientes();
    // Rotación de GoTrue ocurrida con la pestaña abierta (autosave normal
    // leyó getSession() fresco; el ref local era el token del mount 'tok').
    authState.emit('TOKEN_REFRESHED', 'tok-rotado');
    fireEvent(window, new Event('beforeunload'));
    const [flush] = await waitFor(() => {
      const calls = flushCalls();
      expect(calls).toHaveLength(1);
      return calls;
    }, { timeout: 3000, interval: 50 });
    expect(String(flush[0])).toContain('/api/ai/cases/w1/drafts/d1');
    // Defecto previo: Authorization era 'Bearer tok' (caducado) → 401 silencioso.
    expect(flushAuthorization(flush)).toBe('Bearer tok-rotado');
    expect(JSON.parse(String(flush[1].body)).origin).toBe('autosave');
  }, 20000);

  it('SIGNED_OUT: sin sesión no se envía PUT de emergencia', async () => {
    await abrirConCambiosPendientes();
    authState.emit('SIGNED_OUT', null);
    fireEvent(window, new Event('beforeunload'));
    await new Promise((r) => setTimeout(r, 300));
    expect(flushCalls()).toHaveLength(0);
  }, 20000);

  it('fallo de red en el flush: best-effort sin crash y el autosave posterior sigue guardando', async () => {
    const baseFetch = fetchMock;
    fetchMock = vi.fn(async (url: string, opts?: RequestInit) => {
      if ((opts as RequestInit & { keepalive?: boolean })?.keepalive) throw new TypeError('network down');
      return baseFetch(url, opts);
    });
    (globalThis as unknown as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
    await abrirConCambiosPendientes();
    fireEvent(window, new Event('beforeunload'));
    // El intento SÍ ocurrió (diagnóstico del fallo), y su rechazo quedó contenido.
    await waitFor(() => expect(flushCalls()).toHaveLength(1), { timeout: 3000, interval: 50 });
    // Sin bloqueo permanente: el debounce pendiente guarda normalmente.
    await waitFor(() => expect(screen.getByTestId('save-status').textContent).toContain('Guardado'), { timeout: 4000, interval: 50 });
    expect(mainEditor()!.getHTML()).toContain('cambios al abandonar');
  }, 20000);

  it('abandonar la página sin cambios pendientes: ningún PUT de emergencia', async () => {
    renderDrafts();
    await openFirstDraft();
    await new Promise((r) => setTimeout(r, 300));
    fireEvent(window, new Event('beforeunload'));
    await new Promise((r) => setTimeout(r, 300));
    expect(flushCalls()).toHaveLength(0);
  }, 20000);
});

// FASE 4.62D.32 — recuperación de contenido: 'dirty' no es el único estado
// donde el editor contiene texto más nuevo que el servidor. Tras un guardado
// fallido (error) o un conflicto OCC (conflict), abrir otro borrador debe
// exigir la misma resolución explícita, y el flush de emergencia debe
// intentarlo mientras la base_revision siga siendo válida.
describe('FASE 4.62D.32 recuperación tras fallo y conflicto: el texto local exige resolución explícita', () => {
  const A_ID = 'dA';
  const B_ID = 'dB';
  const TITLE_A = 'Contestación revisión alta';
  const TITLE_B = 'Carta revisión baja';
  const draftA = makeDraft({ id: A_ID, title: TITLE_A, revision: 1, content: '# TextoA\n\nPárrafo alto de A.' });
  const draftB = makeDraft({ id: B_ID, title: TITLE_B, revision: 1, content: '# TextoB\n\nPárrafo bajo de B.' });
  const LOCAL_HTML = '<p>texto crítico no guardado</p>';

  beforeEach(() => {
    const byId: Record<string, unknown> = { [A_ID]: draftA, [B_ID]: draftB };
    fetchMock = vi.fn(async (url: string, opts?: RequestInit) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/ai/usage')) {
        return { ok: true, json: async () => ({ allowance: usageAllowance }) } as Response;
      }
      if (opts?.method === 'PUT') {
        if (putFailure) {
          const fail = putFailure;
          return { ok: false, status: fail.status, json: async () => fail.body } as unknown as Response;
        }
        const body = JSON.parse(String(opts?.body ?? '{}')) as { content?: string; base_revision?: number };
        return {
          ok: true,
          json: async () => ({ draft: makeDraft({ content: body.content ?? '', content_format: 'html', revision: (body.base_revision ?? 1) + 1 }) }),
        } as Response;
      }
      if (/\/drafts\/[^/]+\/versions\/\d+$/.test(urlStr)) {
        return { ok: true, json: async () => ({ version: versionDetail }) } as Response;
      }
      if (/\/drafts\/[^/]+\/versions$/.test(urlStr)) {
        return { ok: true, json: async () => ({ versions: versionsPayload }) } as Response;
      }
      if (/\/drafts\/[^/]+$/.test(urlStr)) {
        const m = urlStr.match(/\/drafts\/([^/?]+)$/) as RegExpMatchArray;
        return { ok: true, json: async () => ({ draft: byId[m[1]] ?? draftA }) } as Response;
      }
      return { ok: true, json: async () => ({ drafts: [draftA, draftB] }) } as Response;
    });
    (globalThis as unknown as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
  });

  const abrirAConFallo = async (failure: { status: number; body: Record<string, unknown>; statusLabel?: string }) => {
    putFailure = failure;
    renderDrafts();
    fireEvent.click(await screen.findByText(TITLE_A));
    await screen.findByText(/Párrafo alto de A\./);
    const ed = mainEditor()!;
    act(() => { ed.commands.setContent(LOCAL_HTML, { emitUpdate: true }); });
    await screen.findByText(failure.statusLabel ?? 'Error al guardar', {}, { timeout: 4000, interval: 50 });
    putFailure = null;
  };
  const flushCalls = (): ApiCall[] =>
    (fetchMock.mock.calls as unknown[][]).filter((c) => (c[1] as RequestInit).keepalive === true) as ApiCall[];

  it('1. 500 → abrir otro borrador: exige resolución explícita y conserva el texto local', async () => {
    await abrirAConFallo({ status: 500, body: { error: 'No se pudo guardar el borrador.' } });
    fireEvent.click((await screen.findAllByText(TITLE_B))[0]);
    expect(await screen.findByText(/Tienes cambios sin guardar en Contestación revisión alta/)).toBeTruthy();
    expect(screen.getByText('Guardar y abrir')).toBeTruthy();
    expect(screen.getByText('Descartar cambios y abrir')).toBeTruthy();
    expect(mainEditor()!.getHTML()).toContain('texto crítico no guardado');
  }, 20000);

  it('2. 409 conflicts panel → abrir otro borrador: exige resolución explícita (texto local único)', async () => {
    await abrirAConFallo({
      status: 409,
      body: { error: 'El documento cambió en otro dispositivo o pestaña.', code: 'AI_DRAFT_REVISION_CONFLICT', current_revision: 5 },
      statusLabel: 'Cambios en conflicto',
    });
    // El panel de conflicto con sus 3 salidas es visible e invita a resolver:
    // ningún clic lateral está autorizado a descartar el texto sin confirmación.
    expect(await screen.findByText(/tú decides qué pasa/)).toBeTruthy();
    fireEvent.click((await screen.findAllByText(TITLE_B))[0]);
    expect(await screen.findByText(/Tienes cambios sin guardar en Contestación revisión alta/)).toBeTruthy();
    expect(mainEditor()!.getHTML()).toContain('texto crítico no guardado');
  }, 20000);

  it('3. 500 → cerrar la pestaña: el flush de emergencia intenta persistir con base_revision aún válida', async () => {
    await abrirAConFallo({ status: 500, body: { error: 'No se pudo guardar el borrador.' } });
    fireEvent(window, new Event('beforeunload'));
    await waitFor(() => expect(flushCalls()).toHaveLength(1), { timeout: 3000, interval: 50 });
    const body = putBody(flushCalls()[0]);
    expect(body.base_revision).toBe(1);
    expect(String(body.content)).toContain('texto crítico');
  }, 20000);

  it('4. Guardar y abrir tras un 500: cuando el guardado luego resulta, el destino se abre', async () => {
    await abrirAConFallo({ status: 500, body: { error: 'No se pudo guardar el borrador.' } });
    fireEvent.click((await screen.findAllByText(TITLE_B))[0]);
    fireEvent.click(await screen.findByText('Guardar y abrir'));
    await screen.findByText(/Párrafo bajo de B\./);
    expect(mainEditor()!.getHTML()).toContain('Párrafo bajo de B.');
    expect(mainEditor()!.getHTML()).not.toContain('texto crítico');
  }, 20000);
});

// FASE 4.62D.33 — ventana 'saving': un PUT en vuelo también contiene el
// contenido local exclusivo mientras no confirme el servidor. Cambiar de
// borrador en esa ventana sin resolución explícita expone el texto si el
// vuelo termina en fallo. Deferred promise (holdPutGate) congela el vuelo
// de forma determinista, sin sleeps arbitrarios.
describe('FASE 4.62D.33 switch durante guardado en curso: el texto local no se descarta', () => {
  const A_ID = 'dA';
  const B_ID = 'dB';
  const TITLE_A = 'Contestación revisión alta';
  const TITLE_B = 'Carta revisión baja';
  const draftA = makeDraft({ id: A_ID, title: TITLE_A, revision: 1, content: '# TextoA\n\nPárrafo alto de A.' });
  const draftB = makeDraft({ id: B_ID, title: TITLE_B, revision: 1, content: '# TextoB\n\nPárrafo bajo de B.' });
  const LOCAL_HTML = '<p>texto en vuelo no confirmado</p>';
  let gateRelease: (() => void) | null = null;
  let putNetworkFail = false;

  beforeEach(() => {
    const byId: Record<string, unknown> = { [A_ID]: draftA, [B_ID]: draftB };
    gateRelease = null;
    putNetworkFail = false;
    fetchMock = vi.fn(async (url: string, opts?: RequestInit) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/ai/usage')) {
        return { ok: true, json: async () => ({ allowance: usageAllowance }) } as Response;
      }
      if (opts?.method === 'PUT') {
        if (holdPutGate) {
          const gate = holdPutGate;
          holdPutGate = null;
          await gate;
        }
        if (putNetworkFail) throw new TypeError('network down');
        if (putFailure) {
          const fail = putFailure;
          return { ok: false, status: fail.status, json: async () => fail.body } as unknown as Response;
        }
        const body = JSON.parse(String(opts?.body ?? '{}')) as { content?: string; base_revision?: number };
        return {
          ok: true,
          json: async () => ({ draft: makeDraft({ content: body.content ?? '', content_format: 'html', revision: (body.base_revision ?? 1) + 1 }) }),
        } as Response;
      }
      if (/\/drafts\/[^/]+\/versions\/\d+$/.test(urlStr)) {
        return { ok: true, json: async () => ({ version: versionDetail }) } as Response;
      }
      if (/\/drafts\/[^/]+\/versions$/.test(urlStr)) {
        return { ok: true, json: async () => ({ versions: versionsPayload }) } as Response;
      }
      if (/\/drafts\/[^/]+$/.test(urlStr)) {
        const m = urlStr.match(/\/drafts\/([^/?]+)$/) as RegExpMatchArray;
        return { ok: true, json: async () => ({ draft: byId[m[1]] ?? draftA }) } as Response;
      }
      return { ok: true, json: async () => ({ drafts: [draftA, draftB] }) } as Response;
    });
    (globalThis as unknown as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
  });

  // Vuelo congelado: PUT pendiente congelado con deferred promise.
  const abrirAConVuelo = async () => {
    renderDrafts();
    fireEvent.click(await screen.findByText(TITLE_A));
    await screen.findByText(/Párrafo alto de A\./);
    holdPutGate = new Promise<void>((r) => { gateRelease = r; });
    const ed = mainEditor()!;
    act(() => { ed.commands.setContent(LOCAL_HTML, { emitUpdate: true }); });
    await screen.findByText('Guardando…', {}, { timeout: 4000, interval: 50 });
  };
  const panelDeResolucion = async () => {
    fireEvent.click((await screen.findAllByText(TITLE_B))[0]);
    await screen.findByText(/Tienes cambios sin guardar en Contestación revisión alta/);
    expect(screen.getByText('Guardar y abrir')).toBeTruthy();
    expect(screen.getByText('Descartar cambios y abrir')).toBeTruthy();
    expect(mainEditor()!.getHTML()).toContain('texto en vuelo no confirmado');
  };

  it('1. A. PUT pendiente + intento de abrir B: resolución explícita, texto local intacto', async () => {
    await abrirAConVuelo();
    await panelDeResolucion();
    gateRelease?.();
  }, 20000);

  it('2. B. PUT pendiente termina en 500: A conserva el texto y B no se abre', async () => {
    await abrirAConVuelo();
    await panelDeResolucion();
    putFailure = { status: 500, body: { error: 'No se pudo guardar el borrador.' } };
    gateRelease?.();
    await screen.findByText('Error al guardar', {}, { timeout: 4000, interval: 50 });
    expect(mainEditor()!.getHTML()).toContain('texto en vuelo no confirmado');
    expect(screen.queryByText(/Párrafo bajo de B\./)).toBeNull();
    expect(screen.getByText(/Tienes cambios sin guardar/)).toBeTruthy();
    expect(screen.getByText('Guardar y abrir')).toBeTruthy();
  }, 20000);

  it('3. C. PUT pendiente falla por red: A conserva el texto con recuperaciones explícitas', async () => {
    await abrirAConVuelo();
    await panelDeResolucion();
    putNetworkFail = true;
    gateRelease?.();
    await screen.findByText('Error al guardar', {}, { timeout: 4000, interval: 50 });
    expect(mainEditor()!.getHTML()).toContain('texto en vuelo no confirmado');
    expect(screen.queryByText(/Párrafo bajo de B\./)).toBeNull();
    expect(screen.getByText(/Tienes cambios sin guardar/)).toBeTruthy();
    expect(screen.getByText('Descartar cambios y abrir')).toBeTruthy();
  }, 20000);

  it('4. D. PUT pendiente termina en 409: contenido local conservado, sin navegación silenciosa a B', async () => {
    await abrirAConVuelo();
    await panelDeResolucion();
    putFailure = { status: 409, body: { error: 'El documento cambió en otro dispositivo o pestaña.', code: 'AI_DRAFT_REVISION_CONFLICT', current_revision: 2 }, statusLabel: 'Cambios en conflicto' };
    gateRelease?.();
    await screen.findByText('Cambios en conflicto', {}, { timeout: 4000, interval: 50 });
    expect(await screen.findByText(/tú decides qué pasa/)).toBeTruthy();
    expect(mainEditor()!.getHTML()).toContain('texto en vuelo no confirmado');
    expect(screen.queryByText(/Párrafo bajo de B\./)).toBeNull();
  }, 20000);

  it('5. E. PUT pendiente termina en éxito: Guardado confirmado, sin navegación automática; destino solo por Guardar y abrir', async () => {
    await abrirAConVuelo();
    await panelDeResolucion();
    gateRelease?.();
    await screen.findByText('Guardado', {}, { timeout: 4000, interval: 50 });
    expect(mainEditor()!.getHTML()).toContain('texto en vuelo no confirmado');
    expect(screen.queryByText(/Párrafo bajo de B\./)).toBeNull();
    expect(screen.getByText(/Tienes cambios sin guardar/)).toBeTruthy();
    fireEvent.click(screen.getByText('Guardar y abrir'));
    await screen.findByText(/Párrafo bajo de B\./);
    expect(mainEditor()!.getHTML()).toContain('Párrafo bajo de B.');
  }, 20000);

  it('6. F. Descartar y abrir: puerta única del descarte, sin PUT accidental tras la acción', async () => {
    await abrirAConVuelo();
    await panelDeResolucion();
    const putsAlVuelo = putCalls().length;
    expect(putsAlVuelo).toBe(1);
    fireEvent.click(screen.getByText('Descartar cambios y abrir'));
    await screen.findByText(/Párrafo bajo de B\./);
    gateRelease?.();
    await new Promise((r) => setTimeout(r, 300));
    expect(putCalls().length).toBe(putsAlVuelo);
    expect(mainEditor()!.getHTML()).toContain('Párrafo bajo de B.');
  }, 20000);
});

// FASE 4.62D.34 — cierre del editor: closeDraft desmontaba el editor sin
// advertir contenido no confirmado en el servidor (dirty/saving/error/
// conflict). La matriz A–H prueba el flujo de resolución explícita:
// Seguir editando / Guardar y cerrar / Descartar y cerrar.
describe('FASE 4.62D.34 cierre del editor no descarta contenido sin confirmación', () => {
  const A_ID34 = 'dA';
  const B_ID34 = 'dB';
  const TITLE_A34 = 'Contestación revisión alta';
  const TITLE_B34 = 'Carta revisión baja';
  const draftA34 = makeDraft({ id: A_ID34, title: TITLE_A34, revision: 1, content: '# TextoA\n\nPárrafo alto de A.' });
  const draftB34 = makeDraft({ id: B_ID34, title: TITLE_B34, revision: 1, content: '# TextoB\n\nPárrafo bajo de B.' });
  const LOCAL_HTML34 = '<p>cierre con texto en vuelo</p>';
  let gateRelease34: (() => void) | null = null;

  beforeEach(() => {
    const byId: Record<string, unknown> = { [A_ID34]: draftA34, [B_ID34]: draftB34 };
    gateRelease34 = null;
    fetchMock = vi.fn(async (url: string, opts?: RequestInit) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/ai/usage')) {
        return { ok: true, json: async () => ({ allowance: usageAllowance }) } as Response;
      }
      if (opts?.method === 'PUT') {
        if (holdPutGate) {
          const gate = holdPutGate;
          holdPutGate = null;
          await gate;
        }
        if (putFailure) {
          const fail = putFailure;
          return { ok: false, status: fail.status, json: async () => fail.body } as unknown as Response;
        }
        const body = JSON.parse(String(opts?.body ?? '{}')) as { content?: string; base_revision?: number };
        return {
          ok: true,
          json: async () => ({ draft: makeDraft({ content: body.content ?? '', content_format: 'html', revision: (body.base_revision ?? 1) + 1 }) }),
        } as Response;
      }
      if (/\/drafts\/[^/]+\/versions\/\d+$/.test(urlStr)) {
        return { ok: true, json: async () => ({ version: versionDetail }) } as Response;
      }
      if (/\/drafts\/[^/]+\/versions$/.test(urlStr)) {
        return { ok: true, json: async () => ({ versions: versionsPayload }) } as Response;
      }
      if (/\/drafts\/[^/]+$/.test(urlStr)) {
        const m = urlStr.match(/\/drafts\/([^/?]+)$/) as RegExpMatchArray;
        return { ok: true, json: async () => ({ draft: byId[m[1]] ?? draftA34 }) } as Response;
      }
      return { ok: true, json: async () => ({ drafts: [draftA34, draftB34] }) } as Response;
    });
    (globalThis as unknown as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
  });

  const abrirA34 = async () => {
    renderDrafts();
    fireEvent.click(await screen.findByText(TITLE_A34));
    await screen.findByText(/Párrafo alto de A\./);
  };
  const panelDeCierre = async () => {
    fireEvent.click(screen.getByText('Cerrar'));
    await screen.findByText(/Tienes cambios sin guardar en Contestación revisión alta/);
    expect(await screen.findByText('Seguir editando')).toBeTruthy();
    expect(screen.getByText('Guardar y cerrar')).toBeTruthy();
    expect(screen.getByText('Descartar y cerrar')).toBeTruthy();
    expect(screen.getByTestId('draft-editor-pane')).toBeTruthy();
    expect(mainEditor()!.getHTML()).toContain('cierre con texto en vuelo');
  };

  it('1. dirty: Cerrar no desmonta y exige resolución explícita', async () => {
    await abrirA34();
    act(() => { mainEditor()!.commands.setContent(LOCAL_HTML34, { emitUpdate: true }); });
    await panelDeCierre();
  }, 20000);

  it('2. dirty: Guardar y cerrar confirma el contenido y vuelve a la lista', async () => {
    await abrirA34();
    act(() => { mainEditor()!.commands.setContent(LOCAL_HTML34, { emitUpdate: true }); });
    fireEvent.click(screen.getByText('Cerrar'));
    await screen.findByText('Guardar y cerrar', {}, { timeout: 4000, interval: 50 });
    fireEvent.click(screen.getByText('Guardar y cerrar'));
    await screen.findByText(TITLE_A34, {}, { timeout: 4000, interval: 50 });
    expect(screen.getByText('Editor de borrador')).toBeTruthy();
    await waitFor(() => expect(putCalls()).toHaveLength(1), { timeout: 3000, interval: 50 });
    expect(putBody(putCalls()[0]).base_revision).toBe(1);
    expect(putBody(putCalls()[0]).content).toContain('cierre con texto en vuelo');
  }, 20000);

  it('3. saving en vuelo: Guardar y cerrar se une al PUT y cierra al confirmar el éxito', async () => {
    await abrirA34();
    holdPutGate = new Promise<void>((r) => { gateRelease34 = r; });
    act(() => { mainEditor()!.commands.setContent(LOCAL_HTML34, { emitUpdate: true }); });
    await screen.findByText('Guardando…', {}, { timeout: 4000, interval: 50 });
    fireEvent.click(screen.getByText('Cerrar'));
    await screen.findByText('Guardar y cerrar', {}, { timeout: 4000, interval: 50 });
    fireEvent.click(screen.getByText('Guardar y cerrar'));
    gateRelease34?.();
    await screen.findByText(TITLE_A34, {}, { timeout: 4000, interval: 50 });
    expect(screen.getByText('Editor de borrador')).toBeTruthy();
    expect(putCalls()).toHaveLength(1);
  }, 20000);

  it('4. saving en vuelo que fracasa en 500: el cierre no avanza, A conserva el texto', async () => {
    await abrirA34();
    holdPutGate = new Promise<void>((r) => { gateRelease34 = r; });
    act(() => { mainEditor()!.commands.setContent(LOCAL_HTML34, { emitUpdate: true }); });
    await screen.findByText('Guardando…', {}, { timeout: 4000, interval: 50 });
    fireEvent.click(screen.getByText('Cerrar'));
    await screen.findByText('Guardar y cerrar', {}, { timeout: 4000, interval: 50 });
    fireEvent.click(screen.getByText('Guardar y cerrar'));
    putFailure = { status: 500, body: { error: 'No se pudo guardar el borrador.' } };
    gateRelease34?.();
    await screen.findByText('Error al guardar', {}, { timeout: 4000, interval: 50 });
    expect(screen.queryByTestId('draft-editor-pane')).toBeTruthy();
    expect(mainEditor()!.getHTML()).toContain('cierre con texto en vuelo');
    expect(screen.getByText('Descartar y cerrar')).toBeTruthy();
  }, 20000);

  it('5. error previo: Cerrar ofrece resolución y Descartar y cerrar limpia sin PUT extra', async () => {
    putFailure = { status: 500, body: { error: 'No se pudo guardar el borrador.' } };
    await abrirA34();
    act(() => { mainEditor()!.commands.setContent(LOCAL_HTML34, { emitUpdate: true }); });
    await screen.findByText('Error al guardar', {}, { timeout: 4000, interval: 50 });
    putFailure = null;
    fireEvent.click(screen.getByText('Cerrar'));
    fireEvent.click(screen.getByText('Descartar y cerrar'));
    await screen.findByText(TITLE_A34);
    expect(screen.getByText('Editor de borrador')).toBeTruthy();
    expect(putCalls()).toHaveLength(1);
  }, 20000);

  it('6. conflict: Cerrar no descarta; Guardar y cerrar sin force mantiene el 409; solo el descarte cierra', async () => {
    await abrirA34();
    putFailure = { status: 409, body: { error: 'El documento cambió en otro dispositivo o pestaña.', code: 'AI_DRAFT_REVISION_CONFLICT', current_revision: 3 }, statusLabel: 'Cambios en conflicto' };
    act(() => { mainEditor()!.commands.setContent(LOCAL_HTML34, { emitUpdate: true }); });
    await screen.findByText('Cambios en conflicto', {}, { timeout: 4000, interval: 50 });
    fireEvent.click(screen.getByText('Cerrar'));
    fireEvent.click(screen.getByText('Guardar y cerrar'));
    await screen.findByText(/tú decides qué pasa/, {}, { timeout: 4000, interval: 50 });
    await waitFor(() => expect(putCalls()).toHaveLength(2), { timeout: 3000, interval: 50 });
    // Sin fuerza: la nota "no asumir" sobre la revisión del servidor.
    expect(putBody(putCalls()[1]).force).not.toBe(true);
    expect(screen.queryByText('Editor de borrador')).toBeNull();
    expect(mainEditor()!.getHTML()).toContain('cierre con texto en vuelo');
    fireEvent.click(screen.getByText('Descartar y cerrar'));
    await screen.findByText(TITLE_A34);
    expect(screen.getByText('Editor de borrador')).toBeTruthy();
  }, 20000);

  it('7. saved e idle: cierre directo sin panel y sin PUT extra', async () => {
    // idle sin ediciones.
    await abrirA34();
    fireEvent.click(screen.getByText('Cerrar'));
    await screen.findByText(TITLE_A34);
    expect(screen.getByText('Editor de borrador')).toBeTruthy();
    expect(putCalls()).toHaveLength(0);
    // saved tras un PUT confirmado.
    fireEvent.click(await screen.findByText(TITLE_A34));
    await screen.findByText(/Párrafo alto de A\./);
    act(() => { mainEditor()!.commands.setContent('<p>boceto guardado</p>', { emitUpdate: true }); });
    await screen.findByText('Guardado', {}, { timeout: 4000, interval: 50 });
    fireEvent.click(screen.getByText('Cerrar'));
    await screen.findByText(TITLE_A34);
    expect(screen.getByText('Editor de borrador')).toBeTruthy();
    expect(putCalls()).toHaveLength(1);
  }, 20000);

  it('8. cancelar: Seguir editando conserva el editor y el autosave persiste el texto', async () => {
    await abrirA34();
    act(() => { mainEditor()!.commands.setContent(LOCAL_HTML34, { emitUpdate: true }); });
    fireEvent.click(screen.getByText('Cerrar'));
    await panelDeCierre();
    fireEvent.click(screen.getByText('Seguir editando'));
    expect(screen.queryByText('Guardar y cerrar')).toBeNull();
    expect(screen.getByTestId('draft-editor-pane')).toBeTruthy();
    await waitFor(() => expect(putBody(putCalls()[0]).content).toContain('cierre con texto en vuelo'), { timeout: 3000, interval: 50 });
    expect(screen.getByTestId('draft-editor-pane')).toBeTruthy();
  }, 20000);

  it('9. descarte con PUT en vuelo: la respuesta tardía no contamina la lista ni otro borrador', async () => {
    await abrirA34();
    holdPutGate = new Promise<void>((r) => { gateRelease34 = r; });
    act(() => { mainEditor()!.commands.setContent(LOCAL_HTML34, { emitUpdate: true }); });
    await screen.findByText('Guardando…', {}, { timeout: 4000, interval: 50 });
    fireEvent.click(screen.getByText('Cerrar'));
    await screen.findByText('Guardar y cerrar', {}, { timeout: 4000, interval: 50 });
    fireEvent.click(screen.getByText('Descartar y cerrar'));
    await screen.findByText(TITLE_A34);
    gateRelease34?.();
    await new Promise((r) => setTimeout(r, 300));
    expect(putCalls()).toHaveLength(1);
    expect(screen.queryByText(/Tienes cambios sin guardar/)).toBeNull();
    // La lista sigue usable: abrir B funciona tras la respuesta tardía.
    fireEvent.click((await screen.findAllByText(TITLE_B34))[0]);
    await screen.findByText(/Párrafo bajo de B\./);
    act(() => { mainEditor()!.commands.setContent('<p>edición de B después del descarte</p>', { emitUpdate: true }); });
    await waitFor(() => expect(putCalls()).toHaveLength(2), { timeout: 3000, interval: 50 });
    expect(putBody(putCalls().find((c) => String(c[0]).includes(`/drafts/${B_ID34}`))!).base_revision).toBe(1);
  }, 20000);

  it('A1. PUT de A confirma mientras un debounce rescata edición posterior: Cerrar no descarta el texto vivo', async () => {
    await abrirA34();
    holdPutGate = new Promise<void>((r) => { gateRelease34 = r; });
    act(() => { mainEditor()!.commands.setContent('<p>primer borrador guardado</p>', { emitUpdate: true }); });
    await waitFor(() => expect(putCalls()).toHaveLength(1), { timeout: 3000, interval: 50 });
    // Edición durante el vuelo: scheduleSave marca dirty y arma el debounce.
    act(() => { mainEditor()!.commands.setContent('<p>edición posterior no confirmada</p>', { emitUpdate: true }); });
    gateRelease34?.();
    await screen.findByText('Guardado', {}, { timeout: 4000, interval: 50 });
    // statusRef quedó 'saved' con el debounce de la edición posterior vigente.
    fireEvent.click(screen.getByText('Cerrar'));
    // El gate de cierre exige HTML vivo === confirmado, no solo 'saved'.
    await screen.findByText('Guardar y cerrar', {}, { timeout: 4000, interval: 50 });
    expect(mainEditor()!.getHTML()).toContain('edición posterior no confirmada');
    fireEvent.click(screen.getByText('Guardar y cerrar'));
    await screen.findByText(TITLE_A34, {}, { timeout: 4000, interval: 50 });
    expect(screen.getByText('Editor de borrador')).toBeTruthy();
    await waitFor(() => expect(putCalls()).toHaveLength(2), { timeout: 3000, interval: 50 });
    expect(putBody(putCalls()[1]).content).toContain('edición posterior no confirmada');
  }, 20000);

  it('A2. cambiar de borrador desde el panel de cierre no arrastra el panel ni su identidad a B', async () => {
    await abrirA34();
    act(() => { mainEditor()!.commands.setContent(LOCAL_HTML34, { emitUpdate: true }); });
    fireEvent.click(screen.getByText('Cerrar'));
    await screen.findByText('Guardar y cerrar', {}, { timeout: 4000, interval: 50 });
    // Transición real permitida: desde el panel de cierre el usuario elige
    // otro borrador: aparece el gate de pendingSwitch (dirty) y el descarte
    // y apertura limpia también el panel de cierre.
    fireEvent.click((await screen.findAllByText(TITLE_B34))[0]);
    // Cierre pendiente y switch conviven en A; ambos paneles muestran el
    // mismo titular: basta con que el gate esté presente.
    await screen.findAllByText(/Tienes cambios sin guardar en Contestación revisión alta/);
    fireEvent.click(screen.getByText('Descartar cambios y abrir'));
    // B abre limpio: el panel de cierre de A no persiste sobre el nuevo.
    await screen.findByText(/Párrafo bajo de B\./);
    expect(screen.queryByText('Guardar y cerrar')).toBeNull();
    expect(screen.queryByText(/Tienes cambios sin guardar en Carta revisión baja/)).toBeNull();
    // El B abierto sigue operativo: autosave normal, base 1.
    holdPutGate = new Promise<void>((r) => { gateRelease34 = r; });
    act(() => { mainEditor()!.commands.setContent('<p>edición de B tras el cambio de panel</p>', { emitUpdate: true }); });
    await screen.findByText('Guardando…', {}, { timeout: 4000, interval: 50 });
    gateRelease34?.();
    await screen.findByText('Guardado', {}, { timeout: 4000, interval: 50 });
    expect(mainEditor()!.getHTML()).toContain('edición de B tras el cambio de panel');
    expect(putCalls()).toHaveLength(1);
    expect(putBody(putCalls().find((c) => String(c[0]).includes(`/drafts/${B_ID34}`))!).base_revision).toBe(1);
  }, 20000);
});

// FASE 4.62D.35 — flush de emergencia al desmontar el editor. Los handlers de
// salida (unmount, beforeunload, pagehide) reutilizan un helper con
// deduplicación por (borrador, contenido, revisión). Mitigación best-effort:
// las pruebas afirman SOLO el comportamiento de handlers y mocks, no que un
// navegador real garantice la entrega de la petición.
describe('FASE 4.62D.35 flush de emergencia al desmontar el editor', () => {
  const A_ID35 = 'dA';
  const B_ID35 = 'dB';
  const TITLE_A35 = 'Salida revisión alta';
  const TITLE_B35 = 'Salida revisión baja';
  const draftA35 = makeDraft({ id: A_ID35, title: TITLE_A35, revision: 1, content: '# SalidaA\n\nPárrafo alto de A.' });
  const draftB35 = makeDraft({ id: B_ID35, title: TITLE_B35, revision: 1, content: '# SalidaB\n\nPárrafo bajo de B.' });
  const LOCAL_HTML35 = '<p>texto de salida no confirmado</p>';
  let gateRelease35: (() => void) | null = null;

  beforeEach(() => {
    const byId: Record<string, unknown> = { [A_ID35]: draftA35, [B_ID35]: draftB35 };
    gateRelease35 = null;
    fetchMock = vi.fn(async (url: string, opts?: RequestInit) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/ai/usage')) {
        return { ok: true, json: async () => ({ allowance: usageAllowance }) } as Response;
      }
      if (opts?.method === 'PUT') {
        if (holdPutGate) {
          const gate = holdPutGate;
          holdPutGate = null;
          await gate;
        }
        if (putFailure) {
          const fail = putFailure;
          return { ok: false, status: fail.status, json: async () => fail.body } as unknown as Response;
        }
        const body = JSON.parse(String(opts?.body ?? '{}')) as { content?: string; base_revision?: number };
        return {
          ok: true,
          json: async () => ({ draft: makeDraft({ content: body.content ?? '', content_format: 'html', revision: (body.base_revision ?? 1) + 1 }) }),
        } as Response;
      }
      if (/\/drafts\/[^/]+\/versions\/\d+$/.test(urlStr)) {
        return { ok: true, json: async () => ({ version: versionDetail }) } as Response;
      }
      if (/\/drafts\/[^/]+\/versions$/.test(urlStr)) {
        return { ok: true, json: async () => ({ versions: versionsPayload }) } as Response;
      }
      if (/\/drafts\/[^/]+$/.test(urlStr)) {
        const m = urlStr.match(/\/drafts\/([^/?]+)$/) as RegExpMatchArray;
        return { ok: true, json: async () => ({ draft: byId[m[1]] ?? draftA35 }) } as Response;
      }
      return { ok: true, json: async () => ({ drafts: [draftA35, draftB35] }) } as Response;
    });
    (globalThis as unknown as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
  });

  const flushCalls = (): ApiCall[] =>
    (fetchMock.mock.calls as unknown[][]).filter((c) => (c[1] as RequestInit).keepalive === true) as ApiCall[];
  const abrirA35 = async () => {
    renderDrafts();
    fireEvent.click(await screen.findByText(TITLE_A35));
    await screen.findByText(/Párrafo alto de A\./);
  };

  it('1. dirty + desmontaje: un solo flush con HTML vivo y keepalive, sin autosave tardío', async () => {
    const { unmount } = renderDrafts();
    fireEvent.click(await screen.findByText(TITLE_A35));
    await screen.findByText(/Párrafo alto de A\./);
    act(() => { mainEditor()!.commands.setContent(LOCAL_HTML35, { emitUpdate: true }); });
    unmount();
    expect(flushCalls()).toHaveLength(1);
    const [url, opts] = flushCalls()[0];
    expect(String(url)).toContain('/api/ai/cases/w1/drafts/dA');
    expect((opts as RequestInit & { keepalive?: boolean }).keepalive).toBe(true);
    const body = putBody(flushCalls()[0]);
    expect(body.content).toBe(LOCAL_HTML35);
    expect(body.base_revision).toBe(1);
    expect(body.origin).toBe('autosave');
    // El debounce pendiente quedó cancelado: el flush es el único PUT.
    expect(putCalls()).toHaveLength(1);
  }, 20000);

  it('2. error + desmontaje: intento best-effort con el contenido sin confirmar', async () => {
    putFailure = { status: 500, body: { error: 'No se pudo guardar el borrador.' } };
    const { unmount } = renderDrafts();
    fireEvent.click(await screen.findByText(TITLE_A35));
    await screen.findByText(/Párrafo alto de A\./);
    act(() => { mainEditor()!.commands.setContent(LOCAL_HTML35, { emitUpdate: true }); });
    await screen.findByText('Error al guardar', {}, { timeout: 4000, interval: 50 });
    putFailure = null;
    unmount();
    expect(flushCalls()).toHaveLength(1);
    const body = putBody(flushCalls()[0]);
    expect(body.content).toBe(LOCAL_HTML35);
    expect(body.base_revision).toBe(1);
  }, 20000);

  it('3. conflict + desmontaje: ningún PUT con revisión obsoleta', async () => {
    const { unmount } = renderDrafts();
    fireEvent.click(await screen.findByText(TITLE_A35));
    await screen.findByText(/Párrafo alto de A\./);
    putFailure = { status: 409, body: { error: 'El documento cambió en otro dispositivo o pestaña.', code: 'AI_DRAFT_REVISION_CONFLICT', current_revision: 3 }, statusLabel: 'Cambios en conflicto' };
    act(() => { mainEditor()!.commands.setContent(LOCAL_HTML35, { emitUpdate: true }); });
    await screen.findByText('Cambios en conflicto', {}, { timeout: 4000, interval: 50 });
    unmount();
    expect(flushCalls()).toHaveLength(0);
    expect(putCalls()).toHaveLength(1);
  }, 20000);

  it('4. saving en vuelo + desmontaje: sin PUT duplicado y la respuesta tardía no añade flush', async () => {
    const { unmount } = renderDrafts();
    fireEvent.click(await screen.findByText(TITLE_A35));
    await screen.findByText(/Párrafo alto de A\./);
    holdPutGate = new Promise<void>((r) => { gateRelease35 = r; });
    act(() => { mainEditor()!.commands.setContent(LOCAL_HTML35, { emitUpdate: true }); });
    await screen.findByText('Guardando…', {}, { timeout: 4000, interval: 50 });
    unmount();
    expect(flushCalls()).toHaveLength(0);
    gateRelease35?.();
    await new Promise((r) => setTimeout(r, 300));
    expect(putCalls()).toHaveLength(1);
    expect(flushCalls()).toHaveLength(0);
  }, 20000);

  it('5. saved con HTML confirmado + desmontaje: ningún flush', async () => {
    const { unmount } = renderDrafts();
    fireEvent.click(await screen.findByText(TITLE_A35));
    await screen.findByText(/Párrafo alto de A\./);
    act(() => { mainEditor()!.commands.setContent(LOCAL_HTML35, { emitUpdate: true }); });
    await screen.findByText('Guardado', {}, { timeout: 4000, interval: 50 });
    unmount();
    expect(flushCalls()).toHaveLength(0);
    expect(putCalls()).toHaveLength(1);
  }, 20000);

  it('6. saved con debounce pendiente (carrera A1): flush aunque el estado sea Guardado', async () => {
    const { unmount } = renderDrafts();
    fireEvent.click(await screen.findByText(TITLE_A35));
    await screen.findByText(/Párrafo alto de A\./);
    holdPutGate = new Promise<void>((r) => { gateRelease35 = r; });
    act(() => { mainEditor()!.commands.setContent('<p>primer borrador guardado</p>', { emitUpdate: true }); });
    await waitFor(() => expect(putCalls()).toHaveLength(1), { timeout: 3000, interval: 50 });
    gateRelease35?.();
    await screen.findByText('Guardado', {}, { timeout: 4000, interval: 50 });
    // Edición posterior re-arma el debounce con contenido distinto del
    // confirmado; el desmontaje lo rescata con la revisión ya actualizada.
    act(() => { mainEditor()!.commands.setContent('<p>edición posterior no confirmada</p>', { emitUpdate: true }); });
    unmount();
    expect(flushCalls()).toHaveLength(1);
    const body = putBody(flushCalls()[0]);
    expect(body.content).toBe('<p>edición posterior no confirmada</p>');
    expect(body.base_revision).toBe(2);
  }, 20000);

  it('7. pagehide + beforeunload: deduplicación de la misma salida y liberación ante contenido nuevo', async () => {
    const { unmount } = renderDrafts();
    fireEvent.click(await screen.findByText(TITLE_A35));
    await screen.findByText(/Párrafo alto de A\./);
    act(() => { mainEditor()!.commands.setContent(LOCAL_HTML35, { emitUpdate: true }); });
    fireEvent(window, new Event('pagehide'));
    await waitFor(() => expect(flushCalls()).toHaveLength(1), { timeout: 3000, interval: 50 });
    fireEvent(window, new Event('beforeunload'));
    await new Promise((r) => setTimeout(r, 200));
    expect(flushCalls()).toHaveLength(1);
    // Un guardado normal posterior confirma LOCAL; la edición siguiente
    // (contenido nuevo, llave distinta) vuelve a permitir el flush.
    await waitFor(() => expect(screen.getByTestId('save-status').textContent).toContain('Guardado'), { timeout: 4000, interval: 50 });
    act(() => { mainEditor()!.commands.setContent('<p>segunda edición de salida</p>', { emitUpdate: true }); });
    unmount();
    expect(flushCalls()).toHaveLength(2);
    expect(putBody(flushCalls()[1]).content).toBe('<p>segunda edición de salida</p>');
  }, 20000);

  it('8. desmontajes de borradores distintos y listeners fuera de ciclo: sin contenido ajeno ni petición repetida', async () => {
    let unmountA = renderDrafts();
    fireEvent.click(await screen.findByText(TITLE_A35));
    await screen.findByText(/Párrafo alto de A\./);
    act(() => { mainEditor()!.commands.setContent(LOCAL_HTML35, { emitUpdate: true }); });
    unmountA.unmount();
    expect(flushCalls()).toHaveLength(1);
    expect(putBody(flushCalls()[0]).content).toBe(LOCAL_HTML35);
    // Evento de salida tras el unmount: el listener ya está desuscrito.
    fireEvent(window, new Event('beforeunload'));
    await new Promise((r) => setTimeout(r, 200));
    expect(flushCalls()).toHaveLength(1);
    // Nueva instancia con B sin ediciones: el desmontaje no reenvía contenido
    // del borrador antiguo A ni flush espurio de B.
    unmountA = renderDrafts();
    fireEvent.click((await screen.findByText(TITLE_B35)));
    await screen.findByText(/Párrafo bajo de B\./);
    unmountA.unmount();
    expect(flushCalls()).toHaveLength(1);
    expect(flushCalls()[0][0]).toContain(`/drafts/${A_ID35}`);
  }, 20000);
});

// — FASE 4.62E: paginación del historial de versiones —
describe('FASE 4.62E paginación del historial de versiones', () => {
  const meta = (no: number, origin = 'edit', created = '2026-09-02T00:00:00Z') => ({
    version_no: no, origin, content_format: 'html', model: null, title: 'Borrador de contestación', created_at: created,
  });

  it('muestra total, carga páginas anteriores anexadas y no duplica filas', async () => {
    versionsPayload = [meta(3), meta(2, 'autosave')];
    versionsTotalPayload = 3;
    olderVersionsPayload = [meta(1, 'generation')];
    renderDrafts();
    await openFirstDraft();
    await screen.findByText('Historial de versiones');
    expect(screen.getByText('Mostrando 2 de 3 versiones')).toBeTruthy();
    const loadMore = await screen.findByTestId('draft-versions-load-more');
    fireEvent.click(loadMore);
    // Fetched con cursor before=2 (la versión mínima mostrada antes de anexar).
    await waitFor(() => expect(
      (fetchMock.mock.calls as unknown[][]).some((c) => String(c[0]).includes('/versions?before=2'))
    ).toBe(true));
    // v3, v2, v1 presentes y SIN duplicados de ninguna.
    expect(screen.getAllByRole('button', { name: /(^|[^0-9])v3 ·/ }).length).toBe(1);
    expect(screen.getAllByRole('button', { name: /(^|[^0-9])v2 ·/ }).length).toBe(1);
    await screen.findByText(/v1 ·/);
    expect(screen.getAllByRole('button', { name: /(^|[^0-9])v1 ·/ }).length).toBe(1);
    // Unión completa: el texto de total desaparece al llegar al total.
    await waitFor(() => expect(screen.queryByText('Mostrando 2 de 3 versiones')).toBeNull());
    expect(screen.queryByTestId('draft-versions-load-more')).toBeNull();
  });

  it('fallo de la página anterior: error visible sin perder lo ya mostrado y reintento posible', async () => {
    versionsPayload = [meta(3), meta(2, 'autosave')];
    versionsTotalPayload = 4;
    olderVersionsPayload = [meta(1, 'generation')];
    olderVersionsFailure = true;
    renderDrafts();
    await openFirstDraft();
    fireEvent.click(await screen.findByTestId('draft-versions-load-more'));
    await screen.findByRole('alert');
    expect(screen.getByText('No se pudo abrir el historial.')).toBeTruthy();
    // v3 y v2 siguen listados tras el fallo.
    expect(screen.getAllByRole('button', { name: /(^|[^0-9])v3 ·/ }).length).toBe(1);
    // Reintento exitoso con la misma presión del usuario.
    olderVersionsFailure = false;
    fireEvent.click(screen.getByTestId('draft-versions-load-more'));
    await screen.findByText(/v1 ·/);
    expect(screen.getByText('Mostrando 3 de 4 versiones')).toBeTruthy();
  });

  it('cambio de borrador reinicia el historial paginado', async () => {
    const a = makeDraft({ id: 'a1', title: 'Borrador uno', content: 'Contenido uno.' });
    const b = makeDraft({ id: 'b2', title: 'Borrador dos', content: 'Contenido dos.', revision: 2 });
    versionsPayload = [meta(3), meta(2, 'autosave')];
    versionsTotalPayload = 5;
    olderVersionsPayload = [meta(1, 'generation')];
    fetchMock = vi.fn(async (url: string, opts?: RequestInit) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/ai/usage')) {
        return { ok: true, json: async () => ({ allowance: usageAllowance }) } as Response;
      }
      if (opts?.method === 'POST') {
        return { ok: true, json: async () => ({ draft: b, snapshot: { version: 1 } }) } as Response;
      }
      if (/\/drafts\/a1\/versions/.test(urlStr)) {
        if (urlStr.includes('before=')) {
          return { ok: true, json: async () => ({ versions: [meta(1, 'generation')], total_count: 3 }) } as Response;
        }
        return { ok: true, json: async () => ({ versions: [meta(3), meta(2, 'autosave')], total_count: 3 }) } as Response;
      }
      if (/\/drafts\/b2\/versions/.test(urlStr)) {
        if (urlStr.includes('before=')) {
          return { ok: true, json: async () => ({ versions: [meta(1, 'legacy', '2026-08-01T00:00:00Z')], total_count: 2 }) } as Response;
        }
        return { ok: true, json: async () => ({ versions: [meta(1, 'generation', '2026-08-01T00:00:00Z')], total_count: 2 }) } as Response;
      }
      if (/\/drafts\/[^/]+$/.test(urlStr)) {
        // Abrir: responder según el id pedido.
        return { ok: true, json: async () => ({ draft: urlStr.includes('/a1') ? a : b }) } as Response;
      }
      return { ok: true, json: async () => ({ drafts: [a, b] }) } as Response;
    });
    (globalThis as unknown as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
    renderDrafts();
    fireEvent.click(await screen.findByText('Borrador uno'));
    await screen.findByText(/Contenido uno\./);
    await screen.findByText('Mostrando 2 de 3 versiones');
    fireEvent.click(await screen.findByTestId('draft-versions-load-more'));
    await screen.findByText(/v1 ·/);
    // Historial completo: el aviso de paginación desaparece (igualdad de total).
    await waitFor(() => expect(screen.queryByText('Mostrando 3 de 3 versiones')).toBeNull());
    expect(screen.queryByTestId('draft-versions-load-more')).toBeNull();
    // Cambio al otro borrador: la paginación anexada se limpia.
    fireEvent.click(screen.getByText('Borrador dos'));
    await screen.findByText(/Contenido dos\./);
    await screen.findByText('Mostrando 1 de 2 versiones');
    expect(screen.queryByText('Mostrando 3 de 3 versiones')).toBeNull();
    expect(screen.queryByRole('button', { name: /(^|[^0-9])v2 ·/ })).toBeNull();
  });
});

// — FASE 4.62E.1: regresión del borde de paginación — combos guardado +
// páginas cargadas; el ancla de frontera impide omitir la fila mínima cuando
// el refetch de página 1 la expulsa del top-200.
describe('FASE 4.62E.1 borde de paginación con nuevos guardados', () => {
  const meta = (no: number, origin = 'edit', created = '2026-09-02T00:00:00Z') => ({
    version_no: no, origin, content_format: 'html', model: null, title: 'Borrador de contestación', created_at: created,
  });

  it('guardar tras cargar páginas anteriores no omite versiones en la unión (refetch de página 1 expulsa la frontera)', async () => {
    // Escenario miniatura del top-200: total=4; la "página 1" inicial es [3,2].
    // Tras el primer guardado el servidor expone v4 y el refetch de página 1
    // devuelve [4,3]: la frontera v2 sale del top simulado. Sin el ancla de
    // frontera, la unión sería [4,3,1] — v2 omitida. Con el ancla, unión
    // completa [4,3,2,1] sin duplicados.
    let page1 = [meta(3), meta(2, 'autosave')];
    versionsTotalPayload = 4;
    fetchMock = vi.fn(async (url: string, opts?: RequestInit) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/ai/usage')) {
        return { ok: true, json: async () => ({ allowance: usageAllowance }) } as Response;
      }
      if (opts?.method === 'PUT') {
        return {
          ok: true,
          // Al leer la respuesta del PUT el servidor ya publicó v4; el
          // componente invalida la query de versiones y el refetch de página 1
          // verá la ventana [4,3] (v2 expulsada).
          json: async () => {
            page1 = [meta(4), meta(3, 'edit')];
            return { draft: makeDraft({ content: '<p>guardado posterior</p>', content_format: 'html', revision: 3 }) };
          },
        } as Response;
      }
      if (/\/drafts\/[^/]+\/versions(\?.*|$)/.test(urlStr)) {
        if (urlStr.includes('before=')) {
          return { ok: true, json: async () => ({ versions: [meta(1, 'generation')], total_count: 4 }) } as Response;
        }
        return { ok: true, json: async () => ({ versions: [...page1], total_count: 4 }) } as Response;
      }
      if (/\/drafts\/[^/]+$/.test(urlStr)) {
        return { ok: true, json: async () => ({ draft: DRAFT }) } as Response;
      }
      return { ok: true, json: async () => ({ drafts: [DRAFT] }) } as Response;
    });
    (globalThis as unknown as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
    renderDrafts();
    await openFirstDraft();
    await screen.findByText('Mostrando 2 de 4 versiones');
    // Cargar anteriores: se ancla v2 (frontera) y llega v1.
    fireEvent.click(await screen.findByTestId('draft-versions-load-more'));
    await screen.findByText(/v1 ·/);
    expect(screen.getByText('Mostrando 3 de 4 versiones')).toBeTruthy();
    // Primer guardado: PUT dispara el refetch de página 1 → [4,3].
    const ed = mainEditor();
    expect(ed).toBeTruthy();
    act(() => { ed!.commands.setContent('<p>guardado posterior al historial</p>', { emitUpdate: true }); });
    await waitFor(() => expect(putCalls().length).toBeGreaterThan(0), { timeout: 3000, interval: 50 });
    await waitFor(() => expect(screen.getByText(/v4 ·/)).toBeTruthy(), { timeout: 3000, interval: 50 });
    // Regresión concreta: v2 sigue presente después del refetch (pinned), y
    // TODAS las versiones 1-4 están listadas, cada una UNA sola vez.
    for (const no of [4, 3, 2, 1]) {
      expect(screen.getAllByRole('button', { name: new RegExp(`(^|[^0-9])v${no} ·`) }).length).toBe(1);
    }
    // union == total: aviso y botón desaparecen, sin omisiones ni duplicados.
    await waitFor(() => expect(screen.queryByText('Mostrando 3 de 4 versiones')).toBeNull());
    expect(screen.queryByTestId('draft-versions-load-more')).toBeNull();
  });

  it('total_count se reinterpreta al refetch de página 1 tras un guardado no coalescido', async () => {
    let total = 3;
    let page1 = [meta(3), meta(2, 'autosave')];
    fetchMock = vi.fn(async (url: string, opts?: RequestInit) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/ai/usage')) {
        return { ok: true, json: async () => ({ allowance: usageAllowance }) } as Response;
      }
      if (opts?.method === 'PUT') {
        return {
          ok: true,
          // Guardado NOT coalescido: el total crece a 4 y aparece v4.
          json: async () => {
            total = 4;
            page1 = [meta(4), ...page1];
            return { draft: makeDraft({ content: '<p>v4 del editor</p>', content_format: 'html', revision: 3 }) };
          },
        } as Response;
      }
      if (/\/drafts\/[^/]+\/versions(\?.*|$)/.test(urlStr)) {
        if (urlStr.includes('before=')) {
          return { ok: true, json: async () => ({ versions: [], total_count: total }) } as Response;
        }
        return { ok: true, json: async () => ({ versions: [...page1], total_count: total }) } as Response;
      }
      if (/\/drafts\/[^/]+$/.test(urlStr)) {
        return { ok: true, json: async () => ({ draft: DRAFT }) } as Response;
      }
      return { ok: true, json: async () => ({ drafts: [DRAFT] }) } as Response;
    });
    (globalThis as unknown as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
    renderDrafts();
    await openFirstDraft();
    await screen.findByText('Mostrando 2 de 3 versiones');
    const ed = mainEditor();
    act(() => { ed!.commands.setContent('<p>edición no coalescida</p>', { emitUpdate: true }); });
    await waitFor(() => expect(screen.getByText(/v4 ·/)).toBeTruthy(), { timeout: 3000, interval: 50 });
    // El refetch trajo total_count=4: el contador, no el estado viejo de 3.
    await waitFor(() => expect(screen.getByText('Mostrando 3 de 4 versiones')).toBeTruthy(), { timeout: 3000, interval: 50 });
  });
});

describe('FASE 4.62J — refresco al recuperar foco (lista, historial y encabezado)', () => {
  const listCalls = () => (fetchMock.mock.calls as unknown[][]).filter((c) => /\/drafts$/.test(String(c[0])) && (c[1] as RequestInit)?.method === 'GET');
  const versionsCalls = () => (fetchMock.mock.calls as unknown[][]).filter((c) => /\/drafts\/d1\/versions(\?.*|$)/.test(String(c[0])));
  const headCalls = () => (fetchMock.mock.calls as unknown[][]).filter((c) => /\/drafts\/d1$/.test(String(c[0])) && (c[1] as RequestInit)?.method === 'GET');
  // jsdom ya reporta visibilityState 'visible' y focusManager focused:true: el
  // flip focused:false→true es lo que React Query interpreta como recuperación
  // de foco y dispara el refetch de las consultas activas.
  const setVisible = () => {
    act(() => {
      focusManager.setFocused(false);
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('focus'));
      focusManager.setFocused(true);
    });
  };

  it('lista e historial se refetchan al recuperar visibilidad', async () => {
    versionsPayload = [
      { version_no: 1, origin: 'generation', content_format: 'markdown', model: 'm', title: 'v1', created_at: '2026-10-01T10:00:00Z' },
    ];
    renderDrafts();
    await screen.findByText('Borrador de contestación');
    await openFirstDraft();
    const ver0 = versionsCalls().length;
    await waitFor(() => expect(ver0).toBeGreaterThanOrEqual(1), { timeout: 3000, interval: 50 });
    const list0 = listCalls().length;
    setVisible();
    await waitFor(() => expect(listCalls().length).toBeGreaterThan(list0), { timeout: 3000, interval: 50 });
    await waitFor(() => expect(versionsCalls().length).toBeGreaterThan(ver0), { timeout: 3000, interval: 50 });
  }, 20000);

  it('encabezado abierto se refresca con el head del servidor (estado seguro)', async () => {
    let headCount = 0;
    fetchMock = vi.fn(async (url: string) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/ai/usage')) {
        return { ok: true, json: async () => ({ allowance: usageAllowance }) } as Response;
      }
      if (/\/drafts\/[^/]+$/.test(urlStr)) {
        headCount += 1;
        const content = headCount <= 1 ? '# Uno\n\nPrimera lectura.' : '# Dos\n\nHead actualizado en el servidor.';
        return { ok: true, json: async () => ({ draft: makeDraft({ content, revision: headCount }) }) } as Response;
      }
      return { ok: true, json: async () => ({ drafts: [DRAFT] }) } as Response;
    });
    (globalThis as unknown as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
    renderDrafts();
    fireEvent.click(await screen.findByText('Borrador de contestación'));
    expect(await screen.findByText('Primera lectura.')).toBeTruthy();
    expect(headCalls()).toHaveLength(1);
    setVisible();
    await waitFor(() => expect(headCalls().length).toBeGreaterThanOrEqual(2), { timeout: 3000, interval: 50 });
    expect(await screen.findByText(/Head actualizado en el servidor\./)).toBeTruthy();
  }, 20000);

  it('dedupe visibilitychange+focus: ráfaga doble refresca el head UNA sola vez', async () => {
    renderDrafts();
    await openFirstDraft();
    const base = headCalls().length;
    setVisible();
    setVisible();
    await waitFor(() => expect(headCalls().length).toBeGreaterThan(base), { timeout: 3000, interval: 50 });
    await new Promise((r) => setTimeout(r, 50));
    expect(headCalls().length).toBe(base + 1);
  }, 20000);

  it('dirty: el refresco de foco jamás pisa contenido local sin confirmar', async () => {
    renderDrafts();
    await openFirstDraft();
    const base = headCalls().length;
    const ed = mainEditor()!;
    act(() => { ed.commands.setContent('<p>texto local 4.62J</p>', { emitUpdate: true }); });
    expect(await screen.findByText('Cambios sin guardar')).toBeTruthy();
    setVisible();
    await new Promise((r) => setTimeout(r, 100));
    expect(headCalls()).toHaveLength(base);
    expect(screen.getByText(/texto local 4\.62J/)).toBeTruthy();
  }, 20000);

  it('saving: PUT en vuelo no se interrumpe ni se re-abre el borrador', async () => {
    renderDrafts();
    await openFirstDraft();
    const base = headCalls().length;
    const ed = mainEditor()!;
    holdPutGate = new Promise<void>(() => {});
    act(() => { ed.commands.setContent('<p>en vuelo</p>', { emitUpdate: true }); });
    expect(await screen.findByText('Guardando…')).toBeTruthy();
    setVisible();
    await new Promise((r) => setTimeout(r, 100));
    expect(headCalls()).toHaveLength(base);
  }, 20000);

  it('error: tras fallo del PUT el head no se refresca y el texto local persiste', async () => {
    renderDrafts();
    await openFirstDraft();
    const base = headCalls().length;
    const ed = mainEditor()!;
    putFailure = { status: 500, body: { error: 'boom' } };
    act(() => { ed.commands.setContent('<p>trabajo local 4.62J</p>', { emitUpdate: true }); });
    await waitFor(() => expect(screen.getByText('Error al guardar')).toBeTruthy(), { timeout: 4000, interval: 50 });
    setVisible();
    await new Promise((r) => setTimeout(r, 100));
    expect(headCalls()).toHaveLength(base);
    expect(screen.getByText(/trabajo local 4\.62J/)).toBeTruthy();
  }, 20000);

  it('conflict: tras 409 el head no se refresca y el panel de conflicto persiste', async () => {
    renderDrafts();
    await openFirstDraft();
    const base = headCalls().length;
    const ed = mainEditor()!;
    putFailure = { status: 409, body: { error: 'conflicto', code: 'AI_DRAFT_REVISION_CONFLICT', current_revision: 7 } };
    act(() => { ed.commands.setContent('<p>mi versión en conflicto</p>', { emitUpdate: true }); });
    expect(await screen.findByText('El documento cambió en otro dispositivo o pestaña.')).toBeTruthy();
    setVisible();
    await new Promise((r) => setTimeout(r, 100));
    expect(headCalls()).toHaveLength(base);
    expect(screen.getByText(/mi versión en conflicto/)).toBeTruthy();
    expect(screen.getByText('El documento cambió en otro dispositivo o pestaña.')).toBeTruthy();
  }, 20000);

  it('preview de versión abierta: el foco no re-abre el borrador ni cierra la preview', async () => {
    versionsPayload = [
      { version_no: 1, origin: 'generation', content_format: 'markdown', model: 'm', title: 'v1', created_at: '2026-10-01T10:00:00Z' },
    ];
    versionDetail = {
      version_no: 1, origin: 'generation', content_format: 'markdown', model: 'm', title: 'v1',
      created_at: '2026-10-01T10:00:00Z', content: '# Borrador\n\nTexto histórico v1 4.62J.',
    };
    renderDrafts();
    await openFirstDraft();
    fireEvent.click((await screen.findAllByText(/v1 · generación IA/))[0]);
    expect(await screen.findByText(/Texto histórico v1 4\.62J\./)).toBeTruthy();
    const base = headCalls().length;
    const ver0 = versionsCalls().length;
    setVisible();
    await new Promise((r) => setTimeout(r, 100));
    expect(headCalls()).toHaveLength(base);
    expect(screen.getByText(/Texto histórico v1 4\.62J\./)).toBeTruthy();
    await waitFor(() => expect(versionsCalls().length).toBeGreaterThan(ver0), { timeout: 3000, interval: 50 });
  }, 20000);

  it('restauración en vuelo: el foco no re-abre el borrador durante el POST', async () => {
    versionsPayload = [
      { version_no: 1, origin: 'generation', content_format: 'markdown', model: 'm', title: 'v1', created_at: '2026-10-01T10:00:00Z' },
    ];
    versionDetail = {
      version_no: 1, origin: 'generation', content_format: 'markdown', model: 'm', title: 'v1',
      created_at: '2026-10-01T10:00:00Z', content: '# Borrador\n\nVersión para restaurar.',
    };
    let releaseRestore: (() => void) | null = null;
    const baseFetch = fetchMock;
    fetchMock = vi.fn(async (url: string, opts?: RequestInit) => {
      const urlStr = String(url);
      if (opts?.method === 'POST' && urlStr.includes('/restore')) {
        await new Promise<void>((res) => { releaseRestore = res; });
        return { ok: true, json: async () => ({ draft: makeDraft({ revision: 3 }), version: { version_no: 4, origin: 'restore', restored_from: 1 } }) } as Response;
      }
      return baseFetch(url, opts);
    });
    (globalThis as unknown as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
    renderDrafts();
    await openFirstDraft();
    fireEvent.click((await screen.findAllByText(/v1 · generación IA/))[0]);
    fireEvent.click(await screen.findByText('Restaurar esta versión'));
    await waitFor(() => expect(releaseRestore).toBeTruthy(), { timeout: 3000, interval: 20 });
    const base = headCalls().length;
    setVisible();
    await new Promise((r) => setTimeout(r, 100));
    expect(headCalls()).toHaveLength(base);
    releaseRestore!();
    await waitFor(() => expect(
      fetchMock.mock.calls.some((c) => String(c[0]).includes('/versions/1/restore'))
    ).toBe(true), { timeout: 3000, interval: 50 });
  }, 20000);

  it('limpieza: con borrador cerrado o al desmontar, el foco no genera GETs del head', async () => {
    const { unmount } = renderDrafts();
    await openFirstDraft();
    const cerrar = screen.getAllByText('Cerrar').find((el) => (el as HTMLElement).textContent === 'Cerrar');
    fireEvent.click(cerrar!);
    await new Promise((r) => setTimeout(r, 50));
    const afterClose = headCalls().length;
    setVisible();
    await new Promise((r) => setTimeout(r, 100));
    expect(headCalls().length).toBe(afterClose);
    unmount();
    const afterUnmount = headCalls().length;
    setVisible();
    await new Promise((r) => setTimeout(r, 100));
    expect(headCalls().length).toBe(afterUnmount);
  }, 20000);

  it('FASE 4.62J-C: una respuesta tardía del refresco por foco no reabre el borrador que el usuario cerró mientras volaba', async () => {
    renderDrafts();
    await openFirstDraft();
    await waitFor(() => expect(screen.getByText(/Contenido\./)).toBeTruthy());

    let releaseHead = () => {};
    headGate = new Promise<void>((resolve) => { releaseHead = resolve; });
    const base = headCalls().length;

    setVisible();
    await waitFor(() => expect(headCalls().length).toBe(base + 1), { timeout: 4000 });

    // El usuario cierra mientras el GET del refresco sigue en vuelo (estado
    // seguro pro el guard: sin panel de cierre, cierre inmediato).
    fireEvent.click(screen.getByText('Cerrar'));
    await waitFor(() => expect(screen.queryByText(/Contenido\./)).toBeNull());

    releaseHead();
    // La respuesta tardía resuelve: sin el guard ifStillOpen reabriría el
    // editor (openDraftById re-pisaría openId/contendo). Debe seguir cerrado.
    await waitFor(() => expect(headCalls().length).toBe(base + 1));
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText(/Contenido\./)).toBeNull();
    expect(screen.queryByText('Borrador de contestación', { selector: 'p' })).toBeNull();
    headGate = null;
  }, 20000);
});

describe('FASE UA-2 — toolbar profesional y zoom de presentación', () => {
  // Versión de renderDrafts con client accesible para rerender y para
  // forzar re-evaluación de estados derivados del editor mockeado.
  const renderDraftsRerenderable = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const view = render(<QueryClientProvider client={client}><AICaseDrafts workspaceId="w1" /></QueryClientProvider>);
    // Elemento nuevo por llamada: RTL no re-renderiza un árbol idéntico.
    return { ...view, rerender: () => view.rerender(<QueryClientProvider client={client}><AICaseDrafts workspaceId="w1" /></QueryClientProvider>) };
  };
  const main = () => editorCache.main as FakeEditor;
  const btn = (name: string) => screen.getByRole('button', { name });
  const cmd = (needle: string) => main().cmdLog.filter((c) => c.startsWith(needle));
  const parseCmdArgs = (cmdName: string) => {
    const entries = cmd(cmdName);
    const last = entries[entries.length - 1];
    return JSON.parse(last.slice(cmdName.length + 1, last.length - 1));
  };
  const openToolbar = async () => {
    renderDrafts();
    await openFirstDraft();
    return screen.getByRole('toolbar', { name: 'Formato del borrador' });
  };

  it('toolbar completa: grupos de historial, marcas, estilo, listas, alineación, limpiar y zoom', async () => {
    await openToolbar();
    for (const n of [
      'Deshacer', 'Rehacer', 'Negrita', 'Cursiva', 'Subrayado', 'Tachado',
      'Lista con viñetas', 'Lista numerada',
      'Alinear a la izquierda', 'Centrar', 'Alinear a la derecha', 'Justificar',
      'Limpiar formato',
    ]) {
      expect(btn(n)).toBeTruthy();
    }
    const style = screen.getByLabelText('Estilo de párrafo o título') as HTMLSelectElement;
    expect(style).toBeTruthy();
    expect(style.value).toBe('p');
    for (const o of ['Párrafo', 'Título 1', 'Título 2', 'Título 3']) {
      expect(Array.from(style.options).map((op) => op.textContent)).toContain(o);
    }
    const zoomGroup = screen.getByRole('group', { name: 'Zoom del documento' });
    expect(zoomGroup).toBeTruthy();
    expect(screen.getByLabelText('Reducir zoom')).toBeTruthy();
    expect(screen.getByLabelText('Aumentar zoom')).toBeTruthy();
    // Indicador fijo sin desplegable: muestra el porcentaje actual.
    expect(within(zoomGroup).getByText('100 %')).toBeTruthy();
    expect(within(zoomGroup).queryByRole('combobox')).toBeNull();
  });

  it('deshacer/rehacer reservan can(); sin historial quedan deshabilitados y con can() ejecutan undo/redo', async () => {
    const { rerender } = renderDraftsRerenderable();
    await openFirstDraft();
    expect(btn('Deshacer')).toBeDisabled();
    expect(btn('Rehacer')).toBeDisabled();
    main().canFlags.undo = true;
    main().canFlags.redo = true;
    rerender();
    expect(btn('Deshacer')).toBeEnabled();
    expect(btn('Rehacer')).toBeEnabled();
    fireEvent.click(btn('Deshacer'));
    fireEvent.click(btn('Rehacer'));
    expect(cmd('undo')).toHaveLength(1);
    expect(cmd('redo')).toHaveLength(1);
  });

  it('marcas: subrayado/tachado ejecutan toggle y reflejan estado activo por aria-pressed', async () => {
    const { rerender } = renderDraftsRerenderable();
    await openFirstDraft();
    // Nota: el mock no replica el suscript por transacción de TipTap real
    // (que re-renderiza la toolbar); el test compensa con rerender() para
    // evaluar la derivación de isActive en render.
    expect(btn('Subrayado')).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(btn('Subrayado'));
    expect(cmd('toggleUnderline')).toHaveLength(1);
    rerender();
    expect(btn('Subrayado')).toHaveAttribute('aria-pressed', 'true');
    expect(btn('Tachado')).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(btn('Tachado'));
    expect(cmd('toggleStrike')).toHaveLength(1);
    rerender();
    expect(btn('Tachado')).toHaveAttribute('aria-pressed', 'true');
    // Toggle off: segundo clic desactiva la marca como el editor real.
    fireEvent.click(btn('Subrayado'));
    rerender();
    expect(btn('Subrayado')).toHaveAttribute('aria-pressed', 'false');
  });

  it('estilo de bloque: el select aplica setHeading con nivel exacto y setParagraph al volver a párrafo', async () => {
    const { rerender } = renderDraftsRerenderable();
    await openFirstDraft();
    const style = screen.getByLabelText('Estilo de párrafo o título') as HTMLSelectElement;
    fireEvent.change(style, { target: { value: 'h2' } });
    const h2 = cmd('setHeading');
    expect(h2).toHaveLength(1);
    expect(parseCmdArgs('setHeading')).toEqual([{ level: 2 }]);
    // el estado del mock replica atributos de schema: el select muestra Título 2
    rerender();
    expect((screen.getByLabelText('Estilo de párrafo o título') as HTMLSelectElement).value).toBe('h2');
    fireEvent.change(style, { target: { value: 'p' } });
    expect(cmd('setParagraph')).toHaveLength(1);
    rerender();
    expect((screen.getByLabelText('Estilo de párrafo o título') as HTMLSelectElement).value).toBe('p');
  });

  it('alineación: setTextAlign con valor exacto y grupo con alineación activa única (izquierda por defecto)', async () => {
    const { rerender } = renderDraftsRerenderable();
    await openFirstDraft();
    expect(btn('Alinear a la izquierda')).toHaveAttribute('aria-pressed', 'true');
    const parse = () => parseCmdArgs('setTextAlign')[0] as string;
    fireEvent.click(btn('Centrar'));
    expect(cmd('setTextAlign')).toHaveLength(1);
    expect(parse()).toBe('center');
    rerender();
    expect(btn('Centrar')).toHaveAttribute('aria-pressed', 'true');
    expect(btn('Alinear a la izquierda')).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(btn('Justificar'));
    expect(parse()).toBe('justify');
    rerender();
    expect(btn('Justificar')).toHaveAttribute('aria-pressed', 'true');
    expect(btn('Centrar')).toHaveAttribute('aria-pressed', 'false');
  });

  it('limpiar formato mantiene su comando compuesto', async () => {
    await openToolbar();
    fireEvent.click(btn('Limpiar formato'));
    expect(cmd('unsetAllMarks')).toHaveLength(1);
    expect(cmd('clearNodes')).toHaveLength(1);
  });

  it('zoom: pasos de 10 puntos, límites 50–150 % e indicador de porcentaje exacto', async () => {
    renderDrafts();
    await openFirstDraft();
    const minus = () => screen.getByLabelText('Reducir zoom');
    const plus = () => screen.getByLabelText('Aumentar zoom');
    const indicator = () => within(screen.getByRole('group', { name: 'Zoom del documento' })).getByText(/\d+ %/);
    expect(indicator().textContent).toBe('100 %');
    expect(minus()).toBeEnabled();
    expect(plus()).toBeEnabled();

    // Pasos de 10: 100 → 90 → 80 → 70 → 60 → 50 con clics sucesivos.
    for (const expected of ['90 %', '80 %', '70 %', '60 %', '50 %']) {
      fireEvent.click(minus());
      expect(indicator().textContent).toBe(expected);
    }
    // Límite inferior: − deshabilitado y clics extra no cambian el valor.
    expect(minus()).toBeDisabled();
    fireEvent.click(minus());
    expect(indicator().textContent).toBe('50 %');
    expect(plus()).toBeEnabled();

    // Pasos de 10 de vuelta hasta el tope: 50 → 150.
    for (let i = 0; i < 10; i++) fireEvent.click(plus());
    expect(indicator().textContent).toBe('150 %');
    // Límite superior: + deshabilitado y clics extra no cambian el valor.
    expect(plus()).toBeDisabled();
    fireEvent.click(plus());
    expect(indicator().textContent).toBe('150 %');

    // Regreso al 100 % (predeterminado) restaura la simetría del control.
    for (let i = 0; i < 5; i++) fireEvent.click(minus());
    expect(indicator().textContent).toBe('100 %');
    expect(minus()).toBeEnabled();
    expect(plus()).toBeEnabled();
  }, 30000);

  it('zoom escala la hoja completa: toolbar fuera de la hoja y del zoom, editor no recreado, sin setContent ni PUT, y formato preexistente conservado', async () => {
    draftPayloadOverride = makeDraft({
      id: 'd3',
      title: 'Formato previo UA-2',
      content: '<h2>Encabezado persistido</h2><p><strong>negrita</strong> + <u>subrayado</u></p>',
      content_format: 'html',
      revision: 5,
    });
    renderDrafts();
    fireEvent.click(await screen.findByText('Formato previo UA-2'));
    await screen.findByRole('toolbar', { name: 'Formato del borrador' });
    const before = editorCache.main as FakeEditor;
    const beforeHtml = before.html;
    expect(putCalls()).toHaveLength(0);

    const toolbar = screen.getByRole('toolbar', { name: 'Formato del borrador' });
    const content = document.querySelector('[data-testid="tiptap-content"]') as HTMLElement;
    expect(content).toBeTruthy();
    const zoomWrapper = content.closest('[data-testid="draft-zoom-content"]') as HTMLElement | null;
    const sheet = document.querySelector('[data-testid="draft-sheet"]') as HTMLElement;
    const workBox = toolbar.parentElement as HTMLElement;
    expect(workBox.getAttribute('data-testid')).toBe('draft-canvas');
    // La toolbar está pegada al borde superior del box y ocupa su ancho:
    // primera hija, determinada por el contenedor, sin margen propio.
    expect(workBox.firstElementChild).toBe(toolbar);
    expect(toolbar.className).toContain('border-b');
    expect(zoomWrapper?.style.transform).toBe('scale(1)');
    expect(zoomWrapper?.style.transformOrigin).toBe('top center');
    // Zoom real: sin CSS zoom ni compensación de ancho (escala pura).
    expect(zoomWrapper?.style.zoom).toBe('');
    expect(zoomWrapper?.style.width).toBe('');
    // La hoja completa vive dentro del envoltorio de zoom (página, márgenes
    // y texto escalan juntos) y la toolbar está FUERA de la hoja y del zoom.
    expect(zoomWrapper?.contains(sheet)).toBe(true);
    expect(zoomWrapper?.contains(content)).toBe(true);
    expect(toolbar.contains(content)).toBe(false);
    expect(zoomWrapper?.contains(toolbar)).toBe(false);
    // La toolbar (y toda su ascendencia) no recibe zoom ni transform:
    // escala 1 y ancho completo siempre.
    let ancestor: HTMLElement | null = toolbar;
    while (ancestor) {
      expect(ancestor.style.zoom).toBe('');
      expect(ancestor.style.transform).toBe('');
      ancestor = ancestor.parentElement;
    }

    const plus = () => screen.getByLabelText('Aumentar zoom');
    for (let i = 0; i < 5; i++) fireEvent.click(plus());
    expect(zoomWrapper?.style.transform).toBe('scale(1.5)');
    expect(toolbar.style.zoom).toBe('');
    expect(toolbar.style.width).toBe('');
    expect(toolbar.style.transform).toBe('');
    expect(sheet.style.zoom).toBe('');
    expect(sheet.style.transform).toBe('');
    // El editor no se reinicia ni se recalcula contenido: misma instancia y
    // el formato preexistente (h2/strong/u) intacto.
    expect(editorCache.main).toBe(before);
    expect(main().html).toBe(beforeHtml);
    expect(beforeHtml).toContain('<h2>');
    expect(beforeHtml).toContain('<strong>');
    expect(cmd('setContent')).toHaveLength(0);
    // El zoom no es edición: sin PUT (sin autosave disparado).
    await act(async () => { await new Promise((r) => setTimeout(r, 900)); });
    expect(putCalls()).toHaveLength(0);

    // La toolbar no se re-renderizó a otra instancia DOM al cambiar el zoom.
    expect(screen.getByRole('toolbar', { name: 'Formato del borrador' })).toBe(toolbar);

    // Regreso a 100 % neutraliza el zoom y el contenido sigue igual.
    const minus = () => screen.getByLabelText('Reducir zoom');
    for (let i = 0; i < 5; i++) fireEvent.click(minus());
    expect(zoomWrapper?.style.transform).toBe('scale(1)');
    expect(main().html).toBe(beforeHtml);
  }, 30000);

  it('iconos activos de la toolbar: color de acento en el icono, sin fondo ni caja; hover solo al pasar el cursor', async () => {
    renderDrafts();
    await openFirstDraft();
    const toolbar = screen.getByRole('toolbar', { name: 'Formato del borrador' });

    // Ignora utilidades con prefijo (hover:/focus-visible:): solo cuentan
    // las clases persistentes (normal y activo) del botón.
    const flatIconStyle = (el: HTMLElement) =>
      el.className.replace(/(?:hover:|focus-visible:)[\S]+/g, '');
    // Alineación izquierda activa por defecto: color de acento, sin fondo.
    const alignLeft = screen.getByLabelText('Alinear a la izquierda');
    expect(alignLeft.getAttribute('aria-pressed')).toBe('true');
    expect(flatIconStyle(alignLeft)).toContain('text-green-700');
    // Ni fondo coloreado ni caja permanente.
    expect(flatIconStyle(alignLeft)).not.toMatch(/bg-(green|white|gray)|border/);
    // El hover existe y es fondo gris discreto, no estilo de estado activo.
    expect(alignLeft.className).toContain('hover:bg-gray-100');

    // Estado inactivo: icono plano gris, sin fondo.
    const bold = screen.getByLabelText('Negrita');
    expect(bold.getAttribute('aria-pressed')).toBe('false');
    expect(flatIconStyle(bold)).toContain('text-gray-800');
    expect(flatIconStyle(bold)).not.toMatch(/bg-(green|white|gray)|border/);

    // Activo e inactivo salen de la MISMA plantilla de clases: la única
    // diferencia es el token de color (verde acento vs gris neutral).
    expect(bold.className).toBe(alignLeft.className.replace('text-green-700', 'text-gray-800'));

    // Cursiva comparte el patrón inactivo exacto.
    const italic = screen.getByLabelText('Cursiva');
    expect(flatIconStyle(italic)).toContain('text-gray-800');
    expect(flatIconStyle(italic)).not.toMatch(/bg-(green|white|gray)|border/);
    // La toolbar permanece a escala 1 y su estructura no cambia.
    expect(toolbar.style.zoom).toBe('');
    expect((toolbar.parentElement as HTMLElement).firstElementChild).toBe(toolbar);
  }, 30000);

  it('a 50 %, 100 % y 150 % el editor, scroll y selección siguen operables sobre el mismo nodo', async () => {
    renderDrafts();
    await openFirstDraft();
    const content = document.querySelector('[data-testid="tiptap-content"]') as HTMLElement;
    const toolbar = screen.getByRole('toolbar', { name: 'Formato del borrador' });
    const minus = () => screen.getByLabelText('Reducir zoom');
    const plus = () => screen.getByLabelText('Aumentar zoom');

    const checkAtLevels = (ratio: number) => {
      // El nodo del documento y la toolbar no se recrean: el mock y el DOM
      // persisten entre cambios de zoom (no hay remount del editor).
      expect(document.querySelector('[data-testid="tiptap-content"]')).toBe(content);
      expect(screen.getByRole('toolbar', { name: 'Formato del borrador' })).toBe(toolbar);
      // El envoltorio de zoom no introduce contenedores con overflow propio:
      // el scroll sigue siendo el del lienzo/página y la escala es pura.
      const wrapper = content.closest('[data-testid="draft-zoom-content"]') as HTMLElement;
      expect(wrapper).toBeTruthy();
      expect(wrapper.getAttribute('class') ?? '').not.toContain('overflow');
      // Escala real de la hoja: transform con el nivel activo y sin zoom CSS
      // ni compensación de ancho.
      expect(wrapper.style.transform).toBe(`scale(${ratio})`);
      expect(wrapper.style.zoom).toBe('');
      expect(wrapper.style.width).toBe('');
      // Comandos dependientes de caret/selección se ejecutan nivel por nivel.
      const before = cmd('toggleUnderline').length;
      fireEvent.click(btn('Subrayado'));
      expect(cmd('toggleUnderline')).toHaveLength(before + 1);
    };

    // Lleva a 50 % (5 clics −).
    for (let i = 0; i < 5; i++) fireEvent.click(minus());
    checkAtLevels(0.5);
    // Vuelve a 100 %.
    for (let i = 0; i < 5; i++) fireEvent.click(plus());
    checkAtLevels(1);
    // Sube a 150 %.
    for (let i = 0; i < 5; i++) fireEvent.click(plus());
    checkAtLevels(1.5);
  }, 30000);

  it('deshacer/rehacer ejecutan comandos y restauran el contenido esperado, no solo habilitan botones', async () => {
    const { rerender } = renderDraftsRerenderable();
    await openFirstDraft();
    const original = main().html;
    // Edición equivalente a escribir: entra al historial de undo.
    const edited = '<h1>Borrador</h1><p>Contenido. Editado tras el borrador.</p>';
    main().commands.setContent(edited);
    rerender();
    expect(main().html).toBe(edited);

    // Sin historial conocido por can(), habilitamos como el editor real +
    // rerender; el clic ejecuta undo y restaura el contenido anterior.
    main().canFlags.undo = true;
    rerender();
    expect(btn('Deshacer')).toBeEnabled();
    fireEvent.click(btn('Deshacer'));
    expect(cmd('undo')).toHaveLength(1);
    expect(main().html).toBe(original);
    rerender();
    expect(screen.getByText('Contenido.')).toBeTruthy();

    // Rehacer repite el contenido editado vía comando real.
    main().canFlags.redo = true;
    rerender();
    expect(btn('Rehacer')).toBeEnabled();
    fireEvent.click(btn('Rehacer'));
    expect(cmd('redo')).toHaveLength(1);
    expect(main().html).toBe(edited);
    rerender();
    expect(screen.getByText(/Editado tras el borrador\./)).toBeTruthy();
  }, 30000);

  it('compatibilidad de lectura y guardado con subrayado/tachado ya persistidos en un borrador', async () => {
    draftPayloadOverride = makeDraft({
      id: 'd2',
      title: 'Con marcas UA-2',
      content: '<p><u>subrayado</u> y <s>tachado</s></p>',
      content_format: 'html',
      revision: 2,
    });
    renderDrafts();
    fireEvent.click(await screen.findByText('Con marcas UA-2'));
    // El contenido con marcas nuevas se muestra (schema ahora lo admite).
    await screen.findByText(/subrayado/);
    // Edición real (el guard de runSave no persiste contenido idéntico):
    // el HTML con las marcas nuevas más una edición se conserva entero.
    main().commands.setContent('<p><u>subrayado</u> y <s>tachado</s> y <strong>añadido</strong></p>');
    fireEvent.click(screen.getByText('Guardar cambios'));
    await waitFor(() => expect(putCalls()).toHaveLength(1));
    const sent = putBody(putCalls()[0]);
    expect(sent.content).toContain('<u>subrayado</u>');
    expect(sent.content).toContain('<s>tachado</s>');
    expect(sent.content).toContain('<strong>añadido</strong>');
  });
});

describe('UA-4 — páginas carta (Fase 1)', () => {
  it('presenta una página carta de 816 × 1056 con pie 1 y márgenes de 2,5 cm', async () => {
    renderDrafts();
    await openFirstDraft();

    const sheet = screen.getByTestId('draft-sheet');
    expect(sheet.className).toContain('w-[816px]');

    // El overlay es presentación pura: fuera del documento y sin interacción.
    const overlay = screen.getByTestId('letter-page-overlay');
    expect(overlay.getAttribute('aria-hidden')).toBe('true');
    expect(overlay.className).toContain('pointer-events-none');

    const page = screen.getByTestId('letter-page-1');
    expect(page.style.width).toBe('816px');
    expect(page.style.height).toBe('1056px');
    expect(page.style.top).toBe('0px');

    const number = screen.getByTestId('letter-page-number');
    expect(number.textContent).toBe('1');
    expect(number.style.left).toBe('94px');
    expect(number.style.bottom).toBe('24px');

    // Márgenes 2,5 cm = 94 px y alto de contenido = 868 px.
    const surface = screen.getByTestId('draft-page-content');
    expect(surface.style.paddingTop).toBe('94px');
    expect(surface.style.paddingRight).toBe('94px');
    expect(surface.style.paddingBottom).toBe('94px');
    expect(surface.style.paddingLeft).toBe('94px');
    expect(surface.style.getPropertyValue('--letter-content-height')).toBe('868px');
    expect(mainEditor()!.opts.editorProps?.attributes?.style).toContain(
      'var(--letter-content-height, 560px)',
    );
  });

  it('el HTML del autosave sigue siendo un único documento sin nodos de página', async () => {
    renderDrafts();
    await openFirstDraft();
    const ed = mainEditor()!;
    act(() => {
      ed.commands.setContent(`<p>${'texto '.repeat(400)}</p>`, { emitUpdate: true });
    });
    await waitFor(() => expect(putCalls().length).toBeGreaterThan(0), { timeout: 3000, interval: 50 });
    const sent = String(putBody(putCalls()[0]).content);
    expect(sent).not.toContain('letter-page-break');
    expect(sent).not.toContain('data-page-number');
    expect(sent).toContain('texto texto');
  });

  it('el composer vive debajo de la última página, dentro de la hoja', async () => {
    renderDrafts();
    await openFirstDraft();
    const sheet = screen.getByTestId('draft-sheet');
    const panel = screen.getByTestId('draft-agent-panel');
    expect(panel.parentElement).toBe(sheet);
    expect(sheet.firstElementChild).toBe(screen.getByTestId('letter-pages'));
    expect(sheet.lastElementChild).toBe(panel);
  });
});
