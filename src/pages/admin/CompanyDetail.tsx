import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { supabase } from '@/lib/supabaseClient'
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
import { COMPANY_STATUS_LABELS, REQUEST_STATUS_LABELS } from '@/types/empresas'
import { ArrowLeft, Building2, Mail, Phone, Calendar } from 'lucide-react'
import { toast } from 'sonner'

type CompanyDetail = {
  company: any
  subscription: any
  requests: any[]
  usage: any
  notes: any[]
  activityLog: any[]
}

export default function CompanyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<CompanyDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [newNote, setNewNote] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch(`/api/admin/empresas/${id}`, {
          headers: { 'Authorization': `Bearer ${session?.access_token || ''}` },
        })
        const data = await res.json()
        setDetail(data)
      } catch (error) {
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [id])

  const handleAddNote = async () => {
    if (!newNote.trim()) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token || ''}`,
      }
      await fetch(`/api/admin/empresas/${id}/notes`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ content: newNote, userId: session?.user?.id }),
      })
      setNewNote('')
      toast.success('Nota agregada')
      // Reload
      const res = await fetch(`/api/admin/empresas/${id}`, { headers })
      const data = await res.json()
      setDetail(data)
    } catch (error) {
      toast.error('Error al agregar nota')
    }
  }

  const handleStatusChange = async (status: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token || ''}`,
      }
      await fetch(`/api/admin/empresas/${id}/status`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status }),
      })
      toast.success('Estado actualizado')
      const res = await fetch(`/api/admin/empresas/${id}`, { headers })
      const data = await res.json()
      setDetail(data)
    } catch (error) {
      toast.error('Error al actualizar estado')
    }
  }

  if (isLoading) return <div className="text-center py-12 text-gray-500">Cargando...</div>
  if (!detail?.company) return <div className="text-center py-12">Empresa no encontrada</div>

  const { company, subscription, requests, usage, notes } = detail

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    trial: 'bg-blue-100 text-blue-800',
    past_due: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
    blocked: 'bg-red-100 text-red-800',
    paused: 'bg-yellow-100 text-yellow-800',
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <button
        onClick={() => navigate('/admin/empresas')}
        className="flex items-center text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Volver a empresas
      </button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center">
            <Building2 className="w-8 h-8 text-gray-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
            <p className="text-gray-600">{company.rut}</p>
            <div className="flex items-center gap-3 mt-2">
              <Badge variant="secondary" className={statusColors[company.status] || ''}>
                {COMPANY_STATUS_LABELS[company.status] || company.status}
              </Badge>
              {subscription && (
                <Badge variant="outline">
                  {subscription.plan?.name || 'Sin plan'}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <Select
          value={company.status}
          onValueChange={handleStatusChange}
        >
          {Object.entries(COMPANY_STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          {/* Subscription info */}
          {subscription && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Suscripción</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Plan</p>
                  <p className="font-medium">{subscription.plan?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Precio</p>
                  <p className="font-medium">${(subscription.plan?.price_clp || 0).toLocaleString('es-CL')}/mes</p>
                </div>
                <div>
                  <p className="text-gray-500">Estado</p>
                  <p className="font-medium capitalize">{subscription.status}</p>
                </div>
                <div>
                  <p className="text-gray-500">Próximo cobro</p>
                  <p className="font-medium">
                    {subscription.current_period_end
                      ? new Date(subscription.current_period_end).toLocaleDateString('es-CL')
                      : '-'}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Usage */}
          {usage && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Uso del período actual</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Consultas</p>
                  <p className="font-medium">{usage.consultations_used} / {usage.consultations_limit}</p>
                </div>
                <div>
                  <p className="text-gray-500">Revisiones</p>
                  <p className="font-medium">{usage.reviews_used} / {usage.reviews_limit}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Requests */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Solicitudes ({requests?.length || 0})
            </h2>
            <div className="space-y-2">
              {requests?.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                  onClick={() => navigate(`/admin/solicitudes/${req.id}`)}
                >
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{req.title}</p>
                    <p className="text-xs text-gray-500 capitalize">{req.category} · {new Date(req.created_at).toLocaleDateString('es-CL')}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {REQUEST_STATUS_LABELS[req.status as keyof typeof REQUEST_STATUS_LABELS] || req.status}
                  </Badge>
                </div>
              ))}
              {(!requests || requests.length === 0) && (
                <p className="text-sm text-gray-500">Sin solicitudes</p>
              )}
            </div>
          </Card>

          {/* Notes */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Notas internas</h2>
            <div className="space-y-3 mb-4">
              {notes?.map((note) => (
                <div key={note.id} className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">{note.content}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(note.created_at).toLocaleDateString('es-CL')}</p>
                </div>
              ))}
              {(!notes || notes.length === 0) && (
                <p className="text-sm text-gray-500">Sin notas</p>
              )}
            </div>
            <div className="flex gap-2">
              <Textarea
                placeholder="Agregar nota..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="text-sm"
              />
              <Button size="sm" onClick={handleAddNote}>Agregar</Button>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Contacto</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="w-4 h-4 text-gray-400" />
                <span>{company.contact_name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-gray-400" />
                <a href={`mailto:${company.contact_email}`} className="text-gray-900 hover:underline">{company.contact_email}</a>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-gray-400" />
                <span>{company.contact_phone || '-'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span>Registrada: {new Date(company.created_at).toLocaleDateString('es-CL')}</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Industria</h3>
            <p className="text-gray-900">{company.industry || 'No especificada'}</p>
            <p className="text-sm text-gray-500 mt-1">{company.employee_count || '0'} trabajadores</p>
          </Card>

          {subscription?.mercadopago_preapproval_id && (
            <Card className="p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-3">Mercado Pago</h3>
              <p className="text-xs text-gray-600 break-all">
                Preapproval ID: {subscription.mercadopago_preapproval_id}
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
