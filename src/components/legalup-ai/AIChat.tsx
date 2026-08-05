import { useEffect, useMemo, useRef, useState } from 'react';
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
    default:
      return error?.message || 'No pudimos generar una respuesta. Intenta nuevamente.';
  }
}

export function AIChat({ workspaceId, documents, onUploadClick }: AIChatProps) {
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

  const openedTracked = useRef(false);
  useEffect(() => {
    if (chatEnabled && !openedTracked.current) {
      openedTracked.current = true;
      posthog.capture('ai_chat_opened');
    }
  }, [chatEnabled]);

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
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Mientras responde, mostrar el indicador al final.
    if (sending) {
      el.scrollTop = el.scrollHeight;
      return;
    }
    // Cuando llega una respuesta, dejar visible el INICIO del último mensaje.
    const last = lastMessageRef.current;
    if (last) {
      el.scrollTop += last.getBoundingClientRect().top - el.getBoundingClientRect().top;
    }
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
    <Card className="">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-4 w-4 text-green-700" aria-hidden="true" />
          Chat del caso
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Pregúntame sobre los documentos y antecedentes de este caso.
        </p>
      </CardHeader>
      <CardContent>
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
        ) : (
          <div className="flex flex-col">
            <div
              ref={scrollRef}
              className="max-h-[420px] space-y-4 overflow-y-auto pr-1"
            >
              {shownMessages.length === 0 && !sending ? (
                <AIChatSuggestions onSelect={handleSuggestion} />
              ) : (
                shownMessages.map((message, index) => (
                  <div
                    key={message.id}
                    ref={index === shownMessages.length - 1 ? lastMessageRef : undefined}
                  >
                    <AIChatMessage message={message} />
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
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  </span>
                  <p className="text-sm text-muted-foreground">
                    LegalUp AI está analizando el caso…
                  </p>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                  <AlertTriangle
                    className="h-4 w-4 shrink-0 text-amber-600"
                    aria-hidden="true"
                  />
                  <p className="text-xs text-amber-900">{errorToMessage(error)}</p>
                </div>
              )}
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
