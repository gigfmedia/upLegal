import { useState, useEffect } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { Company, CompanyBudget } from '@/types/empresas'
import { getCompanyBudgets, approveBudget, rejectBudget } from '@/services/empresaService'
import { Receipt, Check, X, Eye, Clock, ChevronRight } from 'lucide-react'

const statusConfig: Record<string, { label: string; class: string }> = {
  pending: { label: 'Pendiente', class: 'bg-yellow-100 text-yellow-800' },
  approved: { label: 'Aprobado', class: 'bg-green-100 text-green-800' },
  rejected: { label: 'Rechazado', class: 'bg-red-100 text-red-800' },
  paid: { label: 'Pagado', class: 'bg-blue-100 text-blue-800' },
  cancelled: { label: 'Cancelado', class: 'bg-gray-100 text-gray-800' },
}

export default function Budgets() {
  const navigate = useNavigate()
  const { company } = useOutletContext<{ company: Company }>()
  const [budgets, setBudgets] = useState<CompanyBudget[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    getCompanyBudgets(company.id)
      .then(setBudgets)
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [company.id])

  const handleApprove = async (id: string) => {
    await approveBudget(id)
    setBudgets(prev => prev.map(b => b.id === id ? { ...b, status: 'approved', approved_at: new Date().toISOString() } : b))
  }

  const handleReject = async (id: string) => {
    const reason = prompt('Motivo del rechazo (opcional):')
    await rejectBudget(id, reason || undefined)
    setBudgets(prev => prev.map(b => b.id === id ? { ...b, status: 'rejected', rejected_at: new Date().toISOString(), rejection_reason: reason || null } : b))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Presupuestos</h1>
          <p className="text-gray-600 mt-1">Presupuestos de servicios adicionales</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Card key={i} className="p-6"><Skeleton className="h-16" /></Card>)}
        </div>
      ) : budgets.length === 0 ? (
        <Card className="p-12 text-center">
          <Receipt className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Sin presupuestos</h3>
          <p className="text-gray-500">Cuando una solicitud esté fuera de tu plan, se generará un presupuesto automáticamente.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {budgets.map((budget) => {
            const cfg = statusConfig[budget.status] || statusConfig.pending
            return (
              <Card key={budget.id} className="p-5 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => navigate(`/empresa/solicitudes/${budget.request_id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-medium text-gray-900">{budget.title}</h3>
                      <Badge variant="secondary" className={cfg.class}>{cfg.label}</Badge>
                    </div>
                    {budget.description && (
                      <p className="text-sm text-gray-600 line-clamp-1">{budget.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                      <span className="font-semibold text-gray-900">${budget.total_clp.toLocaleString('es-CL')}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(budget.created_at).toLocaleDateString('es-CL')}
                      </span>
                      {budget.created_by === 'auto' && <span className="text-xs text-gray-400">Generado automáticamente</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4 shrink-0">
                    {budget.status === 'pending' && (
                      <>
                        <Button size="sm" variant="outline" className="text-green-600 border-green-300 hover:bg-green-50"
                          onClick={(e) => { e.stopPropagation(); handleApprove(budget.id) }}>
                          <Check className="w-4 h-4 mr-1" />Aprobar
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50"
                          onClick={(e) => { e.stopPropagation(); handleReject(budget.id) }}>
                          <X className="w-4 h-4 mr-1" />Rechazar
                        </Button>
                      </>
                    )}
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); navigate(`/empresa/solicitudes/${budget.request_id}`) }}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {budget.items && budget.items.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    {budget.items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-sm py-1">
                        <span className="text-gray-600">{item.description} x{item.quantity}</span>
                        <span className="text-gray-900 font-medium">${item.total_clp.toLocaleString('es-CL')}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between text-sm pt-2 mt-1 border-t border-gray-100 font-semibold">
                      <span className="text-gray-900">Total</span>
                      <span className="text-gray-900">${budget.total_clp.toLocaleString('es-CL')}</span>
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
