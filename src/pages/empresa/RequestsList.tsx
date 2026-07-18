import { useState, useEffect } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { getCompanyRequests } from '@/services/empresaService'
import type { Company, CompanyRequest } from '@/types/empresas'
import { REQUEST_STATUS_LABELS, REQUEST_CATEGORIES } from '@/types/empresas'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Plus, Search, FileText, Clock } from 'lucide-react'

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

export default function RequestsList() {
  const navigate = useNavigate()
  const { company } = useOutletContext<{ company: Company }>()
  const [requests, setRequests] = useState<CompanyRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getCompanyRequests(company.id)
        setRequests(data)
      } catch (error) {
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [company.id])

  const filtered = requests.filter((r) => {
    if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !r.description.toLowerCase().includes(search.toLowerCase())) return false
    if (statusFilter && r.status !== statusFilter) return false
    if (categoryFilter && r.category !== categoryFilter) return false
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis solicitudes</h1>
          <p className="text-gray-600 mt-1">
            {requests.length} solicitudes en total
          </p>
        </div>
        <Button onClick={() => navigate('/empresa/solicitudes/nueva')}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva solicitud
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar solicitudes..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Todos los estados" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(REQUEST_STATUS_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Todas las categorías" />
          </SelectTrigger>
          <SelectContent>
            {REQUEST_CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Cargando...</div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {requests.length === 0 ? 'No tienes solicitudes' : 'No se encontraron resultados'}
          </h3>
          <p className="text-gray-600 mb-6">
            {requests.length === 0
              ? 'Crea tu primera solicitud legal para comenzar.'
              : 'Intenta con otros filtros.'}
          </p>
          {requests.length === 0 && (
            <Button onClick={() => navigate('/empresa/solicitudes/nueva')}>
              <Plus className="w-4 h-4 mr-2" />
              Crear solicitud
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((request) => (
            <Card
              key={request.id}
              className="p-5 hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => navigate(`/empresa/solicitudes/${request.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-medium text-gray-900 truncate">{request.title}</h3>
                    {request.is_out_of_plan && (
                      <Badge variant="outline" className="text-xs shrink-0">
                        Fuera del plan
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">{request.description}</p>
                  <div className="flex items-center gap-3 mt-3">
                    <Badge
                      variant="secondary"
                      className={statusColors[request.status] || ''}
                    >
                      {REQUEST_STATUS_LABELS[request.status] || request.status}
                    </Badge>
                    <span className="text-xs text-gray-500 capitalize">{request.category}</span>
                    {request.priority === 'alta' || request.priority === 'urgente' ? (
                      <Badge variant="destructive" className="text-xs">
                        {request.priority}
                      </Badge>
                    ) : null}
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(request.created_at).toLocaleDateString('es-CL')}
                    </span>
                  </div>
                </div>
                {request.lawyer && (
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={request.lawyer.avatar_url || undefined} />
                      <AvatarFallback className="bg-gray-200 text-gray-600 text-xs font-medium">
                        {request.lawyer.first_name?.[0]}{request.lawyer.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xs text-gray-500">Abogado</p>
                      <p className="text-sm font-medium text-gray-900">
                        {request.lawyer.first_name} {request.lawyer.last_name}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
