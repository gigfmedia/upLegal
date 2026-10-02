import { useState } from 'react';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { CalendarCheck, Mail, MessageCircle, MoreHorizontal, Phone, Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabaseClient';
import type { LawyerCase } from '@/hooks/useLawyerCases';
import { useClientCommunications } from '@/hooks/useClientCommunications';
import { CaseDatePicker } from '@/components/lawyer/CaseDatePicker';
import { dateToNoonIso } from '@/lib/caseControl';
import {
  COMM_CHANNEL_LABELS,
  COMM_CHANNELS,
  formatCommLine,
  formatCommShort,
  formatLastContact,
  latestComm,
  type CommChannel,
} from '@/lib/followUp';

const CHANNEL_ICONS: Record<CommChannel, typeof MessageCircle> = {
  whatsapp: MessageCircle,
  email: Mail,
  phone: Phone,
  meeting: Users,
  other: MoreHorizontal,
};

type Props = {
  caseData: LawyerCase;
  onSaved: (patch: Partial<LawyerCase>) => void;
};

/** FASE 5.4 — sección secundaria: última actualización al cliente + registro rápido. */
export function CaseClientSection({ caseData, onSaved }: Props) {
  const { comms, loading, registerComm } = useClientCommunications({ caseId: caseData.id });
  const [showForm, setShowForm] = useState(false);
  const [channel, setChannel] = useState<CommChannel>('whatsapp');
  const [date, setDate] = useState<Date | undefined>(() => new Date());
  const [note, setNote] = useState('');
  const [fulfill, setFulfill] = useState(true);
  const [nextDate, setNextDate] = useState<Date | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const client = (caseData as LawyerCase & { client?: { name: string } | null }).client;
  const last = latestComm(comms);
  const hasFollowUp = !!caseData.client_follow_up_due_at;

  const staleDays = last
    ? differenceInCalendarDays(new Date(), parseISO(last.communicated_at))
    : null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseData.client_id || !date) return;
    setSaving(true);
    setError(null);
    try {
      await registerComm({
        client_id: caseData.client_id,
        case_id: caseData.id,
        channel,
        note: note || null,
        communicated_at: dateToNoonIso(date),
      });
      // Cumplir seguimiento actual + programar nuevo opcional.
      // Sin seguimiento previo ni nueva fecha: no se toca el caso.
      if ((hasFollowUp && fulfill) || nextDate) {
        const { data, error } = await supabase
          .from('lawyer_cases')
          .update({ client_follow_up_due_at: nextDate ? dateToNoonIso(nextDate) : null })
          .eq('id', caseData.id)
          .select('*')
          .single();
        if (error) throw error;
        onSaved(data as Partial<LawyerCase>);
      }
      setNote('');
      setDate(new Date());
      setNextDate(undefined);
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section aria-label="Cliente y seguimiento">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
        Cliente
      </h3>
      {!caseData.client_id || !client ? (
        <p className="mt-1.5 text-sm text-muted-foreground">Sin cliente asociado a este caso.</p>
      ) : (
        <div className="mt-1.5">
          <p className="text-sm font-semibold text-gray-900">{client.name}</p>
          {loading ? (
            <p className="mt-1 text-xs text-muted-foreground">Cargando seguimiento…</p>
          ) : last ? (
            <div className="mt-1 text-xs">
              <span className="text-muted-foreground">Última actualización · </span>
              <span className="font-medium text-gray-800">
                {formatCommShort(last.communicated_at)} · {COMM_CHANNEL_LABELS[last.channel as CommChannel] ?? last.channel}
              </span>
              <span className={staleDays != null && staleDays > 14 ? 'ml-1.5 font-medium text-amber-600' : 'ml-1.5 text-muted-foreground'}>
                ({formatLastContact(last.communicated_at)})
              </span>
            </div>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">Cliente aún no actualizado.</p>
          )}
          {hasFollowUp && caseData.client_follow_up_due_at && (
            <p className="mt-1 text-xs text-muted-foreground">
              Próxima actualización ·{' '}
              <span className="font-medium text-gray-800">{formatCommShort(caseData.client_follow_up_due_at)}</span>
            </p>
          )}

          {!showForm ? (
            <Button size="sm" variant="outline" className="mt-2" onClick={() => { setShowForm(true); setError(null); }}>
              <Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> Registrar actualización
            </Button>
          ) : (
            <form onSubmit={handleSave} className="mt-2.5 space-y-2.5 rounded-xl border bg-gray-50/60 p-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="mb-1 block text-xs font-medium text-gray-700">Canal</span>
                  <Select value={channel} onValueChange={(v) => setChannel(v as CommChannel)}>
                    <SelectTrigger aria-label="Canal" className="h-9 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COMM_CHANNELS.map((c) => (
                        <SelectItem key={c} value={c}>{COMM_CHANNEL_LABELS[c]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <span className="mb-1 block text-xs font-medium text-gray-700">Fecha</span>
                  <CaseDatePicker value={date} onChange={setDate} ariaLabel="Fecha de comunicación" className="h-9 w-full bg-white" />
                </div>
              </div>
              <div>
                <span className="mb-1 block text-xs font-medium text-gray-700">Nota (opcional)</span>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Contexto breve…"
                  aria-label="Nota de comunicación"
                  rows={2}
                  maxLength={500}
                  className="resize-none bg-white"
                />
              </div>
              {hasFollowUp && (
                <label className="flex cursor-pointer items-start gap-2 text-xs text-gray-700">
                  <Checkbox
                    checked={fulfill}
                    onCheckedChange={(v) => setFulfill(v === true)}
                    aria-label="Marcar seguimiento actual como cumplido"
                    className="mt-0.5"
                  />
                  <span>Marcar seguimiento actual como cumplido</span>
                </label>
              )}
              <div>
                <span className="mb-1 block text-xs font-medium text-gray-700">Próxima actualización (opcional)</span>
                <CaseDatePicker
                  value={nextDate}
                  onChange={setNextDate}
                  ariaLabel="Próxima actualización"
                  placeholder="Sin fecha"
                  className="h-9 bg-white"
                />
              </div>
              <div className="flex items-center gap-2 pt-0.5">
                <Button type="submit" size="sm" disabled={saving || !date}>
                  Guardar
                </Button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => { setShowForm(false); setError(null); }}
                  className="px-1 text-sm text-muted-foreground underline-offset-4 hover:text-gray-900 hover:underline disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
          {error && <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}

          {comms.length > 0 && !showForm && (
            <div className="mt-2.5">
              <ul className="space-y-1">
                {(showAll ? comms : comms.slice(0, 3)).map((c) => {
                  const Icon = CHANNEL_ICONS[c.channel as CommChannel] ?? MoreHorizontal;
                  return (
                    <li key={c.id} className="flex items-start gap-2 text-xs">
                      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="font-medium text-gray-800">{formatCommLine(c)}</span>
                        {c.note && <span className="block truncate text-muted-foreground">{c.note}</span>}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {comms.length > 3 && (
                <button
                  type="button"
                  onClick={() => setShowAll((v) => !v)}
                  className="mt-1 text-xs font-medium text-gray-600 hover:text-gray-900"
                >
                  {showAll ? 'Ver menos' : `Ver historial (${comms.length})`}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export function CaseFollowUpBadge({ dueAt }: { dueAt: string | null | undefined }) {
  if (!dueAt) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <CalendarCheck className="h-3.5 w-3.5" aria-hidden="true" />
      Próxima actualización {formatCommShort(dueAt)}
    </span>
  );
}
