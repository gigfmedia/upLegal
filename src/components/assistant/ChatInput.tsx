import { Button } from '@/components/ui/button';
import { Send, Loader2 } from 'lucide-react';
import { useEffect, useRef } from 'react';

const MIN_HEIGHT = 40;
const MAX_HEIGHT = 120;

type ChatInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: (text: string) => void;
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
};

export function ChatInput({
  value,
  onChange,
  onSend,
  disabled = false,
  loading = false,
  placeholder = 'Cuéntame qué te pasó...',
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(Math.max(el.scrollHeight, MIN_HEIGHT), MAX_HEIGHT)}px`;
  };

  // Autoajusta la altura según el contenido (resetea al enviar).
  useEffect(() => {
    resize();
  }, [value]);

  // Focus automático al abrir el chat, solo en desktop para no forzar el
  // teclado del teléfono en mobile.
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches) {
      textareaRef.current?.focus();
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const text = value.trim();
      if (text && !disabled && !loading) onSend(text);
    }
  };

  const handleSend = () => {
    const text = value.trim();
    if (text && !disabled && !loading) onSend(text);
  };

  const canSend = !disabled && !loading && value.trim().length > 0;

  return (
    <div className="flex items-end gap-2 border-t border-border/60 bg-background px-3 py-2.5">
      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        enterKeyHint="send"
        aria-label="Escribe tu problema legal"
        style={{ height: MIN_HEIGHT }}
        className="min-h-[40px] max-h-[120px] flex-1 resize-none overflow-y-auto rounded-2xl border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground/20 focus:ring-1 focus:ring-foreground/10 disabled:opacity-60"
      />
      <Button
        type="button"
        size="icon"
        onClick={handleSend}
        disabled={!canSend}
        className="mb-px h-10 w-10 shrink-0 rounded-full bg-zinc-900 text-white transition-colors hover:bg-zinc-800 disabled:opacity-40"
        aria-label="Enviar mensaje"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Send className="h-4 w-4" aria-hidden="true" />
        )}
      </Button>
    </div>
  );
}
