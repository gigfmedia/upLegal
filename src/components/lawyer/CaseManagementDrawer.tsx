import { useState } from 'react';
import * as SheetPrimitive from '@radix-ui/react-dialog';
import { Pencil, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/lib/supabaseClient';
import type { LawyerCase } from '@/hooks/useLawyerCases';
import { CASE_STATUS_COLORS, CASE_STATUS_LABELS } from '@/lib/caseStatus';
import { normalizeStage, stageLabel } from '@/lib/portfolio';
import { CaseNextActionSection, fmtShortDate } from '@/components/lawyer/CaseNextActionSection';
import { CaseTasksSection } from '@/components/lawyer/CaseTasksSection';
import { CaseClientSection } from '@/components/lawyer/CaseClientSection';

type Props = {
  /** Caso a gestionar. Reusable: basta case + callbacks (futuro: Dashboard, CasesPage). */
  caseData: LawyerCase;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCaseUpdated: (patch: Partial<LawyerCase>) => void;
};

/**
 * FASE 5.3 — etapa como metadata secundaria junto a Estado.
 * Edición simple inline; no compite con próxima gestión ni pendientes.
 */
function CaseStageSection({ caseData, onSaved }: { caseData: LawyerCase; onSaved: (patch: Partial<LawyerCase>) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(caseData.stage ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = () => {
    setDraft(caseData.stage ?? '');
    setError(null);
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const stage = normalizeStage(draft);
      const { data, error } = await supabase
        .from('lawyer_cases')
        .update({ stage })
        .eq('id', caseData.id)
        .select('*')
        .single();
      if (error) throw error;
      onSaved(data as Partial<LawyerCase>);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar la etapa');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section aria-label="Etapa del caso">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
        Etapa
      </h3>
      {editing ? (
        <div className="mt-1.5 space-y-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ej: Embargo (opcional)"
            aria-label="Etapa del caso"
            maxLength={80}
            className="h-8 text-sm"
          />
          <div className="flex items-center gap-2">
            <Button size="sm" className="h-7" disabled={saving} onClick={save}>
              Guardar
            </Button>
            <button
              type="button"
              disabled={saving}
              onClick={() => setEditing(false)}
              className="text-xs text-muted-foreground underline-offset-4 hover:text-gray-900 hover:underline disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          {caseData.stage ? (
            <Badge variant="secondary">{caseData.stage}</Badge>
          ) : (
            <span className="text-sm text-muted-foreground">Sin etapa</span>
          )}
          <button
            type="button"
            onClick={start}
            title={caseData.stage ? 'Cambiar etapa' : 'Definir etapa'}
            aria-label={caseData.stage ? 'Cambiar etapa' : 'Definir etapa'}
            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
          >
            <Pencil className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>
      )}
      {error && <p role="alert" className="mt-1 text-xs text-red-600">{error}</p>}
    </section>
  );
}

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
            // 5.5B mobile: el borde suma 1px a 100vw y genera scroll horizontal.
            'max-sm:border-l-0',
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
              <p className="mt-0.5 truncate text-sm font-medium text-gray-900">{caseData.title}</p>
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
              <div className="grid grid-cols-2 gap-4">
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
                <CaseStageSection caseData={caseData} onSaved={onCaseUpdated} />
              </div>

              <Separator />

              <CaseNextActionSection caseData={caseData} onSaved={onCaseUpdated} />

              <Separator />

              <CaseTasksSection
                caseId={caseData.id}
                currentNextAction={{
                  next_action: caseData.next_action ?? null,
                  next_action_due_at: caseData.next_action_due_at ?? null,
                  next_action_completed_at: caseData.next_action_completed_at ?? null,
                }}
                onPromoted={onCaseUpdated}
              />

              <Separator />

              <CaseClientSection caseData={caseData} onSaved={onCaseUpdated} />

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
