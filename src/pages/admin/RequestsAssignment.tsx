import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabaseClient'
import { REQUEST_STATUS_LABELS } from '@/types/empresas'
import { UserPlus, FileText, Building2, RefreshCw, Clock } from 'lucide-react'
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
}

export default function RequestsAssignment() {
  const { user } = useAuth()
  const [requests, setRequests] = useState<any[]>([])
  const [lawyers, setLawyers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [assignDialog, setAssignDialog] = useState<{ open: boolean; requestId: string }>({ open: false, requestId: '' })
  const [selectedLawyer, setSelectedLawyer] = useState('')

  const loadRequests = async () => {
    try {
      const url = statusFilter
        ? `/api/admin/empresas/requests?status=${statusFilter}`
        : '/api/admin/empresas/requests'
      const res = await fetch(url)
      const data = await res.json()
      setRequests(data.requests || [])
    } catch (error) {
      console.error(error)
    }
  }

  const loadLawyers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, specialties')
      .eq('role', 'lawyer')
    setLawyers(data || [])
  }

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      await Promise.all([loadRequests(), loadLawyers()])
      setIsLoading(false)
    }
    load()
  }, [statusFilter])

  const handleAssign = async () => {
    if (!selectedLawyer || !assignDialog.requestId) return

    try {
      const res = await fetch(`/api/admin/empresas/requests/${assignDialog.requestId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lawyerId: selectedLawyer, assignedBy: user?.id }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Abogado asignado correctamente')
        setAssignDialog({ open: false, requestId: '' })
        setSelectedLawyer('')
        loadRequests()
      } else {
        toast.error(data.error || 'Error al asignar')
      }
    } catch (error) {
      toast.error('Error al asignar abogado')
    }
  }

  const handleStatusUpdate = async (requestId: string, newStatus: string) => {
    try {
      await fetch(`/api/admin/empresas/requests/${requestId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, userId: user?.id }),
      })
      toast.success('Estado actualizado')
      loadRequests()
    } catch (error) {
      toast.error('Error al actualizar estado')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Solicitudes de empresas</h1>
          <p className="text-gray-600 mt-1">Asigna abogados y gestiona las solicitudes</p>
        </div>
        <Button variant="outline" onClick={loadRequests}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualizar
        </Button>
      </div>

      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <option value="">Todas las solicitudes</option>
          {Object.entries(REQUEST_STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Cargando...</div>
      ) : requests.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay solicitudes pendientes</h3>
          <p className="text-gray-600">Todas las solicitudes han sido procesadas.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <Card key={request.id} className="p-5">
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
                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">{request.description}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-4 h-4" />
                      {request.company?.name || 'Empresa'}
                    </span>
                    <span className="capitalize">{request.category}</span>
                    {request.lawyer && (
                      <span className="flex items-center gap-1">
                        Asignado a: {request.lawyer.first_name} {request.lawyer.last_name}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {new Date(request.created_at).toLocaleDateString('es-CL')}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 ml-4 shrink-0">
                  {!request.lawyer_id && (
                    <Dialog open={assignDialog.open && assignDialog.requestId === request.id} onOpenChange={(open) => setAssignDialog({ open, requestId: open ? request.id : '' })}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" onClick={() => setAssignDialog({ open: true, requestId: request.id })}>
                          <UserPlus className="w-4 h-4 mr-1" />
                          Asignar
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Asignar abogado</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <Select value={selectedLawyer} onValueChange={setSelectedLawyer}>
                            <option value="">Selecciona un abogado</option>
                            {lawyers.map((lawyer) => (
                              <option key={lawyer.id} value={lawyer.id}>
                                {lawyer.first_name} {lawyer.last_name}
                              </option>
                            ))}
                          </Select>
                          <Button className="w-full" onClick={handleAssign} disabled={!selectedLawyer}>
                            Asignar
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                  {request.status !== 'finalizada' && request.status !== 'cancelada' && (
                    <Select
                      value=""
                      onValueChange={(val) => handleStatusUpdate(request.id, val)}
                    >
                      <option value="" disabled>Cambiar estado</option>
                      {Object.entries(REQUEST_STATUS_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </Select>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
