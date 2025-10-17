import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bell, 
  Eye, 
  Shield, 
  Globe, 
  Mail, 
  Smartphone, 
  Calendar, 
  Trash2,
  AlertTriangle,
  Settings,
  Download,
  Loader2
} from 'lucide-react';
import { CreditCard as CreditCardIcon } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function DashboardSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('general');
  const [isLoading, setIsLoading] = useState(false);

  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    appointments: true,
    payments: true,
  });

  const [privacy, setPrivacy] = useState({
    profileVisible: true,
    showOnlineStatus: true,
    allowMessages: true,
    showRating: true,
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Fetch user profile with Stripe info
  const { profile, loading: profileLoading } = useProfile(user?.id);

  // Load existing settings when component mounts
  useEffect(() => {
    const loadSettings = () => {
      if (!user) return;

      try {
        const savedNotifications = localStorage.getItem(`notifications_${user.id}`);
        const savedPrivacy = localStorage.getItem(`privacy_${user.id}`);

        if (savedNotifications) {
          setNotifications(prev => ({ ...prev, ...JSON.parse(savedNotifications) }));
        }
        if (savedPrivacy) {
          setPrivacy(prev => ({ ...prev, ...JSON.parse(savedPrivacy) }));
        }
      } catch (error) {
        // Error loading settings
      }
    };

    loadSettings();
  }, [user]);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Error",
        description: "Las contraseñas no coinciden",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUpdatingPassword(true);
      
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      toast({
        title: "Contraseña actualizada",
        description: "Tu contraseña ha sido actualizada correctamente.",
        variant: "default",
      });

      // Reset form
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

    } catch (error) {
      console.error('Error updating password:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la contraseña. Por favor, inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleNotificationChange = (key: string, value: boolean) => {
    setNotifications(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handlePrivacyChange = (key: string, value: boolean) => {
    setPrivacy(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      if (!user) throw new Error('Usuario no autenticado');

      // Save settings to localStorage
      localStorage.setItem(`notifications_${user.id}`, JSON.stringify(notifications));
      localStorage.setItem(`privacy_${user.id}`, JSON.stringify(privacy));
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      toast({
        title: "Configuración guardada",
        description: "Tus preferencias han sido actualizadas exitosamente.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron guardar las configuraciones. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    // This would handle account deletion
    toast({
      title: "Account deletion requested",
      description: "We'll process your request within 24 hours.",
      variant: "destructive",
    });
  };

  const handleExportData = async () => {
    try {
      setIsLoading(true);
      
      // Get user profile data
      let profileData = null;
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (error && error.code !== 'PGRST116') { // PGRST116 is the code for "no rows returned"
          console.error('Error fetching profile:', error);
          throw new Error('No se pudo obtener la información del perfil');
        }
        profileData = data || null;
      }

      // Prepare data to export
      const userData = {
        perfil: profileData,
        notificaciones: notifications,
        privacidad: privacy,
        metadatos: user?.user_metadata || {},
        fechaExportacion: new Date().toISOString(),
      };

      // Create and download JSON file
      const dataStr = JSON.stringify(userData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `upLegal-datos-${new Date().toISOString().split('T')[0]}.json`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Datos exportados",
        description: "Tus datos se han descargado correctamente.",
        variant: "default",
      });
    } catch (error) {
      console.error('Error al exportar datos:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudieron exportar los datos. Por favor, inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-8 py-6 space-y-6">
      <Tabs defaultValue="notifications" className="w-full">
        <div className="space-y-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
            <p className="text-muted-foreground">
              Gestiona la configuración de tu cuenta y preferencias
            </p>
          </div>
        </div>

        <TabsContent value="notifications" className="space-y-6">
          {/* Existing Notifications Content */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>Notificaciones</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center space-x-2">
                    <Mail className="h-4 w-4" />
                    <span>Notificaciones por Email</span>
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Recibir notificaciones por correo electrónico
                  </p>
                </div>
                <Switch
                  checked={notifications.email}
                  onCheckedChange={(checked) => handleNotificationChange('email', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center space-x-2">
                    <Smartphone className="h-4 w-4" />
                    <span>Notificaciones Push</span>
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Recibir notificaciones push en tu dispositivo
                  </p>
                </div>
                <Switch
                  checked={notifications.push}
                  onCheckedChange={(checked) => handleNotificationChange('push', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span>Recordatorios de Citas</span>
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Recibir recordatorios sobre próximas citas
                  </p>
                </div>
                <Switch
                  checked={notifications.appointments}
                  onCheckedChange={(checked) => handleNotificationChange('appointments', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center space-x-2">
                    <CreditCardIcon className="h-4 w-4" />
                    <span>Notificaciones de Pagos</span>
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Recibir notificaciones sobre pagos y transacciones
                  </p>
                </div>
                <Switch
                  checked={notifications.payments}
                  onCheckedChange={(checked) => handleNotificationChange('payments', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Privacy Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Eye className="h-5 w-5" />
                <span>Privacidad</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Visibilidad del Perfil</Label>
                  <p className="text-sm text-muted-foreground">
                    Hacer tu perfil visible a otros usuarios
                  </p>
                </div>
                <Switch
                  checked={privacy.profileVisible}
                  onCheckedChange={(checked) => handlePrivacyChange('profileVisible', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Mostrar Estado en Línea</Label>
                  <p className="text-sm text-muted-foreground">
                    Permitir que otros vean cuando estás en línea
                  </p>
                </div>
                <Switch
                  checked={privacy.showOnlineStatus}
                  onCheckedChange={(checked) => handlePrivacyChange('showOnlineStatus', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Permitir Mensajes Directos</Label>
                  <p className="text-sm text-muted-foreground">
                    Permitir que otros usuarios te envíen mensajes directos
                  </p>
                </div>
                <Switch
                  checked={privacy.allowMessages}
                  onCheckedChange={(checked) => handlePrivacyChange('allowMessages', checked)}
                />
              </div>

              {user?.role === 'lawyer' && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Mostrar Calificación</Label>
                      <p className="text-sm text-muted-foreground">
                        Mostrar tu calificación y reseñas públicamente
                      </p>
                    </div>
                    <Switch
                      checked={privacy.showRating}
                      onCheckedChange={(checked) => handlePrivacyChange('showRating', checked)}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Seguridad</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Contraseña Actual</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(prev => ({...prev, currentPassword: e.target.value}))}
                  required
                  disabled={isUpdatingPassword}
                  placeholder="Ingresa tu contraseña actual"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">Nueva Contraseña</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({...prev, newPassword: e.target.value}))}
                  required
                  minLength={6}
                  disabled={isUpdatingPassword}
                  placeholder="Ingresa nueva contraseña"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar Nueva Contraseña</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({...prev, confirmPassword: e.target.value}))}
                  required
                  disabled={isUpdatingPassword}
                  placeholder="Confirma nueva contraseña"
                />
              </div>

              <Button 
                type="submit" 
                disabled={isUpdatingPassword}
                variant="outline" className="w-full"
              >  
                {isUpdatingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Actualizando...
                  </>
                ) : (
                  "Actualizar Contraseña"
                )}
              </Button>

              <Separator />

              <div className="space-y-2">
                <h4 className="font-medium">Autenticación de Dos Factores</h4>
                <p className="text-sm text-muted-foreground">
                  Agrega una capa extra de seguridad a tu cuenta
                </p>
                <Button variant="outline">
                  Habilitar 2FA
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Account Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Globe className="h-5 w-5" />
                <span>Gestión de Cuenta</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium">Exportar Datos</h4>
                <p className="text-sm text-muted-foreground">
                  Descargar una copia de los datos de tu cuenta
                </p>
                <Button variant="outline"  
                  onClick={handleExportData} 
                  disabled={isLoading}
                  className="w-full sm:w-auto"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Exportar mis datos
                    </>
                  )}
                </Button>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="font-medium text-red-600">Zona de Peligro</h4>
                <p className="text-sm text-muted-foreground">
                  Estas acciones no se pueden deshacer
                </p>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar Cuenta
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="w-full h-full sm:h-auto sm:w-auto">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center space-x-2">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                        <span>¿Estás completamente seguro?</span>
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción no se puede deshacer. Esto eliminará permanentemente tu
                        cuenta y removerá tus datos de nuestros servidores. Todas tus consultas,
                        citas e información de perfil se perderán.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteAccount}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Sí, eliminar mi cuenta
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
