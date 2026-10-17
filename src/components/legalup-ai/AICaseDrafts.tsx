import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  AlertTriangle,
  Bold,
  Check,
  Copy,
  FilePenLine,
  Heading as HeadingIcon,
  History as HistoryIcon,
  Italic,
  List,
  ListOrdered,
  Eraser,
} from 'lucide-react';
import { aiOperationIdentity } from '@/lib/aiOperationIdentity';
import { pollTerminalResult } from '@/lib/aiInProgressPoll';
import { convertDraftMarkdownToHtml, htmlToPlainText } from '@/components/legalup-ai/draftEditorMarkup';

// FASE 4.62C — workspace documental de redacción asistida.
// Izquierda: generación (IA) + borradores anteriores + historial de versiones.
// Derecha: editor rich (TipTap) con autosave, OCC server-side y restauración.
// El revision number vive en el servidor; el cliente nunca lo decrece.

const getApiBaseUrl = (): string => {
  const base = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  return (base || 'http://localhost:3001').replace(/\/+$/, '');
};

const getAccessToken = async (): Promise<string | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
};

export type CaseDraftListItem = {
  id: string;
  draft_type: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  intelligence_snapshot_id: string | null;
};

export type CaseDraft = CaseDraftListItem & {
  instruction: string;
  content: string;
  sources: Array<Record<string, unknown>>;
  model: string | null;
  revision?: number;
  content_format?: string;
};

export type CaseDraftVersionMeta = {
  version_no: number;
  origin: string;
  content_format: string;
  model: string | null;
  title: string | null;
  created_at: string;
};

export type CaseDraftVersionDetail = CaseDraftVersionMeta & { content: string };

const DRAFT_TYPE_OPTIONS = [
  { value: 'escrito', label: 'Escrito jurídico' },
  { value: 'informe', label: 'Informe / minuta' },
  { value: 'carta', label: 'Carta / comunicación formal' },
  { value: 'otro', label: 'Otro' },
];

export const AI_CASE_DRAFTS_QUERY_KEY = ['ai-case-drafts'] as const;

export const AI_DRAFT_REVISION_CONFLICT = 'AI_DRAFT_REVISION_CONFLICT';
const VERSION_ORIGIN_LABEL: Record<string, string> = {
  generation: 'generación IA',
  edit: 'edición',
  autosave: 'guardado automático',
  restore: 'restauración',
  legacy: 'versión inicial',
};

type DraftingAllowance = {
  plan?: string;
  drafting?: { used?: number; limit?: number | null } | null;
};

type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error' | 'conflict';

class DraftApiError extends Error {
  status: number;
  code?: string;
  currentRevision?: number;
  constructor(message: string, status: number, code?: string, currentRevision?: number) {
    super(message);
    this.status = status;
    this.code = code;
    this.currentRevision = currentRevision;
  }
}

async function requestJson<T>(url: string, init: RequestInit): Promise<T> {
  const token = await getAccessToken();
  if (!token) throw new DraftApiError('Sesión no válida.', 401);
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new DraftApiError(
      (body as { error?: string })?.error || 'Operación no disponible.',
      res.status,
      (body as { code?: string })?.code,
      (body as { current_revision?: number })?.current_revision
    );
  }
  return body as T;
}

/** Contenido listo para el editor. Solo content_format:'html' es HTML; el
 *  resto SIEMPRE se convierte con escape-first (una detección por heurística
 *  de '<' inicial mal clasificaría markdown legal que empieza con '<'). */
export function draftContentToEditorHtml(draft: Pick<CaseDraft, 'content' | 'content_format'>): string {
  if (draft.content_format === 'html') return draft.content;
  return convertDraftMarkdownToHtml(draft.content);
}

function useDraftingUsage() {
  const { data } = useQuery<{ allowance?: DraftingAllowance | null }>({
    queryKey: ['ai-usage-drafting'],
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token) return {};
      const res = await fetch(`${getApiBaseUrl()}/api/ai/usage`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      return body ?? {};
    },
    staleTime: 60_000,
    retry: false,
  });
  return data?.allowance ?? null;
}

export function useCaseDrafts(workspaceId: string | undefined) {
  const { data, ...rest } = useQuery<CaseDraftListItem[]>({
    queryKey: [...AI_CASE_DRAFTS_QUERY_KEY, workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const body = await requestJson<{ drafts?: CaseDraftListItem[] }>(
        `${getApiBaseUrl()}/api/ai/cases/${workspaceId}/drafts`,
        { method: 'GET' }
      );
      return body?.drafts ?? [];
    },
  });
  return { drafts: data ?? [], ...rest };
}

// Config del editor para TODOS los usos: solo encabezados 1-3, sin citas,
// código, tachado, regla horizontal, enlaces ni subrayado (schema acotado).
const editorExtensions = () => [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    blockquote: false,
    code: false,
    codeBlock: false,
    strike: false,
    horizontalRule: false,
    link: false,
    underline: false,
  }),
];

/** Documento de solo lectura aislado (previews de versiones): sanitiza pasando
 *  por el schema de TipTap, nunca innerHTML crudo. */
function StaticDraftDoc({ html }: { html: string }) {
  const previewEditor = useEditor({
    editable: false,
    content: html || '<p></p>',
    extensions: editorExtensions(),
  });
  useEffect(() => {
    if (previewEditor && !previewEditor.isDestroyed) {
      previewEditor.commands.setContent(html || '<p></p>', { emitUpdate: false });
    }
  }, [previewEditor, html]);
  return (
    <div className="draft-preview max-h-72 overflow-y-auto rounded border bg-gray-50 p-3 text-sm [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_li]:ml-4 [&_p]:my-1">
      <EditorContent editor={previewEditor} />
    </div>
  );
}

const SAVE_STATUS_LABEL: Record<SaveStatus, string> = {
  idle: '',
  dirty: 'Cambios sin guardar',
  saving: 'Guardando…',
  saved: 'Guardado',
  error: 'Error al guardar',
  conflict: 'Cambios en conflicto',
};

export function AICaseDrafts({ workspaceId }: { workspaceId: string }) {
  const queryClient = useQueryClient();
  const { drafts, isLoading, refetch: refetchDrafts } = useCaseDrafts(workspaceId);
  const allowance = useDraftingUsage();
  const draftLimit = allowance?.drafting?.limit ?? null;
  const draftUsed = allowance?.drafting?.used ?? 0;
  const isPlus = allowance?.plan === 'plus';
  const atLimit = draftLimit != null && draftLimit > 0 && draftUsed >= draftLimit;
  const noAccess = draftLimit != null && draftLimit <= 0;
  const formLocked = noAccess || atLimit;
  const [draftType, setDraftType] = useState('escrito');
  const [instruction, setInstruction] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [openDraft, setOpenDraft] = useState<CaseDraft | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveConflict, setSaveConflict] = useState<{ current_revision: number; message: string } | null>(null);
  const [pendingSwitch, setPendingSwitch] = useState<{ targetId: string; targetTitle: string } | null>(null);
  const [previewVersion, setPreviewVersion] = useState<CaseDraftVersionDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  const editorRef = useRef<ReturnType<typeof useEditor> | null>(null);
  const tokenRef = useRef<string | null>(null);
  const openRevisionRef = useRef(1);
  const lastSavedHtmlRef = useRef('');
  const openIdRef = useRef<string | null>(null);
  const statusRef = useRef<SaveStatus>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setStatus = useCallback((next: SaveStatus) => {
    statusRef.current = next;
    setSaveStatus(next);
  }, []);

  const setEditorFromDraft = useCallback((draft: CaseDraft) => {
    const html = draftContentToEditorHtml(draft);
    lastSavedHtmlRef.current = html;
    openRevisionRef.current = Math.max(openRevisionRef.current, Number(draft.revision) || 1);
    const editor = editorRef.current;
    if (editor && !editor.isDestroyed) {
      editor.commands.setContent(html, { emitUpdate: false });
    }
  }, []);

  const openDraftById = useCallback(async (id: string, opts?: { force?: boolean }) => {
    if (statusRef.current === 'dirty' && !opts?.force) {
      const target = drafts.find((d) => d.id === id);
      setPendingSwitch({ targetId: id, targetTitle: target?.title ?? 'otro borrador' });
      return null;
    }
    setError(null);
    setPendingSwitch(null);
    setPreviewVersion(null);
    setDetailError(null);
    setSaveConflict(null);
    if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; }
    try {
      const body = await requestJson<{ draft?: CaseDraft }>(
        `${getApiBaseUrl()}/api/ai/cases/${workspaceId}/drafts/${id}`,
        { method: 'GET' }
      );
      const draft = body?.draft;
      if (!draft) throw new DraftApiError('Borrador no encontrado.', 404);
      openIdRef.current = id;
      setStatus('idle');
      setOpenDraft(draft);
      setOpenId(id);
      setEditorFromDraft(draft);
      return draft;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo abrir el borrador.');
      return null;
    }
  }, [drafts, workspaceId, setEditorFromDraft, setStatus]);

  const runSave = useCallback(
    async (config: { origin: 'autosave' | 'edit'; force?: boolean } = { origin: 'autosave' }) => {
      const id = openIdRef.current;
      const editor = editorRef.current;
      if (!id || !editor || editor.isDestroyed) return;
      const html = editor.getHTML();
      if (config.force !== true && html === lastSavedHtmlRef.current) {
        setSaveConflict(null);
        if (statusRef.current === 'saving' || statusRef.current === 'dirty') setStatus('saved');
        return;
      }
      setStatus('saving');
      try {
        const body = await requestJson<{ draft?: CaseDraft }>(
          `${getApiBaseUrl()}/api/ai/cases/${workspaceId}/drafts/${id}`,
          {
            method: 'PUT',
            body: JSON.stringify({
              content: html,
              content_format: 'html',
              origin: config.origin,
              base_revision: openRevisionRef.current,
              force: config.force === true,
            }),
          }
        );
        if (openIdRef.current !== id) return;
        // Revisión monotónica: una respuesta tardía nunca degrada la base OCC.
        openRevisionRef.current = Math.max(openRevisionRef.current, Number(body?.draft?.revision) || openRevisionRef.current + 1);
        lastSavedHtmlRef.current = html;
        setSaveConflict(null);
        setStatus('saved');
        setOpenDraft((prev) => (prev && prev.id === id ? { ...prev, content: html, content_format: 'html', revision: body?.draft?.revision } : prev));
        void queryClient.invalidateQueries({ queryKey: [...AI_CASE_DRAFTS_QUERY_KEY, workspaceId, id, 'versions'] });
        void queryClient.invalidateQueries({ queryKey: [...AI_CASE_DRAFTS_QUERY_KEY, workspaceId] });
      } catch (e) {
        if (openIdRef.current !== id) return;
        if (e instanceof DraftApiError && e.code === AI_DRAFT_REVISION_CONFLICT) {
          // Conflicto trivial: el contenido local YA es la cabeza (carrera de
          // guardados idénticos). Recarga silenciosa, sin panel de conflicto.
          if (editorRef.current?.getHTML() === lastSavedHtmlRef.current) {
            void openDraftById(id, { force: true });
            return;
          }
          setSaveConflict({
            current_revision: e.currentRevision ?? openRevisionRef.current,
            message: 'El documento cambió en otro dispositivo o pestaña.',
          });
          setStatus('conflict');
          return;
        }
        setStatus('error');
      }
    },
    [workspaceId, queryClient, setStatus, openDraftById]
  );

  const scheduleSave = useCallback(() => {
    if (openIdRef.current == null) return;
    if (statusRef.current === 'conflict') {
      // En conflicto no se escribe más: el usuario resuelve que prevalece.
      if (editorRef.current?.getHTML() !== lastSavedHtmlRef.current) setStatus('dirty');
      return;
    }
    setStatus('dirty');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      void runSave({ origin: 'autosave' });
    }, 800);
  }, [runSave, setStatus]);

  const extensions = useMemo(() => editorExtensions(), []);

  const editor = useEditor({
    extensions,
    content: '<p></p>',
    onUpdate: () => {
      const current = editorRef.current;
      if (current && !current.isDestroyed && current.getHTML() !== lastSavedHtmlRef.current) scheduleSave();
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-[420px] focus:outline-none',
        spellcheck: 'true',
      },
    },
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  // Flush best-effort al abandonar la página. keepalive sin await: lo que
  // llegue llega; el autosave normal sigue siendo la vía principal.
  useEffect(() => {
    const onBeforeUnload = () => {
      if (statusRef.current !== 'dirty' || !openIdRef.current || !tokenRef.current) return;
      const current = editorRef.current;
      if (!current || current.isDestroyed) return;
      void fetch(`${getApiBaseUrl()}/api/ai/cases/${workspaceId}/drafts/${openIdRef.current}`, {
        method: 'PUT',
        keepalive: true,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenRef.current}`,
        },
        body: JSON.stringify({
          content: current.getHTML(),
          content_format: 'html',
          origin: 'autosave',
          base_revision: openRevisionRef.current,
        }),
      }).catch(() => { /* best-effort */ });
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [workspaceId]);

  // Token en caché para el flush de beforeunload (getSession es async).
  useEffect(() => {
    let alive = true;
    void getAccessToken().then((t) => { if (alive) tokenRef.current = t; });
    return () => { alive = false; };
  }, []);

  // Historial de versiones del borrador abierto.
  const versionsQuery = useQuery<CaseDraftVersionMeta[]>({
    queryKey: [...AI_CASE_DRAFTS_QUERY_KEY, workspaceId, openId, 'versions'],
    enabled: !!openId,
    queryFn: async () => {
      const body = await requestJson<{ versions?: CaseDraftVersionMeta[] }>(
        `${getApiBaseUrl()}/api/ai/cases/${workspaceId}/drafts/${openId}/versions`,
        { method: 'GET' }
      );
      return body?.versions ?? [];
    },
  });

  const generate = useMutation({
    mutationFn: async () => {
      const token = await getAccessToken();
      if (!token) throw new Error('Sesión no válida.');
      tokenRef.current = token;
      const { data: { session } } = await supabase.auth.getSession();
      const identity = await aiOperationIdentity(`${session?.user?.id}:draft:${workspaceId}`, {
        draft_type: draftType,
        instruction: instruction.trim(),
      });
      // Doble click seguro: misma identidad reintenta hasta resultado terminal.
      const { res, body } = await pollTerminalResult(async () => {
        const res = await fetch(`${getApiBaseUrl()}/api/ai/cases/${workspaceId}/drafts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'X-AI-Operation-ID': identity.id,
          },
          body: JSON.stringify({ draft_type: draftType, instruction: instruction.trim() }),
        });
        const body = await res.json().catch(() => ({}));
        identity.complete(body);
        return { res, body };
      });
      if (!res.ok) {
        const err = new Error(body?.error || 'No se pudo generar el borrador.');
        (err as { code?: string }).code = body?.code;
        throw err;
      }
      return body;
    },
    onSuccess: (body) => {
      queryClient.invalidateQueries({ queryKey: [...AI_CASE_DRAFTS_QUERY_KEY, workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['ai-usage-drafting'] });
      setInstruction('');
      if (body?.draft?.id) void openDraftById(body.draft.id, { force: true });
    },
    onError: (e) => {
      const code = (e as { code?: string })?.code;
      if (code === 'AI_MONTHLY_LIMIT_REACHED' || code === 'AI_DRAFTING_LIMIT_REACHED') {
        queryClient.invalidateQueries({ queryKey: ['ai-usage-drafting'] });
        setError(
          isPlus
            ? 'Has utilizado los 75 borradores incluidos este mes. Tu disponibilidad se renueva el próximo mes.'
            : 'Has utilizado los 30 borradores incluidos este mes.'
        );
        return;
      }
      setError(e instanceof Error ? e.message : 'No se pudo generar el borrador.');
    },
  });

  const restoreVersion = async (versionNo: number) => {
    if (!openId) return;
    setRestoring(true);
    setDetailError(null);
    try {
      const body = await requestJson<{ draft?: CaseDraft }>(
        `${getApiBaseUrl()}/api/ai/cases/${workspaceId}/drafts/${openId}/versions/${versionNo}/restore`,
        { method: 'POST' }
      );
      const restored = body?.draft;
      if (restored) {
        openIdRef.current = openId;
        openRevisionRef.current = Math.max(openRevisionRef.current, Number(restored.revision) || openRevisionRef.current + 1);
        setOpenDraft(restored);
        setEditorFromDraft(restored);
        setStatus('saved');
      }
      setPreviewVersion(null);
      void queryClient.invalidateQueries({ queryKey: [...AI_CASE_DRAFTS_QUERY_KEY, workspaceId, openId, 'versions'] });
      void refetchDrafts();
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : 'No se pudo restaurar.');
    } finally {
      setRestoring(false);
    }
  };

  const openVersionDetail = async (versionNo: number) => {
    if (!openId) return;
    setDetailError(null);
    try {
      const body = await requestJson<{ version?: CaseDraftVersionDetail }>(
        `${getApiBaseUrl()}/api/ai/cases/${workspaceId}/drafts/${openId}/versions/${versionNo}`,
        { method: 'GET' }
      );
      setPreviewVersion(body?.version ?? null);
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : 'No se pudo abrir la versión.');
    }
  };

  const copyContent = async () => {
    const current = editorRef.current;
    const html = current && !current.isDestroyed ? current.getHTML() : (openDraft?.content ?? '');
    const plain = htmlToPlainText(html);
    try {
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': new Blob([html], { type: 'text/html' }),
            'text/plain': new Blob([plain], { type: 'text/plain' }),
          }),
        ]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      }
      await navigator.clipboard.writeText(plain);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('No se pudo copiar al portapapeles.');
    }
  };

  const closeDraft = () => {
    if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; }
    openIdRef.current = null;
    setOpenId(null);
    setOpenDraft(null);
    setPreviewVersion(null);
    setStatus('idle');
    setSaveConflict(null);
    setPendingSwitch(null);
  };

  const chainFocus = () => (editor && !editor.isDestroyed ? editor.chain().focus() : null);

  const applyHeading = () => {
    if (!editor || editor.isDestroyed) return;
    const chain = editor.chain().focus();
    const at = (level: number) => editor.isActive('heading', { level });
    if (at(3)) { chain.setParagraph().run(); return; }
    const next = at(1) ? 2 : at(2) ? 3 : 1;
    chain.toggleHeading({ level: next as 1 | 2 | 3 }).run();
  };

  const toolbarButton = (
    title: string,
    Icon: typeof Bold,
    action: () => void,
    active: boolean
  ) => (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={!editor || editor.isDestroyed}
      onClick={action}
      className={`rounded border px-2 py-1 text-xs ${active ? 'border-green-700 bg-green-700 text-white' : 'bg-white hover:bg-gray-50'}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="sr-only">{title}</span>
    </button>
  );

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FilePenLine className="h-4 w-4 text-green-700" aria-hidden="true" />
          Redacción asistida
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Genera borradores utilizando la información, documentos e investigación de este caso.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {noAccess ? (
          <div className="space-y-2">
            <p className="text-sm">La generación de borradores está incluida en los planes de pago.</p>
            <Button size="sm" asChild>
              <a href="/pro">Ver LegalUp Pro</a>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
            {/* Izquierda: generación + lista + historial; en móvil queda después del editor */}
            <div className="space-y-5 order-2 lg:order-1">
              <div className="space-y-3">
                <p className="text-sm font-medium">Nuevo borrador</p>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Tipo de documento</Label>
                  <div className="flex flex-wrap gap-2">
                    {DRAFT_TYPE_OPTIONS.map((o) => (
                      <Button
                        key={o.value}
                        size="sm"
                        variant={draftType === o.value ? 'default' : 'outline'}
                        onClick={() => setDraftType(o.value)}
                      >
                        {o.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label htmlFor="draft-instruction" className="text-sm font-medium mb-2 block">
                    ¿Qué necesitas preparar?
                  </Label>
                  <Textarea
                    id="draft-instruction"
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    placeholder="Ej: borrador de contestación centrado en la falta de requerimiento previo…"
                    rows={4}
                    className="w-full"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    size="sm"
                    disabled={formLocked || instruction.trim().length < 10 || generate.isPending}
                    onClick={() => generate.mutate()}
                  >
                    {generate.isPending ? 'Generando…' : 'Generar borrador'}
                  </Button>
                  {draftLimit != null && draftLimit > 0 ? (
                    <span className="text-xs text-muted-foreground">
                      {draftUsed} de {draftLimit} este mes
                    </span>
                  ) : null}
                </div>
                {atLimit ? (
                  <div className="rounded border p-3 space-y-2">
                    <p className="text-sm">Has utilizado los {draftLimit} borradores incluidos este mes.</p>
                    {isPlus ? (
                      <p className="text-xs text-muted-foreground">Tu disponibilidad se renueva el próximo mes.</p>
                    ) : (
                      <Button size="sm" asChild>
                        <a href="/pro">Ver LegalUp Plus</a>
                      </Button>
                    )}
                  </div>
                ) : null}
              </div>

              <div>
                <p className="text-sm font-medium mb-3">Borradores anteriores</p>
                {isLoading ? (
                  <p className="text-sm text-muted-foreground">Cargando borradores…</p>
                ) : drafts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aún no hay borradores anteriores.</p>
                ) : (
                  <div className="space-y-2">
                    {drafts.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => void openDraftById(d.id)}
                        className={`w-full text-left rounded border px-3 py-2 hover:bg-gray-50 ${openId === d.id ? 'border-green-700' : ''}`}
                      >
                        <span className="text-sm font-medium">{d.title}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {new Date(d.created_at).toLocaleString('es-CL', { day: 'numeric', month: 'short' })}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {openId ? (
                <div className="border-t pt-3">
                  <p className="text-sm font-medium mb-2 flex items-center gap-1">
                    <HistoryIcon className="h-3.5 w-3.5" aria-hidden="true" /> Historial de versiones
                  </p>
                  {versionsQuery.isLoading ? (
                    <p className="text-xs text-muted-foreground">Cargando historial…</p>
                  ) : (versionsQuery.data ?? []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">Aún no hay versiones registradas.</p>
                  ) : (
                    <ul className="space-y-1">
                      {(versionsQuery.data ?? []).map((v) => (
                        <li key={v.version_no}>
                          <button
                            onClick={() => void openVersionDetail(v.version_no)}
                            className="w-full text-left rounded border px-2 py-1 text-xs hover:bg-gray-50"
                          >
                            v{v.version_no} · {VERSION_ORIGIN_LABEL[v.origin] ?? v.origin}
                            <span className="text-muted-foreground ml-1">
                              {new Date(v.created_at).toLocaleString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>

            {/* Derecha: editor del documento; primera en móvil */}
            <div className="space-y-3 order-1 lg:order-2" data-testid="draft-editor-pane">
              {openDraft ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-sm">{openDraft.title}</p>
                    <div className="flex items-center gap-2">
                      <span
                        data-testid="save-status"
                        className={`text-xs ${saveStatus === 'error' || saveStatus === 'conflict' ? 'text-red-600' : 'text-muted-foreground'}`}
                      >
                        {SAVE_STATUS_LABEL[saveStatus]}
                      </span>
                      <Button size="sm" variant="outline" onClick={closeDraft}>Cerrar</Button>
                    </div>
                  </div>

                  {pendingSwitch ? (
                    <div className="rounded border border-amber-300 bg-amber-50 p-3 space-y-2" role="alert">
                      <p className="text-sm">Tienes cambios sin guardar en {openDraft.title}.</p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            const target = pendingSwitch;
                            if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; }
                            setStatus('saving');
                            void runSave({ origin: 'edit' }).then(() => {
                              setPendingSwitch(null);
                              void openDraftById(target.targetId, { force: true });
                            });
                          }}
                        >
                          Guardar y abrir
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setPendingSwitch(null);
                            setStatus('idle');
                            void openDraftById(pendingSwitch.targetId, { force: true });
                          }}
                        >
                          Descartar cambios y abrir
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {saveConflict ? (
                    <div className="rounded border border-amber-400 bg-amber-50 p-3 space-y-2" role="alert">
                      <p className="text-sm font-medium flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden="true" />
                        {saveConflict.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Tus cambios siguen intactos en pantalla: nada se descartó automáticamente y tú decides qué
                        pasa.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={copyContent}>Copiar mis cambios</Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setStatus('idle');
                            void openDraftById(openDraft.id, { force: true });
                          }}
                        >
                          Descartar y recargar
                        </Button>
                        <Button size="sm" onClick={() => { void runSave({ origin: 'edit', force: true }); }}>
                          Forzar mi versión
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {saveStatus === 'error' ? (
                    <div className="rounded border border-red-300 bg-red-50 p-3 space-y-2" role="alert">
                      <p className="text-sm">No se pudo guardar: los cambios siguen en el editor.</p>
                      <Button size="sm" onClick={() => { void runSave({ origin: 'autosave' }); }}>Reintentar</Button>
                    </div>
                  ) : null}

                  <div className="rounded border">
                    <div className="flex items-center gap-1 border-b bg-gray-50 px-2 py-1.5">
                      {toolbarButton('Negrita', Bold, () => chainFocus()?.toggleBold().run(), !!editor?.isActive('bold'))}
                      {toolbarButton('Cursiva', Italic, () => chainFocus()?.toggleItalic().run(), !!editor?.isActive('italic'))}
                      {toolbarButton('Lista con viñetas', List, () => chainFocus()?.toggleBulletList().run(), !!editor?.isActive('bulletList'))}
                      {toolbarButton('Lista numerada', ListOrdered, () => chainFocus()?.toggleOrderedList().run(), !!editor?.isActive('orderedList'))}
                      {toolbarButton('Título de sección', HeadingIcon, applyHeading, !!editor?.isActive('heading'))}
                      {toolbarButton('Limpiar formato', Eraser, () => chainFocus()?.unsetAllMarks().clearNodes().run(), false)}
                    </div>
                    <div className="px-3 py-2">
                      <EditorContent editor={editor} />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={copyContent}>
                      {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                      {copied ? 'Copiado' : 'Copiar'}
                    </Button>
                    <Button
                      size="sm"
                      disabled={saveStatus === 'saving'}
                      onClick={() => {
                        if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; }
                        void runSave({ origin: 'edit' });
                      }}
                    >
                      Guardar cambios
                    </Button>
                  </div>
                </>
              ) : (
                <div className="rounded border border-dashed p-6 text-center">
                  <p className="text-sm font-medium">Editor de borrador</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Abre un borrador anterior o genera uno nuevo para editarlo con formato, guardado automático e
                    historial de versiones.
                  </p>
                </div>
              )}

              {previewVersion ? (
                <div className="space-y-2 rounded border bg-gray-50 p-3">
                  <p className="flex items-center gap-1 text-sm font-medium">
                    <HistoryIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    v{previewVersion.version_no} · {VERSION_ORIGIN_LABEL[previewVersion.origin] ?? previewVersion.origin}
                  </p>
                  <StaticDraftDoc html={draftContentToEditorHtml(previewVersion)} />
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" disabled={restoring} onClick={() => void restoreVersion(previewVersion.version_no)}>
                      {restoring ? 'Restaurar…' : 'Restaurar esta versión'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setPreviewVersion(null)}>
                      Cerrar vista previa
                    </Button>
                  </div>
                </div>
              ) : null}

              {detailError ? <p className="text-sm text-red-600">{detailError}</p> : null}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
