import { cn } from '@/lib/utils';
import type { QuickReplyOption } from '@/types/legalAssistant';

type QuickReplyProps = {
  option: QuickReplyOption;
  disabled?: boolean;
  onSelect: (option: QuickReplyOption) => void;
};

export function QuickReply({ option, disabled = false, onSelect }: QuickReplyProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(option)}
      className={cn(
        'inline-flex items-center justify-center rounded-full border border-border bg-background px-3.5 py-2 text-left text-xs text-foreground/85 transition-colors duration-150',
        'hover:border-foreground/25 hover:bg-muted hover:text-foreground',
        'active:scale-[0.97]',
        disabled && 'pointer-events-none opacity-50'
      )}
    >
      {option.label}
    </button>
  );
}

type QuickRepliesProps = {
  options: QuickReplyOption[];
  disabled?: boolean;
  onSelect: (option: QuickReplyOption) => void;
  className?: string;
};

export function QuickReplies({
  options,
  disabled = false,
  onSelect,
  className,
}: QuickRepliesProps) {
  if (!options || options.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {options.map((option) => (
        <QuickReply key={option.value} option={option} disabled={disabled} onSelect={onSelect} />
      ))}
    </div>
  );
}
