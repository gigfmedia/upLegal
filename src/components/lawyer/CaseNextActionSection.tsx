import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Calendar as CalendarIcon, CheckCircle2, Pencil, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import type { LawyerCase } from '@/hooks/useLawyerCases';
import {
  dateToNoonIso,
  isNextActionOverdue,
  isoToDate,
  visibleNextAction,
} from '@/lib/caseControl';
import { CaseDatePicker } from '@/components/lawyer/CaseDatePicker';

export function fmtShortDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return format(parseISO(iso), 'd MMM yyyy', { locale: es });
  } catch {
    return iso;
  }
}

type Props = {
  caseData: LawyerCase;
  onSaved: (patch: Partial<LawyerCase>) => void;
};

/** FASE 5.1B — sección principal del drawer: próxima gestión (ver / editar). */
export function CaseNextActionSection({ caseData, onSaved }: Props) {
  const [editing, setEditing] = useState(false);
  const [draftAction, setDraftAction] = useState(caseData.next_action ?? '');
  const [draftDue, setDraftDue] = useState<Date | undefined>(() => isoToDate(caseData.next_action_due_at));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextVisible = visibleNextAction(caseData);
  const nextOverdue = isNextActionOverdue(caseData);

  const startEditing = () => {
    setDraftAction(caseData.next_action ?? '');
    setDraftDue(isoToDate(caseData.next_action_due_at));
    setError(null);
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('lawyer_cases')
        .update({
          next_action: draftAction.trim() || null,
          next_action_due_at: draftDue ? dateToNoonIso(draftDue) : null,
          next_action_completed_at: null,
        })
        .eq('id', caseData.id)
        .select('*')
        .single();
      if (error) throw error;
      onSaved(data as Partial<LawyerCase>);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const complete = async () => {
    setSaving(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('lawyer_cases')
        .update({ next_action_completed_at: new Date().toISOString() })
        .eq('id', caseData.id)
        .select('*')
        .single();
      if (error) throw error;
      onSaved(data as Partial<LawyerCase>);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo completar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section aria-label="Próxima gestión">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
        Próxima gestión
      </h3>
      {editing ? (
        <div className="mt-2 space-y-2.5">
          <Input
            value={draftAction}
            onChange={(e) => setDraftAction(e.target.value)}
            placeholder="Ej: Revisar resolución y preparar escrito"
            aria-label="Texto próxima gestión"
            className="w-full"
          />
          <CaseDatePicker
            value={draftDue}
            onChange={setDraftDue}
            ariaLabel="Fecha próxima gestión"
          />
          <div className="flex items-center gap-2">
            <Button size="sm" disabled={saving} onClick={save}>
              Guardar
            </Button>
            <button
              type="button"
              disabled={saving}
              onClick={() => setEditing(false)}
              className="px-1 text-sm text-muted-foreground underline-offset-4 hover:text-gray-900 hover:underline disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : nextVisible ? (
        <div className="mt-2">
          <p className="font-medium leading-relaxed text-gray-900">“{nextVisible}”</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <CalendarIcon className="h-4 w-4 shrink-0 opacity-60" aria-hidden="true" /> {fmtShortDate(caseData.next_action_due_at)}
            </span>
            {nextOverdue && (
              <Badge variant="destructive" className="inline-flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" aria-hidden="true" /> Vencida
              </Badge>
            )}
          </div>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={startEditing}>
              <Pencil className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> Editar
            </Button>
            <Button size="sm" variant="outline" onClick={complete} disabled={saving}>
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> Marcar como completada
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-2">
          <p className="text-sm text-muted-foreground">No hay una próxima gestión definida.</p>
          <Button size="sm" variant="outline" className="mt-2" onClick={startEditing}>
            <Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> Agregar próxima gestión
          </Button>
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}
    </section>
  );
}
