import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ClipboardCopy,
  Loader2,
  MessageSquare,
  Paperclip,
  RefreshCw,
  Send,
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
// Editor). Sin encabezado ni subtítulo: un composer compacto anclado a la
// parte inferior del área visible del documento (`sticky bottom`), que se
// expande verticalmente al obtener foco y muestra un kit contextual con solo
// acciones reales (adjuntar copia del borrador, citar la selección actual del
// editor, abrir el chat del caso). El botón de envío vive DENTRO del input,
// alineado a la derecha. Las propuestas se presentan como tarjetas flotantes
// sobre el composer y mantienen Aceptar/Copiar/Descartar. El composer es un
// hermano del lienzo (nunca escalado por el zoom). El anclaje no tapa el
// contenido de forma permanente: el lienzo compensa con padding inferior y al
// llegar al final del scroll el composer queda en su posición natural.

export type AIDraftAgentPanelProps = {
  workspaceId: string;
  draftId: string;
  draftTitle: string;
  /** HTML vivo del editor en el momento del envío (null si no disponible). */
  getDraftHtml: () => string | null;
  /**
   * Texto plano de la selección actual del editor (null/sin selección).
   * Se usa en el kit contextual para citar texto real en la instrucción.
   */
  getSelectionText: () => string | null;
  /**
   * Inserta HTML de la propuesta en la posición actual del cursor Tiptap
   * (mecanismo normal de edición). Devuelve false si no hay posición viable.
   */
  onInsertProposal: (html: string) => boolean;
};

type ProposalState = { id: string; text: string; insertError: boolean };

const CONTEXT_SEPARATOR = '---';
const CONTEXT_HEADER = 'Copia del borrador abierto';
/** Límite de la copia adjunta: evita payloads gigantes sin ocultarlo al usuario. */
const MAX_CONTEXT_CHARS = 20000;

const SELECTION_QUOTE_HEADER = 'Selección citada del borrador';

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

export function AIDraftAgentPanel({
  workspaceId,
  draftId,
  draftTitle,
  getDraftHtml,
  getSelectionText,
  onInsertProposal,
}: AIDraftAgentPanelProps) {
  const { data: documents } = useAIDocuments(workspaceId);
  const chatQuery = useAICaseChat(workspaceId, true);
  const conversationId = chatQuery.data?.conversation?.id ?? null;

  const [input, setInput] = useState('');
  const [attachDraft, setAttachDraft] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [selectionHint, setSelectionHint] = useState<string | null>(null);
  const [proposal, setProposal] = useState<ProposalState | null>(null);
  const [error, setError] = useState<AIChatError | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

  // El kit contextual solo se muestra con el composer expandido (foco) o con
  // una interacción activa: casi igual al patrón Tiptap, que expande onFocus
  // y colapsa al salir; aquí se conservan los modos en curso (adjunto,
  // chat abierto, hint de selección, envío en vuelo, texto del input).
  const expanded =
    focused || sending || chatOpen || attachDraft || selectionHint !== null || input.trim().length > 0;

  // Colapso diferido al perder foco: al hacer clic en un chip del kit el
  // textarea pierde foco ANTES de que el clic se resuelva; un colapso
  // inmediato esconde/afeita el chip durante la propia pulsación. El retraso
  // corto anula ese race y cualquier focus-in lo cancela (navegación por
  // teclado incluida).
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
    }, 200);
  };
  const handleBackgroundFocus = () => {
    cancelPendingCollapse();
    setFocused(true);
  };
  useEffect(() => () => {
    if (collapseTimerRef.current !== null) window.clearTimeout(collapseTimerRef.current);
  }, []);

  // El pointerdown de los chips anula el default para que el textarea no
  // pierda la selección ni dispare blur; el click sigue resolviéndose igual.
  const keepTextareaFocus = (e: React.MouseEvent) => e.preventDefault();

  // Cambio de borrador: la propuesta/error/reintento en vuelo refería a otro
  // documento. Cualquier respuesta tardía de ese envío queda invalidada por el
  // guard de draftId en onSuccess/onError (y se aborta por completitud), así
  // una respuesta del borrador A nunca puede insertarse en el borrador B.
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

  // Acción real del kit: cita la selección ACTUAL del editor en el input.
  // Si no hay selección, se feedback honesto (nunca cita texto inexistente).
  const handleUseSelection = () => {
    let sel: string | null = null;
    try {
      sel = getSelectionText();
    } catch {
      sel = null;
    }
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

  return (
    <section
      data-testid="draft-agent-panel"
      aria-label="Agent AI del borrador"
      className="sticky bottom-3 z-30 mt-1"
    >
      <div className="space-y-2">
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
              <AIChat workspaceId={workspaceId} documents={documents ?? []} hideBorder />
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
          className={cn(
            'rounded-xl border bg-card shadow-[0_12px_36px_rgba(15,23,42,0.10),0_3px_10px_rgba(15,23,42,0.06)] transition-[border-color] duration-150',
            expanded ? 'border-green-700' : 'border-input hover:border-green-700/50'
          )}
        >
          {/* Kit contextual: acciones reales, nunca decorativas. Siempre en el
              DOM (tests y foco estable), visualmente plegado sin foco. */}
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
                    ? 'border-green-700 bg-green-700 text-white'
                    : 'bg-muted/60 hover:bg-muted disabled:opacity-50'
                )}
              >
                <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
                Adjuntar borrador
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
                    ? 'border-green-700 bg-green-700 text-white'
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

          <div className="flex items-end gap-2 px-2.5 py-2">
            <Sparkles className="h-4 w-4 shrink-0 text-green-700 mt-1.5" aria-hidden="true" />
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
              }}
              onFocus={handleBackgroundFocus}
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
              title="Generar propuesta"
              className={cn(
                'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full p-0 transition-colors',
                sending || input.trim().length === 0 || !conversationId
                  ? 'bg-muted/70 text-muted-foreground'
                  : 'bg-green-700 text-white hover:bg-green-800'
              )}
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="h-4 w-4" aria-hidden="true" />
              )}
              <span className="sr-only">Enviar</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
