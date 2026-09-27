import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  useProSubscription,
  useProCancel,
  useProDowngrade,
  useCancelProDowngrade,
} from '@/hooks/useProSubscription';
import { ProPricingModal } from '@/components/legalup-pro/ProPricingModal';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

function formatDate(value: string | null): string {
  if (!value) return '';
  try {
    return format(parseISO(value), "d 'de' MMMM yyyy", { locale: es });
  } catch {
    return value;
  }
}

const fmtPrice = (v: number | null | undefined) =>
  v == null ? '—' : `$${Number(v).toLocaleString('es-CL')}`;

/**
 * 4.57D — subscription management (LegalUp Pro / Plus).
 * Server is the authority (row read via RLS, mutations via API).
 * Shows the exact canonical tier, price, pending transitions and offers:
 * upgrade to Plus (Pro), scheduled downgrade to Pro (Plus), cancel.
 * Downgrade is scheduled (effective at period end); Plus limits stay
 * active until then. Cancellation keeps access until the paid period ends.
 */
export function ProSubscriptionCard() {
  const navigate = useNavigate();
  const sub = useProSubscription();
  const cancel = useProCancel();
  const downgrade = useProDowngrade();
  const cancelDowngrade = useCancelProDowngrade();
  const [plusOpen, setPlusOpen] = useState(false);
  const [confirming, setConfirming] = useState<'cancel' | 'downgrade' | null>(null);
  const [busy, setBusy] = useState(false);

  if (sub.isLoading) return null;
  const row = sub.subscription;
  if (!row) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Suscripción</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Estás usando tu primer caso gratis. Pasa a Pro para gestión completa e IA integrada.
          </p>
          <Button type="button" className="bg-gray-900 text-white hover:bg-green-900" onClick={() => navigate('/pro')}>
            Ver planes
          </Button>
        </CardContent>
      </Card>
    );
  }

  const planName = sub.canonicalPlan === 'plus' ? 'LegalUp Plus' : 'LegalUp Pro';
  const isCancelled = sub.status === 'cancelled';

  const runCancel = async () => {
    setBusy(true);
    try {
      await cancel.mutateAsync();
      toast.success('Suscripción cancelada. Mantienes el acceso hasta el fin del período pagado.');
      setConfirming(null);
      void sub.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo cancelar.');
    } finally {
      setBusy(false);
    }
  };

  const runDowngrade = async () => {
    setBusy(true);
    try {
      const result = (await downgrade.mutateAsync()) as { effective_at?: string | null };
      toast.success(`Downgrade programado a Pro desde el ${formatDate(result?.effective_at ?? sub.planChangeEffectiveAt)}.`);
      setConfirming(null);
      void sub.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo programar el downgrade.');
    } finally {
      setBusy(false);
    }
  };

  const runCancelDowngrade = async () => {
    setBusy(true);
    try {
      await cancelDowngrade.mutateAsync();
      toast.success('Downgrade programado cancelado. Sigues en Plus.');
      void sub.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo cancelar el downgrade.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Suscripción</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{planName}</Badge>
            {sub.isFounder && <Badge className="border-green-200 bg-green-100 text-green-800">Founder</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-gray-700">
          <span className="text-2xl font-bold text-gray-900">{fmtPrice(row.amount_clp)}</span>
          <span className="text-sm text-muted-foreground">/mes</span>
          {sub.currentPeriodEnd && (
            <span className="text-sm text-muted-foreground">
              {' '}· {isCancelled ? 'acceso hasta' : 'próximo cobro'} el {formatDate(sub.currentPeriodEnd)}
            </span>
          )}
        </p>

        {sub.upgradePending && (
          <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
            Tienes un cambio a Plus en curso. Tu plan Pro sigue activo hasta que se confirme el pago.
            {row.pending_init_point ? (
              <>
                {' '}<a href={row.pending_init_point} className="font-medium underline">Continuar con el pago</a>
              </>
            ) : null}
          </p>
        )}

        {sub.oldProCancelPending && (
          <p className="flex items-start gap-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Estamos finalizando tu cambio de plan con el proveedor. Si ves dos cobros, escríbenos: lo resolvemos sin costo para ti.
          </p>
        )}

        {sub.downgradeScheduled && (
          <div className="rounded-lg bg-gray-50 p-2 text-xs text-gray-700">
            <p>
              Volverás a Pro el {formatDate(sub.planChangeEffectiveAt)}. Hasta entonces conservas todos los límites de Plus.
            </p>
            <Button type="button" variant="outline" size="sm" className="mt-2" disabled={busy} onClick={runCancelDowngrade}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Seguir en Plus'}
            </Button>
          </div>
        )}

        {!isCancelled && sub.canonicalPlan === 'pro' && sub.hasProAccess && !sub.upgradePending && (
          <Button type="button" className="w-full bg-gray-900 text-white hover:bg-green-900" onClick={() => setPlusOpen(true)}>
            Cambiar a LegalUp Plus
          </Button>
        )}

        {!isCancelled && sub.canonicalPlan === 'plus' && sub.hasProAccess && !sub.downgradeScheduled && (
          confirming === 'downgrade' ? (
            <div className="space-y-2 rounded-lg border p-3">
              <p className="text-xs text-gray-700">
                Volverás a Pro ($49.990/mes) al final de tu período actual. Tus casos y documentos se conservan; solo se bloquea crear nuevo contenido sobre los límites de Pro.
              </p>
              <div className="flex gap-2">
                <Button type="button" size="sm" disabled={busy} onClick={runDowngrade}>
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Confirmar downgrade'}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setConfirming(null)}>
                  Volver
                </Button>
              </div>
            </div>
          ) : (
            <Button type="button" variant="outline" className="w-full" onClick={() => setConfirming('downgrade')}>
              Volver a LegalUp Pro
            </Button>
          )
        )}

        {!isCancelled && sub.hasProAccess && (
          confirming === 'cancel' ? (
            <div className="space-y-2 rounded-lg border p-3">
              <p className="text-xs text-gray-700">
                Se cancelará al final del período ya pagado. Mantienes el acceso hasta entonces. Tu historial se conserva.
              </p>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="destructive" disabled={busy} onClick={runCancel}>
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Confirmar cancelación'}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setConfirming(null)}>
                  Volver
                </Button>
              </div>
            </div>
          ) : (
            <Button type="button" variant="ghost" className="w-full text-gray-500" onClick={() => setConfirming('cancel')}>
              Cancelar suscripción
            </Button>
          )
        )}

        {isCancelled && (
          <p className="text-xs text-muted-foreground">
            Suscripción cancelada. Mantienes el acceso hasta el {formatDate(sub.currentPeriodEnd)}.
          </p>
        )}

        <ProPricingModal open={plusOpen} onOpenChange={setPlusOpen} triggerAction="subscription_settings" targetPlan="plus" />
      </CardContent>
    </Card>
  );
}
