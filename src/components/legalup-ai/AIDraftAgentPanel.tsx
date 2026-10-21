import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  ArrowUp,
  Check,
  ClipboardCopy,
  FileText,
  Loader2,
  MessageSquare,
  Minimize2,
  Paperclip,
  RefreshCw,
  Replace,
  SpellCheck,
  Sparkles,
  TextQuote,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AIChat } from './AIChat';
import { useAICaseChat, useSendChatMessage, type AIChatError } from '@/hooks/useAIChat';
import { useAIDocuments } from '@/hooks/useAIDocuments';
import { convertDraftMarkdownToHtml, htmlToPlainText } from './draftEditorMarkup';

// UA-3 — Composer Agent AI del editor de borradores (patrón Tiptap Agent
// Editor, referencias visuales obligatorias). El composer vive DENTRO de la
// hoja blanca: se posiciona absoluto al final del documento (parte del flujo
// de la página, nunca `fixed` ni `sticky` al viewport) y viaja
// CONTRA-escalado respecto del zoom de la hoja — `scale(1/zoomRatio)` anula
// la escala del ancestro de zoom, igual que la toolbar queda fuera en UA-2.
// Compacto: borde violeta fino de 12 px, icono de destellos a la izquierda y
// botón circular de envío DENTRO del input (flecha arriba, como Tiptap). Al
// enfocar el propio input: expande verticalmente y abre automáticamente el
// menú flotante «Ejemplos de AI Toolkit» por encima (solo acciones reales;
// las que exigen selección explican qué falta sin enviar nada). Las fichas
// del kit (adjuntar/consultar) se conservan dentro del expandido: son
// capacidades de LegalUp que la referencia no cubre. Las propuestas siguen
// siendo revisables (Aceptar/Copiar/Descartar) y todas las protecciones del
// PR original permanecen: cambio de borrador, respuestas tardías, límite de
// contexto, doble inserción.
//
// Limitaciones declaradas frente a la referencia de Tiptap: «Add comparison
// table», «Add AI comment» e «Insert custom component» NO se muestran porque
// el pipeline actual (texto plano insertable en el cursor) no puede ejecutar
// esas acciones — no se simulan capacidades.

export type AIDraftAgentPanelProps = {
  workspaceId: string;
  draftId: string;
  draftTitle: string;
  /** HTML vivo del editor en el momento del envío (null si no disponible). */
  getDraftHtml: () => string | null;
  /**
   * Texto plano de la selección actual del editor (null/sin selección).
   * Se usa en el kit y en las acciones del toolkit que la exigen.
   */
  getSelectionText: () => string | null;
  /**
   * Ratio de zoom de la hoja (1 = 100 %). El composer calcula su
   * contra-escala para mantener un tamaño visual constante.
   */
  zoomRatio: number;
  /**
   * Inserta HTML de la propuesta en la posición actual del cursor Tiptap
   * (mecanismo normal de edición). Devuelve false si no hay posición viable.
   */
  onInsertProposal: (html: string) => boolean;
};

type ProposalState = { id: string; text: string; insertError: boolean };

type ToolkitAction = {
  key: string;
  label: string;
  icon: typeof SpellCheck;
  /** Requiere selección activa; sin ella se explica y no se envía nada. */
  requiresSelection: boolean;
  base: string;
};

const TOOLKIT_ACTIONS: ToolkitAction[] = [
  {
    key: 'proofread-selection',
    label: 'Revisar la selección',
    icon: SpellCheck,
    requiresSelection: true,
    base: 'Revisa la ortografía y gramática de la selección y propón la versión corregida sin cambiar el sentido.',
  },
  {
    key: 'rewrite-selection',
    label: 'Reescribir la selección',
    icon: Replace,
    requiresSelection: true,
    base: 'Reescribe esta selección con mejor redacción, manteniendo el significado original.',
  },
  {
    key: 'shorten-selection',
    label: 'Acortar la selección',
    icon: Minimize2,
    requiresSelection: true,
    base: 'Redacta una versión más corta de esta selección, conservando su sentido esencial.',
  },
  {
    key: 'new-paragraph',
    label: 'Escribir un párrafo nuevo',
    icon: FileText,
    requiresSelection: false,
    base: 'Redacta un párrafo nuevo para el borrador a partir de su contexto actual.',
  },
];

const CONTEXT_SEPARATOR = '---';
const CONTEXT_HEADER = 'Copia del borrador abierto';
/** Límite de la copia adjunta: evita payloads gigantes sin ocultarlo al usuario. */
const MAX_CONTEXT_CHARS = 20000;

const SELECTION_QUOTE_HEADER = 'Selección citada del borrador';

/** rAF con respaldo por timeout (jsdom sin modo visual en tests). */
const raf: (cb: () => void) => number =
  typeof requestAnimationFrame === 'function'
    ? (cb) => requestAnimationFrame(cb)
    : (cb) => window.setTimeout(cb, 16);
const caf = (id: number) => {
  if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(id);
  else window.clearTimeout(id);
};

function composeProposalMessage(instruction: string, draftTitle: string, draftHtml: string | null): string {
  let message = instruction;
  if (draftHtml !== null) {
    let plain = htmlToPlainText(draftHtml);
    if (plain.length > MAX_CONTEXT_CHARS) {
      const totalChars = plain.length;
      plain = `${plain.slice(0, MAX_CONTEXT_CHARS)}\n\n[Nota: la copia del borrador se truncó por longitud: se adjuntaron los primeros ${MAX_CONTEXT_CHARS} caracteres de ${totalChars}.]`;
    }
    message = `${message}\n\n${CONTEXT_SEPARATOR}\n${CONTEXT_HEADER} «${draftTitle}» (texto plano, tal como estaba al enviar este mensaje):\n\n${plain}`;
  }
  return message;
}

/** Chat del caso embebido: `useAIDocuments` solo se monta cuando el usuario
 *  abre la consulta (no en el render inicial del composer), de modo que el
 *  composer puede estar siempre visible sin depender de AuthProvider ni de
 *  cargar documentos del caso que nadie pidió. */
function AgentCaseChat({ workspaceId }: { workspaceId: string }) {
  const { data: documents } = useAIDocuments(workspaceId);
  return <AIChat workspaceId={workspaceId} documents={documents ?? []} hideBorder />;
}

export function AIDraftAgentPanel({
  workspaceId,
  draftId,
  draftTitle,
  getDraftHtml,
  getSelectionText,
  zoomRatio,
  onInsertProposal,
}: AIDraftAgentPanelProps) {
  const chatQuery = useAICaseChat(workspaceId, true);
  const conversationId = chatQuery.data?.conversation?.id ?? null;

  const [input, setInput] = useState('');
  const [attachDraft, setAttachDraft] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [toolkitOpen, setToolkitOpen] = useState(false);
  const [selectionHint, setSelectionHint] = useState<string | null>(null);
  const [proposal, setProposal] = useState<ProposalState | null>(null);
  const [error, setError] = useState<AIChatError | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  // Desplazamiento «sticky» calculado dentro de la hoja. Estrategia: la caja
  // del composer permanece en el flujo de la hoja (su espacio queda reservado y
  // al final de la página descansa en su posición natural, sin tapar nada de
  // forma permanente) y el movimiento se aplica como UNA traslación continua
  // (`translate3d`) sobre el stack interno; nunca se alternan `fixed`,
  // `absolute` ni `sticky` durante el scroll.
  //
  // Por qué no `position: sticky`: dentro de `transform: scale()` el cálculo
  // del scrollport en Chrome queda en coordenadas locales y el elemento se
  // descoloca (a 150 % aterrizaba fuera del viewport), y el contenedor de
  // scroll real es el propio documento sobre ancestros con `overflow` (canvas
  // y padder), que crean scrollports propios donde sticky no pega. La
  // traslación continua sí es independiente del zoom: se lee la geometría en
  // píxeles locales (`offsetTop`/`offsetHeight`, que NO cambian por
  // transforms) y se convierte a píxeles visuales multiplicando por el zoom.
  // El cálculo es lineal (→0 al llegar al final de la hoja), así que no hay
  // saltos ni oscilaciones, y se escribe el estilo directamente (sin re-render
  // de React por frame) para que el seguimiento sea fluido.
  const panelRef = useRef<HTMLElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const toolkitRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(zoomRatio);
  zoomRef.current = zoomRatio;
  const syncPositionRef = useRef<() => void>(() => {});

  // Valor vigente del documento abierto en el momento de resolver callbacks:
  // evita aplicar respuestas de un borrador anterior tras cambiar de borrador.
  const draftIdRef = useRef(draftId);
  draftIdRef.current = draftId;

  const proposalSend = useSendChatMessage(workspaceId);
  const activeRequestRef = useRef<AbortController | null>(null);
  // Para el reintento: el mensaje compuesto exacto del último intento fallido.
  const lastProposalMessageRef = useRef<string | null>(null);
  // Guard de inserción: un doble clic en «Aceptar e insertar» no puede
  // disparar dos insertContent con la misma propuesta.
  const acceptingRef = useRef(false);
  const sending = proposalSend.isPending;

  // El composer se expande con el foco del propio input o con una
  // interacción activa en curso (adjunto, chat abierto, hint de selección,
  // envío en vuelo, texto del input). El toolkit flotante se abre
  // automáticamente al enfocar el input y se cierra al tipear o salir.
  const expanded =
    focused || sending || chatOpen || attachDraft || selectionHint !== null || input.trim().length > 0;
  const toolkitVisible = focused && toolkitOpen;

  // Colapso diferido al perder foco: al hacer clic en un chip del kit o en
  // una fila del toolkit el textarea pierde foco ANTES de que el clic se
  // resuelva; un colapso inmediato esconde/afeita la fila durante la propia
  // pulsación. El retraso corto anula ese race y cualquier focus-in lo
  // cancela (navegación por teclado incluida).
  const collapseTimerRef = useRef<number | null>(null);
  const cancelPendingCollapse = () => {
    if (collapseTimerRef.current !== null) {
      window.clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }
  };
  const handleBackgroundBlur = () => {
    cancelPendingCollapse();
    collapseTimerRef.current = window.setTimeout(() => {
      collapseTimerRef.current = null;
      setFocused(false);
      setToolkitOpen(false);
    }, 200);
  };
  const handleBackgroundFocus = () => {
    cancelPendingCollapse();
    setFocused(true);
  };
  useEffect(() => () => {
    if (collapseTimerRef.current !== null) window.clearTimeout(collapseTimerRef.current);
  }, []);

  // El pointerdown de chips y filas del toolkit anula el default para que el
  // textarea no pierda la selección ni dispare blur: el foco sigue en el
  // composer mientras el usuario interactúa con el toolkit (regla de la
  // referencia). El click sigue resolviéndose igual.
  const keepTextareaFocus = (e: React.MouseEvent) => e.preventDefault();

  // Cambio de borrador: la propuesta/error/reintento en vuelo refería a otro
  // documento. Cualquier respuesta tardía de ese envío queda invalidada por el
  // guard de draftId en onSuccess/onError (y se aborta por completitud), así
  // una respuesta del borrador A nunca puede insertarse en el borrador B.
  // Tampoco quedan menús ni estados obsoletos.
  useEffect(() => {
    activeRequestRef.current?.abort();
    activeRequestRef.current = null;
    lastProposalMessageRef.current = null;
    acceptingRef.current = false;
    setProposal(null);
    setError(null);
    setNotice(null);
    setCopied(false);
    setChatOpen(false);
    setToolkitOpen(false);
    setInput('');
    setAttachDraft(false);
    setSelectionHint(null);
  }, [draftId]);

  // Borra el guard de inserción cuando la propuesta ya no está en pantalla.
  useEffect(() => {
    if (!proposal) acceptingRef.current = false;
  }, [proposal]);

  // Evita un set de estado tras desmonte (chat abortado al cerrar el editor).
  useEffect(() => () => { activeRequestRef.current?.abort(); }, []);

  const dispatchProposal = (message: string) => {
    if (!conversationId || sending || activeRequestRef.current) return;
    const reqDraftId = draftIdRef.current;
    const controller = new AbortController();
    activeRequestRef.current = controller;
    lastProposalMessageRef.current = message;
    setError(null);
    setNotice(null);
    setCopied(false);
    proposalSend.mutate(
      { conversationId, message, signal: controller.signal },
      {
        onSuccess: (data) => {
          if (controller.signal.aborted || draftIdRef.current !== reqDraftId) return;
          setProposal({ id: data.message.id, text: data.message.content, insertError: false });
          lastProposalMessageRef.current = null;
        },
        onSettled: () => { activeRequestRef.current = null; },
        onError: (err) => {
          if (controller.signal.aborted || draftIdRef.current !== reqDraftId) return;
          setError(err);
        },
      }
    );
  };

  const handleSend = () => {
    const instruction = input.trim();
    if (!instruction || sending || !conversationId || activeRequestRef.current) return;
    let draftHtml: string | null = null;
    if (attachDraft) {
      draftHtml = getDraftHtml();
      if (draftHtml === null) {
        // Honestidad del contexto: no se envía nada si la copia no se puede
        // adjuntar de verdad (nunca afirmar contexto que no fue adjuntado).
        setError(new Error('La IA no está viendo ningún borrador. No se pudo leer el contenido actual del editor. Intenta de nuevo.'));
        return;
      }
    }
    dispatchProposal(composeProposalMessage(instruction, draftTitle, draftHtml));
    setInput('');
  };

  // Acción del toolkit: toda propuesta CITA el texto real o ADJUNTA la copia
  // real del borrador: nunca textura simulada. Si una acción exige selección
  // y no la hay, se explica qué falta y no se envía nada. El texto ya
  // escrito en el input nunca se descarta ni se consume.
  const readSelection = (): string | null => {
    try {
      return getSelectionText();
    } catch {
      return null;
    }
  };

  const runToolkitAction = (action: ToolkitAction) => {
    if (sending || !conversationId || activeRequestRef.current) return;
    if (action.requiresSelection) {
      const sel = readSelection();
      if (!sel) {
        setSelectionHint(`Selecciona el texto en el editor para «${action.label}». No se envió nada.`);
        return;
      }
      dispatchProposal(
        composeProposalMessage(`${action.base}\n\n[${SELECTION_QUOTE_HEADER}]\n«${sel}»`, draftTitle, null)
      );
    } else {
      const draftHtml = getDraftHtml();
      if (draftHtml === null) {
        setError(new Error('La IA no está viendo ningún borrador. No se pudo leer el contenido actual del editor. Intenta de nuevo.'));
        return;
      }
      dispatchProposal(composeProposalMessage(action.base, draftTitle, draftHtml));
    }
    setToolkitOpen(false);
  };

  // Acción real del kit: cita la selección ACTUAL del editor en el input.
  // Si no hay selección, se da feedback honesto (nunca cita texto inexistente).
  const handleUseSelection = () => {
    const sel = readSelection();
    if (!sel) {
      setSelectionHint('No hay texto seleccionado en el editor.');
      return;
    }
    setSelectionHint(null);
    const quote = `[${SELECTION_QUOTE_HEADER}]\n«${sel}»`;
    setInput((prev) => (prev.trim().length > 0 ? `${prev}\n\n${quote}` : quote));
  };

  const handleRetry = () => {
    if (!lastProposalMessageRef.current || sending || activeRequestRef.current) return;
    dispatchProposal(lastProposalMessageRef.current);
  };

  const handleAccept = () => {
    if (!proposal || acceptingRef.current) return;
    acceptingRef.current = true;
    const ok = onInsertProposal(convertDraftMarkdownToHtml(proposal.text));
    if (ok) {
      setProposal(null);
      setNotice('Propuesta insertada en el cursor. Revisa el documento y usa Guardar cambios cuando quieras.');
    } else {
      // Sin posición viable: la propuesta se conserva y se informa de forma
      // visible. Se permite reintentar la inserción (guard liberado aquí).
      acceptingRef.current = false;
      setProposal({ ...proposal, insertError: true });
    }
  };

  const handleCopy = async () => {
    if (!proposal) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(proposal.text);
      }
    } catch {
      // noop
    }
    setCopied(true);
  };

  const errorText = error?.message || 'No se pudo generar la propuesta. Intenta nuevamente.';
  const draftAvailable = getDraftHtml() !== null;
  const canRequest = !sending && !!conversationId && !activeRequestRef.current;

  // Seguimiento continuo del composer dentro de la hoja. Ver el comentario de
  // `panelRef` para la justificación de la estrategia.
  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const sheet = el.closest('[data-testid="draft-sheet"]') as HTMLElement | null;
    if (!sheet) return;
    const canvas = el.closest('[data-testid="draft-canvas"]') as HTMLElement | null;
    let frame = 0;
    const GAP = 16; // separación visual al borde inferior del viewport / hoja
    const update = () => {
      frame = 0;
      const stack = stackRef.current;
      if (!stack) return;
      const z = zoomRef.current || 1;
      const h = el.offsetHeight; // alto local; a escala neta 1, visual = local
      if (!h) return;
      const sheetRect = sheet.getBoundingClientRect();
      // La contra-escala ancla el contenido al borde INFERIOR de su caja de
      // flujo, así que la posición natural se mide como borde inferior local
      // (`offsetTop + offsetHeight`, inmunes a los transforms) mapeado a
      // píxeles visuales; el alto visual de la caja es `h` (escala neta 1).
      const naturalBottomV = sheetRect.top + (el.offsetTop + h) * z;
      const maxBottomV = Math.min(window.innerHeight, sheetRect.bottom) - GAP;
      const minTopV = Math.max(sheetRect.top, 0) + GAP;
      // Traslación lineal: crece al desplazar el documento y vuelve a 0 justo
      // al llegar al final de la hoja. Sin branches por evento de scroll.
      let shift = Math.max(0, naturalBottomV - maxBottomV);
      if (naturalBottomV - shift - h < minTopV) {
        shift = Math.max(0, naturalBottomV - h - minTopV);
      }
      // A zoom > 100 % la hoja puede exceder el canvas y quedar recortada; el
      // composer sigue perteneciendo a la hoja pero se mantiene dentro de la
      // zona visible para que nunca se corte su botón de envío.
      let dx = 0;
      const canvasRect = canvas?.getBoundingClientRect();
      if (canvasRect) {
        const w = stack.getBoundingClientRect().width;
        const sheetCenterV = sheetRect.left + sheetRect.width / 2;
        if (w > 0 && w + GAP * 2 <= canvasRect.width) {
          const target = Math.min(
            Math.max(sheetCenterV, canvasRect.left + GAP + w / 2),
            canvasRect.right - GAP - w / 2
          );
          dx = target - sheetCenterV;
        }
      }
      const transform = `translate3d(${Math.round(dx * 100) / 100}px, ${Math.round(-shift * 100) / 100}px, 0)`;
      if (stack.style.transform !== transform) stack.style.transform = transform;
    };
    const schedule = () => { if (!frame) frame = raf(update); };
    stackRef.current?.style.setProperty('will-change', 'transform');
    update();
    // `capture` recoge también el scroll horizontal del padder del canvas.
    window.addEventListener('scroll', schedule, { passive: true, capture: true });
    window.addEventListener('resize', schedule);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
    ro?.observe(el);
    ro?.observe(sheet);
    if (canvas) ro?.observe(canvas);
    syncPositionRef.current = schedule;
    return () => {
      if (frame) caf(frame);
      window.removeEventListener('scroll', schedule, { capture: true });
      window.removeEventListener('resize', schedule);
      ro?.disconnect();
      syncPositionRef.current = () => {};
    };
  }, [zoomRatio]);

  // Tras cada render, re-sincroniza (cambio de alto por foco/toolkit/propuesta,
  // cambio de borrador, etc.) sin esperar a un evento del usuario.
  useLayoutEffect(() => {
    syncPositionRef.current();
  });

  // Toolkit flotante en portal: los ancestros del composer recortan
  // (`overflow` en la hoja/canvas/padder) y crean contextos de apilamiento, así
  // que el menú se renderiza en `document.body` y se ancla por coordenadas al
  // composer. Conserva su sitio al hacer scroll, se voltea debajo si no cabe
  // arriba (nunca queda fuera del viewport) y no altera el z-index global.
  useLayoutEffect(() => {
    if (!toolkitVisible) return;
    const card = cardRef.current;
    const menu = toolkitRef.current;
    if (!card || !menu) return;
    let frame = 0;
    const place = () => {
      frame = 0;
      const r = card.getBoundingClientRect();
      const mh = menu.offsetHeight;
      const mw = Math.min(r.width, window.innerWidth - 16);
      if (!mh || !mw) return;
      const left = Math.min(Math.max(r.left, 8), Math.max(8, window.innerWidth - mw - 8));
      const above = r.top - 8;
      const top = above >= mh ? above - mh : Math.min(r.bottom + 8, window.innerHeight - mh - 8);
      menu.style.left = `${Math.round(left)}px`;
      menu.style.top = `${Math.max(8, Math.round(top))}px`;
      menu.style.width = `${Math.round(mw)}px`;
    };
    const schedule = () => { if (!frame) frame = raf(place); };
    place();
    window.addEventListener('scroll', schedule, { passive: true, capture: true });
    window.addEventListener('resize', schedule);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
    ro?.observe(card);
    ro?.observe(menu);
    return () => {
      if (frame) caf(frame);
      window.removeEventListener('scroll', schedule, { capture: true });
      window.removeEventListener('resize', schedule);
      ro?.disconnect();
    };
  }, [toolkitVisible]);

  return (
    <section
      ref={panelRef}
      data-testid="draft-agent-panel"
      aria-label="Agent AI del borrador"
      className="pointer-events-none relative z-30 mb-6 mt-auto flex justify-center md:mb-10"
      style={{
        // Contra-escala: el ancestro de zoom aplica scale(zoomRatio); este
        // factor neutraliza para que el composer mida visualmente igual a
        // cualquier zoom (regla: solo la hoja se escala). La traslación del
        // seguimiento se escribe aparte sobre el stack interno.
        transform: `scale(${1 / zoomRatio})`,
        transformOrigin: 'bottom center',
      }}
    >
      <div ref={stackRef} className="pointer-events-auto flex w-[calc(100%-2rem)] max-w-[531px] flex-col gap-2">
        {/* Estado focus — menú flotante «Ejemplos de AI Toolkit» encima del
            composer, anclado a él (no tooltip ni diálogo genérico). Se
            renderiza en un portal para que ningún `overflow` de la hoja, del
            canvas o del padder lo recorte. Solo se muestran acciones con
            ejecución real en LegalUp. */}
        {toolkitVisible
          ? createPortal(
              <div
                ref={toolkitRef}
                data-testid="agent-toolkit"
                aria-label="Ejemplos de AI Toolkit"
                style={{ position: 'fixed', left: 0, top: 0, zIndex: 80 }}
                className="pointer-events-auto max-h-[70vh] overflow-y-auto rounded-xl border border-gray-200 bg-card p-1.5 shadow-[0_16px_48px_rgba(17,24,39,0.12),0_4px_12px_rgba(17,24,39,0.08)]"
              >
                <p className="px-2 pb-1 pt-1.5 text-xs font-medium text-muted-foreground">
                  Ejemplos de AI Toolkit
                </p>
                {TOOLKIT_ACTIONS.map((action) => (
                  <button
                    key={action.key}
                    type="button"
                    data-testid={`agent-toolkit-${action.key}`}
                    disabled={!canRequest}
                    onMouseDown={keepTextareaFocus}
                    onClick={() => runToolkitAction(action)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm text-gray-800 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <action.icon className="h-4 w-4 shrink-0 text-gray-500" aria-hidden="true" />
                    {action.label}
                  </button>
                ))}
              </div>,
              document.body
            )
          : null}

        {chatOpen ? (
          <div className="rounded-xl border bg-card shadow-lg" data-testid="agent-chat-card">
            <div className="flex items-center justify-between border-b px-3 py-2">
              <p className="text-xs font-medium flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-green-700" aria-hidden="true" />
                Consultar el caso
              </p>
              <button
                type="button"
                aria-label="Cerrar consulta del caso"
                data-testid="agent-chat-close"
                onClick={() => setChatOpen(false)}
                className="rounded p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="max-h-[380px] overflow-y-auto">
              <AgentCaseChat workspaceId={workspaceId} />
            </div>
          </div>
        ) : null}

        {notice ? (
          <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5" role="status" data-testid="agent-notice">
            <p className="text-xs text-green-800 flex items-center gap-1">
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              {notice}
            </p>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 space-y-1.5 shadow-lg" role="alert" data-testid="agent-proposal-error">
            <p className="text-xs text-amber-900 flex items-start gap-1">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden="true" />
              {errorText}
            </p>
            {lastProposalMessageRef.current ? (
              <Button size="sm" variant="outline" data-testid="agent-proposal-retry" onClick={handleRetry} disabled={sending}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                Reintentar
              </Button>
            ) : null}
          </div>
        ) : null}

        {proposal ? (
          <div className="rounded-xl border bg-card p-3 space-y-2 shadow-lg" data-testid="agent-proposal-card">
            <p className="text-xs font-medium text-green-800 flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Propuesta de texto generada por IA · revísala antes de insertar
            </p>
            {proposal.insertError ? (
              <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2" role="alert" data-testid="agent-insert-error">
                <p className="text-xs text-amber-800 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                  No se pudo insertar en el editor. Usa «Copiar texto» y pégalo donde corresponda.
                </p>
              </div>
            ) : null}
            <div className="max-h-56 overflow-y-auto rounded-lg bg-muted/40 px-3 py-2" data-testid="agent-proposal-text">
              <p className="text-sm whitespace-pre-wrap">{proposal.text}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Aceptar inserta el texto en la posición del cursor sin reemplazar el resto del documento.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" data-testid="agent-proposal-accept" onClick={handleAccept}>
                Aceptar e insertar
              </Button>
              <Button size="sm" variant="outline" data-testid="agent-proposal-copy" onClick={handleCopy}>
                <ClipboardCopy className="h-4 w-4 mr-1" aria-hidden="true" />
                {copied ? 'Copiado' : 'Copiar texto'}
              </Button>
              <Button size="sm" variant="ghost" data-testid="agent-proposal-discard" onClick={() => setProposal(null)}>
                Descartar
              </Button>
            </div>
          </div>
        ) : null}

        {/* Composer compacto → expandido. Sin encabezado: directamente el
            input con el botón de envío DENTRO, a la derecha (Tiptap Agent). */}
        <div
          ref={cardRef}
          data-testid="agent-composer-card"
          className="rounded-xl border border-green-300 bg-card shadow-[0_12px_36px_rgba(15,23,42,0.10),0_3px_10px_rgba(15,23,42,0.06)]"
        >
          {/* Kit contextual del expandido: acciones reales, nunca decorativas.
              Siempre en el DOM (tests y foco estable), visualmente plegado sin
              foco. */}
          <div
            className={cn(
              'overflow-hidden transition-[max-height,opacity] duration-200 ease-out',
              expanded ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'
            )}
          >
            {selectionHint ? (
              <p className="px-3 pt-2 text-xs text-amber-700" data-testid="agent-selection-hint">
                {selectionHint}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-1.5 px-2.5 pt-2">
              <button
                type="button"
                data-testid="agent-attach-draft"
                aria-pressed={attachDraft}
                onMouseDown={keepTextareaFocus}
                disabled={!draftAvailable}
                title={`Adjuntar copia en texto de «${draftTitle}» como contexto de este mensaje`}
                onClick={() => setAttachDraft((v) => !v)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors',
                  attachDraft
                    ? 'border-green-300 bg-green-300 text-green-950'
                    : 'bg-muted/60 hover:bg-muted disabled:opacity-50'
                )}
              >
                <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
                Adjuntar contexto
              </button>
              <button
                type="button"
                data-testid="agent-use-selection"
                onMouseDown={keepTextareaFocus}
                title="Citar la selección actual del editor dentro de la instrucción"
                onClick={handleUseSelection}
                className="inline-flex items-center gap-1.5 rounded-full border bg-muted/60 px-2.5 py-1 text-xs transition-colors hover:bg-muted"
              >
                <TextQuote className="h-3.5 w-3.5" aria-hidden="true" />
                Usar selección
              </button>
              <button
                type="button"
                data-testid="agent-chat-toggle"
                onMouseDown={keepTextareaFocus}
                aria-pressed={chatOpen}
                title="Abrir el chat del caso para consultar antecedentes (no edita el borrador)"
                onClick={() => setChatOpen((v) => !v)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors',
                  chatOpen
                    ? 'border-green-300 bg-green-300 text-green-950'
                    : 'bg-muted/60 hover:bg-muted'
                )}
              >
                <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                Consultar el caso
              </button>
              {sending ? (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" data-testid="agent-sending-hint">
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                  Generando propuesta…
                </span>
              ) : !conversationId ? (
                <span className="text-xs text-muted-foreground">Cargando conversación del caso…</span>
              ) : null}
            </div>
          </div>

          <div data-testid="agent-input-row" className="flex items-center gap-2 px-2.5 py-2">
            {/* Al enfocar se oculta el destello y el área de escritura queda
                limpia; el hueco se reserva (mismo tamaño, `opacity`) para que
                el texto y la flecha no se muevan al transicionar. */}
            <span
              data-testid="agent-sparkles"
              aria-hidden="true"
              className={cn(
                'flex h-4 w-4 shrink-0 items-center justify-center transition-opacity duration-150',
                focused ? 'opacity-0' : 'opacity-100'
              )}
            >
              <Sparkles className="h-4 w-4 text-gray-400" aria-hidden="true" />
            </span>
            <label htmlFor="agent-proposal-instruction" className="sr-only">
              Instrucción para la propuesta
            </label>
            <textarea
              id="agent-proposal-instruction"
              data-testid="agent-proposal-instruction"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setSelectionHint(null);
                setToolkitOpen(false);
              }}
              onFocus={() => {
                handleBackgroundFocus();
                setToolkitOpen(true);
              }}
              onBlur={handleBackgroundBlur}
              placeholder="Pregunta sobre este borrador o solicita un cambio…"
              rows={expanded ? 3 : 1}
              className="min-h-6 flex-1 resize-none border-0 bg-transparent p-0 text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground/80"
            />
            <button
              type="button"
              data-testid="agent-proposal-send"
              disabled={sending || !conversationId || input.trim().length === 0}
              onClick={handleSend}
              title="Enviar"
              className={cn(
                'inline-flex h-8 w-8 shrink-0 select-none items-center justify-center self-center rounded-full p-0 transition-colors',
                sending || input.trim().length === 0 || !conversationId
                  ? 'bg-[rgba(15,22,36,0.05)] text-[rgba(15,22,36,0.4)]'
                  : 'bg-green-300 text-green-950 hover:bg-green-300/90'
              )}
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <ArrowUp className="h-4 w-4" aria-hidden="true" />
              )}
              <span className="sr-only">Enviar</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
