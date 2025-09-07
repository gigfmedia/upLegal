
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { Scale, Loader2 } from "lucide-react";

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
    name: '',
    role: 'client' as 'client' | 'lawyer',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (mode === 'signup') {
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Las contraseñas no coinciden');
        }
        if (formData.password.length < 6) {
          throw new Error('La contraseña debe tener al menos 6 caracteres');
        }
        await signup(formData.email, formData.password, formData.name, formData.role);
      } else {
        await login(formData.email, formData.password);
      }
      onClose();
      setFormData({
        email: '',
        password: '',
        confirmPassword: '',
        name: '',
        role: 'client',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ocurrió un error';
      
      // Provide user-friendly error messages
      if (errorMessage.includes('Email not confirmed')) {
        setError('Por favor, confirma tu email antes de iniciar sesión. Revisa tu bandeja de entrada.');
      } else if (errorMessage.includes('Invalid login credentials')) {
        setError('Email o contraseña incorrectos. Por favor, verifica tus datos.');
      } else if (errorMessage.includes('User already registered')) {
        setError('Ya existe una cuenta con este email. Intenta iniciar sesión.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Scale className="h-10 w-10 text-blue-600" />
          </div>
          <DialogTitle className="text-2xl">
            {mode === 'login' ? 'Ingresa a tu cuenta' : 'Crea tu cuenta'}
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
              <div className="space-y-2">
                <Label htmlFor="name">Nombre completo</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                  placeholder="Ingresa tu nombre completo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Tipo de cuenta</Label>
                <Select 
                  value={formData.role} 
                  onValueChange={(value: 'client' | 'lawyer') => handleInputChange('role', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tipo de cuenta" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="client">Cliente - Buscando servicios legales</SelectItem>
                    <SelectItem value="lawyer">Abogado - Ofreciendo servicios legales</SelectItem>
                  </SelectContent>
                </Select>
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
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              required
              placeholder="Ingresa tu contraseña"
            />
          </div>

          {mode === 'signup' && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                required
                placeholder="Confirma tu contraseña"
              />
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700" 
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
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
