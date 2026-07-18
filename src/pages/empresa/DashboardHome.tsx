import { useState, useEffect } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  getCompanySubscription,
  getCompanyUsage,
  getCompanyRequests,
} from '@/services/empresaService'
import type { Company, CompanySubscription, CompanyUsage, CompanyRequest } from '@/types/empresas'
import {
  Plus,
  FileText,
  CheckCircle2,
  Clock,
  TrendingUp,
  Calendar,
  Users,
  AlertCircle,
  Timer,
} from 'lucide-react'

const statusColors: Record<string, string> = {
  nueva: 'bg-blue-100 text-blue-800',
  asignada: 'bg-yellow-100 text-yellow-800',
  en_revision: 'bg-purple-100 text-purple-800',
  finalizada: 'bg-green-100 text-green-800',
  cancelada: 'bg-gray-100 text-gray-800',
}

export default function DashboardHome() {
  const navigate = useNavigate()
  const { company } = useOutletContext<{ company: Company }>()
  const [subscription, setSubscription] = useState<CompanySubscription | null>(null)
  const [usage, setUsage] = useState<CompanyUsage | null>(null)
  const [requests, setRequests] = useState<CompanyRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [sub, usageData, reqs] = await Promise.all([
          getCompanySubscription(company.id),
          getCompanyUsage(company.id),
          getCompanyRequests(company.id),
        ])
        setSubscription(sub)
        setUsage(usageData)
        setRequests(reqs)
      } catch (error) {
        console.error('Error loading dashboard data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [company.id])

  const openRequests = requests.filter((r) => !['finalizada', 'cancelada'].includes(r.status))
  const closedRequests = requests.filter((r) => ['finalizada', 'cancelada'].includes(r.status))

  if (isLoading) return <DashboardSkeleton />

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Hola, {company.contact_name}
          </h1>
          <p className="text-gray-600 mt-1">
            Panel de control de {company.name}
          </p>
        </div>
        <Button onClick={() => navigate('/empresa/solicitudes/nueva')}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva solicitud
        </Button>
      </div>

      {/* Status banner for past_due */}
      {company.status === 'past_due' && (
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <p className="text-sm text-red-700 flex-1">
              No pudimos procesar el pago de tu suscripción.{' '}
              <button
                onClick={() => navigate('/empresa/facturacion')}
                className="underline font-medium"
              >
                Actualizar medio de pago
              </button>
            </p>
          </div>
        </Card>
      )}

      {/* Subscription banner */}
      {subscription && subscription.status === 'active' && (
        <Card className="p-4 bg-gray-900 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-300">Plan activo</p>
              <p className="text-lg font-semibold">
                {subscription.plan?.name || 'Sin plan'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-300">Próximo cobro</p>
              <p className="font-medium">
                {subscription.current_period_end
                  ? new Date(subscription.current_period_end).toLocaleDateString('es-CL')
                  : '-'}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Usage cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <FileText className="w-5 h-5 text-gray-400" />
            <span className="text-xs text-gray-500">Disponibles</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {usage ? usage.consultations_limit - usage.consultations_used : '-'}
          </p>
          <p className="text-sm text-gray-600">Consultas disponibles</p>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <FileText className="w-5 h-5 text-gray-400" />
            <span className="text-xs text-gray-500">Disponibles</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {usage ? usage.reviews_limit - usage.reviews_used : '-'}
          </p>
          <p className="text-sm text-gray-600">Revisiones disponibles</p>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <FileText className="w-5 h-5 text-gray-400" />
            <span className="text-xs text-gray-500">Abiertos</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{openRequests.length}</p>
          <p className="text-sm text-gray-600">Casos abiertos</p>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <CheckCircle2 className="w-5 h-5 text-gray-400" />
            <span className="text-xs text-gray-500">Cerrados</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{closedRequests.length}</p>
          <p className="text-sm text-gray-600">Casos cerrados</p>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Timer className="w-5 h-5 text-gray-400" />
            <span className="text-xs text-gray-500">SLA</span>
          </div>
          <SlaMetrics companyId={company.id} />
        </Card>
      </div>

      {/* Recent requests */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Solicitudes recientes</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/empresa/solicitudes')}
          >
            Ver todas
          </Button>
        </div>
        {requests.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No tienes solicitudes aún
            </h3>
            <p className="text-gray-600 mb-6">
              Crea tu primera solicitud legal para comenzar.
            </p>
            <Button onClick={() => navigate('/empresa/solicitudes/nueva')}>
              <Plus className="w-4 h-4 mr-2" />
              Crear solicitud
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {requests.slice(0, 5).map((request) => (
              <Card
                key={request.id}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => navigate(`/empresa/solicitudes/${request.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{request.title}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <Badge
                        variant="secondary"
                        className={statusColors[request.status] || ''}
                      >
                        {request.status}
                      </Badge>
                      <span className="text-xs text-gray-500">{request.category}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(request.created_at).toLocaleDateString('es-CL')}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 ml-4" />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48 mt-2" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-6">
            <Skeleton className="h-4 w-24 mb-4" />
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-4 w-32" />
          </Card>
        ))}
      </div>
    </div>
  )
}

function SlaMetrics({ companyId }: { companyId: string }) {
  const [metrics, setMetrics] = useState<{ cumplimientoPct: number; tiempoPromedioRespuesta: string } | null>(null)

  useEffect(() => {
    fetch(`/api/empresas/sla-metrics?companyId=${companyId}`)
      .then((r) => r.json())
      .then(setMetrics)
      .catch(() => {})
  }, [companyId])

  if (!metrics) return <Skeleton className="h-8 w-16 mb-1" />

  return (
    <>
      <p className="text-2xl font-bold text-gray-900">{metrics.cumplimientoPct}%</p>
      <p className="text-sm text-gray-600">
        Cumplimiento · {metrics.tiempoPromedioRespuesta} tp resp.
      </p>
    </>
  )
}
