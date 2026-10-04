import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { CaseDatePicker } from '@/components/lawyer/CaseDatePicker';
import { dateToNoonIso, isoToDate, visibleNextAction, type CaseTaskLike } from '@/lib/caseControl';
import { useLawyerCases, type LawyerCase } from '@/hooks/useLawyerCases';

type Props = {
  open: boolean;
  onClose: () => void;
  caseId: string;
  task: Pick<CaseTaskLike, 'id' | 'title' | 'due_at'>;
  /** Estado actual para advertir reemplazo. Solo next visible cuenta. */
  current: { next_action: string | null; next_action_due_at: string | null; next_action_completed_at: string | null } | null;
  onPromoted: (row: Partial<LawyerCase>) => void;
};

/**
 * FASE 4.60E — promover un pendiente a próxima gestión (COPIA, sin vínculo).
 * Título/fecha pre-rellenados y editables. Reutiliza updateCase canónico.
 * Sin provider call, sin Timeline, sin mutar la tarea.
 */
export function PromoteTaskDialog({ open, onClose, caseId, task, current, onPromoted }: Props) {
  const { updateCase } = useLawyerCases();
  const [text, setText] = useState(task.title);
  const [due, setDue] = useState<Date | undefined>(() => isoToDate(task.due_at));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setText(task.title);
      setDue(isoToDate(task.due_at));
      setError(null);
      setSaving(false);
    }
  }, [open, task]);

  const currentVisible = current ? visibleNextAction(current) : null;

  const handleSave = async () => {
    if (saving) return;
    const trimmed = text.trim();
    if (!trimmed) {
      setError('Ingresa el texto de la próxima gestión');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const row = await updateCase(caseId, {
        next_action: trimmed,
        next_action_due_at: due ? dateToNoonIso(due) : null,
        next_action_completed_at: null,
      });
      toast.success('Próxima gestión actualizada');
      onPromoted(row);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la próxima gestión');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Usar como próxima gestión</DialogTitle>
          <DialogDescription>
            Puedes ajustar el texto o la fecha antes de guardarlo como la próxima gestión del caso.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div>
            <label htmlFor="promote-next-action" className="mb-1 block text-xs font-medium text-gray-700">
              Próxima gestión
            </label>
            <Input
              id="promote-next-action"
              value={text}
              onChange={(e) => setText(e.target.value)}
              aria-label="Texto de la próxima gestión"
              className="w-full bg-white"
            />
          </div>
          <div>
            <span className="mb-1 block text-xs font-medium text-gray-700">Fecha</span>
            <CaseDatePicker
              value={due}
              onChange={setDue}
              ariaLabel="Fecha de la próxima gestión"
              placeholder="Sin fecha"
              className="bg-white"
            />
          </div>
          {currentVisible && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-gray-600">
              Actual: &ldquo;{currentVisible}&rdquo;.
              Esto reemplazará la próxima gestión actual del caso.
            </p>
          )}
          {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
          <div className="flex items-center gap-2 pt-1">
            <Button type="button" size="sm" onClick={handleSave} disabled={saving || !text.trim()}>
              {saving ? 'Guardando…' : 'Guardar próxima gestión'}
            </Button>
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="px-1 text-sm text-muted-foreground underline-offset-4 hover:text-gray-900 hover:underline disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
