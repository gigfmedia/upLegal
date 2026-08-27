import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import posthog from 'posthog-js';
import {
  AlertTriangle,
  ArrowRight,
  FileUp,
  Loader2,
  MessageSquare,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { AIChatMessage } from './AIChatMessage';
import { AIThinkingIndicator } from './AIThinkingIndicator';
import { AIChatSuggestions } from './AIChatSuggestions';
import {
  useAICaseChat,
  useSendChatMessage,
  type AIChatError,
  type AIChatMessage as ChatMessage,
} from '@/hooks/useAIChat';
import type { AIDocumentListItem } from '@/hooks/useAIDocuments';

type AIChatProps = {
  workspaceId: string;
  documents: AIDocumentListItem[];
  onUploadClick?: () => void;
  externalQuestion?: string | null;
  onExternalQuestionHandled?: () => void;
  hideBorder?: boolean;
  fullHeight?: boolean;
};

function errorToMessage(error: AIChatError | null): string {
  switch (error?.code) {
    case 'CONTEXT_TOO_LARGE':
      return 'Este caso contiene demasiada información para procesarla completa en una sola consulta.';
    case 'DOCS_PROCESSING':
      return 'Tus documentos todavía se están procesando.';
    case 'NO_DOCUMENTS':
      return 'Sube un documento para comenzar.';
    case 'AI_NOT_CONFIGURED':
      return 'El servicio de IA no está configurado. Contacta al equipo de LegalUp.';
    case 'OUTPUT_TOKEN_LIMIT':
      return 'La respuesta superó el presupuesto de tokens. Intenta de nuevo con una pregunta más acotada.';
    default:
      return error?.message || 'No pudimos generar una respuesta. Intenta nuevamente.';
  }
}

export function AIChat({ workspaceId, documents, onUploadClick, externalQuestion, onExternalQuestionHandled, hideBorder, fullHeight }: AIChatProps) {
  const readyCount = useMemo(
    () => documents.filter((doc) => doc.status === 'ready').length,
    [documents]
  );
  const hasDocuments = documents.length > 0;
  const processing = documents.some(
    (doc) => doc.status === 'pending' || doc.status === 'processing'
  );
  const chatEnabled = readyCount > 0;

  const chatQuery = useAICaseChat(workspaceId, chatEnabled);
  const sendMutation = useSendChatMessage(workspaceId);

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingUser, setPendingUser] = useState<string | null>(null);
  const [error, setError] = useState<AIChatError | null>(null);
  const [failedMessage, setFailedMessage] = useState<string | null>(null);
  // Mensajes de asistente que llegaron en vivo (POST). Solo estos reciben el
  // efecto de escritura; el historial cargado al recargar la página se muestra
  // completo, sin re-animar burbujas antiguas.
  const [liveAssistantIds, setLiveAssistantIds] = useState<Set<string>>(new Set());

  const openedTracked = useRef(false);
  useEffect(() => {
    if (chatEnabled && !openedTracked.current) {
      openedTracked.current = true;
      posthog.capture('ai_chat_opened');
    }
  }, [chatEnabled]);

  // Fase 4.2.18: fallo técnico de carga del historial. Solo se registra el
  // contador de intentos fallidos; nunca el contenido de la conversación.
  const lastHistoryFailureRef = useRef(0);
  useEffect(() => {
    if (chatQuery.isError && chatQuery.failureCount > lastHistoryFailureRef.current) {
      lastHistoryFailureRef.current = chatQuery.failureCount;
      posthog.capture('ai_chat_history_load_failed', {
        failure_count: chatQuery.failureCount,
      });
    }
  }, [chatQuery.isError, chatQuery.failureCount]);

  const conversationId = chatQuery.data?.conversation?.id ?? null;

  const shownMessages = useMemo(() => {
    const list: ChatMessage[] = [...(chatQuery.data?.messages ?? [])];
    if (
      pendingUser &&
      !list.some((message) => message.role === 'user' && message.content === pendingUser)
    ) {
      list.push({
        id: `pending-user-${list.length}`,
        conversation_id: conversationId ?? '',
        workspace_id: workspaceId,
        lawyer_id: '',
        role: 'user',
        content: pendingUser,
        metadata: null,
        created_at: new Date().toISOString(),
      });
    }
    return list;
  }, [chatQuery.data, pendingUser, conversationId, workspaceId]);

  // Mensaje de usuario al que le falta la respuesta del asistente (intento fallido
  // una vez que el refetch trae el user guardado en BD). Sobre él se muestra el retry.
  const failedIndex = useMemo(() => {
    if (!failedMessage) return -1;
    const realMessages = chatQuery.data?.messages ?? [];
    const last = realMessages[realMessages.length - 1];
    if (!last || last.role !== 'user') return -1;
    return shownMessages.findIndex((m) => m.role === 'user' && m.content === last.content);
  }, [failedMessage, shownMessages, chatQuery.data]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const userNearBottomRef = useRef(true);
  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    // El usuario sigue el hilo si está cerca del fondo (dentro de ~160px).
    userNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Mientras responde, mantener el indicador visible al final.
    if (sending) {
      userNearBottomRef.current = true;
      el.scrollTop = el.scrollHeight;
      return;
    }
    // Cuando llega una respuesta, hacer scroll solo si el usuario estaba al día;
    // nunca robar el scroll mientras se leen mensajes antiguos.
    const last = lastMessageRef.current;
    if (last && userNearBottomRef.current) {
      el.scrollTop += last.getBoundingClientRect().top - el.getBoundingClientRect().top;
    }
  }, [shownMessages.length, sending]);

  // Durante el efecto de escritura del asistente el mensaje crece en altura;
  // mantenemos el scroll pegado al final mientras el usuario sigue el hilo.
  useEffect(() => {
    const el = scrollRef.current;
    const last = lastMessageRef.current;
    if (!el || !last) return;
    const observer = new ResizeObserver(() => {
      if (userNearBottomRef.current) el.scrollTop = el.scrollHeight;
    });
    observer.observe(last);
    return () => observer.disconnect();
  }, [shownMessages.length, sending]);

  // Una vez que el refetch autoritativo trae el mensaje del usuario guardado,
  // el bubble optimista ya no es necesario.
  useEffect(() => {
    if (
      pendingUser &&
      chatQuery.data?.messages?.some(
        (m) => m.role === 'user' && m.content === pendingUser
      )
    ) {
      setPendingUser(null);
    }
  }, [pendingUser, chatQuery.data]);

  // Fase 4.18.1: pregunta externa desde Inteligencia del caso (Siguiente paso / Preguntas sugeridas)
  useEffect(() => {
    if (externalQuestion && !sending && conversationId) {
      const q = externalQuestion.trim();
      if (q) {
        setInput('');
        setPendingUser(q);
        setFailedMessage(null);
        runMutation(q);
        onExternalQuestionHandled?.();
      }
    }
  }, [externalQuestion, sending, conversationId, onExternalQuestionHandled]);

  const runMutation = (message: string) => {
    setSending(true);
    setError(null);
    setFailedMessage(message);
    posthog.capture('ai_chat_message_sent', {
      message_length: message.length,
      document_count: readyCount,
    });

    sendMutation.mutate(
      { conversationId: conversationId!, message },
      {
        onSuccess: (data) => {
          setSending(false);
          setFailedMessage(null);
          // Marca la respuesta en vivo para que solo esa burbuja use typewriter.
          setLiveAssistantIds((prev) => new Set(prev).add(data.message.id));
          posthog.capture('ai_chat_response_completed', {
            document_count: readyCount,
            source_count: data.sources?.length ?? 0,
          });
        },
        onError: (err) => {
          setSending(false);
          setError(err);
          posthog.capture('ai_chat_response_failed', {
            error_code: err.code || 'provider_error',
          });
        },
      }
    );
  };

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || sending || !conversationId) return;
    setInput('');
    setPendingUser(trimmed);
    setFailedMessage(null);
    runMutation(trimmed);
  };

  const handleSuggestion = (text: string) => {
    if (sending || !conversationId) return;
    setInput('');
    setPendingUser(text);
    setFailedMessage(null);
    runMutation(text);
  };

  const handleRetry = () => {
    if (!failedMessage || sending || !conversationId) return;
    runMutation(failedMessage);
  };

  return (
    <Card className={`${hideBorder ? 'border-0 shadow-none' : ''} ${fullHeight ? 'flex h-full flex-col' : ''}`}>
      {!hideBorder && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4 text-green-700" aria-hidden="true" />
            Chat del caso
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Pregúntame sobre los documentos y antecedentes de este caso.
          </p>
        </CardHeader>
      )}
      <CardContent className={fullHeight ? 'flex flex-1 flex-col min-h-0' : ''}>
        {!chatEnabled ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-500">
              <FileUp className="h-6 w-6" aria-hidden="true" />
            </span>
            {hasDocuments && processing ? (
              <>
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-green-700" aria-hidden="true" />
                  <p className="font-medium text-gray-900">Procesando documentos</p>
                </div>
                <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                  Tus documentos todavía se están procesando. Cuando estén listos podrás
                  hacer preguntas sobre ellos.
                </p>
              </>
            ) : (
              <>
                <p className="font-medium text-gray-900">
                  Este caso todavía no tiene documentos
                </p>
                <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                  Sube un PDF para que LegalUp AI pueda responder preguntas sobre él.
                </p>
                {onUploadClick && (
                  <Button
                    type="button"
                    onClick={onUploadClick}
                    className="mt-1 bg-green-900 text-white hover:bg-green-800"
                  >
                    <FileUp className="mr-2 h-4 w-4" aria-hidden="true" />
                    Subir documento
                  </Button>
                )}
              </>
            )}
          </div>
        ) : chatQuery.isLoading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-16 w-3/4" />
            <Skeleton className="h-16 w-1/2 self-end" />
          </div>
        ) : chatQuery.isError && !chatQuery.data ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
              <AlertTriangle className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className="font-medium text-gray-900">No pudimos cargar el historial.</p>
            <p className="mx-auto max-w-sm text-sm text-muted-foreground">
              Hubo un problema de conexión. Reintenta para ver la conversación del caso.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => chatQuery.refetch()}
              className="gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Reintentar
            </Button>
          </div>
        ) : (
          <div className={`flex flex-col ${fullHeight ? 'flex-1 min-h-0' : ''}`}>
            <div
              ref={scrollRef}
              onScroll={onScroll}
              className={`${fullHeight ? 'flex-1' : '-ml-4 max-h-[420px]'} space-y-4 overflow-y-auto pb-6 ${fullHeight ? 'px-1' : 'pl-4 pr-1'}`}
            >
              {shownMessages.length === 0 && !sending ? (
                <AIChatSuggestions onSelect={handleSuggestion} />
              ) : (
                shownMessages.map((message, index) => (
                  <div
                    key={message.id}
                    ref={index === shownMessages.length - 1 ? lastMessageRef : undefined}
                  >
                    <AIChatMessage
                      message={message}
                      animate={message.role === 'assistant' && liveAssistantIds.has(message.id)}
                    />
                    {index === failedIndex && (
                      <div className="mt-1 flex items-center gap-2 pl-[3.25rem]">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleRetry}
                          disabled={sending}
                          className="h-7 gap-1.5 px-2.5 text-xs"
                        >
                          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                          Reintentar
                        </Button>
                        <span className="text-xs text-amber-700">
                          La respuesta no se generó. Intenta de nuevo.
                        </span>
                      </div>
                    )}
                  </div>
                ))
              )}

              {sending && (
                <motion.div
                  key="thinking"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                >
                  <AIThinkingIndicator />
                </motion.div>
              )}

              <AnimatePresence>
                {error && (
                  <motion.div
                    key="chat-error"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3"
                  >
                    <AlertTriangle
                      className="h-4 w-4 shrink-0 text-amber-600"
                      aria-hidden="true"
                    />
                    <p className="text-xs text-amber-900">{errorToMessage(error)}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Escribe una pregunta sobre el caso…"
                disabled={sending || !conversationId}
                aria-label="Pregunta para el asistente del caso"
                className="flex-1"
              />
              <Button
                type="button"
                onClick={handleSend}
                disabled={sending || !conversationId || input.trim().length === 0}
                className="shrink-0 bg-green-900 text-white hover:bg-green-800"
                aria-label="Enviar pregunta"
              >
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
