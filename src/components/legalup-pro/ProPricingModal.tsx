import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import posthog from 'posthog-js';
import { useProSubscription, useProSubscribe, useProFounderStatus } from '@/hooks/useProSubscription';
import { PLUS_PRICE_CLP_DISPLAY } from '@/lib/planDisplay';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const PERKS = [
  'Clientes ilimitados',
  'Hasta 20 casos activos',
  'Solicitudes y agenda',
  'Citas con tus clientes',
  'Gestión de tu operación',
  'LegalUp AI integrado',
  'Hasta 50 documentos actuales',
  '300 consultas IA / mes (caso y documentos)',
  '40 análisis de documentos / mes',
  '10 investigaciones jurídicas / mes',
  'Command Center: vista avanzada de hechos, riesgos y pendientes',
];

function formatDate(value: string | null): string {
  if (!value) return '';
  try {
    return format(parseISO(value), "d 'de' MMMM yyyy", { locale: es });
  } catch {
    return value;
  }
}

const PLUS_PERKS = [
  'Todo lo incluido en LegalUp Pro',
  'Hasta 40 casos activos',
  'Clientes ilimitados',
  'Hasta 150 documentos actuales',
  '750 consultas IA / mes (caso y documentos)',
  '100 análisis de documentos / mes',
  '25 investigaciones jurídicas / mes',
  'Citas con tus clientes',
  'Command Center: vista avanzada de hechos, riesgos y pendientes',
];

type ProPricingModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerAction?: string;
  /**
   * 4.57D purchase target. When omitted, paid Pro users see Plus (upgrade)
   * and everyone else sees Pro — free exhaustion targets Pro, never Plus.
   */
  targetPlan?: 'pro' | 'plus';
};

export function ProPricingModal({ open, onOpenChange, triggerAction, targetPlan }: ProPricingModalProps) {
  const sub = useProSubscription();
  const { status, hasProAccess, isActive, isPastDue, canonicalPlan, isPlus } = sub;
  // Auto-target: explicit prop wins; paid Pro users get the Plus upgrade,
  // Plus users see their current plan, everyone else sees Pro.
  const effectiveTarget: 'pro' | 'plus' =
    targetPlan ?? (canonicalPlan === 'pro' && hasProAccess ? 'plus' : isPlus ? 'plus' : 'pro');
  const isPlusMode = effectiveTarget === 'plus';
  const isUpgrade = isPlusMode && canonicalPlan === 'pro' && hasProAccess;
  const subscribe = useProSubscribe(effectiveTarget);
  const [subscribing, setSubscribing] = useState(false);

  // 4.32B.4: display-only preview; POST /api/pro/subscribe is the authority.
  const founderStatus = useProFounderStatus(open && !isPlusMode);
  const previewPrice = founderStatus.data?.previewPriceClp ?? 19990;
  const slotsRemaining = founderStatus.data?.founderSlotsRemaining ?? null;
  const isFounderRate = previewPrice === 19990;
  const fmtPrice = (v: number) => `$${v.toLocaleString('es-CL')}`;
  const plusPriceLabel = fmtPrice(PLUS_PRICE_CLP_DISPLAY);

  useEffect(() => {
    if (!open) return;
    try {
      posthog.capture(isPlusMode ? 'plus_viewed' : 'pro_pricing_viewed', {
        source: 'pricing_modal',
        action: triggerAction,
        ...(isUpgrade ? { from_plan: 'pro', target_plan: 'plus' } : {}),
      });
    } catch { /* telemetry best-effort */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSubscribe = async () => {
    setSubscribing(true);
    try {
      posthog.capture(isPlusMode ? 'plus_upgrade_started' : 'pro_subscribe_clicked', {
        source: 'pricing_modal',
        action: triggerAction,
        ...(isUpgrade ? { from_plan: 'pro', target_plan: 'plus' } : {}),
      });
      const result: any = await subscribe.mutateAsync();
      posthog.capture(isPlusMode ? 'plus_checkout_started' : 'pro_checkout_started', { action: triggerAction });
      if (result?.initPoint) {
        window.location.href = result.initPoint;
      } else {
        toast.success('Te redirigimos a Mercado Pago...');
        onOpenChange(false);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo iniciar la suscripción.');
    } finally {
      setSubscribing(false);
    }
  };

  if (isPlusMode) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>LegalUp Plus</DialogTitle>
            <DialogDescription>Más capacidad para abogados con mayor volumen de casos, documentos e investigación jurídica.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-xl border border-green-200 bg-gradient-to-br from-green-50 to-white p-6">
              <Badge className="absolute right-4 top-4 bg-green-100 text-green-800">Para mayor volumen</Badge>
              <p className="text-3xl font-bold text-gray-900">
                {plusPriceLabel}<span className="text-sm font-medium text-muted-foreground">/mes</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Todo lo de Pro, con mayor capacidad. Sin equipos ni automatizaciones: capacidad operativa.</p>
              {isUpgrade && (
                <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
                  Tu Plus comienza de inmediato con un nuevo ciclo de facturación de {plusPriceLabel}/mes. No se aplica crédito prorrateado por tu período Pro restante.
                </p>
              )}
              <ul className="mt-4 space-y-2">
                {PLUS_PERKS.map((perk) => (
                  <li key={perk} className="flex items-start gap-2 text-sm text-gray-700">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                    {perk}
                  </li>
                ))}
              </ul>
            </div>

            {isPlus && (
              <p className="text-sm text-muted-foreground">
                Tu plan Plus está activo {sub.currentPeriodEnd ? `hasta el ${formatDate(sub.currentPeriodEnd)}` : ''}.
              </p>
            )}

            {isPastDue && (
              <p className="flex items-center gap-2 text-sm text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                Hay un problema con tu pago.
              </p>
            )}
          </div>

          <div className="mt-2 flex flex-col gap-2">
            {!isPlus && (
              <Button
                type="button"
                className="w-full bg-gray-900 text-white hover:bg-green-900"
                onClick={handleSubscribe}
                disabled={subscribing}
              >
                {subscribing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Procesando…
                  </>
                ) : (
                  isUpgrade ? 'Cambiar a LegalUp Plus' : 'Activar LegalUp Plus'
                )}
              </Button>
            )}
            <Button type="button" variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>LegalUp Pro</DialogTitle>
          <DialogDescription>Tu oficina legal, organizada en un solo lugar.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-xl border border-green-200 bg-gradient-to-br from-green-50 to-white p-6">
            {isFounderRate && <Badge className="absolute right-4 top-4 bg-green-100 text-green-800">Founder 15</Badge>}
            <p className="text-3xl font-bold text-gray-900">
              {fmtPrice(previewPrice)}<span className="text-sm font-medium text-muted-foreground">/mes</span>
            </p>
            {isFounderRate ? (
              <>
                <p className="text-sm text-muted-foreground">por tus primeros 3 cobros exitosos</p>
                <p className="mt-1 text-xs text-muted-foreground">Desde el cuarto cobro, $49.990/mes.</p>
                <p className="mt-2 text-xs text-green-700 font-medium">
                  {slotsRemaining != null && slotsRemaining > 0
                    ? `¡Quedan ${slotsRemaining} cupos Founder! Los primeros 15 abogados con pago exitoso obtienen el badge Founder permanente.`
                    : 'Los primeros 15 abogados con pago exitoso obtienen el badge Founder permanente.'}
                </p>
              </>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">$49.990/mes. Los cupos Founder ya fueron asignados.</p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">Founder tiene las mismas capacidades de Pro. Cancelar y reactivar no reinicia los cobros exitosos. Los documentos son capacidad almacenada, sin reinicio mensual.</p>
            <ul className="mt-4 space-y-2">
              {PERKS.map((perk) => (
                <li key={perk} className="flex items-start gap-2 text-sm text-gray-700">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                  {perk}
                </li>
              ))}
            </ul>
          </div>

          {isActive && (
            <p className="text-sm text-muted-foreground">
              Tu plan Pro está activo {sub.currentPeriodEnd ? `hasta el ${formatDate(sub.currentPeriodEnd)}` : ''}.
            </p>
          )}

          {hasProAccess && !isActive && (
            <Button type="button" variant="outline" className="w-full" disabled>
              Acceso activo hasta el {formatDate(sub.currentPeriodEnd)}
            </Button>
          )}

          {isPastDue && (
            <p className="flex items-center gap-2 text-sm text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              Hay un problema con tu pago.
            </p>
          )}
        </div>

        <div className="mt-2 flex flex-col gap-2">
          {!isActive && (
            <Button
              type="button"
              className="w-full bg-gray-900 text-white hover:bg-green-900"
              onClick={handleSubscribe}
              disabled={subscribing || isActive}
            >
              {subscribing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Procesando…
                </>
              ) : (
                'Activar LegalUp Pro'
              )}
            </Button>
          )}
          <Button type="button" variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
