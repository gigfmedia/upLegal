import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useNotifications } from '@/contexts/NotificationContext';
import { Bell, Mail, Smartphone } from 'lucide-react';

export function NotificationSettings() {
  const { settings, updateSettings, isLoading } = useNotifications();

  const handleToggle = async (setting: keyof typeof settings, channel: 'email' | 'inApp') => {
    await updateSettings({
      [setting]: {
        ...settings[setting],
        [channel]: !settings[setting][channel],
      },
    });
  };

  const notificationTypes = [
    {
      id: 'appointmentReminders',
      title: 'Recordatorios de citas',
      description: 'Notificaciones sobre citas programadas, confirmaciones y recordatorios.',
    },
    {
      id: 'newMessages',
      title: 'Nuevos mensajes',
      description: 'Notificaciones cuando recibas nuevos mensajes de tu abogado/cliente.',
    },
    {
      id: 'paymentUpdates',
      title: 'Actualizaciones de pagos',
      description: 'Notificaciones sobre estados de pago y recibos.',
    },
    {
      id: 'legalUpdates',
      title: 'Actualizaciones legales',
      description: 'Notificaciones sobre cambios en tus casos o documentos legales.',
    },
    {
      id: 'marketing',
      title: 'Promociones y ofertas',
      description: 'Recibe ofertas especiales y actualizaciones de nuestros servicios.',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium">Preferencias de notificación</h2>
        <p className="text-sm text-muted-foreground">
          Configura cómo y cuándo deseas recibir notificaciones.
        </p>
      </div>

      <Separator />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Canales de notificación</CardTitle>
            <CardDescription>
              Selecciona cómo deseas recibir las notificaciones.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {notificationTypes.map((type) => (
                <div key={type.id} className="space-y-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-medium">{type.title}</h4>
                    <p className="text-sm text-muted-foreground">{type.description}</p>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center space-x-2">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm">Correo electrónico</span>
                    </div>
                    <Switch
                      checked={settings[type.id as keyof typeof settings]?.email}
                      onCheckedChange={() =>
                        handleToggle(type.id as keyof typeof settings, 'email')
                      }
                      disabled={isLoading}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center space-x-2">
                      <Smartphone className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm">En la aplicación</span>
                    </div>
                    <Switch
                      checked={settings[type.id as keyof typeof settings]?.inApp}
                      onCheckedChange={() =>
                        handleToggle(type.id as keyof typeof settings, 'inApp')
                      }
                      disabled={isLoading}
                    />
                  </div>
                  {type.id !== notificationTypes[notificationTypes.length - 1].id && (
                    <Separator className="my-4" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preferencias adicionales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between space-x-4">
              <div className="flex items-center space-x-2">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <div>
                  <h4 className="text-sm font-medium">Sonido de notificación</h4>
                  <p className="text-sm text-muted-foreground">
                    Activa o desactiva el sonido de las notificaciones en la aplicación.
                  </p>
                </div>
              </div>
              <Switch defaultChecked disabled={isLoading} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
