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
import { dateToNoonIso } from '@/lib/caseControl';
import { useCaseTasks } from '@/hooks/useCaseTasks';

export type IntelligenceDeadline = { date: string; description: string };

/**
 * FASE 4.60B — solo se pre-rellena la fecha cuando el dato de Inteligencia
 * ya trae una fecha calendario normalizada AAAA-MM-DD (lo que el pipeline
 * produce cuando puede normalizar). Cualquier texto legal ambiguo
 * ("10 días desde la notificación", "15 días hábiles", ...) NO se adivina:
 * devuelve undefined y el abogado elige la fecha operativa.
 * Sin parser de fechas legales en esta fase.
 */
export function parseSupportedDeadlineDate(raw: string | null | undefined): Date | undefined {
  if (!raw) return undefined;
  const m = raw.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return undefined;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return undefined;
  return dt;
}

type DialogProps = {
  open: boolean;
  onClose: () => void;
  caseId: string;
  deadline: IntelligenceDeadline;
};

/**
 * FASE 4.60B — confirmación humana antes de crear el pendiente.
 * Título pre-rellenado desde la descripción (sin llamada LLM).
 * Usa la ruta canónica de creación (useCaseTasks.createTask):
 * misma ownership, RLS, validación y relación al caso.
 * Sin provider call, sin mutación del snapshot, sin tocar next_action.
 */
export function DeadlinePromoteDialog({ open, onClose, caseId, deadline }: DialogProps) {
  const { createTask } = useCaseTasks(caseId);
  const [title, setTitle] = useState(deadline.description);
  const [due, setDue] = useState<Date | undefined>(() => parseSupportedDeadlineDate(deadline.date));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTitle(deadline.description);
      setDue(parseSupportedDeadlineDate(deadline.date));
      setError(null);
      setSaving(false);
    }
  }, [open, deadline]);

  const handleSave = async () => {
    if (saving) return;
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Título requerido');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createTask({ title: trimmed, due_at: due ? dateToNoonIso(due) : null });
      toast.success('Pendiente agregado al caso');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo agregar el pendiente');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Agregar a pendientes</DialogTitle>
          <DialogDescription>
            Revisa el título y la fecha antes de guardar. Se creará un pendiente del caso, no una validación legal del plazo.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div>
            <label htmlFor="deadline-promote-title" className="mb-1 block text-xs font-medium text-gray-700">
              Título
            </label>
            <Input
              id="deadline-promote-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-label="Título del pendiente"
              className="w-full bg-white"
            />
          </div>
          <div>
            <span className="mb-1 block text-xs font-medium text-gray-700">Fecha límite</span>
            <CaseDatePicker
              value={due}
              onChange={setDue}
              ariaLabel="Fecha límite del pendiente"
              placeholder="Sin fecha"
              className="bg-white"
            />
          </div>
          <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-gray-600">
            Detectado en Inteligencia: &ldquo;{deadline.description}
            {deadline.date ? ` (${deadline.date})` : ''}&rdquo;
          </p>
          {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
          <div className="flex items-center gap-2 pt-1">
            <Button type="button" size="sm" onClick={handleSave} disabled={saving || !title.trim()}>
              {saving ? 'Guardando…' : 'Guardar pendiente'}
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

type RowProps = {
  deadline: IntelligenceDeadline;
  /** Solo el caso canónico (CaseDetailPage) pasa caseId: sin caso no hay CTA. */
  caseId?: string;
  onPromote: (deadline: IntelligenceDeadline) => void;
};

/**
 * FASE 4.60B — fila de plazo de Inteligencia con CTA explícito del abogado.
 * Otras secciones (hechos, partes, riesgos, obligaciones, contradicciones,
 * información faltante, legalContext) no usan este componente: sin CTA.
 */
export function IntelligenceDeadlineRow({ deadline, caseId, onPromote }: RowProps) {
  return (
    <span className="flex flex-wrap items-center gap-2">
      {caseId && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 bg-white px-2 text-xs"
          onClick={() => onPromote(deadline)}
        >
          Agregar a pendientes
        </Button>
      )}
    </span>
  );
}
