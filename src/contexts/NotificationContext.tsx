import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { toast } from '@/components/ui/use-toast';

interface NotificationPreference {
  email: boolean;
  inApp: boolean;
}

interface NotificationSettings {
  appointmentReminders: NotificationPreference;
  newMessages: NotificationPreference;
  paymentUpdates: NotificationPreference;
  legalUpdates: NotificationPreference;
  marketing: NotificationPreference;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'appointment' | 'message' | 'payment' | 'system';
  read: boolean;
  createdAt: Date;
  link?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  settings: NotificationSettings;
  isLoading: boolean;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  updateSettings: (settings: Partial<NotificationSettings>) => Promise<void>;
  fetchNotifications: () => Promise<void>;
  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void;
}

const defaultSettings: NotificationSettings = {
  appointmentReminders: { email: true, inApp: true },
  newMessages: { email: true, inApp: true },
  paymentUpdates: { email: true, inApp: true },
  legalUpdates: { email: true, inApp: false },
  marketing: { email: false, inApp: false },
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Load notifications and settings from API
  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchSettings();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      // TODO: Replace with actual API call
      // const response = await fetch('/api/notifications');
      // const data = await response.json();
      // setNotifications(data);
      
      // Mock data for now
      const mockNotifications: Notification[] = [
        {
          id: '1',
          title: 'Nueva cita programada',
          message: 'Tienes una nueva cita programada para el 15 de septiembre a las 15:00',
          type: 'appointment',
          read: false,
          createdAt: new Date(),
          link: '/dashboard/appointments'
        },
        {
          id: '2',
          title: 'Nuevo mensaje',
          message: 'Has recibido un nuevo mensaje de tu abogado',
          type: 'message',
          read: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
          link: '/dashboard/messages'
        }
      ];
      
      setNotifications(mockNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las notificaciones',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      // TODO: Replace with actual API call
      // const response = await fetch('/api/notification-settings');
      // const data = await response.json();
      // setSettings(data);
      
      // Use default settings for now
      setSettings(defaultSettings);
    } catch (error) {
      console.error('Error fetching notification settings:', error);
      // Fallback to default settings
      setSettings(defaultSettings);
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
    
    // TODO: Call API to mark as read
    // await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
    
    // TODO: Call API to mark all as read
    // await fetch('/api/notifications/read-all', { method: 'POST' });
  };

  const updateSettings = async (newSettings: Partial<NotificationSettings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);
      
      // TODO: Call API to update settings
      // await fetch('/api/notification-settings', {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(updatedSettings)
      // });
      
      toast({
        title: 'Configuración guardada',
        description: 'Tus preferencias de notificación han sido actualizadas',
      });
    } catch (error) {
      console.error('Error updating notification settings:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron guardar las preferencias de notificación',
        variant: 'destructive',
      });
    }
  };

  const addNotification = (notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Math.random().toString(36).substr(2, 9),
      read: false,
      createdAt: new Date(),
    };
    
    setNotifications(prev => [newNotification, ...prev]);
    
    // TODO: Call API to save notification
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        settings,
        isLoading,
        markAsRead,
        markAllAsRead,
        updateSettings,
        fetchNotifications,
        addNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
