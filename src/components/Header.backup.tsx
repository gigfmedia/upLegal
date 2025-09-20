
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Scale, User, Settings, LogOut, Bell, Eye } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext/clean/useAuth";
import { useNavigate } from "react-router-dom";
import { NotificationDropdown } from "./NotificationDropdown";
import { supabase } from "@/lib/supabaseClient";

interface HeaderProps {
  onAuthClick?: (mode: 'login' | 'signup') => void;
}

export default function Header({ onAuthClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
    setIsDropdownOpen(true);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsDropdownOpen(false);
    }, 200);
  };

  const handleDropdownMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
  };

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
    // Close the dropdown after navigation
    const dropdown = document.querySelector('[data-radix-popper-content-wrapper]');
    if (dropdown) {
      dropdown.removeAttribute('data-state');
    }
  };

  const handleAuthNavigation = (mode: 'login' | 'signup') => {
    if (onAuthClick) {
      onAuthClick(mode);
    } else {
      navigate(`/${mode}`);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 z-50 h-16 flex items-center">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
              Encontrar Abogados
            </button>
            <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors">
              Recursos Legales
            </a>
            <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors">
              Acerca de
            </a>
          </nav>

          {/* Auth Section */}
          <div className="flex items-center gap-2 h-full">
            {user && (
              <div className="flex items-center h-full px-1">
                <NotificationDropdown />
              </div>
            )}
            {user ? (
              <div className="flex items-center h-full px-1">
                <div className="relative">
                  <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                    <div 
                      className="inline-block"
                      onMouseEnter={handleMouseEnter}
                      onMouseLeave={handleMouseLeave}
                      ref={dropdownRef}
                    >
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          className="h-10 w-10 p-0 rounded-full relative hover:bg-gray-100 transition-colors"
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={user.user_metadata?.avatar_url || "/placeholder.svg"} alt={user.user_metadata?.name || 'User'} />
                            <AvatarFallback className="bg-blue-600 text-white text-lg font-semibold">
                              {user.user_metadata?.name?.charAt(0)?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                        </Button>
                      </DropdownMenuTrigger>
                    </div>
                    <DropdownMenuContent 
                      className="w-56 mt-1" 
                      align="end"
                      onMouseEnter={handleDropdownMouseEnter}
                      onMouseLeave={handleMouseLeave}
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
                    
                    {/* Dashboard Link - Dynamic based on user role */}
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

                    {/* Public Profile Link */}
                    <DropdownMenuItem 
                      onSelect={(e) => {
                        e.preventDefault();
                        window.open(`/abogado/${user.id}`, '_blank');
                      }}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      <span>Ver Perfil Público</span>
                    </DropdownMenuItem>

                    {/* Profile Link - Only for lawyers */}
                    {userRole === 'lawyer' && (
                      <DropdownMenuItem 
                        onSelect={(e) => {
                          e.preventDefault();
                          handleNavigation('/lawyer-dashboard/profile');
                        }}
                      >
                        <User className="mr-2 h-4 w-4" />
                        <span>Perfil</span>
                      </DropdownMenuItem>
                    )}
                    
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-red-600 focus:text-red-700 focus:bg-red-50"
                      onSelect={async (e) => {
                        e.preventDefault();
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
    </header>
  );
}
