import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { getCompany } from '@/services/empresaService'
import EmpresaHeader from '@/components/empresa/EmpresaHeader'
import type { Company } from '@/types/empresas'
import {
  LayoutDashboard,
  FileText,
  FolderOpen,
  Library,
  Receipt,
  Settings,
  Users,
  Plus,
  LogOut,
  Building2,
  Scale,
  Clock,
} from 'lucide-react'

const navigation = [
  { href: '/empresa', icon: LayoutDashboard, label: 'Inicio', exact: true },
  { href: '/empresa/solicitudes', icon: FileText, label: 'Mis solicitudes' },
  { href: '/empresa/centro-legal', icon: Library, label: 'Centro Legal' },
  { href: '/empresa/presupuestos', icon: Receipt, label: 'Presupuestos' },
  { href: '/empresa/abogados', icon: Users, label: 'Mis abogados' },
  { href: '/empresa/auditoria', icon: Clock, label: 'Auditoría' },
  { href: '/empresa/facturacion', icon: Receipt, label: 'Facturación' },
  { href: '/empresa/configuracion', icon: Settings, label: 'Configuración' },
]

export default function EmpresaLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [company, setCompany] = useState<Company | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadCompany = async () => {
      if (!user) return
      try {
        const data = await getCompany(user.id)
        setCompany(data)
      } catch (error) {
        console.error('Error loading company:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadCompany()
  }, [user])

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return location.pathname === href
    return location.pathname.startsWith(href)
  }

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  if (isLoading) return null

  return (
    <div className="min-h-screen bg-cream-900 flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out overflow-hidden ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          <div className="h-16 flex items-center px-5 border-b border-gray-200 shrink-0">
            <Link to="/empresa" className="flex items-center gap-2.5">
              <Scale className="h-7 w-7 text-green-900 cursor-pointer" />
              <span className="text-xl font-bold text-green-900 cursor-pointer">LegalUp</span>
              <span className="text-[10px] bg-green-900 text-white px-1 py-0.5 rounded ml-1 align-middle">Business</span>
            </Link>
          </div>

          {company && (
            <div className="px-5 py-3 border-b border-gray-100 shrink-0">
              <p className="text-sm font-medium text-gray-900 truncate">{company.name}</p>
              <p className="text-xs text-gray-500">{company.rut}</p>
            </div>
          )}

          <nav className="flex-1 min-h-0 px-3 py-4 space-y-0.5 overflow-y-auto">
            {navigation.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.href, item.exact)
                    ? 'bg-gray-300 text-gray-900'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="px-3 py-4 border-t border-gray-200 shrink-0">
            <Button
              className="w-full bg-gray-900 hover:bg-gray-800"
              onClick={() => {
                navigate('/empresa/solicitudes/nueva')
                setIsSidebarOpen(false)
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nueva solicitud
            </Button>
          </div>

          <div className="px-3 py-3 border-t border-gray-200 shrink-0">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 w-full transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        {company && (
          <EmpresaHeader
            company={company}
            onMenuClick={() => setIsSidebarOpen(true)}
            onLogout={handleLogout}
          />
        )}

        <main className="flex-1 p-6 lg:p-8 pb-12">
          {company ? (
            <Outlet context={{ company }} />
          ) : (
            <div className="text-center py-20">
              <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No hay empresa registrada</h2>
              <p className="text-gray-500 mb-6">Debes registrar tu empresa para acceder al dashboard.</p>
              <Button onClick={() => navigate('/empresa/registro')}>Registrar empresa</Button>
            </div>
          )}
        </main>
        <p className="text-xs text-gray-400 text-right pr-6 lg:pr-8 pb-4">
          &copy; 2026 LegalUp. Todos los derechos reservados.
        </p>
      </div>

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  )
}
