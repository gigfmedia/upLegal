import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  Calendar, 
  FileText, 
  Settings, 
  User, 
  CreditCard,
  MessageSquare,
  MessageCircle,
  Menu,
  X,
  TrendingUp,
  LogOut,
  Heart
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';
import { supabase } from '@/lib/supabaseClient';
import Header from '@/components/Header';

type NavItem = {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  exact?: boolean;
};

type UserRole = 'lawyer' | 'client' | undefined;

function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isLoading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('client');
  
  // Get user role safely
  const getUserRole = (): UserRole => {
    if (location.pathname.startsWith('/lawyer')) {
      return 'lawyer';
    }
    if (user?.user_metadata?.role) {
      return user.user_metadata.role as UserRole;
    }
    if (user?.role) {
      return user.role as UserRole;
    }
    return 'client';
  };

  // Update user role when location or user changes
  useEffect(() => {
    setUserRole(getUserRole());
  }, [location.pathname, user]);

  // Check authentication and profile setup
  useEffect(() => {
    const checkAuthAndProfile = async () => {
      if (isLoading) return;
      
      if (!user) {
        navigate('/login');
        return;
      }
      
      // Skip profile check if already on setup page
      if (location.pathname === '/dashboard/profile/setup') return;
      
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('first_name')
          .eq('user_id', user.id)
          .single();
          
        // If profile doesn't exist or is not fully set up, redirect to setup
        if (error || !profile?.first_name) {
          navigate('/dashboard/profile/setup');
        }
      } catch (error) {
        console.error('Error checking profile:', error);
      }
    };
    
    checkAuthAndProfile();
  }, [user, isLoading, navigate, location.pathname]);
  
  // Client navigation items
  const clientNavItems: NavItem[] = [
    { href: '/dashboard', icon: Activity, label: 'Resumen' },
    { href: '/dashboard/consultations', icon: MessageSquare, label: 'Consultas' },
    { href: '/dashboard/appointments', icon: Calendar, label: 'Citas' },
    { href: '/dashboard/favorites', icon: Heart, label: 'Favoritos' },
    { href: '/dashboard/payments', icon: CreditCard, label: 'Pagos' },
    { href: '/dashboard/messages', icon: MessageCircle, label: 'Mensajes' },
    { href: '/dashboard/profile', icon: User, label: 'Perfil' }
  ];

  // Common navigation items
  const commonItems: NavItem[] = [
    { 
      href: '/dashboard/payment-settings', 
      icon: CreditCard, 
      label: 'Configuración de Pagos',
      exact: true 
    }
  ];

  // Get navigation items based on user role
  const getNavItems = (): NavItem[] => {

    if (userRole === 'lawyer') {
      return [
        { href: '/lawyer/dashboard', icon: Activity, label: 'Inicio' },
        { href: '/lawyer/profile', icon: User, label: 'Perfil' },
        { href: '/lawyer/services', icon: FileText, label: 'Servicios' },
        { href: '/lawyer/consultas', icon: MessageSquare, label: 'Consultas' },
        { href: '/lawyer/citas', icon: Calendar, label: 'Citas' },
        { href: '/lawyer/favorites', icon: Heart, label: 'Favoritos' },
        { href: '/lawyer/earnings', icon: TrendingUp, label: 'Ingresos' },
        ...commonItems
      ];
    }

    return [
      ...clientNavItems,
      ...commonItems
    ];
  };

  const currentPath = location.pathname;
  const navItems = getNavItems();

  // Check if a navigation item is active
  const isActive = (href: string, exact: boolean = false): boolean => {
    return exact ? currentPath === href : currentPath.startsWith(href);
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header onAuthClick={() => {}} />
      
      <div className="flex-1 pt-16">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between bg-white border-b border-gray-200 p-4 fixed top-16 left-0 right-0 z-40">
          <div className="flex items-center">
            <span className="font-medium">
              {userRole === 'lawyer' ? 'Panel de Abogado' : 'Panel de Cliente'}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="lg:hidden"
            aria-label={isSidebarOpen ? 'Cerrar menú' : 'Abrir menú'}
          >
            {isSidebarOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="flex">
            {/* Sidebar */}
            <aside
              className={`fixed lg:sticky top-16 h-[calc(100vh-64px)] z-30 w-64 bg-white border-r border-gray-200 flex flex-col ${
                isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
              } lg:translate-x-0 transition-transform duration-200 ease-in-out`}
            >
              <div className="flex-1 overflow-y-auto py-4">
                <nav>
                  <ul className="space-y-1 px-3">
                    {navItems.map(({ href, icon: Icon, label, exact }) => (
                      <li key={href}>
                        <Link
                          to={href}
                          className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                            isActive(href, exact)
                              ? 'bg-blue-50 text-blue-700'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                          onClick={() => setIsSidebarOpen(false)}
                        >
                          <Icon
                            className={`mr-3 h-5 w-5 ${
                              isActive(href, exact)
                                ? 'text-blue-500'
                                : 'text-gray-400 group-hover:text-gray-500'
                            }`}
                            aria-hidden="true"
                          />
                          {label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>

              {/* Bottom section */}
              <div className="border-t border-gray-200 p-4">
                <ul className="space-y-1">
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
                      onClick={handleLogout}
                      className="flex w-full items-center px-3 py-2 text-sm font-medium text-red-600 rounded-md hover:bg-red-50"
                    >
                      <LogOut className="mr-3 h-5 w-5" />
                      Cerrar Sesión
                    </button>
                  </li>
                </ul>
              </div>
            </aside>

            {/* Mobile overlay */}
            {isSidebarOpen && (
              <div
                className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
                onClick={() => setIsSidebarOpen(false)}
                aria-hidden="true"
              />
            )}

            {/* Main content */}
            <main className="flex-1 w-full bg-white">
              <div className="py-6">
                <div>
                  <Outlet />
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardLayout;
