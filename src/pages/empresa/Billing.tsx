import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  getCompanySubscription,
  getSubscriptionPlans,
  cancelSubscription,
  createSubscriptionPreference,
} from '@/services/empresaService'
import type { Company, CompanySubscription, SubscriptionPlan } from '@/types/empresas'
import {
  CreditCard,
  AlertCircle,
  ArrowRight,
  Building2,
  Check,
} from 'lucide-react'
import { toast } from 'sonner'

const statusLabels: Record<string, { label: string; color: string }> = {
  active: { label: 'Activa', color: 'bg-green-100 text-green-800' },
  pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800' },
  paused: { label: 'Pausada', color: 'bg-orange-100 text-orange-800' },
  cancelled: { label: 'Cancelada', color: 'bg-gray-100 text-gray-800' },
  past_due: { label: 'Pago vencido', color: 'bg-red-100 text-red-800' },
}

export default function Billing() {
  const { company } = useOutletContext<{ company: Company }>()
  const [subscription, setSubscription] = useState<CompanySubscription | null>(null)
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCancelling, setIsCancelling] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const [sub, allPlans] = await Promise.all([
          getCompanySubscription(company.id),
          getSubscriptionPlans(),
        ])
        setSubscription(sub)
        setPlans(allPlans)
      } catch (error) {
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [company.id])

  const handleCancel = async () => {
    if (!subscription) return
    setIsCancelling(true)
    try {
      await cancelSubscription(subscription.id)
      setSubscription((prev) => prev ? { ...prev, status: 'cancelled', cancel_at_period_end: true } : null)
      toast.success('Suscripción cancelada. Los beneficios seguirán activos hasta el fin del período.')
    } catch (error) {
      toast.error('Error al cancelar la suscripción')
    } finally {
      setIsCancelling(false)
    }
  }

  const handleUpgrade = async (planId: string) => {
    try {
      const data = await createSubscriptionPreference(company.id, planId)
      if (data.initPoint) {
        window.location.href = data.initPoint
      }
    } catch (error) {
      toast.error('Error al crear la suscripción')
    }
  }

  const plansDialog = (trigger: React.ReactNode) => (
    <Dialog>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-5xl" style={{ maxWidth: '64rem' }}>
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">Planes disponibles</DialogTitle>
        </DialogHeader>
        <div className="grid md:grid-cols-3 gap-6 py-6 px-2">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative p-6 border rounded-3xl transition-all flex flex-col ${
                plan.name === 'PyME'
                  ? 'border-green-900 border-2 bg-cream-900 shadow-xl'
                  : 'border-gray-200'
              }`}
            >
              {plan.name === 'PyME' && (
                <div className="absolute top-6 right-6">
                  <Badge className="bg-gray-900 text-white px-4 py-1 h-6 animate-bounce shadow-lg">Más popular</Badge>
                </div>
              )}
              <div className="flex-1">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">{plan.name}</h3>
                  <p className="text-gray-600 text-sm mt-1">{plan.description}</p>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-gray-900">
                      ${plan.price_clp.toLocaleString('es-CL')}
                    </span>
                    <span className="text-gray-500 ml-1">/mes</span>
                  </div>
                </div>
                <Separator className="mb-6" />
                <p className="text-gray-900 text-sm font-bold mt-1 mb-4">Incluye:</p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Button
                className="w-full mt-auto"
                variant={plan.name === 'PyME' ? 'default' : 'outline'}
                size="lg"
                onClick={() => handleUpgrade(plan.id)}
              >
                Contratar plan
              </Button>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )

  if (isLoading) return <div className="text-center py-12 text-gray-500">Cargando...</div>

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Facturación</h1>
        <p className="text-gray-600 mt-1">Gestiona tu suscripción y método de pago</p>
      </div>

      {/* Current subscription */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {subscription ? subscription.plan?.name || 'Sin plan' : 'Sin suscripción activa'}
            </h2>
            {subscription && (
              <Badge
                variant="secondary"
                className={statusLabels[subscription.status]?.color || ''}
              >
                {statusLabels[subscription.status]?.label || subscription.status}
              </Badge>
            )}
          </div>
          <CreditCard className="w-8 h-8 text-gray-400" />
        </div>

        <Separator className="my-4" />

        {subscription && subscription.status === 'active' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Plan</p>
                <p className="font-medium text-gray-900">{subscription.plan?.name || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Precio</p>
                <p className="font-medium text-gray-900">
                  ${(subscription.plan?.price_clp || 0).toLocaleString('es-CL')}/mes
                </p>
              </div>
              <div>
                <p className="text-gray-500">Próximo cobro</p>
                <p className="font-medium text-gray-900">
                  {subscription.current_period_end
                    ? new Date(subscription.current_period_end).toLocaleDateString('es-CL')
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Método de pago</p>
                <p className="font-medium text-gray-900">
                  {subscription.card_last_four
                    ? `Visa ****${subscription.card_last_four}`
                    : 'No registrado'}
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-red-600 hover:text-red-700">
                    Cancelar suscripción
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Cancelar suscripción?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tus beneficios seguirán activos hasta el {subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString('es-CL') : 'el fin del período actual'}. Después de esa fecha, no se renovará.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Mantener suscripción</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCancel} disabled={isCancelling}>
                      {isCancelling ? 'Cancelando...' : 'Sí, cancelar'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ) : subscription && subscription.status === 'past_due' ? (
          <div>
            <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg mb-4">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <p className="text-sm text-red-700">
                No pudimos procesar el pago de tu suscripción. Actualiza tu medio de pago para continuar usando el servicio.
              </p>
            </div>
            <Button>
              Actualizar medio de pago
            </Button>
          </div>
        ) : subscription && subscription.status === 'cancelled' ? (
          <div className="text-center py-6">
            <p className="text-gray-600 mb-4">
              Tu suscripción está cancelada. Puedes reactivarla en cualquier momento.
            </p>
            {plansDialog(<Button>Ver planes disponibles</Button>)}
          </div>
        ) : (
          <div className="text-center py-6">
            <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Sin suscripción activa</h3>
            <p className="text-gray-600 mb-6">
              Contrata un plan para acceder a todos los beneficios de LegalUp Empresas.
            </p>
            {plansDialog(
              <Button>
                Ver planes
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* TODO: Billing history placeholder */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-xs text-gray-500 flex items-center gap-2">
          <AlertCircle className="w-3 h-3" />
          TODO: Aquí se mostrará el historial de facturación con descargas de boletas y comprobantes de pago.
        </p>
      </div>
    </div>
  )
}
