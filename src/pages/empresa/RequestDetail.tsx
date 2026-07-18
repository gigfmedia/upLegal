import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { getRequestById } from '@/services/empresaService'
import { getRequestRating } from '@/services/empresaRatingService'
import { approveBudget, rejectBudget } from '@/services/empresaService'
import { RateLawyerModal } from '@/components/empresa/RateLawyerModal'
import RequestConversation from '@/components/empresa/RequestConversation'
import { RatingStars } from '@/components/reviews/RatingStars'
import type { CompanyRequest, CompanyRating, CompanyBudget } from '@/types/empresas'
import { REQUEST_STATUS_LABELS } from '@/types/empresas'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  ArrowLeft,
  Clock,
  User,
  FileText,
  MessageSquare,
  Calendar,
  Download,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Circle,
  Star,
  Receipt,
  Check,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

const statusColors: Record<string, string> = {
  nueva: 'bg-blue-100 text-blue-800',
  asignada: 'bg-yellow-100 text-yellow-800',
  en_revision: 'bg-purple-100 text-purple-800',
  esperando_documentos: 'bg-orange-100 text-orange-800',
  esperando_cliente: 'bg-pink-100 text-pink-800',
  presupuesto_enviado: 'bg-indigo-100 text-indigo-800',
  presupuesto_aprobado: 'bg-teal-100 text-teal-800',
  en_ejecucion: 'bg-cyan-100 text-cyan-800',
  finalizada: 'bg-green-100 text-green-800',
  cancelada: 'bg-gray-100 text-gray-800',
  sla_breached: 'bg-red-100 text-red-800',
}

export default function RequestDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [request, setRequest] = useState<CompanyRequest | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [companyRating, setCompanyRating] = useState<CompanyRating | null>(null)
  const [budgets, setBudgets] = useState<CompanyBudget[]>([])

  useEffect(() => {
    const load = async () => {
      if (!id) return
      try {
        const [data, rating] = await Promise.all([
          getRequestById(id),
          getRequestRating(id),
        ])
        setRequest(data)
        setCompanyRating(rating)
        if (data) {
          const res = await fetch(`/api/empresas/budgets?companyId=${data.company_id}&requestId=${id}`)
          const bData = await res.json()
          setBudgets(bData.budgets || [])
        }
      } catch (error) {
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [id])

  if (isLoading) return <div className="text-center py-12 text-gray-500">Cargando...</div>

  if (!request) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Solicitud no encontrada</h2>
        <Button onClick={() => navigate('/empresa/solicitudes')}>Volver a solicitudes</Button>
      </div>
    )
  }

  return (
    <div className="mx-auto">
      <button
        onClick={() => navigate('/empresa/solicitudes')}
        className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Volver a solicitudes
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">{request.title}</h1>
            {request.is_out_of_plan && (
              <Badge variant="outline">Fuera del plan</Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Badge
              variant="secondary"
              className={statusColors[request.status] || ''}
            >
              {REQUEST_STATUS_LABELS[request.status] || request.status}
            </Badge>
            <span className="text-sm text-gray-500 capitalize">{request.category}</span>
            {request.priority === 'alta' || request.priority === 'urgente' ? (
              <Badge variant="destructive" className="text-xs">{request.priority}</Badge>
            ) : null}
      </div>

      {showRatingModal && request.lawyer && (
        <RateLawyerModal
          isOpen={showRatingModal}
          onClose={() => setShowRatingModal(false)}
          requestId={request.id}
          lawyerId={request.lawyer_id!}
          lawyerName={`${request.lawyer.first_name} ${request.lawyer.last_name}`}
          onRated={() => {
            getRequestRating(request.id).then(setCompanyRating)
          }}
        />
      )}
    </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Descripción</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{request.description}</p>

            {/* SLA */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="w-4 h-4" />
                <span>
                  SLA: {request.sla_deadline
                    ? `Respuesta esperada antes del ${new Date(request.sla_deadline).toLocaleDateString('es-CL')}`
                    : 'Pendiente de asignación'}
                </span>
              </div>
              {request.first_response_at && (
                <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                  <MessageSquare className="w-4 h-4" />
                  <span>Primera respuesta: {new Date(request.first_response_at).toLocaleDateString('es-CL')}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Documents */}
          {request.documents && request.documents.length > 0 && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Documentos</h2>
              <div className="space-y-2">
                {request.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900">{doc.file_name}</span>
                    </div>
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
                    >
                      <Download className="w-4 h-4" />
                      Descargar
                    </a>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Conversación */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Conversación</h2>
            <RequestConversation
              requestId={request.id}
              companyId={request.company_id}
              lawyerId={request.lawyer_id}
            />
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Assigned lawyer */}
          <Card className="p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Abogado asignado</h3>
            {request.lawyer ? (
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={request.lawyer.avatar_url || undefined} />
                  <AvatarFallback className="bg-gray-200 text-gray-600 text-sm font-medium">
                    {request.lawyer.first_name?.[0]}{request.lawyer.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-gray-900">
                    {request.lawyer.first_name} {request.lawyer.last_name}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Pendiente de asignación</p>
            )}
          </Card>

          {/* Rating */}
          {request.status === 'finalizada' && request.lawyer && (
            <Card className="p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-3">Tu calificación</h3>
              {companyRating ? (
                <div className="flex items-center gap-3">
                  <RatingStars rating={companyRating.rating} size="md" showNumber />
                  {companyRating.comment && (
                    <p className="text-sm text-gray-600 mt-1">{companyRating.comment}</p>
                  )}
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowRatingModal(true)}
                >
                  <Star className="w-4 h-4 mr-2" />
                  Calificar abogado
                </Button>
              )}
            </Card>
          )}

          {/* Budget */}
          {budgets.length > 0 && budgets.map((budget) => (
            <Card key={budget.id} className="p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-3">Presupuesto</h3>
              <div className="space-y-2">
                {budget.items?.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-600">{item.description}</span>
                    <span className="font-medium">${item.total_clp.toLocaleString('es-CL')}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm font-semibold pt-2 border-t border-gray-100">
                  <span>Total</span>
                  <span>${budget.total_clp.toLocaleString('es-CL')}</span>
                </div>
                {budget.status === 'pending' && (
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={async () => {
                        await approveBudget(budget.id)
                        toast.success('Presupuesto aprobado')
                        const res = await fetch(`/api/empresas/budgets?companyId=${request.company_id}&requestId=${request.id}`)
                        const bData = await res.json()
                        setBudgets(bData.budgets || [])
                      }}>
                      <Check className="w-4 h-4 mr-1" />Aprobar
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 text-red-600 border-red-300"
                      onClick={async () => {
                        await rejectBudget(budget.id)
                        toast.success('Presupuesto rechazado')
                        const res = await fetch(`/api/empresas/budgets?companyId=${request.company_id}&requestId=${request.id}`)
                        const bData = await res.json()
                        setBudgets(bData.budgets || [])
                      }}>
                      <X className="w-4 h-4 mr-1" />Rechazar
                    </Button>
                  </div>
                )}
                {budget.status === 'approved' && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800 w-full justify-center">Aprobado</Badge>
                )}
                {budget.status === 'rejected' && (
                  <Badge variant="secondary" className="bg-red-100 text-red-800 w-full justify-center">Rechazado</Badge>
                )}
              </div>
            </Card>
          ))}

          {/* Timeline */}
          <Timeline requestId={request.id} />
        </div>
      </div>

    </div>
  )
}

function Timeline({ requestId }: { requestId: string }) {
  const [timeline, setTimeline] = useState<{ time: string; event: string; type: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/empresas/requests/${requestId}/timeline`)
      .then((r) => r.json())
      .then((data) => setTimeline(data.timeline || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [requestId])

  if (loading) return <Card className="p-6"><Skeleton className="h-40" /></Card>

  if (timeline.length === 0) return null

  const eventIcon = (type: string) => {
    switch (type) {
      case 'created': return <Circle className="w-3 h-3 text-blue-500" />
      case 'assigned': return <User className="w-3 h-3 text-yellow-500" />
      case 'response': return <MessageSquare className="w-3 h-3 text-green-500" />
      case 'closed': return <CheckCircle2 className="w-3 h-3 text-green-600" />
      case 'activity': return <Clock className="w-3 h-3 text-gray-400" />
      default: return <Circle className="w-3 h-3 text-gray-300" />
    }
  }

  const eventLabel = (event: string) => {
    const labels: Record<string, string> = {
      request_created: 'Solicitud creada',
      request_assigned: 'Abogado asignado',
      sla_cumplido: 'SLA cumplido',
      sla_incumplido: 'SLA incumplido',
      sla_breached: 'SLA vencido',
    }
    return labels[event] || event.replace(/_/g, ' ')
  }

  return (
    <Card className="p-6">
      <h3 className="text-sm font-medium text-gray-500 mb-4">Línea de tiempo</h3>
      <div className="space-y-0">
        {timeline.map((item, i) => (
          <div key={i} className="flex gap-3 pb-4 relative">
            {i < timeline.length - 1 && (
              <div className="absolute left-[5px] top-4 bottom-0 w-px bg-gray-200" />
            )}
            <div className="mt-0.5 flex-shrink-0">{eventIcon(item.type)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900 capitalize">{eventLabel(item.event)}</p>
              <p className="text-xs text-gray-500">
                {new Date(item.time).toLocaleString('es-CL')}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
