import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { supabase } from '@/lib/supabaseClient'
import type { Company } from '@/types/empresas'
import {
  Menu,
  ChevronDown,
  Bell,
  Search,
  HelpCircle,
  Building2,
  Settings,
  Receipt,
  LogOut,
  CheckCheck,
  Clock,
  User,
  MessageSquare,
  AlertCircle,
} from 'lucide-react'

const pageTitles: Record<string, string> = {
  '/empresa': 'Inicio',
  '/empresa/solicitudes': 'Mis solicitudes',
  '/empresa/solicitudes/nueva': 'Nueva solicitud',
  '/empresa/centro-legal': 'Centro Legal',
  '/empresa/presupuestos': 'Presupuestos',
  '/empresa/abogados': 'Mis abogados',
  '/empresa/servicios': 'Servicios',
  '/empresa/auditoria': 'Auditoría',
  '/empresa/facturacion': 'Facturación',
  '/empresa/configuracion': 'Configuración',
}

interface EmpresaHeaderProps {
  company: Company
  onMenuClick: () => void
  onLogout: () => void
}

interface NotificationItem {
  id: string
  title: string
  message: string | null
  type: string
  is_read: boolean
  entity_type: string | null
  entity_id: string | null
  created_at: string
}

export default function EmpresaHeader({ company, onMenuClick, onLogout }: EmpresaHeaderProps) {
  const location = useLocation()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isNotifOpen, setIsNotifOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [notifLoading, setNotifLoading] = useState(false)
  const notifInitialLoad = useRef(true)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchNotifications = async () => {
    const isInitial = notifInitialLoad.current
    if (isInitial) setNotifLoading(true)
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) {
        console.warn('[Notif] No session token')
        return
      }
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        console.warn('[Notif] Response not OK:', res.status)
        return
      }
      const data = await res.json()
      setNotifications(data.notifications || [])
      notifInitialLoad.current = false
    } catch (e) {
      console.error('[Notif] Error:', e)
    } finally {
      if (isInitial) setNotifLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    const onFocus = () => { fetchNotifications() }
    window.addEventListener('focus', onFocus)
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  const handleBellClick = () => {
    setIsNotifOpen(!isNotifOpen)
    fetchNotifications()
  }

  const markAsRead = async (id: string) => {
    const token = (await supabase.auth.getSession()).data.session?.access_token
    if (token) {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
    }
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    )
  }

  const markAllAsRead = async () => {
    const token = (await supabase.auth.getSession()).data.session?.access_token
    if (token) {
      await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
  }

  const currentPage = pageTitles[location.pathname]
    || (location.pathname.startsWith('/empresa/solicitudes/') ? 'Detalle solicitud' : 'LegalUp Empresas')

  const initials = company.contact_name
    ? company.contact_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'EM'

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const notifIcon = (type: string) => {
    switch (type) {
      case 'case_assigned': return <User className="w-4 h-4 text-yellow-500" />
      case 'sla_breached': return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'first_response': return <MessageSquare className="w-4 h-4 text-green-500" />
      default: return <Bell className="w-4 h-4 text-gray-400" />
    }
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="hidden lg:flex items-center gap-2 text-sm">
          <Building2 className="w-5 h-5 text-gray-400" />
          <span className="font-medium text-gray-700 uppercase">{company.name}</span>
        </div>
        <div className="hidden sm:block h-5 w-px bg-gray-200 mx-1" />
        <h1 className="text-base font-semibold text-gray-900">{currentPage}</h1>
      </div>

      <div className="flex items-center gap-1">
        <div className="relative" ref={notifRef}>
          <button
            onClick={handleBellClick}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 relative"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white px-[3px] leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50 max-h-96 flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900">Notificaciones</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1"
                  >
                    <CheckCheck className="w-3 h-3" />
                    Marcar todas
                  </button>
                )}
              </div>
              <div className="overflow-y-auto flex-1">
                {notifLoading ? (
                  <div className="p-4 text-center text-sm text-gray-500">Cargando...</div>
                ) : notifications.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500">Sin notificaciones</div>
                ) : (
                  notifications.slice(0, 20).map((n) => (
                    <Link
                      key={n.id}
                      to={n.entity_type === 'request' && n.entity_id ? `/empresa/solicitudes/${n.entity_id}` : '#'}
                      onClick={() => markAsRead(n.id)}
                      className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                        !n.is_read ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <div className="mt-0.5">{notifIcon(n.type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate uppercase">{n.title}</p>
                        {n.message && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                        )}
                        <p className="text-[10px] text-gray-400 mt-1">
                          {new Date(n.created_at).toLocaleDateString('es-CL', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      </div>
                      {!n.is_read && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                      )}
                    </Link>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 ml-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-green-900 text-green-600 text-xs font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden lg:block text-left">
              <p className="text-sm font-medium text-gray-900 leading-tight">{company.contact_name}</p>
              <p className="text-xs text-gray-500 leading-tight truncate max-w-[120px]">{company.name}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400 hidden lg:block" />
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900">{company.contact_name}</p>
                <p className="text-xs text-gray-500">{company.contact_email}</p>
              </div>
              <Link
                to="/empresa/configuracion"
                onClick={() => setIsProfileOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Settings className="w-4 h-4" />
                Configuración
              </Link>
              <Link
                to="/empresa/facturacion"
                onClick={() => setIsProfileOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Receipt className="w-4 h-4" />
                Facturación
              </Link>
              <div className="border-t border-gray-100 mt-1 pt-1">
                <button
                  onClick={onLogout}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 w-full"
                >
                  <LogOut className="w-4 h-4" />
                  Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
