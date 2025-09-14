
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Scale, User, Settings, LogOut, PlusCircle, Bell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext/clean/useAuth";
import { useNavigate } from "react-router-dom";
import { NotificationDropdown } from "./NotificationDropdown";

// Custom Dropdown component with hover functionality
const HoverDropdown = ({ children, content, align = "end" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 200); // Small delay to prevent flickering when moving to dropdown
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div 
      className="relative inline-block" 
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      ref={dropdownRef}
    >
      <div>{children}</div>
      {isOpen && (
        <div 
          className="absolute right-0 z-50 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {content}
        </div>
      )}
    </div>
  );
};

interface HeaderProps {
  onAuthClick?: (mode: 'login' | 'signup') => void;
}

export default function Header({ onAuthClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const handleAuthNavigation = (mode: 'login' | 'signup') => {
    if (onAuthClick) {
      onAuthClick(mode);
    } else {
      navigate(`/${mode}`);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => handleNavigation('/')}>
            <Scale className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">UpLegal</span>
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
          <div className="flex items-center gap-3">
            {user && (
              <div className="flex items-center justify-center h-10 w-10 -mt-0.5">
                <NotificationDropdown />
              </div>
            )}
            {user ? (
              <div className="flex items-center">
                <HoverDropdown
                  content={
                    <div className="py-1">
                      <div className="flex items-center justify-start gap-2 p-2">
                        <div className="flex flex-col space-y-1 leading-none">
                          <p className="font-medium">{user.user_metadata?.name || user.email?.split('@')[0] || 'Usuario'}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                          <Badge variant="secondary" className="w-fit text-xs">
                            {user.user_metadata?.role === 'lawyer' ? 'Abogado' : 'Cliente'}
                          </Badge>
                        </div>
                      </div>
                      <div 
                        className="px-2 py-1.5 text-sm rounded-md hover:bg-gray-100 cursor-pointer flex items-center"
                        onClick={() => handleNavigation('/dashboard')}
                      >
                        <User className="mr-2 h-4 w-4" />
                        Dashboard
                      </div>
                      {user.role === 'lawyer' && (
                        <div 
                          className="px-2 py-1.5 text-sm rounded-md hover:bg-gray-100 cursor-pointer flex items-center"
                          onClick={() => handleNavigation('/profile')}
                        >
                          <User className="mr-2 h-4 w-4" />
                          Perfil
                        </div>
                      )}
                      {user.role === 'lawyer' && (
                        <div 
                          className="px-2 py-1.5 text-sm rounded-md hover:bg-gray-100 cursor-pointer flex items-center"
                          onClick={() => handleNavigation('/attorney-dashboard')}
                        >
                          <Settings className="mr-2 h-4 w-4" />
                          Panel
                        </div>
                      )}
                      <div 
                        className="px-2 py-1.5 text-sm rounded-md hover:bg-gray-100 cursor-pointer flex items-center text-red-600"
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
                        Cerrar Sesión
                      </div>
                    </div>
                  }
                >
                  <Button variant="ghost" className="h-10 w-10 p-0 rounded-full relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.user_metadata?.avatar_url || "/placeholder.svg"} alt={user.user_metadata?.name || 'User'} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-white text-lg font-semibold">
                          {user.user_metadata?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      </div>
                      <AvatarFallback className="bg-blue-600 text-white text-lg font-semibold">
                        {user.user_metadata?.name?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </HoverDropdown>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
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
