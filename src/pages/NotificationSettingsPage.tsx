import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { NotificationSettings } from '@/components/NotificationSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function NotificationSettingsPage() {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      // Settings are saved automatically by the NotificationSettings component
      // This is just for showing a success message
      setTimeout(() => {
        setIsSaving(false);
        // Show success message
        // You can replace this with your preferred notification system
        alert('Configuración guardada correctamente');
      }, 500);
    } catch (error) {
      console.error('Error saving notification settings:', error);
      setIsSaving(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Configuración de notificaciones</h1>
            <p className="text-muted-foreground">
              Personaliza cómo y cuándo recibes notificaciones
            </p>
          </div>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Preferencias de notificación</CardTitle>
          <CardDescription>
            Controla cómo recibes las notificaciones en la plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NotificationSettings />
        </CardContent>
      </Card>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Historial de notificaciones</CardTitle>
            <CardDescription>
              Revisa las notificaciones recientes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <p>No hay notificaciones recientes</p>
              <Button variant="link" className="mt-2" onClick={() => navigate('/dashboard/notifications')}>
                Ver todas las notificaciones
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
