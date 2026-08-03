import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Sparkles, Crown, Loader2 } from 'lucide-react';
import {
  useAISubscription,
  useCancelAISubscription,
  type AIAccessStatus,
} from '@/hooks/useAISubscription';
import { AI_SUBSCRIPTION_PRICE_LABEL, AI_SUBSCRIPTION_TRIAL_DAYS } from '@/lib/aiFeatures';
import { AIPricingModal } from '@/components/legalup-ai/AIPricingModal';

function formatDate(value: string | null): string {
  if (!value) return '—';
  try {
    return format(parseISO(value), "d 'de' MMMM yyyy", { locale: es });
  } catch {
    return value;
  }
}

const STATUS_META: Record<AIAccessStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  trialing: { label: 'En prueba gratuita', variant: 'secondary' },
  active: { label: 'Plan Pro activo', variant: 'default' },
  cancelled: { label: 'Cancelada', variant: 'outline' },
  past_due: { label: 'Pago pendiente', variant: 'destructive' },
  expired: { label: 'Expirada', variant: 'destructive' },
  none: { label: 'Sin suscripción', variant: 'outline' },
};

/** Tarjeta de gestión de la suscripción de LegalUp AI (perfil del abogado). */
export function AISubscriptionCard() {
  const sub = useAISubscription();
  const cancel = useCancelAISubscription();

  const [pricingOpen, setPricingOpen] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

  const { status, isTrialing, isActive, hasAccess, trialEndsAt, currentPeriodEnd } = sub;
  const meta = STATUS_META[status] ?? STATUS_META.none;

  const handleCancel = async () => {
    try {
      await cancel.mutateAsync();
      toast.success('Suscripción cancelada', {
        description: 'Conservas el acceso hasta el fin de tu período facturado.',
      });
      setConfirmCancelOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo cancelar la suscripción.');
    }
  };

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-emerald-500" aria-hidden="true" />
            Mi suscripción de LegalUp AI
          </CardTitle>
          <CardDescription>
            Tu asistente jurídico con inteligencia artificial: análisis de documentos, casos y
            chat contextual.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <Crown className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="font-semibold text-gray-900">Plan Pro</p>
                <p className="text-sm text-muted-foreground">
                  {AI_SUBSCRIPTION_PRICE_LABEL}/mes
                </p>
              </div>
            </div>
            <Badge variant={meta.variant} className="w-fit">
              {meta.label}
            </Badge>
          </div>

          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-gray-50 p-3">
              <dt className="text-xs font-medium text-muted-foreground">Estado</dt>
              <dd className="mt-1 text-sm font-semibold text-gray-900">{meta.label}</dd>
            </div>
            {isTrialing && (
              <div className="rounded-lg bg-gray-50 p-3">
                <dt className="text-xs font-medium text-muted-foreground">Fin de la prueba</dt>
                <dd className="mt-1 text-sm font-semibold text-gray-900">
                  {formatDate(trialEndsAt)}
                </dd>
              </div>
            )}
            {isActive && (
              <div className="rounded-lg bg-gray-50 p-3">
                <dt className="text-xs font-medium text-muted-foreground">Próxima renovación</dt>
                <dd className="mt-1 text-sm font-semibold text-gray-900">
                  {formatDate(currentPeriodEnd)}
                </dd>
              </div>
            )}
            {status === 'none' && (
              <div className="rounded-lg bg-gray-50 p-3">
                <dt className="text-xs font-medium text-muted-foreground">Prueba gratuita</dt>
                <dd className="mt-1 text-sm font-semibold text-gray-900">
                  {AI_SUBSCRIPTION_TRIAL_DAYS} días sin tarjeta
                </dd>
              </div>
            )}
            {status === 'cancelled' && (
              <div className="rounded-lg bg-gray-50 p-3">
                <dt className="text-xs font-medium text-muted-foreground">Acceso hasta</dt>
                <dd className="mt-1 text-sm font-semibold text-gray-900">
                  {formatDate(currentPeriodEnd)}
                </dd>
              </div>
            )}
            {(status === 'past_due' || status === 'expired') && (
              <div className="rounded-lg bg-gray-50 p-3">
                <dt className="text-xs font-medium text-muted-foreground">Estado del pago</dt>
                <dd className="mt-1 text-sm font-semibold text-gray-900">
                  {status === 'past_due'
                    ? 'Actualiza tu medio de pago para no perder el acceso.'
                    : 'Tu acceso expiró. Suscríbete para reactivar.'}
                </dd>
              </div>
            )}
          </dl>

          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <Button asChild variant="ghost" className="w-full justify-start text-left sm:w-auto">
              <Link to="/lawyer/ai">Ir a LegalUp AI</Link>
            </Button>
            <div className="flex flex-col gap-2 sm:flex-row">
              {hasAccess && !isActive ? (
                <Button type="button" onClick={() => setPricingOpen(true)} className="bg-gray-900 text-white hover:bg-green-900">
                  Suscribirme ahora
                </Button>
              ) : null}
              {!hasAccess ? (
                <Button type="button" onClick={() => setPricingOpen(true)} className="bg-gray-900 text-white hover:bg-green-900">
                  Ver planes
                </Button>
              ) : null}
              {isActive ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirmCancelOpen(true)}
                  disabled={cancel.isPending}
                >
                  {cancel.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      Cancelando…
                    </>
                  ) : (
                    'Cancelar suscripción'
                  )}
                </Button>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <AIPricingModal open={pricingOpen} onOpenChange={setPricingOpen} />

      <ConfirmDialog
        open={confirmCancelOpen}
        onOpenChange={(open) => {
          if (!cancel.isPending) setConfirmCancelOpen(open);
        }}
        onConfirm={handleCancel}
        title="Cancelar suscripción"
        description="Cancelarás tu suscripción de LegalUp AI a fin de período. Conservarás el acceso hasta esa fecha y no se borrarán tus casos ni documentos."
        confirmText="Cancelar suscripción"
        cancelText="Mantener suscripción"
        isDeleting={cancel.isPending}
      />
    </>
  );
}