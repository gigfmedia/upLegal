import { motion } from 'framer-motion';
import type {
  AssistantLawyer,
  AssistantLawyerService,
  AssistantLawyerServices,
  AssistantMessage,
  QuickReplyOption,
  QuickTopic,
} from '@/types/legalAssistant';
import { LawyerRecommendationList } from './LawyerRecommendationList';
import { LawyerServicesCard } from './LawyerServicesCard';
import { QuickReplies } from './QuickReplies';
import { QuickTopics } from './QuickTopics';

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

type ChatMessageProps = {
  message: AssistantMessage;
  quickTopics?: QuickTopic[];
  disabled?: boolean;
  onQuickTopic?: (topic: QuickTopic) => void;
  onOption?: (option: QuickReplyOption) => void;
  onViewProfile?: (lawyer: AssistantLawyer) => void;
  onBook?: (lawyer: AssistantLawyer, service: AssistantLawyerService) => void;
};

export function ChatMessage({
  message,
  quickTopics,
  disabled = false,
  onQuickTopic,
  onOption,
  onViewProfile,
  onBook,
}: ChatMessageProps) {
  const isUser = message.role === 'user';

  const renderServices = (services: AssistantLawyerServices) => {
    if (!onViewProfile || !onBook) return null;
    return (
      <div className="ml-9">
        <LawyerServicesCard
          services={services}
          onViewProfile={onViewProfile}
          onBook={onBook}
        />
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={isUser ? 'flex justify-end' : 'flex flex-col'}
    >
      {isUser ? (
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-zinc-900 px-4 py-2.5 text-sm leading-relaxed text-white shadow-sm">
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-end gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-muted-foreground">
              S
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Sara
              </span>
              <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-border bg-card px-4 py-2.5 text-sm leading-relaxed text-foreground shadow-sm">
                <p className="whitespace-pre-wrap break-words">{renderInline(message.content)}</p>
              </div>
            </div>
          </div>

          {message.followUp && !message.lawyers?.length && (
            <p className="ml-9 text-xs text-muted-foreground">{renderInline(message.followUp)}</p>
          )}

          {message.services ? renderServices(message.services) : null}

          {message.lawyers && message.lawyers.length > 0 && onBook && onViewProfile && (
            <div className="ml-9">
              <LawyerRecommendationList
                lawyers={message.lawyers}
                onViewProfile={onViewProfile}
                onBook={onBook}
              />
            </div>
          )}

          {message.followUp && message.lawyers?.length ? (
            <p className="ml-9 text-xs text-muted-foreground">{renderInline(message.followUp)}</p>
          ) : null}

          {message.options && message.options.length > 0 && onOption && (
            <div className="ml-9">
              <QuickReplies options={message.options} disabled={disabled} onSelect={onOption} />
            </div>
          )}

          {message.role === 'assistant' && quickTopics && quickTopics.length > 0 && (
            <div className="ml-9">
              <QuickTopics
                topics={quickTopics}
                disabled={disabled}
                onSelect={(topic) => onQuickTopic?.(topic)}
              />
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
