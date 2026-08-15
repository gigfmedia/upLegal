import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { posthog } from '@/lib/posthogLoader';
import { useAuth } from '@/hooks/useAuthState';
import { toast } from '@/components/ui/use-toast';
import {
  getAuthToken,
  fetchNotifications as fetchNotificationsFromApi,
  fetchUnreadCount as fetchUnreadCountFromApi,
  markNotificationRead as markNotificationReadFromApi,
  markAllNotificationsRead as markAllNotificationsReadFromApi,
  type Notification,
  type NotificationListData,
  type NotificationRole,
} from '@/lib/notifications/api';

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

export type { Notification };

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  settings: NotificationSettings;
  isLoading: boolean;
  isError: boolean;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  updateSettings: (settings: Partial<NotificationSettings>) => Promise<void>;
  fetchNotifications: () => void;
  refetchNotifications: () => void;
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
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);

  const enabled = !!user && isAuthenticated;

  const role: NotificationRole =
    user?.user_metadata?.role === 'lawyer' || user?.profile?.role === 'lawyer'
      ? 'lawyer'
      : 'client';

  const listQuery = useQuery({
    queryKey: ['notifications', 'list', user?.id],
    queryFn: async () => {
      const token = await getAuthToken();
      if (!token) return { rows: [], total: 0 };
      return fetchNotificationsFromApi(token, role, { limit: 50 });
    },
    enabled,
    refetchOnWindowFocus: true,
  });

  const unreadQuery = useQuery({
    queryKey: ['notifications', 'unread', user?.id],
    queryFn: async () => {
      const token = await getAuthToken();
      if (!token) return 0;
      return fetchUnreadCountFromApi(token);
    },
    enabled,
    refetchOnWindowFocus: true,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }, [queryClient]);

  const refetchNotifications = useCallback(() => {
    invalidate();
  }, [invalidate]);

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await getAuthToken();
      if (!token) return;
      await markNotificationReadFromApi(token, id);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['notifications', 'list'] });
      queryClient.setQueryData(['notifications', 'list', user?.id], (old: NotificationListData | undefined) => {
        if (!old) return old;
        return {
          ...old,
          rows: old.rows.map((n: Notification) => (n.id === id ? { ...n, read: true } : n)),
        };
      });
      queryClient.setQueryData(['notifications', 'unread', user?.id], (old: number | undefined) =>
        Math.max(0, (old ?? 0) - 1)
      );
    },
    onSettled: () => invalidate(),
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const token = await getAuthToken();
      if (!token) return;
      await markAllNotificationsReadFromApi(token);
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      queryClient.setQueryData(['notifications', 'list', user?.id], (old: NotificationListData | undefined) => {
        if (!old) return old;
        return { ...old, rows: old.rows.map((n: Notification) => ({ ...n, read: true })) };
      });
      queryClient.setQueryData(['notifications', 'unread', user?.id], () => 0);
    },
    onSettled: () => invalidate(),
  });

  const markAsRead = useCallback(
    (id: string) => {
      const target = listQuery.data?.rows.find((n) => n.id === id);
      posthog.capture('notification_marked_read', {
        notification_type: target?.type,
        entity_type: target?.entityType,
      });
      markAsReadMutation.mutate(id);
    },
    [listQuery.data, markAsReadMutation]
  );

  const markAllAsRead = useCallback(() => {
    posthog.capture('notification_marked_all_read');
    markAllReadMutation.mutate();
  }, [markAllReadMutation]);

  const fetchNotifications = useCallback(() => {
    invalidate();
  }, [invalidate]);

  const updateSettings = useCallback(async (newSettings: Partial<NotificationSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    toast({
      title: 'Configuración guardada',
      description: 'Tus preferencias de notificación han sido actualizadas',
    });
  }, [settings]);

  const addNotification = useCallback(
    (notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => {
      const newNotification: Notification = {
        ...notification,
        id: Math.random().toString(36).substr(2, 9),
        read: false,
        createdAt: new Date(),
      };
      queryClient.setQueryData(['notifications', 'list', user?.id], (old: NotificationListData | undefined) => {
        if (!old) return { rows: [newNotification], total: 1 };
        return { ...old, rows: [newNotification, ...old.rows] };
      });
      queryClient.setQueryData(['notifications', 'unread', user?.id], (old: number | undefined) => (old ?? 0) + 1);
    },
    [queryClient, user?.id]
  );

  return (
    <NotificationContext.Provider
      value={{
        notifications: listQuery.data?.rows ?? [],
        unreadCount: unreadQuery.data ?? 0,
        settings,
        isLoading: listQuery.isLoading || unreadQuery.isLoading,
        isError: listQuery.isError,
        markAsRead,
        markAllAsRead,
        updateSettings,
        fetchNotifications,
        refetchNotifications,
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
