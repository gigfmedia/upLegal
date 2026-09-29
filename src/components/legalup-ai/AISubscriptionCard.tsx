import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { History, Loader2 } from 'lucide-react';
import {
  useAISubscription,
  useCancelAISubscription,
} from '@/hooks/useAISubscription';
import { useProSubscription } from '@/hooks/useProSubscription';
import { AIPricingModal } from '@/components/legalup-ai/AIPricingModal';

/**
 * Fecha sentinela de acceso abuelo (ej. 2099-12-31 persistido en
 * ai_subscriptions): representa acceso histórico sin término definido, NO una
 * fecha contractual real. Nunca se muestra literal al usuario.
 */
export function isSentinelEndDate(value: string | null): boolean {
  if (!value) return false;
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) return false;
  return new Date(ms).getUTCFullYear() >= 2099;
}

function formatDate(value: string | null): string | null {
  if (!value || isSentinelEndDate(value)) return null;
  try {
    return format(parseISO(value), "d 'de' MMMM yyyy", { locale: es });
  } catch {
    return null;
  }
}

/**
 * Aviso de compatibilidad de acceso histórico de LegalUp AI (perfil del abogado).
 *
 * Reglas (FASE 4.56F — solo UI/copy/navegación, sin tocar derechos):
 * - Sin fila legacy (free/Pro/Plus normales) → no se muestra.
 * - Con Pro/Plus vigente → no se muestra (el plan actual es primario y se
 *   gestiona en /lawyer/settings).
 * - Legacy sin acceso vigente → no se muestra (no es una oferta comprable).
 * - Solo legacy con acceso → aviso compacto, un único estado, sin fecha
 *   sentinela literal y CTA al flujo canónico de casos.
 */
export function AISubscriptionCard() {
  const sub = useAISubscription();
  const cancel = useCancelAISubscription();
  const { hasProAccess } = useProSubscription();

  const [pricingOpen, setPricingOpen] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

  const { isActive, hasAccess, trialEndsAt, currentPeriodEnd } = sub;

  if (hasProAccess || !hasAccess) return null;

  const legacyEnd = formatDate(isActive ? currentPeriodEnd : trialEndsAt);

  const handleCancel = async () => {
    try {
      await cancel.mutateAsync();
      toast.success('Acceso histórico cancelado', {
        description: 'Conservas el acceso hasta el fin de tu período vigente.',
      });
      setConfirmCancelOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo cancelar el acceso histórico.');
    }
  };

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5 text-emerald-500" aria-hidden="true" />
            Acceso histórico de LegalUp AI
          </CardTitle>
          <CardDescription>
            Tu cuenta conserva acceso proveniente de una modalidad anterior de LegalUp AI.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Este acceso se mantiene según las condiciones históricas de tu cuenta.
            </p>
            <Badge variant="default" className="w-fit">
              Vigente
            </Badge>
          </div>

          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-gray-50 p-3">
              <dt className="text-xs font-medium text-muted-foreground">Origen</dt>
              <dd className="mt-1 text-sm font-semibold text-gray-900">
                Acceso histórico de LegalUp AI
              </dd>
            </div>
            {legacyEnd ? (
              <div className="rounded-lg bg-gray-50 p-3">
                <dt className="text-xs font-medium text-muted-foreground">Fin del acceso</dt>
                <dd className="mt-1 text-sm font-semibold text-gray-900">{legacyEnd}</dd>
              </div>
            ) : null}
          </dl>

          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <Button asChild variant="ghost" className="w-full justify-start text-left sm:w-auto">
              <Link to="/lawyer/cases">Usar LegalUp AI</Link>
            </Button>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" onClick={() => setPricingOpen(true)} className="bg-gray-900 text-white hover:bg-green-900">
                Ver LegalUp Pro
              </Button>
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
        title="Cancelar acceso histórico"
        description="Se cancelará tu acceso histórico a fin de período. Conservarás el acceso hasta esa fecha y no se borrarán tus casos ni documentos."
        confirmText="Cancelar acceso histórico"
        cancelText="Mantener acceso"
        isDeleting={cancel.isPending}
      />
    </>
  );
}
