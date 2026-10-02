import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useProSubscription } from '@/hooks/useProSubscription';
import { useCaseEntitlement } from '@/hooks/useCaseEntitlement';
import { ProPricingModal } from '@/components/legalup-pro/ProPricingModal';

/**
 * FASE 5.2E — /lawyer/plan representa EXCLUSIVAMENTE LegalUp Pro.
 * Sin sección AI (vive en su propia experiencia en fase futura).
 */
export default function PlanPage() {
  const { hasProAccess, status, currentPeriodEnd, isLoading: proLoading } = useProSubscription();
  const { entitlement, loading: entitlementLoading } = useCaseEntitlement();
  const [proOpen, setProOpen] = useState(false);

  const loading = proLoading || entitlementLoading;
  const periodEnd = currentPeriodEnd ? new Date(currentPeriodEnd) : null;
  const statusLabel =
    status === 'active' ? 'Activo' : status === 'cancelled' ? 'Cancelado con acceso vigente' : status ?? '—';

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 sm:px-6 lg:px-8 py-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Plan y facturación</h1>
        <p className="text-muted-foreground">Revisa tu plan, límites y estado de suscripción.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2 text-base">
            Plan actual: {hasProAccess ? 'LegalUp Pro' : 'LegalUp Gratis'}
            {hasProAccess && <Badge className="border-0 bg-gray-900 text-white">PRO</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {loading ? (
            <Skeleton className="h-16 w-full" />
          ) : hasProAccess ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Estado</span>
                <span className="font-medium text-gray-900">{statusLabel}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Casos activos</span>
                <span className="font-medium text-gray-900">
                  {entitlement.activeCaseLimit > 0
                    ? `${entitlement.activeCaseCount} / ${entitlement.activeCaseLimit}`
                    : `${entitlement.activeCaseCount}`}
                </span>
              </div>
              {periodEnd && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Renovación</span>
                  <span className="font-medium text-gray-900">
                    {format(periodEnd, "d 'de' MMMM yyyy", { locale: es })}
                  </span>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Caso gratuito lifetime</span>
                <span className="font-medium text-gray-900">
                  {entitlement.freeCaseConsumed ? 'Consumido' : 'Disponible'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Tu primer caso directo no requiere suscripción. Las funciones de IA están incluidas con LegalUp Pro.
              </p>
              <Button onClick={() => setProOpen(true)} className="w-full bg-gray-900 hover:bg-green-900 sm:w-auto">
                Ver LegalUp Pro
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Cómo recibes pagos de tus clientes se configura en{' '}
        <Link to="/dashboard/payment-settings" className="font-medium text-green-700 hover:underline">
          Configuración de pagos
        </Link>
        .
      </p>

      <ProPricingModal open={proOpen} onOpenChange={setProOpen} triggerAction="plan_page" />
    </div>
  );
}
