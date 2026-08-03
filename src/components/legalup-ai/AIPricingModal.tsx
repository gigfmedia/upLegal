import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import posthog from 'posthog-js';
import {
  useAISubscription,
  useStartAITrial,
  useAISubscribe,
} from '@/hooks/useAISubscription';
import {
  AI_SUBSCRIPTION_PRICE_LABEL,
  AI_SUBSCRIPTION_TRIAL_DAYS,
} from '@/lib/aiFeatures';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

type AIPricingModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const PERKS = [
  'Análisis jurídico de documentos con IA',
  'Workspace privado por caso',
  'Chat contextual con tu caso',
  'Investigación de jurisprudencia (próximamente)',
];

function formatDate(value: string | null): string {
  if (!value) return '';
  try {
    return format(parseISO(value), "d 'de' MMMM yyyy", { locale: es });
  } catch {
    return value;
  }
}

/**
 * Modal de suscripción / paywall de LegalUp AI.
 * - Sin prueba iniciada → "Empezar prueba gratis".
 * - En trial → "Suscribirme por $49.900/mes".
 * - Plan Pro activo → muestra estado y permite cancelar.
 */
export function AIPricingModal({ open, onOpenChange }: AIPricingModalProps) {
  const sub = useAISubscription();
  const startTrial = useStartAITrial();
  const subscribe = useAISubscribe();

  const [startingTrial, setStartingTrial] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  const { status, hasAccess, isTrialing, isActive, trialDaysRemaining, trialEndsAt } = sub;

  const handleStartTrial = async () => {
    setStartingTrial(true);
    try {
      await startTrial.mutateAsync();
      posthog.capture('ai_trial_cta_clicked', { source: 'pricing_modal' });
      toast.success('¡Prueba gratuita activada!', {
        description: `Tienes ${AI_SUBSCRIPTION_TRIAL_DAYS} días gratis de LegalUp AI.`,
      });
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo iniciar la prueba.');
    } finally {
      setStartingTrial(false);
    }
  };

  const handleSubscribe = async () => {
    setSubscribing(true);
    try {
      const result = await subscribe.mutateAsync();
      posthog.capture('ai_subscribe_clicked', { source: 'pricing_modal' });
      if (result?.initPoint) {
        window.location.href = result.initPoint;
      } else {
        toast.success('Suscripción iniciada', {
          description: 'Te redirigimos a Mercado Pago para completar el pago.',
        });
        onOpenChange(false);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo iniciar la suscripción.');
    } finally {
      setSubscribing(false);
    }
  };

  // Si nunca inició el trial → "Empezar gratis". En cualquier otro caso (trial
  // en curso, expirada, cancelada) el objetivo es suscribirse.
  const primaryCta =
    !isTrialing && status === 'none'
      ? { label: 'Empezar gratis', action: handleStartTrial, loading: startingTrial }
      : { label: `Suscribirme por ${AI_SUBSCRIPTION_PRICE_LABEL}/mes`, action: handleSubscribe, loading: subscribing };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-500" aria-hidden="true" />
            LegalUp AI
          </DialogTitle>
          <DialogDescription>
            Tu asistente jurídico con inteligencia artificial. Activa tu acceso.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isTrialing && (
            <Badge variant="secondary" className="bg-emerald-50 text-emerald-800">
              Estás en prueba: {trialDaysRemaining} día{trialDaysRemaining === 1 ? '' : 's'}{' '}
              restante{trialDaysRemaining === 1 ? '' : 's'} (hasta el{' '}
              {formatDate(trialEndsAt)})
            </Badge>
          )}

          <div className="relative overflow-hidden rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6">
            <Badge className="absolute right-4 top-4 bg-emerald-100 text-emerald-800">
              Pro
            </Badge>
            <p className="text-3xl font-bold text-gray-900">
              {AI_SUBSCRIPTION_PRICE_LABEL}
              <span className="text-sm font-medium text-muted-foreground">/mes</span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Empieza con {AI_SUBSCRIPTION_TRIAL_DAYS} días gratis, sin tarjeta. Cancela
              cuando quieras.
            </p>
            <ul className="mt-4 space-y-2">
              {PERKS.map((perk) => (
                <li key={perk} className="flex items-start gap-2 text-sm text-gray-700">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                  {perk}
                </li>
              ))}
            </ul>
          </div>

          {sub.isActive && (
            <p className="text-sm text-muted-foreground">
              Tu plan <strong>Pro</strong> está activo. Puedes gestionarlo desde tu perfil.
            </p>
          )}

          {hasAccess && !sub.isActive && !isTrialing && (
            <Button type="button" variant="outline" className="w-full" disabled>
              Acceso activo hasta el {formatDate(sub.currentPeriodEnd)}
            </Button>
          )}
        </div>

        <div className="mt-2 flex flex-col gap-2">
          {status === 'expired' && (
            <p className="flex items-center gap-2 text-sm text-amber-600">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              Tu acceso expiró. Suscríbete para continuar.
            </p>
          )}
          {!sub.isActive && (
            <Button
              type="button"
              className="w-full bg-gray-900 text-white hover:bg-green-900"
              onClick={primaryCta.action}
              disabled={primaryCta.loading || sub.isActive}
            >
              {primaryCta.loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Procesando…
                </>
              ) : (
                primaryCta.label
              )}
            </Button>
          )}
          {status !== 'none' && !sub.isActive && (
            <Button type="button" variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}