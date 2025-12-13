import { useState, useEffect, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Scale, User, LogOut, Eye, ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext/clean/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { NotificationDropdown } from "./NotificationDropdown";
import { supabase } from "@/lib/supabaseClient";
import { AuthModal } from "./AuthModal";

interface HeaderProps {
  onAuthClick?: (mode: 'login' | 'signup') => void;
  centerLogoOnMobile?: boolean;
  mobileMenuButton?: ReactNode;
}

export default function Header({ onAuthClick, centerLogoOnMobile = false, mobileMenuButton }: HeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  const isActive = (path: string) => {
    return location.pathname === path || 
           (path === '/search' && location.pathname.startsWith('/search')) ||
           (path === '/abogados' && location.pathname.startsWith('/abogados'));
  };
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  useEffect(() => {
    const getUserProfile = async () => {
      try {
        if (user?.id) {
          // First check the profiles table
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('role, first_name, last_name')
            .eq('id', user.id)
            .single();
          
          if (!error && profile) {
            setUserRole(profile.role);
            if (profile.first_name || profile.last_name) {
              setUserName(`${profile.first_name || ''} ${profile.last_name || ''}`.trim());
            }
          } else {
            // Fallback to user_metadata if profile not found
            setUserRole(user.user_metadata?.role || 'client');
            const metaName = user.user_metadata?.first_name 
              ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`.trim()
              : user.user_metadata?.name;
            setUserName(metaName || null);
          }
        }
      } catch (error) {
        console.error('Error getting user profile:', error);
        setUserRole(user?.user_metadata?.role || 'client');
      }
    };

    if (user) {
      getUserProfile();
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
        <div className="relative flex items-center justify-between h-full w-full">
          {mobileMenuButton && (
            <div className="md:hidden flex items-center">{mobileMenuButton}</div>
          )}

          {/* Logo */}
          <div
            className={cn(
              "flex items-center space-x-2 cursor-pointer transition-colors",
              centerLogoOnMobile
                ? "absolute left-1/2 -translate-x-1/2 md:relative md:left-auto md:translate-x-0"
                : ""
            )}
            onClick={() => handleNavigation('/')}
          >
            <Scale className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">LegalUp</span>
          </div>

          {/* Navigation - Centered */}
          <nav className="hidden md:flex items-center space-x-8 absolute left-1/2 -translate-x-1/2">
            <button 
              onClick={() => handleNavigation('/search')} 
              className={cn(
                "transition-colors hover:text-blue-600",
                isActive('/search') ? 'text-blue-600 font-medium' : 'text-gray-600'
              )}
            >
              Explorar Servicios
            </button>
            <button 
              onClick={() => handleNavigation('/como-funciona')} 
              className={cn(
                "transition-colors hover:text-blue-600",
                isActive('/como-funciona') ? 'text-blue-600 font-medium' : 'text-gray-600'
              )}
            >
              Cómo Funciona
            </button>
            <button 
              onClick={() => handleNavigation('/about')} 
              className={cn(
                "transition-colors hover:text-blue-600",
                isActive('/about') ? 'text-blue-600 font-medium' : 'text-gray-600'
              )}
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
                            {userName || user.user_metadata?.name || user.email?.split('@')[0] || 'Usuario'}
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
                        <span>Ir al Panel</span>
                      </DropdownMenuItem>

                      {(userRole === 'admin' || 
                        user?.user_metadata?.is_admin === true || 
                        user?.is_admin === true ||
                        user?.email?.toLowerCase() === 'gigfmedia@icloud.com') && (
                        <DropdownMenuItem 
                          onSelect={(e) => {
                            e.preventDefault();
                            handleNavigation('/admin/reviews');
                          }}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          <span>Admin Reviews</span>
                        </DropdownMenuItem>
                      )}

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
