
import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext/clean/useAuth";
import { Scale, Loader2, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'login' | 'signup';
  onModeChange: (mode: 'login' | 'signup') => void;
}

export function AuthModal({ isOpen, onClose, mode, onModeChange }: AuthModalProps) {
  const { login, signup } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    role: 'client' as 'client' | 'lawyer',
  });
  const { toast } = useToast();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    
    try {
      if (mode === 'signup') {
        // Validate form data for signup
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Las contraseñas no coinciden');
        }
        
        if (!formData.firstName.trim() || !formData.lastName.trim()) {
          throw new Error('Por favor ingresa tu nombre completo');
        }
        
        if (formData.password.length < 6) {
          throw new Error('La contraseña debe tener al menos 6 caracteres');
        }
        
        // Call signup
        const signupResponse = await signup(
          formData.email, 
          formData.password, 
          {
            firstName: formData.firstName,
            lastName: formData.lastName,
            role: formData.role
          }
        );
        
        if (signupResponse.error) throw signupResponse.error;
        
        // Show appropriate success message based on email confirmation status
        if (signupResponse.requiresEmailConfirmation) {
          toast({
            title: '¡Registro exitoso!',
            description: 'Por favor revisa tu correo electrónico para confirmar tu cuenta.',
            variant: 'default',
          });
        } else {
          toast({
            title: '¡Bienvenido a upLegal!',
            description: 'Tu cuenta ha sido creada y verificada correctamente.',
            variant: 'default',
          });
          onClose();
        }
      } else {
        // Login flow
        if (!formData.email || !formData.password) {
          throw new Error('Por favor ingresa tu correo y contraseña');
        }
        
        const { error: loginError } = await login(
          formData.email.trim(), 
          formData.password
        );
        
        if (loginError) {
          console.error('Login error details:', loginError);
          
          // More specific error messages based on the error code
          if (loginError.message.includes('Invalid login credentials')) {
            throw new Error('Correo o contraseña incorrectos');
          } else if (loginError.message.includes('Email not confirmed')) {
            throw new Error('Por favor verifica tu correo electrónico antes de iniciar sesión');
          } else if (loginError.message.includes('Too many requests')) {
            throw new Error('Demasiados intentos. Por favor intente más tarde');
          }
          
          throw loginError;
        }
      }
      
      // Reset form and close modal on success
      setFormData({ 
        email: '', 
        password: '', 
        confirmPassword: '', 
        firstName: '', 
        lastName: '', 
        role: 'client' 
      });
      onClose();
    } catch (error) {
      console.error('Auth error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error inesperado';
      setError(errorMessage);
      
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <DialogContent 
        className="sm:max-w-[425px]"
        aria-describedby="auth-dialog-description"
      >
        <DialogDescription id="auth-dialog-description" className="sr-only">
          {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
        </DialogDescription>
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Scale className="h-10 w-10 text-blue-600" />
          </div>
          <DialogTitle className="text-2xl">
            {mode === 'login' ? 'Ingresa a tu cuenta' : (
              <>
                Crea tu cuenta
                <p className="text-sm font-normal text-gray-500 mt-1">Únete a la plataforma líder de servicios legales</p>
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {mode === 'signup' && (
            <>
              <div className="space-y-3">
                <h3 className="text-lg font-medium text-gray-900">¿Cómo planeas usar upLegal?</h3>
                <div className="space-y-3">
                  <label className={`flex items-center p-4 rounded-lg border cursor-pointer transition-colors ${
                    formData.role === 'client' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}>
                    <div className="flex items-center h-5">
                      <input
                        type="radio"
                        name="accountType"
                        value="client"
                        checked={formData.role === 'client'}
                        onChange={() => handleInputChange('role', 'client')}
                        className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <span className="font-medium text-gray-900">Soy Cliente - Busco servicios legales</span>
                    </div>
                  </label>
                  
                  <label className={`flex items-center p-4 rounded-lg border cursor-pointer transition-colors ${
                    formData.role === 'lawyer' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}>
                    <div className="flex items-center h-5">
                      <input
                        type="radio"
                        name="accountType"
                        value="lawyer"
                        checked={formData.role === 'lawyer'}
                        onChange={() => handleInputChange('role', 'lawyer')}
                        className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <span className="font-medium text-gray-900">Soy Abogado - Ofrezco servicios legales</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Nombre</Label>
                  <Input
                    id="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    required
                    placeholder="Nombre"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Apellido</Label>
                  <Input
                    id="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    required
                    placeholder="Apellido"
                  />
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              required
              placeholder="Ingresa tu correo electrónico"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                required
                placeholder="Ingresa tu contraseña"
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-500"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                <span className="sr-only">
                  {showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                </span>
              </button>
            </div>
          </div>

          {mode === 'signup' && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  required
                  placeholder="Confirma tu contraseña"
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-500"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  <span className="sr-only">
                    {showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  </span>
                </button>
              </div>
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
          </Button>
        </form>

        <div className="text-center text-sm text-gray-600">
          {mode === 'login' ? (
            <>
              ¿No tienes cuenta?{' '}
              <button
                type="button"
                onClick={() => onModeChange('signup')}
                className="text-blue-600 hover:underline font-medium"
              >
                Registrarse
              </button>
            </>
          ) : (
            <>
              ¿Ya tienes cuenta?{' '}
              <button
                type="button"
                onClick={() => onModeChange('login')}
                className="text-blue-600 hover:underline font-medium"
              >
                Iniciar sesión
              </button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
