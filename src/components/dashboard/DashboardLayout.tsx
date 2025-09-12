import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { 
  Activity, 
  Calendar, 
  FileText, 
  Settings, 
  User, 
  Users, 
  CreditCard,
  MessageSquare,
  MessageCircle,
  Menu,
  X,
  TrendingUp,
  LogOut
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';

function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Different navigation items based on user role
  const getNavItems = () => {
    const commonItems = [
      { href: '/dashboard', icon: Activity, label: 'Resumen' },
      { href: '/dashboard/consultations', icon: MessageSquare, label: 'Consultas' },
      { href: '/dashboard/messages', icon: MessageCircle, label: 'Mensajes' },
      { href: '/dashboard/appointments', icon: Calendar, label: 'Citas' },
      { href: '/dashboard/profile', icon: User, label: 'Perfil' },
    ];

    if (user?.role === 'lawyer') {
      return [
        ...commonItems,
        { href: '/dashboard/services', icon: FileText, label: 'Servicios' },
        { href: '/dashboard/clients', icon: Users, label: 'Clientes' },
        { href: '/dashboard/earnings', icon: TrendingUp, label: 'Ingresos' },
      ];
    } else {
      return [
        ...commonItems,
        { href: '/dashboard/payments', icon: CreditCard, label: 'Pagos' },
      ];
    }
  };

  const navItems = getNavItems();

  const handleAuthClick = (mode: 'login' | 'signup') => {
    // This won't be used in dashboard since user is already authenticated
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header onAuthClick={handleAuthClick} />
      
      <div className="flex-1 pt-16 bg-white">
        <div className="w-full h-full">
          {/* Mobile header */}
          <div className="lg:hidden flex items-center justify-between bg-white border-b border-gray-200 p-4 fixed top-16 left-0 right-0 z-40">
            <div className="flex items-center">
              <span className="font-medium">
                {user?.role === 'lawyer' ? 'Panel de Abogado' : 'Panel de Cliente'}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden"
            >
              {isSidebarOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
              <span className="sr-only">Toggle sidebar</span>
            </Button>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex">
              {/* Fixed Sidebar */}
              <aside
                className={`sticky top-16 h-[calc(100vh-64px)] z-30 w-64 bg-white border-r border-gray-200 flex flex-col ${
                  isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                } transition-transform duration-200 ease-in-out`}
              >
                <div className="flex-1 overflow-y-auto">
                  {/* Main Navigation */}
                  <nav className="py-4">
                    <ul className="px-3 space-y-1">
                      {navItems.map((item) => (
                        <li key={item.href}>
                          <Link
                            to={item.href}
                            className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                              location.pathname === item.href
                                ? 'bg-blue-50 text-blue-700'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                            onClick={() => setIsSidebarOpen(false)}
                          >
                            <item.icon
                              className={`mr-3 h-5 w-5 ${
                                location.pathname === item.href
                                  ? 'text-blue-500'
                                  : 'text-gray-400 group-hover:text-gray-500'
                              }`}
                              aria-hidden="true"
                            />
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </nav>
                </div>

                {/* Bottom Section */}
                <div className="border-t border-gray-200">
                  <ul className="px-3 py-2 space-y-1">
                    <li>
                      <Link
                        to="/dashboard/settings"
                        className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                          location.pathname === '/dashboard/settings'
                            ? 'bg-gray-100 text-gray-900'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                        onClick={() => setIsSidebarOpen(false)}
                      >
                        <Settings className="mr-3 h-5 w-5 text-gray-400" />
                        Configuración
                      </Link>
                    </li>
                    <li>
                      <button
                        type="button"
                        onClick={() => {
                          logout();
                          navigate('/');
                        }}
                        className="flex w-full items-center px-3 py-2 text-sm font-medium text-red-600 rounded-md hover:bg-red-50"
                      >
                        <LogOut className="mr-3 h-5 w-5" />
                        Cerrar Sesión
                      </button>
                    </li>
                  </ul>
                </div>
              </aside>

              {/* Overlay for mobile */}
              {isSidebarOpen && (
                <div
                  className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
                  onClick={() => setIsSidebarOpen(false)}
                />
              )}

              {/* Main content */}
              <main className="flex-1 bg-white min-h-[calc(100vh-64px)]">
                <div className="py-6">
                  <div className="px-4 sm:px-6">
                    <Outlet />
                  </div>
                </div>
              </main>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardLayout;
