import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Plus } from 'lucide-react';
import { useCaseTasks } from '@/hooks/useCaseTasks';
import type { LawyerCase } from '@/hooks/useLawyerCases';
import { dateToNoonIso, isOverdue } from '@/lib/caseControl';
import { CaseDatePicker } from '@/components/lawyer/CaseDatePicker';
import { fmtShortDate } from '@/components/lawyer/CaseNextActionSection';
import { PromoteTaskDialog } from '@/components/lawyer/PromoteTaskDialog';

type Props = {
  caseId: string;
  /** Estado actual de próxima gestión (para advertir reemplazo). */
  currentNextAction?: {
    next_action: string | null;
    next_action_due_at: string | null;
    next_action_completed_at: string | null;
  } | null;
  onPromoted?: (row: Partial<LawyerCase>) => void;
};

/** FASE 5.1B — lista vertical de pendientes + creación inline en el drawer. */
export function CaseTasksSection({ caseId, currentNextAction = null, onPromoted }: Props) {
  const { tasks, loading, createTask, completeTask, reopenTask } = useCaseTasks(caseId);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [due, setDue] = useState<Date | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // FASE 4.60E: tarea seleccionada para promover a próxima gestión (copia).
  const [promoteTask, setPromoteTask] = useState<{ id: string; title: string; due_at: string | null } | null>(null);

  const pendingCount = tasks.filter((t) => !t.completed).length;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await createTask({ title, due_at: due ? dateToNoonIso(due) : null });
      setTitle('');
      setDue(undefined);
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el pendiente');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section aria-label="Pendientes">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
          Pendientes{pendingCount > 0 ? ` · ${pendingCount}` : ''}
        </h3>
        {!showForm && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => { setShowForm(true); setError(null); }}
            title="Nuevo pendiente"
            aria-label="Nuevo pendiente"
          >
            <Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> Nuevo
          </Button>
        )}
      </div>

      <div className="mt-2">
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando pendientes…</p>
        ) : tasks.length === 0 && !showForm ? (
          <p className="text-sm text-muted-foreground">Sin pendientes.</p>
        ) : (
          <ul className="space-y-1">
            {tasks.map((t) => {
              const overdue = isOverdue(t.due_at, t.completed);
              return (
                <li
                  key={t.id}
                  className="flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-gray-50"
                >
                  <Checkbox
                    checked={t.completed}
                    onCheckedChange={() => (t.completed ? reopenTask(t.id) : completeTask(t.id))}
                    aria-label={`Completar ${t.title}`}
                    className="mt-1"
                  />
                  <span
                    className="min-w-0 cursor-pointer"
                    onClick={() => (t.completed ? reopenTask(t.id) : completeTask(t.id))}
                    title={t.completed ? 'Reabrir pendiente' : 'Completar pendiente'}
                  >
                    <span className={`block text-sm leading-snug ${t.completed ? 'text-muted-foreground line-through' : 'font-medium text-gray-900'}`}>
                      {t.title}
                    </span>
                    {t.due_at ? (
                      <span className={`mt-0.5 flex items-center gap-1 text-xs ${overdue ? 'font-semibold text-red-600' : 'text-muted-foreground'}`}>
                        {overdue && <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />}
                        {overdue ? `Venció ${fmtShortDate(t.due_at)}` : fmtShortDate(t.due_at)}
                      </span>
                    ) : !t.completed ? (
                      <span className="mt-0.5 block text-xs text-muted-foreground">Sin fecha</span>
                    ) : null}
                    {/* FASE 4.60E: solo pendientes activos; acción secundaria compacta. */}
                    {!t.completed && (
                      <button
                        type="button"
                        onClick={() => setPromoteTask({ id: t.id, title: t.title, due_at: t.due_at })}
                        className="mt-1 block text-xs text-muted-foreground underline-offset-4 hover:text-gray-900 hover:underline"
                      >
                        Usar como próxima gestión
                      </button>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mt-3 space-y-2.5 rounded-xl border bg-gray-50/60 p-3">
          <div>
            <label htmlFor="case-task-title" className="mb-1 block text-xs font-medium text-gray-700">
              Título
            </label>
            <Input
              id="case-task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Preparar escrito"
              aria-label="Título del pendiente"
              className="w-full bg-white"
            />
          </div>
          <div>
            <span className="mb-1 block text-xs font-medium text-gray-700">Fecha</span>
            <CaseDatePicker
              value={due}
              onChange={setDue}
              ariaLabel="Fecha del pendiente"
              placeholder="Sin fecha"
              className="bg-white"
            />
          </div>
          <div className="flex items-center gap-2 pt-0.5">
            <Button type="submit" size="sm" disabled={saving || !title.trim()}>
              Agregar pendiente
            </Button>
            <button
              type="button"
              disabled={saving}
              onClick={() => { setShowForm(false); setTitle(''); setDue(undefined); setError(null); }}
              className="px-1 text-sm text-muted-foreground underline-offset-4 hover:text-gray-900 hover:underline disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
      {error && <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}

      {/* FASE 4.60E: confirmación de copia pendiente → próxima gestión. */}
      {promoteTask && (
        <PromoteTaskDialog
          open={!!promoteTask}
          onClose={() => setPromoteTask(null)}
          caseId={caseId}
          task={promoteTask}
          current={currentNextAction}
          onPromoted={(row) => { onPromoted?.(row); }}
        />
      )}
    </section>
  );
}
