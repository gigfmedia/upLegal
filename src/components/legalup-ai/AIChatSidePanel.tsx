import * as SheetPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
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
  onCloseFocusRef?: React.RefObject<HTMLElement>;
};

export function AIChatSidePanel({
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
            'sm:w-[92vw] sm:max-w-[92vw]',
            'md:w-[720px] md:max-w-[720px]',
            'lg:w-[720px] lg:max-w-[720px]',
            'p-0'
          )}
          role="dialog"
          aria-modal="true"
        >
          {/* Header fijo */}
          <div className="flex shrink-0 items-start justify-between gap-4 border-b px-6 py-4">
            <div>
              <p className="text-base font-semibold text-gray-900">Asistente de tu caso</p>
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

          {/* Messages scroll + input fijo — AIChat ya maneja su propio layout, lo hacemos ocupar el resto */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-2 py-4 sm:px-4">
              <AIChat
                workspaceId={workspaceId}
                documents={documents}
                externalQuestion={externalQuestion}
                onExternalQuestionHandled={onExternalQuestionHandled}
              />
            </div>
          </div>
        </SheetPrimitive.Content>
      </SheetPrimitive.Portal>
    </SheetPrimitive.Root>
  );
}
