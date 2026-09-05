import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, CheckCheck, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuthState';
import {
  getAuthToken,
  fetchNotifications,
  fetchUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  type Notification,
  type NotificationRole,
} from '@/lib/notifications/api';
import { getNotificationCategory } from '@/lib/notifications/notificationTypes';
import { NotificationIcon } from '@/components/notifications/NotificationIcon';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import posthog from 'posthog-js';

const PAGE_SIZE = 20;

export default function NotificationsPage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const role: NotificationRole =
    user?.user_metadata?.role === 'lawyer' || user?.profile?.role === 'lawyer'
      ? 'lawyer'
      : 'client';

  const [offset, setOffset] = useState(0);

  const { data, isLoading, isError, fetchStatus } = useQuery({
    queryKey: ['notifications', 'page', user?.id, offset],
    queryFn: async () => {
      const token = await getAuthToken();
      if (!token) return { rows: [], total: 0 };
      return fetchNotifications(token, role, { limit: PAGE_SIZE, offset });
    },
    enabled: !!user && isAuthenticated,
    staleTime: 15000,
  });

  const unreadQuery = useQuery({
    queryKey: ['notifications', 'unread', user?.id],
    queryFn: async () => {
      const token = await getAuthToken();
      if (!token) return 0;
      return fetchUnreadCount(token);
    },
    enabled: !!user && isAuthenticated,
    refetchInterval: 30000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['notifications'] });

  const readMutation = useMutation({
    mutationFn: async (n: Notification) => {
      const token = await getAuthToken();
      if (!token) return;
      if (!n.read) await markNotificationRead(token, n.id);
      posthog.capture('notification_clicked', {
        notification_type: n.type,
        entity_type: n.entityType,
      });
      if (n.link) navigate(n.link);
    },
    onSuccess: () => invalidate(),
  });

  const readAllMutation = useMutation({
    mutationFn: async () => {
      const token = await getAuthToken();
      if (!token) return;
      await markAllNotificationsRead(token);
      posthog.capture('notification_marked_all_read');
    },
    onSuccess: () => invalidate(),
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const unreadCount = unreadQuery.data ?? 0;
  const hasMore = offset + rows.length < total;

  const handleLoadMore = () => setOffset((prev) => prev + PAGE_SIZE);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Notificaciones</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0
              ? `Tienes ${unreadCount} notificación${unreadCount === 1 ? '' : 'es'} sin leer.`
              : 'Estás al día.'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={() => readAllMutation.mutate()} disabled={readAllMutation.isPending}>
            <CheckCheck className="mr-2 h-4 w-4" />
            Marcar todas como leídas
          </Button>
        )}
      </div>

      {isLoading && fetchStatus === 'fetching' ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : isError ? (
        <div className="rounded-lg border bg-muted/30 p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No pudimos cargar tus notificaciones. Intenta nuevamente en unos minutos.
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => queryClient.invalidateQueries({ queryKey: ['notifications'] })}>
            Reintentar
          </Button>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border bg-muted/30 p-12 text-center">
          <Bell className="h-10 w-10 text-gray-300" aria-hidden="true" />
          <p className="text-base font-medium text-gray-700">No tienes notificaciones</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Aquí aparecerán actualizaciones sobre tus consultas, citas, pagos y actividad en
            LegalUp.
          </p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white">
            {rows.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => {
                  if (!notification.read) {
                    posthog.capture('notification_marked_read', {
                      notification_type: notification.type,
                      entity_type: notification.entityType,
                    });
                  }
                  readMutation.mutate(notification);
                }}
                className={cn(
                  'flex w-full items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-gray-50',
                  !notification.read && 'bg-blue-50/40'
                )}
              >
                <div className="mt-0.5">
                  <NotificationIcon type={notification.type} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                    {!notification.read && <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{notification.message}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>
                      {formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </span>
                    <span className="text-gray-300">·</span>
                    <span>{getNotificationCategory(notification.type)}</span>
                  </div>
                </div>
                {notification.link && (
                  <span className="mt-1 text-xs font-medium text-blue-600">
                    <Check className="mr-0.5 inline h-3 w-3" />
                    Abrir
                  </span>
                )}
              </button>
            ))}
          </div>

          {hasMore && (
            <div className="mt-6 text-center">
              <Button variant="outline" onClick={handleLoadMore} disabled={fetchStatus === 'fetching'}>
                Cargar más
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
