import { motion } from 'framer-motion';

export function AssistantTyping() {
  return (
    <div className="flex items-end gap-2">
      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-border bg-card px-4 py-3 shadow-sm">
        <span className="h-1 w-1 animate-bounce rounded-full bg-zinc-400 [animation-delay:0ms]" />
        <span className="h-1 w-1 animate-bounce rounded-full bg-zinc-400 [animation-delay:150ms]" />
        <span className="h-1 w-1 animate-bounce rounded-full bg-zinc-400 [animation-delay:300ms]" />
      </div>
    </div>
  );
}
