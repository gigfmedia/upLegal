import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'
import { REQUEST_STATUS_LABELS } from '@/types/empresas'
import { FileText, Clock, Building2, MessageSquare } from 'lucide-react'

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
}

export default function EmpresasRequestsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [requests, setRequests] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!user) return
      try {
        const res = await fetch(`/api/lawyer/empresas/requests?userId=${user.id}`)
        const data = await res.json()
        setRequests(data.requests || [])
      } catch (error) {
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [user])

  return (
    <div className="container mx-auto px-8 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Solicitudes de empresas</h1>
        <p className="text-gray-600 mt-1">
          Gestiona las solicitudes legales de las empresas asignadas
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Cargando...</div>
      ) : requests.length === 0 ? (
        <Card className="p-12 text-center">
          <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No tienes solicitudes asignadas
          </h3>
          <p className="text-gray-600">
            Cuando un administrador te asigne una solicitud de empresa, aparecerá aquí.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <Card key={request.id} className="p-5 hover:bg-gray-50 cursor-pointer transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-medium text-gray-900">{request.title}</h3>
                    <Badge
                      variant="secondary"
                      className={statusColors[request.status] || ''}
                    >
                      {REQUEST_STATUS_LABELS[request.status as keyof typeof REQUEST_STATUS_LABELS] || request.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">{request.description}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-4 h-4" />
                      {request.company?.name || 'Empresa'}
                    </span>
                    <span className="capitalize">{request.category}</span>
                    {request.priority === 'alta' || request.priority === 'urgente' ? (
                      <Badge variant="destructive" className="text-xs">{request.priority}</Badge>
                    ) : null}
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {new Date(request.created_at).toLocaleDateString('es-CL')}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 ml-4 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/lawyer/mensajes?request=${request.id}`)
                    }}
                  >
                    <MessageSquare className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => navigate(`/lawyer/empresas/solicitudes/${request.id}`)}
                  >
                    Ver detalle
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
