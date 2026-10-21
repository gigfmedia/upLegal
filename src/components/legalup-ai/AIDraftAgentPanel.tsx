import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ClipboardCopy,
  FileText,
  Loader2,
  MessageSquare,
  RefreshCw,
  Send,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AIChat } from './AIChat';
import { useAICaseChat, useSendChatMessage, type AIChatError } from '@/hooks/useAIChat';
import { useAIDocuments } from '@/hooks/useAIDocuments';
import { convertDraftMarkdownToHtml, htmlToPlainText } from './draftEditorMarkup';

// UA-3 — Panel Agent AI del editor de borradores. Fuera del lienzo escalado
// por el zoom (hermano del canvas, nunca dentro de draft-zoom-content). Dos
// modos claramente separados:
//  1. «Consultar el caso»: el chat del caso existente (AIChat) reutilizado tal
//     cual — consulta, nunca edita el borrador.
//  2. «Proponer cambios»: tras contento del usuario, envía una instrucción por
//     el chat del caso (opcionalmente adjuntando una COPIA en texto plano del
//     borrador abierto, compuesta aquí en el cliente). El backend siempre
//     vira una propuesta NUEVA como mensaje del chat: el resultado se presenta
//     como «propuesta de texto generada por IA» con Aceptar e insertar (siempre
//     en el cursor vía comandos Tiptap normales, autosave/OCC intactos),
//     Copiar texto y Descartar. Nunca reemplaza el documento completo ni
//     sincroniza redacciones automáticamente.

export type AIDraftAgentPanelProps = {
  workspaceId: string;
  draftId: string;
  draftTitle: string;
  /** HTML vivo del editor en el momento del envío (null si no disponible). */
  getDraftHtml: () => string | null;
  /**
   * Inserta HTML de la propuesta en la posición actual del cursor Tiptap
   * (mecanismo normal de edición). Devuelve false si no hay posición viable.
   */
  onInsertProposal: (html: string) => boolean;
};

type ProposalState = { id: string; text: string; insertError: boolean };
type Tab = 'chat' | 'proposal';

const CONTEXT_SEPARATOR = '---';
const CONTEXT_HEADER = 'Copia del borrador abierto';

function composeProposalMessage(instruction: string, draftTitle: string, draftHtml: string | null): string {
  let message = instruction;
  if (draftHtml !== null) {
    const plain = htmlToPlainText(draftHtml);
    message = `${message}\n\n${CONTEXT_SEPARATOR}\n${CONTEXT_HEADER} «${draftTitle}» (texto plano, tal como estaba al enviar este mensaje):\n\n${plain}`;
  }
  return message;
}

export function AIDraftAgentPanel({ workspaceId, draftId, draftTitle, getDraftHtml, onInsertProposal }: AIDraftAgentPanelProps) {
  const { data: documents } = useAIDocuments(workspaceId);
  const chatQuery = useAICaseChat(workspaceId, true);
  const conversationId = chatQuery.data?.conversation?.id ?? null;

  const [tab, setTab] = useState<Tab>('proposal');
  const [input, setInput] = useState('');
  const [attachDraft, setAttachDraft] = useState(false);
  const [proposal, setProposal] = useState<ProposalState | null>(null);
  const [error, setError] = useState<AIChatError | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const proposalSend = useSendChatMessage(workspaceId);
  const activeRequestRef = useRef<AbortController | null>(null);
  // Para el reintento: el mensaje compuesto exacto del último intento fallido.
  const lastProposalMessageRef = useRef<string | null>(null);
  const sending = proposalSend.isPending;

  // Cambio de borrador: la propuesta/publicación refería a otro documento.
  useEffect(() => {
    setProposal(null);
    setError(null);
    setNotice(null);
    setCopied(false);
  }, [draftId]);

  // Evita un set de estado tras desmonte (chat abortado al cerrar el editor).
  useEffect(() => () => { activeRequestRef.current?.abort(); }, []);

  const dispatchProposal = (message: string) => {
    if (!conversationId || sending || activeRequestRef.current) return;
    const controller = new AbortController();
    activeRequestRef.current = controller;
    lastProposalMessageRef.current = message;
    setError(null);
    setCopied(false);
    proposalSend.mutate(
      { conversationId, message, signal: controller.signal },
      {
        onSuccess: (data) => {
          if (controller.signal.aborted) return;
          setProposal({ id: data.message.id, text: data.message.content, insertError: false });
          lastProposalMessageRef.current = null;
        },
        onSettled: () => { activeRequestRef.current = null; },
        onError: (err) => {
          if (controller.signal.aborted) return;
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

  const handleRetry = () => {
    if (!lastProposalMessageRef.current || sending || activeRequestRef.current) return;
    dispatchProposal(lastProposalMessageRef.current);
  };

  const handleAccept = () => {
    if (!proposal) return;
    const ok = onInsertProposal(convertDraftMarkdownToHtml(proposal.text));
    if (ok) {
      setProposal(null);
      setNotice('Propuesta insertada en el cursor. Revisa el documento y usa Guardar cambios cuando quieras.');
    } else {
      // Sin posición viable: la propuesta se conserva y se informa de forma visible.
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
      className="rounded-lg border bg-card p-4 space-y-3"
    >
      <div className="flex items-start gap-2">
        <Sparkles className="h-4 w-4 text-green-700 mt-0.5" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium">Agent AI</p>
          <p className="text-xs text-muted-foreground">
            Asistente del caso junto al borrador. Genera borradores nuevos en el panel izquierdo; aquí solo consulta
            y propuestas de texto que tú decides insertar.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Modos del Agent AI">
        <Button
          size="sm"
          variant={tab === 'proposal' ? 'default' : 'outline'}
          role="tab"
          aria-selected={tab === 'proposal'}
          data-testid="agent-tab-proposal"
          onClick={() => setTab('proposal')}
        >
          <FileText className="h-4 w-4 mr-1" aria-hidden="true" />
          Proponer cambios
        </Button>
        <Button
          size="sm"
          variant={tab === 'chat' ? 'default' : 'outline'}
          role="tab"
          aria-selected={tab === 'chat'}
          data-testid="agent-tab-chat"
          onClick={() => setTab('chat')}
        >
          <MessageSquare className="h-4 w-4 mr-1" aria-hidden="true" />
          Consultar el caso
        </Button>
      </div>

      {tab === 'chat' ? (
        <div>
          <AIChat workspaceId={workspaceId} documents={documents ?? []} hideBorder />
        </div>
      ) : (
        <div className="space-y-3" data-testid="agent-proposal-form">
          <div className="rounded border bg-muted/40 px-3 py-2">
            <p className="text-xs text-muted-foreground">
              Propuesta basada en el caso, no aplica cambios automáticos al documento.
            </p>
            {!attachDraft && (
              <p className="mt-1 text-xs text-muted-foreground" data-testid="agent-context-off-note">
                Sin contexto del borrador: la IA usa los antecedentes del caso, no el contenido del editor.
              </p>
            )}
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="agent-attach-draft"
              data-testid="agent-attach-draft"
              checked={attachDraft}
              disabled={!draftAvailable}
              onCheckedChange={(v) => setAttachDraft(v === true)}
            />
            <Label htmlFor="agent-attach-draft" className="text-xs font-normal leading-4 cursor-pointer">
              Adjuntar copia en texto del borrador «{draftTitle}» como contexto de este mensaje
            </Label>
          </div>
          {attachDraft && (
            <p className="text-xs text-muted-foreground" data-testid="agent-context-on-note">
              Se adjuntará una copia en texto plano de «{draftTitle}» tal como está al enviar este mensaje; no
              incluye cambios posteriores.
            </p>
          )}

          {notice ? (
            <div className="rounded border border-green-200 bg-green-50 px-3 py-2" role="status" data-testid="agent-notice">
              <p className="text-xs text-green-800 flex items-center gap-1">
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                {notice}
              </p>
            </div>
          ) : null}

          {proposal ? (
            <div className="rounded border border-green-200 bg-white p-3 space-y-2" data-testid="agent-proposal-card">
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
              <div className="max-h-64 overflow-y-auto rounded border bg-muted/30 px-3 py-2" data-testid="agent-proposal-text">
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

          {error ? (
            <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 space-y-1.5" role="alert" data-testid="agent-proposal-error">
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

          <div>
            <Label htmlFor="agent-proposal-instruction" className="sr-only">
              Instrucción para la propuesta
            </Label>
            <Textarea
              id="agent-proposal-instruction"
              data-testid="agent-proposal-instruction"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ej: redacta un párrafo fundado en la falta de requerimiento previo para el cursor actual…"
              rows={3}
              className="w-full"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              data-testid="agent-proposal-send"
              disabled={sending || !conversationId || input.trim().length === 0}
              onClick={handleSend}
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" aria-hidden="true" />
                  Generando propuesta…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-1" aria-hidden="true" />
                  Enviar
                </>
              )}
            </Button>
            {!conversationId ? (
              <span className="text-xs text-muted-foreground">Cargando conversación del caso…</span>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}
