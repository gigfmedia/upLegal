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
import { PRO_PRICE_CLP_DISPLAY, PLUS_PRICE_CLP_DISPLAY } from '@/lib/planDisplay';
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
  '30 redacciones asistidas / mes',
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
  'Hasta 150 documentos actuales',
  '750 consultas IA / mes (caso y documentos)',
  '100 análisis de documentos / mes',
  '25 investigaciones jurídicas / mes',
  '75 redacciones asistidas / mes',
];

const SHARED_FEATURES =
  'Incluye: Clientes, Casos, Agenda, Ingresos, Documentos, Investigación jurídica, Inteligencia del caso y Redacción asistida.';

type PlanId = 'pro' | 'plus';

type ProPricingModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerAction?: string;
  /**
   * 4.57D purchase target + 4.61A initial selection. When omitted, paid Pro
   * users default to Plus (upgrade) and everyone else to Pro — free
   * exhaustion targets Pro, never Plus.
   */
  targetPlan?: 'pro' | 'plus';
};

export function ProPricingModal({ open, onOpenChange, triggerAction, targetPlan }: ProPricingModalProps) {
  const sub = useProSubscription();
  const { status, hasProAccess, isActive, isPastDue, canonicalPlan, isPlus } = sub;
  const defaultTarget: PlanId =
    targetPlan ?? (canonicalPlan === 'pro' && hasProAccess ? 'plus' : isPlus ? 'plus' : 'pro');
  const [selected, setSelected] = useState<PlanId>(defaultTarget);

  // Reopening uses the defined default; selection never leaks across sessions.
  useEffect(() => {
    if (open) setSelected(defaultTarget);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open ]);

  const isProCurrent = canonicalPlan === 'pro' && hasProAccess;
  const isPlusCurrent = isPlus;
  const isUpgrade = selected === 'plus' && isProCurrent;
  const ctaVisible =
    (selected === 'pro' && !isProCurrent) || (selected === 'plus' && !isPlusCurrent);

  const subscribePro = useProSubscribe('pro');
  const subscribePlus = useProSubscribe('plus');
  const subscribe = selected === 'plus' ? subscribePlus : subscribePro;
  const [subscribing, setSubscribing] = useState(false);

  // 4.32B.4: display-only preview; POST /api/pro/subscribe is the authority.
  // Founder preview only ever applies to Pro; Plus never touches it.
  const founderStatus = useProFounderStatus(open && selected === 'pro' && !isProCurrent);
  const previewPrice = founderStatus.data?.previewPriceClp ?? 19990;
  const slotsRemaining = founderStatus.data?.founderSlotsRemaining ?? null;
  const isFounderRate = previewPrice === 19990;
  const fmtPrice = (v: number) => `$${v.toLocaleString('es-CL')}`;
  const proPriceLabel = fmtPrice(PRO_PRICE_CLP_DISPLAY);
  const plusPriceLabel = fmtPrice(PLUS_PRICE_CLP_DISPLAY);

  useEffect(() => {
    if (!open) return;
    try {
      posthog.capture(selected === 'plus' ? 'plus_viewed' : 'pro_pricing_viewed', {
        source: 'pricing_modal',
        action: triggerAction,
        selected_plan: selected,
        ...(isUpgrade ? { from_plan: 'pro', target_plan: 'plus' } : {}),
      });
    } catch { /* telemetry best-effort */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSubscribe = async () => {
    if (subscribing) return;
    setSubscribing(true);
    try {
      posthog.capture(selected === 'plus' ? 'plus_upgrade_started' : 'pro_subscribe_clicked', {
        source: 'pricing_modal',
        action: triggerAction,
        selected_plan: selected,
        ...(isUpgrade ? { from_plan: 'pro', target_plan: 'plus' } : {}),
      });
      const result: any = await subscribe.mutateAsync();
      posthog.capture(selected === 'plus' ? 'plus_checkout_started' : 'pro_checkout_started', {
        action: triggerAction,
        selected_plan: selected,
      });
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

  const cardClass = (plan: PlanId, locked: boolean) => {
    const active = selected === plan && !locked;
    return `relative overflow-hidden rounded-xl border p-5 text-left transition-colors ${
      locked
        ? 'border-gray-200 bg-gray-50 opacity-80'
        : active
          ? 'border-green-600 bg-gradient-to-br from-green-50 to-white ring-1 ring-green-600'
          : 'border-green-200 bg-gradient-to-br from-green-50 to-white hover:border-green-400'
    }`;
  };

  const renderPerks = (perks: string[]) => (
    <ul className="mt-4 space-y-2">
      {perks.map((perk) => (
        <li key={perk} className="flex items-start gap-2 text-sm text-gray-700">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
          {perk}
        </li>
      ))}
    </ul>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Elige tu plan LegalUp</DialogTitle>
          <DialogDescription>Elige el plan que mejor se adapta a tu práctica.</DialogDescription>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">{SHARED_FEATURES}</p>

        <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Planes disponibles">
          {/* Pro card */}
          <div
            role="radio"
            aria-checked={selected === 'pro'}
            aria-disabled={isProCurrent}
            aria-label="LegalUp Pro"
            tabIndex={isProCurrent ? -1 : 0}
            onClick={() => { if (!isProCurrent) setSelected('pro'); }}
            onKeyDown={(e) => { if (!isProCurrent && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setSelected('pro'); } }}
            className={cardClass('pro', isProCurrent)}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-base font-bold text-gray-900">LegalUp Pro</p>
              {isProCurrent ? (
                <Badge className="bg-gray-900 text-white">Plan actual</Badge>
              ) : (
                isFounderRate && <Badge className="bg-green-100 text-green-800">Founder 15</Badge>
              )}
            </div>
            <p className="mt-1 text-3xl font-bold text-gray-900">
              {isFounderRate && !isProCurrent ? fmtPrice(previewPrice) : proPriceLabel}
              <span className="text-sm font-medium text-muted-foreground">/mes</span>
            </p>
            {isFounderRate && !isProCurrent ? (
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
              !isProCurrent && (
                <p className="mt-1 text-xs text-muted-foreground">$49.990/mes. Los cupos Founder ya fueron asignados.</p>
              )
            )}
            {isProCurrent && (
              <p className="mt-1 text-xs text-muted-foreground">
                Tu plan Pro está activo {sub.currentPeriodEnd ? `hasta el ${formatDate(sub.currentPeriodEnd)}` : ''}.
              </p>
            )}
            {!isProCurrent && (
              <p className="mt-2 text-xs text-muted-foreground">Founder tiene las mismas capacidades de Pro. Cancelar y reactivar no reinicia los cobros exitosos. Los documentos son capacidad almacenada, sin reinicio mensual.</p>
            )}
            {renderPerks(PERKS)}
          </div>

          {/* Plus card */}
          <div
            role="radio"
            aria-checked={selected === 'plus'}
            aria-disabled={isPlusCurrent}
            aria-label="LegalUp Plus"
            tabIndex={isPlusCurrent ? -1 : 0}
            onClick={() => { if (!isPlusCurrent) setSelected('plus'); }}
            onKeyDown={(e) => { if (!isPlusCurrent && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setSelected('plus'); } }}
            className={cardClass('plus', isPlusCurrent)}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-base font-bold text-gray-900">LegalUp Plus</p>
              {isPlusCurrent ? (
                <Badge className="bg-gray-900 text-white">Plan actual</Badge>
              ) : (
                <Badge className="bg-green-100 text-green-800">Mayor capacidad</Badge>
              )}
            </div>
            <p className="mt-1 text-3xl font-bold text-gray-900">
              {plusPriceLabel}<span className="text-sm font-medium text-muted-foreground">/mes</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Mismas herramientas que Pro, con mayor capacidad. Sin equipos ni automatizaciones: capacidad operativa.</p>
            {isUpgrade && (
              <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
                Tu Plus comienza de inmediato con un nuevo ciclo de facturación de {plusPriceLabel}/mes. No se aplica crédito prorrateado por tu período Pro restante.
              </p>
            )}
            {isPlusCurrent && (
              <p className="mt-1 text-xs text-muted-foreground">
                Tu plan Plus está activo {sub.currentPeriodEnd ? `hasta el ${formatDate(sub.currentPeriodEnd)}` : ''}.
              </p>
            )}
            {renderPerks(PLUS_PERKS)}
          </div>
        </div>

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

        <div className="mt-2 flex flex-col gap-2">
          {ctaVisible && (
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
              ) : selected === 'plus' ? (
                isUpgrade ? 'Cambiar a LegalUp Plus' : 'Activar LegalUp Plus'
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
