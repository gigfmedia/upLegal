import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getCompanyMetrics, getAllCompanies } from '@/services/empresaService'
import type { Company, CompanyMetrics } from '@/types/empresas'
import { COMPANY_STATUS_LABELS } from '@/types/empresas'
import { Building2, Search, TrendingUp, DollarSign, Users, ArrowRight } from 'lucide-react'

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  trial: 'bg-blue-100 text-blue-800',
  past_due: 'bg-red-100 text-red-800',
  paused: 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-gray-100 text-gray-800',
  blocked: 'bg-red-100 text-red-800',
}

export default function EmpresasPage() {
  const navigate = useNavigate()
  const [companies, setCompanies] = useState<Company[]>([])
  const [metrics, setMetrics] = useState<CompanyMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const [companiesData, metricsData] = await Promise.all([
          getAllCompanies(),
          getCompanyMetrics(),
        ])
        setCompanies(companiesData)
        setMetrics(metricsData as CompanyMetrics)
      } catch (error) {
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const filtered = companies.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.rut.includes(search)) return false
    if (statusFilter && c.status !== statusFilter) return false
    return true
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Empresas</h1>
        <p className="text-gray-600 mt-1">Gestiona las empresas registradas en LegalUp Empresas</p>
      </div>

      {/* Metrics cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{metrics.active_companies}</p>
            <p className="text-sm text-gray-600">Empresas activas</p>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              ${(metrics.mrr || 0).toLocaleString('es-CL')}
            </p>
            <p className="text-sm text-gray-600">MRR</p>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              ${(metrics.arr || 0).toLocaleString('es-CL')}
            </p>
            <p className="text-sm text-gray-600">ARR</p>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{metrics.total_requests || 0}</p>
            <p className="text-sm text-gray-600">Solicitudes totales</p>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar empresas..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <option value="">Todos los estados</option>
          {Object.entries(COMPANY_STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </Select>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>RUT</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Industria</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha registro</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">Cargando...</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  No se encontraron empresas
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((company) => (
                <TableRow
                  key={company.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => navigate(`/admin/empresas/${company.id}`)}
                >
                  <TableCell className="font-medium text-gray-900">{company.name}</TableCell>
                  <TableCell className="text-gray-600">{company.rut}</TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm text-gray-900">{company.contact_name}</p>
                      <p className="text-xs text-gray-500">{company.contact_email}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-600">{company.industry || '-'}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={statusColors[company.status] || ''}
                    >
                      {COMPANY_STATUS_LABELS[company.status] || company.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-600 text-sm">
                    {new Date(company.created_at).toLocaleDateString('es-CL')}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
