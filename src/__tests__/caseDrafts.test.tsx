import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AICaseDrafts } from '@/components/legalup-ai/AICaseDrafts';

// FASE 4.59D + 4.62C — Draft/document workspace UI: lista, creación validada,
// editor rich (TipTap) con autosave, OCC (409) y versiones.

vi.mock('@/lib/supabaseClient', () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'tok', user: { id: 'u' } } } }) } },
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
  getHTML: () => string;
  isActive: (name: string) => boolean;
  chain: () => Record<string, (...args: unknown[]) => unknown>;
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
    const state: Record<string, boolean> = {};
    const created: FakeEditor = {
      isDestroyed: false,
      opts: options ?? {},
      html: options?.content ?? '<p></p>',
      isActive: (name: string) => !!state[name],
      chain: () => {
        type ChainFn = (...args: unknown[]) => unknown;
        const ret: ChainFn & Record<string, ChainFn> = (() => ret) as ChainFn & Record<string, ChainFn>;
        const mark = (n: string): ChainFn => { state[n] = true; return ret; };
        ret.focus = ret; ret.run = ret;
        ret.toggleBold = mark('bold'); ret.toggleItalic = mark('italic');
        ret.toggleBulletList = mark('bulletList'); ret.toggleOrderedList = mark('orderedList');
        ret.toggleHeading = mark('heading'); ret.setParagraph = ret;
        ret.unsetAllMarks = ret; ret.clearNodes = ret;
        return ret;
      },
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
let versionDetail: unknown = null;
let putFailure: { status: number; body: Record<string, unknown> } | null = null;
// FASE 4.62D: retiene PUTs en vuelo para congelar el estado 'saving' de forma determinista.
let holdPutGate: Promise<void> | null = null;
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
  versionDetail = null;
  putFailure = null;
  holdPutGate = null;
  putStaleRevisions = [];
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
    if (/\/drafts\/[^/]+\/versions\/\d+$/.test(urlStr)) {
      return { ok: true, json: async () => ({ version: versionDetail }) } as Response;
    }
    if (/\/drafts\/[^/]+\/versions$/.test(urlStr)) {
      return { ok: true, json: async () => ({ versions: versionsPayload }) } as Response;
    }
    if (/\/drafts\/[^/]+$/.test(urlStr)) {
      return { ok: true, json: async () => ({ draft: DRAFT }) } as Response;
    }
    return { ok: true, json: async () => ({ drafts: [DRAFT] }) } as Response;
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
