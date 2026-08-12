import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import posthog from 'posthog-js';
import {
  MessageCircleMore,
  X,
  ArrowLeft,
  Maximize2,
  Minimize2,
  Info,
} from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { AssistantTyping } from './AssistantTyping';
import {
  QUICK_TOPICS,
  getLawyerProfileUrl,
  sendAssistantMessage,
  AssistantApiError,
} from '@/lib/assistantService';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { isInitialConsultationService } from '@/lib/serviceBooking';
import PreCheckoutModal, { type ServiceCheckoutData } from '@/components/PreCheckoutModal';
import { applyClientSurcharge, roundToThousands, serviceRequiresMeeting } from '@/lib/serviceBooking';
import type {
  AssistantLawyer,
  AssistantLawyerService,
  AssistantMessage,
  AssistantStage,
  QuickReplyOption,
  QuickTopic,
} from '@/types/legalAssistant';

const GREETING =
  'Hola 👋\nSoy Sara, tu asistente legal de LegalUp.\nCuéntame qué problema legal tienes y te ayudaré a encontrar el abogado más adecuado para tu caso.';

const RATE_LIMIT_MESSAGE =
  'He recibido muchas consultas tuyas en poco tiempo. Espera un momento y vuelve a intentarlo. 🙌';

const GENERIC_ERROR_MESSAGE =
  'Lo siento, tuve un problema para procesar tu consulta. Intenta nuevamente en unos minutos. 🙏';

const WIDGET_STORAGE_KEY = 'legalup_assistant_open';
const HINT_STORAGE_KEY = 'legalup_assistant_hint_seen';

function generateId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

type LegalUpAssistantProps = {
  source?: string;
};

export default function LegalUpAssistant({ source = 'widget' }: LegalUpAssistantProps) {
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();

  const [open, setOpen] = useState(() => {
    try {
      return sessionStorage.getItem(WIDGET_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [expanded, setExpanded] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [showHint, setShowHint] = useState(() => {
    try {
      return sessionStorage.getItem(HINT_STORAGE_KEY) !== 'true';
    } catch {
      return true;
    }
  });
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<AssistantStage>('initial');

  const scrollRef = useRef<HTMLDivElement>(null);
  const openedTracked = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);
  const [checkoutData, setCheckoutData] = useState<ServiceCheckoutData | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);

  // El hint del botón flotante no debe ser agresivo: aparece una vez, se oculta
  // solo tras unos segundos y deja de mostrarse cuando el usuario ya abrió el chat.
  useEffect(() => {
    if (!showHint) return;
    const t = setTimeout(() => setShowHint(false), 7000);
    return () => clearTimeout(t);
  }, [showHint]);

  const sendableMessages = useMemo(
    () =>
      messages
        .filter((m) => m.content)
        .map((m) => ({ role: m.role, content: m.content })),
    [messages]
  );

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, loading, scrollToBottom]);

  // Persistencia de apertura (no persistimos el contenido de la conversación).
  useEffect(() => {
    try {
      if (open) sessionStorage.setItem(WIDGET_STORAGE_KEY, 'true');
      else sessionStorage.removeItem(WIDGET_STORAGE_KEY);
    } catch {
      // ignore
    }
  }, [open]);

  useEffect(() => {
    if (!open || openedTracked.current) return;
    openedTracked.current = true;
    posthog.capture('chat_started', { source });
    setMessages((prev) =>
      prev.length === 0
        ? [
            {
              id: generateId(),
              role: 'assistant',
              content: GREETING,
              quickTopics: QUICK_TOPICS,
              createdAt: new Date().toISOString(),
            },
          ]
        : prev
    );
    setStage((prev) => (prev === 'initial' ? 'understanding' : prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleToggle = () => {
    setOpen((prev) => {
      const next = !prev;
      if (next) {
        try {
          sessionStorage.setItem(HINT_STORAGE_KEY, 'true');
        } catch {
          // ignore
        }
        setShowHint(false);
      }
      return next;
    });
    if (!open) scrollToBottom();
  };

  const appendAssistant = useCallback((content: string, extra?: Partial<AssistantMessage>) => {
    setMessages((prev) => [
      ...prev,
      {
        id: generateId(),
        role: 'assistant',
        content,
        createdAt: new Date().toISOString(),
        ...extra,
      },
    ]);
  }, []);

  const handleSend = useCallback(
    async (rawText: string) => {
      const text = rawText.trim();
      if (!text || loading) return;

      const isFirstUserMessage = !messages.some((m) => m.role === 'user');
      const userMessage: AssistantMessage = {
        id: generateId(),
        role: 'user',
        content: text,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput('');
      setLoading(true);
      if (stage === 'understanding') setStage('classifying');

      if (isFirstUserMessage) {
        posthog.capture('problem_described', {
          source,
          message_length: text.length,
        });
      }

      try {
        const response = await sendAssistantMessage({
          messages: [...sendableMessages, { role: 'user', content: text }],
          source,
        });

        const hasLawyers = Array.isArray(response.lawyers) && response.lawyers.length > 0;
        setStage(response.stage || (hasLawyers ? 'recommendation' : 'understanding'));

        appendAssistant(response.reply, {
          lawyers: hasLawyers ? response.lawyers : undefined,
          services: response.services ?? undefined,
          options: response.options?.length
            ? response.options.map((label) => ({ label, value: label }))
            : undefined,
          followUp: response.followUp ?? null,
        });
      } catch (error) {
        let message = GENERIC_ERROR_MESSAGE;
        if (error instanceof AssistantApiError && error.code === 'RATE_LIMITED') {
          message = RATE_LIMIT_MESSAGE;
        }
        appendAssistant(message);
        posthog.capture('assistant_chat_error', {
          source,
          code: error instanceof AssistantApiError ? error.code : 'unknown',
        });
      } finally {
        setLoading(false);
      }
    },
    [messages, sendableMessages, loading, stage, source, appendAssistant]
  );

  const handleQuickTopic = (topic: QuickTopic) => {
    void handleSend(topic.hint);
  };

  const handleOption = (option: QuickReplyOption) => {
    void handleSend(option.value);
  };

  const handleViewProfile = (lawyer: AssistantLawyer) => {
    posthog.capture('lawyer_profile_clicked', {
      source,
      lawyer_id: lawyer.id,
      match_score: lawyer.matchScore,
    });
    navigate(getLawyerProfileUrl(lawyer));
  };

  const handleBook = (lawyer: AssistantLawyer, service: AssistantLawyerService) => {
    posthog.capture('booking_started', {
      source,
      lawyer_id: lawyer.id,
      match_score: lawyer.matchScore,
      has_service: Boolean(lawyer.bestService),
    });

    if (isInitialConsultationService(service.title)) {
      navigate(`/booking/${lawyer.slug}-${lawyer.id}`);
      return;
    }

    const displayPrice = roundToThousands(applyClientSurcharge(service.price_clp));
    setCheckoutData({
      type: 'service',
      lawyer_id: lawyer.id,
      lawyer_name: lawyer.name,
      service_id: service.id,
      service_title: service.title,
      service_description: service.description || '',
      service_delivery_time: service.delivery_time || '',
      price: displayPrice,
      requires_meeting: serviceRequiresMeeting(service.title),
      requires_quote: service.requires_quote || false,
    });
    setShowCheckout(true);
  };

  const getPlaceholder = () => {
    if (messages.length === 0) return 'Cuéntame qué te pasó...';
    if (stage === 'recommendation' || stage === 'services') return '¿Quieres preguntarme algo más?';
    return 'Escribe tu respuesta...';
  };

  const panelClasses = expanded
    ? 'relative flex h-full w-full flex-col overflow-hidden rounded-none bg-background'
    : 'relative flex h-[calc(100dvh-7rem)] sm:h-[min(680px,calc(100dvh-7rem))] flex-col overflow-hidden rounded-3xl border border-border bg-background shadow-2xl';

  return (
    <>
      {/* Chat wrapper: contiene el container y el botón X flotante (fuera del borde) */}
      <div
        className={
          expanded
            ? 'pointer-events-none fixed inset-0 z-[1000]'
            : 'pointer-events-none fixed bottom-24 right-4 left-4 sm:left-auto sm:w-[400px] z-[1000]'
        }
      >
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 1, scale: expanded ? 0.98 : 0.92, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: reducedMotion ? 0 : 0.22, ease: 'easeOut' }}
              className={cn(panelClasses, 'pointer-events-auto')}
              role="dialog"
              aria-label="Asistente de LegalUp"
            >
            {/* Header */}
            <div className="relative flex items-center gap-2.5 border-b border-border bg-background px-3 py-3">
              <button
                type="button"
                onClick={handleToggle}
                aria-label="Cerrar asistente"
                className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              </button>

              <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                <Avatar className="h-9 w-9">
                  <AvatarImage
                    src="https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-6.png"
                    alt="Sara"
                  />
                  <AvatarFallback className="bg-muted text-[10px] text-foreground/70">
                    AI
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-500" />
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold leading-tight text-foreground">
                  Sara
                </h2>
                <p className="truncate text-[11px] text-muted-foreground">Asistente legal</p>
              </div>

              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => setExpanded((prev) => !prev)}
                  aria-label={expanded ? 'Reducir ventana' : 'Expandir ventana'}
                  className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {expanded ? (
                    <Minimize2 className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Maximize2 className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setInfoOpen((prev) => !prev)}
                  aria-label="Información del asistente"
                  className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Info className="h-4 w-4" aria-hidden="true" />
                </button>

                <AnimatePresence>
                  {infoOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-3 top-full z-20 mt-2 w-64 rounded-xl border border-border bg-background p-3 shadow-xl"
                    >
                      <p className="text-xs leading-relaxed text-foreground/80">
                        Soy Sara, tu asistente legal de LegalUp. Te ayudo a entender qué tipo de
                        ayuda legal necesitas y a encontrar un abogado adecuado para tu caso.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto bg-muted/30 px-3.5 py-4">
              <div className="flex flex-col gap-4">
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    quickTopics={message.quickTopics}
                    disabled={loading}
                    onQuickTopic={handleQuickTopic}
                    onOption={handleOption}
                    onViewProfile={handleViewProfile}
                    onBook={handleBook}
                  />
                ))}
                {loading && <AssistantTyping />}
                <div ref={endRef} />
              </div>
            </div>

            {/* Disclaimer */}
            <p className="border-t border-border/40 bg-background px-4 py-1.5 text-center text-[10px] leading-snug text-muted-foreground">
              Al continuar aceptas los{' '}
              <Link to="/terminos" className="underline underline-offset-2 hover:text-foreground">
                términos
              </Link>{' '}
              y la{' '}
              <Link
                to="/privacidad"
                className="underline underline-offset-2 hover:text-foreground"
              >
                política de privacidad
              </Link>
              .
            </p>

            {/* Input */}
            <ChatInput
              value={input}
              onChange={setInput}
              onSend={handleSend}
              disabled={loading}
              loading={loading}
              placeholder={getPlaceholder()}
            />
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      {/* Botón X flotante: mismo sitio que la burbuja (fijo abajo a la derecha) */}
      <AnimatePresence>
        {open && !expanded && (
          <motion.button
            type="button"
            onClick={handleToggle}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.18 }}
            className="pointer-events-auto fixed bottom-5 right-5 z-[1000] flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 text-white shadow-xl transition-colors hover:bg-zinc-800"
            aria-label="Cerrar asistente de LegalUp"
          >
            <X className="h-6 w-6" aria-hidden="true" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Floating button (solo cuando el chat está cerrado) */}
      <AnimatePresence>
        {!open && (
          <motion.div
            className="fixed bottom-5 right-5 z-[1000] flex items-center gap-3"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.18 }}
          >
            {showHint && (
              <motion.p
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.2 }}
                className="max-w-[180px] rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground/80 shadow-lg"
              >
                ¿Necesitas ayuda legal?
              </motion.p>
            )}

            <motion.button
              type="button"
              onClick={handleToggle}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 text-white shadow-lg transition-colors hover:bg-zinc-800"
              aria-label="Hablar con el asistente de LegalUp"
            >
              <MessageCircleMore className="h-6 w-6" aria-hidden="true" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {checkoutData && (
        <PreCheckoutModal
          isOpen={showCheckout}
          onClose={() => {
            setShowCheckout(false);
            setCheckoutData(null);
          }}
          checkoutData={checkoutData}
        />
      )}
    </>
  );
}
