import { useState, useEffect, ReactNode, lazy, Suspense } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Scale, User, LogOut, Eye, ChevronDown, Menu, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext/clean/useAuth";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";

const AuthModal = lazy(() => import("./AuthModal").then(m => ({ default: m.AuthModal })));

interface HeaderProps {
  onAuthClick?: (mode: 'login' | 'signup') => void;
  centerLogoOnMobile?: boolean;
  mobileMenuButton?: ReactNode;
}

export default function Header({ onAuthClick, centerLogoOnMobile = false, mobileMenuButton }: HeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const metadata = user?.user_metadata ?? {};
  const metadataFirstName = metadata.first_name ?? metadata.firstName ?? null;
  const metadataLastName = metadata.last_name ?? metadata.lastName ?? null;
  const metadataDisplayName = metadata.display_name ?? metadata.name ?? metadata.full_name ?? null;

  const userRole = (metadata.role as string | undefined) 
    ?? user?.role 
    ?? user?.profile?.role 
    ?? 'client';

  const combinedName = [metadataFirstName, metadataLastName].filter(Boolean).join(' ');
  const userName = metadataDisplayName 
    || (combinedName.length ? combinedName : null)
    || user?.name 
    || (user?.profile?.first_name && user?.profile?.last_name 
      ? `${user.profile.first_name} ${user.profile.last_name}` 
      : null);

  const deriveInitials = () => {
    if (metadataFirstName && metadataLastName) {
      return `${metadataFirstName[0]}${metadataLastName[0]}`.toUpperCase();
    }

    if (metadataDisplayName) {
      const parts = metadataDisplayName.trim().split(/\s+/);
      if (parts.length) {
        return parts.slice(0, 2).map(part => part[0]?.toUpperCase() ?? '').join('') || null;
      }
    }

    if (combinedName.length) {
      const parts = combinedName.trim().split(/\s+/);
      return parts.slice(0, 2).map(part => part[0]?.toUpperCase() ?? '').join('') || null;
    }

    if (userName) {
      const parts = userName.trim().split(/\s+/);
      return parts.slice(0, 2).map(part => part[0]?.toUpperCase() ?? '').join('') || null;
    }

    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }

    return null;
  };

  const avatarInitials = deriveInitials() || 'U';

  const isActive = (path: string) => {
    return pathname === path || 
           (path === '/search' && pathname.startsWith('/search')) ||
           (path === '/abogados' && pathname.startsWith('/abogados'));
  };
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false);
    const dropdown = document.querySelector('[data-radix-popper-content-wrapper]');
    if (dropdown) {
      dropdown.removeAttribute('data-state');
    }
  };

  const handleAuthNavigation = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      {/* Top Bar */}
      <div 
        className="h-10 bg-[#111827] flex items-center justify-center px-4 cursor-pointer hover:bg-black transition-colors border-b border-gray-800"
        onClick={() => handleNavigation('/cae')}
      >
        <p className="text-white text-[13px] sm:text-sm font-medium text-center">
          ¿Tienes deuda CAE? Revísalo antes de pagar <span className="ml-1">→</span>
        </p>
      </div>

      {/* Main Header */}
      <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200 h-16 flex items-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-7xl mx-auto">
          <div className="relative flex items-center justify-between h-full w-full">
            {/* Mobile Menu Button */}
            {mobileMenuButton ? (
              <div className="md:hidden flex items-center">{mobileMenuButton}</div>
            ) : (
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-md hover:bg-gray-100 transition-colors"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? (
                  <X className="h-6 w-6 text-gray-700" />
                ) : (
                  <Menu className="h-6 w-6 text-gray-700" />
                )}
              </button>
            )}

            {/* Logo */}
            <div
              className={cn(
                "flex items-center space-x-2 cursor-pointer transition-colors",
                centerLogoOnMobile || !mobileMenuButton
                  ? "absolute left-1/2 -translate-x-1/2 md:relative md:left-auto md:translate-x-0"
                  : ""
              )}
              onClick={() => handleNavigation('/')}
            >
              <Scale className="h-8 w-8 text-green-900" />
              <span className="text-xl font-bold text-green-900">LegalUp</span>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-8 absolute left-1/2 -translate-x-1/2">
              <a href="/search" className={cn("transition-colors hover:text-green-900 text-sm", isActive('/search') ? 'text-green-900 font-medium' : 'text-muted-foreground')}>Match con abogado</a>
              <a href="/como-funciona" className={cn("transition-colors hover:text-green-900 text-sm", isActive('/como-funciona') ? 'text-green-900 font-medium' : 'text-muted-foreground')}>¿Cómo funciona?</a>
              <a href="/about" className={cn("transition-colors hover:text-green-900 text-sm", isActive('/about') ? 'text-green-900 font-medium' : 'text-muted-foreground')}>Acerca de</a>
              <a href="/blog" className={cn("transition-colors hover:text-green-900 text-sm", isActive('/blog') ? 'text-green-900 font-medium' : 'text-muted-foreground')}>Blog</a>
              <a href="/contacto" className={cn("transition-colors hover:text-green-900 text-sm", isActive('/contacto') ? 'text-green-900 font-medium' : 'text-muted-foreground')}>Contáctanos</a>
            </nav>

            {/* Auth Section */}
            <div className="flex items-center gap-2">
              {user ? (
                <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-10 w-10 p-0 rounded-full relative hover:bg-gray-100 transition-colors">
                      <Avatar className="h-10 w-10 bg-blue-100 text-blue-700">
                        <AvatarImage src={user.user_metadata?.avatar_url ?? undefined} alt={userName || user?.email || 'Usuario'} className="object-cover" />
                        <AvatarFallback className="bg-blue-100 text-blue-700 font-medium">{avatarInitials}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 mt-1" align="end" sideOffset={8}>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{userName || user.user_metadata?.name || user.email?.split('@')[0] || 'Usuario'}</p>
                        <p className="text-xs leading-none text-muted-foreground truncate max-w-[200px]">{user.email}</p>
                        <Badge variant={userRole === 'lawyer' ? 'default' : 'secondary'} className="w-fit text-xs mt-1">{userRole === 'lawyer' ? 'Abogado' : 'Cliente'}</Badge>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => handleNavigation(userRole === 'lawyer' ? '/lawyer-dashboard' : '/dashboard')}><User className="mr-2 h-4 w-4" /><span>Ir al Panel</span></DropdownMenuItem>
                    {(userRole === 'admin' || user?.user_metadata?.is_admin || user?.email?.toLowerCase() === 'gigfmedia@icloud.com') && (
                      <DropdownMenuItem onSelect={() => handleNavigation('/admin/reviews')}><Eye className="mr-2 h-4 w-4" /><span>Admin Reviews</span></DropdownMenuItem>
                    )}
                    <DropdownMenuItem className="text-red-600 focus:text-red-700 focus:bg-red-50" onClick={async () => { await logout(); navigate('/'); }}><LogOut className="mr-2 h-4 w-4" /><span>Cerrar Sesión</span></DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="hidden md:flex items-center space-x-3 h-16">
                  <Button variant="ghost" onClick={() => handleAuthNavigation('login')} className="text-gray-600 border border-solid">Iniciar Sesión</Button>
                  <Button onClick={() => handleAuthNavigation('signup')} className="bg-gray-900 hover:bg-green-900">Registrarse</Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {!mobileMenuButton && isMobileMenuOpen && (
        <div className="md:hidden fixed top-[104px] left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-40">
          <nav className="flex flex-col p-4 space-y-3">
            <button onClick={() => handleNavigation('/search')} className={cn("text-left px-4 py-3 rounded-lg transition-colors", isActive('/search') ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700 hover:bg-gray-50')}>Explorar Servicios</button>
            <button onClick={() => handleNavigation('/como-funciona')} className={cn("text-left px-4 py-3 rounded-lg transition-colors", isActive('/como-funciona') ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700 hover:bg-gray-50')}>Cómo Funciona</button>
            <button onClick={() => handleNavigation('/about')} className={cn("text-left px-4 py-3 rounded-lg transition-colors", isActive('/about') ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700 hover:bg-gray-50')}>Acerca de</button>
            <button onClick={() => handleNavigation('/blog')} className={cn("text-left px-4 py-3 rounded-lg transition-colors", isActive('/blog') ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700 hover:bg-gray-50')}>Blog</button>
            <button onClick={() => handleNavigation('/contacto')} className={cn("text-left px-4 py-3 rounded-lg transition-colors", isActive('/contacto') ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700 hover:bg-gray-50')}>Contáctanos</button>
            {!user && (
              <div className="pt-3 border-t border-gray-200 space-y-2">
                <Button onClick={() => handleAuthNavigation('login')} variant="outline" className="w-full">Iniciar Sesión</Button>
                <Button onClick={() => handleAuthNavigation('signup')} className="w-full bg-gray-900 hover:bg-green-900">Registrarse</Button>
              </div>
            )}
          </nav>
        </div>
      )}

      <Suspense fallback={null}>
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} mode={authMode} onModeChange={setAuthMode} />
      </Suspense>
    </div>
  );
}
