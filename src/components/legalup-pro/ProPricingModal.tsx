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
import { Check, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import posthog from 'posthog-js';
import { useProSubscription, useProSubscribe } from '@/hooks/useProSubscription';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const PERKS = [
  'Clientes ilimitados',
  'Casos ilimitados',
  'Solicitudes y agenda',
  'Citas y pagos',
  'Gestión de tu operación',
  'LegalUp AI integrado',
];

function formatDate(value: string | null): string {
  if (!value) return '';
  try {
    return format(parseISO(value), "d 'de' MMMM yyyy", { locale: es });
  } catch {
    return value;
  }
}

type ProPricingModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerAction?: string;
};

export function ProPricingModal({ open, onOpenChange, triggerAction }: ProPricingModalProps) {
  const sub = useProSubscription();
  const subscribe = useProSubscribe();
  const [subscribing, setSubscribing] = useState(false);

  const { status, hasProAccess, isActive, isPastDue } = sub;

  const handleSubscribe = async () => {
    setSubscribing(true);
    try {
      posthog.capture('pro_subscribe_clicked', { source: 'pricing_modal', action: triggerAction });
      const result: any = await subscribe.mutateAsync();
      posthog.capture('pro_checkout_started', { action: triggerAction });
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>LegalUp Pro</DialogTitle>
          <DialogDescription>Tu oficina legal, organizada en un solo lugar.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-xl border border-green-200 bg-gradient-to-br from-green-50 to-white p-6">
            <Badge className="absolute right-4 top-4 bg-green-100 text-green-800">Founder 15</Badge>
            <p className="text-3xl font-bold text-gray-900">
              $19.990<span className="text-sm font-medium text-muted-foreground">/mes</span>
            </p>
            <p className="text-sm text-muted-foreground">por 3 meses</p>
            <p className="mt-2 text-xs text-green-700 font-medium">Precio Founder disponible para los primeros 15 abogados.</p>
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
