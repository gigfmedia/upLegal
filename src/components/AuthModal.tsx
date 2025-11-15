
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext/clean/useAuth";
import { Scale, Loader2, Eye, EyeOff, Key, Check, CheckCircle2, Info, XCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { verifyRutWithPJUD } from "@/services/pjudService";
import { format } from 'date-fns';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess?: () => void;
  mode: 'login' | 'signup';
  onModeChange: (mode: 'login' | 'signup') => void;
}

export function AuthModal({ isOpen, onClose, mode, onModeChange, onLoginSuccess }: AuthModalProps) {
  const { login, signup, user } = useAuth();
  const [isEmailVerified, setIsEmailVerified] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    rut: '',
    role: 'client' as 'client' | 'lawyer',
  });
  const [rutVerificationStatus, setRutVerificationStatus] = useState<'idle' | 'verifying' | 'verified' | 'error'>('idle');
  const [rutError, setRutError] = useState<string | null>(null);

  // Format RUT as user types (XX.XXX.XXX-X)
  const formatRut = (rut: string): string => {
    // Remove all non-alphanumeric characters and convert to uppercase
    let cleanRut = rut.replace(/[^0-9kK]/g, '').toUpperCase();
    
    if (cleanRut.length === 0) return '';
    
    // Format with dots and dash
    let formattedRut = '';
    if (cleanRut.length > 1) {
      formattedRut = cleanRut.slice(-4, -1) + '-' + cleanRut.substr(cleanRut.length - 1);
      for (let i = 4; i < cleanRut.length; i += 3) {
        const start = Math.max(0, cleanRut.length - i - 3);
        const end = cleanRut.length - i;
        formattedRut = cleanRut.slice(start, end) + '.' + formattedRut;
      }
    } else {
      formattedRut = cleanRut;
    }
    
    return formattedRut;
  };

  // Validate RUT format and verification digit
  const validateRut = (rut: string): { isValid: boolean; message?: string } => {
    if (!rut) return { isValid: false, message: 'El RUT es requerido' };
    
    // Remove dots and dash, and convert to uppercase
    const cleanRut = rut.replace(/\./g, '').replace(/-/g, '').toUpperCase();
    
    // Check basic format
    if (!/^\d{7,8}[0-9K]$/i.test(cleanRut)) {
      return { isValid: false, message: 'Formato de RUT inválido' };
    }
    
    // Extract verifier digit
    const rutDigits = cleanRut.slice(0, -1);
    const verifier = cleanRut.slice(-1);
    
    // Calculate expected verifier digit
    let sum = 0;
    let multiplier = 2;
    
    for (let i = rutDigits.length - 1; i >= 0; i--) {
      sum += parseInt(rutDigits.charAt(i)) * multiplier;
      multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }
    
    const calculatedVerifier = (11 - (sum % 11)) % 11;
    const expectedVerifier = calculatedVerifier === 10 ? 'K' : calculatedVerifier.toString();
    
    if (verifier !== expectedVerifier) {
      return { 
        isValid: false, 
        message: 'Dígito verificador inválido' 
      };
    }
    
    return { isValid: true };
  };

  // Verify RUT format (client-side only)
  const verifyRutFormat = (rut: string): { isValid: boolean; message?: string } => {
    const validation = validateRut(rut);
    if (!validation.isValid) {
      return { isValid: false, message: validation.message };
    }
    return { isValid: true };
  };

  // Handle RUT verification (client-side only)
  const handleRutVerification = (rut: string): boolean => {
    const validation = verifyRutFormat(rut);
    if (!validation.isValid) {
      setRutVerificationStatus('error');
      setRutError(validation.message);
      return false;
    }
    setRutVerificationStatus('verified');
    setRutError(null);
    return true;
  };

  // Handle RUT input change
  const handleRutChange = (value: string) => {
    // Format the RUT as user types
    const formattedRut = formatRut(value);
    setFormData(prev => ({ ...prev, rut: formattedRut }));
    
    // Reset verification status when RUT changes
    if (rutVerificationStatus !== 'idle') {
      setRutVerificationStatus('idle');
    }
    
    // Clear error when user starts typing
    if (rutError) {
      setRutError(null);
    }
  };
  const { toast } = useToast();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  
  // Password requirements state
  const [passwordRequirements, setPasswordRequirements] = useState({
    length: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSymbol: false,
  });

  // Check password strength and update requirements
  const checkPasswordStrength = (password: string) => {
    setPasswordRequirements({
      length: password.length >= 8 && password.length <= 18,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSymbol: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]+/.test(password),
    });
  };
  
  const isPasswordValid = Object.values(passwordRequirements).every(Boolean);
  const navigate = useNavigate();

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!formData.email) {
      setError('Por favor ingresa tu correo electrónico');
      return;
    }

    try {
      setSubmitting(true);
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
      
      setResetEmailSent(true);
      toast({
        title: "Correo enviado",
        description: "Hemos enviado un enlace para restablecer tu contraseña a tu correo electrónico.",
      });
    } catch (error) {
      console.error('Error al enviar el correo de recuperación:', error);
      setError('Error al enviar el correo de recuperación. Por favor, inténtalo de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const validateEmail = (email: string): { isValid: boolean; message: string } => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const commonDomains = ['gmail.com', 'hotmail.com', 'icloud.com', 'outlook.com', 'yahoo.com'];
    
    if (!email) {
      return { isValid: false, message: 'El correo electrónico es requerido' };
    }
    
    if (!emailRegex.test(email)) {
      return { 
        isValid: false, 
        message: 'Formato de correo electrónico inválido. Ejemplos válidos: usuario@gmail.com, nombre@hotmail.com, ejemplo@icloud.com' 
      };
    }
    
    const domain = email.split('@')[1];
    if (!commonDomains.some(d => domain.endsWith(d))) {
      return { 
        isValid: true, 
        message: 'Asegúrate de usar un correo personalizado. Ejemplo: tu.nombre@tudominio.cl' 
      };
    }
    
    return { isValid: true, message: '' };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    
    try {
      // Verificar si el correo está verificado
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsEmailVerified(user.email_confirmed_at !== null);
      }
      
      // Store the current path before login for redirecting back
      const redirectTo = new URLSearchParams(window.location.search).get('redirectTo');
      
      // Validate email format
      const emailValidation = validateEmail(formData.email);
      if (!emailValidation.isValid) {
        throw new Error(emailValidation.message);
      }
      
      if (mode === 'signup') {
        // Validate form data for signup
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Las contraseñas no coinciden');
        }
        
        if (!formData.firstName.trim() || !formData.lastName.trim()) {
          throw new Error('Por favor ingresa tu nombre completo');
        }
        
        // Validate RUT for lawyers
        if (formData.role === 'lawyer') {
          if (!formData.rut) {
            throw new Error('Por favor ingresa tu RUT');
          }
          // Client-side RUT validation only
          const rutValidation = verifyRutFormat(formData.rut);
          if (!rutValidation.isValid) {
            throw new Error(rutValidation.message || 'RUT inválido');
          }
          
          // Set verification status for UI feedback
          setRutVerificationStatus('verified');
        }
        
        // Enhanced password validation
        if (formData.password.length < 8) {
          throw new Error('La contraseña debe tener al menos 8 caracteres');
        }
        
        if (formData.password.length > 18) {
          throw new Error('La contraseña no puede tener más de 18 caracteres');
        }
        
        if (!isPasswordValid) {
          throw new Error('La contraseña no cumple con todos los requisitos de seguridad');
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
          onClose();
        } else {
          if (formData.role === 'lawyer') {
            // Redirect lawyer to profile setup
            navigate('/dashboard/profile/setup');
            toast({
              title: '¡Bienvenido a LegalUp!',
              description: 'Completa tu perfil para comenzar a recibir clientes.',
              variant: 'default',
            });
          } else {
            toast({
              title: '¡Bienvenido a LegalUp!',
              description: 'Tu cuenta ha sido creada y verificada correctamente.',
              variant: 'default',
            });
          }
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
            setIsEmailVerified(false);
            // No lanzamos un error aquí, en su lugar mostramos el mensaje y permitimos al usuario reenviar el correo
            toast({
              title: 'Correo no verificado',
              description: 'Por favor verifica tu correo electrónico antes de iniciar sesión.',
              variant: 'destructive',
            });
            return; // Salimos temprano para evitar el flujo de éxito
          } else if (loginError.message.includes('Too many requests')) {
            throw new Error('Demasiados intentos. Por favor intente más tarde');
          }
          
          throw loginError;
        }
      }
      
      // Reset form
      setFormData({ 
        email: '', 
        password: '', 
        confirmPassword: '', 
        firstName: '', 
        lastName: '', 
        role: 'client' 
      });
      
      // Handle success based on mode
      if (mode === 'login') {
        if (onLoginSuccess) {
          onLoginSuccess();
        } else {
          // Get the user data from the login response
          const { data: { user: currentUser }, error: loginError } = await supabase.auth.signInWithPassword({
            email: formData.email.trim(),
            password: formData.password
          });

          if (loginError) throw loginError;
          
          // Get the user's role from the user_metadata
          const userRole = currentUser?.user_metadata?.role || 'client';
          
          // Close the modal
          onClose();
          
          // If there's a redirect URL in the query params, use it
          if (redirectTo) {
            window.location.href = redirectTo;
            return;
          }
          
          // Otherwise, redirect based on user role
          navigate(userRole === 'lawyer' ? '/lawyer/dashboard' : '/dashboard');
        }
      } else {
        // For signup, we'll use the role from the form data
        onClose();
        const userRole = formData.role || 'client';
        navigate(userRole === 'lawyer' ? '/lawyer/dashboard' : '/dashboard');
      }
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
    
    // Check password strength when password changes
    if (field === 'password') {
      checkPasswordStrength(value);
    }
  };

  // Password requirement component
  const PasswordRequirement = ({ met, children }: { met: boolean; children: React.ReactNode }) => (
    <div className="flex items-center">
      <div className={`w-2 h-2 rounded-full mr-2 ${met ? 'bg-green-500' : 'bg-gray-200'}`}></div>
      <span className={`text-sm ${met ? 'text-gray-600' : 'text-gray-400'}`}>
        {children}
      </span>
    </div>
  );

  if (forgotPassword) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) onClose();
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Scale className="h-10 w-10 text-blue-600" />
            </div>
            <DialogTitle className="text-2xl">
              Recuperar contraseña
            </DialogTitle>
          </DialogHeader>

          {resetEmailSent ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">¡Correo enviado!</h3>
              <p className="text-sm text-gray-500">
                Hemos enviado un enlace para restablecer tu contraseña a <span className="font-medium text-gray-900">{formData.email}</span>.
                Por favor revisa tu bandeja de entrada y sigue las instrucciones.
              </p>
              <Button 
                onClick={() => {
                  setForgotPassword(false);
                  setResetEmailSent(false);
                }}
                className="w-full mt-4"
              >
                Volver al inicio de sesión
              </Button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <p className="text-sm font-normal text-gray-500 mt-1">
                Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
              </p>
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                  placeholder="tucorreo@ejemplo.com"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : 'Enviar enlace'}
              </Button>
              <div className="text-center text-sm">
                <button
                  type="button"
                  onClick={() => setForgotPassword(false)}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  ← Volver al inicio de sesión
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    );
  }

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
                <h3 className="text-lg font-medium text-gray-900">¿Cómo planeas usar LegalUp?</h3>
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
                    placeholder="Juan"
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
                    placeholder="Pérez"
                  />
                </div>
              </div>
            </>
          )}

          {mode === 'signup' && formData.role === 'lawyer' && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="rut">RUT</Label>
                {rutVerificationStatus === 'verified' && (
                  <span className="inline-flex items-center text-xs text-green-600">
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    Verificado
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="rut"
                    type="text"
                    value={formData.rut}
                    onChange={(e) => handleRutChange(e.target.value)}
                    onBlur={() => {
                      // Auto-validate on blur
                      if (formData.rut) {
                        const validation = validateRut(formData.rut);
                        if (!validation.isValid) {
                          setRutError(validation.message || 'RUT inválido');
                        }
                      }
                    }}
                    placeholder="12.345.678-9"
                    required
                    className={`uppercase pr-10 ${
                      rutError ? 'border-red-500' : 
                      rutVerificationStatus === 'verified' ? 'border-green-500' : ''
                    }`}
                    maxLength={12}
                  />
                  {rutVerificationStatus === 'verifying' && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    </div>
                  )}
                  {rutVerificationStatus === 'verified' && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </div>
                  )}
                  {rutVerificationStatus === 'error' && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <XCircle className="h-4 w-4 text-red-500" />
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    try {
                      setRutVerificationStatus('verifying');
                      setRutError('');
                      
                      const { valid, message } = await verifyRutWithPJUD(formData.rut);
                      
                      if (valid) {
                        setRutVerificationStatus('verified');
                        toast({
                          title: 'RUT verificado',
                          description: message || 'El RUT ha sido verificado exitosamente como abogado.',
                          variant: 'default'
                        });
                      } else {
                        setRutVerificationStatus('error');
                        setRutError(message || 'No se pudo verificar el RUT como abogado');
                        toast({
                          title: 'Error de verificación',
                          description: message || 'No se pudo verificar el RUT',
                          variant: 'destructive'
                        });
                      }
                    } catch (error) {
                      console.error('Error al verificar RUT:', error);
                      setRutVerificationStatus('error');
                      setRutError('Error al conectar con el servicio de verificación');
                      toast({
                        title: 'Error',
                        description: 'No se pudo completar la verificación del RUT. Intente nuevamente.',
                        variant: 'destructive'
                      });
                    }
                  }}
                  disabled={!formData.rut || rutVerificationStatus === 'verifying'}
                  className="whitespace-nowrap"
                >
                  {rutVerificationStatus === 'verifying' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Verificando...
                    </>
                  ) : rutVerificationStatus === 'verified' ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                      Verificado
                    </>
                  ) : (
                    'Verificar RUT'
                  )}
                </Button>
              </div>
              
              {rutError && (
                <p className="text-xs text-red-500 mt-1">{rutError}</p>
              )}
              {!rutError && formData.rut && !validateRut(formData.rut).isValid && (
                <p className="text-xs text-yellow-600 mt-1">
                  Formato de RUT inválido. Usa el formato: 12.345.678-9
                </p>
              )}
              {rutVerificationStatus === 'verified' && (
                <p className="text-xs text-green-600 mt-1">
                  El RUT ha sido verificado como abogado en el sistema.
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, email: e.target.value }));
                // Clear email-specific errors when typing
                if (error && error.includes('correo electrónico')) {
                  setError('');
                }
              }}
              required
              placeholder="ejemplo@gmail.com"
              className={error && error.includes('correo electrónico') ? 'border-red-500' : ''}
            />
            {error && error.includes('correo electrónico') && (
              <p className="text-xs text-red-500 mt-1">{error}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Label htmlFor="password">Contraseña</Label>
              </div>
              {formData.password && (
                <div className="flex items-center">
                  <div className={`h-1.5 rounded-full ${formData.password.length >= 8 ? 'bg-green-500' : 'bg-gray-200'} mx-0.5`} style={{ width: '20%' }}></div>
                  <div className={`h-1.5 rounded-full ${formData.password.length >= 12 ? 'bg-green-500' : 'bg-gray-200'} mx-0.5`} style={{ width: '20%' }}></div>
                  <div className={`h-1.5 rounded-full ${formData.password.length >= 16 ? 'bg-green-500' : 'bg-gray-200'} mx-0.5`} style={{ width: '20%' }}></div>
                  <div className={`h-1.5 rounded-full ${isPasswordValid ? 'bg-green-500' : 'bg-gray-200'} mx-0.5`} style={{ width: '20%' }}></div>
                  <div className={`h-1.5 rounded-full ${isPasswordValid ? 'bg-green-500' : 'bg-gray-200'} mx-0.5`} style={{ width: '20%' }}></div>
                </div>
              )}
            </div>
            <Tooltip open={mode === 'signup' && isPasswordFocused}>
              <TooltipTrigger asChild>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    onFocus={() => setIsPasswordFocused(true)}
                    onBlur={() => setIsPasswordFocused(false)}
                    onClick={() => setIsPasswordFocused(true)}
                    required
                    placeholder={mode === 'login' ? 'Ingresa tu contraseña' : 'Crea una contraseña segura'}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-500"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowPassword(!showPassword);
                    }}
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
              </TooltipTrigger>
              <TooltipContent className="w-64 p-4 space-y-2 text-sm" side="bottom" align="start">
                <p className="font-medium mb-2">La contraseña debe contener:</p>
                <ul className="space-y-1">
                  <li className="flex items-start">
                    <CheckCircle2 className={`h-4 w-4 mr-2 mt-0.5 flex-shrink-0 ${passwordRequirements.length ? 'text-green-500' : 'text-gray-300'}`} />
                    <span>8 a 18 caracteres</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className={`h-4 w-4 mr-2 mt-0.5 flex-shrink-0 ${passwordRequirements.hasUppercase ? 'text-green-500' : 'text-gray-300'}`} />
                    <span>1 letra mayúscula (A-Z)</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className={`h-4 w-4 mr-2 mt-0.5 flex-shrink-0 ${passwordRequirements.hasLowercase ? 'text-green-500' : 'text-gray-300'}`} />
                    <span>1 letra minúscula (a-z)</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className={`h-4 w-4 mr-2 mt-0.5 flex-shrink-0 ${passwordRequirements.hasNumber ? 'text-green-500' : 'text-gray-300'}`} />
                    <span>1 número (0-9)</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className={`h-4 w-4 mr-2 mt-0.5 flex-shrink-0 ${passwordRequirements.hasSymbol ? 'text-green-500' : 'text-gray-300'}`} />
                    <span>1 símbolo (!@#$%^&*)</span>
                  </li>
                </ul>
              </TooltipContent>
            </Tooltip>
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

          <div className="space-y-2">
            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {mode === 'login' ? 'Iniciando sesión...' : 'Creando cuenta...'}
                </>
              ) : mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
            </Button>
            
            {mode === 'login' && !isEmailVerified && formData.email && (
              <div className="text-center">
                <p className="text-sm text-amber-600">
                  ¿No recibiste el correo de verificación?{' '}
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.preventDefault();
                      try {
                        const { error } = await supabase.auth.signInWithOtp({
                          email: formData.email,
                          options: {
                            emailRedirectTo: `${window.location.origin}/auth/verify`,
                            shouldCreateUser: false
                          }
                        });

                        if (error) throw error;
                        
                        toast({ 
                          title: 'Correo de verificación enviado', 
                          description: 'Por favor revisa tu bandeja de entrada y haz clic en el enlace para verificar tu correo.' 
                        });
                      } catch (error) {
                        console.error('Error al enviar correo de verificación:', error);
                        toast({
                          title: 'No se pudo enviar el correo',
                          description: 'Por favor intenta nuevamente o verifica tu configuración de correo en Supabase.',
                          variant: 'destructive'
                        });
                      }
                    }}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    Reenviar correo de verificación
                  </button>
                </p>
              </div>
            )}
          </div>
          
          {mode === 'login' && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => setForgotPassword(true)}
                className="text-sm text-blue-600 hover:underline font-medium"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          )}
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
              <span className="mr-1">¿Ya tienes cuenta?</span>
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
