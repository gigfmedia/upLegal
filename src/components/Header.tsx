import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Scale, User, LogOut, Eye, ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext/clean/useAuth";
import { useNavigate } from "react-router-dom";
import { NotificationDropdown } from "./NotificationDropdown";
import { supabase } from "@/lib/supabaseClient";
import { AuthModal } from "./AuthModal";

interface HeaderProps {
  onAuthClick?: (mode: 'login' | 'signup') => void;
}

export default function Header({ onAuthClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  useEffect(() => {
    const getUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserRole(user.user_metadata?.role || 'client');
        }
      } catch (error) {
        console.error('Error getting user role:', error);
      }
    };

    if (user) {
      getUserRole();
    }
  }, [user]);

  const handleNavigation = (path: string) => {
    navigate(path);
    const dropdown = document.querySelector('[data-radix-popper-content-wrapper]');
    if (dropdown) {
      dropdown.removeAttribute('data-state');
    }
  };

  const handleAuthNavigation = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  return (
    <div className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 z-50 h-16 flex items-center px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-7xl mx-auto">
        <div className="flex justify-between items-center h-full">
          {/* Logo */}
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => handleNavigation('/')}>
            <Scale className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">LegalUp</span>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
          <button 
              onClick={() => handleNavigation('/search')} 
              className="text-gray-600 hover:text-blue-600 transition-colors"
            >
              Explorar Servicios
            </button>
            <button 
              onClick={() => handleNavigation('/how-it-works')} 
              className="text-gray-600 hover:text-blue-600 transition-colors"
            >
              Cómo Funciona
            </button>
            <button 
              onClick={() => handleNavigation('/pricing')} 
              className="text-gray-600 hover:text-blue-600 transition-colors"
            >
              Acerca de
            </button>
          </nav>

          {/* Auth Section */}
          <div className="flex items-center gap-2 h-full">
            {/* Notifications temporarily hidden
            {user && (
              <div className="flex items-center h-full px-1">
                <NotificationDropdown />
              </div>
            )}
            */}
            {user ? (
              <div className="flex items-center h-full px-1">
                <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className="h-10 w-10 p-0 rounded-full relative hover:bg-gray-100 transition-colors"
                    >
                      <Avatar className="h-10 w-10 bg-blue-100 text-blue-700">
                        <AvatarImage 
                          src={user.user_metadata?.avatar_url} 
                          alt={user.user_metadata?.name || 'User'} 
                          className="object-cover"
                        />
                        <AvatarFallback className="bg-blue-100 text-blue-700 font-medium">
                          {user.user_metadata?.name 
                            ? user.user_metadata.name.split(' ').map(n => n[0]).join('').toUpperCase()
                            : user.email?.charAt(0).toUpperCase() || 'U'
                          }
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    className="w-56 mt-1" 
                    align="end"
                    sideOffset={8}
                  >
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">
                            {user.user_metadata?.name || user.email?.split('@')[0] || 'Usuario'}
                          </p>
                          <p className="text-xs leading-none text-muted-foreground truncate max-w-[200px]">
                            {user.email}
                          </p>
                          <Badge 
                            variant={userRole === 'lawyer' ? 'default' : 'secondary'}
                            className="w-fit text-xs mt-1"
                          >
                            {userRole === 'lawyer' ? 'Abogado' : 'Cliente'}
                          </Badge>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuItem 
                        onSelect={(e) => {
                          e.preventDefault();
                          const path = userRole === 'lawyer' ? '/lawyer-dashboard' : '/dashboard';
                          handleNavigation(path);
                        }}
                      >
                        <User className="mr-2 h-4 w-4" />
                        <span>{userRole === 'lawyer' ? 'Panel de Abogado' : 'Panel de Cliente'}</span>
                      </DropdownMenuItem>

                      {userRole === 'lawyer' && (
                        <>
                          <DropdownMenuItem 
                            onSelect={(e) => {
                              e.preventDefault();
                              handleNavigation(`/lawyer/${user.id}`);
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            <span>Ver Perfil</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      <DropdownMenuItem 
                        className="text-red-600 focus:text-red-700 focus:bg-red-50"
                        onClick={async () => {
                          try {
                            await logout();
                            navigate('/');
                          } catch (error) {
                            console.error('Error during logout:', error);
                          }
                        }}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Cerrar Sesión</span>
                      </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="flex items-center space-x-3 h-16">
                <Button 
                  variant="ghost" 
                  onClick={() => handleAuthNavigation('login')}
                  className="text-gray-600"
                >
                  Iniciar Sesión
                </Button>
                <Button 
                  onClick={() => handleAuthNavigation('signup')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Registrarse
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)}
        mode={authMode}
        onModeChange={setAuthMode}
      />
    </div>
  );
}
