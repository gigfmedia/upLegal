import * as SheetPrimitive from '@radix-ui/react-dialog';
import { X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AIChat } from './AIChat';
import type { AIDocumentListItem } from '@/hooks/useAIDocuments';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  workspaceName?: string | null;
  documents: AIDocumentListItem[];
  externalQuestion: string | null;
  onExternalQuestionHandled: () => void;
};

export function AICaseChatDrawer({
  open,
  onOpenChange,
  workspaceId,
  workspaceName,
  documents,
  externalQuestion,
  onExternalQuestionHandled,
}: Props) {
  return (
    <SheetPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <SheetPrimitive.Portal>
        <SheetPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/30 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
          )}
        />
        <SheetPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            'fixed inset-y-0 right-0 z-50 flex h-full w-[100vw] flex-col gap-0 border-l bg-white shadow-xl',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
            'duration-300',
            'sm:w-[90vw] sm:max-w-[90vw]',
            'md:w-[640px] md:max-w-[90vw]',
            'lg:w-[640px] lg:max-w-[640px]',
            'p-0'
          )}
          role="dialog"
          aria-modal="true"
        >
          {/* Header fijo */}
          <div className="flex shrink-0 items-start justify-between gap-4 border-b px-6 py-4">
            <div>
              <div className="flex items-center gap-2">
                <SheetPrimitive.Title className="text-base font-semibold text-gray-900">LegalUp AI</SheetPrimitive.Title>
              </div>
              <p className="mt-1 text-sm font-medium text-gray-800">Asistente del caso</p>
              <p className="text-xs text-muted-foreground">Responde usando la información disponible en los documentos de este caso.</p>
              {workspaceName && (
                <p className="mt-1 text-xs text-muted-foreground">Caso: {workspaceName}</p>
              )}
            </div>
            <SheetPrimitive.Close
              aria-label="Cerrar chat"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </SheetPrimitive.Close>
          </div>

          {/* Chat full height sin borde */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {open && (
              <AIChat
                workspaceId={workspaceId}
                documents={documents}
                externalQuestion={externalQuestion}
                onExternalQuestionHandled={onExternalQuestionHandled}
                hideBorder
                fullHeight
              />
            )}
          </div>
        </SheetPrimitive.Content>
      </SheetPrimitive.Portal>
    </SheetPrimitive.Root>
  );
}

// Compatibilidad con implementación previa 4.21.2
export { AICaseChatDrawer as AIChatSidePanel };
