import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Trash2 } from 'lucide-react';
import { useLawyerCases, type CaseStatus, type LawyerCase } from '@/hooks/useLawyerCases';
import { useToast } from '@/hooks/use-toast';
import { useCaseDeleteEligibility, isCaseNotDeletable } from '@/hooks/useCaseDeleteEligibility';
import posthog from 'posthog-js';

const statuses: CaseStatus[] = ['new', 'quoted', 'paid', 'in_progress', 'delivered', 'closed', 'cancelled'];

const statusLabels: Record<CaseStatus, string> = {
  new: 'Nuevo',
  quoted: 'Cotizado',
  paid: 'Pagado',
  in_progress: 'En progreso',
  delivered: 'Entregado',
  closed: 'Cerrado',
  cancelled: 'Cancelado',
};

export type LawyerClientLike = { id: string; name: string; email?: string | null };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseData: LawyerCase;
  clients: LawyerClientLike[];
  onSaved: (row: Partial<LawyerCase>) => void;
  onDeleted?: () => void;
};

/** Edición administrativa del caso. Reutiliza updateCase/deleteCase existentes. */
export function CaseEditDialog({ open, onOpenChange, caseData, clients, onSaved, onDeleted }: Props) {
  const { updateCase, deleteCase } = useLawyerCases();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<CaseStatus>('new');
  const [clientId, setClientId] = useState('none');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const deletePending = useRef(false);
  const { canDelete, loading: checkingDelete } = useCaseDeleteEligibility(caseData.id, open);

  // Populate current values on open; never carry stale edits between cases.
  useEffect(() => {
    if (open && caseData) {
      setTitle(caseData.title ?? '');
      setDescription(caseData.description ?? '');
      setStatus(caseData.status);
      setClientId(caseData.client_id || 'none');
    }
  }, [open, caseData]);

  const handleSave = async () => {
    if (!caseData?.id) return;
    setSaving(true);
    try {
      const row = await updateCase(caseData.id, {
        title,
        description: description || null,
        status,
        client_id: clientId === 'none' ? null : clientId,
      });
      toast({ title: 'Caso actualizado' });
      onSaved(row as Partial<LawyerCase>);
      onOpenChange(false);
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'No se pudo actualizar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!caseData?.id || !canDelete || saving || deletePending.current) return;
    if (!confirm('¿Eliminar este caso vacío? Esta acción es permanente y no restituye el caso gratuito. Para conservarlo, cambia su estado a Cerrado.')) return;
    deletePending.current = true;
    setDeleting(true);
    try {
      await deleteCase(caseData.id);
      try {
        posthog.capture('case_deleted', { source: caseData.source || 'unknown' });
      } catch { /* analytics best-effort; never blocks UX */ }
      toast({ title: 'Caso eliminado' });
      onDeleted?.();
      onOpenChange(false);
      navigate('/lawyer/cases');
    } catch (e) {
      toast({ title: 'No se pudo eliminar', description: isCaseNotDeletable(e) ? 'Este caso contiene actividad o vínculos que deben conservarse. Ciérralo para mantener su historial.' : 'No se pudo eliminar el caso. Intenta nuevamente.', variant: 'destructive' });
    } finally {
      deletePending.current = false;
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar caso</DialogTitle>
          <DialogDescription>Actualiza los datos administrativos del caso.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as CaseStatus)}>
                <SelectTrigger>
                  <SelectValue>{statusLabels[status]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s} value={s}>
                      {statusLabels[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin cliente</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.email ? `· ${c.email}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Solicitud / cita de origen</Label>
              <div className="text-sm">
                {caseData.booking ? (
                  <div className="border rounded p-2">
                    <div className="font-medium">{caseData.booking.service_title || 'Reserva'}</div>
                    <div className="text-xs text-gray-500">
                      {caseData.booking.status} · {caseData.booking.user_name}
                    </div>
                  </div>
                ) : (
                  <span className="text-gray-400">Sin reserva de origen</span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Descripción del caso" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={handleSave} disabled={saving || deleting} className="bg-gray-900 hover:bg-green-900">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Guardar
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            {canDelete && <Button disabled={deleting || saving} variant="outline" onClick={handleDelete} className="ml-auto text-red-600 border-red-200 hover:bg-red-50">
              <Trash2 className="h-4 w-4 mr-1" /> {deleting ? 'Eliminando…' : 'Eliminar caso vacío'}
            </Button>}
          </div>
          <p className="text-xs text-muted-foreground">
            {checkingDelete ? 'Comprobando si el caso puede eliminarse…' : 'Solo pueden eliminarse casos vacíos sin vínculos ni actividad. Si terminaste de trabajar, cambia su estado a Cerrado para conservar el historial.'}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
