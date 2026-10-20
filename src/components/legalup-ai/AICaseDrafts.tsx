import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import StarterTextAlign from '@tiptap/extension-text-align';
import {
  AlertTriangle,
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Check,
  Copy,
  FilePenLine,
  History as HistoryIcon,
  Italic,
  List,
  ListOrdered,
  Eraser,
  Minus,
  Plus,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
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
    // FASE 4.62J: la config global congela el refetch al volver a la pestaña
    // (App.tsx refetchOnWindowFocus:false). Para los borradores se necesita lo
    // contrario: la lista de otros dispositivos/pestañas debe verse al regresar,
    // sin refetches por render (solo por foco real).
    refetchOnWindowFocus: true,
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
// código, regla horizontal ni enlaces (schema acotado). FASE UA-2 habilita
// subrayado y tachado (ya incluidos en StarterKit 3.x) y añade alineación de
// bloque restringida a párrafos y títulos — nunca listas.
const editorExtensions = () => [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    blockquote: false,
    code: false,
    codeBlock: false,
    horizontalRule: false,
    link: false,
  }),
  StarterTextAlign.configure({ types: ['paragraph', 'heading'] }),
];

// FASE UA-2B — zoom de documento: 50 %–150 % en pasos de 10 %, 100 % por
// defecto, controlado con botones −/+ y un indicador fijo (sin desplegable),
// integrado en la barra de herramientas (fuera de la hoja, no escala).
// Se implementa con CSS `zoom` (no transform) aplicado a la HOJA COMPLETA
// (dimensiones de página, márgenes y texto): el navegador recalcula layout,
// scroll, cursor y selección de forma nativa y la toolbar conserva su tamaño
// y posición. Solo presentación: nunca altera getHTML ni lo persistido.
// Nota: es una hoja visual de altura mínima; el contenido fluye continuo —
// sin paginación real (esa requiere la extensión Pro @tiptap-pro/extension-pages).
const ZOOM_MIN = 50;
const ZOOM_MAX = 150;
type AlignValue = 'left' | 'center' | 'right' | 'justify';

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
    <div className="draft-preview max-h-80 overflow-y-auto rounded-lg border bg-muted/50 p-2 sm:p-3 text-sm">
      <div className="mx-auto rounded-md border bg-white px-3 py-3 shadow-sm sm:px-5 sm:py-4 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_li]:ml-4 [&_p]:my-1">
        <EditorContent editor={previewEditor} />
      </div>
    </div>
  );
}

/** FASE UA-1 — presentación de documento tipo Word: hoja blanca centrada
 *  (A4 ≈ 794 px al 100 % en escritorio) dentro del box de trabajo gris
 *  (FASE UA-2C: la toolbar fue promovida a borde superior del box). Hoja
 *  puramente visual: no toca el ciclo de vida de TipTap, la serialización
 *  HTML, el autosave ni los estados de guardado. La hoja usa altura mínima
 *  de página real (A4 ≈ 1123 px) y el contenido fluye continuo si la
 *  excede — sin paginación fingida. */
function DraftSheet({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <div
      data-testid="draft-sheet"
      className={`mx-auto min-h-[640px] w-full max-w-[794px] overflow-hidden rounded-md border bg-card shadow-sm md:min-h-[1123px] ${className}`}
    >
      {children}
    </div>
  );
}

/** FASE UA-2C — separador visual entre grupos de la toolbar. */
function ToolbarDivider() {
  return <span className="mx-0.5 h-4 w-px shrink-0 bg-gray-300" aria-hidden="true" />;
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
  // FASE 4.62D.34: cierre del editor con contenido no confirmado exige
  // resolución explícita; el panel se monta sobre el mismo patrón de
  // acciones (Continuar / Guardar / Descartar) que pendingSwitch.
  const [pendingClose, setPendingClose] = useState(false);
  const [previewVersion, setPreviewVersion] = useState<CaseDraftVersionDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  // FASE UA-2 — zoom del documento (solo presentación); sobrevive al
  // cierre/reapertura de borradores y nunca toca el HTML guardado.
  const [draftZoom, setDraftZoom] = useState(100);

  const editorRef = useRef<ReturnType<typeof useEditor> | null>(null);
  const tokenRef = useRef<string | null>(null);
  const openRevisionRef = useRef(1);
  const lastSavedHtmlRef = useRef('');
  const openIdRef = useRef<string | null>(null);
  const statusRef = useRef<SaveStatus>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoringRef = useRef(false);
  // Serialización de escrituras: un PUT activo por borrador, promesa compartida
  // para unir invocaciones concurrentes y bandera de contenido más fresco que
  // el PUT activo (se persiste con un trailing save tras el éxito).
  const saveInFlightRef = useRef(false);
  const saveInFlightPromiseRef = useRef<Promise<void> | null>(null);
  const savePendingRef = useRef(false);
  // FASE 4.62D.35: HTML vivo visto mientras el editor existía (fallback de
  // emergencia si TipTap ya destruyó el editor al desmontar) y llave de
  // deduplicación del flush de emergencia (borrador + contenido + revisión).
  const liveHtmlRef = useRef<string | null>(null);
  const emergencyFlushSentRef = useRef<{ draftId: string; html: string; revision: number } | null>(null);

  const setStatus = useCallback((next: SaveStatus) => {
    statusRef.current = next;
    setSaveStatus(next);
  }, []);

  // FASE 4.62D.35: intento de guardado de emergencia reutilizable por
  // beforeunload, pagehide y el desmontaje del editor. Mitigación best-effort,
  // NUNCA una garantía de persistencia: dispara un PUT keepalive sin await ni
  // reintentos; la única confirmación válida sigue siendo la respuesta del
  // guardado normal (OCC single-writer en el servidor). Reglas:
  // - dirty/error intentan; saving se omite (el PUT en vuelo ya lleva ese
  //   contenido: duplicado con la misma base ⇒ 409) y conflict se omite (la
  //   base_revision local está desfasada por definición).
  // - saved también intenta si el HTML vivo difiere del último confirmado
  //   (debounce pendiente de la carrera 4.62D.34 A1).
  // - Deduplicación: mismas llave (borrador, contenido, revisión) dispara un
  //   solo PUT aunque beforeunload, pagehide y cleanup coincidan. La llave se
  //   libera al cambiar el contenido o la revisión (llave nueva natural) o
  //   cuando un guardado normal confirma contenido (runSave la anula).
  const tryEmergencyFlush = useCallback(() => {
    const draftId = openIdRef.current;
    if (!draftId || !tokenRef.current) return;
    const st = statusRef.current;
    if (st === 'saving' || st === 'conflict') return;
    const current = editorRef.current;
    const liveHtml = current && !current.isDestroyed ? current.getHTML() : liveHtmlRef.current;
    if (!liveHtml) return;
    const pendingNew = liveHtml !== lastSavedHtmlRef.current;
    if (st !== 'dirty' && st !== 'error' && !(st === 'saved' && pendingNew)) return;
    const revision = openRevisionRef.current;
    const sent = emergencyFlushSentRef.current;
    if (sent && sent.draftId === draftId && sent.html === liveHtml && sent.revision === revision) return;
    emergencyFlushSentRef.current = { draftId, html: liveHtml, revision };
    void fetch(`${getApiBaseUrl()}/api/ai/cases/${workspaceId}/drafts/${draftId}`, {
      method: 'PUT',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenRef.current}`,
      },
      body: JSON.stringify({
        content: liveHtml,
        content_format: 'html',
        origin: 'autosave',
        base_revision: revision,
      }),
    }).catch(() => { /* best-effort */ });
  }, [workspaceId]);

  const setEditorFromDraft = useCallback((draft: CaseDraft) => {
    const html = draftContentToEditorHtml(draft);
    lastSavedHtmlRef.current = html;
    // FASE 4.62D.35: el fallback de emergencia arranca con el contenido del
    // borrador recién abierto (válido aunque el editor muera antes).
    liveHtmlRef.current = html;
    // FASE 4.62D.11: la base OCC es SIEMPRE la del borrador que se abre. El GET
    // de apertura ya trajo la revisión fresca; asignación directa evita heredar
    // la revisión del borrador anterior (Math.max acumulativo causó 409 real
    // A(rev alta)→B(rev 1)). Las respuestas tardías del borrador previo quedan
    // aisladas por los guards de openIdRef en runSave/restoreVersion.
    openRevisionRef.current = Number(draft.revision) || 1;
    const editor = editorRef.current;
    if (editor && !editor.isDestroyed) {
      editor.commands.setContent(html, { emitUpdate: false });
    }
  }, []);

  const openDraftById = useCallback(
    async (id: string, opts?: { force?: boolean; ifStillOpen?: boolean }) => {
    // FASE 4.62D.32: 'dirty' no es el único estado con texto local más nuevo
    // que el servidor. Tras un guardado fallido ('error') o un conflicto OCC
    // ('conflict'), el contenido del editor tampoco vive en el servidor:
    // abrir otro borrador sin confirmación descartaba el texto en silencio.
    // FASE 4.62D.33: 'saving' entra en el mismo guard — el PUT en vuelo lleva
    // el único contenido local capturado; si termina en fallo después de un
    // cambio de borrador, la única copia se pierde (ruido de respuesta tardía
    // ya aislado por los guards de identidad). La resolución explícita
    // (Guardar y abrir / Descartar cambios y abrir) es la misma panelflow ya
    // probada para 'dirty' (FASE 4.62D.30).
    if (
      (
        statusRef.current === 'dirty'
        || statusRef.current === 'saving'
        || statusRef.current === 'error'
        || statusRef.current === 'conflict'
      )
      && !opts?.force
    ) {
      const target = drafts.find((d) => d.id === id);
      setPendingSwitch({ targetId: id, targetTitle: target?.title ?? 'otro borrador' });
      return null;
    }
    setError(null);
    setPendingSwitch(null);
    // FASE 4.62D.34.2 (A2): un panel de cierre ya no pertenece al borrador
    // nuevo; el desmonte del editor por apertura normal lo limpia.
    setPendingClose(false);
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
      // FASE 4.62J-C: el refresco por foco es un GET automático; si mientras
      // volaba el usuario cerró el borrador (openIdRef.current === null) o
      // abrió otro (id distinto), la respuesta tardía no debe reabrir ni
      // pisar la UI: reabrir tras un cierre solo pertenece a los flujos por
      // intención explícita (click de apertura, generar, Guardar y abrir).
      if (opts?.ifStillOpen && openIdRef.current !== id) return null;
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
    },
    [drafts, workspaceId, setEditorFromDraft, setStatus],
  );

  const runSave = useCallback(
    async (config: { origin: 'autosave' | 'edit'; force?: boolean } = { origin: 'autosave' }) => {
      const id = openIdRef.current;
      const editor = editorRef.current;
      if (!id || !editor || editor.isDestroyed) return;
      // Exclusión mutua real: un único PUT por borrador. Invocaciones durante
      // un guardado activo recuerdan el contenido más fresco y esperan al PUT
      // en vuelo; al terminar, si hay contenido sin confirmar, se persiste con
      // la revisión ya actualizada (trailing save). Nunca dos PUT con la misma
      // base_revision por una carrera intra-pestaña.
      if (saveInFlightRef.current) {
        if (editor.getHTML() !== lastSavedHtmlRef.current) savePendingRef.current = true;
        const inFlight = saveInFlightPromiseRef.current;
        if (inFlight) {
          try { await inFlight; } catch { /* el estado ya lo estableció el catch interno */ }
          if (openIdRef.current !== id) return;
        }
        const fresh = editorRef.current;
        const freshHtml = fresh && !fresh.isDestroyed ? fresh.getHTML() : null;
        if (freshHtml === null || (!config.force && freshHtml === lastSavedHtmlRef.current)) {
          // Contenido ya confirmado por el servidor: el estado 'saved' es
          // real aunque un PUT redundante (edición revertida) siga en vuelo.
          if (statusRef.current !== 'conflict') setStatus('saved');
          return;
        }
        // Concentra las escrituras cortando el possibly-pending debounce; el
        // trailing save mantiene el último contenido.
        if (statusRef.current === 'conflict') return;
        if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; }
        // El trailing save del PUT recién terminado pudo re-tomar la exclusión:
        // esta invocación se une a ESA promesa en vez de apilarse encima.
        if (saveInFlightRef.current) return runSave(config);
      }
      const currentEditor = editorRef.current;
      if (!currentEditor || currentEditor.isDestroyed) return;
      const html = currentEditor.getHTML();
      // FASE 4.62D.35: el PUT normal también es la vía más fiable: registra el
      // HTML vivo si el editor muere a continuación.
      liveHtmlRef.current = html;
      if (!config.force && html === lastSavedHtmlRef.current) {
        setSaveConflict(null);
        savePendingRef.current = false;
        if (statusRef.current === 'saving' || statusRef.current === 'dirty') setStatus('saved');
        return;
      }
      saveInFlightRef.current = true;
      const savePromise = (async () => {
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
          // FASE 4.62D.35: el servidor confirmó este contenido; libera la
          // deduplicación del flush de emergencia (una nueva salida re-evalúa
          // desde cero, y 'saved' con HTML confirmado no la necesita).
          emergencyFlushSentRef.current = null;
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
        } finally {
          // Liberación garantizada en éxito, fallo y conflicto: nunca queda un
          // guardado bloqueado por una petición anterior.
          saveInFlightRef.current = false;
          saveInFlightPromiseRef.current = null;
          // Trailing save: persiste la edición más reciente (escrita durante el
          // PUT) UNA sola vez, solo tras un éxito; el contenido confirmado por
          // el servidor no se re-envía y no hay bucles de autosave.
          if (openIdRef.current === id && savePendingRef.current && statusRef.current === 'saved') {
            savePendingRef.current = false;
            const trailing = editorRef.current;
            if (trailing && !trailing.isDestroyed && trailing.getHTML() !== lastSavedHtmlRef.current) {
              void runSave({ origin: 'autosave' });
            }
          }
        }
      })();
      saveInFlightPromiseRef.current = savePromise;
      return savePromise;
    },
    [workspaceId, queryClient, setStatus, openDraftById]
  );

  const scheduleSave = useCallback(() => {
    if (openIdRef.current == null) return;
    const liveEd = editorRef.current;
    if (liveEd && !liveEd.isDestroyed) liveHtmlRef.current = liveEd.getHTML();
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
        // FASE UA-1: tipografía de documento (base 16px, títulos 24/18/16px)
        // en lugar de prose-sm de UI; la hoja gobierna el ancho de línea.
        class: 'prose max-w-none min-h-[560px] focus:outline-none [&_h1]:text-2xl [&_h2]:text-lg [&_h3]:text-base [&_p]:leading-relaxed',
        spellcheck: 'true',
      },
    },
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  // Desmontaje: FASE 4.62D.35 cancela el debounce de autosave pendiente,
  // limpia la cola de escrituras del borrador abierto y hace UN intento de
  // flush de emergencia (best-effort) si esta instancia sigue siendo la
  // propietaria del borrador abierto con contenido realmente pendiente. Nunca
  // dispara un guardado normal tras el unmount: el debounce se corta antes.
  useEffect(() => () => {
    tryEmergencyFlush();
    if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; }
    saveInFlightRef.current = false;
    saveInFlightPromiseRef.current = null;
    savePendingRef.current = false;
  }, [tryEmergencyFlush]);

  // Flush best-effort al abandonar la página. keepalive sin await: lo que
  // llegue llega; el autosave normal sigue siendo la vía principal.
  // FASE 4.62D.32: tras un guardado fallido ('error') el texto del editor
  // sigue sin llegar al servidor y la base_revision local sigue siendo la
  // vigente — el flush puede persistirla. Con 'conflict' se omite: la
  // base_revision está desfasada por definición (409 garantizado).
  // FASE 4.62D.35: helper compartido con el desmontaje; pagehide se añade como
  // segundo evento de salida (móvil/BFCache) y la deduplicación del helper
  // evita PUT repetidos con el mismo contenido en el mismo tick de salida.
  useEffect(() => {
    window.addEventListener('beforeunload', tryEmergencyFlush);
    window.addEventListener('pagehide', tryEmergencyFlush);
    return () => {
      window.removeEventListener('beforeunload', tryEmergencyFlush);
      window.removeEventListener('pagehide', tryEmergencyFlush);
    };
  }, [tryEmergencyFlush]);

  // Token en caché para el flush de beforeunload (getSession es async).
  // FASE 4.62D.31: el token del montaje caduca (TTL ≈1h con rotación de GoTrue)
  // y el flush no puede esperar una renovación como el autosave normal.
  // La suscripción mantiene tokenRef vigente en memoria (TOKEN_REFRESHED /
  // SIGNED_OUT), sin almacenamiento adicional ni awaitable dentro de
  // beforeunload. El flush sigue siendo best-effort: si la pestaña pasa >1h
  // oculta sin volver a activarse, la renovación queda pausada y el PUT puede
  // llegar expirado (401) — limitación documentada, no garantía del navegador.
  useEffect(() => {
    let alive = true;
    void getAccessToken().then((t) => { if (alive) tokenRef.current = t; });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (alive) tokenRef.current = session?.access_token ?? null;
    });
    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  // Historial de versiones del borrador abierto.
  // FASE 4.62E — primera página (hasta 200, DESC) via React Query; páginas
  // anteriores se anexan manualmente (olderVersions) con el cursor
  // ?before=<min version_no>. total_count permite saber si quedan más.
  const versionsQuery = useQuery<CaseDraftVersionMeta[]>({
    queryKey: [...AI_CASE_DRAFTS_QUERY_KEY, workspaceId, openId, 'versions'],
    enabled: !!openId,
    // FASE 4.62J: mismo criterio que la lista — al regresar el foco el
    // historial debe reflejar el servidor (p. ej. autosaves de otra pestaña).
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const body = await requestJson<{ versions?: CaseDraftVersionMeta[]; total_count?: number }>(
        `${getApiBaseUrl()}/api/ai/cases/${workspaceId}/drafts/${openId}/versions`,
        { method: 'GET' }
      );
      if (typeof body?.total_count === 'number') setVersionsTotal(body.total_count);
      return body?.versions ?? [];
    },
  });
  const [olderVersions, setOlderVersions] = useState<CaseDraftVersionMeta[]>([]);
  const [olderLoading, setOlderLoading] = useState(false);
  const [olderError, setOlderError] = useState<string | null>(null);
  const [versionsTotal, setVersionsTotal] = useState<number | null>(null);
  // Dedupe por version_no: los refetch de página 1 tras cada guardado no
  // pueden duplicar filas frente a las páginas ya anexadas. Se conserva el
  // orden DESC del servidor.
  const mergedVersions = useMemo(() => {
    const seen = new Set<number>();
    const out: CaseDraftVersionMeta[] = [];
    for (const v of [...(versionsQuery.data ?? []), ...olderVersions]) {
      if (seen.has(v.version_no)) continue;
      seen.add(v.version_no);
      out.push(v);
    }
    return out;
  }, [versionsQuery.data, olderVersions]);
  useEffect(() => {
    // Cambio de borrador: el historial paginado/paginación se reinicia.
    setOlderVersions([]);
    setOlderError(null);
    setVersionsTotal(null);
    setOlderLoading(false);
  }, [openId]);
  const loadOlderVersions = async () => {
    if (!openId || olderLoading) return;
    // Ancla de frontera: la fila mínima ya mostrada se fija en el estado anexo
    // ANTES del fetch; así, si un guardado refresca la página 1 y esta fila
    // sale fuera del top-200, no decae en el corte entre páginas. Regresión
    // cubierta por 'no omite versiones en la unión' (fase 4.62E.1).
    setOlderVersions((prev) => {
      const minRow = mergedVersions[mergedVersions.length - 1];
      if (!minRow || prev.some((v) => v.version_no === minRow.version_no)) return prev;
      return [...prev, minRow];
    });
    const minShown = mergedVersions.length ? mergedVersions[mergedVersions.length - 1].version_no : null;
    if (minShown === null || minShown <= 0) return;
    setOlderLoading(true);
    setOlderError(null);
    try {
      const body = await requestJson<{ versions?: CaseDraftVersionMeta[]; total_count?: number }>(
        `${getApiBaseUrl()}/api/ai/cases/${workspaceId}/drafts/${openId}/versions?before=${minShown}`,
        { method: 'GET' }
      );
      if (typeof body?.total_count === 'number') setVersionsTotal(body.total_count);
      const arrived = body?.versions ?? [];
      if (openIdRef.current !== openId) return;
      setOlderVersions((prev) => {
        const seen = new Set<number>([
          ...(versionsQuery.data ?? []).map((v) => v.version_no),
          ...prev.map((v) => v.version_no),
        ]);
        return [...prev, ...arrived.filter((v) => !seen.has(v.version_no))];
      });
    } catch (e) {
      setOlderError(e instanceof Error ? e.message : 'No se pudo cargar el historial anterior.');
    } finally {
      if (openIdRef.current === openId) setOlderLoading(false);
    }
  };

  // FASE 4.62J: al recuperar visibilidad/foco, el encabezado del borrador
  // abierto debe reflejar el servidor (otra pestaña/dispositivo pudo guardar).
  // El refresco reutiliza el GET de apertura (openDraftById con force), que
  // ya re-basa occ y el contenido. Reglas de seguridad, en este orden:
  // - dirty/saving/error/conflict: hay contenido local más nuevo que el
  //   servidor (o desfasado) — el refresco NUNCA pisa texto local ni
  //   interrumpe un PUT en vuelo; la resolución queda en flujos existentes.
  // - restauración en vuelo (restoringRef): el POST ya re-basará todo.
  // - preview de versión abierta: la vista previa es una porción inmutable del
  //   historial; el openDraftById cerraría la preview sin motivo.
  // - Dedupe: visibilitychange + focus disparan juntos; ventana de 1500 ms.
  const lastHeadVisibleRefreshRef = useRef(0);
  useEffect(() => {
    if (!openId) return;
    const refreshHeadOnVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (openIdRef.current !== openId) return;
      const st = statusRef.current;
      if (st === 'dirty' || st === 'saving' || st === 'error' || st === 'conflict') return;
      if (restoringRef.current) return;
      if (previewVersion) return;
      const now = Date.now();
      if (now - lastHeadVisibleRefreshRef.current < 1500) return;
      lastHeadVisibleRefreshRef.current = now;
      void openDraftById(openId, { force: true, ifStillOpen: true });
    };
    document.addEventListener('visibilitychange', refreshHeadOnVisible);
    window.addEventListener('focus', refreshHeadOnVisible);
    return () => {
      document.removeEventListener('visibilitychange', refreshHeadOnVisible);
      window.removeEventListener('focus', refreshHeadOnVisible);
    };
  }, [openId, openDraftById, previewVersion]);

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
    // Doble-clic / carrera: solo una restauración en vuelo. La serialización de
    // escrituras hace que runSave espere (y use la revisión más fresca), así
    // que siempre se flushea en orden y nunca con una base_revision obsoleta.
    if (restoringRef.current) return;
    restoringRef.current = true;
    setRestoring(true);
    setDetailError(null);
    try {
      // Ediciones pendientes o escrituras ya en vuelo: se guardan PRIMERO,
      // serializadas (runSave se une a la cola activa). Sin nada pendiente, la
      // restauración es directa (sin PUT). El contenido local se pierde solo
      // si el servidor confirmó el guardado (2xx → 'saved').
      // Fallos (error 500) y conflictos OCC dejan el texto local intachable y
      // cancelan la restauración.
      if (saveInFlightRef.current || statusRef.current === 'dirty' || statusRef.current === 'saving') {
        if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; }
        await runSave({ origin: 'edit' });
        // Local: runSave actualiza a través de callbacks; el valor que importa
        // es el posterior al guardado, no el 'dirty' estrechado por el await.
        const afterFlush = statusRef.current as SaveStatus;
        if (afterFlush !== 'saved') {
          setDetailError('La restauración se canceló: guarda o resuelve tus cambios pendientes primero. Tu texto sigue en el editor.');
          return;
        }
      }
      const body = await requestJson<{ draft?: CaseDraft }>(
        `${getApiBaseUrl()}/api/ai/cases/${workspaceId}/drafts/${openId}/versions/${versionNo}/restore`,
        { method: 'POST' }
      );
      const restored = body?.draft;
      // FASE 4.62D.11 — identidad: si el usuario cambió de borrador mientras el
      // POST restauraba (el switch no queda bloqueado por 'saving'), esta
      // respuesta tardía no puede reabrir el borrador A ni pisar el contenido,
      // la revisión ni el estado del borrador B ahora abierto.
      if (openIdRef.current !== openId) return;
      if (restored) {
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
      restoringRef.current = false;
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

  const closeDraft = (opts?: { force?: boolean }) => {
    // FASE 4.62D.34: el cierre también contiene la única copia local cuando
    // hay texto sin confirmar (dirty), un PUT en vuelo (saving), un guardado
    // fallido (error) o un conflicto OCC (conflict). Igual que el cambio de
    // borrador (FASE 4.62D.33), el desmonte exige elegir con certeza, y el
    // reglamento del PUT o el trailing save en vuelo se resuelve como en
    // Guardar y abrir.
    // FASE 4.62D.34.2 (A1): 'saved' por sí solo no es prueba de cierre seguro
    // — un PUT que confirma mientras el debounce de una edición posterior
    // sigue armado deja statusRef 'saved' con HTML no confirmado. La fuente
    // de verdad del cierre es el HTML vivo contra lastSavedHtmlRef. Las
    // demás escrituras pendientes se manifiestan en statusRef: el PUT en
    // vuelo y el trailing setean 'saving' de forma síncrona antes de
    // cualquier await, y el debounce solo vive junto a un campo si está en
    // ese estado 'saved' obsoleto, por lo que la comparación de HTML cierra
    // todas las ventanas observables sin sistema de estado paralelo.
    const liveEditor = editorRef.current;
    const liveHtml = liveEditor && !liveEditor.isDestroyed ? liveEditor.getHTML() : null;
    if (
      !opts?.force
      && (
        statusRef.current === 'dirty'
        || statusRef.current === 'saving'
        || statusRef.current === 'error'
        || statusRef.current === 'conflict'
        || (liveHtml !== null && liveHtml !== lastSavedHtmlRef.current)
      )
    ) {
      setPendingClose(true);
      return;
    }
    setPendingClose(false);
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

  // FASE UA-2 — toolbar profesional: estilo de párrafo/título por select,
  // alineación de bloque y zoom solo-presentación.
  const applyBlockStyle = (value: 'p' | 'h1' | 'h2' | 'h3') => {
    if (!editor || editor.isDestroyed) return;
    const chain = editor.chain().focus();
    if (value === 'p') { chain.setParagraph().run(); return; }
    const level = Number(value.slice(1)) as 1 | 2 | 3;
    chain.setHeading({ level }).run();
  };

  const applyTextAlign = (value: 'left' | 'center' | 'right' | 'justify') => {
    if (!editor || editor.isDestroyed) return;
    editor.chain().focus().setTextAlign(value).run();
  };

  const applyZoom = (value: number) => {
    setDraftZoom(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value)));
  };

  // Estados activos de la toolbar (FASE UA-2). Izquierda cuenta como activa
  // cuando no hay ninguna otra alineación marcada (valor por defecto).
  const isAlignActive = (value: AlignValue) =>
    !!editor?.isActive({ textAlign: value });
  const activeAlign: AlignValue = isAlignActive('center')
    ? 'center'
    : isAlignActive('right')
      ? 'right'
      : isAlignActive('justify')
        ? 'justify'
        : 'left';
  const blockStyleValue = editor?.isActive('heading', { level: 1 })
    ? 'h1'
    : editor?.isActive('heading', { level: 2 })
      ? 'h2'
      : editor?.isActive('heading', { level: 3 })
        ? 'h3'
        : 'p';

  // FASE UA-2C — botones planos fieles a Tiptap Agent Editor: icono de 16 px
  // sin caja permanente, hover gris SOLO al pasar el cursor y estado activo
  // como COLOR DEL ICONO (verde acento LegalUp) sin fondo, borde ni chip.
  // IA/estados y accesibilidad intactos (aria-pressed, sr-only, focus ring).
  const toolbarButton = (
    title: string,
    Icon: typeof Bold,
    action: () => void,
    active: boolean,
    disabled: boolean = false
  ) => (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled || !editor || editor.isDestroyed}
      onClick={action}
      className={`rounded p-1.5 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-700 ${active ? 'text-green-700' : 'text-gray-800'} ${disabled || !editor || editor.isDestroyed ? 'opacity-50' : ''}`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
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
                        className={`w-full text-left rounded border px-3 py-2 hover:bg-gray-50 ${openId === d.id ? 'border-green-300' : ''}`}
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
                  ) : mergedVersions.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Aún no hay versiones registradas.</p>
                  ) : (
                    <>
                      {versionsTotal != null && versionsTotal > mergedVersions.length ? (
                        <p className="text-xs text-muted-foreground mb-1">
                          Mostrando {mergedVersions.length} de {versionsTotal} versiones
                        </p>
                      ) : null}
                      <ul className="space-y-1">
                        {mergedVersions.map((v) => (
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
                      {versionsTotal != null && versionsTotal > mergedVersions.length ? (
                        <div className="mt-2 space-y-1">
                          <Button
                            size="sm"
                            variant="outline"
                            data-testid="draft-versions-load-more"
                            disabled={olderLoading}
                            onClick={() => void loadOlderVersions()}
                          >
                            {olderLoading ? 'Cargando…' : 'Cargar versiones anteriores'}
                          </Button>
                          {olderError ? (
                            <p className="text-xs text-red-600" role="alert">{olderError}</p>
                          ) : null}
                        </div>
                      ) : null}
                    </>
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
                        aria-live="polite"
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
                              // FASE 4.62D.30: runSave nunca rechaza (su catch
                              // interno traduce fallos a status 'error'|'conflict'),
                              // así que la apertura del destino exige 'saved'.
                              // Errores y conflictos 409 mantienen al usuario en
                              // el borrador de origen con su texto y el panel de
                              // recuperación; el switch forzado solo existe en
                              // «Descartar cambios y abrir».
                              if (statusRef.current !== 'saved') return;
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

                  {pendingClose ? (
                    <div className="rounded border border-amber-300 bg-amber-50 p-3 space-y-2" role="alert">
                      <p className="text-sm">Tienes cambios sin guardar en {openDraft.title}.</p>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => setPendingClose(false)}>
                          Seguir editando
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; }
                            // FASE 4.62D.34.2 (A2): identidad al momento del clic.
                            // Si el usuario cancela y abre otro borrador antes
                            // de que la unión resuelva, el .then no actúa y las
                            // guards de openIdRef asilan la respuesta tardía.
                            const forCloseId = openIdRef.current;
                            // FASE 4.62D.34: mismas reglas que «Guardar y abrir»
                            // (FASE 4.62D.30): el cierre solo procede con
                            // 'saved' real; la unión espera el PUT en vuelo y
                            // sin fuerza el conflicto 409 pide la decisión
                            // explícita del panel de conflicto.
                            setStatus('saving');
                            void runSave({ origin: 'edit' }).then(() => {
                              if (statusRef.current !== 'saved') return;
                              if (openIdRef.current !== forCloseId || forCloseId === null) return;
                              setPendingClose(false);
                              closeDraft({ force: true });
                            });
                          }}
                        >
                          Guardar y cerrar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            // Descarte explícito: el cierre procede igual que
                            // «Descartar cambios y abrir»; la respuesta tardía
                            // del PUT en vuelo queda aislada por los guards de
                            // identidad.
                            closeDraft({ force: true });
                          }}
                        >
                          Descartar y cerrar
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

                  {/* FASE UA-2C — fiel a Tiptap Agent Editor: el box de
                      trabajo es una tarjeta con la toolbar pegada al BORDE
                      SUPERIOR y FULL WIDTH (primera hija, sin margen ni
                      inset), separadores finos y controles centrados dentro
                      de ella; debajo, el lienzo gris contiene la hoja con
                      separación mínima consistente. El zoom − % + vive en la
                      barra y no escala nunca. El CSS zoom escala la HOJA
                      COMPLETA (dimensiones, márgenes y texto) y el ancho del
                      envoltorio se ajusta a 100/zoom %: el ancho renderizado
                      queda siempre contenido en el box (sin overflow de la
                      página ni superposición con la toolbar; nativo, sin
                      transform). Márgenes de documento (2,5 cm ≈ 72 px en
                      escritorio, reducidos en móvil). La hoja sigue siendo
                      visual y de flujo continuo — sin paginación real. */}
                  <div data-testid="draft-canvas" className="rounded-lg border bg-muted/50 overflow-hidden">
                    <div role="toolbar" aria-label="Formato del borrador" data-testid="draft-toolbar" className="flex flex-wrap items-center justify-center gap-0.5 border-b bg-card px-3 py-1.5">
                      {toolbarButton('Deshacer', Undo2, () => chainFocus()?.undo().run(), false, !editor?.can().undo())}
                      {toolbarButton('Rehacer', Redo2, () => chainFocus()?.redo().run(), false, !editor?.can().redo())}
                      <ToolbarDivider />
                      <div role="group" aria-label="Zoom del documento" className="flex items-center gap-0.5">
                        <button
                          type="button"
                          title="Reducir zoom"
                          aria-label="Reducir zoom"
                          disabled={draftZoom <= ZOOM_MIN}
                          onClick={() => applyZoom(draftZoom - 10)}
                          className="rounded p-1.5 text-gray-800 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-700 disabled:opacity-50"
                        >
                          <Minus className="h-4 w-4" aria-hidden="true" />
                          <span className="sr-only">Reducir zoom</span>
                        </button>
                        <span aria-live="polite" className="min-w-[44px] px-0.5 text-center text-xs leading-4 text-gray-800">{draftZoom} %</span>
                        <button
                          type="button"
                          title="Aumentar zoom"
                          aria-label="Aumentar zoom"
                          disabled={draftZoom >= ZOOM_MAX}
                          onClick={() => applyZoom(draftZoom + 10)}
                          className="rounded p-1.5 text-gray-800 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-700 disabled:opacity-50"
                        >
                          <Plus className="h-4 w-4" aria-hidden="true" />
                          <span className="sr-only">Aumentar zoom</span>
                        </button>
                      </div>
                      <ToolbarDivider />
                      <label htmlFor="draft-block-style" className="sr-only">Estilo de párrafo o título</label>
                      <select
                        id="draft-block-style"
                        aria-label="Estilo de párrafo o título"
                        disabled={!editor || editor.isDestroyed}
                        value={blockStyleValue}
                        onChange={(e) => applyBlockStyle(e.target.value as 'p' | 'h1' | 'h2' | 'h3')}
                        className="rounded bg-transparent px-1.5 py-1 text-xs text-gray-800 leading-4 hover:bg-gray-100 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-700"
                      >
                        <option value="p">Párrafo</option>
                        <option value="h1">Título 1</option>
                        <option value="h2">Título 2</option>
                        <option value="h3">Título 3</option>
                      </select>
                      <ToolbarDivider />
                      {toolbarButton('Lista con viñetas', List, () => chainFocus()?.toggleBulletList().run(), !!editor?.isActive('bulletList'))}
                      {toolbarButton('Lista numerada', ListOrdered, () => chainFocus()?.toggleOrderedList().run(), !!editor?.isActive('orderedList'))}
                      <ToolbarDivider />
                      {toolbarButton('Negrita', Bold, () => chainFocus()?.toggleBold().run(), !!editor?.isActive('bold'))}
                      {toolbarButton('Cursiva', Italic, () => chainFocus()?.toggleItalic().run(), !!editor?.isActive('italic'))}
                      {toolbarButton('Tachado', Strikethrough, () => chainFocus()?.toggleStrike().run(), !!editor?.isActive('strike'))}
                      {toolbarButton('Subrayado', Underline, () => chainFocus()?.toggleUnderline().run(), !!editor?.isActive('underline'))}
                      <ToolbarDivider />
                      {toolbarButton('Alinear a la izquierda', AlignLeft, () => applyTextAlign('left'), activeAlign === 'left')}
                      {toolbarButton('Centrar', AlignCenter, () => applyTextAlign('center'), activeAlign === 'center')}
                      {toolbarButton('Alinear a la derecha', AlignRight, () => applyTextAlign('right'), activeAlign === 'right')}
                      {toolbarButton('Justificar', AlignJustify, () => applyTextAlign('justify'), activeAlign === 'justify')}
                      <ToolbarDivider />
                      {toolbarButton('Limpiar formato', Eraser, () => chainFocus()?.unsetAllMarks().clearNodes().run(), false)}
                    </div>
                    <div className="p-2 sm:p-4 md:p-6 overflow-x-clip">
                      <div
                        data-testid="draft-zoom-content"
                        style={{ zoom: draftZoom / 100, width: `${100 / (draftZoom / 100)}%` }}
                      >
                        <DraftSheet>
                          <div className="px-4 py-8 sm:px-9 md:px-[72px] md:py-[56px]">
                            <EditorContent editor={editor} />
                          </div>
                        </DraftSheet>
                      </div>
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
                    <Button
                      size="sm"
                      disabled={restoring || saveStatus === 'saving'}
                      onClick={() => void restoreVersion(previewVersion.version_no)}
                    >
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
