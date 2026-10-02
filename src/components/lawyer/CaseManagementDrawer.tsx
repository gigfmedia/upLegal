import * as SheetPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { LawyerCase } from '@/hooks/useLawyerCases';
import { CASE_STATUS_COLORS, CASE_STATUS_LABELS } from '@/lib/caseStatus';
import { CaseNextActionSection, fmtShortDate } from '@/components/lawyer/CaseNextActionSection';
import { CaseTasksSection } from '@/components/lawyer/CaseTasksSection';

type Props = {
  /** Caso a gestionar. Reusable: basta case + callbacks (futuro: Dashboard, CasesPage). */
  caseData: LawyerCase;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCaseUpdated: (patch: Partial<LawyerCase>) => void;
};

/**
 * FASE 5.1B — drawer lateral de gestión del caso.
 * Mismo patrón UX que AICaseChatDrawer (derecha, overlay, header fijo,
 * scroll, cierre claro). Sin lógica AI: solo control operativo 5.1.
 */
export function CaseManagementDrawer({ caseData, open, onOpenChange, onCaseUpdated }: Props) {
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
            'md:w-[480px] md:max-w-[92vw]',
            'p-0'
          )}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex shrink-0 items-start justify-between gap-4 border-b px-5 py-4">
            <div className="min-w-0">
              <SheetPrimitive.Title className="text-base font-semibold text-gray-900">
                Gestión del caso
              </SheetPrimitive.Title>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{caseData.title}</p>
            </div>
            <SheetPrimitive.Close
              aria-label="Cerrar gestión del caso"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </SheetPrimitive.Close>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <div className="space-y-5">
              <section aria-label="Estado del caso">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                  Estado
                </h3>
                <div className="mt-1.5">
                  <Badge className={`${CASE_STATUS_COLORS[caseData.status] || 'bg-gray-100 text-gray-800'} border-0`}>
                    {CASE_STATUS_LABELS[caseData.status] || caseData.status}
                  </Badge>
                </div>
              </section>

              <Separator />

              <CaseNextActionSection caseData={caseData} onSaved={onCaseUpdated} />

              <Separator />

              <CaseTasksSection caseId={caseData.id} />

              <Separator />

              <p className="pb-1 text-xs text-muted-foreground">
                Última actualización<br />
                <span className="font-medium text-gray-600">{fmtShortDate(caseData.updated_at)}</span>
              </p>
            </div>
          </div>
        </SheetPrimitive.Content>
      </SheetPrimitive.Portal>
    </SheetPrimitive.Root>
  );
}
