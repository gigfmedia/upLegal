import type { QuickTopic } from '@/types/legalAssistant';
import { cn } from '@/lib/utils';

type QuickTopicsProps = {
  topics: QuickTopic[];
  disabled?: boolean;
  onSelect: (topic: QuickTopic) => void;
};

export function QuickTopics({ topics, disabled = false, onSelect }: QuickTopicsProps) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-col gap-2">
        {topics.map((topic) => (
          <button
            key={topic.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(topic)}
            className={cn(
              'flex items-center gap-2.5 rounded-xl border border-border bg-background px-3.5 py-2.5 text-left text-xs text-foreground/85 transition-colors duration-150',
              'hover:border-foreground/25 hover:bg-muted hover:text-foreground',
              'active:scale-[0.99]',
              disabled && 'pointer-events-none opacity-50'
            )}
          >
            <span className="text-base" aria-hidden="true">
              {topic.emoji}
            </span>
            <span className="font-medium">{topic.label}</span>
          </button>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">
        O cuéntame directamente qué te pasó{' '}
        <span className="text-foreground/60" aria-hidden="true">
          →
        </span>
      </p>
    </div>
  );
}
