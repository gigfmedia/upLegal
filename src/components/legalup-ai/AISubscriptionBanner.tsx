import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Crown, Clock } from 'lucide-react';
import { useAISubscription } from '@/hooks/useAISubscription';
import {
  AI_SUBSCRIPTION_PRICE_LABEL,
  AI_SUBSCRIPTION_TRIAL_DAYS,
} from '@/lib/aiFeatures';
import { AIPricingModal } from '@/components/legalup-ai/AIPricingModal';

/**
 * Banner compacto de suscripción que aparece en el workspace de LegalUp AI.
 * - Sin acceso → CTA "Empezar prueba gratis".
 * - En trial → días restantes + CTA "Administrar suscripción".
 * - Expirado/past_due/cancelado → CTA "Reanudar suscripción".
 * - Plan Essential activo → no muestra banner.
 */
export function AISubscriptionBanner() {
  const sub = useAISubscription();
  const [pricingOpen, setPricingOpen] = useState(false);

  const { hasAccess, isActive, isTrialing, status, trialDaysRemaining } = sub;

  if (isActive) return null;

  const neverStarted = status === 'none';
  const expired = status === 'expired' || status === 'past_due';

  return (
    <>
      <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
            {isTrialing ? (
              <Clock className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            )}
          </span>
          <div className="min-w-0">
            {neverStarted && (
              <>
                <p className="font-semibold text-gray-900">
                  Prueba LegalUp AI gratis durante {AI_SUBSCRIPTION_TRIAL_DAYS} días
                </p>
                <p className="text-sm text-muted-foreground">
                  Sin tarjeta. Después, {AI_SUBSCRIPTION_PRICE_LABEL}/mes. Cancela cuando quieras.
                </p>
              </>
            )}
            {isTrialing && (
              <>
                <p className="flex flex-wrap items-center gap-2 font-semibold text-gray-900">
                  Tu prueba de LegalUp AI
                  <Badge variant="secondary" className="bg-emerald-50 text-emerald-800">
                    {trialDaysRemaining === 1
                      ? 'termina mañana'
                      : `${trialDaysRemaining} días restantes`}
                  </Badge>
                </p>
                <p className="text-sm text-muted-foreground">
                  Después del trial: {AI_SUBSCRIPTION_PRICE_LABEL}/mes. Suscríbete para no
                  perder el acceso.
                </p>
              </>
            )}
            {expired && (
              <>
                <p className="font-semibold text-gray-900">Tu acceso a LegalUp AI expiró</p>
                <p className="text-sm text-muted-foreground">
                  Suscríbete por {AI_SUBSCRIPTION_PRICE_LABEL}/mes para seguir usando tus
                  herramientas.
                </p>
              </>
            )}
            {status === 'cancelled' && (
              <>
                <p className="font-semibold text-gray-900">Suscripción cancelada</p>
                <p className="text-sm text-muted-foreground">
                  Conservas el acceso a LegalUp AI hasta que termine tu período vigente.
                </p>
              </>
            )}
          </div>
        </div>
        <div className="shrink-0">
          <Button
            type="button"
            onClick={() => setPricingOpen(true)}
            className="w-full bg-gray-900 text-white hover:bg-green-900 sm:w-auto"
          >
            {isTrialing ? (
              <>
                <Crown className="h-4 w-4" aria-hidden="true" />
                Administrar suscripción
              </>
            ) : neverStarted ? (
              'Empezar prueba gratis'
            ) : (
              <>
                <Crown className="h-4 w-4" aria-hidden="true" />
                Reanudar suscripción
              </>
            )}
          </Button>
        </div>
      </div>

      <AIPricingModal open={pricingOpen} onOpenChange={setPricingOpen} />
    </>
  );
}