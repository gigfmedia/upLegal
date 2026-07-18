import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { Company } from '@/types/empresas'
import {
  FileText,
  User,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Star,
  Clock,
  Circle,
} from 'lucide-react'

interface ActivityEntry {
  id: string
  action: string
  entity_type: string | null
  entity_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  user_id: string | null
}

const actionConfig: Record<string, { icon: any; label: string; color: string }> = {
  request_created: { icon: FileText, label: 'Solicitud creada', color: 'text-blue-500' },
  request_assigned: { icon: User, label: 'Abogado asignado', color: 'text-yellow-500' },
  first_response: { icon: MessageSquare, label: 'Primera respuesta', color: 'text-green-500' },
  request_closed: { icon: CheckCircle2, label: 'Caso cerrado', color: 'text-green-600' },
  sla_breached: { icon: AlertCircle, label: 'SLA vencido', color: 'text-red-500' },
  sla_compliant: { icon: CheckCircle2, label: 'SLA cumplido', color: 'text-green-500' },
  rating_received: { icon: Star, label: 'Calificación recibida', color: 'text-yellow-500' },
}

export default function ActivityLog() {
  const { company } = useOutletContext<{ company: Company }>()
  const [entries, setEntries] = useState<ActivityEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<string>('')

  useEffect(() => {
    const load = async () => {
      try {
        const url = `/api/empresas/activity-log?companyId=${company.id}${filter ? `&action=${filter}` : ''}`
        const res = await fetch(url)
        const data = await res.json()
        setEntries(data.entries || [])
      } catch (error) {
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [company.id, filter])

  const actions = Object.keys(actionConfig)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Auditoría</h1>
          <p className="text-gray-600 mt-1">Registro de actividad de tu empresa</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter('')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            !filter ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Todas
        </button>
        {actions.map((a) => {
          const cfg = actionConfig[a]
          return (
            <button
              key={a}
              onClick={() => setFilter(a)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
                filter === a ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <cfg.icon className="w-3.5 h-3.5" />
              {cfg.label}
            </button>
          )
        })}
      </div>

      {/* Timeline */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="p-4"><Skeleton className="h-12" /></Card>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <Card className="p-12 text-center">
          <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Sin actividad registrada</h3>
          <p className="text-gray-600">Las acciones de tu empresa aparecerán aquí.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => {
            const cfg = actionConfig[entry.action] || { icon: Circle, label: entry.action.replace(/_/g, ' '), color: 'text-gray-400' }
            const Icon = cfg.icon
            return (
              <Card key={entry.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 ${cfg.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 capitalize">{cfg.label}</p>
                    {entry.metadata && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {Object.entries(entry.metadata).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                      </p>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 whitespace-nowrap">
                    {new Date(entry.created_at).toLocaleDateString('es-CL', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
